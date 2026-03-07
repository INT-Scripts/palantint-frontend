"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, User, Crown, CalendarDays, Clock, MapPin } from "lucide-react";

export default function ClubDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;
        fetchAPI(`/clubs/${id}`)
            .then(data => {
                setClub(data);
                document.title = `${data.name} | PalantINT`;
            })
            .catch(err => {
                console.error("Error fetching club details", err);
                setError("Club not found.");
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
                <div className="flex-1 flex items-center justify-center pt-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            </div>
        );
    }

    if (error || !club) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center pt-20">
                    <p className="text-zinc-500 text-xl">{error}</p>
                    <button onClick={() => router.push("/clubs")} className="mt-4 text-emerald-500 hover:underline">Return to associations</button>
                </div>
            </div>
        );
    }

    // Separate members by mandat vs non-mandat
    const mandats = club.members?.filter((m: any) => m.is_mandat) || [];
    const regularMembers = club.members?.filter((m: any) => !m.is_mandat) || [];

    const MemberCard = ({ member }: { member: any }) => (
        <Card
            onClick={() => router.push(`/students/${member.student_id}`)}
            className="p-0 border-zinc-800 hover:border-emerald-500 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-emerald-500 transition-colors z-10" />
            
            <CardContent className="p-0 flex flex-col h-full">
                <div className="flex items-center gap-4 p-4 border-b border-zinc-800/50 flex-1">
                    <Avatar className="w-12 h-12 bg-zinc-900 shrink-0 border border-zinc-800 group-hover:border-emerald-500/50 transition-all rounded-none">
                        {member.profile_picture_path && <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "/api"}/students/${member.student_id}/image`} alt={member.first_name} className="object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />}
                        <AvatarFallback className="bg-transparent rounded-none">
                            <User className="w-6 h-6 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-white leading-tight uppercase tracking-wide truncate group-hover:text-emerald-400 transition-colors">
                            {member.first_name} {member.last_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            {member.is_mandat && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                            <p className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase truncate">{member.role || "MEMBER"}</p>
                        </div>
                    </div>
                </div>
                
                <div className="px-4 py-2 bg-zinc-900/30 flex justify-between items-center group-hover:bg-emerald-500/10 transition-colors">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Level {member.promo || "N/A"}</span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase truncate max-w-[100px]" title={member.ecole}>{member.ecole || "N/A"}</span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24 selection:bg-emerald-500/30">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] right-[10%] w-[30%] h-[40%] bg-emerald-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push("/clubs")}
                    className="mb-8 group text-zinc-500 hover:text-emerald-400"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
                    Directory
                </Button>

                {/* Header */}
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 p-8 mb-12 relative shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Top Bracket */}
                    <div className="absolute top-0 right-0 w-16 h-1 border-t-2 border-r-0 border-emerald-500" />
                    
                    <div className="w-32 h-32 bg-zinc-900 flex flex-shrink-0 items-center justify-center overflow-hidden border-2 border-zinc-800 shadow-inner">
                        {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover grayscale brightness-110" />
                        ) : (
                            <Users className="w-12 h-12 text-zinc-600" />
                        )}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mix-blend-difference">{club.name}</h1>
                            {club.type && (
                                <span
                                    className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 border"
                                    style={{
                                        backgroundColor: club.color_primary ? club.color_primary + '20' : '#10b9811a',
                                        color: club.color_primary || '#10b981',
                                        borderColor: club.color_primary ? club.color_primary + '50' : '#10b98150'
                                    }}
                                >
                                    CLASS: {club.type}
                                </span>
                            )}
                        </div>
                        <p className="text-zinc-400 text-sm max-w-3xl leading-relaxed font-mono border-l-2 border-zinc-800 pl-4 text-left">
                            {club.description || "No manifesto outlined for this entity"}
                        </p>
                    </div>
                </div>

                {/* Mandat Members */}
                {mandats.length > 0 && (
                    <section className="mb-16">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 text-white">
                                <Crown className="w-5 h-5 text-amber-500" /> Executive Council
                            </h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/50 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {mandats.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                        </div>
                    </section>
                )}

                {/* Regular Members */}
                {regularMembers.length > 0 && (
                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 text-white">
                                <Users className="w-5 h-5 text-zinc-500" /> Members
                            </h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {regularMembers.map((m: any) => <MemberCard key={m.student_id} member={m} />)}
                        </div>
                    </section>
                )}

                {club.members?.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl">
                        <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white mb-1">Aucun membre enregistré</h3>
                        <p className="text-zinc-500 text-sm">Faites partie des premiers à rejoindre le club sur PalantINT !</p>
                    </div>
                )}

                {/* Events */}
                {club.events?.length > 0 && (
                    <section className="mt-12">
                        <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-2 mb-6 text-zinc-200">
                            <CalendarDays className="w-5 h-5 text-purple-400" /> Événements
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {club.events.map((e: any) => {
                                const start = new Date(e.start_time);
                                const end = new Date(e.end_time);
                                return (
                                    <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-purple-500/50 hover:bg-zinc-800 transition">
                                        <h3 className="text-lg font-bold text-white mb-2">{e.name}</h3>
                                        {e.description && <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{e.description}</p>}
                                        <div className="space-y-2 text-xs font-semibold text-zinc-300">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="w-4 h-4 text-zinc-500" />
                                                <span className="capitalize">{start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-zinc-500" />
                                                {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            {e.room && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-zinc-500" />
                                                    {e.room}
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
        </div>
    );
}

