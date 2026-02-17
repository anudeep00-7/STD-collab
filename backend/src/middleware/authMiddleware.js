import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Auth Middleware
 * 
 * Verifies the JWT token from the Authorization header.
 * Attaches the decoded user to req.user for downstream handlers.
 * 
 * Expected header format: Authorization: Bearer <token>
 */
const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // Extract token from Authorization header or query param
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.query.token) {
            // Support token via query param (for file downloads via window.open)
            token = req.query.token;
        }

        if (!token) {
            res.status(401);
            throw new Error('Not authorized — no token provided');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request (without password)
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized — user not found');
        }

        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            res.status(401);
            error.message = 'Not authorized — invalid token';
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401);
            error.message = 'Not authorized — token expired';
        }
        next(error);
    }
};

export default authMiddleware;
