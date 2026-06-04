"use client";
import { PALETTE } from "@/lib/colors";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { 
    Users, Database, Calendar, Shield, Activity, 
    Search, Fingerprint, ShieldAlert, X, Key,
    Tags, Plus, Pencil, Trash2, Check, Map, Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/ui/SearchBar";
import Link from "next/link";

export default function AdminDashboardPage() {
    const [me, setMe] = useState<{ id: string } | null>(null);
    const [telemetry, setTelemetry] = useState<any>(null);
    
    // Grid State
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    
    // Relationship Types State
    const [relTypes, setRelTypes] = useState<any[]>([]);
    const [relName, setRelName] = useState("");
    const [relColor, setRelColor] = useState(PALETTE.student[500]);
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

    const handleCellSave = async (id: string, field: string, value: string) => {
        const original = students.find(s => s.id === id);
        if (original[field] === value) return;
        setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
        try {
            await fetchAPI(`/admin/students/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ [field]: value || null })
            });
        } catch (err: any) {
            setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: original[field] } : s));
        }
    };

    const handleProvisionUser = async () => {
        if (!provTarget) return;
        setProvLoading(true);
        try {
            const res = await fetchAPI("/admin/users/provision", {
                method: "POST",
                body: JSON.stringify({ student_id: provTarget.id, is_admin: provIsAdmin })
            });
            setProvCredentials({ username: res.username, password: res.generated_password });
            setStudents(prev => prev.map(s => s.id === provTarget.id ? { ...s, user_id: res.user_id, is_admin: res.is_admin } : s));
            fetchAPI("/admin/telemetry").then(data => setTelemetry(data));
        } finally {
            setProvLoading(false);
        }
    };

    const revokeUser = async (student: any) => {
        if (!confirm(`Revoke access for ${student.trombint_id}?`)) return;
        try {
            await fetchAPI(`/admin/users/${student.user_id}`, { method: "DELETE" });
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, user_id: null, is_admin: false } : s));
            fetchAPI("/admin/telemetry").then(data => setTelemetry(data));
        } catch (err: any) { alert(err.message); }
    };
    
    const toggleAdmin = async (student: any) => {
        try {
            await fetchAPI(`/admin/users/${student.user_id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_admin: !student.is_admin })
            });
            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_admin: !student.is_admin } : s));
        } catch (err: any) { alert(err.message); }
    };

    const deleteRelType = async (id: string) => {
        if (!confirm("Delete this relationship type?")) return;
        try {
            await fetchAPI(`/admin/relationship-types/${id}`, { method: "DELETE" });
            setRelTypes(prev => prev.filter(rt => rt.id !== id));
        } catch (err: any) { alert(err.message); }
    };

    const handleCreateRelType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!relName.trim()) return;
        setCreatingRel(true);
        try {
            const newType = await fetchAPI("/admin/relationship-types", {
                method: "POST",
                body: JSON.stringify({ name: relName, color: relColor }),
            });
            setRelTypes([...relTypes, newType]);
            setRelName("");
        } finally { setCreatingRel(false); }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <header className="flex items-end justify-between border-b border-zinc-800/60 pb-6 relative">
                <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-comms-500 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <div>
                    <div className="flex items-center gap-2 text-comms-500 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="font-mono text-xs tracking-[0.3em] font-bold">SYSTEM CONTROL</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
                        Admin <span className="text-zinc-700">Dashboard</span>
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/admin/maps">
                        <Button variant="outline" className="bg-housing-500/5 border-housing-500/30 text-housing-400 hover:bg-housing-500/10 hover:border-housing-500 hover:text-housing-300 font-mono text-[10px] uppercase tracking-widest h-10 px-6 group rounded-none">
                            <Compass className="w-3.5 h-3.5 mr-2 group-hover:rotate-90 transition-transform duration-500" /> Map Alignment Tool
                        </Button>
                    </Link>
                </div>
            </header>

            {/* TELEMETRY ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 relative overflow-hidden group rounded-none">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-student-500/50" />
                    <Users className="w-6 h-6 text-student-500 mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Population</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry?.counts.students || "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 relative overflow-hidden group rounded-none">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-orga-500/50" />
                    <Database className="w-6 h-6 text-orga-500 mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Associations</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry?.counts.clubs || "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 relative overflow-hidden group rounded-none">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-housing-500/50" />
                    <Map className="w-6 h-6 text-housing-500 mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Map Assets</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">32</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 relative overflow-hidden group rounded-none">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-student-500/50" />
                    <Calendar className="w-6 h-6 text-student-500 mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Live Events</p>
                    <p className="text-3xl font-mono font-bold text-white mt-1">{telemetry?.counts.events || "---"}</p>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-comms-900/40 p-6 relative overflow-hidden group rounded-none">
                    <div className="absolute top-0 left-0 w-1 h-8 bg-comms-500" />
                    <Shield className="w-6 h-6 text-comms-500 mb-4 opacity-50 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Privileged</p>
                    <p className="text-3xl font-mono font-bold text-comms-400 mt-1">{telemetry?.counts.users || "---"}</p>
                </div>
            </div>

            {/* Config Panels - Always Visible */}
            <div className="p-8 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-mono text-white uppercase tracking-widest flex items-center gap-3">
                        <Tags className="w-5 h-5 text-student-500" /> Relationship Label Configuration
                    </h3>
                </div>
                <form onSubmit={handleCreateRelType} className="flex gap-3 mb-6">
                    <input type="color" value={relColor} onChange={e=>setRelColor(e.target.value)} className="w-12 h-12 bg-transparent rounded-none cursor-pointer border border-zinc-800"/>
                    <input type="text" value={relName} onChange={e=>setRelName(e.target.value)} placeholder="New relationship label name..." className="flex-1 bg-black/50 border border-zinc-800 rounded-none px-4 font-mono text-xs uppercase text-white outline-none focus:border-student-500 transition-all" />
                    <Button type="submit" className="bg-student-600 hover:bg-student-500 text-white font-mono uppercase tracking-[0.2em] text-[10px] px-8 rounded-none h-12 border border-student-400/30 shadow-none">Add Type</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                    {relTypes.map(rt => (
                        <div key={rt.id} className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 px-4 py-2 group rounded-none">
                            <div className="w-2.5 h-2.5 shadow-lg" style={{backgroundColor: rt.color}} />
                            <span className="font-mono text-[10px] uppercase text-zinc-300 tracking-wider font-bold">{rt.name}</span>
                            <button onClick={() => deleteRelType(rt.id)} className="text-zinc-700 hover:text-comms-500 ml-2 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* LIVE EXCEL GRID */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none shadow-2xl relative overflow-hidden flex flex-col h-[850px]">
                <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between bg-black/30 backdrop-blur-2xl">
                    <div className="w-[450px]">
                        <SearchBar
                            id="admin-search-input"
                            placeholder="SEARCH SYSTEM RECORDS..."
                            value={search}
                            onChange={setSearch}
                            className="h-12"
                            inputClassName="h-12 text-xs"
                            accentColorClass="group-focus-within:bg-comms-500"
                        />
                    </div>
                    <div className="flex items-center gap-4 text-zinc-500 font-mono text-[9px] uppercase tracking-widest">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-housing-500/50" /> Residential</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-student-500/50" /> Identity</div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative rounded-none">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800">
                            <tr>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em] w-32">Identifiant</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">First Name</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Last Name</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">School</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-zinc-500 uppercase tracking-[0.2em]">Promo</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-housing-500 uppercase tracking-[0.2em] w-32">Apartment</th>
                                <th className="py-4 px-6 text-[10px] font-black font-mono text-student-500 uppercase tracking-[0.2em] w-48 text-center">Access Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40 font-mono text-xs">
                            {students.map((s) => (
                                <tr key={s.id} className="hover:bg-zinc-800/30 transition-all group">
                                    <td className="py-3 px-6 text-zinc-600 font-bold">{s.trombint_id}</td>
                                    <td className="py-3 px-6"><EditableCell value={s.first_name} onSave={(v) => handleCellSave(s.id, 'first_name', v)} /></td>
                                    <td className="py-3 px-6"><EditableCell value={s.last_name} onSave={(v) => handleCellSave(s.id, 'last_name', v)} /></td>
                                    <td className="py-3 px-6"><EditableCell value={s.ecole} onSave={(v) => handleCellSave(s.id, 'ecole', v)} /></td>
                                    <td className="py-3 px-6"><EditableCell value={s.promo} onSave={(v) => handleCellSave(s.id, 'promo', v)} /></td>
                                    <td className="py-3 px-6">
                                        <EditableCell 
                                            value={s.apartment} 
                                            onSave={(v) => handleCellSave(s.id, 'apartment', v)} 
                                            className="text-housing-400 font-black focus:bg-housing-500/10 focus:border-housing-500/50" 
                                        />
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        {s.user_id ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => toggleAdmin(s)} className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all rounded-none ${s.is_admin ? 'bg-comms-500/10 border-comms-500/40 text-comms-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-white'}`}>{s.is_admin ? 'L4 Admin' : 'Standard'}</button>
                                                <button onClick={() => revokeUser(s)} className="opacity-0 group-hover:opacity-100 text-comms-500/40 hover:text-comms-500 transition-all p-1"><X className="w-3.5 h-3.5" /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setProvTarget(s); setProvIsAdmin(false); setProvCredentials(null); }} className="opacity-0 group-hover:opacity-100 text-[9px] font-black uppercase tracking-[0.2em] text-student-400 border border-student-500/30 hover:bg-student-500/10 px-4 py-1.5 rounded-none transition-all">Provision</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PROVISIONING MODAL */}
            {provTarget && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-student-500/20 rounded-none p-10 max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden border-t-student-500">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-student-500/5 rounded-full blur-[80px] pointer-events-none" />
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-4 font-mono">
                                    <Fingerprint className="w-6 h-6 text-student-500" /> Account Provisioning
                                </h2>
                                <p className="text-[10px] font-mono text-zinc-500 mt-2 uppercase tracking-[0.2em]">Target: {provTarget.first_name} {provTarget.last_name}</p>
                            </div>
                            <button onClick={() => setProvTarget(null)} className="text-zinc-700 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                        </div>
                        {!provCredentials ? (
                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center gap-4 py-6 border-y border-zinc-900">
                                    <input type="checkbox" id="modal_is_admin" checked={provIsAdmin} onChange={(e) => setProvIsAdmin(e.target.checked)} className="w-5 h-5 bg-zinc-950 border-zinc-800 text-comms-600 focus:ring-0 rounded-none cursor-pointer" />
                                    <label htmlFor="modal_is_admin" className="text-[10px] tracking-[0.2em] font-mono font-black text-zinc-500 select-none flex items-center gap-3 cursor-pointer hover:text-comms-400 transition-colors uppercase"><Shield className="w-4 h-4 text-comms-500/50" /> Administrator Privileges</label>
                                </div>
                                <Button onClick={handleProvisionUser} disabled={provLoading} className="w-full bg-student-600 hover:bg-student-500 text-white font-mono uppercase tracking-[0.3em] font-black h-14 rounded-none border border-student-400/30 shadow-none transition-all">{provLoading ? "Synchronizing..." : "Generate Access Key"}</Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-orga-950/10 border border-orga-500/20 rounded-none text-center">
                                    <p className="text-[9px] font-mono text-orga-500/70 uppercase tracking-widest mb-4">Secure Identity Generated</p>
                                    <div className="space-y-2">
                                        <div className="bg-black/60 p-4 border border-zinc-900 font-mono rounded-none">
                                            <p className="text-[8px] text-zinc-600 mb-1">USERNAME</p>
                                            <p className="text-white text-lg font-bold">{provCredentials.username}</p>
                                        </div>
                                        <div className="bg-black/60 p-4 border border-zinc-900 font-mono rounded-none">
                                            <p className="text-[8px] text-zinc-600 mb-1">TEMPORARY KEY</p>
                                            <p className="text-orga-400 text-lg font-black tracking-widest">{provCredentials.password}</p>
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={() => setProvTarget(null)} className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white font-mono uppercase tracking-widest text-[10px] rounded-none">Close Session</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EditableCell({ value, onSave, className = "" }: { value: string, onSave: (v: string) => void, className?: string }) {
    const [val, setVal] = useState(value || "");
    useEffect(() => { setVal(value || ""); }, [value]);
    return (
        <input 
            type="text" value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => onSave(val)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={`w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-comms-500/30 focus:bg-zinc-950 px-2 py-1 outline-none transition-all text-zinc-300 placeholder-zinc-800 font-mono rounded-none ${className}`}
            placeholder="..."
        />
    );
}
