"use client";

import { useEffect, useState } from "react";
import { fetchPrivate, getStudentImageUrl } from "@/lib/api";
import { Share2, Plus, X, Check, Trash2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface RelationshipsListProps {
    studentId: string;
    themeColor: string;
}

export default function RelationshipsList({ studentId, themeColor }: RelationshipsListProps) {
    const [rels, setRels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Add connection form
    const [showAdd, setShowAdd] = useState(false);
    const [relTypes, setRelTypes] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedType, setSelectedType] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<any>(null);

    useEffect(() => {
        fetchPrivate(`/students/${studentId}/relationships`)
            .then(data => setRels(data || []))
            .catch(() => setRels([]))
            .finally(() => setLoading(false));
    }, [studentId]);

    const openAddForm = async () => {
        setShowAdd(true);
        if (relTypes.length === 0) {
            try {
                const types = await fetchPrivate("/relationship-types");
                setRelTypes(types || []);
                if (types?.length > 0) setSelectedType(types[0].id);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const searchStudents = (q: string) => {
        setSearchQuery(q);
        setSelectedStudent(null);
        if (searchTimeout) clearTimeout(searchTimeout);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const results = await fetchPrivate(`/students?q=${encodeURIComponent(q)}&limit=8`);
                setSearchResults((results || []).filter((s: any) => s.id !== studentId));
            } catch (e) {
                console.error(e);
            }
        }, 300);
        setSearchTimeout(t);
    };

    const addConnection = async () => {
        if (!selectedStudent || !selectedType) return;
        setAddLoading(true);
        try {
            await fetchPrivate("/relationships", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_a_id: studentId,
                    student_b_id: selectedStudent.id,
                    relationship_type_id: selectedType,
                }),
            });
            const updated = await fetchPrivate(`/students/${studentId}/relationships`);
            setRels(updated || []);
            setShowAdd(false);
            setSearchQuery("");
            setSearchResults([]);
            setSelectedStudent(null);
        } catch (e) {
            console.error(e);
        } finally {
            setAddLoading(false);
        }
    };

    const removeConnection = async (relId: string) => {
        try {
            await fetchPrivate(`/relationships/${relId}`, { method: "DELETE" });
            setRels(rels.filter(r => r.id !== relId));
        } catch (e) {
            console.error(e);
        }
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

    return (
        <div className="h-full flex flex-col pt-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: themeColor }} />
                    <h3 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Connections
                    </h3>
                </div>
                <button
                    onClick={() => showAdd ? setShowAdd(false) : openAddForm()}
                    className="p-1 px-3 bg-zinc-900 border font-mono font-bold hover:text-white transition-colors uppercase tracking-widest text-xs"
                    style={{ borderColor: `${themeColor}80`, color: themeColor }}
                >
                    {showAdd ? "Abort" : "+ Establish Link"}
                </button>
            </div>

            {/* Add Connection Form */}
            {showAdd && (
                <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] space-y-4 relative">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 m-2 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 m-2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 m-2 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 m-2 pointer-events-none" />
                    
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 animate-pulse" style={{ backgroundColor: themeColor }} />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Add New Relationship</span>
                    </div>

                    {/* Student Search */}
                    <div className="relative z-20">
                        <div className="flex items-center gap-3 bg-zinc-950/50 border px-3 py-2 transition-colors focus-within:border-white" style={{ borderColor: `${themeColor}40` }}>
                            <Search className="w-4 h-4" style={{ color: `${themeColor}80` }} />
                            <input
                                type="text"
                                placeholder="Search Student Database..."
                                value={searchQuery}
                                onChange={e => searchStudents(e.target.value)}
                                className="flex-1 bg-transparent text-xs font-mono text-white placeholder-zinc-600 outline-none uppercase tracking-wider"
                            />
                        </div>
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="absolute mt-1 w-full bg-zinc-950 border shadow-2xl max-h-48 overflow-y-auto custom-scrollbar border-t-0 z-30" style={{ borderColor: `${themeColor}80` }}>
                                {searchResults.map((s: any) => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            setSelectedStudent(s);
                                            setSearchQuery(`${s.first_name} ${s.last_name}`);
                                            setSearchResults([]);
                                        }}
                                        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-zinc-900 transition-colors border-b border-zinc-800/50 last:border-0 group"
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:border-white transition-colors overflow-hidden bg-zinc-900" style={{ groupHover: { borderColor: themeColor } } as any}>
                                            <img
                                                src={getStudentImageUrl(s.id)}
                                                alt=""
                                                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                                onError={(e: any) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-white transition-colors" style={{ groupHover: { color: themeColor } } as any}>{s.first_name} {s.last_name}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono tracking-widest">ID: {s.trombint_id || "UNKNOWN"}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected student badge */}
                    {selectedStudent && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 p-3 bg-zinc-950 border" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}40` }}>
                                <div className="w-8 h-8 flex items-center justify-center shrink-0 border overflow-hidden bg-zinc-900" style={{ borderColor: `${themeColor}60` }}>
                                    <img
                                        src={getStudentImageUrl(selectedStudent.id)}
                                        alt="" className="w-full h-full object-cover"
                                        onError={(e: any) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: `${themeColor}80` }}>Student Selected</span>
                                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: themeColor }}>{selectedStudent.first_name} {selectedStudent.last_name}</span>
                                </div>
                                <button onClick={() => { setSelectedStudent(null); setSearchQuery(""); }} className="p-2 text-zinc-500 hover:text-comms-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Relationship type */}
                            {relTypes.length > 0 ? (
                                <select
                                    value={selectedType}
                                    onChange={e => setSelectedType(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-3 text-xs font-mono uppercase tracking-widest text-white outline-none transition-colors cursor-pointer focus:border-white"
                                    style={{ focusWithin: { borderColor: themeColor } } as any}
                                >
                                    <option value="" disabled>-- SELECT CLEARANCE TYPE --</option>
                                    {relTypes.map((rt: any) => (
                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-[10px] text-comms-500 uppercase font-mono tracking-widest p-2 border border-comms-500/20 bg-comms-500/5">ERROR: CATEGORIES MISSING. CONTACT ADMIN.</p>
                            )}
                            
                            <button
                                onClick={addConnection}
                                disabled={addLoading || !selectedStudent || !selectedType}
                                className="w-full text-white text-xs font-black uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors mt-2"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Check className="w-4 h-4" />
                                BIND ENTITIES
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Existing Relationships */}
            {rels.length === 0 && !showAdd ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 border border-zinc-800/50 bg-zinc-950/30">
                    <div className="w-16 h-16 border flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]" style={{ borderColor: `${themeColor}30`, backgroundColor: `${themeColor}05` }}>
                        <Share2 className="w-8 h-8 opacity-50" style={{ color: themeColor }} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Graph Empty</h3>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase max-w-sm">No mapped connections detected for this entity. Establish link to expand network.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rels.map((rel: any) => (
                        <div
                            key={rel.id}
                            className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 group cursor-pointer transition-colors relative overflow-hidden"
                            onClick={() => router.push(`/palantint/students/${rel.other_student.id}`)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 group-hover:bg-network-500 transition-colors" style={{ groupHover: { backgroundColor: themeColor } } as any} />
                            
                            <div className="w-12 h-12 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:border-network-500/50 overflow-hidden bg-zinc-950 relative z-10 ml-2" style={{ groupHover: { borderColor: themeColor } } as any}>
                                <img
                                    src={getStudentImageUrl(rel.other_student.id)}
                                    alt="" className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                                    onError={(e: any) => { e.target.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 border border-zinc-500/20 mix-blend-overlay pointer-events-none" />
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-black text-white uppercase tracking-wider truncate mb-1 group-hover:text-network-400 transition-colors" style={{ groupHover: { color: themeColor } } as any}>
                                    {rel.other_student.first_name} {rel.other_student.last_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 max-w-full">
                                    <div className="w-2 h-2 shrink-0 border border-zinc-600 flex items-center justify-center p-0.5">
                                        <div className="w-full h-full" style={{ backgroundColor: rel.relationship_type.color }} />
                                    </div>
                                    <p className="text-[10px] font-mono tracking-widest uppercase truncate border-l border-zinc-700 pl-2 text-zinc-400">
                                        {rel.relationship_type.name}
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={e => { e.stopPropagation(); removeConnection(rel.id); }}
                                className="opacity-0 group-hover:opacity-100 text-comms-500 hover:bg-comms-500/10 p-2 transition-all mr-2"
                                title="Sever Link"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
