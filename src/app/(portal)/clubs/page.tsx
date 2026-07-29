"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { Users, Search, Info, X, AlertTriangle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PortalFloorSelector from "../components/PortalFloorSelector";
import PortalClubCard, { Club } from "../components/PortalClubCard";
import PortalClubModal from "../components/PortalClubModal";
import { FOYER_BUILDINGS as BUILDINGS } from "@/lib/buildings";

export default function PublicClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  const [activeBuilding, setActiveBuilding] = useState<string>("Foyer");
  const [activeFloor, setActiveFloor] = useState<string>("ALL");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

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

      let matchesFloor = true;
      if (activeFloor !== "ALL") {
        if (!c.foyer_room) {
          matchesFloor = false;
        } else {
          const roomUpper = c.foyer_room.toUpperCase();
          matchesFloor = roomUpper.includes(`F${activeFloor}`) || roomUpper.startsWith(`F0${activeFloor}`) || roomUpper.startsWith(activeFloor);
        }
      }

      return matchesSearch && matchesOrigin && matchesFloor;
    });
  }, [clubs, search, selectedOrigin, activeFloor]);

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
    try {
      const fullDetails = await fetchPublic(`/clubs/${club.id}`);
      if (fullDetails) setSelectedClub(fullDetails);
    } catch { /* keep basic state */ }
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

      {/* Building & Floor Selector Filter Toolbar */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={setActiveBuilding}
        onSelectFloor={setActiveFloor}
        accentColor="emerald"
        title="Filtrer les Associations par Étage Foyer"
        showAllFloorsOption={true}
      />

      {/* Search & Origin Filter Toolbar */}
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
                  {originClubs.map(club => (
                    <PortalClubCard
                      key={club.id}
                      club={club}
                      onSelectClub={handleSelectClub}
                      getOriginBadgeStyle={getOriginBadgeStyle}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <PortalClubModal
        club={selectedClub}
        onClose={() => setSelectedClub(null)}
        getOriginBadgeStyle={getOriginBadgeStyle}
      />
    </section>
  );
}
