import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import GlobalReport from '../../components/GlobalReport';
import { useAuth } from '../../context/AuthContext';

export default function CourtroomPanel() {
    // ─── AUTH CONTEXT ───
    const { user, devSwitchRole } = useAuth();
    const [activeTab, setActiveTab] = useState<'ISSUE' | 'HISTORY'>('ISSUE');
    
    // ─── MODAL STATE ───
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dossierId, setDossierId] = useState('');

    // ─── ALERTS & LOADING ───
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ─── DATA ───
    const [verdicts, setVerdicts] = useState<any[]>([]);

    // ─── VERDICT FORM STATE ───
    const [caseId, setCaseId] = useState('');
    const [verdict, setVerdict] = useState('INNOCENT');
    const [sentenceType, setSentenceType] = useState('NONE');
    const [prisonMonths, setPrisonMonths] = useState('');
    const [fineAmount, setFineAmount] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const displayMessage = (msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(''), 4000);
    };

    const fetchVerdicts = async () => {
        try {
            // Publicly accessible verdict list
            const response = await api.get('legal/verdicts/');
            setVerdicts(response.data);
        } catch (error) {
            console.error("Failed to fetch verdicts:", error);
        }
    };

    useEffect(() => {
        fetchVerdicts();
        // Force the tab to History if a non-judge is selected
        if (user?.role !== 'JUDGE') setActiveTab('HISTORY');
    }, [user?.role]);

    const handleVerdictChange = (newVerdict: string) => {
        setVerdict(newVerdict);
        // Logical enforcement: Innocent people cannot be sentenced
        if (newVerdict === 'INNOCENT') {
            setSentenceType('NONE');
            setPrisonMonths('');
            setFineAmount('');
        } else {
            setSentenceType('PRISON'); 
        }
    };

    const handleOpenModal = () => {
        if (!caseId) {
            displayMessage("❌ Please enter a Case ID first.");
            return;
        }
        setDossierId(caseId);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setStatusMessage('');

        try {
            // 1. Fetch all interrogations (suspects) tied to this Case
            const intRes = await api.get(`investigation/interrogations/?case=${caseId}`);
            const allInterrogations = intRes.data.results || intRes.data;
            
            // 2. Filter out suspects the Sergeant rejected
            const validSuspects = allInterrogations.filter((i: any) => i.sergeant_approval === true);

            if (validSuspects.length === 0) {
                displayMessage('❌ Error: This case has no Sergeant-approved suspects to sentence.');
                setIsLoading(false);
                return;
            }

            // 3. Issue the verdict for all valid suspects concurrently
            await Promise.all(validSuspects.map((suspect: any) => {
                const payload = {
                    interrogation: suspect.id,
                    verdict,
                    sentence_type: sentenceType,
                    prison_months: prisonMonths ? parseInt(prisonMonths) : 0,
                    fine_amount: fineAmount ? parseInt(fineAmount) : 0,
                    title,
                    description
                };
                return api.post('legal/verdicts/', payload);
            }));

            displayMessage(`✅ Court Verdict Applied to ${validSuspects.length} Suspect(s)!`);
            
            setCaseId(''); setTitle(''); setDescription('');
            setPrisonMonths(''); setFineAmount('');
            setVerdict('INNOCENT'); setSentenceType('NONE');
            
            fetchVerdicts();
            setActiveTab('HISTORY');
        } catch (error: any) {
            displayMessage(`❌ Error: ${error.response?.data?.detail || JSON.stringify(error.response?.data)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col font-sans relative bg-white">    
            {/* ─── FLOATING TOAST ALERT ─── */}
            {statusMessage && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg font-bold shadow-2xl z-50 transition-all duration-300 ${statusMessage.includes('❌') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {statusMessage}
                </div>
            )}

            {/* ─── FULL SCREEN DOSSIER MODAL ─── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8 transition-opacity">
                    <div className="bg-slate-200 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-x-hidden overflow-y-auto border-2 border-slate-700 relative">
                        {/* Modal Header */}
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase">
                                ⚖️ Courtroom Case Review
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-white hover:text-red-400 font-bold text-2xl leading-none transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        
                        {/* Scrollable Modal Body */}
                        <div className="p-6 overflow-y-auto grow">
                            <GlobalReport interrogationId={dossierId} />
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="bg-slate-300 px-6 py-4 shrink-0 flex justify-end border-t border-slate-400">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded shadow transition-colors"
                            >
                                Close Dossier & Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {/* ─── MAIN PANEL ─── */}
                <div className="flex flex-col h-full overflow-x-hidden overflow-y-auto">
                    <div className="bg-slate-800 p-6 border-b border-slate-900">
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        🏛️ The Courtroom
                    </h2>
                    <p className="text-slate-400 mt-1">Final legal proceedings and sentencing archives.</p>
                </div>

                {/* ─── CONDITIONAL HEADER ─── */}
                {user?.role === 'JUDGE' ? (
                    <div className="flex bg-slate-100 border-b border-gray-200">
                        <button onClick={() => setActiveTab('ISSUE')} className={`flex-1 py-4 font-black transition-colors ${activeTab === 'ISSUE' ? 'bg-white text-slate-900 border-t-4 border-t-red-700' : 'text-slate-500 hover:bg-slate-200'}`}>
                            Issue Formal Verdict
                        </button>
                        <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 py-4 font-black transition-colors ${activeTab === 'HISTORY' ? 'bg-white text-slate-900 border-t-4 border-t-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}>
                            Verdict Archives
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-100 border-b border-gray-200 p-4">
                        <h3 className="text-slate-700 font-bold uppercase tracking-wider text-sm text-center">
                            Public Verdict Archives
                        </h3>
                    </div>
                )}

                {/* ─── TAB: ISSUE VERDICT (JUDGE ONLY) ─── */}
                {activeTab === 'ISSUE' && user?.role === 'JUDGE' && (
                    <div className="p-8 bg-white">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl mx-auto">
                            
                            {/* Target Interrogation + Modal Trigger */}
                            <div className="p-5 bg-slate-50 rounded-lg border border-slate-200 shadow-inner flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Target Case ID</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 border rounded shadow-sm focus:ring-2 focus:ring-red-500 font-mono text-lg" 
                                    placeholder="Enter Case ID..." 
                                    value={caseId} 
                                    onChange={(e) => setCaseId(e.target.value)} 
                                    required 
                                />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleOpenModal}
                                    className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow-md transition-colors whitespace-nowrap h-fit"
                                >
                                    🔍 Review Dossier
                                </button>
                            </div>

                            <hr className="my-2 border-slate-200" />

                            {/* Sentencing Logic */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Final Verdict</label>
                                    <select className="w-full p-3 border rounded shadow-sm bg-white font-bold" value={verdict} onChange={(e) => handleVerdictChange(e.target.value)}>
                                        <option value="INNOCENT">Innocent (Acquitted)</option>
                                        <option value="GUILTY" className="text-red-700">Guilty (Convicted)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Sentence Type</label>
                                    <select className="w-full p-3 border rounded shadow-sm bg-white" value={sentenceType} onChange={(e) => setSentenceType(e.target.value)} disabled={verdict === 'INNOCENT'}>
                                        <option value="NONE">None</option>
                                        {verdict === 'GUILTY' && (
                                            <>
                                                <option value="PRISON">Imprisonment</option>
                                                <option value="FINE">Fine Penalty</option>
                                                <option value="PRISON_AND_FINE">Prison & Fine</option>
                                                <option value="COMMUNITY">Community Service</option>
                                                <option value="EXECUTION" className="text-red-600 font-bold">Death Penalty</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {verdict === 'GUILTY' && ['PRISON', 'PRISON_AND_FINE'].includes(sentenceType) && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Prison Duration (Months)</label>
                                    <input type="number" className="w-full p-3 border rounded shadow-sm" placeholder="e.g. 120" value={prisonMonths} onChange={(e) => setPrisonMonths(e.target.value)} required />
                                </div>
                            )}

                            {verdict === 'GUILTY' && ['FINE', 'PRISON_AND_FINE'].includes(sentenceType) && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Fine Amount (Rials)</label>
                                    <input type="number" className="w-full p-3 border rounded shadow-sm" placeholder="e.g. 50000000" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} required />
                                </div>
                            )}

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Official Title of Ruling</label>
                                <input type="text" className="w-full p-3 border rounded shadow-sm mb-4" placeholder="e.g., Armed Robbery Conviction" value={title} onChange={(e) => setTitle(e.target.value)} required />
                                
                                <label className="block text-sm font-bold text-slate-700 mb-2">Judge's Final Remarks</label>
                                <textarea className="w-full p-3 border rounded shadow-sm" placeholder="Full text of the sentencing..." value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
                            </div>

                            <button type="submit" disabled={isLoading} className="mt-4 w-full py-4 bg-slate-900 hover:bg-black text-white text-lg font-black rounded-xl shadow-lg transition-all disabled:opacity-50">
                                ⚖️ BANG GAVEL & ISSUE VERDICT
                            </button>
                        </form>
                    </div>
                )}

                {/* ─── TAB: VERDICT ARCHIVES (ALL STAFF & CITIZENS) ─── */}
                {activeTab === 'HISTORY' && (
                    <div className="p-6 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {verdicts.map(v => (
                                <div key={v.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 relative overflow-x-hidden overflow-y-auto">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${v.verdict === 'GUILTY' ? 'bg-red-600' : 'bg-green-500'}`}></div>
                                    
                                    <div className="pl-3 text-slate-900">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-black text-lg text-slate-800">{v.title}</h3>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${v.verdict === 'GUILTY' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {v.verdict}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100">{v.description}</p>
                                        
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <p className="text-slate-500">Target Interrogation:</p>
                                            <p className="font-mono font-bold">Inq-#{v.interrogation}</p>
                                            
                                            <p className="text-slate-500">Sentence Type:</p>
                                            <p className="font-bold">{v.sentence_type.replace(/_/g, ' ')}</p>

                                            {(v.prison_months > 0) && (
                                                <>
                                                    <p className="text-slate-500">Prison Term:</p>
                                                    <p className="font-bold text-red-600">{v.prison_months} Months</p>
                                                </>
                                            )}

                                            {(v.fine_amount > 0) && (
                                                <>
                                                    <p className="text-slate-500">Fine Levied:</p>
                                                    <p className="font-mono font-bold text-red-600">{v.fine_amount.toLocaleString()} Rials</p>
                                                </>
                                            )}

                                            <p className="text-slate-500 mt-2">Presiding Judge:</p>
                                            <p className="font-bold text-slate-800 mt-2">{v.judge_name || `Judge ID: ${v.judge}`}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {verdicts.length === 0 && (
                                <div className="col-span-2 p-10 text-center text-slate-500 font-medium bg-white rounded-lg border border-dashed border-slate-300">
                                    No verdicts have been issued yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}