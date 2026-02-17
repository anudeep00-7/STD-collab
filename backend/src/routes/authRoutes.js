import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Auth Routes
 * 
 * POST /api/auth/register  — Create a new user account
 * POST /api/auth/login     — Login with email + password
 * GET  /api/auth/me        — Get current user profile (protected)
 */
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;
