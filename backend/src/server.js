import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import { initGridFS } from './config/gridfs.js';

import { registerRoomHandlers } from './sockets/roomSocket.js';

const PORT = process.env.PORT || 5000;

// ─── HTTP Server ───
const server = http.createServer(app);

// ─── Socket.IO Setup ───
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// ─── Register Socket Handlers ───
io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Register room-specific handlers (join, leave, etc.)
    registerRoomHandlers(io, socket);

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// ─── Start Server ───
const startServer = async () => {
    try {
        // 1. Connect to MongoDB
        await connectDB();

        // 2. Initialize GridFS after DB connection is ready
        initGridFS();

        // 3. Start listening
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

// Export for potential testing use
export { server, io };
