import { AdminMenuPermission, Page } from '../types';

/**
 * 관리자 메뉴 권한 설정과 사이드바 라벨이 같은 기준을 쓰도록 공통 메뉴 목록을 제공합니다.
 */
export const ADMIN_MENU_OPTIONS: Array<{ id: AdminMenuPermission; label: string }> = [
  { id: Page.CONTROLLERS, label: '관제요원관리' },
  { id: Page.WELFARE, label: '복지사관리' },
  { id: Page.MEMBERS, label: '회원 관리' },
  { id: Page.GUARDIANS, label: '보호자관리' },
  { id: Page.HISTORY, label: 'AI 응급 이력' },
  { id: Page.SETTINGS, label: '시스템 설정' },
  { id: Page.ADMINS, label: '관리자관리' },
];
