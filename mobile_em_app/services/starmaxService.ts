// STARMAX BLE SDK 통합 서비스
import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export interface StarmaxDevice {
  id: string; // deviceId from plugin
  name: string;
  rssi: number;
  isConnected: boolean;
  modelNumber?: string;
  manufacturer?: string;
  firmwareVersion?: string;
  batteryLevel?: number;
}

interface RealTimeData {
  heartRate: number;
  bloodPressureSys: number;
  bloodPressureDia: number;
  spO2: number;
  temperature: number;
  steps: number;
  sleep: number;
  stress: number;
  respiratoryRate: number;
  hrv: number;
  timestamp: number;
}

interface StarmaxResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class StarmaxService {
  private isConnected: boolean = false;
  private currentDevice: StarmaxDevice | null = null;
  private dataCallback: ((data: RealTimeData) => void) | null = null;
  private connectionCallback: ((connected: boolean) => void) | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await BleClient.initialize();
      this.isInitialized = true;
      console.log('BLE Client Initialized');
    } catch (error) {
      console.error('BLE initialize failed', error);
    }
  }

  // 실제 STARMAX BLE SDK 시뮬레이션 (데이터 부분은 아직 프로토콜 미정이므로 시뮬레이션 유지)
  private simulateRealTimeData(): RealTimeData {
    const now = Date.now();
    
    // 이전 데이터를 기반으로 자연스러운 변화 생성
    const lastData = this.getLastData();
    
    const updateValue = (base: number, min: number, max: number, variance: number): number => {
      const change = (Math.random() - 0.5) * variance;
      let newValue = (lastData ? this.getDataValue(lastData, base) : base) + change;
      if (newValue < min) newValue = min + Math.random() * variance;
      if (newValue > max) newValue = max - Math.random() * variance;
      return Number(newValue.toFixed(1));
    };

    return {
      heartRate: Math.round(updateValue(72, 60, 100, 3)),
      bloodPressureSys: Math.round(updateValue(120, 110, 140, 2)),
      bloodPressureDia: Math.round(updateValue(80, 70, 90, 2)),
      spO2: Math.round(updateValue(98, 95, 100, 0.5)),
      temperature: updateValue(36.6, 36.3, 37.2, 0.1),
      steps: Math.round(updateValue(4520, 0, 20000, 5)),
      sleep: updateValue(7.2, 0, 12, 0.1),
      stress: Math.round(updateValue(24, 0, 100, 2)),
      respiratoryRate: Math.round(updateValue(16, 12, 20, 1)),
      hrv: Math.round(updateValue(45, 20, 200, 3)),
      timestamp: now
    };
  }

  private getLastData(): RealTimeData | null {
    // 로컬 스토리지나 메모리에서 마지막 데이터 가져오기
    return null;
  }

  private getDataValue(data: RealTimeData, base: number): number {
    // base 값에 따라 적절한 필드 반환
    if (base === 72) return data.heartRate;
    if (base === 120) return data.bloodPressureSys;
    if (base === 80) return data.bloodPressureDia;
    if (base === 98) return data.spO2;
    if (base === 36.6) return data.temperature;
    if (base === 4520) return data.steps;
    if (base === 7.2) return data.sleep;
    if (base === 24) return data.stress;
    if (base === 16) return data.respiratoryRate;
    if (base === 45) return data.hrv;
    return base;
  }

  // 블루투스 권한 확인 및 요청
  async requestBlePermissions(): Promise<boolean> {
    try {
      // 웹 환경 체크
      const isWeb = typeof navigator !== 'undefined';
      const hasBluetooth = isWeb && (navigator as any).bluetooth;

      if (hasBluetooth) {
        return true;
      }

      // 웹인데 블루투스가 없는 경우 (iOS Safari 등)
      if (isWeb && !hasBluetooth) {
        console.warn('Web Bluetooth is not supported in this browser');
        // 웹에서는 권한 요청이 불가능하므로 true를 반환하고 실제 스캔 시 에러 처리
        return true; 
      }

      // 네이티브 환경 (Capacitor)
      try {
        const isEnabled = await BleClient.isEnabled();
        if (!isEnabled) {
          await BleClient.enable();
        }
      } catch (e) {
        console.warn('BleClient.isEnabled/enable not supported or failed', e);
      }

      const client = BleClient as any;
      if (typeof client.checkPermissions === 'function') {
        const status = await client.checkPermissions();
        const isGranted = 
          (status.bluetoothScan === 'granted' && status.bluetoothConnect === 'granted') ||
          (status.location === 'granted');

        if (isGranted) return true;
        
        if (typeof client.requestPermissions === 'function') {
          const requestStatus = await client.requestPermissions();
          return (
            (requestStatus.bluetoothScan === 'granted' && requestStatus.bluetoothConnect === 'granted') ||
            (requestStatus.location === 'granted')
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Permission request failed', error);
      return true;
    }
  }

  // BLE 스캐닝 (실제 기기 검색)
  async scanForDevices(): Promise<StarmaxDevice[]> {
    if (!this.isInitialized) await this.init();

    // 웹 브라우저 블루투스 지원 여부 확인
    const isWeb = typeof navigator !== 'undefined';
    const hasBluetooth = isWeb && (navigator as any).bluetooth;

    if (isWeb && !hasBluetooth) {
      throw new Error('현재 브라우저가 블루투스를 지원하지 않습니다. 안드로이드 크롬 등을 사용해주세요.');
    }

    // 권한 확인 (네이티브용)
    const hasPermission = await this.requestBlePermissions();
    if (!hasPermission) {
      throw new Error('블루투스 권한이 거부되었습니다.');
    }

    const foundDevices: Map<string, StarmaxDevice> = new Map();

    try {
      console.log('Starting BLE Scan...');

      if (hasBluetooth) {
        try {
          console.log('Requesting Web Bluetooth Device (Accept All)...');
          // 특정 필터 대신 모든 기기를 검색하되, optionalServices에 STARMAX UUID 포함
          const device = await BleClient.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              '6e400001-b5a3-f393-e0a9-e50e24dcca9d', // STARMAX 서비스
              '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
              '0000180f-0000-1000-8000-00805f9b34fb'  // Battery Service
            ]
          } as any);

          if (device) {
            console.log('Web Bluetooth Device Selected:', device.name);
            return [{
              id: device.deviceId,
              name: device.name || 'STARMAX Device',
              rssi: -50,
              isConnected: false
            }];
          }
          return [];
        } catch (webError: any) {
          console.warn('Web Bluetooth Request Failed:', webError);
          if (webError.message?.includes('User cancelled') || webError.name === 'NotFoundError') {
            return [];
          }
          throw webError;
        }
      }

      // 네이티브 앱 환경 (requestLEScan 사용)
      await BleClient.requestLEScan(
        {
          allowDuplicates: false,
        },
        (result: ScanResult) => {
          if (result.device && result.device.name && result.device.name.toUpperCase().startsWith('STARMAX')) {
            if (!foundDevices.has(result.device.deviceId)) {
              console.log('Found Starmax Device:', result.device.name);
              foundDevices.set(result.device.deviceId, {
                id: result.device.deviceId,
                name: result.device.name,
                rssi: result.rssi || -100,
                isConnected: false
              });
            }
          }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 5000));
      await BleClient.stopLEScan();
      
      return Array.from(foundDevices.values());
    } catch (error) {
      // 웹 환경에서 requestDevice가 취소되거나 실패했을 때 이미 위에서 처리했으므로,
      // 여기로 넘어오는 에러는 네이티브 스캔 에러이거나 기타 에러임.
      
      console.error('BLE Scan Error:', error);
      
      // 웹 환경 에러 무시 (위에서 처리됨)
      if (typeof navigator !== 'undefined' && (navigator as any).bluetooth && String(error).includes('User cancelled')) {
        return [];
      }

      throw error;
    }
  }

  // 기기 연결
  async connectDevice(device: StarmaxDevice): Promise<StarmaxResponse> {
    if (!this.isInitialized) await this.init();

    try {
      console.log('Connecting to device (GATT):', device.id);
      // 안드로이드 크롬 및 네이티브 환경에서 연결 안정성을 위해
      await BleClient.connect(device.id, (deviceId) => this.onDisconnect(deviceId));
      console.log('GATT Connected successfully');
      
      // 연결 후 서비스 발견 및 데이터 동기화를 위해 잠시 대기 (안정성 확보)
      if (Capacitor.isNativePlatform()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 기기 정보 읽기 (Device Information Service: 0x180A)
      let modelNumber = 'Unknown Model';
      let manufacturer = 'Starmax';
      let firmwareVersion = '1.0.0';
      let batteryLevel = 100;

      // Web Bluetooth의 경우 서비스 UUID를 소문자 풀 형식으로 사용하는 것이 더 안정적임
      const DIS_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb';
      const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';

      try {
        // Model Number String (0x2A24)
        const modelView = await BleClient.read(device.id, DIS_SERVICE, '00002a24-0000-1000-8000-00805f9b34fb');
        modelNumber = new TextDecoder().decode(modelView);
      } catch (e) { console.warn('Failed to read Model Number', e); }

      try {
        // Manufacturer Name String (0x2A29)
        const manufacturerView = await BleClient.read(device.id, DIS_SERVICE, '00002a29-0000-1000-8000-00805f9b34fb');
        manufacturer = new TextDecoder().decode(manufacturerView);
      } catch (e) { console.warn('Failed to read Manufacturer Name', e); }

      try {
        // Firmware Revision String (0x2A26)
        const firmwareView = await BleClient.read(device.id, DIS_SERVICE, '00002a26-0000-1000-8000-00805f9b34fb');
        firmwareVersion = new TextDecoder().decode(firmwareView);
      } catch (e) { console.warn('Failed to read Firmware Version', e); }

      try {
        // Battery Level (0x180F -> 0x2A19)
        const batteryView = await BleClient.read(device.id, BATTERY_SERVICE, '00002a19-0000-1000-8000-00805f9b34fb');
        batteryLevel = batteryView.getUint8(0);
      } catch (e) { console.warn('Failed to read Battery Level', e); }

      this.currentDevice = {
        ...device,
        modelNumber,
        manufacturer,
        firmwareVersion,
        batteryLevel,
        isConnected: true
      };
      
      this.isConnected = true;
      
      if (this.connectionCallback) {
        this.connectionCallback(true);
      }
      
      // 연결 후 데이터 수신 시뮬레이션 시작 (프로토콜 미정으로 인해)
      this.startDataSimulation();

      return { success: true, data: this.currentDevice };
    } catch (error) {
      console.error('Connection failed:', error);
      return { success: false, error: String(error) };
    }
  }

  private onDisconnect(deviceId: string) {
    console.log('Disconnected from device:', deviceId);
    if (this.currentDevice && this.currentDevice.id === deviceId) {
      this.isConnected = false;
      this.currentDevice = null;
      if (this.connectionCallback) {
        this.connectionCallback(false);
      }
    }
  }

  private simulationInterval: any = null;

  // 데이터 수신 시작 (시뮬레이션)
  startDataSimulation() {
    if (this.dataCallback && !this.simulationInterval) {
      this.simulationInterval = setInterval(() => {
        if (this.isConnected && this.dataCallback) {
          const data = this.simulateRealTimeData();
          this.dataCallback(data);
        }
      }, 1000);
    }
  }

  // 데이터 수신 중지 (시뮬레이션)
  stopDataSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // 데이터 리스너 등록
  onData(callback: (data: RealTimeData) => void) {
    this.dataCallback = callback;
  }
  
  // 연결 상태 리스너 등록
  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallback = callback;
  }

  // 연결 해제
  async disconnectDevice() {
    if (this.currentDevice) {
        try {
            await BleClient.disconnect(this.currentDevice.id);
        } catch (e) {
            console.error('Disconnect error', e);
        }
    }
    this.isConnected = false;
    this.currentDevice = null;
  }

  // 건강 제어 설정 (시뮬레이션)
  async setHealthControl(settings: any): Promise<StarmaxResponse> {
    console.log('Setting health control:', settings);
    return { success: true };
  }

  // QR 코드에서 MAC 주소 추출 및 연결 지원
  async scanWithMacFilter(targetMac: string): Promise<StarmaxDevice[]> {
    const isNative = Capacitor.isNativePlatform();
    
    if (!isNative) {
      // 웹 환경 (Web Bluetooth) - 기존 로직 유지
      const isWeb = typeof navigator !== 'undefined';
      const hasBluetooth = isWeb && (navigator as any).bluetooth;
      
      if (hasBluetooth) {
        console.log(`[Web] Requesting Bluetooth Device (Gesture context)...`);
        try {
          const device = await BleClient.requestDevice({
            filters: [
              { namePrefix: 'STARMAX' },
              { namePrefix: 'Smart Band' },
              { namePrefix: 'G1' },
              { namePrefix: 'S5' }
            ],
            optionalServices: [
              '6e400001-b5a3-f393-e0a9-e50e24dcca9d',
              '0000180a-0000-1000-8000-00805f9b34fb',
              '0000180f-0000-1000-8000-00805f9b34fb'
            ]
          } as any);

          if (device) {
            return [{
              id: device.deviceId,
              name: device.name || 'STARMAX Device',
              rssi: -50,
              isConnected: false
            }];
          }
          return [];
        } catch (error: any) {
          console.error('Web Bluetooth Request Error:', error);
          if (error.name === 'NotFoundError' || error.message?.includes('User cancelled')) {
            return [];
          }
          throw error;
        }
      }
    }

    // 네이티브 앱 환경 (Android/iOS)
    console.log(`[Native] Starting filtered scan for MAC: ${targetMac}`);
    if (!this.isInitialized) await this.init();
    
    // 권한 확인
    await this.requestBlePermissions();

    // MAC 주소 형식 정규화
    const cleanMac = targetMac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    const foundDevices: StarmaxDevice[] = [];

    return new Promise(async (resolve, reject) => {
      let isResolved = false;
      const timeout = setTimeout(async () => {
        if (!isResolved) {
          isResolved = true;
          await BleClient.stopLEScan();
          resolve(foundDevices);
        }
      }, 5000); // 5초 동안 검색

      try {
        await BleClient.requestLEScan(
          {
            allowDuplicates: false,
          },
          (result: ScanResult) => {
            // 안드로이드의 경우 deviceId가 MAC 주소인 경우가 많음
            const deviceId = result.device.deviceId.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
            const deviceName = result.device.name || '';
            
            // MAC 주소 매칭 또는 이름 기반 매칭 (이름에 STARMAX가 포함되어 있는지 확인)
            if (deviceId.includes(cleanMac) || (deviceName.toUpperCase().includes('STARMAX') && cleanMac.includes(deviceId))) {
              console.log('Target Device Found:', deviceName, result.device.deviceId);
              
              const device: StarmaxDevice = {
                id: result.device.deviceId,
                name: deviceName || 'STARMAX Device',
                rssi: result.rssi || -100,
                isConnected: false
              };

              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                BleClient.stopLEScan().then(() => {
                  resolve([device]);
                });
              }
            }
          }
        );
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      }
    });
  }

  // QR 코드 텍스트에서 MAC 주소 추출 시도
  parseMacFromQr(text: string): string | null {
    if (!text) return null;
    
    // 1. 표준 MAC 주소 형식 (XX:XX:XX:XX:XX:XX 또는 XX-XX-XX-XX-XX-XX)
    const standardMacRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
    const standardMatch = text.match(standardMacRegex);
    if (standardMatch) return standardMatch[0].toUpperCase();
    
    // 2. 구분자 없는 12자리 16진수 (URL 파라미터 등에서 흔함)
    // 앞뒤에 문자가 있을 수 있으므로 12자리를 정확히 찾아야 함
    const plainMacRegex = /[0-9A-Fa-f]{12}/;
    const plainMatch = text.match(plainMacRegex);
    if (plainMatch) {
      const raw = plainMatch[0].toUpperCase();
      // XX:XX... 형식으로 변환하여 반환 (비교를 위해)
      return raw.match(/.{1,2}/g)?.join(':') || raw;
    }
    
    return null;
  }
}

export const starmaxService = new StarmaxService();
