// src/utils/api.ts
import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './authStorage';

// 1. Create the base instance
const api = axios.create({
    // Change VITE_ to NEXT_PUBLIC_ if using NextJS
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. REQUEST INTERCEPTOR: Runs BEFORE every request is sent
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        
        // Auto-attach the JWT token
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Auto-append trailing slash for Django REST Framework compatibility
        if (config.url && !config.url.endsWith('/')) {
            config.url += '/';
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: Runs AFTER every response is received
api.interceptors.response.use(
    (response) => response, 
    
    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest.url || '';

        // Ignore login/register errors so AuthPage can show them
        if (url.includes('login') || url.includes('register')) {
            return Promise.reject(error);
        }

        // If Django says 401 Unauthorized, and we haven't already retried this request...
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken || refreshToken === 'undefined') {
                    throw new Error('No refresh token available');
                }

                // Prevent double slashes in the URL
                const baseURL = api.defaults.baseURL?.replace(/\/$/, '') || '';
                
                // Ask Django for a new access token
                const response = await axios.post(
                    `${baseURL}/accounts/login/refresh/`, 
                    { refresh: refreshToken }
                );

                const newAccessToken = response.data.access;
                
                // If Django SimpleJWT is configured to rotate tokens, it sends a new refresh. 
                // Otherwise, we keep using the original one.
                const newRefreshToken = response.data.refresh || refreshToken;
                
                // Save the new token
                setTokens(newAccessToken, newRefreshToken);

                // Update the failed request with the new token and try again!
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                clearTokens();
                localStorage.removeItem('user');
                window.location.href = '/auth'; // Hard boot to login
                return Promise.reject(refreshError);
            }
        }

        // For all other errors (400, 403, 500)
        return Promise.reject(error);
    }
);

export default api;