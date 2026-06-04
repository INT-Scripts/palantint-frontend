"use client";
import { PALETTE } from "@/lib/colors";

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
        document.title = "Associations";
        fetchAPI("/clubs")
            .then(data => setClubs(data))
            .catch(err => console.error("Error fetching clubs:", err))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!loading) {
            window.scrollTo(0, 0);
        }
    }, [loading]);

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

    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-orga-500/30 font-sans">
            
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[15%] left-[10%] w-[35%] h-[45%] bg-orga-600/10 blur-[150px] rounded-none mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[40%] h-[35%] bg-zinc-800/10 blur-[150px] rounded-none mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
                <PageHeader
                    badgeText="Entity Database // Active"
                    title1="Accredited"
                    title2="Associations"
                    titleGradient="from-orga-400 to-orga-600"
                    subtitle="Centralized registry for authorized campus groups."
                    colorName="orga"
                    searchPlaceholder="QUERY: ASSOCIATION NAME"
                    searchValue={search}
                    onSearchChange={setSearch}
                />

                <div className="flex flex-col gap-24">
                        {sortedOrigins.map(origin => {
                            const originClubs = groupedClubs[origin].sort((a: any, b: any) => a.name.localeCompare(b.name));
                            return (
                                <section key={origin} className="space-y-8 relative">
                                    <div className="flex items-center gap-6 sticky top-24 z-20 bg-zinc-950/80 backdrop-blur-3xl py-4 border-y border-zinc-800/60 rounded-none">
                                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                                            <span className="text-orga-500">{origin}</span>
                                            <span className="text-xs font-mono text-zinc-500">COUNT: {originClubs.length}</span>
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-orga-500/50 to-transparent" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {originClubs.map((club: any) => {
                                            const clubColor = club.color_primary || PALETTE.orga[500];
                                            const isHovered = hoveredId === club.id;
                                            
                                            return (
                                                <div
                                                    key={club.id}
                                                    onClick={() => router.push(`/clubs/${club.id}`)}
                                                    onMouseEnter={() => setHoveredId(club.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    className="group relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 cursor-pointer transition-all duration-300 shadow-2xl flex flex-col overflow-hidden rounded-none"
                                                    style={{ 
                                                        borderColor: isHovered ? clubColor : ''
                                                    }}
                                                >
                                                    <div
                                                        className="absolute top-0 right-0 w-1/3 h-1 transition-colors"
                                                        style={{
                                                            backgroundColor: clubColor + '33', 
                                                        }}
                                                    />
                                                    <div
                                                        className="absolute top-0 right-0 w-1/3 h-1 transition-opacity opacity-0 group-hover:opacity-100"
                                                        style={{ backgroundColor: clubColor }}
                                                    />

                                                    <div className="flex items-center gap-6 p-6 border-b border-zinc-800/60 bg-zinc-900/30">
                                                        <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 flex flex-shrink-0 items-center justify-center overflow-hidden shadow-inner transition-colors z-10 rounded-none"
                                                            style={{ borderColor: isHovered ? `${clubColor}80` : club.color_primary ? `${club.color_primary}50` : '' }}
                                                        >
                                                            {club.logo_url ? (
                                                                <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 rounded-none" />
                                                            ) : (
                                                                <Briefcase className="w-8 h-8 text-zinc-600 transition-colors" style={{ color: clubColor }} />
                                                            )}
                                                        </div>
                                                        <div className="z-10 flex-1 min-w-0">
                                                            <h3 className="text-xl font-bold text-white leading-tight uppercase tracking-wider transition-colors truncate"
                                                            >
                                                                {club.name}
                                                            </h3>
                                                            <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest uppercase">
                                                                REF: {club.id.substring(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 flex-1 bg-zinc-950/20">
                                                        <p className="text-zinc-400 text-xs leading-relaxed font-mono line-clamp-3 uppercase tracking-tight">{club.description || "NO_DESCRIPTION_AVAILABLE"}</p>
                                                    </div>
                                                    
                                                    {/* Bottom Action Bar */}
                                                    <div className="px-6 py-3 bg-zinc-900 border-t border-zinc-800/60 flex justify-between items-center transition-colors rounded-none"
                                                        style={{ backgroundColor: isHovered ? `${clubColor}1a` : '' }}
                                                    >
                                                        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Status: OPERATIONAL</span>
                                                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                                                            style={{ color: clubColor }}
                                                        >
                                                            ACCESS_DATA &gt;
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

            </main>
        </div>
    );
}
