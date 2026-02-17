import { io } from 'socket.io-client';

/**
 * Socket.IO Client Singleton
 * 
 * Creates a single socket connection to the backend.
 * Auto-connects to the server at the same origin (proxied via Vite in dev).
 * 
 * Usage:
 *   import socket from '../socket/socket';
 *   socket.emit('join-room', { roomId, userId, userName });
 *   socket.on('user-joined', (data) => { ... });
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
    autoConnect: false, // We manually connect when entering a room
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Debug logging in development
socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
});

socket.on('connect_error', (err) => {
    console.error('🔌 Socket connection error:', err.message);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
});

export default socket;
