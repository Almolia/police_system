import api from "../../utils/api";
import { setTokens } from "../../utils/authStorage";

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
    first_name: string;
    last_name: string;
}

export async function loginUser(payload: LoginPayload): Promise<void> {
    const response = await api.post("/accounts/login/", payload);
    const { access, refresh } = response.data;
    setTokens(access, refresh);
}

export async function registerCitizen(payload: RegisterPayload): Promise<void> {
    await api.post("/accounts/register/", payload);
}
