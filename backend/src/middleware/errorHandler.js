/**
 * Centralized Error Handling Middleware
 * 
 * Catches all errors thrown or passed via next(error) in routes/controllers.
 * Returns a consistent JSON error response.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Default to 500 if no status code was set
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        // Include stack trace only in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

/**
 * Not Found Middleware
 * Catches requests to undefined routes.
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found — ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export { errorHandler, notFound };
