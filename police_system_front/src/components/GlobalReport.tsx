import { useState, useEffect } from 'react';
import api from '../utils/api';

interface GlobalReportProps {
    interrogationId: string | number;
}

export default function GlobalReport({ interrogationId }: GlobalReportProps) {
    const [dossier, setDossier] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!interrogationId || isNaN(Number(interrogationId))) {
            setDossier(null);
            setError('');
            return;
        }

        const fetchFullDossier = async () => {
            setIsLoading(true);
            setError('');
            try {
                // 1. Fetch Interrogation (investigation/interrogations/ID/)
                const intRes = await api.get(`investigation/interrogations/${interrogationId}/`);
                const interrogation = intRes.data;

                // 2. Fetch EVERYTHING in parallel using the correct URL patterns
                const [suspectRes, caseRes, evidenceRes, tipsRes] = await Promise.all([
                    // Investigation App: investigation/suspects/ID/
                    api.get(`investigation/suspects/${interrogation.suspect}/`),
                    
                    // Cases App: cases/cases/ID/ (Matched to your Swagger)
                    api.get(`cases/cases/${interrogation.case}/`).catch(() => ({ data: null })),
                    
                    // Evidence App: evidence/CASE_ID/evidence/ (Matched to your evidence/urls.py)
                    api.get(`evidence/${interrogation.case}/evidence/`).catch(() => ({ data: [] })),
                    
                    // Finance App: finance/tips/?suspect=ID
                    api.get(`finance/tips/?suspect=${interrogation.suspect}`).catch(() => ({ data: [] }))
                ]);

                setDossier({
                    interrogation: interrogation,
                    suspect: suspectRes.data,
                    caseInfo: caseRes.data,
                    // Use .results if your backend uses pagination, otherwise use data directly
                    evidence: evidenceRes.data.results || evidenceRes.data,
                    tips: tipsRes.data.results || tipsRes.data,
                });

            } catch (err: any) {
                setDossier(null);
                setError(err.response?.status === 404 ? 'Interrogation record not found.' : 'Connection error.');
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => fetchFullDossier(), 500);
        return () => clearTimeout(timeoutId);
    }, [interrogationId]);

    if (!interrogationId) return null;

    if (isLoading) {
        return (
            <div className="p-8 bg-slate-100 border border-slate-300 rounded-lg text-center mt-4 shadow-inner">
                <div className="h-8 w-8 border-4 border-slate-400 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-bold text-slate-600 animate-pulse tracking-tighter">SECURE CONNECTION ESTABLISHED. DECRYPTING...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4 text-center shadow-inner">
                <p className="font-bold text-red-600">❌ {error}</p>
            </div>
        );
    }

    if (!dossier) return null;

    const { interrogation, suspect, caseInfo, evidence, tips } = dossier;

    return (
        <div className="mt-4 border border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-white text-slate-900">
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center border-b-4 border-slate-500">
                <h3 className="font-black text-xl uppercase tracking-widest">📁 Official Case Dossier</h3>
                <span className="font-mono bg-red-900/40 border border-red-500 text-red-300 px-3 py-1 rounded text-xs font-black">RESTRICTED</span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Suspect Profile */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 shadow-sm h-64 overflow-y-auto">
                    <h4 className="font-black text-slate-800 border-b-2 border-slate-300 pb-2 mb-3 uppercase text-xs tracking-wider sticky top-0 bg-slate-50 z-10">Target Suspect</h4>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <p className="text-slate-500">Alias / Name:</p>
                        <p className="font-bold">{suspect.alias || 'Unknown'}</p>
                        <p className="text-slate-500">Status:</p>
                        <p className="font-bold text-slate-900">{suspect.status?.replace(/_/g, ' ')}</p>
                        <p className="text-slate-500">Threat Score:</p>
                        <p className="font-mono font-bold text-red-600">{suspect.cached_ranking_score}</p>
                        <p className="text-slate-500">Reward Value:</p>
                        <p className="font-bold text-green-700">{(suspect.cached_ranking_score * 20000000).toLocaleString()} Rials</p>
                    </div>
                </div>

                {/* 2. Originating Case Info */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 shadow-sm h-64 overflow-y-auto">
                    <h4 className="font-black text-slate-800 border-b-2 border-slate-300 pb-2 mb-3 uppercase text-xs tracking-wider sticky top-0 bg-slate-50 z-10">Case Particulars</h4>
                    {caseInfo ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <p className="text-slate-500">Case Title:</p>
                                <p className="font-bold">{caseInfo.title}</p>
                                <p className="text-slate-500">Crime Level:</p>
                                <p className="font-bold">Level {caseInfo.crime_level}</p>
                                <p className="text-slate-500">Formation:</p>
                                <p className="font-bold text-blue-700">{caseInfo.formation_type}</p>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded text-xs">
                                <p className="text-slate-500 font-bold mb-1 uppercase text-[10px]">Occurred At:</p>
                                <p className="mb-2 font-mono">{new Date(caseInfo.crime_occurred_at).toLocaleString()}</p>
                                <p className="text-slate-500 font-bold mb-1 uppercase text-[10px]">Scene Location:</p>
                                <p className="italic text-slate-800">{caseInfo.crime_scene_location}</p>
                            </div>
                            <div className="text-sm border-t pt-2 mt-2">
                                <p className="text-slate-500 font-bold mb-1">Incident Summary:</p>
                                <p className="text-slate-700 leading-relaxed">{caseInfo.description}</p>
                            </div>
                        </div>
                    ) : <p className="text-slate-500 italic text-sm">Main case record not linked.</p>}
                </div>

                {/* 3. Citizen Tips (Finance App) */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 shadow-sm h-64 overflow-y-auto">
                    <h4 className="font-black text-slate-800 border-b-2 border-slate-300 pb-2 mb-3 uppercase text-xs tracking-wider sticky top-0 bg-slate-50 z-10">Citizen Intelligence</h4>
                    {tips.length > 0 ? (
                        <ul className="space-y-3">
                            {tips.map((tip: any) => (
                                <li key={tip.id} className="text-xs bg-white p-3 border border-slate-200 rounded shadow-sm">
                                    <div className="flex justify-between font-bold mb-1">
                                        <span>Tip #{tip.id}</span>
                                        <span className="text-blue-600">{tip.status}</span>
                                    </div>
                                    <p className="text-slate-600 italic">"{tip.description}"</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-slate-500 italic text-sm">No tips registered for this suspect.</p>}
                </div>

                {/* 4. PHYSICAL EVIDENCE (TYPE-SPECIFIC DOSSIER) */}
                <div className="bg-white p-5 rounded-xl border-2 border-slate-300 shadow-sm h-80 overflow-y-auto">
                    <h4 className="font-black text-slate-800 border-b pb-2 mb-4 uppercase text-xs sticky top-0 bg-white z-20 flex justify-between">
                        <span>Detailed Evidence Logs</span>
                        <span className="text-slate-400 font-mono">Count: {evidence.length}</span>
                    </h4>
                    
                    <div className="space-y-6">
                        {evidence.map((ev: any) => (
                            <div key={ev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner relative overflow-hidden group">
                                {/* ID and Type Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tighter">Item #{ev.id}</span>
                                        <h5 className="font-black text-slate-900 uppercase text-sm">{ev.title}</h5>
                                    </div>
                                    <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">
                                        {ev.type_display || ev.evidence_type}
                                    </span>
                                </div>

                                {/* ─── DYNAMIC METADATA GRID ─── */}
                                <div className="grid grid-cols-1 gap-3">
                                    
                                    {/* VEHICLE DETAILS */}
                                    {ev.evidence_type === 'VEHICLE' && ev.vehicle_details && (
                                        <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-3 rounded border border-blue-100">
                                            <div><p className="text-[10px] text-blue-600 font-bold uppercase">Model</p><p className="font-bold">{ev.vehicle_details.model}</p></div>
                                            <div><p className="text-[10px] text-blue-600 font-bold uppercase">Color</p><p className="font-bold">{ev.vehicle_details.color}</p></div>
                                            <div className="col-span-2 pt-1 border-t border-blue-100">
                                                <p className="text-[10px] text-blue-600 font-bold uppercase">Identification</p>
                                                <p className="font-mono font-black text-blue-900 text-sm">
                                                    {ev.vehicle_details.plate ? `PLATE: ${ev.vehicle_details.plate}` : `SERIAL: ${ev.vehicle_details.serial}`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* WITNESS TESTIMONY */}
                                    {ev.evidence_type === 'WITNESS' && ev.witness_details && (
                                        <div className="bg-yellow-50/50 p-3 rounded border border-yellow-100">
                                            <p className="text-[10px] text-yellow-700 font-bold uppercase mb-2">Witness Transcript</p>
                                            <div className="max-h-24 overflow-y-auto text-xs italic text-slate-700 leading-relaxed border-l-2 border-yellow-300 pl-3">
                                                "{ev.witness_details.transcript || "No text transcript recorded."}"
                                            </div>
                                            {ev.witness_details.media && (
                                                <a href={ev.witness_details.media} target="_blank" className="mt-2 inline-block text-[10px] font-black text-yellow-800 underline uppercase">
                                                    View Attached Media File
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* BIOLOGICAL/MEDICAL */}
                                    {ev.evidence_type === 'BIO' && ev.bio_details && (
                                        <div className="bg-red-50/50 p-3 rounded border border-red-100">
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div><p className="text-[10px] text-red-600 font-bold uppercase">Sample Type</p><p className="font-bold">{ev.bio_details.bio_type}</p></div>
                                                <div><p className="text-[10px] text-red-600 font-bold uppercase">Verification</p><p className="font-bold">{ev.bio_details.verification ? 'VERIFIED' : 'PENDING'}</p></div>
                                            </div>
                                            {ev.bio_details.verification && (
                                                <p className="text-[10px] text-slate-600 bg-white p-2 border border-red-100 rounded">
                                                    <strong>Coroner Note:</strong> {ev.bio_details.verification}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* ID DOCUMENTATION */}
                                    {ev.evidence_type === 'ID' && ev.id_details && (
                                        <div className="bg-emerald-50/50 p-3 rounded border border-emerald-100">
                                            <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Owner Name</p>
                                            <p className="font-black text-slate-900 mb-2">{ev.id_details.owner}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(ev.id_details.data || {}).map(([key, val]: any) => (
                                                    <div key={key} className="bg-white/50 p-1.5 rounded border border-emerald-50">
                                                        <p className="text-[9px] text-emerald-600 font-bold uppercase">{key}</p>
                                                        <p className="text-[11px] font-mono font-bold truncate">{val}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* GENERAL DESCRIPTION (Always shown) */}
                                    <div className="mt-2 pt-3 border-t border-slate-200">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Registrar Remarks</p>
                                        <p className="text-xs text-slate-600 leading-relaxed italic">
                                            {ev.description || "No additional officer remarks logged."}
                                        </p>
                                        <div className="mt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                                            <span>Recorded by: {ev.recorder_name}</span>
                                            <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {evidence.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-slate-400 italic text-sm">No physical or digital evidence has been recovered for this case file.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Personnel Review (Investigation App) */}
                <div className="col-span-1 md:col-span-2 bg-slate-100 p-5 rounded-lg border border-slate-300 shadow-inner">
                    <h4 className="font-black text-slate-800 border-b-2 border-slate-400 pb-2 mb-3 uppercase text-xs tracking-wider flex justify-between items-center">
                        <span>Precinct Chain of Command Review</span>
                        <span className="font-mono text-[10px] bg-slate-800 text-white px-2 py-1 rounded">Inq-#{interrogation.id}</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Det. Score</p>
                            <p className={`text-xl font-black ${interrogation.detective_score > 6 ? 'text-red-600' : 'text-green-600'}`}>{interrogation.detective_score || '-'}/10</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">SGT Appr.</p>
                            <p className={`text-sm font-black mt-1 ${interrogation.sergeant_approval ? 'text-green-600' : 'text-slate-400'}`}>{interrogation.sergeant_approval ? 'YES' : 'PENDING'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Capt. Verd.</p>
                            <p className={`text-sm font-black mt-1 ${interrogation.captain_verdict ? 'text-red-600' : 'text-slate-400'}`}>{interrogation.captain_verdict ? 'GUILTY' : 'INNOCENT'}</p>
                        </div>
                        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Chief Verd.</p>
                            <p className={`text-sm font-black mt-1 ${interrogation.chief_verdict ? 'text-red-600' : 'text-slate-400'}`}>{interrogation.chief_verdict ? 'GUILTY' : 'N/A'}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}