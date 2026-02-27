import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ActiveCasesBoard() {
    const [cases, setCases] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        // Fetch all cases from the system
        api.get('cases/cases/')
            .then(res => {
                const allCases = res.data.results || res.data;
                // Filter out cases that are completely closed or voided
                const activeCases = allCases.filter((c: any) => 
                    !['CLOSED_SOLVED', 'CLOSED_REJECTED', 'VOIDED'].includes(c.status)
                );
                setCases(activeCases);
            })
            .catch(() => console.error("Failed to sync precinct active board."))
            .finally(() => setIsLoading(false));
    }, []);

    // Helper to color-code the threat levels
    const getLevelBadge = (level: number) => {
        switch(level) {
            case 4: return <span className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm">Critical Threat</span>;
            case 3: return <span className="bg-orange-500 text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm">Level 1 - Serious</span>;
            case 2: return <span className="bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm">Level 2 - Major</span>;
            default: return <span className="bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm">Level 3 - Minor</span>;
        }
    };

    return (
        // <div className="p-8 max-w-7xl mx-auto text-slate-900 h-full overflow-y-auto ">
        <div className="max-w-7xl mx-auto p-6 mt-10 font-sans relative">
            <div className="flex justify-between items-end mb-8 border-b-2 border-slate-300 pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">
                        Precinct Active Board
                    </h2>
                    <p className="text-sm font-bold text-slate-500 uppercase mt-1">
                        Live Operational Overview
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">{cases.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Files</p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center font-bold text-slate-400 mt-10 animate-pulse">Retrieving precinct data...</div>
            ) : cases.length === 0 ? (
                <div className="text-center font-bold text-slate-400 p-12 border-2 border-dashed border-slate-300 rounded-xl mt-4">
                    No active cases in the system. The city is secure.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                    {cases.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg relative overflow-hidden group hover:border-slate-400 transition-colors">
                            {/* Decorative side accent */}
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-slate-800"></div>
                            
                            <div className="pl-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                            Record #{c.id}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2">
                                            {c.formation_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {getLevelBadge(c.crime_level)}
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 truncate">
                                    {c.title}
                                </h3>
                                
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                                    <p className="text-sm font-bold text-slate-600 line-clamp-2">
                                        {c.description}
                                    </p>
                                </div>

                                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                                        <span className="bg-slate-900 text-amber-400 px-3 py-1.5 rounded text-xs font-black uppercase shadow-md">
                                            {c.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filed On</p>
                                        <p className="text-xs font-bold text-slate-700">
                                            {new Date(c.created_at || Date.now()).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}