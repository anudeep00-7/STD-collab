import express from 'express';
import multer from 'multer';
import { uploadFile, downloadFile, getFilesByRoom } from '../controllers/fileController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer memory storage (files are streamed to GridFS, not saved to disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * File Routes (all protected)
 * 
 * POST /api/files/upload/:roomId     — Upload file to room
 * GET  /api/files/download/:fileId   — Download file by GridFS ID
 * GET  /api/files/room/:roomId       — Get all files for a room
 */
router.use(authMiddleware);

router.post('/upload/:roomId', upload.single('file'), uploadFile);
router.get('/download/:fileId', downloadFile);
router.get('/room/:roomId', getFilesByRoom);

export default router;
