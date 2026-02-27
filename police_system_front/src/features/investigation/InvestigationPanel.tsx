import React, { useState } from 'react';
import DetectiveBoard from './DetectiveBoard';
import GlobalReport from '../../components/GlobalReport';
import api from '../../utils/api';

export default function InvestigationPanel() {
    const [caseInput, setCaseInput] = useState('');
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
    const [isDossierOpen, setIsDossierOpen] = useState(false);

    const handleActivateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanId = caseInput.trim().replace(/\/$/, ""); 
        if (!cleanId) return;

        try {
            const response = await api.get(`cases/cases/${cleanId}/`);
            if (response.data) setActiveCaseId(cleanId);
        } catch (err) { console.error("Archive verification failed."); }
    };

    return (
        <div className="h-full w-full flex flex-col relative bg-slate-950">
            {/* ENLARGED COMMAND HEADER */}
            <header className="bg-slate-900 px-10 py-5 border-b-4 border-amber-600 flex justify-between items-center shrink-0 z-40 shadow-2xl">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Investigation Command</h2>
                    {activeCaseId && (
                        <button 
                            onClick={() => setIsDossierOpen(true)}
                            className="bg-amber-700 hover:bg-amber-600 text-white px-8 py-3 rounded-md font-black text-sm uppercase shadow-lg border border-amber-500/30 transition-all flex items-center gap-3"
                        >
                            📁 VIEW CASE DOSSIER
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleActivateCase} className="flex gap-3">
                    <input 
                        type="text" 
                        placeholder="CASE ID" 
                        value={caseInput}
                        onChange={(e) => setCaseInput(e.target.value)}
                        className="bg-slate-800 border-2 border-slate-700 text-white px-4 py-2 rounded-lg w-32 text-center text-lg font-bold focus:border-amber-500 outline-none"
                    />
                    <button type="submit" className="bg-amber-600 text-white px-6 py-2 rounded-lg font-black text-xs uppercase">Initialize</button>
                </form>
            </header>

            {/* FULL VIEWPORT BOARD */}
            <main className="flex-grow relative overflow-hidden bg-slate-900">
                {activeCaseId ? <DetectiveBoard caseId={activeCaseId} /> : (
                    <div className="h-full flex items-center justify-center opacity-20">
                       <p className="uppercase font-black text-slate-500 tracking-[1em] text-2xl">Awaiting Intelligence Link</p>
                    </div>
                )}
            </main>

            {/* COMPACT PHYSICAL FOLDER OVERLAY */}
            {isDossierOpen && activeCaseId && (
                <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-start justify-center pt-32 p-4 animate-in fade-in duration-300">
                    <div className="bg-[#f4f1ea] w-full max-w-4xl h-fit max-h-[75vh] rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] border-l-[15px] border-amber-950 relative flex flex-col overflow-hidden">
                        
                        <div className="p-3 border-b border-amber-900/10 flex justify-between items-center bg-amber-900/5">
                            <span className="font-mono text-[9px] text-amber-900 font-black tracking-widest uppercase italic">Bureau of Investigation // Official Record</span>
                            <button 
                                onClick={() => setIsDossierOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-900/10 text-amber-900 hover:bg-red-700 hover:text-white transition-all font-black text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Dossier Content: Tight edges with reduced padding */}
                        <div className="p-4 overflow-y-auto flex-grow bg-white/30 custom-scrollbar">
                            <GlobalReport interrogationId={activeCaseId} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}