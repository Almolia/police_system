import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "./authApi";

export default function LoginPage() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await loginUser(form);
            navigate("/");
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.non_field_errors?.[0] ||
                "Login failed. Please check your credentials.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 p-8">

                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-900 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-blue-900">Police System</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username
                        </label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                            placeholder="Enter your username"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                         placeholder-gray-400 text-sm transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                         placeholder-gray-400 text-sm transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 active:bg-blue-950
                       text-white font-semibold text-sm tracking-wide transition
                       disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                {/* Footer link */}
                <p className="mt-6 text-center text-sm text-gray-500">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="text-blue-700 hover:text-blue-900 font-medium transition">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}
