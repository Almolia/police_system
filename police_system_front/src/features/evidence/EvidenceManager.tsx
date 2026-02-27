import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import EvidenceList from './EvidenceList';

export default function EvidenceManager() {
    const { user } = useAuth();

    // Define who counts as "Police Personnel"
    const policeRoles = ['OFFICER', 'SERGEANT', 'DETECTIVE', 'CAPTAIN', 'CHIEF'];
    const isPolice = policeRoles.includes(user?.role || '');

    // ─── CASE SELECTION STATE ───
    const [availableCases, setAvailableCases] = useState<any[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [isLoadingCases, setIsLoadingCases] = useState(true);

    // ─── SHARED FORM STATES ───
    const [evidenceType, setEvidenceType] = useState('VEHICLE');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // ─── TYPE-SPECIFIC STATES ───
    const [plateNumber, setPlateNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [vehicleModel, setVehicleModel] = useState(''); 
    const [vehicleColor, setVehicleColor] = useState(''); 
    
    const [ownerName, setOwnerName] = useState('');
    const [idAttributes, setIdAttributes] = useState([{ key: '', value: '' }]);
    
    const [transcript, setTranscript] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    
    const [bioType, setBioType] = useState('BLOOD'); 
    const [bioImageFile, setBioImageFile] = useState<File | null>(null);
    
    // ─── UI STATE ───
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchCases = async () => {
            try {
                const response = await api.get('cases/cases/'); 
                setAvailableCases(response.data);
            } catch (error) {
                console.error("Failed to fetch cases:", error);
            } finally {
                setIsLoadingCases(false);
            }
        };
        fetchCases();
    }, []);

    const addAttribute = () => setIdAttributes([...idAttributes, { key: '', value: '' }]);
    const removeAttribute = (index: number) => setIdAttributes(idAttributes.filter((_, i) => i !== index));
    const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
        const newAttrs = [...idAttributes];
        newAttrs[index][field] = val;
        setIdAttributes(newAttrs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedCaseId) {
            setStatusMessage('❌ Error: Please select a case first.');
            return;
        }

        setIsLoading(true);
        setStatusMessage('');

        let endpoint = `evidence/${selectedCaseId}/evidence/`; 

        try {
            // ─── FILE UPLOAD LOGIC (BIO ONLY) ───
            if (evidenceType === 'BIO') {
                const formData = new FormData();
                formData.append('title', title);
                formData.append('description', description);
                formData.append('bio_type', bioType);
                
                if (bioImageFile) {
                    formData.append('image', bioImageFile); 
                }
    
                const response = await api.post(endpoint + 'bio/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setStatusMessage(`✅ Success! Forensic Evidence ID: ${response.data.id} recorded.`);
                setBioImageFile(null);
                
            } else {
                // ─── STANDARD JSON LOGIC (VEHICLE, ID, WITNESS, MISC) ───
                const payload: any = { title, description };
                
                if (evidenceType === 'VEHICLE') {
                    endpoint += 'vehicle/';
                    payload.model_name = vehicleModel;
                    payload.color = vehicleColor;
                    if (plateNumber) payload.plate_number = plateNumber;
                    if (serialNumber) payload.serial_number = serialNumber;
                } else if (evidenceType === 'ID') {
                    endpoint += 'id-doc/';
                    payload.owner_name = ownerName; 
                    const documentDataDict: Record<string, string> = {};
                    idAttributes.forEach(attr => {
                        if (attr.key.trim() !== '') documentDataDict[attr.key] = attr.value;
                    });
                    payload.document_data = documentDataDict; 
                } else if (evidenceType === 'WITNESS') {
                    endpoint += 'witness/';
                    payload.transcript = transcript;
                    if (mediaUrl) payload.media_url = mediaUrl;
                } else if (evidenceType === 'MISC') {
                    endpoint += 'misc/';
                }

                const response = await api.post(endpoint, payload);
                setStatusMessage(`✅ Success! Evidence ID: ${response.data.id} recorded.`);
            }

            // Clear global forms
            setTitle(''); setDescription('');
            setPlateNumber(''); setSerialNumber(''); setVehicleModel(''); setVehicleColor('');
            setOwnerName(''); setIdAttributes([{ key: '', value: '' }]);
            setTranscript(''); setMediaUrl('');
            
        } catch (error: any) {
            setStatusMessage(`❌ Error: ${error.response?.data?.detail || "Submission failed."}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-950 overflow-y-auto max-w-6xl mx-auto w-full bg-white rounded-2xl shadow-2xl h-full overflow-x-hidden overflow-y-auto border-2 border-slate-300">
            
            {/* ─── REGISTRATION FORM (Restricted to Police) ─── */}
            {isPolice && (
                <section className="bg-white border border-gray-200 rounded-xl shadow-lg p-8 mb-10">
                    <div className="flex justify-between items-center mb-6 border-b-4 border-blue-600 pb-2">
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                            Log New Evidence
                        </h2>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            ACTING AS: {user?.role}
                        </span>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex flex-col font-bold text-gray-700">
                                Target Case:
                                {isLoadingCases ? (
                                    <div className="mt-1 h-10 w-full animate-pulse bg-gray-200 rounded" />
                                ) : (
                                    <select 
                                        className="mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                                        value={selectedCaseId} 
                                        onChange={(e) => setSelectedCaseId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Select a Case --</option>
                                        {availableCases.map((c: any) => (
                                            <option key={c.id} value={c.id}>Case #{c.id}: {c.title}</option>
                                        ))}
                                    </select>
                                )}
                            </label>

                            <label className="flex flex-col font-bold text-gray-700">
                                Category:
                                <select 
                                    className="mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                                    value={evidenceType} 
                                    onChange={(e) => setEvidenceType(e.target.value)}
                                >
                                    <option value="VEHICLE">Vehicle</option>
                                    <option value="ID">ID Document</option>
                                    <option value="WITNESS">Witness Testimony</option>
                                    <option value="BIO">Forensic Sample</option>
                                    <option value="MISC">Other Items (Misc)</option>
                                </select>
                            </label>
                        </div>

                        {/* Common Fields */}
                        <input className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-900" type="text" placeholder="Official Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <textarea className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 shadow-sm text-slate-900" placeholder="Registrar's observations and context..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

                        {/* ─── MODULE: VEHICLE ─── */}
                        {evidenceType === 'VEHICLE' && (
                            <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl space-y-4">
                                <h4 className="font-black text-slate-700 text-sm uppercase tracking-wider">Vehicle Specs</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="p-3 border rounded-lg bg-white text-slate-900" type="text" placeholder="Make/Model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required />
                                    <input className="p-3 border rounded-lg bg-white text-slate-900" type="text" placeholder="Color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <input className="p-3 border rounded-lg bg-white text-slate-900 disabled:opacity-50 font-mono" type="text" placeholder="License Plate" value={plateNumber} onChange={(e) => { setPlateNumber(e.target.value); setSerialNumber(''); }} disabled={!!serialNumber} />
                                    <input className="p-3 border rounded-lg bg-white text-slate-900 disabled:opacity-50 font-mono" type="text" placeholder="VIN / Serial" value={serialNumber} onChange={(e) => { setSerialNumber(e.target.value); setPlateNumber(''); }} disabled={!!plateNumber} />
                                </div>
                            </div>
                        )}

                        {/* ─── MODULE: IDENTITY ─── */}
                        {evidenceType === 'ID' && (
                            <div className="p-5 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl space-y-4">
                                <h4 className="font-black text-blue-800 text-sm uppercase tracking-wider">Identification Registry</h4>
                                <input className="w-full p-3 border rounded-lg bg-white text-slate-900" type="text" placeholder="Name as shown on document" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                                {idAttributes.map((attr, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input className="flex-1 p-2 border rounded text-slate-900" type="text" placeholder="Field (e.g. Nationality)" value={attr.key} onChange={(e) => updateAttribute(index, 'key', e.target.value)} />
                                        <input className="flex-1 p-2 border rounded text-slate-900" type="text" placeholder="Value" value={attr.value} onChange={(e) => updateAttribute(index, 'value', e.target.value)} />
                                        <button type="button" onClick={() => removeAttribute(index)} className="px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold">×</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addAttribute} className="text-xs text-blue-700 font-black hover:underline uppercase">+ Add Metadata Field</button>
                            </div>
                        )}

                        {/* ─── MODULE: WITNESS ─── */}
                        {evidenceType === 'WITNESS' && (
                            <div className="p-5 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl space-y-4">
                                <h4 className="font-black text-amber-800 text-sm uppercase tracking-wider">Witness Testimony</h4>
                                <textarea className="w-full p-3 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500" placeholder="Full transcription of witness statement..." value={transcript} onChange={(e) => setTranscript(e.target.value)} required rows={4} />
                                <input className="w-full p-3 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500" type="url" placeholder="Media URL (Audio/Video file link, optional)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                            </div>
                        )}

                        {/* ─── MODULE: FORENSIC / BIO ─── */}
                        {evidenceType === 'BIO' && (
                            <div className="p-5 bg-red-50 border-2 border-dashed border-red-200 rounded-xl space-y-4">
                                <h4 className="font-black text-red-800 text-sm uppercase tracking-wider">Forensic Sample Collection</h4>
                                
                                <select className="w-full p-3 border rounded-lg bg-white font-bold text-slate-800 focus:ring-2 focus:ring-red-500" value={bioType} onChange={(e) => setBioType(e.target.value)} required>
                                    <option value="BLOOD">Blood Sample</option>
                                    <option value="DNA">DNA / Hair</option>
                                    <option value="FINGERPRINT">Fingerprint</option>
                                    <option value="OTHER">Other Biological</option>
                                </select>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-red-700 uppercase">Attach Crime Scene Photo</label>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setBioImageFile(e.target.files[0]);
                                            }
                                        }}
                                        className="p-2 border rounded bg-white text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ─── MODULE: MISC ─── */}
                        {evidenceType === 'MISC' && (
                            <div className="p-5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl space-y-4">
                                <h4 className="font-black text-gray-700 text-sm uppercase tracking-wider">Miscellaneous Items</h4>
                                <p className="text-sm text-gray-500 font-medium">No specialized fields required. Standard Title and Description will be used.</p>
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="mt-4 p-4 bg-blue-900 text-white font-black text-lg rounded-xl hover:bg-black transition-all shadow-lg">
                            {isLoading ? 'ENCRYPTING DATA...' : 'SUBMIT TO ARCHIVES'}
                        </button>
                    </form>

                    {statusMessage && (
                        <div className={`mt-6 p-4 rounded-xl font-bold border-2 ${statusMessage.includes('❌') ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                            {statusMessage}
                        </div>
                    )}
                </section>
            )}

            {/* ─── EVIDENCE ARCHIVES (Universal Access) ─── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-black text-gray-800 mb-6 border-b-4 border-slate-800 pb-2 inline-block">
                    Archive Review
                </h2>

                <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                    <label className="flex flex-col font-bold text-gray-700">
                        <span className="mb-2 uppercase tracking-wider text-sm text-blue-900">Select Target Case Archive:</span>
                        {isLoadingCases ? (
                            <div className="h-10 w-full animate-pulse bg-gray-200 rounded" />
                        ) : (
                            <select 
                                className="p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-bold shadow-sm"
                                value={selectedCaseId} 
                                onChange={(e) => setSelectedCaseId(e.target.value)}
                            >
                                <option value="">-- Select a Case to view its Evidence --</option>
                                {availableCases.map((c: any) => (
                                    <option key={c.id} value={c.id}>Case #{c.id}: {c.title}</option>
                                ))}
                            </select>
                        )}
                    </label>
                </div>

                {/* List renders automatically once selectedCaseId is populated */}
                <EvidenceList caseId={selectedCaseId} />
            </div>
        </div>
    );
}