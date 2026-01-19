import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

/**
 * Socket.IO 연결 초기화
 */
export function connectSocket(token, role) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO 연결됨');
    
    // 인증
    socket.emit('authenticate', { token, role });
  });

  socket.on('authenticated', (data) => {
    console.log('✅ Socket.IO 인증 완료:', data);
  });

  socket.on('auth_error', (error) => {
    console.error('❌ Socket.IO 인증 실패:', error);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO 연결 해제됨');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO 연결 오류:', error);
  });

  return socket;
}

/**
 * Socket.IO 연결 해제
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Socket 인스턴스 가져오기
 */
export function getSocket() {
  return socket;
}

/**
 * 이벤트 리스너 등록 헬퍼
 */
export function onSocketEvent(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * 이벤트 리스너 제거 헬퍼
 */
export function offSocketEvent(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}
