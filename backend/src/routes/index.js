import express from 'express';

const router = express.Router();

/**
 * Health Check Route
 * GET /api/health
 * Used to verify the server is running.
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'STDcollab API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
