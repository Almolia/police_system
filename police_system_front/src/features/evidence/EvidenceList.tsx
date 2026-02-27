import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import SkeletonLoader from '../../components/common/SkeletonLoader';

interface EvidenceListProps {
    caseId: string;
}

export default function EvidenceList({ caseId }: EvidenceListProps) {
    const [evidence, setEvidence] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

    useEffect(() => {
        if (!caseId) return;

        const fetchEvidence = async () => {
            setLoading(true);
            try {
                // Complies with your global and app routing: api/evidence/<case_id>/evidence/
                const response = await api.get(`evidence/${caseId}/evidence/`);
                setEvidence(response.data.results || response.data);
            } catch (error) {
                console.error("Failed to fetch evidence:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvidence();
    }, [caseId]);

    if (!caseId) return <p className="text-center text-slate-500 italic p-10">Select a case above to view its evidence archives.</p>;

    if (loading) return <SkeletonLoader type="table" rows={5} />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-700 bg-slate-50">
                        <th className="p-3">ID</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Recorded By</th>
                        <th className="p-3">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {evidence.map((ev: any) => (
                        <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-xs">#{ev.id}</td>
                            <td className="p-3 font-bold">{ev.title}</td>
                            <td className="p-3">
                                <span className="bg-slate-200 px-2 py-1 rounded text-[10px] font-black uppercase">
                                    {ev.type_display || ev.evidence_type}
                                </span>
                            </td>
                            <td className="p-3 text-sm">{ev.recorder_name}</td>
                            <td className="p-3 text-xs text-slate-500">{new Date(ev.created_at).toLocaleDateString()}</td>
                            <button 
                                onClick={() => setSelectedEvidence(ev)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded font-bold text-xs uppercase transition-colors"
                            >
                                👁️ View Details
                            </button>
                        </tr>
                    ))}
                    {evidence.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-10 text-center text-slate-400">No evidence found for this case.</td>
                        </tr>
                    )}
                    {/* ─── FULL EVIDENCE DOSSIER MODAL ─── */}
                    {selectedEvidence && (
                        <div className="fixed inset-0 z-[10000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-300 animate-in zoom-in-95 duration-200">
                                
                                {/* Modal Header */}
                                <div className="bg-slate-900 p-4 flex justify-between items-center">
                                    <div>
                                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest mr-2">
                                            {selectedEvidence.evidence_type}
                                        </span>
                                        <span className="text-slate-400 font-mono text-xs">Record #{selectedEvidence.id}</span>
                                    </div>
                                    <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-white font-black text-xl leading-none">&times;</button>
                                </div>

                                {/* Modal Body */}
                                <div className="p-6 max-h-[70vh] overflow-y-auto">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">{selectedEvidence.title}</h3>
                                    <p className="text-sm font-medium text-slate-600 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        {selectedEvidence.description || "No general description provided."}
                                    </p>

                                    <h4 className="font-black text-slate-800 uppercase text-xs border-b-2 border-slate-200 pb-1 mb-4">Specific Metadata</h4>

                                    {/* 1. VEHICLE DETAILS */}
                                    {selectedEvidence.evidence_type === 'VEHICLE' && selectedEvidence.vehicle_details && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Make & Model</p>
                                                <p className="font-bold text-slate-800">{selectedEvidence.vehicle_details.model}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Color</p>
                                                <p className="font-bold text-slate-800">{selectedEvidence.vehicle_details.color}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">License Plate</p>
                                                <p className="font-mono font-bold text-slate-800">{selectedEvidence.vehicle_details.plate || 'N/A'}</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">VIN / Serial</p>
                                                <p className="font-mono font-bold text-slate-800">{selectedEvidence.vehicle_details.serial || 'N/A'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. WITNESS DETAILS */}
                                    {selectedEvidence.evidence_type === 'WITNESS' && selectedEvidence.witness_details && (
                                        <div className="space-y-4">
                                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                                <p className="text-[10px] font-black text-amber-800 uppercase mb-2">Official Transcript</p>
                                                <p className="text-sm italic text-slate-800 font-serif leading-relaxed">"{selectedEvidence.witness_details.transcript}"</p>
                                            </div>
                                            {selectedEvidence.witness_details.media && (
                                                <a href={selectedEvidence.witness_details.media} target="_blank" rel="noreferrer" className="inline-block bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded font-bold text-xs uppercase transition-colors">
                                                    🔗 View Attached Media
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. BIO/MEDICAL DETAILS */}
                                    {selectedEvidence.evidence_type === 'BIO' && selectedEvidence.bio_details && (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <span className="bg-red-100 text-red-800 px-3 py-1 rounded font-black text-xs uppercase border border-red-200">
                                                                    Type: {selectedEvidence.bio_details.bio_type}
                                                                </span>
                                                            </div>
                                                            
                                                            {selectedEvidence.bio_details.image_url && (
                                                                <div className="mb-4 bg-slate-900 p-2 rounded-lg border-4 border-slate-200 shadow-inner">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Crime Scene Photo</p>
                                                                    <img 
                                                                        src={selectedEvidence.bio_details.image_url} 
                                                                        alt="Forensic Evidence" 
                                                                        className="w-full h-auto max-h-64 object-contain rounded bg-black"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Coroner Verification Status</p>
                                                                <p className="text-sm font-bold text-slate-800">
                                                                    {selectedEvidence.bio_details.verification || <span className="text-amber-600 italic">Pending Lab Analysis...</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                    {/* 4. ID DOCUMENT DETAILS */}
                                    {selectedEvidence.evidence_type === 'ID' && selectedEvidence.id_details && (
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Registered Owner Name</p>
                                                <p className="font-bold text-slate-800 text-lg">{selectedEvidence.id_details.owner}</p>
                                            </div>
                                            
                                            {Object.keys(selectedEvidence.id_details.data || {}).length > 0 && (
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                    <p className="text-[10px] font-black text-blue-800 uppercase mb-3">Extracted Document Data</p>
                                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                        {Object.entries(selectedEvidence.id_details.data).map(([key, value]) => (
                                                            <React.Fragment key={key}>
                                                                <span className="font-bold text-slate-500">{key}:</span>
                                                                <span className="font-mono text-slate-900">{String(value)}</span>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selectedEvidence.evidence_type === 'MISC' && (
                                        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500 font-bold text-sm">
                                            Standard items carry no specialized metadata.
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="bg-slate-100 p-4 border-t border-slate-300 flex justify-between items-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Logged By: {selectedEvidence.recorder_name} <br/>
                                        {new Date(selectedEvidence.created_at).toLocaleString()}
                                    </p>
                                    <button onClick={() => setSelectedEvidence(null)} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded font-black text-xs uppercase shadow-md transition-colors">
                                        Close File
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </tbody>
            </table>
        </div>
    );
}