"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { Users, Search, Info, ExternalLink, X, AlertTriangle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

interface ClubLink {
  name: string;
  url: string;
}

interface Club {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo_url?: string;
  type?: string;
  association_of_origin?: string;
  color_primary?: string;
  foyer_room?: string;
  links?: ClubLink[];
}

export default function PublicClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPublic("/clubs")
      .then(data => { if (isMounted) setClubs(data || []); })
      .catch((err: any) => { if (isMounted) setError(err.message || "Failed to load clubs."); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const origins = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => { if (c.association_of_origin) set.add(c.association_of_origin); });
    return Array.from(set).sort();
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    return clubs.filter(c => {
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || (
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.association_of_origin && c.association_of_origin.toLowerCase().includes(query)) ||
        (c.type && c.type.toLowerCase().includes(query)) ||
        (c.foyer_room && c.foyer_room.toLowerCase().includes(query))
      );
      const origin = c.association_of_origin || "Other Organizations";
      const matchesOrigin = selectedOrigin === "ALL" || origin === selectedOrigin;
      return matchesSearch && matchesOrigin;
    });
  }, [clubs, search, selectedOrigin]);

  const groupedClubs = useMemo(() => {
    return filteredClubs.reduce((acc, club) => {
      const origin = club.association_of_origin || "Other Organizations";
      if (!acc[origin]) acc[origin] = [];
      acc[origin].push(club);
      return acc;
    }, {} as Record<string, Club[]>);
  }, [filteredClubs]);

  const sortedOrigins = useMemo(() => {
    return Object.keys(groupedClubs).sort((a, b) => {
      const isBureauA = a.toLowerCase().includes("bureau");
      const isBureauB = b.toLowerCase().includes("bureau");
      if (isBureauA && !isBureauB) return -1;
      if (!isBureauA && isBureauB) return 1;
      return a.localeCompare(b);
    });
  }, [groupedClubs]);

  const handleSelectClub = async (club: Club) => {
    setSelectedClub(club);
    setLoadingDetails(true);
    try {
      const fullDetails = await fetchPublic(`/clubs/${club.id}`);
      if (fullDetails) setSelectedClub(fullDetails);
    } catch { /* keep basic state */ } finally {
      setLoadingDetails(false);
    }
  };

  const getOriginBadgeStyle = (origin?: string) => {
    if (!origin) return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700";
    const u = origin.toUpperCase();
    if (u.includes("BDE")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (u.includes("BDA")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (u.includes("ASINT") || u.includes("BDS")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">

      <PortalHeader
        icon={<Users className="w-4 h-4 text-emerald-500" />}
        badgeText="Student Life & Culture"
        title="Clubs & Orgs"
        subtitle="Explore active student associations, creative clubs, sports leagues, and governance boards operating on campus."
        accentColor="emerald"
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search clubs, sports, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 text-zinc-950 dark:text-stone-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm transition-all shadow-xs placeholder:text-zinc-400 dark:placeholder:text-stone-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:text-stone-500 dark:hover:text-stone-300 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {origins.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedOrigin("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer border ${
                selectedOrigin === "ALL"
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-stone-100 dark:text-zinc-950 dark:border-stone-100 shadow-xs"
                  : "bg-white/80 dark:bg-stone-900/80 border-zinc-200/80 dark:border-stone-800 text-zinc-600 dark:text-stone-400 hover:border-zinc-300 dark:hover:border-stone-700"
              }`}
            >
              All ({clubs.length})
            </button>
            {origins.map(origin => (
              <button
                key={origin}
                onClick={() => setSelectedOrigin(origin)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer border ${
                  selectedOrigin === origin
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white/80 dark:bg-stone-900/80 border-zinc-200/80 dark:border-stone-800 text-zinc-600 dark:text-stone-400 hover:border-zinc-300 dark:hover:border-stone-700"
                }`}
              >
                {origin}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">Loading associations...</span>
          </div>
        ) : error ? (
          <div className="bg-stone-50/90 dark:bg-stone-900/90 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-10 text-center max-w-md mx-auto">
            <AlertTriangle className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-stone-100">Telemetry Sync Failure</h3>
            <p className="text-zinc-500 dark:text-stone-400 text-xs font-mono mt-1">{error}</p>
          </div>
        ) : sortedOrigins.length === 0 ? (
          <div className="bg-stone-50/90 dark:bg-stone-900/90 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-12 text-center text-zinc-400 dark:text-stone-500 max-w-md mx-auto space-y-2">
            <Info className="w-8 h-8 mx-auto" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-stone-100">No Associations Found</h3>
            <p className="text-xs">No student clubs matched your current search filters.</p>
          </div>
        ) : (
          sortedOrigins.map(origin => {
            const originClubs = groupedClubs[origin].sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div key={origin} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-stone-800/80 pb-2.5">
                  <h2 className="text-xl font-extrabold uppercase tracking-wide text-zinc-950 dark:text-stone-50">{origin}</h2>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getOriginBadgeStyle(origin)}`}>
                    {originClubs.length} {originClubs.length === 1 ? "Club" : "Clubs"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {originClubs.map(club => {
                    const customColor = club.color_primary || "#f43f5e";
                    return (
                      <div
                        key={club.id}
                        onClick={() => handleSelectClub(club)}
                        className="group bg-white/80 dark:bg-stone-900/80 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 opacity-90 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: customColor }} />

                        <div className="space-y-3 pt-1">
                          <div className="flex items-start gap-3">
                            {club.logo_url ? (
                              <img src={club.logo_url} alt={club.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-zinc-200/80 dark:border-stone-700/60 shadow-2xs shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0 shadow-2xs" style={{ backgroundColor: customColor }}>
                                {club.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-extrabold text-zinc-950 dark:text-stone-50 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{club.name}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${getOriginBadgeStyle(club.association_of_origin)}`}>
                                  {club.association_of_origin || "Independent"}
                                </span>
                                {club.foyer_room && (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Local {club.foyer_room}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-zinc-700 dark:text-stone-300 text-xs leading-relaxed line-clamp-3">
                            {club.description || "No description provided."}
                          </p>
                        </div>

                        <div className="border-t border-zinc-100 dark:border-stone-800/80 pt-3 mt-4 flex justify-between items-center text-[11px] font-mono text-zinc-400 dark:text-stone-500">
                          <span className="lowercase truncate max-w-[120px]">@{club.slug || "general"}</span>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">Details →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedClub && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div onClick={() => setSelectedClub(null)} className="fixed inset-0 bg-stone-950/60 backdrop-blur-md transition-opacity" />
          <div className="relative w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh]">
            <div className="h-2 w-full shrink-0" style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }} />
            <button onClick={() => setSelectedClub(null)} className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200/80 dark:border-stone-800 text-zinc-400 hover:text-zinc-950 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 sm:p-10 overflow-y-auto space-y-8">
              <div className="flex items-center gap-6">
                {selectedClub.logo_url ? (
                  <img src={selectedClub.logo_url} alt={selectedClub.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white p-2 border border-zinc-200/80 dark:border-stone-700 shrink-0 shadow-xs" />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl text-white shrink-0 shadow-xs" style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }}>
                    {selectedClub.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-stone-50 leading-tight">{selectedClub.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md border ${getOriginBadgeStyle(selectedClub.association_of_origin)}`}>
                      {selectedClub.association_of_origin || "Independent"}
                    </span>
                    {selectedClub.type && (
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-700/80">{selectedClub.type}</span>
                    )}
                    {selectedClub.foyer_room && (
                      <span className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Foyer Local: {selectedClub.foyer_room}</span>
                    )}
                  </div>
                </div>
              </div>
              {selectedClub.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">About</h3>
                  <p className="text-zinc-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-line">{selectedClub.description}</p>
                </div>
              )}
              {selectedClub.links && selectedClub.links.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">Official Handles & Web</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClub.links.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200 border border-zinc-200/80 dark:border-stone-700/80 transition-all cursor-pointer">
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{link.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
