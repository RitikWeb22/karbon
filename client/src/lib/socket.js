import { io } from 'socket.io-client';

let socketInstance = null;

const getSocketServerUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (typeof window === 'undefined') return 'http://localhost:5000';
  if (window.location.port === '5173' || window.location.port === '5174') {
    return `http://${window.location.hostname}:5000`;
  }
  return window.location.origin;
};

export const getSocket = () => {
  if (!socketInstance) {
    const token = localStorage.getItem('karbon_token');
    socketInstance = io(getSocketServerUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = localStorage.getItem('karbon_token');
  if (token) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
};
