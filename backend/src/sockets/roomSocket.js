/**
 * Room Socket Handler
 * 
 * Manages real-time room events:
 * - join-room / leave-room / disconnect
 * - WebRTC signaling (offer, answer, ice-candidate)
 * - Whiteboard drawing sync (draw, load-whiteboard, clear-whiteboard)
 */
import Room from '../models/Room.js';

// In-memory room participants map
const roomParticipants = new Map();

/**
 * Get participants list for a room
 */
const getRoomParticipants = (roomId) => {
    if (!roomParticipants.has(roomId)) return [];
    return Array.from(roomParticipants.get(roomId).entries()).map(([socketId, userData]) => ({
        socketId,
        ...userData,
    }));
};

/**
 * Register room socket event handlers
 * @param {import('socket.io').Server} io - Socket.IO server instance
 * @param {import('socket.io').Socket} socket - Individual socket connection
 */
const registerRoomHandlers = (io, socket) => {
    /**
     * join-room
     * Payload: { roomId, userId, userName }
     */
    socket.on('join-room', ({ roomId, userId, userName }) => {
        // Join the Socket.IO room
        socket.join(roomId);

        // Store in memory map
        if (!roomParticipants.has(roomId)) {
            roomParticipants.set(roomId, new Map());
        }
        roomParticipants.get(roomId).set(socket.id, { userId, userName });

        // Get current participants list
        const participants = getRoomParticipants(roomId);

        console.log(`👤 ${userName} (${socket.id}) joined room ${roomId} — ${participants.length} participant(s)`);

        // Notify the joining user of existing participants
        socket.emit('room-participants', participants);

        // Notify others in the room that a new user joined
        socket.to(roomId).emit('user-joined', {
            socketId: socket.id,
            userId,
            userName,
        });
    });

    /**
     * leave-room
     * Payload: { roomId }
     */
    socket.on('leave-room', ({ roomId }) => {
        handleLeaveRoom(io, socket, roomId);
    });

    // ─── WebRTC Signaling Events ───
    // These relay signaling data between peers for establishing
    // peer-to-peer WebRTC connections (mesh architecture).

    /**
     * offer — Relay WebRTC offer to a specific peer
     * Payload: { to (socketId), offer (RTCSessionDescription) }
     */
    socket.on('offer', ({ to, offer }) => {
        io.to(to).emit('offer', {
            from: socket.id,
            offer,
        });
    });

    /**
     * answer — Relay WebRTC answer to a specific peer
     * Payload: { to (socketId), answer (RTCSessionDescription) }
     */
    socket.on('answer', ({ to, answer }) => {
        io.to(to).emit('answer', {
            from: socket.id,
            answer,
        });
    });

    /**
     * ice-candidate — Relay ICE candidate to a specific peer
     * Payload: { to (socketId), candidate (RTCIceCandidate) }
     */
    socket.on('ice-candidate', ({ to, candidate }) => {
        io.to(to).emit('ice-candidate', {
            from: socket.id,
            candidate,
        });
    });

    // ─── Whiteboard Events ───

    /**
     * draw — Broadcast drawing stroke to room and persist
     * Payload: { roomId, stroke: { x0, y0, x1, y1, color, lineWidth } }
     */
    socket.on('draw', async ({ roomId, stroke }) => {
        // Broadcast to other participants
        socket.to(roomId).emit('draw', stroke);

        // Persist stroke to database
        try {
            await Room.findOneAndUpdate(
                { roomId },
                { $push: { whiteboardData: stroke } }
            );
        } catch (error) {
            console.error('❌ Failed to save whiteboard stroke:', error.message);
        }
    });

    /**
     * load-whiteboard — Send stored whiteboard data to requesting client
     * Payload: { roomId }
     */
    socket.on('load-whiteboard', async ({ roomId }) => {
        try {
            const room = await Room.findOne({ roomId }).select('whiteboardData');
            if (room && room.whiteboardData.length > 0) {
                socket.emit('load-whiteboard', room.whiteboardData);
            }
        } catch (error) {
            console.error('❌ Failed to load whiteboard:', error.message);
        }
    });

    /**
     * clear-whiteboard — Clear all strokes
     * Payload: { roomId }
     */
    socket.on('clear-whiteboard', async ({ roomId }) => {
        try {
            await Room.findOneAndUpdate({ roomId }, { $set: { whiteboardData: [] } });
            io.to(roomId).emit('clear-whiteboard');
        } catch (error) {
            console.error('❌ Failed to clear whiteboard:', error.message);
        }
    });

    // ─── File Sharing Events ───

    /**
     * file-uploaded — Broadcast file metadata to room
     * Payload: { roomId, file: { filename, fileId, uploadedBy, uploadedAt } }
     */
    socket.on('file-uploaded', ({ roomId, file }) => {
        socket.to(roomId).emit('file-uploaded', file);
    });

    /**
     * disconnect
     * Clean up participant from all rooms
     */
    socket.on('disconnect', () => {
        // Find and remove from all rooms
        for (const [roomId, participants] of roomParticipants.entries()) {
            if (participants.has(socket.id)) {
                handleLeaveRoom(io, socket, roomId);
            }
        }
    });
};

/**
 * Handle a user leaving a room
 */
const handleLeaveRoom = (io, socket, roomId) => {
    const roomMap = roomParticipants.get(roomId);
    if (!roomMap) return;

    const userData = roomMap.get(socket.id);
    if (!userData) return;

    // Remove from memory map
    roomMap.delete(socket.id);

    // Clean up empty rooms
    if (roomMap.size === 0) {
        roomParticipants.delete(roomId);
    }

    // Leave Socket.IO room
    socket.leave(roomId);

    console.log(`👤 ${userData.userName} (${socket.id}) left room ${roomId}`);

    // Notify remaining participants
    io.to(roomId).emit('user-left', {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
    });
};

export { registerRoomHandlers, getRoomParticipants };
