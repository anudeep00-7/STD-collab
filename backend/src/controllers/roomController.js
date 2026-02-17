import crypto from 'crypto';
import Room from '../models/Room.js';

/**
 * @desc    Create a new room
 * @route   POST /api/rooms/create
 * @access  Private
 */
export const createRoom = async (req, res, next) => {
    try {
        // Generate a unique 8-character room ID
        const roomId = crypto.randomBytes(4).toString('hex');

        const room = await Room.create({
            roomId,
            createdBy: req.user._id,
            participants: [req.user._id],
        });

        res.status(201).json({
            success: true,
            data: {
                roomId: room.roomId,
                createdBy: room.createdBy,
                participants: room.participants,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Join an existing room
 * @route   POST /api/rooms/join/:roomId
 * @access  Private
 */
export const joinRoom = async (req, res, next) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId });
        if (!room) {
            res.status(404);
            throw new Error('Room not found');
        }

        // Add user to participants if not already present
        const isAlreadyParticipant = room.participants.some(
            (p) => p.toString() === req.user._id.toString()
        );

        if (!isAlreadyParticipant) {
            room.participants.push(req.user._id);
            await room.save();
        }

        res.json({
            success: true,
            data: {
                roomId: room.roomId,
                participants: room.participants,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get room details
 * @route   GET /api/rooms/:roomId
 * @access  Private
 */
export const getRoomDetails = async (req, res, next) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId })
            .populate('createdBy', 'name email')
            .populate('participants', 'name email');

        if (!room) {
            res.status(404);
            throw new Error('Room not found');
        }

        res.json({
            success: true,
            data: room,
        });
    } catch (error) {
        next(error);
    }
};
