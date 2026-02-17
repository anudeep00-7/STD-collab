import { create } from 'zustand';
import API from '../api/axios';

/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state:
 * - user: Current user object
 * - token: JWT token
 * - isLoading: Loading state for async operations
 * - error: Error message from failed operations
 * 
 * Actions:
 * - register: Create new account
 * - login: Authenticate with credentials
 * - logout: Clear auth state
 * - clearError: Reset error message
 */
const useAuthStore = create((set) => ({
    // State
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isLoading: false,
    error: null,

    /**
     * Register a new user
     * @param {Object} userData - { name, email, password }
     */
    register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await API.post('/auth/register', userData);
            const { token, ...user } = data.data;

            // Persist auth data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            set({ user, token, isLoading: false });
            return true;
        } catch (error) {
            const message = error.response?.data?.message || 'Registration failed';
            set({ error: message, isLoading: false });
            return false;
        }
    },

    /**
     * Login with email and password
     * @param {Object} credentials - { email, password }
     */
    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await API.post('/auth/login', credentials);
            const { token, ...user } = data.data;

            // Persist auth data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            set({ user, token, isLoading: false });
            return true;
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            set({ error: message, isLoading: false });
            return false;
        }
    },

    /**
     * Logout — clear all auth state
     */
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, error: null });
    },

    /**
     * Clear error message
     */
    clearError: () => set({ error: null }),
}));

export default useAuthStore;
