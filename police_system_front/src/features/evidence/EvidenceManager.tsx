import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function EvidenceManager() {
    // ─── CASE SELECTION STATE ───
    const [availableCases, setAvailableCases] = useState<any[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [isLoadingCases, setIsLoadingCases] = useState(true);

    // ─── BASE STATE ───
    const [evidenceType, setEvidenceType] = useState('VEHICLE');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // ─── VEHICLE STATE ───
    const [plateNumber, setPlateNumber] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [vehicleModel, setVehicleModel] = useState(''); 
    const [vehicleColor, setVehicleColor] = useState(''); 

    // ─── ID DOCUMENT STATE ───
    const [ownerName, setOwnerName] = useState('');
    const [idAttributes, setIdAttributes] = useState([{ key: '', value: '' }]);

    // ─── WITNESS STATE ───
    const [transcript, setTranscript] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');

    // ─── BIO EVIDENCE STATE ───
    const [bioType, setBioType] = useState('BLOOD'); 
    
    // ─── UI STATE ───
    const [statusMessage, setStatusMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Cases on Component Mount
    useEffect(() => {
        const fetchCases = async () => {
            try {
                // Adjust this endpoint if your case list URL is different
                const response = await api.get('/cases/cases/'); 
                setAvailableCases(response.data);
            } catch (error) {
                console.error("Failed to fetch cases:", error);
            } finally {
                setIsLoadingCases(false);
            }
        };
        fetchCases();
    }, []);

    // Dynamic ID Attribute Handlers
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

        const payload: any = { title, description };
        let endpoint = `/evidence/${selectedCaseId}/evidence/`; 
        
        if (evidenceType === 'VEHICLE') {
            endpoint += 'vehicle/';
            if (vehicleModel) payload.model_name = vehicleModel;
            if (vehicleColor) payload.color = vehicleColor;
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
        } else if (evidenceType === 'BIO') {
            endpoint += 'bio/';
            payload.bio_type = bioType;
        } else if (evidenceType === 'MISC') {
            endpoint += 'misc/';
        }

        try {
            const response = await api.post(endpoint, payload);
            setStatusMessage(`✅ Success! Evidence ID: ${response.data.id} recorded for Case #${selectedCaseId}.`);
            
            // Clear forms
            setTitle(''); setDescription('');
            setPlateNumber(''); setSerialNumber(''); setVehicleModel(''); setVehicleColor('');
            setOwnerName(''); setIdAttributes([{ key: '', value: '' }]);
            setTranscript(''); setMediaUrl('');
            setBioType('BLOOD');
        } catch (error: any) {
            const backendError = error.response?.data?.non_field_errors?.[0] 
                || error.response?.data?.detail 
                || JSON.stringify(error.response?.data) 
                || "Failed to submit evidence.";
            setStatusMessage(`❌ Error: ${backendError}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 mt-10 bg-white border border-gray-200 rounded-lg shadow-md font-sans">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Log New Evidence</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                {/* ─── CASE & TYPE SELECTORS ─── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col font-semibold text-gray-700">
                        Target Case:
                        <select 
                            className="mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={selectedCaseId} 
                            onChange={(e) => setSelectedCaseId(e.target.value)}
                            disabled={isLoadingCases}
                            required
                        >
                            <option value="">-- Select a Case --</option>
                            {availableCases.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    Case #{c.id}: {c.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col font-semibold text-gray-700">
                        Evidence Type:
                        <select 
                            className="mt-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            value={evidenceType} 
                            onChange={(e) => setEvidenceType(e.target.value)}
                        >
                            <option value="VEHICLE">Vehicle</option>
                            <option value="ID">ID Document</option>
                            <option value="WITNESS">Witness Testimony</option>
                            <option value="BIO">Biological / Medical</option>
                            <option value="MISC">Other / Misc</option>
                        </select>
                    </label>
                </div>

                {/* ─── SHARED FIELDS ─── */}
                <input 
                    className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" 
                    type="text" placeholder="Evidence Title" value={title} onChange={(e) => setTitle(e.target.value)} required 
                />
                <textarea 
                    className="p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" 
                    placeholder="Detailed Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} 
                />

                {/* ─── VEHICLE MODULE ─── */}
                {evidenceType === 'VEHICLE' && (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-400 rounded flex flex-col gap-3">
                        <h4 className="font-bold text-gray-700">Vehicle Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="p-2 border rounded" type="text" placeholder="Vehicle Model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required />
                            <input className="p-2 border rounded" type="text" placeholder="Vehicle Color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} required />
                        </div>
                        <p className="text-sm text-gray-500 text-center font-bold mt-2">Fill ONE only:</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="p-2 border rounded disabled:bg-gray-200" type="text" placeholder="Plate Number" value={plateNumber} onChange={(e) => { setPlateNumber(e.target.value); setSerialNumber(''); }} disabled={!!serialNumber} />
                            <input className="p-2 border rounded disabled:bg-gray-200" type="text" placeholder="Serial Number / VIN" value={serialNumber} onChange={(e) => { setSerialNumber(e.target.value); setPlateNumber(''); }} disabled={!!plateNumber} />
                        </div>
                    </div>
                )}

                {/* ─── ID DOCUMENT MODULE ─── */}
                {evidenceType === 'ID' && (
                    <div className="p-4 bg-blue-50 border border-dashed border-blue-400 rounded flex flex-col gap-3">
                        <h4 className="font-bold text-blue-800">ID Document Details</h4>
                        <input className="p-2 border rounded" type="text" placeholder="Owner's Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                        <p className="text-sm font-bold mt-2 text-blue-800">Document Data (Key-Value)</p>
                        {idAttributes.map((attr, index) => (
                            <div key={index} className="flex gap-2">
                                <input className="flex-1 p-2 border rounded" type="text" placeholder="Key (e.g., National ID)" value={attr.key} onChange={(e) => updateAttribute(index, 'key', e.target.value)} />
                                <input className="flex-1 p-2 border rounded" type="text" placeholder="Value" value={attr.value} onChange={(e) => updateAttribute(index, 'value', e.target.value)} />
                                {idAttributes.length > 1 && (
                                    <button type="button" onClick={() => removeAttribute(index)} className="px-3 bg-red-500 text-white rounded hover:bg-red-600">X</button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addAttribute} className="self-start text-sm text-blue-600 hover:text-blue-800 font-bold">+ Add Key-Value Pair</button>
                    </div>
                )}

                {/* ─── WITNESS MODULE ─── */}
                {evidenceType === 'WITNESS' && (
                    <div className="p-4 bg-yellow-50 border border-dashed border-yellow-500 rounded flex flex-col gap-3">
                        <h4 className="font-bold text-yellow-800">Witness Testimony</h4>
                        <textarea className="p-2 border rounded" placeholder="Written Transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} />
                        <input className="p-2 border rounded" type="url" placeholder="Media URL (Optional link)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                    </div>
                )}

                {/* ─── BIO EVIDENCE MODULE ─── */}
                {evidenceType === 'BIO' && (
                    <div className="p-4 bg-red-50 border border-dashed border-red-400 rounded flex flex-col gap-3">
                        <h4 className="font-bold text-red-800">Biological / Medical Evidence</h4>
                        <select className="p-2 border rounded bg-white" value={bioType} onChange={(e) => setBioType(e.target.value)} required>
                            <option value="BLOOD">Blood Sample</option>
                            <option value="DNA">DNA / Hair</option>
                            <option value="FINGERPRINT">Fingerprint</option>
                            <option value="OTHER">Other Biological</option>
                        </select>
                    </div>
                )}

                <button type="submit" disabled={isLoading} className="mt-4 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                    {isLoading ? 'Processing...' : 'Submit Evidence'}
                </button>
            </form>

            {statusMessage && (
                <div className={`mt-4 p-4 rounded-lg font-bold ${statusMessage.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {statusMessage}
                </div>
            )}
        </div>
    );
}