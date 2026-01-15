
import React from 'react';
import { 
  Activity, Brain, GitPullRequest, Hospital, Scale, Tag, 
  ShieldCheck, MessageSquare, MapPin, Users, Navigation, 
  Bell, Share2, Database, Monitor 
} from 'lucide-react';
import { SystemStatus, StatusCardProps, KPI, ActivityEvent } from './types';

export const COLORS = {
  bg: '#0a0f1c',
  card: '#121b2b',
  border: '#1e293b',
  green: '#00ff88',
  yellow: '#ffb800',
  red: '#ff4757',
  blue: '#3742fa',
  muted: '#94a3b8'
};

export const INITIAL_SYSTEM_CARDS: StatusCardProps[] = [
  { 
    id: '1', 
    title: '생체 신호 엔진', 
    icon: <Activity className="w-5 h-5" />, 
    value: '12', 
    subText: '활성 스트림 수', 
    status: SystemStatus.OPERATIONAL,
    details: {
      description: '전국 구급차에서 송신되는 실시간 환자 생체 신호(ECG, SpO2, BP)를 AI로 분석하여 이상 징후를 즉각 감지합니다.',
      metrics: [
        { label: '평균 지연 시간', value: '15ms' },
        { label: '데이터 처리량', value: '1.2GB/min' },
        { label: '동시 접속 기기', value: '452대' }
      ],
      uptime: '99.99%',
      lastUpdate: '방금 전'
    }
  },
  { 
    id: '2', 
    title: '자율 학습 시스템', 
    icon: <Brain className="w-5 h-5" />, 
    value: '96.2%', 
    subText: '학습 모델 정확도', 
    status: SystemStatus.PROCESSING,
    details: {
      description: '과거 응급 상황 데이터를 기반으로 증상별 최적 병상 배정 모델을 지속적으로 학습합니다. 현재 GPU 클러스터 4개 노드가 가동 중입니다.',
      metrics: [
        { label: '학습 에포크', value: '1,240' },
        { label: '모델 버전', value: 'v4.5.2-alpha' },
        { label: 'GPU 부하율', value: '82%' }
      ],
      uptime: '98.5%',
      lastUpdate: '12분 전'
    }
  },
  { 
    id: '3', 
    title: '워크플로우 엔진', 
    icon: <GitPullRequest className="w-5 h-5" />, 
    value: '3', 
    subText: '활성 응급 사례', 
    status: SystemStatus.OPERATIONAL,
    details: {
      description: '현재 진행 중인 응급 상황의 전체 프로세스를 관리합니다. 신고 접수부터 병원 이송 완료까지의 모든 단계를 추적합니다.',
      metrics: [
        { label: '평균 소요 시간', value: '24분' },
        { label: '최대 동시 처리', value: '15건' },
        { label: '자동화 단계 비율', value: '75%' }
      ],
      uptime: '100%',
      lastUpdate: '2분 전'
    }
  },
  { 
    id: '4', 
    title: '병원 매칭 API', 
    icon: <Hospital className="w-5 h-5" />, 
    value: '414', 
    subText: 'NEDC 연결됨', 
    status: SystemStatus.OPERATIONAL,
    details: {
      description: '국가응급의료진료정보망(NEDC)과 실시간 연동되어 전국 병상의 가용 상태를 파악하고 최적의 병원을 매칭합니다.',
      metrics: [
        { label: '연동 병원 수', value: '414개소' },
        { label: 'API 성공률', value: '99.8%' },
        { label: '응답 속도', value: '120ms' }
      ],
      uptime: '99.98%',
      lastUpdate: '실시간'
    }
  },
  { id: '5', title: '의료 가중치 시스템', icon: <Scale className="w-5 h-5" />, value: '1,247', subText: '오늘의 처리 건수', status: SystemStatus.OPERATIONAL },
  { id: '6', title: '데이터 레이블링', icon: <Tag className="w-5 h-5" />, value: '23', subText: '대기 중인 항목', status: SystemStatus.WARNING },
  { id: '7', title: '품질 관리 (QA)', icon: <ShieldCheck className="w-5 h-5" />, value: '99.97%', subText: '시스템 가동률', status: SystemStatus.OPERATIONAL },
  { id: '8', title: '피드백 분석', icon: <MessageSquare className="w-5 h-5" />, value: '84', subText: '일일 피드백 건수', status: SystemStatus.OPERATIONAL },
  { id: '9', title: '실시간 위치 추적', icon: <MapPin className="w-5 h-5" />, value: '18', subText: '활성 구급대 유닛', status: SystemStatus.OPERATIONAL },
  { id: '10', title: '자원 관리 시스템', icon: <Users className="w-5 h-5" />, value: '78%', subText: '전체 가용 용량', status: SystemStatus.OPERATIONAL },
  { id: '11', title: '경로 최적화', icon: <Navigation className="w-5 h-5" />, value: '45', subText: '분당 계산 횟수', status: SystemStatus.OPERATIONAL },
  { id: '12', title: '알림 서비스', icon: <Bell className="w-5 h-5" />, value: '1.2k', subText: '전송 성공률 99.8%', status: SystemStatus.OPERATIONAL },
  { id: '13', title: '소켓 통신 상태', icon: <Share2 className="w-5 h-5" />, value: '42ms', subText: '평균 지연 시간', status: SystemStatus.OPERATIONAL },
  { id: '14', title: '캐시 시스템', icon: <Database className="w-5 h-5" />, value: '92.4%', subText: '히트율 (Hit Rate)', status: SystemStatus.OPERATIONAL },
];

export const INITIAL_KPIS: KPI[] = [
  { label: '평균 응답 시간', value: '4.2분', trend: '-12%', isPositive: true },
  { label: '환자 생존율', value: '94.8%', trend: '+2.1%', isPositive: true },
  { label: '시스템 예측 정확도', value: '96.2%', trend: '+0.5%', isPositive: true },
  { label: '자원 부하율', value: '78%', trend: '+5%', isPositive: false },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: '1', timestamp: '09:23:45', message: '응급 사례 #E2024-0156이 7번 구급 유닛에 배정되었습니다.', level: 'info' },
  { id: '2', timestamp: '09:21:12', message: '서울대학교 병원 응급실 병상 확보가 완료되었습니다.', level: 'info' },
  { id: '3', timestamp: '09:19:05', message: '환자 #P891234의 생체 신호 이상이 감지되었습니다.', level: 'critical' },
  { id: '4', timestamp: '09:18:22', message: '경로 최적화 완료: 도착 예상 시간 12% 단축되었습니다.', level: 'info' },
  { id: '5', timestamp: '09:15:30', message: '전 시스템 백업이 성공적으로 완료되었습니다.', level: 'info' },
  { id: '6', timestamp: '09:12:10', message: '강남구 지역에 새로운 구급 유닛 #B22가 배정되었습니다.', level: 'info' },
];
