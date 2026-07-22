"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Users, Search, Info, ExternalLink, X, AlertTriangle, 
  Building2, Layers, FileText, MapPin
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "../apartments/components/PublicFloorViewer";
import BuildingModel from "@/app/(palantint)/palantint/apartments/components/BuildingModel";

const BUILDINGS: Record<string, { label: string; value: string }[]> = {
  Foyer: [{ label: "Rez-de-chaussée (F0)", value: "0" }, { label: "1er Étage (F1)", value: "1" }],
};

interface ClubLink {
  name: string;
  url: string;
}

interface ClubEvent {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  room?: string;
  description?: string;
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
  color_secondary?: string;
  foyer_room?: string;
  links?: ClubLink[];
  events?: ClubEvent[];
}

interface FoyerRoomDetail {
  room_id: string;
  raw_name: string;
  club_name: string;
  club_id?: string | null;
  logo_url?: string | null;
  description?: string | null;
  type?: string | null;
  association_of_origin?: string | null;
  floor: string;
  building: string;
}

export default function PublicClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [foyerMap, setFoyerMap] = useState<Record<string, FoyerRoomDetail>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map floor selection states
  const [activeBuilding, setActiveBuilding] = useState<string>("Foyer");
  const [activeFloor, setActiveFloor] = useState<string>("0");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});

  // Filter toolbar states
  const [search, setSearch] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("ALL");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Fetch all clubs and foyer map
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/clubs");
        if (isMounted) setClubs(data || []);

        let fMap: Record<string, FoyerRoomDetail> = {};
        try {
          fMap = await fetchPublic("/foyer/map");
        } catch {
          const res = await fetch("/api/assets/clubs/foyer_map.json");
          if (res.ok) fMap = await res.json();
        }
        if (isMounted) setFoyerMap(fMap || {});
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load clubs registry.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();
    return () => { isMounted = false; };
  }, []);

  // Load SVG plan files for active floor & 3D model
  useEffect(() => {
    const loadBuildingSvgs = async () => {
      const svgs: Record<string, string> = {};
      const floors = BUILDINGS[activeBuilding] || [];
      for (const f of floors) {
        try {
          const res = await fetch(`/api/assets/plans/${activeBuilding}_${f.value}.svg`);
          if (res.ok) {
            svgs[f.value] = await res.text();
          }
        } catch (e) {
          console.error(e);
        }
      }
      setBuildingSvgs(svgs);
    };

    loadBuildingSvgs();
  }, [activeBuilding]);

  // List of unique associations of origin
  const origins = useMemo(() => {
    const set = new Set<string>();
    clubs.forEach((c) => {
      if (c.association_of_origin) set.add(c.association_of_origin);
    });
    return Array.from(set).sort();
  }, [clubs]);

  // Filtered clubs based on search input & origin selection
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

  const foyerRoomsList = useMemo(() => Object.values(foyerMap), [foyerMap]);

  const currentFloorRooms = useMemo(() => {
    return foyerRoomsList
      .filter(r => r.floor === activeFloor)
      .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }));
  }, [foyerRoomsList, activeFloor]);

  const filteredRoomIds = useMemo(() => {
    return new Set(currentFloorRooms.map(r => r.room_id));
  }, [currentFloorRooms]);

  // Handle detailed modal lookup
  const handleSelectClub = async (club: Club) => {
    setSelectedClub(club);
    setLoadingDetails(true);
    try {
      const fullDetails = await fetchPublic(`/clubs/${club.id}`);
      if (fullDetails) setSelectedClub(fullDetails);
    } catch {
      // Keep basic club state if detail fetch fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const getOriginBadgeStyle = (origin?: string) => {
    if (!origin) return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700";
    const u = origin.toUpperCase();
    if (u.includes("BDE")) return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    if (u.includes("BDA")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (u.includes("ASINT") || u.includes("BDS")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-10">
      
      {/* Title Header Reusing PortalHeader (Rose Signature Theme) */}
      <PortalHeader
        icon={<Users className="w-4 h-4 text-rose-500" />}
        badgeText="Student Life & Culture"
        title="Clubs & Orgs"
        subtitle="Explore active student associations, creative clubs, sports leagues, and governance boards operating on campus."
        accentColor="rose"
      />

      {/* TOP SECTION: INTERACTIVE FOYER VECTOR MAP & 3D BUILDING MODEL */}
      <div className="space-y-6">
        
        {/* Control Bar: Building & Floor Selectors */}
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/80 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-950/60">
            <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-rose-500" />
              Plans des Locaux du Foyer Associatif
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase tracking-widest font-bold hidden sm:inline">
              Sélection: <span className="text-zinc-950 dark:text-stone-100">{activeBuilding} — {BUILDINGS[activeBuilding]?.find(f => f.value === activeFloor)?.label || activeFloor}</span>
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
                  Bâtiment:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(BUILDINGS).map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setActiveBuilding(b);
                        if (!BUILDINGS[b].find(f => f.value === activeFloor)) {
                          setActiveFloor(BUILDINGS[b][0].value);
                        }
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                        activeBuilding === b
                          ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
                          : "bg-stone-100 dark:bg-stone-800/60 text-zinc-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 dark:text-stone-500 uppercase tracking-wider">
                  Étage:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(BUILDINGS[activeBuilding] || []).map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setActiveFloor(f.value); setSelectedRoomId(null); }}
                      className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer ${
                        activeFloor === f.value
                          ? "bg-zinc-950 dark:bg-stone-100 text-white dark:text-zinc-950 shadow-sm"
                          : "bg-stone-100 dark:bg-stone-800/60 text-zinc-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* TWO-COLUMN FOYER MAP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SVG Floor Map */}
          <div className="lg:col-span-7 w-full">
            <PublicFloorViewer
              building={activeBuilding}
              floor={activeFloor}
              selectedRoomId={selectedRoomId}
              filteredRoomIds={filteredRoomIds}
              onSelectRoom={(roomId) => {
                setSelectedRoomId(roomId);
                const roomInfo = foyerMap[roomId];
                if (roomInfo?.club_name) {
                  const matched = clubs.find(c => c.name.toLowerCase() === roomInfo.club_name.toLowerCase());
                  if (matched) handleSelectClub(matched);
                }
              }}
              apartmentsMap={foyerMap}
            />
          </div>

          {/* RIGHT Directory Panel of Foyer Rooms */}
          <div className="lg:col-span-5 w-full space-y-6">
            
            {/* Selected Foyer Room Specs Card */}
            {selectedRoomId && foyerMap[selectedRoomId] && (() => {
              const detail = foyerMap[selectedRoomId];
              return (
                <div className="bg-white dark:bg-stone-900 border-2 border-rose-500/80 rounded-3xl p-5 shadow-sm transition-all space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                      <h3 className="text-lg font-extrabold font-mono text-zinc-950 dark:text-stone-50">
                        Local {selectedRoomId}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-rose-600 text-white shadow-2xs">
                        {detail.type || "Club"}
                      </span>
                      <button
                        onClick={() => setSelectedRoomId(null)}
                        title="Désélectionner"
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono">
                    <div className="bg-stone-50 dark:bg-stone-950 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-stone-800">
                      <span className="text-[10px] text-zinc-400 dark:text-stone-500 uppercase block mb-1 font-bold">
                        Club / Entité occupante
                      </span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 text-base block">
                        {detail.club_name || detail.raw_name || "Non attribué"}
                      </span>
                      {detail.association_of_origin && (
                        <span className="text-xs text-zinc-500 dark:text-stone-400 mt-1 block">
                          Tutelle: {detail.association_of_origin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Directory List of Foyer Rooms */}
            <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm min-h-[450px] flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
                <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-rose-500" />
                  Répertoire Locaux Foyer Étage {activeFloor}
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase tracking-widest font-bold">
                  {currentFloorRooms.length} Locaux
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                {currentFloorRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2 flex-1">
                    <MapPin className="w-9 h-9 text-zinc-300 dark:text-stone-700" />
                    <h3 className="font-bold text-sm text-zinc-700 dark:text-stone-300">Aucun local</h3>
                  </div>
                ) : (
                  <div className="max-h-[450px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                    {currentFloorRooms.map((room) => {
                      const isSelected = selectedRoomId === room.room_id;
                      return (
                        <div
                          key={room.room_id}
                          onClick={() => {
                            setSelectedRoomId(room.room_id);
                            if (room.club_name) {
                              const matched = clubs.find(c => c.name.toLowerCase() === room.club_name.toLowerCase());
                              if (matched) handleSelectClub(matched);
                            }
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer font-mono flex items-center justify-between ${
                            isSelected
                              ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs"
                              : "bg-stone-50/70 dark:bg-stone-950/50 border-zinc-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                            <div className="truncate">
                              <span className="font-extrabold text-sm block tracking-wider">
                                {room.room_id}
                              </span>
                              <span className="text-xs text-zinc-500 dark:text-stone-400 truncate block">
                                {room.club_name || room.raw_name || "Non attribué"}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-zinc-600 dark:text-stone-300 uppercase shrink-0">
                            {room.type || "Club"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* 3D Wireframe Building Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-200/80 dark:border-stone-800/80">
          <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[500px] flex flex-col">
            <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              Bâtiment Foyer Wireframe 3D
            </h3>
            <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50">
              <BuildingModel
                bldg={activeBuilding}
                floors={BUILDINGS[activeBuilding] || []}
                activeFloor={activeFloor}
                buildingSvgs={buildingSvgs}
                buildingMetadata={{}}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[500px] flex flex-col relative">
            <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-500" />
              Plan Vectoriel de Référence
            </h3>
            <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50 flex items-center justify-center relative p-6">
              <a href={`/api/assets/plans/Foyer_${activeFloor}.svg`} target="_blank" rel="noopener noreferrer" className="absolute inset-0 p-4">
                <img 
                  src={`/api/assets/plans/Foyer_${activeFloor}.svg`} 
                  alt="Foyer Plan" 
                  className="w-full h-full object-contain brightness-90 saturate-[0.8] contrast-125 hover:brightness-110 transition-all dark:invert" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
                />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: FULL ROSE-THEMED CLUB CATALOG GRID & SEARCH */}
      <div className="pt-8 border-t border-zinc-200/80 dark:border-stone-800/80 space-y-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-zinc-950 dark:text-stone-50 tracking-tight">
            Annuaire des Clubs & Associations ({filteredClubs.length})
          </h2>

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

        {/* Main Content Grid: Grouped Cards Layout */}
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
                  <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-stone-800/80 pb-2.5">
                    <h2 className="text-xl font-extrabold uppercase tracking-wide text-zinc-950 dark:text-stone-50">
                      {origin}
                    </h2>
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
                          className="group bg-white/80 dark:bg-stone-900/80 border border-zinc-200/80 dark:border-stone-800 rounded-2xl p-5 hover:border-rose-400 dark:hover:border-rose-500/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                        >
                          <div 
                            className="absolute top-0 left-0 w-full h-1 opacity-90 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: customColor }}
                          />

                          <div className="space-y-3 pt-1">
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
                                  {club.foyer_room && (
                                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
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
      </div>

      {/* Larger Detail Modal */}
      {selectedClub && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div 
            onClick={() => setSelectedClub(null)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-md transition-opacity" 
          />

          <div className="relative w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-stone-900 border border-zinc-200/80 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] transition-all">
            
            <div 
              className="h-2 w-full shrink-0"
              style={{ backgroundColor: selectedClub.color_primary || "#f43f5e" }}
            />

            <button
              onClick={() => setSelectedClub(null)}
              className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200/80 dark:border-stone-800 text-zinc-400 dark:text-stone-500 hover:text-zinc-950 dark:hover:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer z-10 shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 sm:p-10 overflow-y-auto space-y-8">
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

                <div className="space-y-1.5 min-w-0 flex-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-stone-50 leading-tight">
                    {selectedClub.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md border ${getOriginBadgeStyle(selectedClub.association_of_origin)}`}>
                      {selectedClub.association_of_origin || "Independent"}
                    </span>
                    {selectedClub.type && (
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-700/80">
                        {selectedClub.type}
                      </span>
                    )}
                    {selectedClub.foyer_room && (
                      <span className="px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Foyer Local: {selectedClub.foyer_room}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedClub.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">
                    About
                  </h3>
                  <p className="text-zinc-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-line">
                    {selectedClub.description}
                  </p>
                </div>
              )}

              {selectedClub.links && selectedClub.links.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase text-zinc-400 dark:text-stone-500 tracking-wider">
                    Official Handles & Web
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedClub.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200 border border-zinc-200/80 dark:border-stone-700/80 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
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
