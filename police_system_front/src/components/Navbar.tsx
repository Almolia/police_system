import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center z-50 shrink-0">
            <Link to="/" className="text-white font-black uppercase tracking-tighter italic text-lg">
                BOI <span className="text-amber-500">SYSTEM</span>
            </Link>

            <div className="flex items-center gap-6">
                <Link to="/most-wanted" className="text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors">Most Wanted</Link>
                
                {!user ? (
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">Login</Link>
                        <Link to="/register" className="bg-amber-600 text-white px-4 py-1.5 rounded font-black text-[9px] uppercase shadow-lg">Register</Link>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-amber-500 text-[10px] font-black uppercase tracking-widest">Command Dashboard</Link>
                        <span className="text-slate-500 text-[10px] font-bold">Logged as: {user.username} ({user.role})</span>
                        <button onClick={logout} className="text-red-500 text-[10px] font-black uppercase border border-red-900/30 px-3 py-1 rounded">Sign Out</button>
                    </div>
                )}
            </div>
        </nav>
    );
}