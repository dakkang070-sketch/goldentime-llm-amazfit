const mongoose = require('mongoose');

/**
 * 의료 전문 라벨링 모델
 * 정교한 다중 라벨 분류 시스템
 */
const medicalLabelingSchema = new mongoose.Schema({
  // 연결된 응급 케이스
  emergencyCaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyCase',
    required: true,
    index: true
  },

  // 연결된 생체 데이터
  biometricDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BiometricData',
    required: true,
    index: true
  },

  // === 1단계: 생체신호 라벨링 ===
  vitalSignLabels: {
    // 심박수 이상 분류
    heartRateAbnormality: {
      type: String,
      enum: [
        'normal',           // 정상 (60-100)
        'bradycardia',      // 서맥 (<60)
        'tachycardia',      // 빈맥 (>100)
        'severe_bradycardia', // 심각한 서맥 (<40)
        'severe_tachycardia', // 심각한 빈맥 (>150)
        'arrhythmia_suspected' // 부정맥 의심
      ]
    },
    
    // 심박수 변화 패턴
    heartRatePattern: {
      type: String,
      enum: [
        'stable',           // 안정적
        'gradual_increase', // 점진적 증가
        'gradual_decrease', // 점진적 감소
        'sudden_spike',     // 급격한 상승
        'sudden_drop',      // 급격한 하락
        'irregular_fluctuation' // 불규칙한 변동
      ]
    },

    // 스트레스 수준 분류
    stressLevel: {
      type: String,
      enum: [
        'low',       // 낮음 (0-30)
        'moderate',  // 보통 (31-60)
        'high',      // 높음 (61-80)
        'severe',    // 심각 (81-100)
        'crisis'     // 위기상황 (>95 + 다른 증상)
      ]
    }
  },

  // === 2단계: 움직임 및 활동 라벨링 ===
  activityLabels: {
    movementType: {
      type: String,
      enum: [
        'resting',          // 휴식
        'normal_walking',   // 일반 보행
        'slow_walking',     // 느린 보행
        'fast_walking',     // 빠른 보행
        'running',          // 달리기
        'irregular_movement', // 불규칙한 움직임
        'no_movement',      // 움직임 없음
        'fall_detected',    // 낙상 감지
        'struggle_movement' // 몸부림 움직임
      ]
    },

    fallRisk: {
      type: String,
      enum: ['none', 'low', 'moderate', 'high', 'imminent']
    },

    mobilityStatus: {
      type: String,
      enum: ['mobile', 'limited', 'immobile', 'assisted', 'bedridden']
    }
  },

  // === 3단계: 응급 상황 분류 ===
  emergencyClassification: {
    // 주요 응급 카테고리
    primaryCategory: {
      type: String,
      enum: [
        'cardiac_event',        // 심장 관련
        'respiratory_distress', // 호흡 곤란
        'neurological_event',   // 신경학적 이벤트
        'trauma_injury',        // 외상
        'metabolic_crisis',     // 대사 위기
        'psychiatric_emergency', // 정신과적 응급
        'environmental_exposure', // 환경적 노출
        'medication_reaction',   // 약물 반응
        'infectious_disease',   // 감염병
        'other_medical'         // 기타 의료적
      ]
    },

    // 세부 하위 분류
    subCategory: {
      type: String,
      enum: [
        // 심장 관련
        'heart_attack_suspected', 'arrhythmia', 'cardiac_arrest', 'chest_pain',
        // 호흡기 관련
        'asthma_attack', 'copd_exacerbation', 'pneumonia', 'respiratory_failure',
        // 신경학적
        'stroke_suspected', 'seizure', 'altered_mental_status', 'head_injury',
        // 외상
        'fall_injury', 'fracture', 'bleeding', 'burns',
        // 기타
        'hypoglycemia', 'dehydration', 'allergic_reaction', 'unknown'
      ]
    },

    // 응급도 정밀 분류
    triageLevel: {
      type: String,
      enum: [
        'level_1_resuscitation', // 소생술 필요
        'level_2_emergent',      // 응급 (10분 이내)
        'level_3_urgent',        // 긴급 (30분 이내)
        'level_4_less_urgent',   // 준긴급 (60분 이내)
        'level_5_non_urgent'     // 비긴급 (120분 이내)
      ]
    }
  },

  // === 4단계: 시간적 패턴 라벨링 ===
  temporalPatterns: {
    onsetSpeed: {
      type: String,
      enum: [
        'sudden',      // 급성 (몇 분 이내)
        'rapid',       // 빠름 (몇 시간 이내)
        'gradual',     // 점진적 (몇 일)
        'chronic'      // 만성적 (지속적)
      ]
    },

    progressionTrend: {
      type: String,
      enum: [
        'improving',    // 호전
        'stable',       // 안정
        'worsening',    // 악화
        'fluctuating'   // 변동
      ]
    },

    durationEstimate: {
      type: String,
      enum: [
        'minutes',      // 몇 분간
        'hours',        // 몇 시간
        'days',         // 며칠간
        'ongoing'       // 지속중
      ]
    }
  },

  // === 5단계: 위험도 평가 ===
  riskAssessment: {
    mortalityRisk: {
      type: String,
      enum: ['very_low', 'low', 'moderate', 'high', 'very_high']
    },

    hospitalAdmissionRisk: {
      type: String,
      enum: ['very_low', 'low', 'moderate', 'high', 'very_high']
    },

    deteriorationRisk: {
      type: String,
      enum: ['very_low', 'low', 'moderate', 'high', 'very_high']
    }
  },

  // === 6단계: 대응 우선순위 ===
  responseLabels: {
    responseUrgency: {
      type: String,
      enum: [
        'immediate',    // 즉시 (0-5분)
        'urgent',       // 긴급 (5-15분)
        'prompt',       // 신속 (15-30분)
        'delayed',      // 지연 가능 (30-60분)
        'routine'       // 일반 (60분+)
      ]
    },

    resourceLevel: {
      type: String,
      enum: [
        'basic_emt',        // 기본 응급구조사
        'advanced_emt',     // 고급 응급구조사
        'paramedic',        // 응급구조사
        'mobile_icu',       // 이동식 중환자실
        'air_ambulance'     // 헬기 응급실
      ]
    },

    hospitalLevel: {
      type: String,
      enum: [
        'primary_care',     // 1차 의료기관
        'secondary_care',   // 2차 의료기관
        'tertiary_care',    // 3차 의료기관
        'trauma_center',    // 외상센터
        'specialty_center'  // 전문센터
      ]
    }
  },

  // === 7단계: 품질 관리 ===
  qualityMetrics: {
    // 라벨링 정확도
    labelingAccuracy: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },

    // 의료진 검증 상태
    medicalValidation: {
      validated: { type: Boolean, default: false },
      validatedBy: { type: String }, // 의료진 ID
      validatedAt: { type: Date },
      validationScore: { type: Number, min: 1, max: 5 },
      validationNotes: { type: String }
    },

    // AI 신뢰도
    aiConfidence: {
      overall: { type: Number, min: 0, max: 1 },
      categoryConfidence: {
        vitalSigns: { type: Number, min: 0, max: 1 },
        emergency: { type: Number, min: 0, max: 1 },
        response: { type: Number, min: 0, max: 1 }
      }
    }
  },

  // === 8단계: 메타데이터 ===
  metadata: {
    labelingMethod: {
      type: String,
      enum: ['manual', 'semi_automatic', 'automatic', 'validated_automatic']
    },

    labelingSource: {
      type: String,
      enum: ['medical_expert', 'ai_model', 'rule_based', 'hybrid']
    },

    dataVersion: { type: String, default: '1.0' },
    
    tags: [String], // 추가 태그들
    
    notes: String,  // 특별 주의사항
    
    createdBy: String,
    updatedBy: String
  }

}, {
  timestamps: true
});

// 복합 인덱스
medicalLabelingSchema.index({ 
  'emergencyClassification.primaryCategory': 1, 
  'emergencyClassification.triageLevel': 1 
});
medicalLabelingSchema.index({ 
  'responseLabels.responseUrgency': 1,
  'riskAssessment.mortalityRisk': 1 
});
medicalLabelingSchema.index({ 
  'qualityMetrics.medicalValidation.validated': 1,
  'qualityMetrics.labelingAccuracy': -1 
});

module.exports = mongoose.model('MedicalLabeling', medicalLabelingSchema);