import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerCitizen } from "./authApi";
import type { RegisterPayload } from "./authApi";


const INITIAL_FORM: RegisterPayload = {
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    national_id: "",
    phone_number: "",
    password: "",
    password_confirm: "", // ✅ اضافه شد
};

export default function RegisterPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState<RegisterPayload>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterPayload, string>>>({});

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        if (form.password !== form.password_confirm) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await registerCitizen(form);
            navigate("/login", { state: { registered: true } });
        } catch (err: any) {
            const data = err?.response?.data;
            if (data && typeof data === "object") {
                const fields: typeof fieldErrors = {};
                let hasFieldError = false;
                for (const key of Object.keys(data)) {
                    if (key in INITIAL_FORM) {
                        fields[key as keyof RegisterPayload] = Array.isArray(data[key])
                            ? data[key][0]
                            : data[key];
                        hasFieldError = true;
                    }
                }
                if (hasFieldError) {
                    setFieldErrors(fields);
                } else {
                    setError(data?.detail || data?.non_field_errors?.[0] || "Registration failed.");
                }
            } else {
                setError("Registration failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-lg bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 p-8">

                {/* Header */}
                <div className="mb-7 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-blue-900">Create Account</h1>
                    <p className="text-sm text-gray-500 mt-1">Register as a citizen</p>
                </div>

                {/* Global error */}
                {error && (
                    <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Row: first + last name */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="First Name"
                            name="first_name"
                            value={form.first_name}
                            onChange={handleChange}
                            error={fieldErrors.first_name}
                            placeholder="Ali"
                        />
                        <Field
                            label="Last Name"
                            name="last_name"
                            value={form.last_name}
                            onChange={handleChange}
                            error={fieldErrors.last_name}
                            placeholder="Ahmadi"
                        />
                    </div>

                    <Field
                        label="Username"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        error={fieldErrors.username}
                        placeholder="ali_ahmadi"
                        autoComplete="username"
                    />

                    <Field
                        label="Email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        error={fieldErrors.email}
                        placeholder="ali@example.com"
                        autoComplete="email"
                    />

                    <Field
                        label="National ID"
                        name="national_id"
                        value={form.national_id}
                        onChange={handleChange}
                        error={fieldErrors.national_id}
                        placeholder="10-digit national ID"
                        maxLength={10}
                    />

                    <Field
                        label="Phone Number"
                        name="phone_number"
                        value={form.phone_number}
                        onChange={handleChange}
                        error={fieldErrors.phone_number}
                        placeholder="09XXXXXXXXX"
                    />

                    <Field
                        label="Password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        error={fieldErrors.password}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                    />

                    {/* ✅ Confirm Password — حالا به form.password_confirm وصله */}
                    <Field
                        label="Confirm Password"
                        name="password_confirm"
                        type="password"
                        value={form.password_confirm}
                        onChange={handleChange}
                        error={fieldErrors.password_confirm}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 active:bg-blue-950
                       text-white font-semibold text-sm tracking-wide transition
                       disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                    >
                        {loading ? "Registering..." : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-700 hover:text-blue-900 font-medium transition">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}

// ── Reusable field sub-component ──────────────
interface FieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    maxLength?: number;
}

function Field({ label, name, value, onChange, error, type = "text", placeholder, autoComplete, maxLength }: FieldProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required
                placeholder={placeholder}
                autoComplete={autoComplete}
                maxLength={maxLength}
                className={`w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                    placeholder-gray-400 text-sm transition
                    ${error ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
