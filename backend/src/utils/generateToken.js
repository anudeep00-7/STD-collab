import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for a user.
 * 
 * @param {string} userId - The MongoDB user ID to encode in the token
 * @returns {string} Signed JWT token
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d', // Token expires in 7 days
    });
};

export default generateToken;
