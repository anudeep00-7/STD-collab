import express from 'express';
import { createRoom, joinRoom, getRoomDetails } from '../controllers/roomController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Room Routes (all protected)
 * 
 * POST /api/rooms/create       — Create a new room
 * POST /api/rooms/join/:roomId — Join an existing room
 * GET  /api/rooms/:roomId      — Get room details
 */
router.use(authMiddleware); // Protect all room routes

router.post('/create', createRoom);
router.post('/join/:roomId', joinRoom);
router.get('/:roomId', getRoomDetails);

export default router;
