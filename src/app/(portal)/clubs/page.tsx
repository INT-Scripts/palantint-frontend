"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Users, Search, X, ExternalLink, Info, Globe, AlertTriangle
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

interface ClubLinkItem {
  name: string;
  url: string;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  association_of_origin: string | null; // e.g. "BDE", "BDA", "ASINT"
  type: string | null; // e.g. "Club", "Association"
  color_primary: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  links?: ClubLinkItem[];
}

// Origin badge styling with strong visual distinction
const getOriginBadgeStyle = (origin: string | null) => {
  if (!origin) return "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700";
  const lower = origin.toLowerCase();
  if (lower.includes("bde")) return "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60";
  if (lower.includes("bda")) return "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-900/60";
  if (lower.includes("asint") || lower.includes("bds") || lower.includes("sport")) return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60";
  if (lower.includes("mandrake") || lower.includes("tech")) return "bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/60";
  return "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60";
};

export default function PublicClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  useEffect(() => {
    const loadClubs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/clubs");
        setClubs(data || []);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load campus organization directory.");
      } finally {
        setLoading(false);
      }
    };
    loadClubs();
  }, []);

  // Fetch detail links when a club is selected
  const handleSelectClub = async (club: Club) => {
    setSelectedClub(club);
    try {
      const detailed = await fetchPublic(`/clubs/${club.id}`);
      if (detailed) {
        setSelectedClub(prev => prev && prev.id === club.id ? { ...prev, ...detailed } : prev);
      }
    } catch (err) {
      // Fallback to basic club data
    }
  };

  // List of unique parent origins for filter tabs
  const origins = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach(c => {
      if (c.association_of_origin) set.add(c.association_of_origin);
    });
    return Array.from(set).sort((a, b) => {
      if (a.toLowerCase().includes("bureau")) return -1;
      if (b.toLowerCase().includes("bureau")) return 1;
      return a.localeCompare(b);
    });
  }, [clubs]);

  // Filter clubs based on search & selected origin
  const filteredClubs = useMemo(() => {
    return clubs.filter(c => {
      const query = search.toLowerCase().trim();
      const matchesSearch = !query || (
        c.name.toLowerCase().includes(query) || 
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.association_of_origin && c.association_of_origin.toLowerCase().includes(query)) ||
        (c.type && c.type.toLowerCase().includes(query))
      );
      const origin = c.association_of_origin || "Other Organizations";
      const matchesOrigin = selectedOrigin === "ALL" || origin === selectedOrigin;
      return matchesSearch && matchesOrigin;
    });
  }, [clubs, search, selectedOrigin]);

  // Group filtered clubs by origin
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

  return (
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 relative z-10 space-y-8">
      
      {/* Title Header Reusing PortalHeader */}
      <PortalHeader
        icon={<Users className="w-4 h-4" />}
        badgeText="Student Life & Culture"
        title="Clubs & Orgs"
        subtitle="Explore active student associations, creative clubs, sports leagues, and governance boards operating on campus."
        accentColor="rose"
      />

      {/* Filter Toolbar: Search Bar + Origin Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search clubs, sports, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 text-zinc-950 dark:text-stone-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm transition-all shadow-xs placeholder:text-zinc-400 dark:placeholder:text-stone-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:text-stone-500 dark:hover:text-stone-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Origin Filter Tabs */}
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
            {origins.map(origin => {
              const isSelected = selectedOrigin === origin;
              return (
                <button
                  key={origin}
                  onClick={() => setSelectedOrigin(origin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer border ${
                    isSelected
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white/80 dark:bg-stone-900/80 border-zinc-200/80 dark:border-stone-800 text-zinc-600 dark:text-stone-400 hover:border-zinc-300 dark:hover:border-stone-700"
                  }`}
                >
                  {origin}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Grid: 3-Column Layout */}
      <div className="space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Loading associations...
            </span>
          </div>
        ) : error ? (
          <div className="bg-stone-50/90 dark:bg-stone-900/90 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-10 text-center max-w-md mx-auto">
            <AlertTriangle className="w-9 h-9 text-rose-500 mx-auto mb-3" />
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
                {/* Section Header */}
                <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-stone-800/80 pb-2.5">
                  <h2 className="text-xl font-extrabold uppercase tracking-wide text-zinc-950 dark:text-stone-50">
                    {origin}
                  </h2>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getOriginBadgeStyle(origin)}`}>
                    {originClubs.length} {originClubs.length === 1 ? "Club" : "Clubs"}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {originClubs.map(club => {
                    const customColor = club.color_primary || "#f43f5e";

                    return (
                      <div
                        key={club.id}
                        onClick={() => handleSelectClub(club)}
                        className="group bg-white/80 dark:bg-stone-900/80 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-5 hover:border-rose-400 dark:hover:border-rose-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Primary Color Accent Top Line */}
                        <div 
                          className="absolute top-0 left-0 w-full h-1 opacity-90 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: customColor }}
                        />

                        <div className="space-y-3 pt-1">
                          
                          {/* Header: Logo + Title + Badges */}
                          <div className="flex items-start gap-3">
                            {club.logo_url ? (
                              <img
                                src={club.logo_url}
                                alt={club.name}
                                className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-zinc-200/80 dark:border-stone-700/60 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0 shadow-2xs"
                                style={{ backgroundColor: customColor }}
                              >
                                {club.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-extrabold text-zinc-950 dark:text-stone-50 leading-snug group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
                                {club.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border ${getOriginBadgeStyle(club.association_of_origin)}`}>
                                  {club.association_of_origin || "Independent"}
                                </span>
                                {club.type && (
                                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-700/80">
                                    {club.type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Description Text */}
                          <p className="text-zinc-700 dark:text-stone-300 text-xs leading-relaxed line-clamp-3">
                            {club.description || "No description provided."}
                          </p>

                        </div>

                        {/* Card Footer */}
                        <div className="border-t border-zinc-100 dark:border-stone-800/80 pt-3 mt-4 flex justify-between items-center text-[11px] font-mono text-zinc-400 dark:text-stone-500">
                          <span className="lowercase truncate max-w-[120px]">
                            @{club.slug || "general"}
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
                            Details →
                          </span>
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

      {/* Larger Detail Modal (Without Warning) */}
      {selectedClub && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedClub(null)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-md transition-opacity" 
          />

          {/* Dialog Box: Larger Max Width & Padding */}
          <div className="relative w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] transition-all">
            
            {/* Header Color Accent Bar */}
            <div 
              className="h-2 w-full shrink-0"
              style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedClub(null)}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200/80 dark:border-stone-800 text-zinc-400 dark:text-stone-500 hover:text-zinc-950 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer z-10 shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-8 sm:p-10 overflow-y-auto space-y-8">
              
              {/* Header Box */}
              <div className="flex items-center gap-6">
                {selectedClub.logo_url ? (
                  <img
                    src={selectedClub.logo_url}
                    alt={selectedClub.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-contain bg-white p-2 border border-zinc-200/80 dark:border-stone-700 shrink-0 shadow-xs"
                  />
                ) : (
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }}
                  >
                    {selectedClub.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-0.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md border ${getOriginBadgeStyle(selectedClub.association_of_origin)}`}>
                      {selectedClub.association_of_origin || "Independent"}
                    </span>
                    {selectedClub.type && (
                      <span className="px-3 py-0.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-700">
                        {selectedClub.type}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-950 dark:text-stone-50 leading-tight">
                    {selectedClub.name}
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 dark:text-stone-500">
                    @{selectedClub.slug || "general"}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                  About the Organization
                </h4>
                <p className="text-zinc-800 dark:text-stone-200 text-base sm:text-lg leading-relaxed whitespace-pre-line">
                  {selectedClub.description || "This organization has not provided a description yet."}
                </p>
              </div>

              {/* External Links */}
              {((selectedClub.links && selectedClub.links.length > 0) || selectedClub.website_url || selectedClub.instagram_url || selectedClub.facebook_url) && (
                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-stone-800">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                    External Resources
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedClub.links && selectedClub.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold text-zinc-700 dark:text-stone-300 rounded-xl hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs"
                      >
                        <Globe className="w-4 h-4 text-rose-500" />
                        {link.name}
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                    ))}
                    {!selectedClub.links && selectedClub.website_url && (
                      <a
                        href={selectedClub.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold text-zinc-700 dark:text-stone-300 rounded-xl hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs"
                      >
                        <Globe className="w-4 h-4 text-rose-500" />
                        Website
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                    )}
                    {!selectedClub.links && selectedClub.instagram_url && (
                      <a
                        href={selectedClub.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold text-zinc-700 dark:text-stone-300 rounded-xl hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs"
                      >
                        Instagram
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                    )}
                    {!selectedClub.links && selectedClub.facebook_url && (
                      <a
                        href={selectedClub.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold text-zinc-700 dark:text-stone-300 rounded-xl hover:text-zinc-950 dark:hover:text-white transition-all shadow-2xs"
                      >
                        Facebook
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </a>
                    )}
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
