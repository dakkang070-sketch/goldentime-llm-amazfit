const mongoose = require('mongoose');

const emergencyCaseSchema = new mongoose.Schema({
  // 환자 정보
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 응급도 단계 (1-5)
  emergencyLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true,
    index: true
  },
  
  // 감지된 이상 징후
  detectedAnomalies: [{
    type: {
      type: String,
      enum: ['heart_rate', 'movement', 'stress', 'location', 'fall', 'other']
    },
    description: String,
    severity: String
  }],
  
  // LLM 분석 결과
  llmAnalysis: {
    analysisText: String,
    confidence: Number,
    analyzedAt: Date,
    model: String
  },
  
  // 응급구조사 매칭
  paramedic: {
    paramedicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paramedic'
    },
    matchedAt: Date,
    acceptedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'arrived', 'transporting', 'completed', 'cancelled'],
      default: 'pending'
    },
    arrivalTime: Date,
    transportStartTime: Date
  },
  
  // 병원 매칭
  hospital: {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },
    matchedAt: Date,
    estimatedArrivalTime: Date,
    actualArrivalTime: Date,
    status: {
      type: String,
      enum: ['pending', 'matched', 'arrived', 'handed_over', 'cancelled'],
      default: 'pending'
    }
  },
  
  // 위치 정보
  locations: {
    detectedAt: {
      lat: Number,
      lng: Number,
      address: String
    },
    current: {
      lat: Number,
      lng: Number,
      address: String,
      updatedAt: Date
    },
    hospital: {
      lat: Number,
      lng: Number,
      address: String
    }
  },
  
  // 경로 정보
  route: {
    toPatient: {
      distance: Number, // 미터
      duration: Number, // 초
      polyline: String,
      estimatedArrival: Date
    },
    toHospital: {
      distance: Number,
      duration: Number,
      polyline: String,
      estimatedArrival: Date
    }
  },
  
  // 관제사 정보
  controller: {
    controllerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Controller'
    },
    assignedAt: Date
  },
  
  // 매칭 방식
  matchingType: {
    type: String,
    enum: ['auto', 'manual'],
    default: 'auto'
  },
  
  // 상태
  status: {
    type: String,
    enum: ['detected', 'matched', 'in_progress', 'transporting', 'completed', 'cancelled'],
    default: 'detected',
    index: true
  },
  
  // 타임스탬프
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: Date,
  cancelledAt: Date,
  cancelledReason: String
}, {
  timestamps: true
});

// 인덱스 설정
emergencyCaseSchema.index({ status: 1, emergencyLevel: -1 });
emergencyCaseSchema.index({ 'paramedic.paramedicId': 1, status: 1 });
emergencyCaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmergencyCase', emergencyCaseSchema);
