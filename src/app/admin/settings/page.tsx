"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { 
    Users, Database, Calendar, Shield, Activity, 
    Search, Fingerprint, ShieldAlert, X, Key, Loader2,
    Tags, Plus, Pencil, Trash2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
    const [me, setMe] = useState<{ id: string } | null>(null);
    const [telemetry, setTelemetry] = useState<any>(null);
    
    // Grid State
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Relationship Types State
    const [relTypes, setRelTypes] = useState<any[]>([]);
    const [showRelTypes, setShowRelTypes] = useState(false);
    const [relName, setRelName] = useState("");
    const [relColor, setRelColor] = useState("#3b82f6");
    const [creatingRel, setCreatingRel] = useState(false);

    // Provisioning Modal State
    const [provTarget, setProvTarget] = useState<any>(null);
    const [provIsAdmin, setProvIsAdmin] = useState(false);
    const [provLoading, setProvLoading] = useState(false);
    const [provCredentials, setProvCredentials] = useState<{username: string, password: string} | null>(null);

    useEffect(() => {
        fetchAPI("/users/me").then(data => setMe(data)).catch(() => { });
        fetchAPI("/admin/telemetry").then(data => setTelemetry(data)).catch(() => { });
        fetchAPI("/relationship-types").then(data => setRelTypes(data || [])).catch(() => { });
        loadGrid("");
    }, []);

    const loadGrid = (q: string) => {
        setLoading(true);
        fetchAPI(`/admin/students/grid?limit=200&search=${encodeURIComponent(q)}`)
            .then(data => {
                setStudents(data || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            loadGrid(search);
        }, 500);
        return () => clearTimeout(delay);
    }, [search]);

    // --- Cell Editing ---
    const handleCellSave = async (id: string, field: string, value: string) => {
        const original = students.find(s => s.id === id);
        if (original[field] === value) return; // no change
        
        // Optimistic update
        setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
        
        try {
            await fetchAPI(`/admin/students/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value || null })
            });
        } catch (err: any) {
            alert("GRID UPDATE FAILED: " + err.message);
            // Revert on fail
            setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: original[field] } : s));
        }
    };

    // --- Provisioning ---
    const handleProvisionUser = async () => {
        if (!provTarget) return;
        setProvLoading(true);
        try {
            const res = await fetchAPI("/admin/users/provision", {
                method: "POST",
                body: JSON.stringify({ student_id: provTarget.id, is_admin: provIsAdmin })
            });
            setProvCredentials({ username: res.username, password: res.generated_password });
            
            // Update grid with real user ID
            setStudents(prev => prev.map(s => s.id === provTarget.id ? { 
                ...s, 
                user_id: res.user_id, 
                is_admin: res.is_admin 
            } : s));
            
            fetchAPI("/admin/telemetry").then(data => setTelemetry(data));
        } catch (err: any) {
            alert("PROVISION FAILED: " + err.message);
        } finally {
            setProvLoading(false);
        }
    };

    const revokeUser = async (student: any) => {
        if (!confirm(`REVOKE ACCESS FOR ${student.trombint_id}?`)) return;
        try {
            await fetchAPI(`/admin/users/${student.user_id}`, { method: "DELETE" });
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, user_id: null, is_admin: false } : s));
            fetchAPI("/admin/telemetry").then(data => setTelemetry(data));
        } catch (err: any) {
            alert("PURGE FAILED: " + err.message);
        }
    };
    
    const toggleAdmin = async (student: any) => {
        try {
            await fetchAPI(`/admin/users/${student.user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_admin: !student.is_admin })
            });
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_admin: !student.is_admin } : s));
        } catch (err: any) {
            alert("CLEARANCE UPDATE FAILED: " + err.message);
        }
    };

    // --- Rel Types ---
    const handleCreateRelType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!relName.trim()) return;
        setCreatingRel(true);
        try {
            const newType = await fetchAPI("/admin/relationship-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: relName, color: relColor }),
            });
            setRelTypes([...relTypes, newType]);
            setRelName("");
        } finally {
            setCreatingRel(false);
        }
    };

    const deleteRelType = async (id: string) => {
        if (!confirm("PURGE VECTOR?")) return;
        try {
            await fetchAPI(`/admin/relationship-types/${id}`, { method: "DELETE" });
            setRelTypes(relTypes.filter(rt => rt.id !== id));
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    return (
        <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="animate-in fade-in slide-in-from-top-4 duration-1000 ease-out flex items-end justify-between border-b border-zinc-800/60 pb-6 relative">
                <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-red-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <div>
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="font-mono text-xs tracking-[0.3em] font-bold">SYSTEM CONTROL</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
                        Admin Dashboard
                    </h1>
                </div>
                <div className="hidden md:flex flex-col items-end text-right font-mono text-xs text-zinc-500">
                    <button 
                        onClick={() => setShowRelTypes(!showRelTypes)}
                        className="mb-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 px-3 py-1 rounded hover:bg-purple-500/20 transition flex items-center gap-2 uppercase tracking-widest"
                    >
                        <Tags className="w-3 h-3" /> Graph Vectors
                    </button>
                    <span>V 4.1.0-OSINT</span>
                    <span>LIVE EDIT: ENABLED</span>
                </div>
            </header>

            {/* TELEMETRY ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: '100ms' }}>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-blue-500/50" />
                    <Users className="w-6 h-6 text-blue-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Students</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry ? telemetry.counts.students : "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-blue-500/50" />
                    <Database className="w-6 h-6 text-emerald-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Clubs</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry ? telemetry.counts.clubs : "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-blue-500/50" />
                    <Calendar className="w-6 h-6 text-purple-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Events</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry ? telemetry.counts.events : "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-red-900/40 rounded-none p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-red-500" />
                    <Shield className="w-6 h-6 text-red-500 mb-4 opacity-50 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Users</p>
                    <p className="text-3xl font-mono font-bold text-red-400 mt-1">{telemetry ? telemetry.counts.users : "---"}</p>
                </div>
            </div>

            {/* Rel Types Modal */}
            {showRelTypes && (
                <div className="p-6 bg-purple-950/20 border border-purple-500/30 rounded-none animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <Tags className="w-4 h-4" /> Social Graph Vectors
                        </h3>
                        <button onClick={() => setShowRelTypes(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4"/></button>
                    </div>
                    <form onSubmit={handleCreateRelType} className="flex gap-2 mb-4">
                        <input type="color" value={relColor} onChange={e=>setRelColor(e.target.value)} className="w-10 h-10 bg-transparent rounded-none cursor-pointer"/>
                        <input type="text" value={relName} onChange={e=>setRelName(e.target.value)} placeholder="NEW LABEL..." className="flex-1 bg-black/50 border border-zinc-800 rounded-none px-3 font-mono text-sm uppercase text-white outline-none focus:border-purple-500" />
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-mono uppercase tracking-widest text-xs rounded-none">Add</Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                        {relTypes.map(rt => (
                            <div key={rt.id} className="flex items-center gap-2 bg-black/40 border border-zinc-800 px-3 py-1.5 rounded-none">
                                <div className="w-2 h-2 rounded-none" style={{backgroundColor: rt.color}} />
                                <span className="font-mono text-xs uppercase text-zinc-300">{rt.name}</span>
                                <button onClick={() => deleteRelType(rt.id)} className="text-red-500/50 hover:text-red-500 ml-2"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LIVE EXCEL GRID */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none shadow-2xl relative overflow-hidden flex flex-col h-[800px] animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: '200ms' }}>
                {/* Brutalist Corner Accents */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-zinc-700/50 m-2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-zinc-700/50 m-2 pointer-events-none" />
                {/* Toolbar */}
                <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-black/20">
                    <div className="relative w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="SEARCH STUDENTS..."
                            className="w-full bg-black/50 border border-zinc-800 rounded py-2 pl-9 pr-4 text-white focus:border-blue-500/50 focus:bg-black focus:shadow-[0_0_15px_rgba(59,130,246,0.1)] outline-none transition-all text-xs font-mono placeholder:text-zinc-700 uppercase tracking-widest"
                        />
                    </div>
                    {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                </div>

                {/* Grid Container */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800 w-32">ID</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800">First Name</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800">Last Name</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800">École</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em] border-b border-zinc-800">Promo</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-orange-500/70 uppercase tracking-[0.2em] border-b border-zinc-800 w-32">APT #</th>
                                <th className="py-3 px-4 text-[10px] font-bold font-mono text-blue-500/70 uppercase tracking-[0.2em] border-b border-zinc-800 w-48 text-center">Role</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 font-mono text-sm">
                            {students.map((s) => (
                                <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors group">
                                    <td className="py-2 px-4 text-zinc-500 text-xs">{s.trombint_id}</td>
                                    <td className="py-2 px-4">
                                        <EditableCell value={s.first_name} onSave={(v) => handleCellSave(s.id, 'first_name', v)} />
                                    </td>
                                    <td className="py-2 px-4">
                                        <EditableCell value={s.last_name} onSave={(v) => handleCellSave(s.id, 'last_name', v)} />
                                    </td>
                                    <td className="py-2 px-4">
                                        <EditableCell value={s.ecole} onSave={(v) => handleCellSave(s.id, 'ecole', v)} />
                                    </td>
                                    <td className="py-2 px-4">
                                        <EditableCell value={s.promo} onSave={(v) => handleCellSave(s.id, 'promo', v)} />
                                    </td>
                                    <td className="py-2 px-4">
                                        <div className="relative group/apt">
                                            <EditableCell 
                                                value={s.apartment} 
                                                onSave={(v) => handleCellSave(s.id, 'apartment', v)} 
                                                className="text-orange-400 font-bold focus:bg-orange-500/10 focus:border-orange-500/50" 
                                            />
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        {s.user_id ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => toggleAdmin(s)}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                                        s.is_admin 
                                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    {s.is_admin ? 'L4 Admin' : 'Standard'}
                                                </button>
                                                <button 
                                                    onClick={() => revokeUser(s)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all p-1"
                                                    title="Revoke Access"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setProvTarget(s);
                                                    setProvIsAdmin(false);
                                                    setProvCredentials(null);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-widest text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 px-3 py-1 rounded transition-all"
                                            >
                                                Provision
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-500 uppercase tracking-widest text-xs">
                                        No records found in grid.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PROVISIONING MODAL */}
            {provTarget && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-blue-500/30 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-3 font-mono">
                                    <Fingerprint className="w-5 h-5 text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" /> 
                                    Create User Account
                                </h2>
                                <p className="text-xs font-mono text-blue-400 mt-2">Profile: {provTarget.first_name} {provTarget.last_name}</p>
                            </div>
                            <button onClick={() => setProvTarget(null)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>

                        {!provCredentials ? (
                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-3 py-4 border-y border-zinc-800/60">
                                    <input
                                        type="checkbox"
                                        id="modal_is_admin"
                                        checked={provIsAdmin}
                                        onChange={(e) => setProvIsAdmin(e.target.checked)}
                                        className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-900 cursor-pointer"
                                    />
                                    <label htmlFor="modal_is_admin" className="text-xs tracking-widest font-mono font-medium text-zinc-400 select-none flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                        <Shield className="w-4 h-4 text-red-500/70" /> ADMINISTRATOR PERMISSIONS
                                    </label>
                                </div>

                                <Button
                                    onClick={handleProvisionUser}
                                    disabled={provLoading}
                                    className="w-full bg-blue-600/80 hover:bg-blue-500 text-white font-mono uppercase tracking-[0.2em] font-bold h-12 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all"
                                >
                                    {provLoading ? "GENERATING..." : "GENERATE SECURE KEY"}
                                </Button>
                            </div>
                        ) : (
                            <div className="p-6 bg-emerald-950/20 border border-emerald-500/30 rounded-lg animate-in zoom-in-95 duration-500 relative z-10">
                                <div className="flex items-center gap-2 text-emerald-400 mb-4 justify-center">
                                    <Key className="w-5 h-5 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                                    <span className="font-mono text-xs tracking-widest font-bold">CREDENTIALS GENERATED</span>
                                </div>
                                <div className="space-y-3 font-mono text-sm text-center">
                                    <div className="bg-black/50 p-3 rounded border border-zinc-800">
                                        <span className="text-zinc-500 mr-2">ID:</span>
                                        <span className="text-white font-bold">{provCredentials.username}</span>
                                    </div>
                                    <div className="bg-black/50 p-3 rounded border border-zinc-800">
                                        <span className="text-zinc-500 mr-2">KEY:</span>
                                        <span className="text-emerald-400 font-bold tracking-widest">{provCredentials.password}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-center text-red-400 uppercase tracking-widest mt-4">Copy key now. It is unrecoverable.</p>
                                <Button onClick={() => setProvTarget(null)} className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-mono uppercase tracking-widest text-xs">Close</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

// Inline Editable Cell Component
function EditableCell({ value, onSave, className = "" }: { value: string, onSave: (v: string) => void, className?: string }) {
    const [val, setVal] = useState(value || "");
    
    useEffect(() => {
        setVal(value || "");
    }, [value]);

    return (
        <input 
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => onSave(val)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={`w-full bg-transparent border border-transparent hover:border-zinc-800/50 focus:border-blue-500/50 focus:bg-black/30 rounded px-2 py-1 outline-none transition-all text-white placeholder-zinc-700 ${className}`}
            placeholder="---"
        />
    );
}
