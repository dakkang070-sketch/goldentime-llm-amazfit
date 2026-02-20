/**
 * STARMAX BLE 데이터 통합 서비스
 * 실시간 생체 데이터 처리 및 응급 상황 자동 감지
 */

const BiometricData = require('../models/BiometricData');
const EmergencyCase = require('../models/EmergencyCase');
const User = require('../models/User');
const { generateNonDiagnosticSummary } = require('./ollamaService');
const { autoMatchParamedicForCase } = require('./matchingService');
const logger = require('../utils/logger');

class StarmaxDataService {
  constructor() {
    this.emergencyThresholds = {
      heartRate: { criticalLow: 40, criticalHigh: 150, warningHigh: 120 },
      bloodPressure: { criticalSys: 180, criticalDia: 110, warningSys: 140, warningDia: 90 },
      spO2: { critical: 90, warning: 95 },
      temperature: { criticalLow: 35, criticalHigh: 39, warningLow: 35.5, warningHigh: 38 },
      stress: { critical: 80, warning: 60 }
    };
  }

  /**
   * STARMAX BLE 데이터 처리
   */
  async processStarmaxData(userId, data) {
    try {
      const {
        heartRate,
        bloodPressureSys,
        bloodPressureDia,
        spO2,
        temperature,
        steps = 0,
        sleep = 0,
        stress = 0,
        respiratoryRate = 16,
        hrv = 50,
        location,
        timestamp = new Date().toISOString()
      } = data;

      // 데이터 유효성 검증
      if (!this.validateData(data)) {
        throw new Error('유효하지 않은 생체 데이터입니다.');
      }

      // 사용자 확인
      const user = await User.findById(userId);
      if (!user || !user.isEmergencyAppUser) {
        throw new Error('응급 사용자를 찾을 수 없습니다.');
      }

      // 생체 데이터 저장
      const biometricData = new BiometricData({
        userId,
        collectedAt: new Date(timestamp),
        heartRate,
        bloodPressure: {
          systolic: bloodPressureSys,
          diastolic: bloodPressureDia
        },
        spO2,
        bodyTemperature: temperature,
        steps,
        sleepStatus: sleep > 0 ? 'light_sleep' : 'awake',
        stressLevel: stress,
        respiratoryRate,
        location: location || {
          lat: 37.5665,
          lng: 126.9780,
          timestamp: new Date()
        },
        rawData: data
      });

      await biometricData.save();

      // 응급 상황 분석
      const analysis = await this.analyzeEmergencySituation(userId, data);
      
      // 분석 결과 업데이트
      biometricData.analysis = {
        isAnomaly: analysis.hasAnomaly,
        emergencyLevel: analysis.emergencyLevel,
        analysisResult: analysis.analysisText,
        analyzedAt: new Date()
      };

      await biometricData.save();

      // 응급 상황 자동 생성 (레벨 3 이상)
      if (analysis.emergencyLevel >= 3) {
        await this.createEmergencyCase(userId, analysis);
      }

      // STARMAX 기기 동기화 시간 업데이트
      if (user.starmaxDevice) {
        user.starmaxDevice.lastSyncAt = new Date();
        await user.save();
      }

      logger.info(`STARMAX 데이터 처리 완료: 사용자 ${userId} - 응급레벨 ${analysis.emergencyLevel}`);

      return {
        success: true,
        data: {
          biometricDataId: biometricData._id,
          emergencyLevel: analysis.emergencyLevel,
          hasAnomaly: analysis.hasAnomaly,
          recommendations: analysis.recommendations
        }
      };
    } catch (error) {
      logger.error('STARMAX 데이터 처리 오류:', error);
      throw error;
    }
  }

  /**
   * 데이터 유효성 검증
   */
  validateData(data) {
    const {
      heartRate,
      bloodPressureSys,
      bloodPressureDia,
      spO2,
      temperature
    } = data;

    // 필수 필드 확인
    if (heartRate === undefined || bloodPressureSys === undefined || 
        bloodPressureDia === undefined || spO2 === undefined || temperature === undefined) {
      return false;
    }

    // 값 범위 확인
    if (heartRate < 0 || heartRate > 250) return false;
    if (bloodPressureSys < 60 || bloodPressureSys > 250) return false;
    if (bloodPressureDia < 40 || bloodPressureDia > 150) return false;
    if (spO2 < 70 || spO2 > 100) return false;
    if (temperature < 30 || temperature > 45) return false;

    return true;
  }

  /**
   * 응급 상황 분석
   */
  async analyzeEmergencySituation(userId, data) {
    const {
      heartRate,
      bloodPressureSys,
      bloodPressureDia,
      spO2,
      temperature,
      stress = 0
    } = data;

    let emergencyLevel = 1;
    const anomalies = [];
    const recommendations = [];

    // 심박수 분석
    if (heartRate < this.emergencyThresholds.heartRate.criticalLow || 
        heartRate > this.emergencyThresholds.heartRate.criticalHigh) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 위험: ${heartRate} bpm`,
        severity: 'critical',
        value: heartRate,
        normalRange: '60-100'
      });
      recommendations.push('즉시 의료진에게 연락하세요');
    } else if (heartRate > this.emergencyThresholds.heartRate.warningHigh) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'heart_rate',
        description: `심박수 증가: ${heartRate} bpm`,
        severity: 'medium',
        value: heartRate,
        normalRange: '60-100'
      });
      recommendations.push('휴식을 취하고 상황을 관찰하세요');
    }

    // 혈압 분석
    if (bloodPressureSys > this.emergencyThresholds.bloodPressure.criticalSys || 
        bloodPressureDia > this.emergencyThresholds.bloodPressure.criticalDia) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'blood_pressure',
        description: `혈압 위험: ${bloodPressureSys}/${bloodPressureDia} mmHg`,
        severity: 'critical',
        value: `${bloodPressureSys}/${bloodPressureDia}`,
        normalRange: '<120/80'
      });
      recommendations.push('고혈압 위기 상황입니다. 즉시 응급실에 가세요');
    } else if (bloodPressureSys > this.emergencyThresholds.bloodPressure.warningSys || 
               bloodPressureDia > this.emergencyThresholds.bloodPressure.warningDia) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'blood_pressure',
        description: `혈압 증가: ${bloodPressureSys}/${bloodPressureDia} mmHg`,
        severity: 'medium',
        value: `${bloodPressureSys}/${bloodPressureDia}`,
        normalRange: '<120/80'
      });
      recommendations.push('혈압이 높습니다. 안정을 취하세요');
    }

    // 산소포화도 분석
    if (spO2 < this.emergencyThresholds.spO2.critical) {
      emergencyLevel = Math.max(emergencyLevel, 4);
      anomalies.push({
        type: 'spo2',
        description: `산소포화도 위험: ${spO2}%`,
        severity: 'critical',
        value: spO2,
        normalRange: '95-100'
      });
      recommendations.push('산소 포화도가 낮습니다. 즉시 의료진에게 연락하세요');
    } else if (spO2 < this.emergencyThresholds.spO2.warning) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'spo2',
        description: `산소포화도 저하: ${spO2}%`,
        severity: 'medium',
        value: spO2,
        normalRange: '95-100'
      });
      recommendations.push('호흡을 깊게 하고 상황을 관찰하세요');
    }

    // 체온 분석
    if (temperature < this.emergencyThresholds.temperature.criticalLow || 
        temperature > this.emergencyThresholds.temperature.criticalHigh) {
      emergencyLevel = Math.max(emergencyLevel, 3);
      anomalies.push({
        type: 'temperature',
        description: `체온 이상: ${temperature}°C`,
        severity: 'high',
        value: temperature,
        normalRange: '36.1-37.2'
      });
      recommendations.push('체온이 비정상입니다. 의료진과 상담하세요');
    }

    // 스트레스 분석
    if (stress > this.emergencyThresholds.stress.critical) {
      emergencyLevel = Math.max(emergencyLevel, 2);
      anomalies.push({
        type: 'stress',
        description: `스트레스 위험: ${stress}/100`,
        severity: 'medium',
        value: stress,
        normalRange: '0-40'
      });
      recommendations.push('스트레스가 높습니다. 휴식이 필요합니다');
    }

    // AI 분석 수행 (응급 상황일 때만)
    let analysisText = '';
    if (emergencyLevel >= 3) {
      try {
        analysisText = await generateNonDiagnosticSummary({
          heartRate,
          bloodPressure: { systolic: bloodPressureSys, diastolic: bloodPressureDia },
          spO2,
          temperature,
          stressLevel: stress
        });
      } catch (error) {
        logger.error('AI 분석 오류:', error);
        analysisText = '응급 상황이 감지되었습니다.';
      }
    }

    return {
      emergencyLevel,
      hasAnomaly: anomalies.length > 0,
      anomalies,
      analysisText,
      recommendations: recommendations.length > 0 ? recommendations : ['상태가 양호합니다']
    };
  }

  /**
   * 응급 상황 자동 생성
   */
  async createEmergencyCase(userId, analysis) {
    try {
      // 최근 5분 내 동일한 응급 상황이 있는지 확인
      const recentEmergency = await EmergencyCase.findOne({
        userId,
        status: { $in: ['detected', 'matched', 'in_progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (recentEmergency) {
        logger.info(`최근 응급 상황 존재: 사용자 ${userId} - ${recentEmergency._id}`);
        return;
      }

      // 사용자 정보 조회
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      // 응급 케이스 생성
      const emergencyCase = new EmergencyCase({
        userId,
        emergencyLevel: analysis.emergencyLevel,
        detectedAnomalies: analysis.anomalies,
        llmAnalysis: {
          analysisText: analysis.analysisText,
          confidence: 0.85,
          analyzedAt: new Date(),
          model: 'llama3.1'
        },
        locations: {
          detectedAt: {
            lat: 37.5665, // 기본 위치 (실제로는 STARMAX 기기 GPS 데이터 사용)
            lng: 126.9780,
            address: '현재 위치'
          },
          current: {
            lat: 37.5665,
            lng: 126.9780,
            address: '현재 위치',
            updatedAt: new Date()
          }
        },
        status: 'detected',
        detectedAt: new Date()
      });

      await emergencyCase.save();

      // 자동 매칭 시작
      autoMatchParamedicForCase(emergencyCase._id);

      logger.warn(`응급 상황 자동 생성: 사용자 ${userId} - 레벨 ${analysis.emergencyLevel} - ${emergencyCase._id}`);

      return emergencyCase;
    } catch (error) {
      logger.error('응급 상황 생성 오류:', error);
      throw error;
    }
  }

  /**
   * STARMAX 기기 상태 업데이트
   */
  async updateDeviceStatus(userId, status, batteryLevel, firmwareVersion) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isEmergencyAppUser) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      if (user.starmaxDevice) {
        user.starmaxDevice.connectionStatus = status;
        if (batteryLevel !== undefined) {
          user.starmaxDevice.batteryLevel = batteryLevel;
        }
        if (firmwareVersion) {
          user.starmaxDevice.firmwareVersion = firmwareVersion;
        }
        user.starmaxDevice.lastSyncAt = new Date();

        await user.save();
      }

      logger.info(`STARMAX 기기 상태 업데이트: 사용자 ${userId} - ${status}`);
    } catch (error) {
      logger.error('기기 상태 업데이트 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자별 최근 데이터 조회
   */
  async getRecentBiometricData(userId, limit = 50, hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const data = await BiometricData.find({
        userId,
        collectedAt: { $gte: startTime }
      })
        .sort({ collectedAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        data: {
          biometricData: data,
          total: data.length,
          timeRange: `${hours}시간`
        }
      };
    } catch (error) {
      logger.error('최근 생체 데이터 조회 오류:', error);
      throw error;
    }
  }

  /**
   // 응급 상황 이력 조회
   */
  async getEmergencyHistory(userId, limit = 20, status = null) {
    try {
      const query = { userId };
      if (status) {
        query.status = status;
      }

      const emergencyCases = await EmergencyCase.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('paramedic.paramedicId', 'name phone')
        .populate('hospital.hospitalId', 'name address phone')
        .lean();

      return {
        success: true,
        data: {
          emergencyCases: emergencyCases.map(ec => ({
            id: ec._id,
            emergencyLevel: ec.emergencyLevel,
            status: ec.status,
            detectedAt: ec.detectedAt,
            detectedAnomalies: ec.detectedAnomalies,
            paramedic: ec.paramedic,
            hospital: ec.hospital,
            locations: ec.locations
          })),
          total: emergencyCases.length
        }
      };
    } catch (error) {
      logger.error('응급 상황 이력 조회 오류:', error);
      throw error;
    }
  }
}

module.exports = new StarmaxDataService();