import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function CoronerPanel() {
    const { user } = useAuth();

    // ─── STATE ───
    const [activeTab, setActiveTab] = useState<'QUEUE' | 'ARCHIVE'>('QUEUE');
    const [bioEvidence, setBioEvidence] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // The official lab notes the Coroner types out
    const [verificationNotes, setVerificationNotes] = useState('');

    // ─── FETCH DATA ───
    const fetchBioData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('evidence/bio/queue/'); 
            // Separate the data based on whether a Coroner has verified it yet
            const pending = response.data.filter((item: any) => !item.coroner_verification);
            const archived = response.data.filter((item: any) => item.coroner_verification);
            
            const targetList = activeTab === 'QUEUE' ? pending : archived;
            setBioEvidence(targetList);
            setSelectedItem(targetList.length > 0 ? targetList[0] : null);
            setVerificationNotes(''); // Reset notes when switching
        } catch (error) {
            setStatusMessage("❌ Failed to load the forensics database.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBioData();
    }, [activeTab]);

    // ─── ACTIONS ───
    const handleVerdict = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        if (!verificationNotes.trim()) {
            setStatusMessage("❌ You must provide official lab notes before proceeding.");
            setTimeout(() => setStatusMessage(''), 3000);
            return;
        }

        setIsProcessing(true);
        try {
            // Send BOTH the status and the written notes to the backend
            await api.patch(`evidence/bio/${id}/`, { 
                status, 
                coroner_verification: verificationNotes 
            });
            setStatusMessage(`✅ Forensic Evidence ${status}`);
            setTimeout(() => setStatusMessage(''), 3000);
            
            fetchBioData(); // Refresh the queues
        } catch (error: any) {
            setStatusMessage(`❌ Error: ${error.response?.data?.detail || "Update failed."}`);
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col font-sans relative bg-slate-50">
            
            {statusMessage && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg font-bold shadow-2xl z-50 ${statusMessage.includes('❌') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {statusMessage}
                </div>
            )}

            <div className="bg-slate-900 p-6 border-b-4 border-teal-500 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">🔬 Forensics Lab</h2>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Medical Examiner</p>
                    <p className="text-white font-black">{user?.username}</p>
                </div>
            </div>

            {/* ─── TAB NAVIGATION ─── */}
            <div className="flex bg-white shadow-sm border-b border-slate-200">
                <button onClick={() => setActiveTab('QUEUE')} className={`flex-1 py-4 font-black transition-all ${activeTab === 'QUEUE' ? 'text-teal-700 border-b-4 border-teal-500 bg-teal-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
                    Pending Lab Queue
                </button>
                <button onClick={() => setActiveTab('ARCHIVE')} className={`flex-1 py-4 font-black transition-all ${activeTab === 'ARCHIVE' ? 'text-slate-800 border-b-4 border-slate-800 bg-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}>
                    Processed Archives
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 p-6 flex-grow overflow-y-auto">
                
                {/* ─── LEFT PANE: LIST ─── */}
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                    {isLoading ? (
                        <SkeletonLoader type="card" rows={3} />
                    ) : bioEvidence.length === 0 ? (
                        <div className="p-8 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-500 font-medium">
                            No records found in this queue.
                        </div>
                    ) : (
                        bioEvidence.map((item) => (
                            <button key={item.id} onClick={() => { setSelectedItem(item); setVerificationNotes(''); }} className={`text-left p-4 rounded-xl border-2 transition-all ${selectedItem?.id === item.id ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-1 rounded uppercase tracking-widest">
                                        {item.bio_type?.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">Case #{item.case}</span>
                                </div>
                                <h4 className="font-bold text-slate-900 truncate">{item.title}</h4>
                            </button>
                        ))
                    )}
                </div>

                {/* ─── RIGHT PANE: DETAILS & IMAGES ─── */}
                <div className="w-full md:w-2/3">
                    {!selectedItem && !isLoading ? (
                        <div className="h-full min-h-[400px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-slate-400 font-medium">Select a sample to review.</p>
                        </div>
                    ) : selectedItem && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-x-hidden overflow-y-auto flex flex-col h-full">
                            <div className="p-8 grow">
                                <h2 className="text-2xl font-black text-slate-900 mb-6">{selectedItem.title}</h2>
                                
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Field Notes</p>
                                        <p className="text-slate-700 mt-1">{selectedItem.description || "No notes provided."}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Chain of Custody</p>
                                        <p className="text-slate-800 font-bold mt-1">Officer: {selectedItem.recorder_name}</p>
                                        <p className="text-slate-500 text-sm">Logged: {new Date(selectedItem.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* IMAGE GALLERY */}
                                {selectedItem.images && selectedItem.images.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Attached Evidence Photos</p>
                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                            {selectedItem.images.map((img: any) => (
                                                <img key={img.id} src={img.image_url} alt="Evidence" className="h-40 w-auto rounded-lg border border-slate-200 shadow-sm object-cover" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ACTION AREA (Queue vs Archive) */}
                                {activeTab === 'QUEUE' ? (
                                    <div className="mt-8">
                                        <label className="text-xs font-black text-teal-800 uppercase tracking-widest block mb-2">
                                            Official Lab Results (Required)
                                        </label>
                                        <textarea 
                                            className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-0 outline-none text-slate-800" 
                                            placeholder="Enter DNA match results, blood typing, or forensic conclusions here..."
                                            value={verificationNotes}
                                            onChange={(e) => setVerificationNotes(e.target.value)}
                                            rows={4}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-8 p-6 bg-slate-800 text-teal-50 rounded-xl border border-slate-700">
                                        <p className="text-xs font-black text-teal-400 uppercase tracking-widest mb-2">Final Coroner Verdict</p>
                                        <p className="font-mono">{selectedItem.coroner_verification}</p>
                                    </div>
                                )}
                            </div>

                            {/* BUTTONS (Only in Queue Tab) */}
                            {activeTab === 'QUEUE' && (
                                <div className="bg-slate-50 p-6 border-t border-slate-200 flex gap-4">
                                    <button onClick={() => handleVerdict(selectedItem.id, 'APPROVED')} disabled={isProcessing} className="flex-1 py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50">
                                        ✅ CERTIFY & APPROVE
                                    </button>
                                    <button onClick={() => handleVerdict(selectedItem.id, 'REJECTED')} disabled={isProcessing} className="px-8 py-4 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl transition-all disabled:opacity-50">
                                        ❌ REJECT
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}