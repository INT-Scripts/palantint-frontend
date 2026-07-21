"use client";
import { PALETTE } from "@/lib/colors";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPrivate, getStudentImageUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
    ArrowLeft, Users, User, Crown, CalendarDays, 
    Clock, MapPin, ExternalLink, Plus, X, Search, Check, Loader2, Edit2, Trash2
} from "lucide-react";
import { toast } from "sonner";

export default function ClubDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Modal State
    const [studentSearch, setStudentSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [role, setRole] = useState("Membre");
    const [isMandat, setIsMandat] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadClub = useCallback(() => {
        if (!id) return;
        fetchPrivate(`/clubs/${id}`)
            .then(data => {
                setClub(data);
                document.title = `${data.name}`;
            })
            .catch(err => {
                console.error("Error fetching club details", err);
                setError("Club not found.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        loadClub();
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            fetchPrivate("/users/me")
                .then(user => setIsAdmin(user.is_admin))
                .catch(() => setIsAdmin(false));
        } else {
            setIsAdmin(false);
        }
    }, [id, loadClub]);

    // Student Search Logic
    useEffect(() => {
        if (!studentSearch || studentSearch.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            setIsSearching(true);
            fetchPrivate(`/search?q=${studentSearch}`)
                .then(res => setSearchResults(res.students || []))
                .finally(() => setIsSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [studentSearch]);

    const handleAddMember = async () => {
        if (!selectedStudent || !id) return;
        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${selectedStudent.id}/clubs`, {
                method: "POST",
                body: JSON.stringify({
                    club_id: id,
                    role: role,
                    is_mandat: isMandat
                })
            });
            toast.success(`${selectedStudent.first_name} added to ${club.name}`);
            setShowAddModal(false);
            setStudentSearch("");
            setSelectedStudent(null);
            setRole("Membre");
            setIsMandat(false);
            loadClub(); // Refresh list
        } catch (err: any) {
            toast.error(err.message || "Failed to add member");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember || !id) return;
        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${editingMember.student_id}/clubs/${id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    role: role,
                    is_mandat: isMandat
                })
            });
            toast.success(`Registry entry for ${editingMember.first_name} updated`);
            setShowEditModal(false);
            setEditingMember(null);
            loadClub();
        } catch (err: any) {
            toast.error(err.message || "Failed to update member");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!editingMember || !id) return;
        if (!confirm(`Are you sure you want to remove ${editingMember.first_name} ${editingMember.last_name} from the registry?`)) return;
        
        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${editingMember.student_id}/clubs/${id}`, {
                method: "DELETE"
            });
            toast.success(`${editingMember.first_name} removed from ${club.name}`);
            setShowEditModal(false);
            setEditingMember(null);
            loadClub();
        } catch (err: any) {
            toast.error(err.message || "Failed to remove member");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (member: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingMember(member);
        setRole(member.role || "Membre");
        setIsMandat(member.is_mandat || false);
        setShowEditModal(true);
    };

    if (!loading && (error || !club)) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-mono uppercase text-xs tracking-widest">
                <div className="flex-1 flex flex-col items-center justify-center pt-20">
                    <p className="text-zinc-500">{error || "ENTITY_OFFLINE"}</p>
                    <button onClick={() => router.push("/palantint/clubs")} className="mt-4 text-orga-500 hover:text-white transition-colors border border-orga-500/30 px-4 py-2 bg-orga-500/5">Return to entities</button>
                </div>
            </div>
        );
    }
    if (!club) return <div className="min-h-screen bg-zinc-950" />;

    const mandats = club.members?.filter((m: any) => m.is_mandat) || [];
    const regularMembers = club.members?.filter((m: any) => !m.is_mandat) || [];

    const primaryColor = club.color_primary || PALETTE.orga[500]; // Fallback to orga-500

    const MemberCard = ({ member }: { member: any }) => (
        <Card
            onClick={() => router.push(`/palantint/students/${member.student_id}`)}
            className="p-0 border-zinc-800 hover:border-orga-500 transition-all cursor-pointer group flex flex-col relative overflow-hidden rounded-none bg-zinc-900/40 backdrop-blur-xl"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-orga-500 transition-colors z-10" />
            
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex items-center gap-4 p-4 border-b border-zinc-800/60 flex-1 relative">
                    {isAdmin && (
                        <button 
                            onClick={(e) => openEditModal(member, e)}
                            className="absolute top-2 right-2 p-1.5 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-orga-500 hover:border-orga-500/50 transition-all opacity-0 group-hover:opacity-100 z-20"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    )}
                    
                    <Avatar className="w-12 h-12 bg-zinc-900 shrink-0 border border-zinc-800 group-hover:border-orga-500/50 transition-all rounded-none">
                        <AvatarImage src={getStudentImageUrl(member.student_id)} alt={member.first_name} className="object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all rounded-none" />
                        <AvatarFallback className="bg-transparent rounded-none">
                            <User className="w-6 h-6 text-zinc-600 group-hover:text-orga-500 transition-colors" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-sm font-black text-white leading-tight uppercase tracking-wide truncate group-hover:text-orga-400 transition-colors">
                            {member.first_name} {member.last_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            {member.is_mandat && <Crown className="w-3 h-3 text-housing-500 shrink-0" />}
                            <p className="text-[10px] text-orga-500 font-mono tracking-widest uppercase truncate">{member.role || "MEMBER"}</p>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-2 bg-zinc-950/40 flex justify-between items-center group-hover:bg-orga-500/5 transition-colors">
                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-tight">LEVEL_{member.promo || "XX"}</span>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase truncate max-w-[100px] tracking-tight" title={member.ecole}>{member.ecole || "N/A"}</span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24 selection:bg-orga-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div 
                    className="absolute top-[10%] right-[10%] w-[30%] h-[40%] blur-[150px] rounded-none mix-blend-screen opacity-20" 
                    style={{ backgroundColor: primaryColor }}
                />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push("/palantint/clubs")}
                        className="group text-zinc-500 hover:text-zinc-100 font-mono uppercase text-[10px] tracking-widest rounded-none p-0 flex items-center transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
                        Back to Registry
                    </button>

                    {isAdmin && (
                        <Button
                            onClick={() => {
                                setSelectedStudent(null);
                                setRole("Membre");
                                setIsMandat(false);
                                setShowAddModal(true);
                            }}
                            className="text-white font-mono uppercase text-[10px] tracking-widest rounded-none h-10 px-6 transition-all border-none"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Operative
                        </Button>
                    )}
                </div>

                {/* Header Profile Card */}
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-8 mb-12 relative shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-10 rounded-none overflow-hidden">
                    {/* Top Color Bar spanning full width */}
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: primaryColor }} />
                    
                    <div className="w-32 h-32 bg-zinc-900 flex flex-shrink-0 items-center justify-center overflow-hidden border border-zinc-800 shadow-inner rounded-none relative">
                        {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-12 h-12 text-zinc-700" />
                        )}
                        <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left space-y-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mix-blend-difference">{club.name}</h1>
                            {club.type && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800">
                                    <span className="w-1.5 h-1.5" style={{ backgroundColor: primaryColor }} />
                                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                                        Type: {club.type}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-mono border-l-2 border-zinc-800 pl-6 text-left uppercase tracking-tight">
                            {club.description || "NO_MANIFESTO_DECLARED"}
                        </p>
                        
                        {club.links && club.links.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                                {club.links.map((link: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-2 bg-zinc-950 border border-zinc-800 hover:text-white transition-all flex items-center gap-2 text-zinc-500 group rounded-none"
                                        style={{ borderLeftColor: primaryColor, borderLeftWidth: '2px' }}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mandat Members */}
                {mandats.length > 0 && (
                    <section className="mb-20">
                        <div className="flex items-center gap-6 mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-white">
                                <Crown className="w-6 h-6 text-housing-500" /> Executive Council
                            </h2>
                                <div className="h-px flex-1 bg-gradient-to-r from-housing-500/20 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {mandats.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                        </div>
                    </section>
                )}

                {/* Regular Members */}
                {regularMembers.length > 0 && (
                    <section className="mb-20">
                        <div className="flex items-center gap-6 mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-white">
                                <Users className="w-6 h-6 text-zinc-500" /> Accredited Operatives
                            </h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {regularMembers.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                        </div>
                    </section>
                )}

                {club.members?.length === 0 && (
                    <div className="text-center py-24 border border-dashed border-zinc-800 bg-zinc-900/20 rounded-none">
                        <Users className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <h3 className="text-sm font-mono font-bold text-zinc-600 uppercase tracking-widest">No operatives recorded in registry</h3>
                    </div>
                )}

                {/* Events */}
                {club.events?.length > 0 && (
                    <section className="mt-20">
                        <div className="flex items-center gap-6 mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4 text-white">
                                <CalendarDays className="w-6 h-6 text-zinc-500" /> Active Operations
                            </h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {club.events.map((e: any) => {
                                const start = new Date(e.start_time);
                                const end = new Date(e.end_time);
                                return (
                                    <div key={e.id} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-6 hover:border-zinc-500 transition-all rounded-none flex flex-col gap-4 shadow-xl">
                                        <h3 className="text-lg font-black text-white uppercase tracking-wide leading-tight">{e.name}</h3>
                                        {e.description && <p className="text-xs text-zinc-500 font-mono line-clamp-2 uppercase tracking-tight">{e.description}</p>}
                                        <div className="space-y-2 pt-4 border-t border-zinc-800/60 mt-auto">
                                            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                <CalendarDays className="w-3.5 h-3.5 text-zinc-600" />
                                                {start.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                                {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} — {end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                            </div>
                                            {e.room && (
                                                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                    <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                                    ZONE_{e.room}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
            </main>

            {/* ADD MEMBER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md shadow-2xl rounded-none flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                            <div className="flex items-center gap-3">
                                <Plus className="w-5 h-5" style={{ color: primaryColor }} />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">Deploy New Operative</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Student Search */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Select Subject</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="text"
                                        placeholder="SEARCH NAME OR ID..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none h-12 pl-10 pr-4 text-xs font-mono text-white outline-none focus:border-white/20 transition-colors"
                                    />
                                    {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: primaryColor }} />}
                                </div>

                                {searchResults.length > 0 && !selectedStudent && (
                                    <div className="max-h-48 overflow-y-auto border border-zinc-800 bg-zinc-950 divide-y divide-zinc-900 custom-scrollbar">
                                        {searchResults.map(s => (
                                            <button 
                                                key={s.id}
                                                onClick={() => { setSelectedStudent(s); setStudentSearch(`${s.first_name} ${s.last_name}`); }}
                                                className="w-full p-3 text-left hover:bg-white/5 flex items-center gap-3 transition-colors group"
                                            >
                                                <Avatar className="w-8 h-8 rounded-none border border-zinc-800 grayscale group-hover:grayscale-0 transition-all">
                                                    <AvatarImage src={getStudentImageUrl(s.id)} />
                                                    <AvatarFallback className="bg-zinc-900 text-[10px]">?</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-[11px] font-bold text-white uppercase">{s.first_name} {s.last_name}</p>
                                                    <p className="text-[9px] font-mono text-zinc-500 uppercase">ID: {s.trombint_id}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Role Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Designation / Role</label>
                                    <input 
                                        type="text"
                                        placeholder="ROLE (e.g. Member, President...)"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none h-12 px-4 text-xs font-mono text-white outline-none focus:border-white/20 transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-3 py-2">
                                    <button 
                                        onClick={() => setIsMandat(!isMandat)}
                                        className={`w-5 h-5 border flex items-center justify-center transition-all ${isMandat ? 'border-transparent' : 'bg-zinc-950 border-zinc-800'}`}
                                        style={isMandat ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {isMandat && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest cursor-pointer" onClick={() => setIsMandat(!isMandat)}>Elevate to Executive Council</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
                            <Button 
                                disabled={!selectedStudent || submitting}
                                onClick={handleAddMember}
                                className="flex-1 text-white font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] border-none"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Deployment"}
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => setShowAddModal(false)}
                                className="px-6 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all"
                            >
                                Abort
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MEMBER MODAL */}
            {showEditModal && editingMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md shadow-2xl rounded-none flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                            <div className="flex items-center gap-3">
                                <Edit2 className="w-5 h-5" style={{ color: primaryColor }} />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest font-mono">Modify Roster Assignment</h3>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Member Info (Read-only) */}
                            <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800">
                                <Avatar className="w-12 h-12 rounded-none border border-zinc-800 grayscale">
                                    <AvatarImage src={getStudentImageUrl(editingMember.student_id)} />
                                    <AvatarFallback className="bg-zinc-900 text-xs">?</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-xs font-black text-white uppercase">{editingMember.first_name} {editingMember.last_name}</p>
                                    <p className="text-[10px] font-mono text-zinc-500 uppercase">Current Operative Status</p>
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">New Designation</label>
                                    <input 
                                        type="text"
                                        placeholder="ROLE (e.g. Member, President...)"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none h-12 px-4 text-xs font-mono text-white outline-none focus:border-white/20 transition-colors"
                                    />
                                </div>
                                <div className="flex items-center gap-3 py-2">
                                    <button 
                                        onClick={() => setIsMandat(!isMandat)}
                                        className={`w-5 h-5 border flex items-center justify-center transition-all ${isMandat ? 'border-transparent' : 'bg-zinc-950 border-zinc-800'}`}
                                        style={isMandat ? { backgroundColor: primaryColor } : {}}
                                    >
                                        {isMandat && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest cursor-pointer" onClick={() => setIsMandat(!isMandat)}>Maintain Executive Mandate</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <Button 
                                    disabled={submitting}
                                    onClick={handleUpdateMember}
                                    className="flex-1 text-white font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] border-none"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Registry"}
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all"
                                >
                                    Abort
                                </Button>
                            </div>
                            
                            <button 
                                onClick={handleRemoveMember}
                                disabled={submitting}
                                className="w-full py-3 flex items-center justify-center gap-2 text-[10px] font-mono text-comms-500/50 hover:text-comms-500 transition-colors uppercase tracking-widest"
                            >
                                <Trash2 className="w-3 h-3" /> Revoke Operative Credentials
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
