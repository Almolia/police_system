// src/features/auth/authApi.ts
import api from '../../utils/api';
import { setTokens } from '../../utils/authStorage';

// ─── Types ────────────────────────────────────────────
export interface LoginPayload {
    username: string;
    password: string;
}

export interface RegisterPayload {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    national_id: string;
    phone_number: string;
    password: string;
    password_confirm: string;
}

export interface UserData {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    national_id: string;
    role_name: string;      // از serializers.py: source='role.name'
    role_codename: string;  // از serializers.py: source='role.codename'
    // فیلد helper برای راحتی
    role: string;           // همون role_codename (CITIZEN, OFFICER, ...)
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: UserData;
}

// ─── Login ────────────────────────────────────────────
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
    // Step 1: دریافت توکن‌ها از SimpleJWT
    const tokenResponse = await api.post('/accounts/login/', payload);
    const { access, refresh } = tokenResponse.data;

    // Step 2: ذخیره توکن‌ها (تا call بعدی با Authorization header بره)
    setTokens(access, refresh);

    // Step 3: دریافت اطلاعات کاربر با توکن
    const profileResponse = await api.get('/accounts/profile/');
    const profile = profileResponse.data;

    return {
        access,
        refresh,
        user: {
            ...profile,
            // role_codename رو به role هم map می‌کنیم
            role: profile.role_codename,
        },
    };
}

// ─── Register ─────────────────────────────────────────
export async function registerCitizen(payload: RegisterPayload): Promise<void> {
    await api.post('/accounts/register/', payload);
}
