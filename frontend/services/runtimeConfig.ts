/**
 * 문자열 끝의 슬래시를 제거해 URL 결합 시 중복 슬래시를 방지합니다.
 */
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Vercel/로컬 공통으로 사용할 API base URL을 계산합니다.
 */
export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "",
);

/**
 * 소켓 서버 주소를 계산합니다. 별도 값이 없으면 API base를 재사용합니다.
 */
export const SOCKET_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL,
);

/**
 * 소켓 path를 환경별로 바꿀 수 있게 분리합니다.
 */
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

/**
 * API 경로를 현재 배포 환경에 맞는 절대/상대 URL로 변환합니다.
 */
export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
};
