import { Member, Biometrics, HealthStats, MemberSettings, ConnectedDevice, Guardian } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const adminService = {
  async getMembers(): Promise<Member[]> {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (!result.success) throw new Error(result.message);
      
      return result.data.map((user: any) => mapUserToMember(user));
    } catch (error) {
      console.error('Failed to fetch members:', error);
      return [];
    }
  },

  async updateMember(member: Partial<Member>): Promise<Member | null> {
    try {
      if (!member.id) throw new Error('Member ID is required');

      // Convert frontend Member model to backend User model structure if needed
      // For now, we'll just send the fields that match the User schema
      const updateData = {
        name: member.name,
        phone: member.phone,
        email: member.email,
        birthDate: member.birthDate,
        height: member.height,
        weight: member.weight,
        bloodType: member.bloodType,
        accountStatus: member.accountStatus,
        // Add other fields as necessary based on backend API capabilities
      };

      const response = await fetch(`${API_URL}/users/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      return mapUserToMember(result.data);
    } catch (error) {
      console.error('Failed to update member:', error);
      return null;
    }
  },

  async deleteMember(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to delete member:', error);
      return false;
    }
  },

  async getSettings(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return null;
    }
  },

  async updateSettings(settings: any): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return null;
    }
  },

  async getAlerts(filters: any = {}): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.severity) queryParams.append('severity', filters.severity);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await fetch(`${API_URL}/alerts?${queryParams.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return [];
    }
  },

  async getMemberAIReport(memberId: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/ai-analysis/member-report/${memberId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      return result.report;
    } catch (error) {
      console.error('Failed to generate AI report:', error);
      return null;
    }
  }
};

const mapUserToMember = (user: any): Member => {
  const latestHealth = user.latestHealth || {};
  
  // Biometrics Mapping
  const biometrics: Biometrics = {
    heartRate: latestHealth.heartRate || 0,
    bloodPressure: latestHealth.bloodPressure ? `${latestHealth.bloodPressure.systolic}/${latestHealth.bloodPressure.diastolic}` : '0/0',
    bloodOxygen: latestHealth.spO2 || 0,
    sleep: latestHealth.sleep || 0,
    temperature: latestHealth.temperature || 36.5,
    bloodGlucose: 0, // Not currently in backend BiometricData
    stress: latestHealth.stressLevel || 0,
    hrv: 0, // Not currently in backend
    ecg: '정상', // Default
    gyroscope: latestHealth.movementStatus === 'fall_detected' ? '낙상 감지' : '안정'
  };

  // Guardian Mapping (Check if backend has this structure)
  const guardian: Guardian = {
    name: user.emergencyContact?.name || '',
    relationship: user.emergencyContact?.relationship || '',
    phone: user.emergencyContact?.phone || ''
  };

  // Device Mapping (Mock for now or derive from backend if available)
  const connectedDevice: ConnectedDevice = {
    modelName: 'STARMAX WATCH',
    serialNumber: 'UNKNOWN',
    lastSyncTime: latestHealth.collectedAt ? new Date(latestHealth.collectedAt).toLocaleTimeString() : '-',
    batteryEfficiency: '알 수 없음',
    signalQuality: '양호'
  };

  // Settings Mapping
  const appSettings: MemberSettings = {
    autoReportEnabled: true,
    locationCollectionEnabled: true,
    healthAnalysisEnabled: true,
    transmissionInterval: '10초'
  };

  // Health Stats (Summary) - This would ideally come from an aggregation endpoint
  const healthStats: HealthStats = {
    averageHeartRate: biometrics.heartRate,
    heartRateRange: { min: 60, max: 100 },
    heartRateHistory: [], // Would need historical data
    averageBloodPressure: biometrics.bloodPressure,
    averageSPO2: biometrics.bloodOxygen,
    minSPO2: 90,
    averageTemperature: biometrics.temperature,
    feverCount: 0,
    healthScore: 80,
    stepsHistory: [],
    stepGoalAchievement: 0,
    averageSleep: biometrics.sleep,
    sleepQuality: '보통',
    averageStress: biometrics.stress,
    caloriesBurned: 0,
    incidentSummary: { total: 0, fall: 0, arrhythmia: 0, lowOxygen: 0, avgResponseTime: '-' },
    weeklyPrediction: '데이터 부족'
  };

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
    age: user.age || 0,
    gender: '남', // Backend needs to provide this
    height: user.height || 0,
    weight: user.weight || 0,
    bloodType: user.bloodType || '',
    phone: user.phone,
    address: '주소 정보 없음', // Backend needs to provide this
    guardian,
    connectedDevice,
    appSettings,
    healthStats,
    riskLevel: user.status === '위험' ? '고위험' : (user.status === '주의' ? '중위험' : '저위험'),
    medicalConditions: user.medicalHistory ? [user.medicalHistory] : [],
    medications: '',
    allergies: '',
    lastActive: latestHealth.collectedAt ? new Date(latestHealth.collectedAt).toLocaleString() : '-',
    deviceBattery: 0, // Need battery info in backend
    status: (user.status === '위험' || user.status === '주의') ? user.status : '정상', 
    accountStatus: user.accountStatus || 'active',
    biometrics
  };
};
