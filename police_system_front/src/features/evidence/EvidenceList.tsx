import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import SkeletonLoader from '../../components/common/SkeletonLoader';

interface EvidenceListProps {
    caseId: string;
}

export default function EvidenceList({ caseId }: EvidenceListProps) {
    const [evidence, setEvidence] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
                        </tr>
                    ))}
                    {evidence.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-10 text-center text-slate-400">No evidence found for this case.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}