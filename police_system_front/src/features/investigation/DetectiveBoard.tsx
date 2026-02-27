import React, { useState, useEffect, useRef, useCallback, createRef } from 'react';
import Draggable from 'react-draggable';
import Xarrow, { Xwrapper } from 'react-xarrows';
import api from '../../utils/api';
import { toPng } from 'html-to-image';

interface DetectiveBoardProps { caseId: string; }

export default function DetectiveBoard({ caseId }: DetectiveBoardProps) {
    const [nodes, setNodes] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [isPopulating, setIsPopulating] = useState(false);
    const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [showSuspectModal, setShowSuspectModal] = useState(false);
    const [newSuspectAlias, setNewSuspectAlias] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleDeleteNode = async (nodeId: number) => {
        try {
            await api.delete(`investigation/board-nodes/${nodeId}/`);
            // Refresh the board state to remove the tile from the UI
            setNodes(nodes.filter(n => n.id !== nodeId));
        } catch (err) {
            alert("Failed to remove tile.");
        }
    };

    const addStickyNote = async () => {
        // Clean the ID just in case
        const cleanId = caseId.toString().replace(/\D/g, ''); 
        const newNode = {
            case: cleanId,
            x_position: 250, 
            y_position: 250,
            note_text: 'New Intelligence lead...' // Use note_text
        };
        try {
            const res = await api.post('investigation/board-nodes/', newNode);
            setNodes([...nodes, res.data]);
        } catch (err) {
            alert("Failed to create note.");
        }
    };

    const exportBoardToImage = async () => {
        if (!boardRef.current) return;
        
        try {
            // Hide the export button so it doesn't appear in the screenshot
            const btn = document.getElementById('screenshot-btn');
            if (btn) btn.style.display = 'none';

            // Capture the board (pixelRatio: 2 gives high resolution)
            const dataUrl = await toPng(boardRef.current, {
                backgroundColor: '#0f172a', // matches your slate-900 background
                pixelRatio: 2,
            });

            // Bring the button back
            if (btn) btn.style.display = 'flex';

            // Trigger the download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `Case_${caseId.replace(/\D/g, '')}_Investigation_Board.png`;
            link.click();
            
        } catch (err) {
            console.error("Screenshot failed:", err);
            alert("❌ Failed to export board.");
        }
    };


    const handleAddSuspect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSuspectAlias.trim()) return;
        setIsSubmitting(true);

        const cleanId = caseId.toString().replace(/\D/g, ''); 

        try {
            // 1. Create the Suspect in the database (defaults to UNDER_SURVEILLANCE)
            const susRes = await api.post('investigation/suspects/', {
                alias: newSuspectAlias
            });
            const newSuspect = susRes.data;

            // 2. Link them to the Case (This "Announces" them to the Sergeant)
            await api.post('investigation/interrogations/', {
                case: cleanId,
                suspect: newSuspect.id
            });

            // 3. Create a Board Node so it instantly drops onto the corkboard
            await api.post('investigation/board-nodes/', {
                case: cleanId,
                note_text: `👤 PROPOSED SUSPECT: ${newSuspect.alias}\nStatus: ${newSuspect.status}\nPending Sergeant Approval`,
                color: "#fee2e2", // Light red color for suspects
                x_position: 200, // Drops it near the top left
                y_position: 200
            });

            alert(`✅ Suspect "${newSuspect.alias}" identified and forwarded to Sergeant for review.`);
            
            // Close modal and refresh board
            setShowSuspectModal(false);
            setNewSuspectAlias('');
            fetchBoardData(); // Refresh the board to show the new node

        } catch (err: any) {
            console.error("Failed to add suspect:", err);
            alert("❌ Error: " + JSON.stringify(err.response?.data || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full w-full bg-slate-900 overflow-x-hidden overflow-y-auto flex flex-col">
            
            <div className="absolute top-6 right-6 z-[1000] flex space-x-2">
                <button 
                    onClick={() => setShowSuspectModal(true)}
                    className="bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded font-black text-xs uppercase shadow-2xl border-2 border-red-500/50 transition-colors flex items-center gap-2"
                >
                    ➕ Add Suspect
                </button>
                <button 
                    onClick={addStickyNote}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded font-black text-xs uppercase shadow-2xl border-2 border-slate-500/50 transition-colors flex items-center gap-2"
                >
                    📝 Add  Note
                </button>
                <button 
                    id="screenshot-btn"
                    onClick={exportBoardToImage}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded font-black text-xs uppercase shadow-2xl border-2 border-amber-400/50 transition-colors flex items-center gap-2"
                >
                    📸 Export Board
                </button>
            </div>

            
            <div ref={boardRef} className="relative flex-grow scrollbar-none" style={{ backgroundImage: 'radial-gradient(#334155 1.5px, transparent 1.5px)', backgroundSize: '35px 35px', minWidth: '1000px', minHeight: '1000px' }}>
                {isReady && (
                    <Xwrapper>
                        {nodes.map((node) => {
                            if (!nodeRefs.current[node.id]) nodeRefs.current[node.id] = createRef<HTMLDivElement>();
                            return (
                                <Draggable key={node.id} nodeRef={nodeRefs.current[node.id]} position={{ x: node.x_position, y: node.y_position }} onStop={(e, data) => handleDragStop(node.id, data)} bounds="parent" handle=".handle">
                                    {/* ENLARGED CARDS (w-80) */}
                                    <div ref={nodeRefs.current[node.id]} id={`node-${node.id}`} className={`absolute w-80 p-5 shadow-2xl border-t-[10px] bg-white flex flex-col transition-all ${connectingFrom === node.id ? 'ring-8 ring-red-500 z-50 scale-110' : 'z-10'}`} style={{ borderTopColor: node.linked_evidence ? '#0f172a' : '#ca8a04' }}>
                                    <div className="handle flex justify-between items-center mb-3 cursor-move border-b-2 border-slate-100 pb-2">
                                        {/* Label on the left */}
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {node.linked_evidence ? `Evidence File` : 'INTEL CARD'}
                                        </span>

                                        {/* Action buttons in a tight column on the right */}
                                        <div className="flex flex-col gap-1 items-center">
                                            {/* Link Button */}
                                            <button 
                                                onMouseDown={(e) => { e.stopPropagation(); toggleLink(node.id); }} 
                                                className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full text-xs shadow-md transition-all active:scale-95"
                                                title="Link to another card"
                                            >
                                                🔗
                                            </button>

                                            {/* Delete Button */}
                                            <button 
                                                onMouseDown={(e) => { 
                                                    e.stopPropagation(); 
                                                    if(window.confirm("Remove this item from the board?")) handleDeleteNode(node.id); 
                                                }} 
                                                className="bg-slate-200 hover:bg-red-100 text-slate-400 hover:text-red-600 p-2 rounded-full text-xs shadow-md transition-colors active:scale-95"
                                                title="Delete Lead"
                                            >
                                                🗑️
                                            </button>
                                        </div>
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
            {showSuspectModal && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleAddSuspect} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-8 border-red-700 animate-in zoom-in-95 duration-200">
                        <h3 className="font-black text-slate-900 uppercase text-2xl mb-2 tracking-tighter">Identify New Suspect</h3>
                        <p className="text-xs font-bold text-slate-500 mb-6">
                            This will create a new suspect profile and immediately notify the Precinct Sergeant for arrest authorization.
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                                Suspect Alias / Known Name
                            </label>
                            <input 
                                type="text" 
                                required
                                autoFocus
                                value={newSuspectAlias}
                                onChange={(e) => setNewSuspectAlias(e.target.value)}
                                placeholder="e.g., The Phantom, or John Doe..."
                                className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded font-bold text-slate-900 outline-none focus:border-red-500 transition-colors"
                            />
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="flex-grow bg-red-700 disabled:bg-red-400 text-white py-3 rounded font-black text-xs uppercase shadow-md hover:bg-red-600 transition-colors"
                            >
                                {isSubmitting ? 'Processing...' : 'Submit to Sergeant'}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowSuspectModal(false)} 
                                className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded font-bold text-xs uppercase transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}