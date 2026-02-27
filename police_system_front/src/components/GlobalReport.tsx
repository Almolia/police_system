import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function GlobalReport({ interrogationId: caseId }: { interrogationId: string | number }) {
    const { user } = useAuth();
    const role = user?.role?.codename || user?.role;
    
    // ─── NEW: PAGINATION STATE ───
    const [activePage, setActivePage] = useState<1 | 2 | 3>(1);
    
    const [caseData, setCaseData] = useState<any>(null);
    const [interrogations, setInterrogations] = useState<any[]>([]);
    const [suspectsData, setSuspectsData] = useState<Record<number, any>>({});
    
    const [evidence, setEvidence] = useState<any[]>([]);
    const [tips, setTips] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [scoreInputs, setScoreInputs] = useState<Record<number, number>>({});

    const fetchDossier = async () => {
        setIsLoading(true);
        try {
            const [caseRes, evRes, tipsRes] = await Promise.all([
                api.get(`cases/cases/${caseId}/`),
                api.get(`evidence/${caseId}/evidence/`),
                api.get(`finance/tips/?case=${caseId}`).catch(() => ({ data: [] }))
            ]);
            
            setCaseData(caseRes.data);
            setEvidence(evRes.data.results || evRes.data);
            setTips(tipsRes.data.results || tipsRes.data);

            const intRes = await api.get(`investigation/interrogations/?case=${caseId}`);
            let ints = intRes.data.results || intRes.data;
            
            ints = ints.filter((i: any) => i.sergeant_approval !== false);
            setInterrogations(ints);

            const sData: Record<number, any> = {};
            for (const i of ints) {
                const sRes = await api.get(`investigation/suspects/${i.suspect}/`);
                sData[i.suspect] = sRes.data;
            }
            setSuspectsData(sData);
        } catch (err) {
            console.error("Dossier access failed.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (caseId) fetchDossier();
    }, [caseId]);

    // ─── ACTION HANDLERS (Unchanged) ───
    const handleSergeantVerdict = async (id: number, approved: boolean) => {
        try {
            await api.post(`investigation/interrogations/${id}/sergeant_verdict/`, { approved, notes: "" });
            fetchDossier();
        } catch (err) { alert("Failed to record Sergeant verdict."); }
    };

    const handleSubmitScore = async (id: number) => {
        const score = scoreInputs[id];
        if (!score || score < 1 || score > 10) return alert("Score must be 1-10.");
        try {
            await api.post(`investigation/interrogations/${id}/submit_score/`, { score });
            fetchDossier();
        } catch (err) { alert("Failed to submit score."); }
    };

    const handleCaptainVerdict = async (id: number, approved: boolean) => {
        try {
            await api.post(`investigation/interrogations/${id}/captain_verdict/`, { approved, notes: "" });
            fetchDossier();
        } catch (err) { alert("Failed to record Captain verdict."); }
    };

    const handleChiefVerdict = async (id: number, approved: boolean) => {
        try {
            await api.post(`investigation/interrogations/${id}/chief_verdict/`, { approved, notes: "" });
            fetchDossier();
        } catch (err) { alert("Failed to record Chief verdict."); }
    };

    // ─── DATA EXTRACTION FOR NEW REQUIREMENTS ───
    const getPersonnelList = () => {
        // We use a Set to prevent the same officer showing up twice if they logged 5 pieces of evidence
        const personnel = new Set<string>();
        
        // 1. Case Command
        if (caseData?.assigned_detective) personnel.add(`Lead Detective: Officer ID ${caseData.assigned_detective}`);
        if (caseData?.assigned_sergeant) personnel.add(`Approving Sergeant: Officer ID ${caseData.assigned_sergeant}`);
        if (caseData?.verified_by) personnel.add(`Intake Cadet/Officer: Officer ID ${caseData.verified_by}`); // Assuming you add this to Case

        // 2. Evidence & Forensics
        evidence.forEach(ev => {
            if (ev.recorder_name) personnel.add(`Evidence Logger: ${ev.recorder_name}`);
            // If it's a bio-evidence that was verified, grab the coroner!
            if (ev.evidence_type === 'BIO' && ev.bio_details?.verified_by) {
                personnel.add(`Medical Examiner (Coroner): ID ${ev.bio_details.verified_by}`);
            }
        });

        // 3. Command Verdicts (The Captains and Chiefs)
        interrogations.forEach(int => {
            if (int.captain_name) personnel.add(`Commanding Captain: ${int.captain_name}`);
            if (int.chief_name) personnel.add(`Reviewing Chief: ${int.chief_name}`);
        });

        return Array.from(personnel);
    };

    if (isLoading) return (
        <div className="flex flex-col p-8 w-full h-full bg-[#fdfbf7] animate-pulse">
            {/* Fake Tabs Skeleton */}
            <div className="flex gap-4 mb-8 border-b-2 border-amber-900/10 pb-4">
                <div className="h-6 w-32 bg-slate-200 rounded"></div>
                <div className="h-6 w-40 bg-slate-200 rounded"></div>
            </div>
            {/* Fake Header */}
            <div className="h-10 w-64 bg-slate-200 rounded mb-6"></div>
            {/* Fake Content Blocks */}
            <div className="space-y-4">
                <div className="h-32 w-full bg-slate-200 rounded-lg"></div>
                <div className="h-24 w-3/4 bg-slate-200 rounded-lg"></div>
                <div className="h-40 w-full bg-slate-200 rounded-lg"></div>
            </div>
        </div>
    );
    if (!caseData) return <div className="p-10 text-center font-bold text-red-700 font-mono text-xl">FILE NOT FOUND OR CLASSIFIED.</div>;

    return (
        <div className="flex flex-col text-slate-900 w-full h-full font-serif bg-[#fdfbf7]">
            
            {/* ─── DOSSIER TABS (Page Navigation) ─── */}
            <div className="flex font-sans text-xs font-black uppercase tracking-widest shrink-0 border-b-2 border-amber-900/20 bg-amber-900/5">
                <button 
                    onClick={() => setActivePage(1)} 
                    className={`px-6 py-4 border-r border-amber-900/10 transition-colors ${activePage === 1 ? 'bg-[#fdfbf7] text-amber-900 border-t-4 border-t-amber-700' : 'text-amber-900/50 hover:bg-amber-900/10'}`}
                >
                    Pg 1: Incident & Personnel
                </button>
                <button 
                    onClick={() => setActivePage(2)} 
                    className={`px-6 py-4 border-r border-amber-900/10 transition-colors ${activePage === 2 ? 'bg-[#fdfbf7] text-red-900 border-t-4 border-t-red-700' : 'text-amber-900/50 hover:bg-amber-900/10'}`}
                >
                    Pg 2: Suspects & Sentences
                </button>
                <button 
                    onClick={() => setActivePage(3)} 
                    className={`px-6 py-4 transition-colors ${activePage === 3 ? 'bg-[#fdfbf7] text-slate-900 border-t-4 border-t-slate-700' : 'text-amber-900/50 hover:bg-amber-900/10'}`}
                >
                    Pg 3: Evidence & Appendix
                </button>
            </div>

            <div className="p-8 overflow-y-auto flex-grow relative">
                
                {/* STAMP BACKGROUND WATERMARK */}
                <div className="absolute top-10 right-10 opacity-5 pointer-events-none transform rotate-12">
                    <div className="border-8 border-red-900 text-red-900 font-black text-6xl p-4 uppercase font-sans tracking-tighter">
                        Classified
                    </div>
                </div>

                {/* ═════════ PAGE 1: INCIDENT & PERSONNEL ═════════ */}
                {activePage === 1 && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="border-b-2 border-slate-300 pb-4 mb-6">
                            <h2 className="text-3xl font-black uppercase font-sans tracking-tighter text-slate-800">Record #{caseData.id}</h2>
                            <p className="font-mono text-sm text-slate-500">Filed: {new Date(caseData.created_at || Date.now()).toLocaleDateString()}</p>
                        </div>

                        <section>
                            <h3 className="text-lg font-black uppercase font-sans text-amber-900 mb-3 border-b border-amber-900/20">I. Incident Particulars</h3>
                            <div className="grid grid-cols-2 gap-y-4 text-base bg-white p-6 border border-slate-200 shadow-sm">
                                <p><span className="font-sans font-bold text-xs uppercase text-slate-400 block">Location</span> {caseData.crime_scene_location}</p>
                                <p><span className="font-sans font-bold text-xs uppercase text-slate-400 block">Time of Occurrence</span> {new Date(caseData.crime_occurred_at).toLocaleString()}</p>
                                <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                                    <span className="font-sans font-bold text-xs uppercase text-slate-400 block mb-2">Official Description</span>
                                    <p className="text-lg leading-relaxed text-slate-800">"{caseData.description}"</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-black uppercase font-sans text-amber-900 mb-3 border-b border-amber-900/20">II. Involved Parties & Complainants</h3>
                            <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-800 text-white px-2 py-1 text-[10px] font-sans font-black uppercase rounded">Primary Complainant</span>
                                    <span className="font-mono font-bold text-slate-700">ID Ref: {caseData.primary_complainant || "UNKNOWN"}</span>
                                </div>
                                {caseData.secondary_complainants?.length > 0 && (
                                    <div className="flex items-start gap-3 mt-2">
                                        <span className="bg-slate-200 text-slate-600 px-2 py-1 text-[10px] font-sans font-black uppercase rounded mt-1">Secondary (Joined)</span>
                                        <div className="font-mono text-slate-600 text-sm">
                                            {caseData.secondary_complainants.map((id: number) => `ID Ref: ${id}`).join(', ')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-black uppercase font-sans text-amber-900 mb-3 border-b border-amber-900/20">III. Assigned Personnel Chain</h3>
                            <ul className="list-none space-y-2 bg-slate-50 p-6 border border-slate-200 font-mono text-sm text-slate-700 shadow-inner">
                                {getPersonnelList().map((person, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span className="text-amber-600">▪</span> {person}
                                    </li>
                                ))}
                                {getPersonnelList().length === 0 && <li className="italic text-slate-400">No personnel currently assigned to this file.</li>}
                            </ul>
                        </section>
                    </div>
                )}

                {/* ═════════ PAGE 2: SUSPECTS & INTERROGATIONS (Original Logic) ═════════ */}
                {activePage === 2 && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="text-xl font-black uppercase font-sans text-red-900 mb-6 border-b-2 border-red-900/20 pb-2">Active Suspect Roster</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                            {interrogations.length === 0 && <p className="text-slate-400 font-bold col-span-2 italic text-center p-10 font-serif">No suspects identified for this case yet.</p>}
                            
                            {interrogations.map(int => {
                                const suspect = suspectsData[int.suspect];
                                if (!suspect) return null;

                                const bothScoresSubmitted = int.detective_score !== null && int.sergeant_score !== null;

                                return (
                                    <div key={int.id} className="bg-white p-5 border-2 border-slate-300 shadow-md relative overflow-hidden group">
                                        {/* Paperclip visual */}
                                        <div className="absolute -top-3 right-4 w-4 h-12 border-2 border-slate-400 rounded-full bg-transparent transform rotate-12 z-10"></div>
                                        
                                        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3 mb-3">
                                            <div>
                                                <p className="font-black text-xl uppercase tracking-tighter">{suspect.alias}</p>
                                                <p className="text-red-700 font-bold text-[10px] uppercase mt-1 bg-red-50 px-2 py-0.5 inline-block border border-red-200">Status: {suspect.status.replace(/_/g, ' ')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Threat Rating</p>
                                                <span className="font-mono text-xl font-black text-amber-600">{suspect.cached_ranking_score}</span>
                                            </div>
                                        </div>

                                        {/* 1. SERGEANT APPROVAL PHASE */}
                                        {int.sergeant_approval === null ? (
                                            <div className="bg-amber-50 p-4 border border-amber-200 text-center">
                                                <p className="text-xs font-black text-amber-800 uppercase mb-3">Pending Sergeant Authorization</p>
                                                {role === 'SERGEANT' && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => handleSergeantVerdict(int.id, true)} className="bg-green-700 text-white px-6 py-2 rounded text-xs font-black uppercase shadow-md hover:bg-green-600 transition-colors">Authorize Arrest</button>
                                                        <button onClick={() => handleSergeantVerdict(int.id, false)} className="bg-red-700 text-white px-6 py-2 rounded text-xs font-black uppercase shadow-md hover:bg-red-600 transition-colors">Reject Intel</button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* 2. INTERROGATION METRICS PHASE */
                                            <div className="grid grid-cols-2 gap-3 text-center bg-slate-50 p-3 border border-slate-200">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Det. Assessment</p>
                                                    <p className="font-black text-2xl text-slate-800 my-1">{int.detective_score || '-'}<span className="text-sm text-slate-400">/10</span></p>
                                                    {int.detective_score === null && role === 'DETECTIVE' && (
                                                        <div className="flex mt-1 justify-center">
                                                            <input type="number" min="1" max="10" className="w-14 text-center text-sm border-2 border-slate-300 font-bold" onChange={e => setScoreInputs({...scoreInputs, [int.id]: parseInt(e.target.value)})} />
                                                            <button onClick={() => handleSubmitScore(int.id)} className="bg-slate-900 text-white text-[10px] px-3 font-black uppercase hover:bg-black">Log</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sgt. Assessment</p>
                                                    <p className="font-black text-2xl text-slate-800 my-1">{int.sergeant_score || '-'}<span className="text-sm text-slate-400">/10</span></p>
                                                    {int.sergeant_score === null && role === 'SERGEANT' && (
                                                        <div className="flex mt-1 justify-center">
                                                            <input type="number" min="1" max="10" className="w-14 text-center text-sm border-2 border-slate-300 font-bold" onChange={e => setScoreInputs({...scoreInputs, [int.id]: parseInt(e.target.value)})} />
                                                            <button onClick={() => handleSubmitScore(int.id)} className="bg-slate-900 text-white text-[10px] px-3 font-black uppercase hover:bg-black">Log</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. CAPTAIN VERDICT PHASE */}
                                        {int.sergeant_approval === true && bothScoresSubmitted && int.captain_verdict === null && (
                                            <div className="bg-blue-900/10 p-4 border border-blue-900/20 text-center mt-3">
                                                <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-3">Captain Verdict Required</p>
                                                {role === 'CAPTAIN' && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => handleCaptainVerdict(int.id, true)} className="bg-red-800 text-white px-6 py-2 text-xs font-black uppercase shadow-lg hover:bg-red-700 transition-all">Issue Guilty</button>
                                                        <button onClick={() => handleCaptainVerdict(int.id, false)} className="bg-slate-500 text-white px-6 py-2 text-xs font-black uppercase shadow-lg hover:bg-slate-400 transition-all">Issue Not Guilty</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* DISPLAY CAPTAIN VERDICT */}
                                        {int.captain_verdict !== null && (
                                            <div className="mt-4 pt-3 border-t border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Final Captain Ruling</p>
                                                <div className={`p-3 text-center border-2 ${int.captain_verdict ? 'bg-red-50 border-red-700 text-red-900' : 'bg-green-50 border-green-600 text-green-900'}`}>
                                                    <span className="text-xl font-black uppercase tracking-widest">{int.captain_verdict ? 'GUILTY' : 'NOT GUILTY'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 4. CHIEF VERDICT PHASE (CRITICAL CASES ONLY) */}
                                        {int.captain_verdict === true && caseData?.is_critical && int.chief_verdict === null && (
                                            <div className="bg-purple-900/10 p-4 border border-purple-900/20 text-center mt-3">
                                                <p className="text-xs font-black text-purple-900 uppercase tracking-widest mb-3">Critical Case: Chief Authorization Required</p>
                                                {role === 'CHIEF' && (
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => handleChiefVerdict(int.id, true)} className="bg-purple-800 text-white px-6 py-2 text-xs font-black uppercase shadow-lg hover:bg-purple-700 transition-all">Endorse Conviction</button>
                                                        <button onClick={() => handleChiefVerdict(int.id, false)} className="bg-slate-500 text-white px-6 py-2 text-xs font-black uppercase shadow-lg hover:bg-slate-400 transition-all">Overturn/Reject</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* DISPLAY CHIEF VERDICT */}
                                        {int.chief_verdict !== null && (
                                            <div className="mt-2 pt-2 border-t border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Chief's Final Endorsement</p>
                                                <div className={`p-2 text-center border ${int.chief_verdict ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                                                    <span className="text-sm font-black uppercase tracking-widest">{int.chief_verdict ? 'ENDORSED' : 'OVERTURNED'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═════════ PAGE 3: EVIDENCE & APPENDIX ═════════ */}
                {activePage === 3 && (
                    <div className="animate-in fade-in duration-300 font-sans">
                        <h3 className="text-xl font-black uppercase text-slate-800 mb-6 border-b-2 border-slate-800/20 pb-2">Physical Evidence & Appendix</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* EVIDENCE REGISTRY */}
                            <section>
                                <h4 className="font-black text-sm text-slate-500 uppercase tracking-widest mb-3 flex justify-between bg-slate-200 p-2 border border-slate-300">
                                    <span>Exhibit Log</span>
                                    <span>({evidence.length} Items)</span>
                                </h4>
                                {evidence.length === 0 ? (
                                    <p className="p-6 text-center text-sm text-slate-400 font-bold italic border-2 border-dashed border-slate-300">No physical evidence logged.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {evidence.map((ev: any) => (
                                            <li key={ev.id} className="bg-white p-3 border border-slate-300 shadow-sm flex flex-col gap-2 relative">
                                                {/* Mini tape visual */}
                                                <div className="absolute -top-2 left-1/2 w-10 h-4 bg-amber-500/20 transform -translate-x-1/2 rotate-2"></div>
                                                <div className="flex justify-between items-start">
                                                    <span className="font-black text-slate-800 uppercase text-xs">[{ev.evidence_type}] {ev.title}</span>
                                                    <span className="text-slate-500 font-mono font-bold text-[10px]">Tag #{ev.id}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 font-medium">{ev.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* CITIZEN TIPS */}
                            <section>
                                <h4 className="font-black text-sm text-slate-500 uppercase tracking-widest mb-3 flex justify-between bg-slate-200 p-2 border border-slate-300">
                                    <span>Public Appendix (Tips)</span>
                                    <span>({tips.length} Reports)</span>
                                </h4>
                                {tips.length === 0 ? (
                                    <p className="p-6 text-center text-sm text-slate-400 font-bold italic border-2 border-dashed border-slate-300">No citizen tips attached to this file.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {tips.map((tip: any) => (
                                            <li key={tip.id} className="bg-yellow-50 p-4 border border-yellow-200 shadow-sm font-serif italic text-sm text-slate-800 relative">
                                                <span className="absolute -left-2 -top-2 text-2xl">📌</span>
                                                "{tip.description}"
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>
            
            {/* DOSSIER FOOTER PAGE COUNTER */}
            <div className="bg-amber-900/5 p-3 border-t border-amber-900/20 text-center shrink-0">
                <p className="font-mono text-[10px] text-amber-900 font-black tracking-widest">
                    PAGE {activePage} OF 3
                </p>
            </div>
        </div>
    );
}