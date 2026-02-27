import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function GlobalReport({ interrogationId }: { interrogationId: string | number }) {
    const { user } = useAuth();
    const [dossier, setDossier] = useState<any>(null);
    const [showVerdictForm, setShowVerdictForm] = useState(false);
    const [score, setScore] = useState(5);

    useEffect(() => {
        if (!interrogationId) return;
        const fetchDossier = async () => {
            try {
                const intRes = await api.get(`investigation/interrogations/${interrogationId}/`);
                const int = intRes.data;
                const [susRes, caseRes, evRes, tipsRes] = await Promise.all([
                    api.get(`investigation/suspects/${int.suspect}/`),
                    api.get(`cases/cases/${int.case}/`),
                    api.get(`evidence/${int.case}/evidence/`),
                    api.get(`finance/tips/?suspect=${int.suspect}`).catch(() => ({ data: [] }))
                ]);
                setDossier({ interrogation: int, suspect: susRes.data, caseInfo: caseRes.data, evidence: evRes.data.results || evRes.data, tips: tipsRes.data.results || tipsRes.data });
            } catch (err) { console.error("Dossier access failed."); }
        };
        fetchDossier();
    }, [interrogationId]);

    const handleDetectiveVerdict = async () => {
        try {
            // Section 4.5: Detective submits 1-10 guilt probability 
            await api.post(`investigation/interrogations/${interrogationId}/submit_score/`, { score });
            alert(`⚖️ Score of ${score}/10 filed for suspect ${dossier.suspect.alias}.`);
            setShowVerdictForm(false);
        } catch (err) { alert("Judicial submission failed."); }
    };

    if (!dossier) return <div className="p-4 text-center font-black animate-pulse text-slate-400">LOADING CLASSIFIED DATA...</div>;
    const { interrogation, suspect, caseInfo, evidence, tips } = dossier;

    return (
        <div className="flex flex-col gap-4 text-slate-900 px-1">
            {/* INCIDENT PARTICULARS [cite: 165] */}
            <section className="bg-slate-100 p-3 rounded border border-slate-300">
                <h4 className="font-black text-[9px] text-slate-500 uppercase mb-2 border-b border-slate-200">Incident Details</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <p><span className="text-slate-400 font-black">LOCATION:</span> {caseInfo.crime_scene_location}</p>
                    <p><span className="text-slate-400 font-black">TIME:</span> {new Date(caseInfo.crime_occurred_at).toLocaleString()}</p>
                    <p className="col-span-2 text-slate-700 italic border-t pt-1 mt-1 font-medium leading-tight">"{caseInfo.description}"</p>
                </div>
            </section>

            {/* TARGET PROFILE & THREAT METRICS [cite: 216, 218] */}
            <section className="bg-white p-3 rounded border border-slate-200 shadow-sm flex justify-between items-center">
                <div className="text-xs">
                    <p className="font-black text-sm uppercase tracking-tighter">Target: {suspect.alias || 'Unknown'}</p>
                    <p className="text-red-600 font-black text-[10px] uppercase">Judicial Status: {suspect.status.replace(/_/g, ' ')}</p>
                </div>
                <div className="text-center bg-slate-900 text-white px-3 py-1 rounded">
                    <p className="text-[7px] font-black uppercase text-slate-400">Threat Index</p>
                    <p className="font-mono text-lg font-black text-amber-500">{suspect.cached_ranking_score}</p>
                </div>
            </section>

            {/* EVIDENCE REGISTRY [cite: 173-195] */}
            <section className="bg-white p-3 rounded border border-slate-200 shadow-sm h-40 overflow-y-auto">
                <h4 className="font-black text-[9px] text-slate-500 uppercase mb-2 border-b border-slate-100">Evidence Registry ({evidence.length})</h4>
                <ul className="space-y-1">
                    {evidence.map((ev: any) => (
                        <li key={ev.id} className="text-[10px] bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                            <span className="font-bold">[{ev.evidence_type}] {ev.title}</span>
                            <span className="text-slate-400 font-mono">#{ev.id}</span>
                        </li>
                    ))}
                    {tips.map((tip: any) => (
                        <li key={tip.id} className="text-[10px] bg-amber-50 p-2 rounded border border-amber-100 italic">
                            💬 Tip {tip.id}: "{tip.description.substring(0, 40)}..."
                        </li>
                    ))}
                </ul>
            </section>

            {/* VERDICT TRIGGER */}
            <footer className="mt-2 pt-3 border-t-2 border-slate-200 flex justify-between items-center">
                <div className="flex gap-2">
                    <div className="bg-slate-100 px-3 py-1 border rounded text-center min-w-[60px]">
                        <p className="text-[7px] font-black text-slate-400 uppercase">Det. Score</p>
                        <p className="font-black text-xs">{interrogation.detective_score || '-'}/10</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowVerdictForm(true)}
                    className="bg-amber-700 hover:bg-amber-600 text-white px-8 py-2 rounded font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all"
                >
                    ⚖️ Submit Verdict
                </button>
            </footer>

            {/* DETECTIVE SCORE MODAL  */}
            {showVerdictForm && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm border-t-8 border-amber-700 animate-in zoom-in-95 duration-200">
                        <h3 className="font-black text-slate-900 uppercase text-lg mb-2 tracking-tighter">Official Assessment</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-black mb-6">Case Investigation #{caseInfo.id}</p>
                        
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-3">Guilt Probability (0-10)</label>
                            <input 
                                type="range" min="0" max="10" 
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-700"
                                value={score} 
                                onChange={(e) => setScore(parseInt(e.target.value))} 
                            />
                            <p className="text-center font-black text-amber-700 text-3xl mt-4">{score}/10</p>
                        </div>
                        
                        <div className="mt-8 flex gap-3">
                            <button onClick={handleDetectiveVerdict} className="flex-grow bg-slate-900 text-white py-3 rounded font-black text-[10px] uppercase shadow-md hover:bg-slate-800">
                                Commit to Court Record
                            </button>
                            <button onClick={() => setShowVerdictForm(false)} className="px-5 py-3 text-slate-400 font-bold text-[10px] uppercase">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}