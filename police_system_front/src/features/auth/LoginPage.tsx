import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from './authApi';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const navigate   = useNavigate();
    const { login }  = useAuth();

    const [form, setForm]       = useState({ username: '', password: '' });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await loginUser(form);

            // ✅ توکن ذخیره میشه و context آپدیت میشه
            login(data.access, data.refresh, data.user);

            // ✅ هدایت بر اساس نقش
            if (data.user.role === 'CITIZEN') {
                navigate('/finance', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.non_field_errors?.[0] ||
                'نام کاربری یا رمز عبور اشتباه است';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-slate-800/80 backdrop-blur border border-blue-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-2 text-center">
                    🔐 ورود به سیستم
                </h1>
                <p className="text-slate-400 text-sm text-center mb-6">
                    سیستم مدیریت پلیس
                </p>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg p-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-300 text-sm mb-1">
                            نام کاربری
                        </label>
                        <input
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="نام کاربری خود را وارد کنید"
                        />
                    </div>

                    <div>
                        <label className="block text-slate-300 text-sm mb-1">
                            رمز عبور
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="رمز عبور خود را وارد کنید"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors"
                    >
                        {loading ? '⏳ در حال ورود...' : 'ورود'}
                    </button>
                </form>

                <p className="text-slate-400 text-sm text-center mt-6">
                    حساب کاربری ندارید؟{' '}
                    <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
                        ثبت‌نام کنید
                    </Link>
                </p>
            </div>
        </div>
    );
}
