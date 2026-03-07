"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Users, Image as ImageIcon, CalendarDays, Edit, MapPin, Briefcase, GraduationCap, Mail, X, Check, Loader2, StickyNote, Home, Network, Lock } from "lucide-react";
import AgendaCalendar from "./components/AgendaCalendar";
import MediaGallery from "./components/MediaGallery";
import RelationshipsList from "./components/RelationshipsList";
import SocialsClubsSidebar from "./components/SocialsClubsSidebar";
import NotesList from "./components/NotesList";

export default function StudentProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("agenda");
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ first_name: "", last_name: "", promo: "", ecole: "", email: "" });
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        fetchAPI(`/students/${id}`)
            .then(data => {
                setStudent(data);
                if (data && data.first_name) {
                    document.title = `${data.first_name} ${data.last_name} | PalantINT`;
                    fetchAPI(`/students/${id}/recently-viewed`, { method: "POST" }).catch(() => { });
                }
            })
            .catch(err => {
                setError("Failed to load student profile");
            })
            .finally(() => setLoading(false));
    }, [id]);

    const startEditing = () => {
        setEditForm({
            first_name: student.first_name || "",
            last_name: student.last_name || "",
            promo: student.promo || "",
            ecole: student.ecole || "",
            email: student.email || "",
        });
        setEditing(true);
    };

    const saveEdit = async () => {
        setEditLoading(true);
        try {
            const updated = await fetchAPI(`/students/${student.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            setStudent({ ...student, ...updated });
            setEditing(false);
        } catch (e) {
            console.error(e);
        } finally {
            setEditLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-400">Loading profile...</div>;
    if (error || !student) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || "Student not found"}</div>;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';
    const imgUrl = `${apiUrl}/students/${student.id}/image`;

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-purple-500/30">
            
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                <div className="space-y-8">

                    {/* Header Profile Card */}
                    <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-transparent" />
                        
                        {/* Blurred banner background using profile pic */}
                        <div
                            className="h-48 w-full bg-cover bg-center opacity-30 grayscale sepia hue-rotate-15 pointer-events-none border-b border-zinc-800"
                            style={{ backgroundImage: `url(${imgUrl})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none h-48" />
                        
                        <div className="relative pt-0 px-6 pb-8 sm:px-12 flex flex-col sm:flex-row items-center sm:items-end gap-10 -mt-24">
                            <div className="w-48 h-48 bg-zinc-900 border-2 border-zinc-800 p-1 flex-shrink-0 relative group shadow-2xl">
                                {/* Corner Brackets */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 z-10 m-2 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500 z-10 m-2 transition-transform group-hover:translate-x-1 group-hover:translate-y-1" />
                                
                                <img
                                    src={imgUrl}
                                    alt={student.first_name}
                                    className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                {!student.first_name && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-6xl text-zinc-700 font-black font-mono">
                                        ?
                                    </div>
                                )}
                            </div>

                            {editing ? (
                                /* ── Edit Mode ── */
                                <div className="flex-1 space-y-4 w-full bg-zinc-950 p-6 border border-zinc-800 mt-4 sm:mt-0 shadow-inner">
                                    <h3 className="text-zinc-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <span className="w-2 h-2 bg-blue-500 animate-pulse" /> Edit Profile Data
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Input
                                            type="text" placeholder="Prénom"
                                            value={editForm.first_name}
                                            onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                                            className="bg-zinc-900/50 border-zinc-800 rounded-none px-4 py-6 text-sm font-mono text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                                        />
                                        <Input
                                            type="text" placeholder="Nom"
                                            value={editForm.last_name}
                                            onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                                            className="bg-zinc-900/50 border-zinc-800 rounded-none px-4 py-6 text-sm font-mono text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                                        />
                                    </div>
                                    <Input
                                        type="text" placeholder="Level / Promo"
                                        value={editForm.promo}
                                        onChange={e => setEditForm({ ...editForm, promo: e.target.value })}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-none px-4 py-6 text-sm font-mono text-white placeholder:text-zinc-600 focus-visible:ring-purple-500"
                                    />
                                    <Input
                                        type="text" placeholder="Department / Org"
                                        value={editForm.ecole}
                                        onChange={e => setEditForm({ ...editForm, ecole: e.target.value })}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-none px-4 py-6 text-sm font-mono text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                                    />
                                    <Input
                                        type="email" placeholder="Institutional Email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="bg-zinc-900/50 border-zinc-800 rounded-none px-4 py-6 text-sm font-mono text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                                    />
                                    <div className="flex gap-4 pt-4 border-t border-zinc-900 mt-4">
                                        <Button
                                            onClick={saveEdit} disabled={editLoading}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono tracking-widest uppercase rounded-none px-8"
                                        >
                                            {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                            Commit Change
                                        </Button>
                                        <Button
                                            variant="outline" onClick={() => setEditing(false)}
                                            className="border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono tracking-widest uppercase rounded-none hover:bg-zinc-800"
                                        >
                                            <X className="w-4 h-4 mr-2" /> Abort
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* ── Display Mode ── */
                                <>
                                    <div className="text-center sm:text-left flex-1 space-y-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 mb-2">
                                            <span className="w-1.5 h-1.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                                                ID: {student.trombint_id || "UNKNOWN"}
                                            </span>
                                        </div>
                                        
                                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">
                                            {student.first_name} <span className="text-blue-500">{student.last_name}</span>
                                        </h1>
                                        
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                            {student.promo && student.promo !== 'N/A' && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Clearance Level</span>
                                                    <span className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 border-l-2 border-purple-500 font-mono text-sm font-bold">
                                                        <GraduationCap className="w-4 h-4" /> {student.promo}
                                                    </span>
                                                </div>
                                            )}
                                            {student.ecole && student.ecole !== 'N/A' && (
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">Assignation</span>
                                                    <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 font-mono text-sm font-bold">
                                                        <Briefcase className="w-4 h-4" /> {student.ecole}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-6 mt-4 pt-4 border-t border-zinc-800/80">
                                            {student.email && (
                                                <div className="flex items-center gap-2 text-sm text-zinc-400 font-mono">
                                                    <Mail className="w-4 h-4 text-zinc-600" /> {student.email}
                                                </div>
                                            )}
                                            {student.apartment && (
                                                <button
                                                    onClick={() => router.push(`/apartments?room=${student.apartment}`)}
                                                    className="flex items-center gap-2 text-sm px-4 py-1.5 bg-orange-500/10 border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white transition-colors cursor-pointer font-mono font-bold uppercase tracking-wider group"
                                                >
                                                    <Home className="w-4 h-4 group-hover:animate-bounce" />
                                                    {student.apartment.length === 4 && !isNaN(Number(student.apartment)) && Number(student.apartment[0]) >= 1 && Number(student.apartment[0]) <= 7
                                                        ? `LOC_${student.apartment[0]}-${student.apartment[1]} (${student.apartment})`
                                                        : `APT_${student.apartment}`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={startEditing}
                                            className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-blue-500 transition-colors h-12 px-6 rounded-none font-mono uppercase tracking-widest text-xs"
                                        >
                                            <Edit className="w-4 h-4 mr-2" /> Modify Profile
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Main Content Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                        {/* Left Sidebar (Socials & Clubs) */}
                        <div className="lg:col-span-1 space-y-6">
                            <SocialsClubsSidebar student={student} onUpdate={(studentData) => setStudent(studentData)} />
                        </div>

                        {/* Right Main Content (Tabs) */}
                        <div className="lg:col-span-3">
                            <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800 min-h-[600px] flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
                                {/* Subtle corner tech accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-700 m-4 pointer-events-none z-10" />
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-700 m-4 pointer-events-none z-10" />
                                
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                                    <TabsList className="w-full justify-start overflow-x-auto border-b-2 border-zinc-800 bg-zinc-900 rounded-none h-auto sm:h-14 p-0 px-2 sm:px-4 flex-nowrap sm:space-x-2 relative z-20 scrollbar-hide">
                                        <TabsTrigger value="agenda" className="whitespace-nowrap data-[state=active]:bg-zinc-800 data-[state=active]:text-white py-3 sm:py-0 sm:h-full px-4 sm:px-6 font-mono uppercase tracking-widest text-xs font-black transition-all">
                                            <CalendarDays className="w-4 h-4 text-zinc-500" />
                                            Timetable
                                        </TabsTrigger>
                                        <TabsTrigger value="media" className="whitespace-nowrap data-[state=active]:bg-zinc-800 data-[state=active]:text-white py-3 sm:py-0 sm:h-full px-4 sm:px-6 font-mono uppercase tracking-widest text-xs font-black transition-all">
                                            <ImageIcon className="w-4 h-4 text-zinc-500" />
                                            Media
                                        </TabsTrigger>
                                        <TabsTrigger value="relationships" className="whitespace-nowrap data-[state=active]:bg-zinc-800 data-[state=active]:text-white py-3 sm:py-0 sm:h-full px-4 sm:px-6 font-mono uppercase tracking-widest text-xs font-black transition-all">
                                            <Network className="w-4 h-4 text-zinc-500" />
                                            Network Links
                                        </TabsTrigger>
                                        <TabsTrigger value="notes" className="whitespace-nowrap data-[state=active]:bg-zinc-800 data-[state=active]:text-white py-3 sm:py-0 sm:h-full px-4 sm:px-6 font-mono uppercase tracking-widest text-xs font-black transition-all relative flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-amber-500/50" />
                                            Activity Logs

                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    <div className="flex-1 p-6 relative">
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-700 m-4 pointer-events-none" />
                                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-700 m-4 pointer-events-none" />
                                        
                                        <TabsContent value="agenda" className="m-0 h-full">
                                            <AgendaCalendar studentId={student.id} />
                                        </TabsContent>

                                        <TabsContent value="media" className="m-0 h-full">
                                            <MediaGallery studentId={student.id} initialMedia={student.media} />
                                        </TabsContent>

                                        <TabsContent value="relationships" className="m-0 h-full">
                                            <RelationshipsList studentId={student.id} />
                                        </TabsContent>

                                        <TabsContent value="notes" className="m-0 h-full">
                                            <NotesList studentId={student.id} />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}


function LockIcon({ className }: { className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    );
}
