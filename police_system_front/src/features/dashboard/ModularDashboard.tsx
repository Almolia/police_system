import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ModularDashboard() {
    const { user } = useAuth();
    const role = user?.role?.codename;

    // Define which modules are visible to which roles 
    const modules = [
        { title: 'Investigation Board', path: '/investigation', roles: ['DETECTIVE', 'SERGEANT'], icon: '🕵️' },
        { title: 'Forensics Lab', path: '/coroner', roles: ['CORONARY'], icon: '🔬' },
        { title: 'Judicial Archive', path: '/courtroom', roles: ['JUDGE', 'CHIEF', 'CAPTAIN'], icon: '⚖️' },
        { title: 'Precinct Admin', path: '/admin', roles: ['ADMIN'], icon: '🛠️' }
    ];

    const allowedModules = modules.filter(m => m.roles.includes(role));

    return (
        <div className="h-full p-12 bg-slate-950 overflow-y-auto">
            <h2 className="text-white font-black text-3xl mb-8 uppercase tracking-tighter italic">Authorized Access: {role}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allowedModules.map(m => (
                    <Link key={m.path} to={m.path} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-amber-500 transition-all shadow-xl group">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{m.icon}</div>
                        <h3 className="text-white font-black uppercase text-sm tracking-widest">{m.title}</h3>
                    </Link>
                ))}
            </div>
        </div>
    );
}