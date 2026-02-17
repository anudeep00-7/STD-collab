import { Readable } from 'stream';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import { getGridFSBucket } from '../config/gridfs.js';

/**
 * @desc    Upload a file to GridFS and associate with a room
 * @route   POST /api/files/upload/:roomId
 * @access  Private
 */
export const uploadFile = async (req, res, next) => {
    try {
        const { roomId } = req.params;
        const bucket = getGridFSBucket();

        if (!bucket) {
            res.status(500);
            throw new Error('GridFS not initialized');
        }

        if (!req.file) {
            res.status(400);
            throw new Error('No file uploaded');
        }

        const room = await Room.findOne({ roomId });
        if (!room) {
            res.status(404);
            throw new Error('Room not found');
        }

        // Upload file buffer to GridFS
        const readableStream = new Readable();
        readableStream.push(req.file.buffer);
        readableStream.push(null);

        const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: {
                roomId,
                uploadedBy: req.user._id,
            },
        });

        readableStream.pipe(uploadStream);

        uploadStream.on('finish', async () => {
            // Store file metadata in room document
            const fileMetadata = {
                filename: req.file.originalname,
                fileId: uploadStream.id,
                uploadedBy: req.user._id,
                uploadedAt: new Date(),
            };

            room.files.push(fileMetadata);
            await room.save();

            res.status(201).json({
                success: true,
                data: fileMetadata,
            });
        });

        uploadStream.on('error', (error) => {
            next(error);
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Download a file from GridFS
 * @route   GET /api/files/download/:fileId
 * @access  Private
 */
export const downloadFile = async (req, res, next) => {
    try {
        const { fileId } = req.params;
        const bucket = getGridFSBucket();

        if (!bucket) {
            res.status(500);
            throw new Error('GridFS not initialized');
        }

        // Find file in GridFS
        const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();

        if (!files || files.length === 0) {
            res.status(404);
            throw new Error('File not found');
        }

        const file = files[0];

        // Set response headers
        res.set('Content-Type', file.contentType || 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename="${file.filename}"`);

        // Stream file to response
        const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
        downloadStream.pipe(res);

        downloadStream.on('error', (error) => {
            res.status(404);
            next(new Error('File not found'));
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all files for a room
 * @route   GET /api/files/room/:roomId
 * @access  Private
 */
export const getFilesByRoom = async (req, res, next) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId })
            .select('files')
            .populate('files.uploadedBy', 'name');

        if (!room) {
            res.status(404);
            throw new Error('Room not found');
        }

        res.json({
            success: true,
            data: room.files,
        });
    } catch (error) {
        next(error);
    }
};
