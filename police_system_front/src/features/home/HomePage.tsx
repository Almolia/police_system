import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function HomePage() {
    const { token } = useAuth();
    const [stats, setStats] = useState({ solved: 0, employees: 0, active: 0 });

    useEffect(() => {
        // Fetch real, live database statistics
        api.get('stats/dashboard/public/').then(res => {
            const sysStats = res.data.system_stats;
            setStats({
                solved: sysStats?.solved_cases || 0,
                active: sysStats?.active_investigations || 0,
                employees: sysStats?.active_personnel || 0 
            });
        }).catch(() => {});
    }, []);

    return (
        <div className="h-full flex flex-col items-center justify-center text-white p-10 pt-20">
            <div className="max-w-4xl text-center flex-grow flex flex-col justify-center">
                <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">Bureau of Investigation</h1>
                <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                    Transitioning manual police records to a secure digital environment for 2026.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border-b-4 border-green-600 shadow-xl">
                        <p className="text-5xl font-black text-green-500 mb-2">{stats.solved}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Solved Cases</p>
                    </div>
                    <div className="bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border-b-4 border-blue-600 shadow-xl">
                        <p className="text-5xl font-black text-blue-500 mb-2">{stats.employees}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Personnel</p>
                    </div>
                    <div className="bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border-b-4 border-amber-600 shadow-xl">
                        <p className="text-5xl font-black text-amber-500 mb-2">{stats.active}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Investigations</p>
                    </div>
                </div>

                <div className="flex gap-6 justify-center">
                    <Link to="/most-wanted" className="bg-red-700 hover:bg-red-600 px-10 py-4 rounded-full font-black text-sm uppercase shadow-lg transition-all border border-red-500/50">
                        👁️ View Most Wanted Fugitives
                    </Link>
                </div>
            </div>

            {!token && (
                <div className="mt-10 pb-4">
                    <Link to="/" className="text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
                        Return to Homepage
                    </Link>
                </div>
            )}
        </div>
    );
}