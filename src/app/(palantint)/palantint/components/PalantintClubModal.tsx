"use client";
import { PALETTE } from "@/lib/colors";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchPrivate, getStudentImageUrl } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Users, User, Crown, CalendarDays,
    Clock, MapPin, ExternalLink, Plus, X, Search, Check, Loader2, Edit2, Trash2
} from "lucide-react";
import { toast } from "sonner";

interface PalantintClubModalProps {
    clubId: string | null;
    onClose: () => void;
}

// Reusable club-detail overlay for the private (palantint) space — importable
// anywhere a club needs to be surfaced (clubs registry, foyer directory, ...)
// instead of navigating to a dedicated page.
export default function PalantintClubModal({ clubId, onClose }: PalantintClubModalProps) {
    const router = useRouter();
    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [studentSearch, setStudentSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [role, setRole] = useState("Membre");
    const [isMandat, setIsMandat] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const loadClub = useCallback(() => {
        if (!clubId) return;
        setLoading(true);
        fetchPrivate(`/clubs/${clubId}`)
            .then((data) => setClub(data))
            .catch((err) => {
                console.error("Error fetching club details", err);
                setError("Club not found.");
            })
            .finally(() => setLoading(false));
    }, [clubId]);

    useEffect(() => {
        if (!clubId) return;
        setClub(null);
        setError("");
        loadClub();
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            fetchPrivate("/users/me")
                .then((user) => setIsAdmin(user.is_admin))
                .catch(() => setIsAdmin(false));
        } else {
            setIsAdmin(false);
        }
    }, [clubId, loadClub]);

    useEffect(() => {
        if (!studentSearch || studentSearch.length < 2) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            setIsSearching(true);
            fetchPrivate(`/search?q=${studentSearch}`)
                .then((res) => setSearchResults(res.students || []))
                .finally(() => setIsSearching(false));
        }, 300);
        return () => clearTimeout(timer);
    }, [studentSearch]);

    if (!clubId) return null;

    const handleAddMember = async () => {
        if (!selectedStudent || !clubId) return;
        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${selectedStudent.id}/clubs`, {
                method: "POST",
                body: JSON.stringify({ club_id: clubId, role, is_mandat: isMandat }),
            });
            toast.success(`${selectedStudent.first_name} added to ${club.name}`);
            setShowAddModal(false);
            setStudentSearch("");
            setSelectedStudent(null);
            setRole("Membre");
            setIsMandat(false);
            loadClub();
        } catch (err: any) {
            toast.error(err.message || "Failed to add member");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember || !clubId) return;
        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${editingMember.student_id}/clubs/${clubId}`, {
                method: "PATCH",
                body: JSON.stringify({ role, is_mandat: isMandat }),
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
        if (!editingMember || !clubId) return;
        if (!confirm(`Are you sure you want to remove ${editingMember.first_name} ${editingMember.last_name} from the registry?`)) return;

        setSubmitting(true);
        try {
            await fetchPrivate(`/students/${editingMember.student_id}/clubs/${clubId}`, { method: "DELETE" });
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

    const mandats = club?.members?.filter((m: any) => m.is_mandat) || [];
    const regularMembers = club?.members?.filter((m: any) => !m.is_mandat) || [];
    const primaryColor = club?.color_primary || PALETTE.orga[500];

    const MemberCard = ({ member }: { member: any }) => (
        <Card
            onClick={() => { onClose(); router.push(`/palantint/students/${member.student_id}`); }}
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
        <div className="fixed inset-0 z-[999] flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
            <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
            <div className="relative w-full sm:max-w-5xl bg-zinc-950 border border-zinc-800 sm:rounded-none shadow-2xl overflow-hidden z-10 flex flex-col min-h-screen sm:min-h-0 sm:max-h-[90vh] text-white font-sans">
                <div className="h-1 w-full shrink-0" style={{ backgroundColor: primaryColor }} />
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer z-20 rounded-none"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="overflow-y-auto custom-scrollbar p-6 sm:p-10 pt-16 sm:pt-16 space-y-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Loading entity...</span>
                        </div>
                    ) : error || !club ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3 font-mono uppercase text-xs tracking-widest">
                            <p className="text-zinc-500">{error || "ENTITY_OFFLINE"}</p>
                        </div>
                    ) : (
                        <>
                            {/* Header Profile */}
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 sm:p-8 relative shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-8 rounded-none overflow-hidden">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-zinc-900 flex flex-shrink-0 items-center justify-center overflow-hidden border border-zinc-800 shadow-inner rounded-none relative">
                                    {club.logo_url ? (
                                        <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-12 h-12 text-zinc-700" />
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left space-y-4">
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter">{club.name}</h1>
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            {club.type && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800">
                                                    <span className="w-1.5 h-1.5" style={{ backgroundColor: primaryColor }} />
                                                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{club.type}</span>
                                                </div>
                                            )}
                                            {club.foyer_room && (
                                                <button
                                                    onClick={() => {
                                                        const roomId = club.foyer_room;
                                                        onClose();
                                                        router.push(`/palantint/foyer?room=${encodeURIComponent(roomId)}`);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                                >
                                                    <MapPin className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Local {club.foyer_room}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-mono border-l-2 border-zinc-800 pl-6 text-left uppercase tracking-tight">
                                        {club.description || "NO_MANIFESTO_DECLARED"}
                                    </p>
                                    {club.links && club.links.length > 0 && (
                                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                            {club.links.map((link: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-mono font-bold uppercase tracking-widest px-4 py-2 bg-zinc-950 border border-zinc-800 hover:text-white transition-all flex items-center gap-2 text-zinc-500 group rounded-none"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                                    {link.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {isAdmin && (
                                    <div className="w-full md:w-auto shrink-0 order-first md:order-none flex justify-end">
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
                                    </div>
                                )}
                            </div>

                            {mandats.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                            <Crown className="w-5 h-5 text-housing-500" /> Executive Council
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-housing-500/20 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {mandats.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                                    </div>
                                </section>
                            )}

                            {regularMembers.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                            <Users className="w-5 h-5 text-zinc-500" /> Accredited Operatives
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {regularMembers.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                                    </div>
                                </section>
                            )}

                            {club.members?.length === 0 && (
                                <div className="text-center py-16 border border-dashed border-zinc-800 bg-zinc-900/20 rounded-none">
                                    <Users className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                                    <h3 className="text-sm font-mono font-bold text-zinc-600 uppercase tracking-widest">No operatives recorded in registry</h3>
                                </div>
                            )}

                            {club.events?.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-3 text-white">
                                            <CalendarDays className="w-5 h-5 text-zinc-500" /> Active Operations
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {club.events.map((e: any) => {
                                            const start = new Date(e.start_time);
                                            const end = new Date(e.end_time);
                                            return (
                                                <div key={e.id} className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-5 hover:border-zinc-500 transition-all rounded-none flex flex-col gap-3 shadow-xl">
                                                    <h3 className="text-base font-black text-white uppercase tracking-wide leading-tight">{e.name}</h3>
                                                    {e.description && <p className="text-xs text-zinc-500 font-mono line-clamp-2 uppercase tracking-tight">{e.description}</p>}
                                                    <div className="space-y-1.5 pt-3 border-t border-zinc-800/60 mt-auto">
                                                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                            <CalendarDays className="w-3.5 h-3.5 text-zinc-600" />
                                                            {start.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                                            {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} — {end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                                                        </div>
                                                        {e.room && (
                                                            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                                                                <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                                                                ZONE_{e.room}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>

                {/* ADD MEMBER MODAL */}
                {showAddModal && club && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
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
                                            {searchResults.map((s) => (
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
                                            className={`w-5 h-5 border flex items-center justify-center transition-all ${isMandat ? "border-transparent" : "bg-zinc-950 border-zinc-800"}`}
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
                                    className="flex-1 text-white font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all border-none"
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
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
                                            className={`w-5 h-5 border flex items-center justify-center transition-all ${isMandat ? "border-transparent" : "bg-zinc-950 border-zinc-800"}`}
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
                                        className="flex-1 text-white font-mono uppercase text-xs tracking-widest h-12 rounded-none transition-all border-none"
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
        </div>
    );
}
