"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Users, Search, X, ExternalLink, ShieldAlert, Info, Globe, AlertTriangle
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

interface Club {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  association_of_origin: string | null; // e.g. "BDE", "BDA"
  type: string | null; // e.g. "Club", "Association"
  color_primary: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
}

export default function PublicClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  // Filter clubs based on search input
  const filteredClubs = useMemo(() => {
    return clubs.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
      (c.association_of_origin && c.association_of_origin.toLowerCase().includes(search.toLowerCase()))
    );
  }, [clubs, search]);

  // Group clubs by parent association/origin
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
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 sm:py-16 relative z-10">
      
      {/* Title Header */}
      <div className="mb-10">
        <PortalHeader
          icon={<Users className="w-4 h-4" />}
          badgeText="Student Life & Culture"
          title="Clubs & Orgs"
          subtitle="Explore active student associations, creative clubs, sports leagues, and governance boards operating on campus."
          accentColor="rose"
        />
      </div>

      {/* Search Input bar */}
      <div className="relative w-full sm:max-w-md border-b border-zinc-200/80 dark:border-stone-800/80 pb-6 mb-12">
        <Search className="absolute left-3.5 top-1/3 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
        <input
          type="text"
          placeholder="Search clubs, sports, or topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-zinc-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/80 text-zinc-800 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 text-sm transition-all"
        />
      </div>

      {/* Main content grid */}
      <div className="space-y-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
              Loading association listings...
            </span>
          </div>
        ) : error ? (
          <div className="bg-stone-50/90 dark:bg-stone-900/90 border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">Telemetry Sync Failure</h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm font-mono mt-1">{error}</p>
          </div>
        ) : sortedOrigins.length === 0 ? (
          <div className="bg-stone-50/90 dark:bg-stone-900/90 border border-zinc-200/80 dark:border-stone-800/50 rounded-2xl p-16 text-center text-zinc-400 dark:text-stone-500">
            <Info className="w-10 h-10 mx-auto mb-3" />
            <h3 className="font-bold text-lg text-zinc-900 dark:text-stone-100">No Associations Found</h3>
            <p className="text-sm">No student clubs matched your currently applied search.</p>
          </div>
        ) : (
          sortedOrigins.map(origin => {
            const originClubs = groupedClubs[origin].sort((a, b) => a.name.localeCompare(b.name));
            return (
              <div key={origin} className="space-y-6">
                <div className="flex items-center gap-4 border-b border-zinc-200/80 dark:border-stone-800/60 pb-3">
                  <h2 className="text-xl font-bold uppercase tracking-wide text-zinc-900 dark:text-stone-100">
                    {origin}
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-950 px-2 py-0.5 border border-zinc-200/50 dark:border-stone-850 rounded-md">
                    COUNT: {originClubs.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {originClubs.map(club => {
                    const customColor = club.color_primary || "#f43f5e"; // default rose-500

                    return (
                      <div
                        key={club.id}
                        onClick={() => setSelectedClub(club)}
                        className="group border border-zinc-200/60 dark:border-stone-800/40 rounded-xl p-5 bg-white/40 dark:bg-stone-950/20 hover:border-zinc-300 dark:hover:border-stone-800 hover:shadow-sm transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                      >
                        {/* Color accent bar */}
                        <div 
                          className="absolute top-0 left-0 w-full h-[3px] opacity-70 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: customColor }}
                        />

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            {club.logo_url ? (
                              <img
                                src={club.logo_url}
                                alt={club.name}
                                className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-zinc-100"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-bold text-sm">
                                {club.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-stone-100 leading-tight group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                {club.name}
                              </h4>
                              {club.type && (
                                <span className="text-[9px] font-mono text-zinc-400 dark:text-stone-500 uppercase tracking-widest mt-0.5 block">
                                  {club.type}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-zinc-500 dark:text-stone-400 text-xs line-clamp-3 leading-relaxed">
                            {club.description || "No description provided."}
                          </p>
                        </div>

                        <div className="border-t border-zinc-100 dark:border-stone-850 pt-3 mt-5 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-stone-500">
                          <span>{club.slug || "General"}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold group-hover:translate-x-1 transition-transform">
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

      {/* Interactive Detail Drawer Dialog Overlay */}
      {selectedClub && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setSelectedClub(null)}
            className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Dialog Card Box */}
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800/80 rounded-2xl shadow-xl overflow-hidden z-10 flex flex-col max-h-[85vh] transition-all">
            
            {/* Header / Accent bar */}
            <div 
              className="h-1.5 w-full"
              style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedClub(null)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200/80 dark:border-stone-800/80 text-zinc-400 dark:text-stone-500 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-850 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Scrollable Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              
              {/* Profile card header */}
              <div className="flex items-center gap-4">
                {selectedClub.logo_url ? (
                  <img
                    src={selectedClub.logo_url}
                    alt={selectedClub.name}
                    className="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-zinc-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center font-bold text-2xl border border-rose-100/50">
                    {selectedClub.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 dark:text-stone-50">
                    {selectedClub.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded bg-stone-100 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border border-stone-200/50 dark:border-stone-850">
                      {selectedClub.association_of_origin || "Independent"}
                    </span>
                    {selectedClub.type && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/30">
                        {selectedClub.type}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                  About the Club
                </h4>
                <p className="text-zinc-600 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-line">
                  {selectedClub.description || "This organization has not provided a description yet."}
                </p>
              </div>

              {/* Links */}
              {(selectedClub.website_url || selectedClub.instagram_url || selectedClub.facebook_url) && (
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-stone-850">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                    External Resources
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedClub.website_url && (
                      <a
                        href={selectedClub.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-xs font-semibold text-zinc-700 dark:text-stone-300 rounded-lg hover:text-zinc-950 dark:hover:text-white transition-all"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedClub.instagram_url && (
                      <a
                        href={selectedClub.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-xs font-semibold text-zinc-700 dark:text-stone-300 rounded-lg hover:text-zinc-950 dark:hover:text-white transition-all"
                      >
                        Instagram
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedClub.facebook_url && (
                      <a
                        href={selectedClub.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-850 text-xs font-semibold text-zinc-700 dark:text-stone-300 rounded-lg hover:text-zinc-950 dark:hover:text-white transition-all"
                      >
                        Facebook
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Privacy Warning Guard */}
              <div className="flex gap-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold block uppercase tracking-wide">
                    Student Privacy Shield
                  </span>
                  <p className="leading-normal">
                    Roster lists, office roles, and membership details are hidden to protect student privacy.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </section>
  );
}
