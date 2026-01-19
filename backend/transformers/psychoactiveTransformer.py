#!/usr/bin/env python3
"""
향정신성약물 탐지 특화 Time-series Transformer
점진적 CNS 억제 패턴 기반 향정신성약물 사용 상태 분류

특징:
- 20 timesteps, 8 features 입력 (수면상태, 인지지표 포함)
- 점진적 변화 탐지에 특화된 Temporal Trend Attention
- 5-class 분류: normal, benzodiazepines, barbiturates, z_drugs, antipsychotics
- CNS depression scoring 내장
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import pandas as pd
from torch.utils.data import Dataset, DataLoader
import math
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from imblearn.over_sampling import ADASYN
import joblib
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class TemporalTrendPositionalEncoding(nn.Module):
    """점진적 변화 감지 특화 위치 인코딩"""
    
    def __init__(self, d_model, max_len=5000):
        super(TemporalTrendPositionalEncoding, self).__init__()
        
        # 표준 위치 인코딩
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        # 시간적 거리 가중치 (최근 시점에 더 높은 가중치)
        temporal_weights = torch.exp(-0.1 * torch.arange(max_len, dtype=torch.float))
        pe = pe * temporal_weights.unsqueeze(1)
        
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        """
        Args:
            x: Tensor, shape [batch_size, seq_len, embedding_dim]
        """
        seq_len = x.size(1)
        pe = self.pe[:seq_len, :].transpose(0, 1).unsqueeze(0)  # [1, seq_len, d_model]
        return x + pe

class TrendAwareAttention(nn.Module):
    """추세 인식 어텐션 - 점진적 변화 패턴 감지"""
    
    def __init__(self, embed_dim, num_heads, dropout=0.1):
        super(TrendAwareAttention, self).__init__()
        
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        
        # 표준 멀티헤드 어텐션
        self.multihead_attn = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, batch_first=True
        )
        
        # 추세 분석 레이어
        self.trend_analyzer = nn.Sequential(
            nn.Linear(embed_dim, embed_dim // 2),
            nn.Tanh(),  # 부드러운 활성화
            nn.Linear(embed_dim // 2, 1)
        )
        
        # 점진성 점수 계산
        self.gradual_change_detector = nn.Sequential(
            nn.Conv1d(embed_dim, embed_dim // 2, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv1d(embed_dim // 2, 1, kernel_size=3, padding=1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, embed_dim)
        """
        batch_size, seq_len, embed_dim = x.shape
        
        # 추세 점수 계산
        trend_scores = self.trend_analyzer(x)  # (batch, seq_len, 1)
        
        # 점진적 변화 점수 계산
        x_transposed = x.transpose(1, 2)  # (batch, embed_dim, seq_len)
        gradual_scores = self.gradual_change_detector(x_transposed)  # (batch, 1, seq_len)
        gradual_scores = gradual_scores.transpose(1, 2)  # (batch, seq_len, 1)
        
        # 추세 기반 어텐션 가중치
        trend_weights = torch.softmax(trend_scores, dim=1)
        weighted_keys = x * trend_weights
        weighted_values = x * trend_weights * gradual_scores
        
        # 어텐션 적용
        attn_output, attn_weights = self.multihead_attn(x, weighted_keys, weighted_values)
        
        return attn_output, {
            'trend_scores': trend_scores.squeeze(-1),
            'gradual_scores': gradual_scores.squeeze(-1),
            'attention_weights': attn_weights
        }

class CNSDepressionScorer(nn.Module):
    """CNS 억제 점수 계산 모듈"""
    
    def __init__(self, input_dim, hidden_dim=64):
        super(CNSDepressionScorer, self).__init__()
        
        # 생체신호별 억제 지표 계산
        self.hr_depression_scorer = nn.Linear(1, hidden_dim // 4)
        self.movement_depression_scorer = nn.Linear(1, hidden_dim // 4)
        self.arousal_depression_scorer = nn.Linear(1, hidden_dim // 4)  # 스트레스/각성도
        self.respiratory_depression_scorer = nn.Linear(1, hidden_dim // 4)
        
        # 통합 CNS 억제 점수
        self.cns_integrator = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, input_dim)
            입력 순서: [HR, HRV, Stress, Temp, Movement, O2Sat, RespRate, Sleep/Arousal]
        """
        batch_size, seq_len, input_dim = x.shape
        
        # 각 생체신호별 억제 점수 계산
        hr_scores = self.hr_depression_scorer(x[:, :, 0:1])  # 심박수
        movement_scores = self.movement_depression_scorer(x[:, :, 4:5])  # 움직임
        arousal_scores = self.arousal_depression_scorer(x[:, :, 2:3])  # 스트레스(각성도)
        respiratory_scores = self.respiratory_depression_scorer(x[:, :, 6:7])  # 호흡수
        
        # 특성 결합
        combined_features = torch.cat([
            hr_scores, movement_scores, arousal_scores, respiratory_scores
        ], dim=-1)  # (batch, seq_len, hidden_dim)
        
        # 시간축을 따라 평균 (점진적 변화이므로 전체적 경향 중요)
        temporal_avg = combined_features.mean(dim=1)  # (batch, hidden_dim)
        
        # CNS 억제 점수
        cns_depression_score = self.cns_integrator(temporal_avg)  # (batch, 1)
        
        return cns_depression_score, {
            'hr_depression': hr_scores.mean(dim=1),
            'movement_depression': movement_scores.mean(dim=1),
            'arousal_depression': arousal_scores.mean(dim=1),
            'respiratory_depression': respiratory_scores.mean(dim=1)
        }

class PsychoactiveTransformer(nn.Module):
    """향정신성약물 탐지 특화 Transformer 모델"""
    
    def __init__(self, 
                 input_dim=8,           # HR, HRV, Stress, Temp, Movement, O2Sat, RespRate, Sleep/Arousal
                 seq_len=20,
                 d_model=128,
                 nhead=6,               # 6 heads (3의 배수로 안정성)
                 num_layers=4,
                 dim_feedforward=256,
                 dropout=0.15,          # 낮은 드롭아웃 (점진적 패턴 보존)
                 num_classes=5):        # normal, benzodiazepines, barbiturates, z_drugs, antipsychotics
        
        super(PsychoactiveTransformer, self).__init__()
        
        self.input_dim = input_dim
        self.seq_len = seq_len
        self.d_model = d_model
        self.num_classes = num_classes
        
        # 입력 임베딩 (부드러운 변환)
        self.input_projection = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model),
            nn.Tanh(),  # 부드러운 활성화
            nn.Dropout(dropout)
        )
        
        # 시간적 추세 위치 인코딩
        self.pos_encoder = TemporalTrendPositionalEncoding(d_model, seq_len)
        
        # 추세 인식 어텐션 레이어들
        self.trend_attention_layers = nn.ModuleList([
            TrendAwareAttention(d_model, nhead, dropout) 
            for _ in range(num_layers)
        ])
        
        # 레이어 정규화
        self.layer_norms = nn.ModuleList([
            nn.LayerNorm(d_model) for _ in range(num_layers * 2)
        ])
        
        # Feed Forward Networks (점진적 패턴에 적합하게 설계)
        self.ffn_layers = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, dim_feedforward),
                nn.GELU(),
                nn.Dropout(dropout),
                nn.Linear(dim_feedforward, d_model),
                nn.Dropout(dropout)
            ) for _ in range(num_layers)
        ])
        
        # CNS 억제 점수 계산기
        self.cns_scorer = CNSDepressionScorer(input_dim)
        
        # 시간 가중 풀링 (최근 시점에 더 높은 가중치)
        self.temporal_attention = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.Tanh(),
            nn.Linear(d_model // 2, 1),
            nn.Softmax(dim=1)
        )
        
        # 추세 특성 추출기
        self.trend_feature_extractor = nn.Sequential(
            nn.Linear(seq_len, d_model // 4),
            nn.ReLU(),
            nn.Linear(d_model // 4, d_model // 8)
        )
        
        # 최종 분류 헤드
        self.classifier = nn.Sequential(
            nn.Linear(d_model + d_model // 8 + 1, 256),  # 패턴 + 추세 + CNS점수
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
        """가중치 초기화 (Xavier uniform)"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.LayerNorm):
                nn.init.constant_(module.bias, 0)
                nn.init.constant_(module.weight, 1.0)
    
    def _calculate_trend_slopes(self, x):
        """각 특성의 시간적 기울기 계산"""
        batch_size, seq_len, input_dim = x.shape
        
        # 시간 인덱스 생성
        time_indices = torch.arange(seq_len, dtype=torch.float, device=x.device)
        time_indices = time_indices.unsqueeze(0).unsqueeze(-1)  # (1, seq_len, 1)
        time_indices = time_indices.repeat(batch_size, 1, input_dim)  # (batch, seq_len, input_dim)
        
        # 선형 회귀를 통한 기울기 계산
        slopes = []
        for dim in range(input_dim):
            x_values = time_indices[:, :, dim]  # (batch, seq_len)
            y_values = x[:, :, dim]  # (batch, seq_len)
            
            # 최소제곱법으로 기울기 계산
            n = seq_len
            sum_x = x_values.sum(dim=1, keepdim=True)  # (batch, 1)
            sum_y = y_values.sum(dim=1, keepdim=True)  # (batch, 1)
            sum_xy = (x_values * y_values).sum(dim=1, keepdim=True)  # (batch, 1)
            sum_x2 = (x_values * x_values).sum(dim=1, keepdim=True)  # (batch, 1)
            
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x + 1e-6)
            slopes.append(slope)
        
        slopes = torch.cat(slopes, dim=1)  # (batch, input_dim)
        return slopes
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, input_dim)
        
        Returns:
            logits: (batch_size, num_classes)
            auxiliary_outputs: dict with additional information
        """
        batch_size, seq_len, input_dim = x.shape
        
        # CNS 억제 점수 계산
        cns_depression_score, cns_details = self.cns_scorer(x)
        
        # 시간적 추세 기울기 계산
        trend_slopes = self._calculate_trend_slopes(x)
        
        # 입력 투영
        x_embedded = self.input_projection(x)  # (batch, seq_len, d_model)
        
        # 위치 인코딩
        x_embedded = self.pos_encoder(x_embedded)
        
        # 추세 인식 트랜스포머 레이어들
        all_trend_info = []
        
        for i, (trend_layer, ffn) in enumerate(zip(self.trend_attention_layers, self.ffn_layers)):
            # 추세 어텐션
            attn_output, trend_info = trend_layer(x_embedded)
            all_trend_info.append(trend_info)
            
            # 잔차 연결 + 정규화
            x_embedded = self.layer_norms[i*2](x_embedded + attn_output)
            
            # Feed Forward
            ffn_output = ffn(x_embedded)
            x_embedded = self.layer_norms[i*2+1](x_embedded + ffn_output)
        
        # 시간 가중 풀링
        temporal_weights = self.temporal_attention(x_embedded)  # (batch, seq_len, 1)
        weighted_features = (x_embedded * temporal_weights).sum(dim=1)  # (batch, d_model)
        
        # 추세 특성 추출
        trend_features = self.trend_feature_extractor(trend_slopes)  # (batch, d_model//8)
        
        # 최종 특성 결합
        combined_features = torch.cat([
            weighted_features,           # 패턴 특성
            trend_features,             # 추세 특성
            cns_depression_score        # CNS 억제 점수
        ], dim=-1)
        
        # 분류
        logits = self.classifier(combined_features)
        
        # 보조 출력 정보
        auxiliary_outputs = {
            'cns_depression_score': cns_depression_score,
            'cns_details': cns_details,
            'trend_slopes': trend_slopes,
            'trend_info': all_trend_info,
            'temporal_weights': temporal_weights.squeeze(-1),
            'pattern_features': weighted_features,
            'trend_features': trend_features
        }
        
        return logits, auxiliary_outputs

class PsychoactiveBiometricDataset(Dataset):
    """향정신성약물 탐지용 생체신호 데이터셋"""
    
    def __init__(self, sequences, labels, augment=False):
        """
        Args:
            sequences: (N, seq_len, features) numpy array
            labels: (N,) numpy array, 0=normal, 1=benzodiazepines, 2=barbiturates, 3=z_drugs, 4=antipsychotics
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
        
        # 점진적 변화에 적합한 데이터 증강
        if self.augment and label > 0:
            sequence = self._augment_gradual_sequence(sequence)
        
        return sequence, label
    
    def _augment_gradual_sequence(self, sequence):
        """점진적 변화 패턴에 특화된 데이터 증강"""
        seq_len, feature_dim = sequence.shape
        
        # 부드러운 노이즈 추가 (점진적 패턴 보존)
        smooth_noise = torch.randn_like(sequence) * 0.01
        for i in range(1, seq_len):
            smooth_noise[i] = 0.8 * smooth_noise[i-1] + 0.2 * smooth_noise[i]
        sequence = sequence + smooth_noise
        
        # 점진적 추세 강화/약화
        if torch.rand(1) > 0.5:
            trend_factor = torch.rand(1) * 0.1 + 0.95  # 0.95 ~ 1.05
            trend_weights = torch.linspace(1.0, trend_factor.item(), seq_len).unsqueeze(1)
            sequence = sequence * trend_weights
        
        # 시간축 약간 늘이기/줄이기 (점진성 변화)
        if torch.rand(1) > 0.7:
            stretch_factor = torch.rand(1) * 0.1 + 0.95  # 0.95 ~ 1.05
            new_indices = torch.linspace(0, seq_len-1, seq_len) * stretch_factor
            new_indices = torch.clamp(new_indices, 0, seq_len-1).long()
            sequence = sequence[new_indices]
        
        return sequence

class PsychoactiveDetectionTrainer:
    """향정신성약물 탐지 모델 훈련 클래스"""
    
    def __init__(self, config=None):
        self.config = config or self._default_config()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.scaler = MinMaxScaler()  # 점진적 변화 보존을 위한 MinMax 스케일러
        self.history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
        self.class_names = ['normal', 'benzodiazepines', 'barbiturates', 'z_drugs', 'antipsychotics']
    
    def _default_config(self):
        return {
            'input_dim': 8,
            'seq_len': 20,
            'd_model': 128,
            'nhead': 6,
            'num_layers': 4,
            'dim_feedforward': 256,
            'dropout': 0.15,
            'num_classes': 5,
            'lr': 0.0003,  # 낮은 학습률 (점진적 패턴 학습)
            'batch_size': 24,
            'epochs': 200,
            'patience': 20,
            'weight_decay': 5e-4,
            'use_auxiliary_loss': True,
            'aux_loss_weight': 0.2
        }
    
    def prepare_data(self, biometric_data, labels):
        """향정신성약물 탐지용 데이터 전처리"""
        print("🔧 향정신성약물 탐지 데이터 전처리 시작...")
        
        # 움직임 상태 수치화
        movement_mapping = {'stationary': 0, 'walking': 1, 'running': 2}
        biometric_data['movement_numeric'] = biometric_data['movementStatus'].map(movement_mapping).fillna(0)
        
        # 수면/각성 상태 수치화
        sleep_mapping = {'awake': 0, 'light_sleep': 1, 'deep_sleep': 2, 'rem_sleep': 3, 'unknown': 0}
        if 'sleepStatus' not in biometric_data.columns:
            biometric_data['sleepStatus'] = 'awake'  # 기본값
        biometric_data['sleep_numeric'] = biometric_data['sleepStatus'].map(sleep_mapping).fillna(0)
        
        # 특성 선택
        feature_columns = ['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 
                          'movement_numeric', 'oxygenSaturation', 'respiratoryRate', 'sleep_numeric']
        
        features = biometric_data[feature_columns].copy()
        
        # 결측치 처리 (향정신성약물 특성상 점진적 변화이므로 선형 보간 사용)
        for col in feature_columns:
            if col not in features.columns:
                # 기본값 설정
                default_values = {
                    'heartRate': 72, 'hrv': 45, 'stressLevel': 20, 'bodyTemperature': 36.5,
                    'movement_numeric': 0, 'oxygenSaturation': 98, 'respiratoryRate': 16, 'sleep_numeric': 0
                }
                features[col] = default_values.get(col, 0)
        
        # 선형 보간으로 결측치 처리
        features = features.interpolate(method='linear').fillna(method='bfill').fillna(method='ffill')
        
        # 정규화 (MinMaxScaler로 점진적 변화 패턴 보존)
        features_scaled = self.scaler.fit_transform(features)
        
        # 시계열 시퀀스 생성
        sequences, sequence_labels = self._create_psychoactive_sequences(features_scaled, labels.values)
        
        print(f"✅ 향정신성약물 시퀀스 생성 완료: {len(sequences)}개 샘플")
        print(f"클래스 분포: {np.bincount(sequence_labels)}")
        
        return sequences, sequence_labels
    
    def _create_psychoactive_sequences(self, features, labels):
        """향정신성약물 탐지용 시계열 시퀀스 생성"""
        sequences = []
        sequence_labels = []
        
        seq_len = self.config['seq_len']
        
        for i in range(len(features) - seq_len + 1):
            sequence = features[i:i + seq_len]
            label = labels[i + seq_len - 1]
            
            # 점진적 변화가 있는지 확인 (향정신성약물의 특징)
            if label > 0:  # 향정신성약물 클래스
                # 시퀀스 내 변화량 계산
                changes = np.abs(np.diff(sequence, axis=0)).mean()
                if changes > 0.01:  # 유의미한 변화가 있는 경우만 포함
                    sequences.append(sequence)
                    sequence_labels.append(label)
            else:  # 정상 클래스
                sequences.append(sequence)
                sequence_labels.append(label)
        
        # ADASYN을 사용한 불균형 클래스 대응
        sequences = np.array(sequences)
        sequence_labels = np.array(sequence_labels)
        
        if len(np.unique(sequence_labels)) > 1:
            try:
                # 시퀀스를 1D로 변환하여 ADASYN 적용
                sequences_flat = sequences.reshape(sequences.shape[0], -1)
                adasyn = ADASYN(random_state=42, n_neighbors=3)
                sequences_resampled, labels_resampled = adasyn.fit_resample(sequences_flat, sequence_labels)
                sequences = sequences_resampled.reshape(-1, seq_len, sequences.shape[-1])
                sequence_labels = labels_resampled
                print(f"✅ ADASYN 적용 후 클래스 분포: {np.bincount(sequence_labels)}")
            except Exception as e:
                print(f"⚠️ ADASYN 적용 실패: {e}")
        
        return sequences, sequence_labels
    
    def train_with_validation(self, data, labels, val_split=0.2):
        """검증 데이터와 함께 모델 훈련"""
        print("🚀 향정신성약물 탐지 Transformer 모델 훈련 시작...")
        
        # 데이터 분할
        X_train, X_val, y_train, y_val = train_test_split(
            data, labels, test_size=val_split, random_state=42, stratify=labels
        )
        
        # 데이터셋 생성
        train_dataset = PsychoactiveBiometricDataset(X_train, y_train, augment=True)
        val_dataset = PsychoactiveBiometricDataset(X_val, y_val, augment=False)
        
        # 모델 초기화
        self.model = PsychoactiveTransformer(**{k: v for k, v in self.config.items() 
                                              if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                                      'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.to(self.device)
        
        # 데이터로더
        train_loader = DataLoader(train_dataset, batch_size=self.config['batch_size'], 
                                 shuffle=True, drop_last=True)
        val_loader = DataLoader(val_dataset, batch_size=self.config['batch_size'], 
                               shuffle=False)
        
        # 옵티마이저 및 손실함수
        optimizer = torch.optim.AdamW(self.model.parameters(), 
                                     lr=self.config['lr'], 
                                     weight_decay=self.config['weight_decay'])
        
        # 클래스 가중치 적용 CrossEntropy
        class_weights = self._calculate_class_weights(train_dataset)
        criterion = nn.CrossEntropyLoss(weight=class_weights.to(self.device))
        
        # CNS 점수 예측을 위한 보조 손실
        aux_criterion = nn.MSELoss()
        
        # 스케줄러 (점진적 학습률 감소)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
            optimizer, T_0=20, T_mult=2, eta_min=1e-6
        )
        
        # Early Stopping
        best_val_loss = float('inf')
        patience_counter = 0
        
        print(f"📊 훈련 데이터: {len(train_dataset)}개, 검증 데이터: {len(val_dataset)}개")
        
        for epoch in range(self.config['epochs']):
            # 훈련
            train_loss, train_acc = self._train_epoch_with_aux(
                train_loader, optimizer, criterion, aux_criterion
            )
            
            # 검증
            val_loss, val_acc = self._validate_epoch_with_aux(
                val_loader, criterion, aux_criterion
            )
            
            # 스케줄러 업데이트
            scheduler.step()
            
            # Early Stopping 체크
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                self._save_best_model()
            else:
                patience_counter += 1
            
            if epoch % 20 == 0:
                print(f"Epoch {epoch+1}/{self.config['epochs']}: "
                      f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}, "
                      f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")
            
            self.history['train_loss'].append(train_loss)
            self.history['train_acc'].append(train_acc)
            self.history['val_loss'].append(val_loss)
            self.history['val_acc'].append(val_acc)
            
            if patience_counter >= self.config['patience']:
                print(f"🛑 Early stopping at epoch {epoch+1}")
                break
        
        print("✅ 향정신성약물 탐지 모델 훈련 완료")
    
    def _train_epoch_with_aux(self, train_loader, optimizer, criterion, aux_criterion):
        """보조 손실을 포함한 훈련 에포크"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for data, target in train_loader:
            data, target = data.to(self.device), target.to(self.device)
            
            optimizer.zero_grad()
            
            # 모델 예측
            output, auxiliary = self.model(data)
            
            # 주 손실 (분류)
            main_loss = criterion(output, target)
            
            # 보조 손실 (CNS 억제 점수 예측)
            if self.config['use_auxiliary_loss']:
                # 타겟 CNS 점수 생성 (정상=0, 약물=1에 가까움)
                target_cns_scores = (target > 0).float().unsqueeze(1)
                aux_loss = aux_criterion(auxiliary['cns_depression_score'], target_cns_scores)
                loss = main_loss + self.config['aux_loss_weight'] * aux_loss
            else:
                loss = main_loss
            
            loss.backward()
            
            # 그래디언트 클리핑
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 0.5)
            
            optimizer.step()
            
            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
        
        return total_loss / len(train_loader), correct / total
    
    def _validate_epoch_with_aux(self, val_loader, criterion, aux_criterion):
        """보조 손실을 포함한 검증 에포크"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in val_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                output, auxiliary = self.model(data)
                
                # 주 손실
                main_loss = criterion(output, target)
                
                # 보조 손실
                if self.config['use_auxiliary_loss']:
                    target_cns_scores = (target > 0).float().unsqueeze(1)
                    aux_loss = aux_criterion(auxiliary['cns_depression_score'], target_cns_scores)
                    loss = main_loss + self.config['aux_loss_weight'] * aux_loss
                else:
                    loss = main_loss
                
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
    
    def _save_best_model(self):
        """최적 모델 저장"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config': self.config,
            'scaler': self.scaler,
            'class_names': self.class_names
        }, './weights/psychoactive_transformer.pth')
    
    def load_model(self, model_path='./weights/psychoactive_transformer.pth'):
        """모델 로드"""
        checkpoint = torch.load(model_path, map_location=self.device)
        
        self.config = checkpoint['config']
        self.scaler = checkpoint['scaler']
        self.class_names = checkpoint.get('class_names', self.class_names)
        
        self.model = PsychoactiveTransformer(**{k: v for k, v in self.config.items() 
                                              if k in ['input_dim', 'seq_len', 'd_model', 'nhead', 
                                                      'num_layers', 'dim_feedforward', 'dropout', 'num_classes']})
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print("✅ 향정신성약물 탐지 모델 로드 완료")
    
    def predict(self, biometric_sequence):
        """향정신성약물 사용 상태 예측"""
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
            'cns_depression_score': auxiliary['cns_depression_score'].cpu().numpy()[0],
            'cns_analysis': {
                'hr_depression': auxiliary['cns_details']['hr_depression'].cpu().numpy()[0],
                'movement_depression': auxiliary['cns_details']['movement_depression'].cpu().numpy()[0],
                'arousal_depression': auxiliary['cns_details']['arousal_depression'].cpu().numpy()[0],
                'respiratory_depression': auxiliary['cns_details']['respiratory_depression'].cpu().numpy()[0]
            },
            'trend_analysis': {
                'trend_slopes': auxiliary['trend_slopes'].cpu().numpy()[0],
                'temporal_weights': auxiliary['temporal_weights'].cpu().numpy()[0]
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
        all_cns_scores = []
        
        with torch.no_grad():
            for data, target in test_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                output, auxiliary = self.model(data)
                pred = output.argmax(dim=1)
                
                all_preds.extend(pred.cpu().numpy())
                all_targets.extend(target.cpu().numpy())
                all_cns_scores.extend(auxiliary['cns_depression_score'].cpu().numpy())
        
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
            'cns_scores': {
                'mean': np.mean(all_cns_scores),
                'std': np.std(all_cns_scores)
            },
            'total_samples': len(all_targets)
        }
        
        print("📊 향정신성약물 탐지 모델 평가 결과:")
        for metric, value in metrics.items():
            if metric not in ['classification_report', 'cns_scores']:
                print(f"  {metric}: {value:.4f}")
        
        return metrics

def create_psychoactive_training_data():
    """향정신성약물 탐지 훈련 데이터셋 생성 (시뮬레이션)"""
    print("📊 향정신성약물 탐지 훈련 데이터셋 생성...")
    
    np.random.seed(42)
    
    # 정상 상태 (클래스 0)
    normal_data = []
    for _ in range(600):
        hr = np.random.normal(72, 10)
        hrv = np.random.normal(45, 12)
        stress = np.random.normal(20, 8)
        temp = np.random.normal(36.5, 0.3)
        movement = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
        o2sat = np.random.normal(98, 2)
        resp_rate = np.random.normal(16, 3)
        sleep_state = np.random.choice([0, 1, 2, 3], p=[0.7, 0.2, 0.05, 0.05])
        
        normal_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate, sleep_state])
    
    # 벤조디아제핀 (클래스 1) - 점진적 CNS 억제
    benzo_data = []
    for _ in range(120):
        hr = np.random.normal(65, 8)  # 약간 감소
        hrv = np.random.normal(35, 8)  # 감소
        stress = np.random.normal(10, 5)  # 크게 감소 (진정효과)
        temp = np.random.normal(36.3, 0.2)  # 약간 감소
        movement = np.random.choice([0, 1, 2], p=[0.8, 0.15, 0.05])  # 활동 감소
        o2sat = np.random.normal(97, 2)
        resp_rate = np.random.normal(14, 2)  # 약간 감소
        sleep_state = np.random.choice([0, 1, 2, 3], p=[0.3, 0.4, 0.2, 0.1])  # 진정상태
        
        benzo_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate, sleep_state])
    
    # 바르비튜레이트 (클래스 2) - 심각한 CNS 억제
    barbiturate_data = []
    for _ in range(80):
        hr = np.random.normal(58, 6)  # 크게 감소
        hrv = np.random.normal(30, 6)  # 크게 감소
        stress = np.random.normal(5, 3)  # 매우 낮음
        temp = np.random.normal(36.0, 0.3)  # 감소
        movement = np.random.choice([0, 1, 2], p=[0.9, 0.08, 0.02])  # 거의 정지
        o2sat = np.random.normal(95, 3)  # 감소
        resp_rate = np.random.normal(10, 2)  # 크게 감소
        sleep_state = np.random.choice([0, 1, 2, 3], p=[0.1, 0.2, 0.5, 0.2])  # 깊은 진정
        
        barbiturate_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate, sleep_state])
    
    # Z-약물 (클래스 3) - 수면 중심 억제
    z_drug_data = []
    for _ in range(60):
        hr = np.random.normal(68, 7)  # 경미한 감소
        hrv = np.random.normal(40, 8)  # 약간 감소
        stress = np.random.normal(15, 6)  # 감소
        temp = np.random.normal(36.4, 0.2)
        movement = np.random.choice([0, 1, 2], p=[0.75, 0.2, 0.05])
        o2sat = np.random.normal(98, 1)  # 거의 정상
        resp_rate = np.random.normal(15, 2)  # 약간 감소
        sleep_state = np.random.choice([0, 1, 2, 3], p=[0.2, 0.3, 0.3, 0.2])  # 수면 유도
        
        z_drug_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate, sleep_state])
    
    # 항정신병약 (클래스 4) - 운동 억제 중심
    antipsychotic_data = []
    for _ in range(40):
        hr = np.random.normal(70, 8)  # 약간의 변화
        hrv = np.random.normal(38, 8)  # 약간 감소
        stress = np.random.normal(25, 10)  # 다양한 변화
        temp = np.random.normal(36.4, 0.3)
        movement = np.random.choice([0, 1, 2], p=[0.85, 0.12, 0.03])  # 운동 억제
        o2sat = np.random.normal(98, 2)
        resp_rate = np.random.normal(16, 3)  # 거의 정상
        sleep_state = np.random.choice([0, 1, 2, 3], p=[0.4, 0.3, 0.2, 0.1])
        
        antipsychotic_data.append([hr, hrv, stress, temp, movement, o2sat, resp_rate, sleep_state])
    
    # 데이터 결합
    all_data = np.vstack([normal_data, benzo_data, barbiturate_data, z_drug_data, antipsychotic_data])
    labels = np.hstack([
        np.zeros(600), 
        np.ones(120), 
        np.full(80, 2), 
        np.full(60, 3), 
        np.full(40, 4)
    ])
    
    return all_data, labels

def main():
    """메인 실행 함수"""
    print("🧠 향정신성약물 탐지 Transformer 모델 훈련 시작")
    
    # 데이터 생성
    data, labels = create_psychoactive_training_data()
    
    # 훈련자 초기화
    trainer = PsychoactiveDetectionTrainer()
    
    # 데이터를 DataFrame으로 변환
    df = pd.DataFrame(data, columns=['heartRate', 'hrv', 'stressLevel', 'bodyTemperature', 
                                   'movementStatus', 'oxygenSaturation', 'respiratoryRate', 'sleepStatus'])
    df['movementStatus'] = df['movementStatus'].map({0: 'stationary', 1: 'walking', 2: 'running'})
    df['sleepStatus'] = df['sleepStatus'].map({0: 'awake', 1: 'light_sleep', 2: 'deep_sleep', 3: 'rem_sleep'})
    
    # 데이터 전처리
    sequences, sequence_labels = trainer.prepare_data(df, pd.Series(labels))
    
    # 모델 훈련
    trainer.train_with_validation(sequences, sequence_labels, val_split=0.2)
    
    # 테스트 평가
    print("\n🎯 최종 모델 평가...")
    X_train, X_test, y_train, y_test = train_test_split(sequences, sequence_labels, 
                                                        test_size=0.2, random_state=42, 
                                                        stratify=sequence_labels)
    
    test_dataset = PsychoactiveBiometricDataset(X_test, y_test, augment=False)
    metrics = trainer.evaluate(test_dataset)
    
    print("🎉 향정신성약물 탐지 시스템 훈련 완료!")

if __name__ == "__main__":
    main()