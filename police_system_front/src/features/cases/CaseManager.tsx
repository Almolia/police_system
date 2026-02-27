import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function CaseManager() {
    const { user } = useAuth();
    const role = user?.role?.codename || user?.role;

    const [cases, setCases] = useState<any[]>([]);
    const [publicCases, setPublicCases] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // UI State
    const [activeTab, setActiveTab] = useState<'MY_CASES' | 'PUBLIC_CASES'>('MY_CASES');
    const [joinedCases, setJoinedCases] = useState<number[]>([]);
    
    // Form State (Handles Creation & Editing)
    const [showForm, setShowForm] = useState(false);
    const [editingCaseId, setEditingCaseId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        title: '', description: '', crime_level: 1, 
        crime_occurred_at: '', crime_scene_location: ''
    });

    // Review Modal State (For Police)
    const [reviewCaseId, setReviewCaseId] = useState<number | null>(null);
    const [reviewData, setReviewData] = useState({ action: 'APPROVE', message: '' });

    // ─── DATA FETCHING ───
    const fetchCases = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('cases/cases/');
            let allCases = res.data.results || res.data;
            
            // Filter queue based on role constraints
            if (role === 'CADET') {
                setCases(allCases.filter((c: any) => c.status === 'PENDING_CADET_REVIEW' || c.status === 'RETURNED_TO_CADET'));
            } else if (role === 'OFFICER' || role === 'PATROL_OFFICER') {
                setCases(allCases.filter((c: any) => c.status === 'PENDING_OFFICER_REVIEW'));
            } else if (role === 'CITIZEN') {
                setCases(allCases.filter((c: any) => c.primary_complainant === user?.id));
                setPublicCases(allCases.filter((c: any) => c.status === 'OPEN'));
            } else {
                // Detectives, Sergeants, Admins see all for tracking
                setCases(allCases);
            }
        } catch (err) {
            console.error("Failed to fetch cases.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchCases(); }, [role]);

    // ─── JOIN PUBLIC CASE (CITIZEN ONLY) ───
    const handleJoinCase = async (caseId: number) => {
        try {
            await api.post(`cases/cases/${caseId}/join_as_complainant/`);
            alert("✅ You have been successfully attached to this case as a formal complainant.");
            setJoinedCases(prev => [...prev, caseId]); // Update UI instantly
            fetchCases(); 
        } catch (err: any) {
            // If the backend 400 error says they already joined, hide the button anyway to fix the UI state
            if (err.response?.status === 400) {
                setJoinedCases(prev => [...prev, caseId]);
            }
            alert('❌ Failed to join case: ' + (err.response?.data?.error || err.response?.data?.detail || err.message));
        }
    };

    // ─── SUBMIT NEW OR EDITED RECORD ───
    const handleSubmitCase = async (e: React.FormEvent) => {
        e.preventDefault();
        const isCrimeScene = role !== 'CITIZEN' && role !== 'CADET'; 
        
        // 1. Base Payload
        const payload: any = {
            title: formData.title,
            description: formData.description,
            crime_level: formData.crime_level,
            formation_type: isCrimeScene ? 'CRIME_SCENE' : 'COMPLAINT'
        };

        // 2. Attach and format Date/Time if provided
        if (formData.crime_occurred_at && formData.crime_scene_location) {
            // Converts '2026-02-27T14:30' into strict ISO '2026-02-27T14:30:00Z'
            payload.crime_occurred_at = new Date(formData.crime_occurred_at).toISOString();
            payload.crime_scene_location = formData.crime_scene_location;
        } else if (isCrimeScene) {
            alert("Error: Crime Scene reports strictly require Date/Time and Location.");
            return;
        }

        try {
            if (editingCaseId) {
                // Citizen resending a rejected complaint
                await api.patch(`cases/cases/${editingCaseId}/`, {
                    ...payload,
                    status: 'PENDING_CADET_REVIEW' // Resets the status for Cadet re-evaluation
                });
                alert('Complaint modified and resent to Precinct Cadets.');
            } else {
                // Standard creation
                await api.post('cases/cases/', payload);
                alert('Official Record successfully submitted to the system.');
            }
            
            // Reset Form State
            setShowForm(false);
            setEditingCaseId(null);
            setFormData({ title: '', description: '', crime_level: 1, crime_occurred_at: '', crime_scene_location: '' });
            fetchCases();
        } catch (err: any) {
            alert('Submission failed: ' + JSON.stringify(err.response?.data || err.message));
        }
    };

    // Prepare form for editing a rejected complaint
    const handleEditClick = (c: any) => {
        setFormData({
            title: c.title,
            description: c.description,
            crime_level: c.crime_level,
            crime_occurred_at: c.crime_occurred_at ? new Date(c.crime_occurred_at).toISOString().slice(0, 16) : '',
            crime_scene_location: c.crime_scene_location || ''
        });
        setEditingCaseId(c.id);
        setShowForm(true);
    };

    // ─── REVIEW SUBMISSION (POLICE ONLY) ───
    const handleReviewSubmit = async () => {
        if (!reviewCaseId) return;
        
        if (reviewData.action === 'REJECT' && !reviewData.message) {
            alert("A rejection reason is strictly required.");
            return;
        }

        try {
            const endpoint = role === 'CADET' ? 'cadet_review' : 'officer_review';
            await api.post(`cases/cases/${reviewCaseId}/${endpoint}/`, reviewData);
            alert(`Official review submitted successfully.`);
            setReviewCaseId(null);
            setReviewData({ action: 'APPROVE', message: '' });
            fetchCases();
        } catch (err: any) {
            alert('Review failed: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="p-7 max-w-7xl mx-auto text-slate-900 h-full overflow-y-auto">
            
            {/* ─── HEADER ─── */}
            <div className="flex justify-between items-end mb-6 border-b-2 border-slate-300 pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">
                        {role === 'CITIZEN' ? 'Official Complaints Record' : 'Case Intake & Review'}
                    </h2>
                    <p className="text-sm font-bold text-slate-500 uppercase mt-1">
                        Active Authorization: <span className="text-amber-600">{role}</span>
                    </p>
                </div>
                
                {/* Cadets cannot create records, only review them */}
                {role !== 'CADET' && (
                    <button 
                        onClick={() => {
                            setEditingCaseId(null);
                            setFormData({ title: '', description: '', crime_level: 1, crime_occurred_at: '', crime_scene_location: '' });
                            setShowForm(!showForm);
                        }}
                        className="bg-amber-600 text-white px-6 py-2 rounded-lg font-black text-sm uppercase shadow-lg hover:bg-amber-500 transition-colors"
                    >
                        {showForm ? 'Cancel' : (role === 'CITIZEN' ? '+ File New Complaint' : '+ Log Crime Scene')}
                    </button>
                )}
            </div>

            {/* ─── CITIZEN TABS ─── */}
            {role === 'CITIZEN' && !showForm && (
                <div className="flex gap-4 mb-6">
                    <button 
                        onClick={() => setActiveTab('MY_CASES')} 
                        className={`px-6 py-2 font-black uppercase text-xs rounded-full transition-all ${activeTab === 'MY_CASES' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                        My Complaints
                    </button>
                    <button 
                        onClick={() => setActiveTab('PUBLIC_CASES')} 
                        className={`px-6 py-2 font-black uppercase text-xs rounded-full transition-all ${activeTab === 'PUBLIC_CASES' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                        Public Active Cases
                    </button>
                </div>
            )}

            {/* ─── CREATION / EDIT FORM ─── */}
            {showForm && (
                <form onSubmit={handleSubmitCase} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl mb-8 animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-black text-lg mb-4 text-slate-800 uppercase">
                        {editingCaseId ? 'Revise Rejected Complaint' : (role === 'CITIZEN' ? 'Official Complaint Form' : 'Crime Scene Report')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incident Title</label>
                            <input required type="text" className="w-full border p-2 rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </div>
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Detailed Description</label>
                            <textarea required rows={4} className="w-full border p-2 rounded" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimated Crime Level</label>
                            <select className="w-full border p-2 rounded font-bold" value={formData.crime_level} onChange={e => setFormData({...formData, crime_level: parseInt(e.target.value)})}>
                                <option value="1">Level 3 (Minor Offense)</option>
                                <option value="2">Level 2 (Major Offense)</option>
                                <option value="3">Level 1 (Serious Crime)</option>
                                <option value="4">Critical (Serial / Assassination)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time of Occurrence</label>
                            <input type="datetime-local" className="w-full border p-2 rounded" value={formData.crime_occurred_at} onChange={e => setFormData({...formData, crime_occurred_at: e.target.value})} />
                        </div>
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exact Scene Location</label>
                            <input type="text" className="w-full border p-2 rounded" value={formData.crime_scene_location} onChange={e => setFormData({...formData, crime_scene_location: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" className="mt-6 bg-slate-900 text-white px-8 py-3 rounded font-black text-sm uppercase w-full hover:bg-slate-800 transition-colors">
                        {editingCaseId ? 'Resend for Cadet Verification' : 'Submit Official Record'}
                    </button>
                </form>
            )}

            {/* ─── RECORD LIST RENDERER ─── */}
            {!showForm && (
                <div className="space-y-4 pb-12">
                    {isLoading ? <div className="text-center font-bold text-slate-400 mt-10">Syncing secure database...</div> : 
                    (activeTab === 'MY_CASES' ? cases : publicCases).length === 0 ? <div className="text-center font-bold text-slate-400 p-8 border-2 border-dashed border-slate-300 rounded-xl mt-4">No records found for this category.</div> :
                    (activeTab === 'MY_CASES' ? cases : publicCases).map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-lg border-l-8 border-slate-400 shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            
                            {/* CASE DETAILS */}
                            <div className="flex-grow">
                                <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">Record #{c.id}</span>
                                <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-600 px-2 py-1 rounded ml-2">{c.formation_type}</span>
                                <h4 className="font-black text-lg text-slate-900 mt-2">{c.title}</h4>
                                <p className="text-xs font-bold text-red-600 uppercase mt-1">Status: {c.status.replace(/_/g, ' ')}</p>
                                
                                {/* Citizen Rejection Warning (Only visible in My Cases if rejected) */}
                                {c.complainant_rejection_count > 0 && role === 'CITIZEN' && activeTab === 'MY_CASES' && (
                                    <div className="mt-2 bg-orange-50 p-2 rounded border border-orange-200 inline-block">
                                        <p className="text-[10px] font-black text-orange-800 uppercase">
                                            Rejections: {c.complainant_rejection_count}/3
                                        </p>
                                        <p className="text-xs text-orange-900 italic">"Please correct errors and resend."</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* ─── ACTION BUTTONS ─── */}
                            
                            {/* CITIZEN: Edit Rejected Case */}
                            {role === 'CITIZEN' && activeTab === 'MY_CASES' && c.complainant_rejection_count > 0 && c.complainant_rejection_count < 3 && c.status !== 'VOIDED' && (
                                <button onClick={() => handleEditClick(c)} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded font-black text-xs uppercase shadow-md shrink-0 transition-colors">
                                    Edit & Resend
                                </button>
                            )}

                            {/* CITIZEN: Join Public Case */}
                            {role === 'CITIZEN' && activeTab === 'PUBLIC_CASES' && (
                                <>
                                    {/* If user is the primary complainant OR successfully clicked join during this session */}
                                    {c.primary_complainant === user?.id || joinedCases.includes(c.id) || c.secondary_complainants?.includes(user?.id) ? (
                                        <span className="bg-green-100 text-green-700 border border-green-300 px-6 py-2 rounded font-black text-xs uppercase shadow-sm shrink-0">
                                            ✓ Already Joined
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => handleJoinCase(c.id)} 
                                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded font-black text-xs uppercase shadow-md transition-colors shrink-0"
                                        >
                                            File Complaint on this Case
                                        </button>
                                    )}
                                </>
                            )}

                            {/* POLICE: Review Case (Cadet / Officer) */}
                            {((role === 'CADET' && (c.status === 'PENDING_CADET_REVIEW' || c.status === 'RETURNED_TO_CADET')) || 
                            (role === 'OFFICER' && c.status === 'PENDING_OFFICER_REVIEW')) && (
                                <button onClick={() => setReviewCaseId(c.id)} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded font-black text-xs uppercase shrink-0 shadow-md transition-colors">
                                    Review File
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ─── POLICE REVIEW MODAL ─── */}
            {reviewCaseId && (
                <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-xl w-full max-w-md border-t-8 border-slate-900 animate-in zoom-in-95">
                        <h3 className="font-black text-lg uppercase mb-6 tracking-tighter">Record #{reviewCaseId} Assessment</h3>
                        
                        <div className="mb-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Determination</label>
                            <select 
                                className="w-full border-2 border-slate-200 p-3 rounded font-bold text-sm outline-none focus:border-slate-400" 
                                onChange={e => setReviewData({...reviewData, action: e.target.value})}
                            >
                                <option value="APPROVE">✅ APPROVE (Pass to next stage)</option>
                                <option value="REJECT">❌ REJECT (Return for corrections)</option>
                            </select>
                        </div>

                        {reviewData.action === 'REJECT' && (
                            <div className="mb-6 animate-in fade-in">
                                <label className="block text-[10px] font-black text-red-600 uppercase mb-2">Rejection Reason (Required)</label>
                                <textarea 
                                    className="w-full border-2 border-red-200 p-3 rounded text-sm italic bg-red-50/50 outline-none focus:border-red-400" 
                                    rows={3} 
                                    placeholder="Explain missing details to the complainant/cadet..." 
                                    onChange={e => setReviewData({...reviewData, message: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 mt-8">
                            <button onClick={handleReviewSubmit} className="flex-grow bg-slate-900 text-white py-3 rounded font-black text-xs uppercase shadow-lg hover:bg-slate-800 transition-colors">
                                Submit Determination
                            </button>
                            <button onClick={() => setReviewCaseId(null)} className="px-6 py-3 border-2 border-slate-200 rounded font-bold text-xs text-slate-500 uppercase hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}