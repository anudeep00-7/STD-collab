import mongoose from 'mongoose';

/**
 * Room Model
 * 
 * Represents a collaboration room where users can:
 * - Video call (WebRTC — Phase 5)
 * - Draw on whiteboard (Phase 6)
 * - Share files (Phase 7)
 * 
 * Fields:
 * - roomId: Unique human-readable room identifier
 * - createdBy: User who created the room
 * - participants: Array of users who have joined
 * - whiteboardData: Array of drawing strokes (Phase 6)
 * - files: Array of file metadata references (Phase 7)
 */
const roomSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: [true, 'Room ID is required'],
            unique: true,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        whiteboardData: {
            type: Array,
            default: [],
        },
        files: [
            {
                filename: String,
                fileId: mongoose.Schema.Types.ObjectId,
                uploadedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Room = mongoose.model('Room', roomSchema);

export default Room;
