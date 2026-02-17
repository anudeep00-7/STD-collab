import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * ProtectedRoute Component
 * 
 * Wraps routes that require authentication.
 * Redirects to /login if no token is present.
 */
const ProtectedRoute = ({ children }) => {
    const token = useAuthStore((state) => state.token);

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
