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
    (response) => response, // If it's a success (200, 201), just pass it through
    
    async (error) => {
        const originalRequest = error.config;

        // If Django says 401 Unauthorized, and we haven't already retried this request...
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token available');

                // Ask Django for a new access token
                const response = await axios.post(
                    `${api.defaults.baseURL}/accounts/token/refresh/`, 
                    { refresh: refreshToken }
                );

                const newAccessToken = response.data.access;
                
                // Save the new token
                setTokens(newAccessToken, refreshToken);

                // Update the failed request with the new token and try again!
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                // If the refresh token is also expired, log them out completely
                clearTokens();
                window.location.href = '/login'; // Force redirect to login page
                return Promise.reject(refreshError);
            }
        }

        // For all other errors (400, 403, 500), pass the error to the component
        return Promise.reject(error);
    }
);

export default api;