import api from '../utils/api.ts';

export interface LoginPayload {
    username: string;
    password: string;
}

export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    national_id: string;
    phone_number: string;
    address: string;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: {
        username: string;
        role: string;
    };
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/accounts/login/', payload);
    return data;
}

export async function registerCitizen(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/accounts/register/', payload);
    return data;
}
