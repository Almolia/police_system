import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function MostWantedPage() {
    const { token } = useAuth();
    const [fugitives, setFugitives] = useState<any[]>([]);

    useEffect(() => {
        api.get('stats/dashboard/public/').then(res => {
            setFugitives(res.data.most_wanted || []);
        }).catch(() => {});
    }, []);

    return (
        <div className="h-full flex flex-col pt-10">
            <div className="flex-grow overflow-y-auto p-12 flex flex-col items-center">
                <h2 className="text-5xl font-black text-red-600 uppercase italic tracking-tighter mb-10 drop-shadow-lg">⚠️ Most Wanted Fugitives</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
                    {fugitives.map(suspect => (
                        <div key={suspect.id} className="bg-slate-900 border-2 border-red-900/50 rounded-3xl overflow-hidden shadow-2xl relative">
                            <div className="h-64 bg-slate-800 flex items-center justify-center text-8xl grayscale opacity-50">👤</div>
                            <div className="p-6">
                                <h3 className="text-2xl font-black text-white uppercase">{suspect.alias || 'ID PENDING'}</h3>
                                <p className="text-red-500 text-[10px] font-black tracking-widest uppercase mb-4">Threat Rank: {suspect.cached_ranking_score}</p>
                                
                                <div className="bg-black/50 p-4 rounded-xl border border-red-500/30">
                                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Public Reward</p>
                                    <p className="text-2xl font-black text-green-500">
                                        {(suspect.cached_ranking_score * 20000000).toLocaleString()} <span className="text-xs">RIALS</span>
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded font-black text-[10px] shadow-lg">WANTED</div>
                        </div>
                    ))}

                    {fugitives.length === 0 && (
                        <div className="col-span-full text-center py-20">
                            <p className="text-slate-500 font-black text-xl uppercase tracking-widest">No active fugitives in the public database.</p>
                        </div>
                    )}
                </div>
            </div>

            {!token && (
                <div className="text-center pb-8 shrink-0">
                    <Link to="/" className="text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors bg-slate-900/50 px-6 py-2 rounded-full">
                        Return to Homepage
                    </Link>
                </div>
            )}
        </div>
    );
}