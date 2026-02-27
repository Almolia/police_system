import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function FinanceDashboard() {
    // ─── DEV SIMULATOR (Replace with actual Auth Context later) ───
    const [userRole, setUserRole] = useState<'CITIZEN' | 'OFFICER' | 'SERGEANT' | 'DETECTIVE'>('CITIZEN');

    const [activeTab, setActiveTab] = useState<'TIP' | 'RELEASE' | 'PAY'>('TIP');
    
    // ─── STATUS ALERT STATE ───
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // ─── DATA RECORDS STATE ───
    const [tips, setTips] = useState<any[]>([]);
    const [releaseRequests, setReleaseRequests] = useState<any[]>([]);

    // ─── FORM STATES ───
    const [tipDesc, setTipDesc] = useState('');
    const [tipCaseId, setTipCaseId] = useState('');
    const [tipSuspectId, setTipSuspectId] = useState('');
    
    const [interrogationId, setInterrogationId] = useState('');
    
    const [payInterrogationId, setPayInterrogationId] = useState('');
    const [payType, setPayType] = useState('BAIL');
    const [payAmount, setPayAmount] = useState('');

    // ─── SERGEANT INLINE EDITING STATE ───
    const [editingReleaseId, setEditingReleaseId] = useState<number | null>(null);
    const [editBail, setEditBail] = useState('');
    const [editFine, setEditFine] = useState('');

    // ─── AUTO-DISMISSING MESSAGE HANDLER ───
    const displayMessage = (msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => {
            setStatusMessage('');
        }, 4000);
    };

    // ─── FETCH DATA ───
    const fetchRecords = async () => {
        try {
            const [tipsRes, reqsRes] = await Promise.all([
                api.get('finance/tips/').catch(() => ({ data: [] })),
                api.get('finance/release-requests/').catch(() => ({ data: [] }))
            ]);
            setTips(tipsRes.data);
            setReleaseRequests(reqsRes.data);
        } catch (error) {
            console.error("Failed to fetch records:", error);
        }
    };

    // Fetch on mount and when role changes (for testing)
    useEffect(() => {
        fetchRecords();
    }, [userRole]);

    const handleError = (error: any) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            displayMessage('❌ Error: You do not have permission for this action.');
        } else {
            displayMessage(`❌ Error: ${error.response?.data?.detail || JSON.stringify(error.response?.data)}`);
        }
    };

    // ─── CITIZEN ACTIONS ───
    const handleTipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setStatusMessage('');
        try {
            const payload: any = { description: tipDesc };
            if (tipCaseId) payload.case = parseInt(tipCaseId);
            if (tipSuspectId) payload.suspect = parseInt(tipSuspectId);
            await api.post('finance/tips/', payload);
            displayMessage('✅ Tip submitted successfully!');
            setTipDesc(''); setTipCaseId(''); setTipSuspectId('');
            fetchRecords(); 
        } catch (error) { handleError(error); } 
        finally { setIsLoading(false); }
    };

    const handleReleaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setStatusMessage('');
        try {
            await api.post('finance/release-requests/', { interrogation: parseInt(interrogationId) });
            displayMessage('✅ Release requested!');
            setInterrogationId('');
            fetchRecords();
        } catch (error) { handleError(error); } 
        finally { setIsLoading(false); }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true); setStatusMessage('');
        try {
            const payload = { 
                interrogation: parseInt(payInterrogationId), 
                transaction_type: payType, 
                amount: payAmount,
                callback_url: `${window.location.origin}/payment-callback`
            };
            const response = await api.post('finance/payments/initiate/', payload);
            displayMessage('✅ Initiating ZarinPal Redirect...');
            if (response.data.payment_url) window.location.href = response.data.payment_url;
        } catch (error) { handleError(error); } 
        finally { setIsLoading(false); }
    };

    // ─── POLICE ACTIONS ───
    const handleUpdateTip = async (id: number, status: string) => {
        try {
            await api.patch(`finance/tips/${id}/`, { status });
            displayMessage(`✅ Tip marked as ${status}`);
            fetchRecords();
        } catch (error) { handleError(error); }
    };

    const handleUpdateRelease = async (id: number, status: string) => {
        try {
            const payload: any = { status };
            if (status === 'APPROVED') {
                payload.bail_amount = editBail ? parseInt(editBail) : 0;
                payload.fine_amount = editFine ? parseInt(editFine) : 0;
            }
            await api.patch(`finance/release-requests/${id}/`, payload);
            setEditingReleaseId(null);
            displayMessage(`✅ Release request ${status}`);
            fetchRecords();
        } catch (error) { handleError(error); }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 mt-10 font-sans relative">
            
            {/* ─── FLOATING ALERT MESSAGE ─── */}
            {statusMessage && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg font-bold shadow-2xl z-50 transition-all duration-300 ${statusMessage.includes('❌') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                    {statusMessage}
                </div>
            )}

            {/* ─── DEV SIMULATOR ─── */}
            <div className="mb-6 p-4 bg-purple-100 border border-purple-300 rounded-lg flex items-center gap-4 shadow-sm">
                <span className="font-bold text-purple-800">🛠️ Dev Role Simulator:</span>
                <select className="p-2 border border-purple-300 rounded font-bold text-purple-900 bg-white focus:ring-2 focus:ring-purple-500" value={userRole} onChange={(e: any) => setUserRole(e.target.value)}>
                    <option value="CITIZEN">Citizen (Submitters & Payers)</option>
                    <option value="OFFICER">Officer (Forwards Tips)</option>
                    <option value="DETECTIVE">Detective (Approves Tips)</option>
                    <option value="SERGEANT">Sergeant (Sets Bail Amounts)</option>
                </select>
                <span className="text-sm text-purple-600 font-medium">Changes UI to match what this user should see.</span>
            </div>

            {/* ─── ACTION PANELS (Only Citizens need to submit forms) ─── */}
            {userRole === 'CITIZEN' && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-black text-gray-800 mb-6 border-b pb-4">💸 Citizen Finance Portal</h2>
                    
                    <div className="flex gap-2 mb-6">
                        <button onClick={() => setActiveTab('TIP')} className={`flex-1 py-3 font-bold rounded-lg transition-colors ${activeTab === 'TIP' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>1. Submit Tip</button>
                        <button onClick={() => setActiveTab('RELEASE')} className={`flex-1 py-3 font-bold rounded-lg transition-colors ${activeTab === 'RELEASE' ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>2. Request Release</button>
                        <button onClick={() => setActiveTab('PAY')} className={`flex-1 py-3 font-bold rounded-lg transition-colors ${activeTab === 'PAY' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>3. Pay Gateway</button>
                    </div>

                    <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg">
                        {activeTab === 'TIP' && (
                            <form onSubmit={handleTipSubmit} className="flex flex-col gap-4">
                                <h3 className="font-bold text-blue-800 text-lg mb-2">Report Information (Rewards)</h3>
                                <textarea className="p-3 border rounded focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Detailed description of the tip..." value={tipDesc} onChange={(e) => setTipDesc(e.target.value)} required rows={3} />
                                <div className="flex gap-4">
                                    <input className="flex-1 p-3 border rounded shadow-sm focus:ring-2 focus:ring-blue-500" type="number" placeholder="Case ID (Optional)" value={tipCaseId} onChange={(e) => setTipCaseId(e.target.value)} />
                                    <input className="flex-1 p-3 border rounded shadow-sm focus:ring-2 focus:ring-blue-500" type="number" placeholder="Suspect ID (Optional)" value={tipSuspectId} onChange={(e) => setTipSuspectId(e.target.value)} />
                                </div>
                                <button type="submit" disabled={isLoading} className="mt-2 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50">Submit Tip</button>
                            </form>
                        )}

                        {activeTab === 'RELEASE' && (
                            <form onSubmit={handleReleaseSubmit} className="flex flex-col gap-4">
                                <h3 className="font-bold text-yellow-800 text-lg mb-2">Request Bail/Fine Assessment</h3>
                                <input className="p-3 border rounded shadow-sm focus:ring-2 focus:ring-yellow-500" type="number" placeholder="Interrogation ID" value={interrogationId} onChange={(e) => setInterrogationId(e.target.value)} required />
                                <button type="submit" disabled={isLoading} className="mt-2 py-3 bg-yellow-500 text-white font-bold rounded hover:bg-yellow-600 shadow-md transition-colors disabled:opacity-50">Request Assessment</button>
                            </form>
                        )}

                        {activeTab === 'PAY' && (
                            <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-4">
                                <h3 className="font-bold text-green-800 text-lg mb-2">Secure Payment Gateway</h3>
                                <div className="flex gap-4">
                                    <input className="flex-1 p-3 border rounded shadow-sm focus:ring-2 focus:ring-green-500" type="number" placeholder="Interrogation ID" value={payInterrogationId} onChange={(e) => setPayInterrogationId(e.target.value)} required />
                                    <select className="flex-1 p-3 border rounded shadow-sm bg-white focus:ring-2 focus:ring-green-500" value={payType} onChange={(e) => setPayType(e.target.value)}>
                                        <option value="BAIL">Bail Payment</option>
                                        <option value="FINE">Fine Payment</option>
                                    </select>
                                </div>
                                <input className="p-3 border rounded shadow-sm focus:ring-2 focus:ring-green-500" type="number" placeholder="Amount in Rials (Must match approved record)" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                                <button type="submit" disabled={isLoading} className="mt-2 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow-md transition-colors disabled:opacity-50">Proceed to ZarinPal</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ─── RECORD HISTORY TABLES ─── */}
            <div className="grid grid-cols-1 gap-8">
                
                {/* TIPS TABLE */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-blue-900 text-white p-4 font-bold text-lg flex items-center gap-2">
                        📋 Tip & Reward Records
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300 text-gray-700 bg-gray-50">
                                    <th className="p-3">ID</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Reward Amount</th>
                                    <th className="p-3">Tracking UUID</th>
                                    {userRole !== 'CITIZEN' && <th className="p-3">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {tips.map(tip => (
                                    <tr key={tip.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="p-3 font-bold text-gray-500">#{tip.id}</td>
                                        <td className="p-3 max-w-xs truncate" title={tip.description}>{tip.description}</td>
                                        <td className="p-3">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${tip.status === 'PENDING' ? 'bg-gray-100 text-gray-700 border-gray-300' : tip.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-300' : tip.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                                {tip.status}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono font-medium text-gray-800">{tip.amount ? `${tip.amount.toLocaleString()} Rials` : '-'}</td>
                                        <td className="p-3 text-xs font-mono text-gray-400 truncate max-w-[150px]" title={tip.unique_tracking_id}>{tip.unique_tracking_id || 'Not generated yet'}</td>
                                        
                                        {/* Role-Based Police Actions */}
                                        {userRole === 'OFFICER' && tip.status === 'PENDING' && (
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => handleUpdateTip(tip.id, 'FORWARDED')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors">Forward</button>
                                                <button onClick={() => handleUpdateTip(tip.id, 'REJECTED')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors">Reject</button>
                                            </td>
                                        )}
                                        {userRole === 'DETECTIVE' && tip.status === 'FORWARDED' && (
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => handleUpdateTip(tip.id, 'APPROVED')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded transition-colors">Approve & Generate UUID</button>
                                                <button onClick={() => handleUpdateTip(tip.id, 'REJECTED')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors">Reject</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {tips.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No tip records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RELEASE REQUESTS TABLE */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-yellow-600 text-white p-4 font-bold text-lg flex items-center gap-2">
                        ⚖️ Release Requests & Bail
                    </div>
                    <div className="overflow-x-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300 text-gray-700 bg-gray-50">
                                    <th className="p-3">ID</th>
                                    <th className="p-3">Interrogation #</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-center">Bail (Paid / Total)</th>
                                    <th className="p-3 text-center">Fine (Paid / Total)</th>
                                    {userRole === 'SERGEANT' && <th className="p-3">Sergeant Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {releaseRequests.map(req => {
                                    const bailIsPaid = (req.bail_paid || 0) >= (req.bail_amount || 0) && req.bail_amount > 0;
                                    const fineIsPaid = (req.fine_paid || 0) >= (req.fine_amount || 0) && req.fine_amount > 0;

                                    return (
                                        <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3 font-bold text-gray-500">#{req.id}</td>
                                            <td className="p-3 font-medium text-gray-800">Inq-#{req.interrogation}</td>
                                            <td className="p-3">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : req.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 border-blue-300' : req.status === 'PAID' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            
                                            {/* Bail Progress Column */}
                                            <td className="p-3 font-mono text-center text-sm">
                                                {req.bail_amount > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={bailIsPaid ? "text-green-600 font-bold" : "text-gray-800 font-medium"}>
                                                            {req.bail_paid?.toLocaleString()} / {req.bail_amount?.toLocaleString()} Rials
                                                        </span>
                                                        {bailIsPaid && <span className="text-[10px] text-green-600 uppercase tracking-wider font-bold mt-1">Cleared</span>}
                                                    </div>
                                                ) : <span className="text-gray-400 italic">-</span>}
                                            </td>

                                            {/* Fine Progress Column */}
                                            <td className="p-3 font-mono text-center text-sm">
                                                {req.fine_amount > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className={fineIsPaid ? "text-green-600 font-bold" : "text-gray-800 font-medium"}>
                                                            {req.fine_paid?.toLocaleString()} / {req.fine_amount?.toLocaleString()} Rials
                                                        </span>
                                                        {fineIsPaid && <span className="text-[10px] text-green-600 uppercase tracking-wider font-bold mt-1">Cleared</span>}
                                                    </div>
                                                ) : <span className="text-gray-400 italic">-</span>}
                                            </td>
                                            
                                            {/* Sergeant Actions */}
                                            {userRole === 'SERGEANT' && req.status === 'PENDING' && (
                                                <td className="p-3">
                                                    {editingReleaseId === req.id ? (
                                                        <div className="flex flex-col gap-2 bg-yellow-50 p-2 rounded border border-yellow-200 shadow-inner">
                                                            <input type="number" placeholder="Bail Amount (Rials)" className="p-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500" value={editBail} onChange={e => setEditBail(e.target.value)} />
                                                            <input type="number" placeholder="Fine Amount (Rials)" className="p-1.5 border border-yellow-300 rounded text-sm focus:ring-1 focus:ring-yellow-500" value={editFine} onChange={e => setEditFine(e.target.value)} />
                                                            <div className="flex gap-2 mt-1">
                                                                <button onClick={() => handleUpdateRelease(req.id, 'APPROVED')} className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors">Save</button>
                                                                <button onClick={() => setEditingReleaseId(null)} className="flex-1 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors">Cancel</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setEditingReleaseId(req.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded transition-colors">Set Amounts</button>
                                                            <button onClick={() => handleUpdateRelease(req.id, 'REJECTED')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors">Reject</button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {releaseRequests.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No release requests found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}