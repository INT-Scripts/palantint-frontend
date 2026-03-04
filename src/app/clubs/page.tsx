"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Users, Briefcase } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function ClubsPage() {
    const [clubs, setClubs] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        document.title = "Associations | PalantINT";
        fetchAPI("/clubs")
            .then(data => setClubs(data))
            .catch(err => console.error("Error fetching clubs:", err))
            .finally(() => setLoading(false));
    }, []);

    const filteredClubs = clubs.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
    );

    const groupedClubs = filteredClubs.reduce((acc, club) => {
        const origin = club.association_of_origin || club.type || "Autre";
        if (!acc[origin]) acc[origin] = [];
        acc[origin].push(club);
        return acc;
    }, {} as Record<string, any[]>);

    const sortedOrigins = Object.keys(groupedClubs).sort((a, b) => {
        if (a.toLowerCase().includes("bureau")) return -1;
        if (b.toLowerCase().includes("bureau")) return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-emerald-500/30">

            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[15%] left-[10%] w-[35%] h-[45%] bg-emerald-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[40%] h-[35%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                <PageHeader
                    badgeText="Entity Database // Active"
                    title1="Registered"
                    title2="Entities"
                    titleGradient="from-emerald-500 to-teal-400"
                    subtitle="Index of all sanctioned campus organizations and student groups."
                    colorName="emerald"
                    searchPlaceholder="QUERY: ORG_NAME / DEPT..."
                    searchValue={search}
                    onSearchChange={setSearch}
                />

                {loading ? (
                    <div className="flex justify-center py-32">
                        <div className="w-16 h-16 border-4 border-zinc-800 border-t-emerald-500 rounded-none animate-spin"></div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-24">
                        {sortedOrigins.map(origin => {
                            const originClubs = groupedClubs[origin].sort((a: any, b: any) => a.name.localeCompare(b.name));
                            return (
                                <section key={origin} className="space-y-8 relative">
                                    <div className="flex items-center gap-6 sticky top-24 z-20 bg-zinc-950/80 backdrop-blur-3xl py-4 border-y border-zinc-800/80">
                                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                                            <span className="text-emerald-500">[{origin}]</span>
                                            <span className="text-xs font-mono text-zinc-500">COUNT: {originClubs.length}</span>
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {originClubs.map((club: any) => (
                                            <div
                                                key={club.id}
                                                onClick={() => router.push(`/clubs/${club.id}`)}
                                                className="group relative bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 hover:border-emerald-500 cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
                                            >
                                                {/* Asymmetrical Top Border Accent */}
                                                <div className="absolute top-0 right-0 w-1/3 h-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />

                                                <div className="flex items-center gap-6 p-6 border-b border-zinc-800/50 bg-zinc-900/30">
                                                    <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 flex flex-shrink-0 items-center justify-center overflow-hidden shadow-inner group-hover:border-emerald-500/50 transition-colors z-10">
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100" />
                                                        ) : (
                                                            <Briefcase className="w-8 h-8 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                                                        )}
                                                    </div>
                                                    <div className="z-10 flex-1 min-w-0">
                                                        <h3 className="text-xl font-bold text-white leading-tight uppercase tracking-wider group-hover:text-emerald-400 transition-colors truncate">{club.name}</h3>
                                                        <p className="text-xs text-zinc-500 font-mono mt-1 tracking-widest">ID: {club.id}</p>
                                                    </div>
                                                </div>
                                                <div className="p-6 flex-1 bg-zinc-950/40">
                                                    <p className="text-zinc-400 text-sm line-clamp-3 leading-relaxed font-mono">{club.description || "No data provided"}</p>
                                                </div>
                                                
                                                {/* Bottom Action Bar */}
                                                <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center group-hover:bg-emerald-500/10 transition-colors">
                                                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Status: ACTIVE</span>
                                                    <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Access Data &gt;</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
