import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Auto-fix SOCKET_URL to point to base host, not api prefix
let baseSocketUrl = SOCKET_URL;
try {
  // If VITE_API_URL includes '/api/v1', strip it for standard WebSocket connection
  if (baseSocketUrl.includes('/api/v1')) {
    baseSocketUrl = baseSocketUrl.replace('/api/v1', '');
  }
} catch (e) {
  console.error("Error formatting socket URL:", e);
}

export const useSocket = (onQueueUpdate) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(baseSocketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('queueUpdate', (data) => {
      console.log('Socket received queueUpdate:', data);
      if (onQueueUpdate) {
        onQueueUpdate(data);
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
};
