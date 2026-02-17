import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

/**
 * Express Application Configuration
 * 
 * This file sets up the Express app with:
 * - CORS (allowing frontend origin)
 * - JSON body parsing
 * - URL-encoded body parsing
 * - API routes
 * - Error handling middleware
 * 
 * The HTTP server and Socket.IO are configured in server.js
 */
const app = express();

// ─── CORS Configuration ───
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

// ─── Body Parsers ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───
app.use('/api', routes);
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);

// ─── Error Handling ───
app.use(notFound);
app.use(errorHandler);

export default app;
