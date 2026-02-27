import React, { useState, useEffect, useRef, useCallback, createRef } from 'react';
import Draggable from 'react-draggable';
import Xarrow, { Xwrapper } from 'react-xarrows';
import api from '../../utils/api';

interface DetectiveBoardProps { caseId: string; }

export default function DetectiveBoard({ caseId }: DetectiveBoardProps) {
    const [nodes, setNodes] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [isPopulating, setIsPopulating] = useState(false);
    const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);

    const boardRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Record<number, React.RefObject<HTMLDivElement>>>({});

    const fetchBoardData = useCallback(async () => {
        const cleanId = caseId.toString().replace(/\D/g, ''); 
        if (!cleanId) return;

        try {
            const [nodeRes, connRes] = await Promise.all([
                api.get(`investigation/board-nodes/?case_id=${cleanId}`),
                api.get(`investigation/board-connections/?case_id=${cleanId}`)
            ]);

            // ─── FULL INTELLIGENCE POPULATION ───
            if (nodeRes.data.length === 0 && !isPopulating) {
                setIsPopulating(true);
                
                // Fetch all data sources in parallel
                const [evRes, caseRes, intRes, tipsRes] = await Promise.all([
                    api.get(`evidence/${cleanId}/evidence/`),
                    api.get(`cases/cases/${cleanId}/`),
                    api.get(`investigation/interrogations/?case=${cleanId}`),
                    api.get(`finance/tips/?case=${cleanId}`).catch(() => ({ data: [] }))
                ]);

                const intel = [];
                // 1. Add Crime Scene Card
                intel.push({ note_text: `📍 CRIME SCENE\nLoc: ${caseRes.data.crime_scene_location}\nTime: ${new Date(caseRes.data.crime_occurred_at).toLocaleString()}`, color: "#e2e8f0" });
                
                // 2. Add Suspect Cards
                const interrogations = intRes.data.results || intRes.data;
                for (const interrogation of interrogations) {
                    const susRes = await api.get(`investigation/suspects/${interrogation.suspect}/`);
                    intel.push({ note_text: `👤 SUSPECT: ${susRes.data.alias || 'Unknown'}\nStatus: ${susRes.data.status}\nScore: ${susRes.data.cached_ranking_score}`, color: "#fee2e2" });
                }

                // 3. Add Evidence Cards
                const evidenceList = evRes.data.results || evRes.data;
                evidenceList.forEach((ev: any) => intel.push({ note_text: `[${ev.evidence_type}] ${ev.title}\n${ev.description}`, color: "#f8fafc", linked_evidence: ev.id }));

                // 4. Add Tip Cards
                const tips = tipsRes.data.results || tipsRes.data;
                tips.forEach((tip: any) => intel.push({ note_text: `💬 CITIZEN TIP #${tip.id}\n"${tip.description}"`, color: "#fef9c3" }));

                // Save to database
                const created = await Promise.all(intel.map((item, i) => 
                    api.post(`investigation/board-nodes/`, { 
                        case: cleanId, ...item, x_position: 100 + (i * 80), y_position: 100 + (i * 50) 
                    })
                ));
                setNodes(created.map(r => r.data));
                setIsPopulating(false);
            } else { setNodes(nodeRes.data); }
            
            setConnections(connRes.data);
            setIsReady(true);
        } catch (err) { console.error("Sync error"); }
    }, [caseId, isPopulating]);

    useEffect(() => { fetchBoardData(); }, [fetchBoardData]);

    const handleDragStop = async (nodeId: number, data: { x: number, y: number }) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, x_position: data.x, y_position: data.y } : n));
        try { await api.patch(`investigation/board-nodes/${nodeId}/`, { x_position: data.x, y_position: data.y }); } catch (e) {}
    };

    const toggleLink = async (nodeId: number) => {
        if (connectingFrom === null) { setConnectingFrom(nodeId); }
        else if (connectingFrom !== nodeId) {
            const existing = connections.find(c => (c.from_node === connectingFrom && c.to_node === nodeId) || (c.from_node === nodeId && c.to_node === connectingFrom));
            if (existing) await api.delete(`investigation/board-connections/${existing.id}/`);
            else await api.post(`investigation/board-connections/`, { case: caseId.replace(/\D/g, ''), from_node: connectingFrom, to_node: nodeId, color: "red" });
            fetchBoardData();
            setConnectingFrom(null);
        }
    };

    return (
        <div className="h-full w-full bg-slate-900 overflow-x-hidden overflow-y-auto flex flex-col">
            <div ref={boardRef} className="relative flex-grow overflow-auto scrollbar-none" style={{ backgroundImage: 'radial-gradient(#334155 1.5px, transparent 1.5px)', backgroundSize: '35px 35px', minWidth: '3000px', minHeight: '3000px' }}>
                {isReady && (
                    <Xwrapper>
                        {nodes.map((node) => {
                            if (!nodeRefs.current[node.id]) nodeRefs.current[node.id] = createRef<HTMLDivElement>();
                            return (
                                <Draggable key={node.id} nodeRef={nodeRefs.current[node.id]} position={{ x: node.x_position, y: node.y_position }} onStop={(e, data) => handleDragStop(node.id, data)} bounds="parent" handle=".handle">
                                    {/* ENLARGED CARDS (w-80) [cite: 13, 248] */}
                                    <div ref={nodeRefs.current[node.id]} id={`node-${node.id}`} className={`absolute w-80 p-5 shadow-2xl border-t-[10px] bg-white flex flex-col transition-all ${connectingFrom === node.id ? 'ring-8 ring-red-500 z-50 scale-110' : 'z-10'}`} style={{ borderTopColor: node.linked_evidence ? '#0f172a' : '#ca8a04' }}>
                                        <div className="handle flex justify-between items-center mb-3 cursor-move border-b-2 border-slate-100 pb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{node.linked_evidence ? `Evidence File` : 'INTEL CARD'}</span>
                                            <button onMouseDown={(e) => { e.stopPropagation(); toggleLink(node.id); }} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full text-xs shadow-md">🔗</button>
                                        </div>
                                        <textarea className="w-full bg-transparent border-none text-slate-900 text-sm font-bold focus:ring-0 resize-none h-40 p-0 leading-tight" value={node.note_text} onChange={(e) => {
                                            const newText = e.target.value;
                                            setNodes(nodes.map(n => n.id === node.id ? { ...n, note_text: newText } : n));
                                            api.patch(`investigation/board-nodes/${node.id}/`, { note_text: newText });
                                        }} onMouseDown={(e) => e.stopPropagation()} />
                                        <div className="mt-4 text-[8px] font-black text-slate-300 uppercase text-right tracking-widest">Bureau of Investigation // 2026</div>
                                    </div>
                                </Draggable>
                            );
                        })}
                        {connections.map((c) => (
                            <Xarrow key={c.id} start={`node-${c.from_node}`} end={`node-${c.to_node}`} color="rgba(185, 28, 28, 0.8)" strokeWidth={4} headSize={0} path="straight" />
                        ))}
                    </Xwrapper>
                )}
            </div>
        </div>
    );
}