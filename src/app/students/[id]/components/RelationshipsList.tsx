"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { Share2, Plus, X, Check, Loader2, Trash2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RelationshipsList({ studentId }: { studentId: string }) {
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
        fetchAPI(`/students/${studentId}/relationships`)
            .then(data => setRels(data || []))
            .catch(() => setRels([]))
            .finally(() => setLoading(false));
    }, [studentId]);

    const openAddForm = async () => {
        setShowAdd(true);
        if (relTypes.length === 0) {
            try {
                const types = await fetchAPI("/relationship-types");
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
                const results = await fetchAPI(`/students?q=${encodeURIComponent(q)}&limit=8`);
                // Filter out the current student
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
            await fetchAPI("/relationships", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_a_id: studentId,
                    student_b_id: selectedStudent.id,
                    relationship_type_id: selectedType,
                }),
            });
            // Re-fetch relationships
            const updated = await fetchAPI(`/students/${studentId}/relationships`);
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
            await fetchAPI(`/relationships/${relId}`, { method: "DELETE" });
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
                    <div className="w-2 h-2 bg-emerald-500 animate-pulse" />
                    <h3 className="text-xl font-black text-white uppercase tracking-widest font-mono">
                        Network Links
                    </h3>
                </div>
                <button
                    onClick={() => showAdd ? setShowAdd(false) : openAddForm()}
                    className="p-1 px-3 bg-zinc-900 border border-zinc-700 text-emerald-400 font-mono font-bold hover:bg-emerald-500/10 hover:text-white hover:border-emerald-500 transition-colors uppercase tracking-widest text-xs"
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
                        <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Initialize Link Protocol</span>
                    </div>

                    {/* Student Search */}
                    <div className="relative z-20">
                        <div className="flex items-center gap-3 bg-zinc-950/50 border border-zinc-700/50 px-3 py-2 transition-colors focus-within:border-emerald-500">
                            <Search className="w-4 h-4 text-emerald-500/50" />
                            <input
                                type="text"
                                placeholder="Query Target Database..."
                                value={searchQuery}
                                onChange={e => searchStudents(e.target.value)}
                                className="flex-1 bg-transparent text-xs font-mono text-white placeholder-zinc-600 outline-none uppercase tracking-wider"
                            />
                        </div>
                        {/* Search results dropdown */}
                        {searchResults.length > 0 && !selectedStudent && (
                            <div className="absolute mt-1 w-full bg-zinc-950 border border-emerald-500/50 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar border-t-0 z-30">
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
                                        <div className="w-8 h-8 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:border-emerald-500 transition-colors overflow-hidden bg-zinc-900">
                                            <img
                                                src={`${apiUrl}/students/${s.id}/image`}
                                                alt=""
                                                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                                onError={(e: any) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors">{s.first_name} {s.last_name}</p>
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
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30">
                                <div className="w-8 h-8 flex items-center justify-center shrink-0 border border-emerald-500/50 overflow-hidden bg-zinc-900">
                                    <img
                                        src={`${apiUrl}/students/${selectedStudent.id}/image`}
                                        alt="" className="w-full h-full object-cover"
                                        onError={(e: any) => { e.target.style.display = 'none'; }}
                                    />
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="text-[10px] font-mono text-emerald-500/70 uppercase tracking-widest">Target Locked</span>
                                    <span className="text-xs text-emerald-400 font-black uppercase tracking-wider">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                                </div>
                                <button onClick={() => { setSelectedStudent(null); setSearchQuery(""); }} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {/* Relationship type */}
                            {relTypes.length > 0 ? (
                                <select
                                    value={selectedType}
                                    onChange={e => setSelectedType(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-700/50 px-3 py-3 text-xs font-mono uppercase tracking-widest text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                                >
                                    <option value="" disabled>-- SELECT CLEARENCE TYPE --</option>
                                    {relTypes.map((rt: any) => (
                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-[10px] text-red-500 uppercase font-mono tracking-widest p-2 border border-red-500/20 bg-red-500/5">ERROR: CLASSIFICATION SCHEMAS MISSING. CONTACT INTEL ADMIN.</p>
                            )}
                            
                            {/* Submit */}
                            <button
                                onClick={addConnection}
                                disabled={addLoading || !selectedStudent || !selectedType}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-black uppercase tracking-widest py-3 flex items-center justify-center gap-2 transition-colors mt-2"
                            >
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                BIND ENTITIES
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Existing Relationships */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-500 animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Scanning Network Graph...</span>
                </div>
            ) : rels.length === 0 && !showAdd ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 py-16 border border-zinc-800/50 bg-zinc-950/30">
                    <div className="w-16 h-16 border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                        <Share2 className="w-8 h-8 text-emerald-500/50" />
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
                            className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-emerald-500/50 group cursor-pointer transition-colors relative overflow-hidden"
                            onClick={() => router.push(`/students/${rel.other_student.id}`)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 group-hover:bg-emerald-500 transition-colors" />
                            
                            <div className="w-12 h-12 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:border-emerald-500/50 overflow-hidden bg-zinc-950 relative z-10 ml-2">
                                <img
                                    src={`${apiUrl}/students/${rel.other_student.id}/image`}
                                    alt="" className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                                    onError={(e: any) => { e.target.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 border border-zinc-500/20 mix-blend-overlay pointer-events-none" />
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-black text-white uppercase tracking-wider truncate mb-1 group-hover:text-emerald-400 transition-colors">
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
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-2 transition-all mr-2"
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
