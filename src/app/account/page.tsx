"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { 
    User, ShieldAlert, Activity, Calendar, 
    Clock, MapPin, ExternalLink, Key, ShieldCheck,
    Settings, LogOut, ChevronRight, Users, Eye, Home, Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import EventDetailsModal from "@/components/EventDetailsModal";

export default function AccountPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const [neighbors, setNeighbors] = useState<any[]>([]);
    const [recentViews, setRecentViews] = useState<any[]>([]);
    const [telemetry, setTelemetry] = useState<any>(null);

    const [casStatus, setCasStatus] = useState<{has_credentials: boolean, cas_username: string | null} | null>(null);
    const [showCasForm, setShowCasForm] = useState(false);
    const [casUser, setCasUser] = useState("");
    const [casPass, setCasPass] = useState("");
    const [casSaving, setCasSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const userData = await fetchAPI("/users/me");
                setUser(userData);

                fetchAPI("/users/me/cas-credentials").then(setCasStatus);

                if (userData.is_admin) {
                    fetchAPI("/admin/telemetry").then(setTelemetry);
                }

                const stored = localStorage.getItem("palantint_recent_students");
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        setRecentViews(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
                    } catch (e) { console.error(e); }
                }

                try {
                    const me = await fetchAPI("/users/me/student");
                    setStudent(me);
                    fetchAPI(`/students/${me.id}/agenda`).then(setEvents);
                    
                    if (me.apartment) {
                        fetchAPI("/students/apartments/occupied").then(allOccupiedDict => {
                            // allOccupied is a Record<apt_id, Student[]>
                            // Flatten to array for proximity filtering
                            const allStudentsWithApt: any[] = [];
                            Object.entries(allOccupiedDict).forEach(([aptId, occupants]: [string, any]) => {
                                occupants.forEach((s: any) => {
                                    allStudentsWithApt.push({ ...s, apartment: aptId });
                                });
                            });

                            if (me.apartment && me.apartment.length >= 2) {
                                const bTarget = me.apartment[0];
                                const fTarget = me.apartment[1];
                                const rTarget = parseInt(me.apartment.substring(2)) || 0;
                                
                                const nearby = allStudentsWithApt
                                    .filter((s: any) => 
                                        s.apartment && 
                                        s.id !== me.id &&
                                        s.apartment[0] === bTarget &&
                                        s.apartment[1] === fTarget
                                    )
                                    .sort((a, b) => {
                                        const rA = parseInt(a.apartment.substring(2)) || 0;
                                        const rB = parseInt(b.apartment.substring(2)) || 0;
                                        return Math.abs(rA - rTarget) - Math.abs(rB - rTarget);
                                    })
                                    .slice(0, 10);
                                setNeighbors(nearby);
                            }
                        });
                    }
                } catch (err) {
                    console.log("No linked student profile found.");
                }
            } catch (err) {
                console.error("Auth error:", err);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [router]);

    useEffect(() => {
        if (!loading) {
            window.scrollTo(0, 0);
        }
    }, [loading]);

    const handleSaveCas = async (e: React.FormEvent) => {
        e.preventDefault();
        setCasSaving(true);
        try {
            await fetchAPI("/users/me/cas-credentials", {
                method: "POST",
                body: JSON.stringify({ cas_username: casUser, cas_password: casPass })
            });
            setCasStatus({ has_credentials: true, cas_username: casUser });
            setShowCasForm(false);
            setCasUser("");
            setCasPass("");
        } catch (err: any) {
            alert("CAS SYNC FAILED: " + err.message);
        } finally {
            setCasSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-mono space-y-4">
                <div className="w-12 h-12 border-2 border-student-500/20 border-t-student-500" />
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.5em]">Syncing Identity...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-student-500/30 font-sans">
            <div className="fixed inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay z-0" />
            <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-none bg-student-600/5 blur-[150px] pointer-events-none mix-blend-screen z-0" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-none bg-student-600/5 blur-[150px] pointer-events-none mix-blend-screen z-0" />

            <main className="relative z-10 max-w-[1700px] mx-auto px-6 py-12 md:py-20 lg:px-12">
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    
                    {/* COL 1: IDENTITY & CORE CONTROLS */}
                    <div className="lg:col-span-1 space-y-8">
                        <section className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/60 rounded-none p-1 relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-student-600 to-transparent" />
                            
                            <div className="p-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-8 group/avatar">
                                        <div className="absolute -inset-4 bg-student-500/5 rounded-full blur-3xl opacity-0 group-hover/avatar:opacity-100" />
                                        <div className="relative w-40 h-40 border border-zinc-800 p-1 bg-zinc-950/50 rounded-none">
                                            <Avatar className="h-full w-full rounded-none">
                                                <AvatarImage 
                                                    src={student ? `${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image` : undefined} 
                                                    className="object-cover grayscale hover:grayscale-0" 
                                                />
                                                <AvatarFallback className="bg-zinc-900 text-zinc-500 text-5xl font-black rounded-none">
                                                    {user?.username?.[0]?.toUpperCase() || "!"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-student-500/40 m-2 group-hover/avatar:border-student-500" />
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-student-500/40 m-2 group-hover/avatar:border-student-500" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 mb-2">
                                            <span className="w-1.5 h-1.5 bg-student-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                                                Identifiant: {student?.trombint_id || "NOT_LINKED"}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter text-white leading-tight">
                                            {student ? `${student.first_name} ${student.last_name}` : (user?.username || "SUBJECT_000")}
                                        </h2>
                                        <p className="font-mono text-[10px] text-student-500 tracking-[0.4em] font-black uppercase">
                                            {user?.is_admin ? "SYSTEM_OPERATOR" : "ACCESS_LEVEL_STD"}
                                        </p>
                                    </div>

                                    <div className="w-full h-px bg-zinc-800/60 my-8" />

                                    <div className="w-full space-y-4 text-left font-mono text-[10px]">
                                        <div className="flex justify-between items-center group/row">
                                            <span className="text-zinc-500 uppercase tracking-widest group-hover/row:text-zinc-400">Username</span>
                                            <span className="text-zinc-200">{user?.username || "---"}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/row">
                                            <span className="text-zinc-500 uppercase tracking-widest group-hover/row:text-zinc-400">Division</span>
                                            <span className="text-student-500 font-bold">{student?.ecole || "EXTERNAL"}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/row">
                                            <span className="text-zinc-500 uppercase tracking-widest group-hover/row:text-zinc-400">Promo</span>
                                            <span className="text-zinc-200">{student?.promo || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center group/row">
                                            <span className="text-housing-500 uppercase tracking-widest group-hover/row:text-housing-400">Facility ID</span>
                                            <span className="text-housing-400 font-black">{student?.apartment || "UNASSIGNED"}</span>
                                        </div>
                                    </div>

                                    <div className="w-full mt-10 grid grid-cols-1 gap-3">
                                        <Link href={student ? `/students/${student.id}` : "#"} className="block w-full">
                                            <Button className="w-full bg-student-600/10 hover:bg-student-600/20 border border-student-500/30 text-student-400 font-mono uppercase tracking-[0.2em] font-black h-12 rounded-none">
                                                Student Profile
                                            </Button>
                                        </Link>
                                        {user?.is_admin && (
                                            <Link href="/admin" id="admin-console-link" className="block w-full">
                                                <Button className="w-full bg-comms-600/10 hover:bg-comms-600/20 border border-comms-500/30 text-comms-500 font-mono uppercase tracking-[0.2em] font-black h-12 rounded-none shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                                                    Admin Console
                                                </Button>
                                            </Link>
                                        )}
                                        <Button 
                                            variant="outline"
                                            className="w-full border-zinc-800 bg-transparent text-zinc-600 hover:text-white hover:bg-zinc-900 font-mono uppercase tracking-widest text-[9px] h-10 rounded-none"
                                            onClick={() => {
                                                localStorage.removeItem("palantint_token");
                                                window.location.reload();
                                            }}
                                        >
                                            Terminate Session
                                        </Button>
                                    </div>


                                </div>
                            </div>
                        </section>

                        <section className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/60 p-6 rounded-none relative overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-mono text-white uppercase tracking-widest flex items-center gap-2">
                                    <Key className="w-4 h-4 text-student-500" /> Identity Link (CAS)
                                </h3>
                                <div className={`w-2 h-2 rounded-none ${casStatus?.has_credentials ? 'bg-orga-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-comms-500'}`} />
                            </div>
                            
                            {!showCasForm ? (
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-3 border border-zinc-800/50">
                                        <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Authenticated Account</p>
                                        <p className="text-xs font-mono text-zinc-300 truncate">{casStatus?.cas_username || "NULL_IDENTITY"}</p>
                                    </div>
                                    <Button 
                                        onClick={() => setShowCasForm(true)}
                                        className="w-full h-10 bg-zinc-950 border border-zinc-800 text-student-400 hover:text-white hover:bg-student-900 rounded-none text-[10px] font-mono uppercase tracking-widest"
                                    >
                                        {casStatus?.has_credentials ? "Change creds" : "Register creds"}
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveCas} className="space-y-4">
                                    <div className="space-y-2">
                                        <input 
                                            type="text" required placeholder="USERNAME" value={casUser} onChange={e=>setCasUser(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-xs font-mono text-white outline-none focus:border-student-500/50"
                                        />
                                        <input 
                                            type="password" required placeholder="PASSWORD" value={casPass} onChange={e=>setCasPass(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-4 py-3 text-xs font-mono text-white outline-none focus:border-student-500/50"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button disabled={casSaving} className="flex-1 bg-student-600 hover:bg-student-500 text-[10px] font-mono uppercase tracking-widest rounded-none h-10 border-none">
                                            Commit
                                        </Button>
                                        <Button type="button" onClick={() => setShowCasForm(false)} variant="ghost" className="border border-zinc-800 text-zinc-500 rounded-none h-10 px-4 text-[10px] font-mono uppercase hover:text-white">
                                            Abort
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </section>


                    </div>

                    {/* COL 2: OPERATIONAL FEED (SCHEDULE) */}
                    <div className="lg:col-span-2 space-y-10">
                        <header>
                            <div className="flex items-center gap-3 text-student-500 mb-2">
                                <Activity className="w-5 h-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <span className="font-mono text-xs tracking-[0.4em] font-black uppercase">Active</span>
                            </div>
                            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter uppercase leading-[0.85] py-2">
                                Operator <span className="text-zinc-800">Feed</span>
                            </h1>
                        </header>

                        <section className="bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800/60 rounded-none p-10 relative overflow-hidden shadow-2xl">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-10 border-b border-zinc-800 pb-6">
                                    <h3 className="font-mono text-xs font-black uppercase tracking-[0.3em] flex items-center gap-4 text-white">
                                        <Calendar className="w-5 h-5 text-student-500" /> Mission Timeline
                                    </h3>
                                </div>

                                {events.length > 0 ? (
                                    <div className="space-y-4">
                                        {events.slice(0, 5).map((evt) => (
                                            <div 
                                                key={evt.id} 
                                                onClick={() => setSelectedEventId(evt.id)}
                                                className="flex items-center gap-8 p-6 bg-black/40 border border-zinc-800/50 hover:border-student-500/40 hover:bg-student-500/[0.03] group/event cursor-pointer rounded-none"
                                            >
                                                <div className="text-center w-16 shrink-0 border-r border-zinc-800/50 pr-8">
                                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">{new Date(evt.start_time).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                                    <p className="text-2xl font-black text-white">{new Date(evt.start_time).getDate()}</p>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-lg font-black text-white uppercase truncate group-hover/event:text-student-400 tracking-tight">{evt.name}</p>
                                                    <div className="inline-flex items-center gap-6 font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                                                        <span className="flex items-center gap-2"><Clock className="w-3 h-3 text-student-500" /> {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="flex items-center gap-2"><MapPin className="w-3 h-3 text-housing-500" /> {evt.room || "OFF_SITE"}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-zinc-800 group-hover/event:text-student-500" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 text-zinc-800 font-mono space-y-6">
                                        <Activity className="w-12 h-12 opacity-20" />
                                        <p className="text-xs uppercase tracking-[0.4em]">No future operations scheduled</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* COL 3: NETWORK & TELEMETRY */}
                    <div className="lg:col-span-1 space-y-8">
                        
                        <section className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-none shadow-xl">
                            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-3">
                                <Users className="w-4 h-4 text-orga-500" /> Entity Links
                            </h3>
                            <div className="space-y-3">
                                {student?.clubs?.length > 0 ? (
                                    student.clubs.map((club: any) => (
                                        <Link key={club.id} href={`/clubs/${club.id}`} className="block border border-zinc-800 bg-black/20 hover:border-orga-500/40 hover:bg-orga-500/[0.03] group/club p-4 rounded-none">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 border border-zinc-800 bg-zinc-950 flex items-center justify-center shrink-0 rounded-none">
                                                    {club.logo_url ? <img src={club.logo_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-zinc-800" />}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-[11px] font-black text-white uppercase truncate group-hover/club:text-orga-400">{club.name}</p>
                                                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{club.role || "MEMBER"}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-8 border border-zinc-900 bg-black/10 text-center">
                                        <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">Isolated Node: No links detected</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-none shadow-xl">
                            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-3">
                                <Home className="w-4 h-4 text-housing-500" /> Neighborhood Protocol
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {neighbors.length > 0 ? (
                                    neighbors.map((n: any) => (
                                        <Link key={n.id} href={`/students/${n.id}`} className="group/n">
                                            <div className="relative border border-zinc-800 bg-black/40 p-3 hover:border-housing-500/30 text-center rounded-none">
                                                <Avatar className="h-10 w-10 mx-auto mb-2 rounded-none grayscale group-hover/n:grayscale-0">
                                                    <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${n.id}/image`} />
                                                    <AvatarFallback className="bg-zinc-900 text-[10px] rounded-none">?</AvatarFallback>
                                                </Avatar>
                                                <p className="text-[9px] font-bold text-white uppercase truncate px-1">{n.first_name}</p>
                                                <p className="text-[8px] font-mono text-housing-500/60 uppercase">{n.apartment || "---"}</p>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-6 text-center text-zinc-800 font-mono text-[9px] uppercase">No subjects in proximity</div>
                                )}
                            </div>
                        </section>


                    </div>

                </div>
            </main>

            {selectedEventId && (
                <EventDetailsModal 
                    eventId={selectedEventId} 
                    onClose={() => setSelectedEventId(null)} 
                />
            )}
        </div>
    );
}
