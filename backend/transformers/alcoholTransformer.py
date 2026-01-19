#!/usr/bin/env python3
"""
음주 탐지 특화 Time-series Transformer
생체신호 패턴 기반 음주 상태 분류

특징:
- 20 timesteps, 6 features 입력
- PositionalEncoding + MultiheadAttention
- 8 heads, 4 layers TransformerEncoder
- 입력 (batch, 20, 6) → 출력 (batch, 128) embedding
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
from torch.utils.data import Dataset, DataLoader
import math
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import json
from datetime import datetime

class PositionalEncoding(nn.Module):
    """위치 인코딩 - 시계열 데이터의 시간적 위치 정보 제공"""
    
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        """
        Args:
            x: Tensor, shape [seq_len, batch_size, embedding_dim]
        """
        return x + self.pe[:x.size(0), :]

class AlcoholTransformer(nn.Module):
    """음주 탐지 특화 Transformer 모델"""
    
    def __init__(self, 
                 input_dim=6,           # 입력 특성 수 (HR, HRV, Stress, Temp, Motion, O2Sat)
                 seq_len=20,            # 시계열 길이
                 d_model=128,           # 모델 차원
                 nhead=8,               # 어텐션 헤드 수
                 num_layers=4,          # 트랜스포머 레이어 수
                 dim_feedforward=256,   # FFN 차원
                 dropout=0.1,           # 드롭아웃 비율
                 num_classes=2):        # 클래스 수 (정상/음주)
        
        super(AlcoholTransformer, self).__init__()
        
        self.input_dim = input_dim
        self.seq_len = seq_len
        self.d_model = d_model
        self.num_classes = num_classes
        
        # 입력 임베딩 레이어
        self.input_projection = nn.Linear(input_dim, d_model)
        
        # 위치 인코딩
        self.pos_encoder = PositionalEncoding(d_model, seq_len)
        
        # 트랜스포머 인코더
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            activation='gelu',      # GELU 활성화 함수
            batch_first=True        # batch_first=True로 설정
        )
        
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer, 
            num_layers=num_layers
        )
        
        # 글로벌 어텐션 풀링 (음주 패턴은 특정 시점에서 강하게 나타날 수 있음)
        self.attention_pooling = nn.MultiheadAttention(
            embed_dim=d_model,
            num_heads=4,
            dropout=dropout,
            batch_first=True
        )
        
        # 분류 헤드
        self.classifier = nn.Sequential(
            nn.Linear(d_model, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU(), 
            nn.Dropout(dropout),
            nn.Linear(128, num_classes)
        )
        
        # 가중치 초기화
        self._init_weights()
    
    def _init_weights(self):
        """가중치 초기화"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, input_dim) 생체신호 시계열
        
        Returns:
            (batch_size, num_classes) 음주 분류 로짓
        """
        batch_size, seq_len, input_dim = x.shape
        
        # 입력 투영
        x = self.input_projection(x)  # (batch, seq_len, d_model)
        
        # 위치 인코딩 (seq_len, batch, d_model 형태로 변환 필요)
        x = x.transpose(0, 1)  # (seq_len, batch, d_model)
        x = self.pos_encoder(x)
        x = x.transpose(0, 1)  # (batch, seq_len, d_model)
        
        # 트랜스포머 인코더
        x = self.transformer_encoder(x)  # (batch, seq_len, d_model)
        
        # 어텐션 풀링 (쿼리로는 평균 벡터 사용)
        query = x.mean(dim=1, keepdim=True)  # (batch, 1, d_model)
        attended_output, attention_weights = self.attention_pooling(
            query, x, x
        )  # (batch, 1, d_model)
        
        # 풀링된 벡터 추출
        pooled = attended_output.squeeze(1)  # (batch, d_model)
        
        # 분류
        logits = self.classifier(pooled)  # (batch, num_classes)
        
        return logits

class AlcoholBiometricDataset(Dataset):
    """음주 탐지용 생체신호 데이터셋"""
    
    def __init__(self, sequences, labels, transform=None):
        """
        Args:
            sequences: (N, seq_len, features) numpy array
            labels: (N,) numpy array, 0=정상, 1=음주
            transform: 데이터 변환 함수
        """
        self.sequences = torch.FloatTensor(sequences)
        self.labels = torch.LongTensor(labels)
        self.transform = transform
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        sequence = self.sequences[idx]
        label = self.labels[idx]
        
        if self.transform:
            sequence = self.transform(sequence)
        
        return sequence, label

class AlcoholDetectionTrainer:
    """음주 탐지 모델 훈련 클래스"""
    
    def __init__(self, config=None):
        self.config = config or self._default_config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.scaler = StandardScaler()
        self.history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
    def _default_config(self):
        return {
            'input_dim': 6,
            'seq_len': 20,
            'd_model': 128,
            'nhead': 8,
            'num_layers': 4,
            'dim_feedforward': 256,
            'dropout': 0.15,
            'num_classes': 2,
            'lr': 0.001,
            'batch_size': 32,
            'epochs': 100,
            'patience': 10,
            'weight_decay': 1e-4
        }
    
    def prepare_data(self, biometric_data, labels):
        """
        생체신호 데이터를 시계열 시퀀스로 변환
        
        Args:
            biometric_data: DataFrame with columns [heartRate, hrv, stressLevel, bodyTemperature, movementStatus, oxygenSaturation, timestamp]
            labels: Series with 0=정상, 1=음주
        """
        print("🔧 음주 탐지 데이터 전처리 시작...")
        
        # 움직임 상태 수치화
        movement_mapping = {'stationary': 0, 'walking': 1, 'running': 2}
        biometric_data['movement_numeric'] = biometric_data['movementStatus'].map(movement_mapping).fillna(0)
        
        # 특성 선택
        feature_columns = ['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 'movement_numeric', 'oxygenSaturation']
        features = biometric_data[feature_columns].values
        
        # 결측치 처리
        features = pd.DataFrame(features, columns=feature_columns)
        features = features.fillna(features.mean())
        
        # 정규화
        features_scaled = self.scaler.fit_transform(features)
        
        # 시계열 시퀀스 생성
        sequences, sequence_labels = self._create_sequences(features_scaled, labels.values)
        
        print(f"✅ 시퀀스 생성 완료: {len(sequences)}개 샘플")
        return sequences, sequence_labels
    
    def _create_sequences(self, features, labels):
        """시계열 시퀀스 생성"""
        sequences = []
        sequence_labels = []
        
        seq_len = self.config['seq_len']
        
        for i in range(len(features) - seq_len + 1):
            sequence = features[i:i + seq_len]
            label = labels[i + seq_len - 1]  # 마지막 시점의 라벨 사용
            
            sequences.append(sequence)
            sequence_labels.append(label)
        
        return np.array(sequences), np.array(sequence_labels)
    
    def train(self, train_data, val_data=None):
        """모델 훈련"""
        print("🚀 음주 탐지 Transformer 모델 훈련 시작...")
        
        # 모델 초기화
        self.model = AlcoholTransformer(**{k: v for k, v in self.config.items() 
                                         if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                                 'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.to(self.device)
        
        # 데이터로더
        train_loader = DataLoader(train_data, batch_size=self.config['batch_size'], shuffle=True)
        val_loader = DataLoader(val_data, batch_size=self.config['batch_size'], shuffle=False) if val_data else None
        
        # 옵티마이저 및 손실함수
        optimizer = torch.optim.AdamW(self.model.parameters(), 
                                     lr=self.config['lr'], 
                                     weight_decay=self.config['weight_decay'])
        
        # 클래스 불균형 대응 가중치
        class_weights = self._calculate_class_weights(train_data)
        criterion = nn.CrossEntropyLoss(weight=class_weights.to(self.device))
        
        # 스케줄러
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5)
        
        # Early Stopping
        best_val_loss = float('inf')
        patience_counter = 0
        
        for epoch in range(self.config['epochs']):
            # 훈련
            train_loss, train_acc = self._train_epoch(train_loader, optimizer, criterion)
            
            # 검증
            if val_loader:
                val_loss, val_acc = self._validate_epoch(val_loader, criterion)
                
                # 스케줄러 업데이트
                scheduler.step(val_loss)
                
                # Early Stopping 체크
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    patience_counter = 0
                    self._save_best_model()
                else:
                    patience_counter += 1
                
                print(f"Epoch {epoch+1}/{self.config['epochs']}: "
                      f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}, "
                      f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
                
                self.history['val_loss'].append(val_loss)
                self.history['val_acc'].append(val_acc)
                
                if patience_counter >= self.config['patience']:
                    print(f"🛑 Early stopping at epoch {epoch+1}")
                    break
            else:
                print(f"Epoch {epoch+1}/{self.config['epochs']}: "
                      f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
            
            self.history['train_loss'].append(train_loss)
            self.history['train_acc'].append(train_acc)
        
        print("✅ 음주 탐지 모델 훈련 완료")
    
    def _train_epoch(self, train_loader, optimizer, criterion):
        """훈련 에포크"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(self.device), target.to(self.device)
            
            optimizer.zero_grad()
            output = self.model(data)
            loss = criterion(output, target)
            loss.backward()
            
            # 그래디언트 클리핑
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            
            optimizer.step()
            
            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
        
        return total_loss / len(train_loader), correct / total
    
    def _validate_epoch(self, val_loader, criterion):
        """검증 에포크"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in val_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                output = self.model(data)
                loss = criterion(output, target)
                
                total_loss += loss.item()
                pred = output.argmax(dim=1)
                correct += pred.eq(target).sum().item()
                total += target.size(0)
        
        return total_loss / len(val_loader), correct / total
    
    def _calculate_class_weights(self, dataset):
        """클래스 불균형 대응 가중치 계산"""
        labels = [dataset[i][1].item() for i in range(len(dataset))]
        unique, counts = np.unique(labels, return_counts=True)
        weights = len(labels) / (len(unique) * counts)
        return torch.FloatTensor(weights)
    
    def _save_best_model(self):
        """최적 모델 저장"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config': self.config,
            'scaler': self.scaler
        }, './weights/alcohol_transformer.pth')
    
    def load_model(self, model_path='./weights/alcohol_transformer.pth'):
        """모델 로드"""
        checkpoint = torch.load(model_path, map_location=self.device)
        
        self.config = checkpoint['config']
        self.scaler = checkpoint['scaler']
        
        self.model = AlcoholTransformer(**{k: v for k, v in self.config.items() 
                                         if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                                 'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print("✅ 음주 탐지 모델 로드 완료")
    
    def predict(self, biometric_sequence):
        """음주 상태 예측"""
        if self.model is None:
            raise ValueError("모델이 로드되지 않았습니다")
        
        self.model.eval()
        
        # 데이터 전처리
        sequence = np.array(biometric_sequence).reshape(1, -1, self.config['input_dim'])
        sequence = self.scaler.transform(sequence.reshape(-1, self.config['input_dim'])).reshape(sequence.shape)
        sequence = torch.FloatTensor(sequence).to(self.device)
        
        with torch.no_grad():
            logits = self.model(sequence)
            probabilities = F.softmax(logits, dim=1)
            prediction = logits.argmax(dim=1)
        
        return {
            'prediction': prediction.cpu().numpy()[0],  # 0=정상, 1=음주
            'probabilities': probabilities.cpu().numpy()[0],  # [정상 확률, 음주 확률]
            'confidence': probabilities.max().cpu().numpy()
        }
    
    def evaluate(self, test_data):
        """모델 평가"""
        if self.model is None:
            raise ValueError("모델이 로드되지 않았습니다")
        
        self.model.eval()
        test_loader = DataLoader(test_data, batch_size=self.config['batch_size'], shuffle=False)
        
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for data, target in test_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                output = self.model(data)
                pred = output.argmax(dim=1)
                
                all_preds.extend(pred.cpu().numpy())
                all_targets.extend(target.cpu().numpy())
        
        # 메트릭 계산
        accuracy = accuracy_score(all_targets, all_preds)
        precision = precision_score(all_targets, all_preds, average='weighted')
        recall = recall_score(all_targets, all_preds, average='weighted')
        f1 = f1_score(all_targets, all_preds, average='weighted')
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'total_samples': len(all_targets)
        }
        
        print("📊 음주 탐지 모델 평가 결과:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")
        
        return metrics

# 데이터셋 생성 및 훈련 실행 함수
def create_alcohol_training_data():
    """음주 탐지 훈련 데이터셋 생성"""
    print("📊 음주 탐지 훈련 데이터셋 생성...")
    
    # 실제로는 MongoDB에서 데이터를 가져와야 함
    # 여기서는 시뮬레이션 데이터 생성
    np.random.seed(42)
    
    # 정상 상태 데이터 (1000개)
    normal_data = []
    for _ in range(1000):
        hr = np.random.normal(72, 10)  # 심박수
        hrv = np.random.normal(45, 12)  # HRV
        stress = np.random.normal(20, 8)  # 스트레스
        temp = np.random.normal(36.5, 0.3)  # 체온
        movement = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])  # 움직임
        o2sat = np.random.normal(98, 2)  # 산소포화도
        
        normal_data.append([hr, hrv, stress, temp, movement, o2sat])
    
    # 음주 상태 데이터 (300개)
    alcohol_data = []
    for _ in range(300):
        hr = np.random.normal(92, 15)  # 상승된 심박수
        hrv = np.random.normal(30, 10)  # 감소된 HRV
        stress = np.random.normal(45, 12)  # 상승된 스트레스
        temp = np.random.normal(37.2, 0.5)  # 상승된 체온
        movement = np.random.choice([0, 1, 2], p=[0.3, 0.5, 0.2])  # 변화된 움직임
        o2sat = np.random.normal(96, 3)  # 약간 감소된 산소포화도
        
        alcohol_data.append([hr, hrv, stress, temp, movement, o2sat])
    
    # 데이터 결합
    all_data = np.vstack([normal_data, alcohol_data])
    labels = np.hstack([np.zeros(1000), np.ones(300)])
    
    return all_data, labels

def main():
    """메인 실행 함수"""
    print("🍷 음주 탐지 Transformer 모델 훈련 시작")
    
    # 데이터 생성
    data, labels = create_alcohol_training_data()
    
    # 훈련자 초기화
    trainer = AlcoholDetectionTrainer()
    
    # 데이터를 DataFrame으로 변환 (전처리를 위해)
    df = pd.DataFrame(data, columns=['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 'movementStatus', 'oxygenSaturation'])
    df['movementStatus'] = df['movementStatus'].map({0: 'stationary', 1: 'walking', 2: 'running'})
    
    # 데이터 전처리
    sequences, sequence_labels = trainer.prepare_data(df, pd.Series(labels))
    
    # 훈련/검증 분할
    X_train, X_val, y_train, y_val = train_test_split(sequences, sequence_labels, test_size=0.2, random_state=42, stratify=sequence_labels)
    
    # 데이터셋 생성
    train_dataset = AlcoholBiometricDataset(X_train, y_train)
    val_dataset = AlcoholBiometricDataset(X_val, y_val)
    
    # 모델 훈련
    trainer.train(train_dataset, val_dataset)
    
    # 평가
    trainer.evaluate(val_dataset)
    
    print("🎉 음주 탐지 시스템 훈련 완료!")

if __name__ == "__main__":
    main()