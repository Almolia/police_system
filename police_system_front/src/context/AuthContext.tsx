// src/context/AuthContext.tsx
import {createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import { clearTokens } from '../utils/authStorage';
import type { UserData } from '../features/auth/authApi';

interface AuthContextType {
    token: string | null;
    user: UserData | null;
    isLoading: boolean;
    login: (access: string, refresh: string, user: UserData) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken]     = useState<string | null>(null);
    const [user, setUser]       = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // بازیابی session از localStorage هنگام reload
    useEffect(() => {
        const savedToken = localStorage.getItem('access_token');
        const savedUser  = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                clearTokens();
            }
        }
        setIsLoading(false);
    }, []);

    const login = (access: string, refresh: string, userData: UserData) => {
        setToken(access);
        setUser(userData);
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('auth_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        clearTokens();
        localStorage.removeItem('auth_user');
    };

    return (
        <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
