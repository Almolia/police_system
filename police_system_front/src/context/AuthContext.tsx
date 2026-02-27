import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export type UserRole = 'CITIZEN' | 'OFFICER' | 'SERGEANT' | 'DETECTIVE' | 'CAPTAIN' | 'CHIEF' | 'JUDGE';

interface User {
    username: string;
    role: UserRole;
    email?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (userData: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.clear();
        delete api.defaults.headers.common['Authorization'];
    };

    useEffect(() => {
        const verifySession = async () => {
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (savedToken && savedUser && savedUser !== 'undefined') {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
            } else {
                logout(); 
            }
            setIsLoading(false);
        };
        verifySession();

        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                const url = error.config?.url || '';
                
                // ─── FIX: Ignore 401s from the login/register endpoints! ───
                // This stops the page from freaking out when you type a wrong password.
                if (error.response?.status === 401 && !url.includes('login') && !url.includes('register')) {
                    console.warn("🔒 Session ended or token invalid. Auto-logging out.");
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, []);

    const login = (userData: User, authToken: string) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};