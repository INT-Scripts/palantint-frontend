"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { 
    User, ShieldAlert, Activity, Calendar, 
    Clock, MapPin, ExternalLink, Key, ShieldCheck,
    Settings, LogOut, Loader2, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export default function AccountPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // CAS Credentials State
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

                // Load CAS status
                fetchAPI("/users/me/cas-credentials").then(setCasStatus);

                // Fetch student profile directly
                try {
                    const me = await fetchAPI("/users/me/student");
                    setStudent(me);
                    // Fetch agenda
                    const agendaData = await fetchAPI(`/students/${me.id}/agenda`);
                    setEvents(agendaData || []);
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
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
            {/* Background Grain & Orbs */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-screen bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />
            <div className="fixed top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none mix-blend-screen z-0" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none mix-blend-screen z-0" />

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-12 md:py-20">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    
                    {/* LEFT COL: IDENTITY PANEL */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="animate-in fade-in slide-in-from-left-8 duration-1000 fill-mode-both">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 to-transparent blur-md opacity-50 group-hover:opacity-100 transition duration-1000" />
                                <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none p-8 overflow-hidden">
                                    {/* Brutalist Corner Accents */}
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/50 m-2" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/50 m-2" />
                                    
                                    <div className="flex flex-col items-center text-center">
                                        <div className="relative mb-6">
                                            <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
                                            <Avatar className="h-32 w-32 rounded-none border border-zinc-700 ring-4 ring-zinc-900/50 shadow-2xl relative z-10">
                                                <AvatarImage src={student ? `${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${student.id}/image` : undefined} className="object-cover" />
                                                <AvatarFallback className="bg-zinc-950 text-zinc-500 text-4xl font-black">
                                                    {user.username[0].toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>

                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                                                {student ? `${student.first_name} ${student.last_name}` : user.username}
                                            </h2>
                                            <p className="font-mono text-xs text-blue-500 tracking-[0.3em] font-bold uppercase">
                                                {user.is_admin ? "Administrator" : "User Account"}
                                            </p>
                                        </div>

                                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-8" />

                                        <div className="w-full space-y-4 text-left font-mono text-xs">
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                                <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Username</span>
                                                <span className="text-zinc-200">{user.username}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                                <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Department</span>
                                                <span className="text-blue-400 font-bold">{student?.ecole || "None"}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                                <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Level</span>
                                                <span className="text-zinc-200">{student?.promo || "None"}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                                <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Apartment</span>
                                                <span className="text-orange-500 font-bold">{student?.apartment || "None"}</span>
                                            </div>
                                        </div>

                                        {/* CAS STATUS / SYNC */}
                                        <div className="w-full mt-8 p-4 bg-black/20 border border-zinc-800 relative group/cas">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Key className="w-3 h-3 text-blue-500" /> CAS Sync
                                                </span>
                                                {casStatus?.has_credentials ? (
                                                    <span className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest">Linked</span>
                                                ) : (
                                                    <span className="text-[10px] font-mono text-red-500/70 uppercase tracking-widest">Offline</span>
                                                )}
                                            </div>
                                            
                                            {!showCasForm ? (
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                                                        {casStatus?.cas_username || "No credentials stored"}
                                                    </p>
                                                    <button 
                                                        onClick={() => setShowCasForm(true)}
                                                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase tracking-widest underline decoration-blue-500/30 underline-offset-4"
                                                    >
                                                        {casStatus?.has_credentials ? "Update" : "Link CAS"}
                                                    </button>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleSaveCas} className="space-y-3 animate-in fade-in duration-300">
                                                    <input 
                                                        type="text" required placeholder="CAS USERNAME" value={casUser} onChange={e=>setCasUser(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-blue-500/50"
                                                    />
                                                    <input 
                                                        type="password" required placeholder="CAS PASSWORD" value={casPass} onChange={e=>setCasPass(e.target.value)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-none px-2 py-1.5 text-[10px] font-mono text-white outline-none focus:border-blue-500/50"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button disabled={casSaving} size="sm" className="flex-1 h-7 bg-blue-600/80 hover:bg-blue-500 text-[9px] font-mono uppercase tracking-widest rounded-none shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                                            {casSaving ? "Saving..." : "Save"}
                                                        </Button>
                                                        <Button type="button" onClick={() => setShowCasForm(false)} variant="ghost" size="sm" className="flex-1 h-7 border border-zinc-800 text-[9px] font-mono uppercase tracking-widest rounded-none hover:bg-zinc-900">
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>

                                        <div className="mt-10 w-full space-y-3">
                                            {student && (
                                                <Button 
                                                    onClick={() => router.push(`/students/${student.id}`)}
                                                    className="w-full bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono uppercase tracking-[0.2em] font-bold h-12 shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all"
                                                >
                                                    <User className="w-4 h-4 mr-2" /> View Public Profile
                                                </Button>
                                            )}
                                            {user.is_admin && (
                                                <Button 
                                                    onClick={() => router.push("/admin/settings")}
                                                    className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 font-mono uppercase tracking-[0.2em] font-bold h-12 shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] transition-all"
                                                >
                                                    <ShieldAlert className="w-4 h-4 mr-2" /> Admin Dashboard
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline"
                                                className="w-full border-zinc-800 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900 font-mono uppercase tracking-widest text-[10px] h-10 rounded-none"
                                                onClick={() => {
                                                    localStorage.removeItem("palantint_token");
                                                    window.location.reload();
                                                }}
                                            >
                                                <LogOut className="w-3 h-3 mr-2" /> Log Out
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: SCHEDULE (AGENDA) */}
                    <div className="lg:col-span-2 space-y-10">
                        <header className="animate-in fade-in slide-in-from-top-4 duration-1000 fill-mode-both">
                            <div className="flex items-center gap-3 text-blue-500 mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="font-mono text-xs tracking-[0.3em] font-bold">ACCOUNT OVERVIEW</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                                Your <br/> Schedule
                            </h1>
                        </header>

                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both" style={{ animationDelay: '200ms' }}>
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-none p-8 min-h-[500px] relative">
                                {/* Brutalist Accent */}
                                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />
                                <div className="absolute top-0 left-0 w-8 h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-mono text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-3 text-zinc-400">
                                        <Calendar className="w-5 h-5 text-blue-500" /> Upcoming Events
                                    </h3>
                                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Live // Connected</span>
                                </div>

                                {events.length > 0 ? (
                                    <div className="space-y-4">
                                        {events.slice(0, 8).map((evt, i) => (
                                            <div 
                                                key={evt.id} 
                                                className="flex items-center gap-6 p-4 bg-black/20 border border-zinc-800/50 hover:border-blue-500/30 transition-all group"
                                                style={{ animationDelay: `${300 + (i * 100)}ms` }}
                                            >
                                                <div className="text-center w-16 shrink-0 border-r border-zinc-800 pr-6">
                                                    <p className="text-[10px] font-mono text-zinc-500 uppercase">{new Date(evt.start_time).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                                    <p className="text-xl font-black text-white">{new Date(evt.start_time).getDate()}</p>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white uppercase truncate group-hover:text-blue-400 transition-colors">{evt.name}</p>
                                                    <div className="flex items-center gap-4 mt-1 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-500/50" /> {new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500/50" /> {evt.room || "FIELD"}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-[9px] font-mono text-zinc-600 uppercase mb-1">Status</p>
                                                    <p className="text-[10px] font-mono text-emerald-500 font-bold uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5">Assigned</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[300px] text-zinc-600 font-mono text-sm uppercase tracking-widest space-y-4">
                                        <div className="w-12 h-12 border border-zinc-800 flex items-center justify-center">
                                            <Activity className="w-6 h-6 opacity-20" />
                                        </div>
                                        <p>No events currently scheduled.</p>
                                    </div>
                                )}

                                {events.length > 8 && (
                                    <div className="mt-8 flex justify-center">
                                        <Button variant="ghost" className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors">
                                            Decrypt Full Schedule <ChevronRight className="w-3 h-3 ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
