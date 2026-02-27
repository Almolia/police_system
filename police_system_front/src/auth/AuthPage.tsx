import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { setTokens } from '../utils/authStorage';

export default function AuthPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        username: '', password: '', password_confirm: '',
        email: '', phone_number: '', national_id: '',
        first_name: '', last_name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 1. If registering, create the account first
            if (!isLogin) {
                if (formData.password !== formData.password_confirm) {
                    throw new Error("Passwords do not match!");
                }
                await api.post('accounts/register/', formData);
            }

            // 2. Fetch the JWT Token
            const loginRes = await api.post('accounts/login/', {
                username: formData.username,
                password: formData.password
            });
            
            const accessToken = loginRes.data?.access || loginRes.data?.token;
            const refreshToken = loginRes.data?.refresh;

            if (!accessToken) {
                throw { 
                    response: { 
                        data: loginRes.data || { detail: "Invalid username or password." } 
                    } 
                };
            }

            setTokens(accessToken, refreshToken);

            // 3. Fetch the user's role profile
            const profileRes = await api.get('accounts/profile/', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const userProfile = {
                username: profileRes.data.username,
                role: profileRes.data.role_codename, 
                email: profileRes.data.email
            };

            // 4. Save to global state and redirect
            login(userProfile, accessToken);
            navigate('/'); 

        } catch (err: any) {
            // Catch custom frontend errors
            if (err.message === "Passwords do not match!") {
                setError(err.message);
                setIsLoading(false);
                return;
            }

            // Catch and format Django backend errors
            if (err.response?.data) {
                const data = err.response.data;
                if (data.detail) {
                    setError(data.detail);
                } else if (typeof data === 'object') {
                    // Extract field-specific errors (e.g., "USERNAME: This field is required")
                    const errorMessages = Object.entries(data)
                        .map(([field, msgs]: any) => `${field.toUpperCase()}: ${msgs[0]}`)
                        .join(' | ');
                    setError(errorMessages || JSON.stringify(data));
                } else {
                    setError("Authentication Failed. Please check your credentials.");
                }
            } else {
                setError("Network error. The server might be offline.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 p-8 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl">
            <h2 className="text-3xl font-black mb-8 text-center text-slate-900 tracking-tighter uppercase">
                {isLogin ? 'Precinct Login' : 'Recruit Enrollment'}
            </h2>

            {/* ERROR DISPLAY BOX */}
            {error && (
                <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded shadow-inner">
                    ⚠️ {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                
                {/* USERNAME FIELD */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Username</label>
                    <input className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="Enter your system username..." autoComplete="username" onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                
                {/* REGISTRATION ONLY FIELDS */}
                {!isLogin && (
                    <div className="space-y-4 border-y border-slate-200 py-4 my-2 bg-slate-50/50 p-2 rounded">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                                <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="First Name" onChange={e => setFormData({...formData, first_name: e.target.value})} required />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                                <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="Last Name" onChange={e => setFormData({...formData, last_name: e.target.value})} required />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                            <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="citizen@example.com" type="email" autoComplete="email" onChange={e => setFormData({...formData, email: e.target.value})} required />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                            <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="09xxxxxxxxx" type="tel" autoComplete="tel" onChange={e => setFormData({...formData, phone_number: e.target.value})} required />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">National ID</label>
                            <input className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium font-mono" placeholder="10-digit ID" type="text" autoComplete="off" onChange={e => setFormData({...formData, national_id: e.target.value})} required />
                        </div>
                    </div>
                )}

                {/* PASSWORD FIELD */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                    <input className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" type="password" placeholder="••••••••" autoComplete={isLogin ? "current-password" : "new-password"} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>

                {!isLogin && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Confirm Password</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" type="password" placeholder="••••••••" autoComplete="new-password" onChange={e => setFormData({...formData, password_confirm: e.target.value})} required />
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full mt-4 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black text-lg rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'PROCESSING...' : (isLogin ? 'ENTER SYSTEM' : 'CREATE ACCOUNT')}
                </button>
            </form>

            {/* HIGH VISIBILITY TOGGLE BUTTON */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <button 
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border border-slate-300 shadow-sm"
                >
                    {isLogin ? "No account? Click here to Register" : "Already registered? Back to Login"}
                </button>
            </div>
        </div>
    );
}