#!/usr/bin/env python3
"""
마약 탐지 특화 Time-series Transformer
불규칙한 생체신호 패턴 기반 마약 사용 상태 분류

특징:
- 20 timesteps, 7 features 입력 (호흡수 포함)
- 불규칙성 탐지에 특화된 어텐션 메커니즘
- 4-class 분류: normal, stimulant, depressant, hallucinogen
- Spike detection 및 volatility analysis 내장
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
from torch.utils.data import Dataset, DataLoader
import math
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from imblearn.over_sampling import SMOTE
import joblib
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class IrregularityAwarePositionalEncoding(nn.Module):
    """불규칙성 인식 위치 인코딩"""
    
    def __init__(self, d_model, max_len=5000, irregularity_weight=0.1):
        super(IrregularityAwarePositionalEncoding, self).__init__()
        
        # 표준 위치 인코딩
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        
        self.register_buffer('pe', pe)
        
        # 불규칙성 가중치 학습 가능 파라미터
        self.irregularity_weight = nn.Parameter(torch.tensor(irregularity_weight))
    
    def forward(self, x, irregularity_mask=None):
        """
        Args:
            x: Tensor, shape [batch_size, seq_len, embedding_dim]
            irregularity_mask: Tensor, shape [batch_size, seq_len] (optional)
        """
        seq_len = x.size(1)
        pe = self.pe[:seq_len, :].transpose(0, 1).unsqueeze(0)  # [1, seq_len, d_model]
        
        if irregularity_mask is not None:
            # 불규칙한 시점에 더 강한 위치 인코딩 적용
            irregularity_weight = irregularity_mask.unsqueeze(-1) * self.irregularity_weight
            pe = pe * (1 + irregularity_weight)
        
        return x + pe

class VolatilityAttention(nn.Module):
    """변동성 감지 특화 어텐션"""
    
    def __init__(self, embed_dim, num_heads, dropout=0.1):
        super(VolatilityAttention, self).__init__()
        
        self.multihead_attn = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, batch_first=True
        )
        
        # 변동성 검출 레이어
        self.volatility_detector = nn.Sequential(
            nn.Linear(embed_dim, embed_dim // 2),
            nn.ReLU(),
            nn.Linear(embed_dim // 2, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, embed_dim)
        """
        # 변동성 점수 계산
        volatility_scores = self.volatility_detector(x)  # (batch, seq_len, 1)
        
        # 변동성 기반 키/값 가중치
        weighted_keys = x * volatility_scores
        weighted_values = x * volatility_scores
        
        # 어텐션 적용
        attn_output, attn_weights = self.multihead_attn(x, weighted_keys, weighted_values)
        
        return attn_output, volatility_scores.squeeze(-1)

class DrugTransformer(nn.Module):
    """마약 탐지 특화 Transformer 모델"""
    
    def __init__(self, 
                 input_dim=7,           # HR, HRV, Stress, Temp, Movement, O2Sat, RespRate
                 seq_len=20,
                 d_model=128,
                 nhead=8,
                 num_layers=4,
                 dim_feedforward=512,   # 더 큰 FFN으로 복잡한 패턴 학습
                 dropout=0.2,           # 높은 드롭아웃으로 과적합 방지
                 num_classes=4):        # normal, stimulant, depressant, hallucinogen
        
        super(DrugTransformer, self).__init__()
        
        self.input_dim = input_dim
        self.seq_len = seq_len
        self.d_model = d_model
        self.num_classes = num_classes
        
        # 입력 임베딩 (더 복잡한 변환)
        self.input_projection = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # 불규칙성 인식 위치 인코딩
        self.pos_encoder = IrregularityAwarePositionalEncoding(d_model, seq_len)
        
        # 변동성 감지 어텐션 레이어들
        self.volatility_layers = nn.ModuleList([
            VolatilityAttention(d_model, nhead, dropout) 
            for _ in range(num_layers)
        ])
        
        # 레이어 정규화
        self.layer_norms = nn.ModuleList([
            nn.LayerNorm(d_model) for _ in range(num_layers)
        ])
        
        # Feed Forward Networks
        self.ffn_layers = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, dim_feedforward),
                nn.GELU(),
                nn.Dropout(dropout),
                nn.Linear(dim_feedforward, d_model),
                nn.Dropout(dropout)
            ) for _ in range(num_layers)
        ])
        
        # 패턴 집계 레이어 (max + mean pooling)
        self.pattern_aggregator = nn.Sequential(
            nn.Linear(d_model * 2, d_model),  # max + mean pooling
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # 불규칙성 점수 집계
        self.irregularity_aggregator = nn.Sequential(
            nn.Linear(seq_len * num_layers, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 32)
        )
        
        # 최종 분류 헤드
        self.classifier = nn.Sequential(
            nn.Linear(d_model + 32, 256),  # 패턴 + 불규칙성 특성
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
    
    def _detect_irregularities(self, x):
        """시계열에서 불규칙성 탐지"""
        batch_size, seq_len, _ = x.shape
        
        # 심박수 변동성 계산 (첫 번째 특성이 심박수라고 가정)
        hr_values = x[:, :, 0]  # (batch, seq_len)
        
        # 연속된 값들 간의 변화율 계산
        hr_changes = torch.abs(hr_values[:, 1:] - hr_values[:, :-1]) / (hr_values[:, :-1] + 1e-6)
        
        # 임계값 기반 불규칙성 마스크
        irregularity_threshold = 0.15  # 15% 이상 변화
        irregularity_mask = torch.zeros_like(hr_values)
        irregularity_mask[:, 1:] = (hr_changes > irregularity_threshold).float()
        
        return irregularity_mask
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, input_dim)
        
        Returns:
            (batch_size, num_classes) 분류 로짓
        """
        batch_size, seq_len, input_dim = x.shape
        
        # 불규칙성 탐지
        irregularity_mask = self._detect_irregularities(x)
        
        # 입력 투영
        x = self.input_projection(x)  # (batch, seq_len, d_model)
        
        # 위치 인코딩 (불규칙성 고려)
        x = self.pos_encoder(x, irregularity_mask)
        
        # 변동성 인식 트랜스포머 레이어들
        all_volatility_scores = []
        
        for i, (vol_layer, norm, ffn) in enumerate(zip(self.volatility_layers, self.layer_norms, self.ffn_layers)):
            # 변동성 어텐션
            attn_output, volatility_scores = vol_layer(x)
            all_volatility_scores.append(volatility_scores)
            
            # 잔차 연결 + 정규화
            x = norm(x + attn_output)
            
            # Feed Forward
            ffn_output = ffn(x)
            x = norm(x + ffn_output)
        
        # 패턴 집계 (max + mean pooling)
        max_pooled = torch.max(x, dim=1)[0]  # (batch, d_model)
        mean_pooled = torch.mean(x, dim=1)   # (batch, d_model)
        pattern_features = torch.cat([max_pooled, mean_pooled], dim=-1)
        pattern_features = self.pattern_aggregator(pattern_features)
        
        # 불규칙성 특성 집계
        volatility_concat = torch.cat(all_volatility_scores, dim=-1)  # (batch, seq_len * num_layers)
        irregularity_features = self.irregularity_aggregator(volatility_concat)
        
        # 최종 특성 결합
        combined_features = torch.cat([pattern_features, irregularity_features], dim=-1)
        
        # 분류
        logits = self.classifier(combined_features)
        
        return logits, {
            'volatility_scores': all_volatility_scores,
            'irregularity_mask': irregularity_mask,
            'pattern_features': pattern_features,
            'irregularity_features': irregularity_features
        }

class DrugBiometricDataset(Dataset):
    """마약 탐지용 생체신호 데이터셋"""
    
    def __init__(self, sequences, labels, augment=False):
        """
        Args:
            sequences: (N, seq_len, features) numpy array
            labels: (N,) numpy array, 0=normal, 1=stimulant, 2=depressant, 3=hallucinogen
            augment: 데이터 증강 여부
        """
        self.sequences = torch.FloatTensor(sequences)
        self.labels = torch.LongTensor(labels)
        self.augment = augment
    
    def __len__(self):
        return len(self.sequences)
    
    def __getitem__(self, idx):
        sequence = self.sequences[idx].clone()
        label = self.labels[idx]
        
        # 데이터 증강 (마약 클래스에만 적용)
        if self.augment and label > 0:
            sequence = self._augment_sequence(sequence)
        
        return sequence, label
    
    def _augment_sequence(self, sequence):
        """시계열 데이터 증강"""
        # 가우시안 노이즈 추가
        noise = torch.randn_like(sequence) * 0.02
        sequence = sequence + noise
        
        # 시간 축 소량 회전
        if torch.rand(1) > 0.5:
            shift = torch.randint(-2, 3, (1,)).item()
            if shift != 0:
                sequence = torch.roll(sequence, shift, dims=0)
        
        # 특성별 스케일링 (심박수, 체온 등에 약간의 변동)
        scale_factors = 1 + torch.randn(sequence.size(-1)) * 0.05
        sequence = sequence * scale_factors.unsqueeze(0)
        
        return sequence

class DrugDetectionTrainer:
    """마약 탐지 모델 훈련 클래스"""
    
    def __init__(self, config=None):
        self.config = config or self._default_config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.scaler = RobustScaler()  # 이상치에 강한 스케일러 사용
        self.history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
        self.class_names = ['normal', 'stimulant', 'depressant', 'hallucinogen']
    
    def _default_config(self):
        return {
            'input_dim': 7,
            'seq_len': 20,
            'd_model': 128,
            'nhead': 8,
            'num_layers': 4,
            'dim_feedforward': 512,
            'dropout': 0.2,
            'num_classes': 4,
            'lr': 0.0005,  # 낮은 학습률
            'batch_size': 32,
            'epochs': 150,
            'patience': 15,
            'weight_decay': 1e-3,
            'use_focal_loss': True,  # 클래스 불균형 대응
            'focal_alpha': 0.25,
            'focal_gamma': 2.0
        }
    
    def prepare_data(self, biometric_data, labels):
        """마약 탐지용 데이터 전처리"""
        print("🔧 마약 탐지 데이터 전처리 시작...")
        
        # 움직임 상태 수치화
        movement_mapping = {'stationary': 0, 'walking': 1, 'running': 2}
        biometric_data['movement_numeric'] = biometric_data['movementStatus'].map(movement_mapping).fillna(0)
        
        # 특성 선택 (호흡수 포함)
        feature_columns = ['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 
                          'movement_numeric', 'oxygenSaturation', 'respiratoryRate']
        
        features = biometric_data[feature_columns].copy()
        
        # 결측치 처리
        for col in feature_columns:
            if col not in features.columns:
                features[col] = 0  # 없는 컬럼은 0으로 채움
        
        features = features.fillna(features.median())  # 중앙값으로 결측치 처리
        
        # 이상치 처리 (IQR 방법)
        for col in features.columns:
            Q1 = features[col].quantile(0.25)
            Q3 = features[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            features[col] = features[col].clip(lower_bound, upper_bound)
        
        # 스케일링 (RobustScaler - 이상치에 강함)
        features_scaled = self.scaler.fit_transform(features)
        
        # 시계열 시퀀스 생성
        sequences, sequence_labels = self._create_drug_sequences(features_scaled, labels.values)
        
        print(f"✅ 마약 탐지 시퀀스 생성 완료: {len(sequences)}개 샘플")
        print(f"클래스 분포: {np.bincount(sequence_labels)}")
        
        return sequences, sequence_labels
    
    def _create_drug_sequences(self, features, labels):
        """마약 탐지용 시계열 시퀀스 생성"""
        sequences = []
        sequence_labels = []
        
        seq_len = self.config['seq_len']
        
        # 불균형 클래스 대응: 마약 클래스는 더 많은 시퀀스 생성
        for i in range(len(features) - seq_len + 1):
            sequence = features[i:i + seq_len]
            label = labels[i + seq_len - 1]
            
            sequences.append(sequence)
            sequence_labels.append(label)
            
            # 마약 클래스(1, 2, 3)인 경우 추가 시퀀스 생성
            if label > 0 and i % 3 == 0:  # 오버샘플링
                # 약간의 노이즈를 추가한 시퀀스 생성
                noisy_sequence = sequence + np.random.normal(0, 0.01, sequence.shape)
                sequences.append(noisy_sequence)
                sequence_labels.append(label)
        
        return np.array(sequences), np.array(sequence_labels)
    
    def train_with_cross_validation(self, data, labels, k_folds=5):
        """교차 검증을 통한 모델 훈련"""
        print(f"🔄 {k_folds}-Fold 교차 검증 시작...")
        
        skf = StratifiedKFold(n_splits=k_folds, shuffle=True, random_state=42)
        cv_scores = {'accuracy': [], 'f1': [], 'precision': [], 'recall': []}
        
        fold = 0
        for train_idx, val_idx in skf.split(data, labels):
            fold += 1
            print(f"\n📁 Fold {fold}/{k_folds} 훈련 시작...")
            
            # 데이터 분할
            X_train, X_val = data[train_idx], data[val_idx]
            y_train, y_val = labels[train_idx], labels[val_idx]
            
            # 데이터셋 생성
            train_dataset = DrugBiometricDataset(X_train, y_train, augment=True)
            val_dataset = DrugBiometricDataset(X_val, y_val, augment=False)
            
            # 모델 훈련
            self._train_single_fold(train_dataset, val_dataset, fold)
            
            # 평가
            metrics = self.evaluate(val_dataset)
            cv_scores['accuracy'].append(metrics['accuracy'])
            cv_scores['f1'].append(metrics['f1_score'])
            cv_scores['precision'].append(metrics['precision'])
            cv_scores['recall'].append(metrics['recall'])
        
        # 교차 검증 결과 출력
        print("\n📊 교차 검증 결과:")
        for metric, scores in cv_scores.items():
            mean_score = np.mean(scores)
            std_score = np.std(scores)
            print(f"  {metric}: {mean_score:.4f} ± {std_score:.4f}")
        
        return cv_scores
    
    def _train_single_fold(self, train_data, val_data, fold):
        """단일 폴드 훈련"""
        # 모델 초기화
        self.model = DrugTransformer(**{k: v for k, v in self.config.items() 
                                      if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                              'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.to(self.device)
        
        # 데이터로더
        train_loader = DataLoader(train_data, batch_size=self.config['batch_size'], shuffle=True)
        val_loader = DataLoader(val_data, batch_size=self.config['batch_size'], shuffle=False)
        
        # 옵티마이저
        optimizer = torch.optim.AdamW(self.model.parameters(), 
                                     lr=self.config['lr'], 
                                     weight_decay=self.config['weight_decay'])
        
        # 손실함수 (Focal Loss 또는 가중 CrossEntropy)
        if self.config['use_focal_loss']:
            criterion = self._focal_loss
        else:
            class_weights = self._calculate_class_weights(train_data)
            criterion = nn.CrossEntropyLoss(weight=class_weights.to(self.device))
        
        # 스케줄러
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer, max_lr=self.config['lr'], 
            steps_per_epoch=len(train_loader), 
            epochs=self.config['epochs'] // 2  # 교차검증이므로 에포크 절반
        )
        
        # 훈련 루프
        epochs = self.config['epochs'] // 2
        for epoch in range(epochs):
            train_loss, train_acc = self._train_epoch(train_loader, optimizer, criterion)
            val_loss, val_acc = self._validate_epoch(val_loader, criterion)
            
            scheduler.step()
            
            if epoch % 10 == 0:
                print(f"  Epoch {epoch+1}/{epochs}: Train Acc: {train_acc:.4f}, Val Acc: {val_acc:.4f}")
    
    def _focal_loss(self, inputs, targets):
        """Focal Loss 구현"""
        ce_loss = F.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        alpha = self.config['focal_alpha']
        gamma = self.config['focal_gamma']
        focal_loss = alpha * (1-pt)**gamma * ce_loss
        return focal_loss.mean()
    
    def _train_epoch(self, train_loader, optimizer, criterion):
        """훈련 에포크"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for data, target in train_loader:
            data, target = data.to(self.device), target.to(self.device)
            
            optimizer.zero_grad()
            output, auxiliary_outputs = self.model(data)
            
            if callable(criterion):
                loss = criterion(output, target)
            else:
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
                
                output, _ = self.model(data)
                
                if callable(criterion):
                    loss = criterion(output, target)
                else:
                    loss = criterion(output, target)
                
                total_loss += loss.item()
                pred = output.argmax(dim=1)
                correct += pred.eq(target).sum().item()
                total += target.size(0)
        
        return total_loss / len(val_loader), correct / total
    
    def _calculate_class_weights(self, dataset):
        """클래스 가중치 계산"""
        labels = [dataset[i][1].item() for i in range(len(dataset))]
        unique, counts = np.unique(labels, return_counts=True)
        weights = len(labels) / (len(unique) * counts)
        return torch.FloatTensor(weights)
    
    def save_model(self, path='./weights/drug_transformer.pth'):
        """모델 저장"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config': self.config,
            'scaler': self.scaler,
            'class_names': self.class_names
        }, path)
        print(f"✅ 마약 탐지 모델 저장 완료: {path}")
    
    def load_model(self, model_path='./weights/drug_transformer.pth'):
        """모델 로드"""
        checkpoint = torch.load(model_path, map_location=self.device)
        
        self.config = checkpoint['config']
        self.scaler = checkpoint['scaler']
        self.class_names = checkpoint.get('class_names', self.class_names)
        
        self.model = DrugTransformer(**{k: v for k, v in self.config.items() 
                                      if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                              'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print("✅ 마약 탐지 모델 로드 완료")
    
    def predict(self, biometric_sequence):
        """마약 사용 상태 예측"""
        if self.model is None:
            raise ValueError("모델이 로드되지 않았습니다")
        
        self.model.eval()
        
        # 데이터 전처리
        sequence = np.array(biometric_sequence).reshape(1, -1, self.config['input_dim'])
        sequence = self.scaler.transform(sequence.reshape(-1, self.config['input_dim'])).reshape(sequence.shape)
        sequence = torch.FloatTensor(sequence).to(self.device)
        
        with torch.no_grad():
            logits, auxiliary = self.model(sequence)
            probabilities = F.softmax(logits, dim=1)
            prediction = logits.argmax(dim=1)
        
        return {
            'prediction': prediction.cpu().numpy()[0],
            'predicted_class': self.class_names[prediction.cpu().numpy()[0]],
            'probabilities': probabilities.cpu().numpy()[0],
            'class_probabilities': {
                class_name: prob for class_name, prob 
                in zip(self.class_names, probabilities.cpu().numpy()[0])
            },
            'confidence': probabilities.max().cpu().numpy(),
            'volatility_analysis': {
                'volatility_scores': [vs.cpu().numpy()[0] for vs in auxiliary['volatility_scores']],
                'irregularity_detected': auxiliary['irregularity_mask'].cpu().numpy()[0].sum() > 0
            }
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
                
                output, _ = self.model(data)
                pred = output.argmax(dim=1)
                
                all_preds.extend(pred.cpu().numpy())
                all_targets.extend(target.cpu().numpy())
        
        # 메트릭 계산
        accuracy = accuracy_score(all_targets, all_preds)
        precision = precision_score(all_targets, all_preds, average='weighted', zero_division=0)
        recall = recall_score(all_targets, all_preds, average='weighted', zero_division=0)
        f1 = f1_score(all_targets, all_preds, average='weighted', zero_division=0)
        
        # 클래스별 리포트
        report = classification_report(all_targets, all_preds, 
                                     target_names=self.class_names, 
                                     output_dict=True, zero_division=0)
        
        metrics = {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'classification_report': report,
            'total_samples': len(all_targets)
        }
        
        return metrics

def create_drug_training_data():
    """마약 탐지 훈련 데이터셋 생성 (시뮬레이션)"""
    print("📊 마약 탐지 훈련 데이터셋 생성...")
    
    np.random.seed(42)
    
    # 정상 상태 (클래스 0)
    normal_data = []
    for _ in range(800):
        hr = np.random.normal(72, 10)
        hrv = np.random.normal(45, 12)
        stress = np.random.normal(20, 8)
        temp = np.random.normal(36.5, 0.3)
        movement = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
        o2sat = np.random.normal(98, 2)
        resp_rate = np.random.normal(16, 3)
        
        normal_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate])
    
    # 각성제 (클래스 1) - 심박수 급상승, 체온 상승
    stimulant_data = []
    for _ in range(150):
        hr = np.random.normal(120, 25)  # 높은 변동성
        hrv = np.random.normal(25, 8)   # 낮은 HRV
        stress = np.random.normal(70, 15)
        temp = np.random.normal(37.5, 0.8)
        movement = np.random.choice([0, 1, 2], p=[0.2, 0.4, 0.4])
        o2sat = np.random.normal(96, 3)
        resp_rate = np.random.normal(22, 5)
        
        stimulant_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate])
    
    # 억제제 (클래스 2) - 점진적 감소
    depressant_data = []
    for _ in range(100):
        hr = np.random.normal(55, 8)
        hrv = np.random.normal(35, 6)
        stress = np.random.normal(10, 5)
        temp = np.random.normal(36.0, 0.4)
        movement = np.random.choice([0, 1, 2], p=[0.8, 0.15, 0.05])
        o2sat = np.random.normal(94, 4)
        resp_rate = np.random.normal(12, 2)
        
        depressant_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate])
    
    # 환각제 (클래스 3) - 불규칙 패턴
    hallucinogen_data = []
    for _ in range(80):
        hr = 72 + np.random.normal(0, 20) + np.random.choice([-15, 15]) # 불규칙성
        hrv = np.random.uniform(20, 60)  # 큰 변동성
        stress = np.random.uniform(15, 80)
        temp = 36.5 + np.random.choice([-0.8, 0.8]) + np.random.normal(0, 0.3)
        movement = np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
        o2sat = np.random.normal(97, 3)
        resp_rate = 16 + np.random.choice([-4, 4]) + np.random.normal(0, 2)
        
        hallucinogen_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate])
    
    # 데이터 결합
    all_data = np.vstack([normal_data, stimulant_data, depressant_data, hallucinogen_data])
    labels = np.hstack([
        np.zeros(800), 
        np.ones(150), 
        np.full(100, 2), 
        np.full(80, 3)
    ])
    
    return all_data, labels

def main():
    """메인 실행 함수"""
    print("💊 마약 탐지 Transformer 모델 훈련 시작")
    
    # 데이터 생성
    data, labels = create_drug_training_data()
    
    # 훈련자 초기화
    trainer = DrugDetectionTrainer()
    
    # 데이터를 DataFrame으로 변환
    df = pd.DataFrame(data, columns=['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 
                                   'movementStatus', 'oxygenSaturation', 'respiratoryRate'])
    df['movementStatus'] = df['movementStatus'].map({0: 'stationary', 1: 'walking', 2: 'running'})
    
    # 데이터 전처리
    sequences, sequence_labels = trainer.prepare_data(df, pd.Series(labels))
    
    # 교차 검증 훈련
    cv_scores = trainer.train_with_cross_validation(sequences, sequence_labels, k_folds=5)
    
    # 최종 모델 훈련 (전체 데이터로)
    print("\n🎯 최종 모델 훈련...")
    X_train, X_test, y_train, y_test = train_test_split(sequences, sequence_labels, 
                                                        test_size=0.2, random_state=42, 
                                                        stratify=sequence_labels)
    
    train_dataset = DrugBiometricDataset(X_train, y_train, augment=True)
    test_dataset = DrugBiometricDataset(X_test, y_test, augment=False)
    
    trainer._train_single_fold(train_dataset, test_dataset, "final")
    
    # 평가
    metrics = trainer.evaluate(test_dataset)
    print("\n📊 최종 모델 평가 결과:")
    for metric, value in metrics.items():
        if metric != 'classification_report':
            print(f"  {metric}: {value}")
    
    # 모델 저장
    trainer.save_model()
    
    print("🎉 마약 탐지 시스템 훈련 완료!")

if __name__ == "__main__":
    main()