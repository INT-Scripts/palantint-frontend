"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPublic } from "@/lib/api";
import { 
  Building2, AlertTriangle, X,
  Layers, FileText, Users, MapPin, ExternalLink, ShieldCheck
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "../apartments/components/PublicFloorViewer";
import BuildingModel from "@/app/(palantint)/palantint/apartments/components/BuildingModel";

const BUILDINGS: Record<string, { label: string; value: string }[]> = {
  Foyer: [{ label: "Rez-de-chaussée (F0)", value: "0" }, { label: "1er Étage (F1)", value: "1" }],
};

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

export default function FoyerClubsPage() {
  const [activeBuilding, setActiveBuilding] = useState<string>("Foyer");
  const [activeFloor, setActiveFloor] = useState<string>("0");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [foyerMap, setFoyerMap] = useState<Record<string, FoyerRoomDetail>>({});
  const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch foyer map metadata (room_id -> club metadata)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        let data: Record<string, FoyerRoomDetail> = {};
        try {
          data = await fetchPublic("/foyer/map");
        } catch {
          const res = await fetch("/api/assets/clubs/foyer_map.json");
          if (res.ok) data = await res.json();
        }
        if (isMounted) {
          setFoyerMap(data || {});
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Impossible de charger la carte du foyer.");
          setLoading(false);
        }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Fetch SVG files for 3D BuildingModel stack
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

  const foyerRoomsList = useMemo(() => Object.values(foyerMap), [foyerMap]);

  // All foyer rooms on active floor having assigned club data
  const currentFloorRooms = useMemo(() => {
    return foyerRoomsList
      .filter(r => r.floor === activeFloor)
      .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }));
  }, [foyerRoomsList, activeFloor]);

  const filteredRoomIds = useMemo(() => {
    return new Set(currentFloorRooms.map(r => r.room_id));
  }, [currentFloorRooms]);

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
      
      {/* Title Header */}
      <PortalHeader
        icon={<Building2 className="w-4 h-4 text-amber-500" />}
        badgeText="Plan des Locaux Associatifs"
        title="Interactive Club Foyer Map"
        subtitle="Survolez les locaux du Foyer associatif pour consulter l'attribution des clubs, les bureaux et les espaces dédiés."
        accentColor="amber"
      />

      {/* Control Bar: Building & Floor Selectors */}
      <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/80 dark:border-stone-800/80 bg-stone-50/80 dark:bg-stone-950/60">
          <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-500" />
            Sélection du Bâtiment & Étage
          </h3>
          <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase tracking-widest font-bold hidden sm:inline">
            Sélection: <span className="text-zinc-950 dark:text-stone-100">{activeBuilding} — {BUILDINGS[activeBuilding]?.find(f => f.value === activeFloor)?.label || activeFloor}</span>
          </span>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Building Selector */}
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
                        ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                        : "bg-stone-100 dark:bg-stone-800/60 text-zinc-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Floor Buttons */}
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

      {/* TWO-COLUMN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (SVG Floor Map) */}
        <div className="lg:col-span-7 w-full">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={(roomId) => setSelectedRoomId(roomId)}
            apartmentsMap={foyerMap}
          />
        </div>

        {/* RIGHT COLUMN (Selected Room / Club Specs Card + Directory List) */}
        <div className="lg:col-span-5 w-full space-y-6">
          
          {/* Selected Foyer Room Specs Card */}
          {selectedRoomId && foyerMap[selectedRoomId] && (() => {
            const detail = foyerMap[selectedRoomId];
            return (
              <div className="bg-white dark:bg-stone-900 border-2 border-amber-500/80 rounded-3xl p-5 shadow-sm transition-all space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-stone-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-lg font-extrabold font-mono text-zinc-950 dark:text-stone-50">
                      Local {selectedRoomId}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-amber-500 text-white shadow-2xs">
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
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base block">
                      {detail.club_name || detail.raw_name || "Non attribué"}
                    </span>
                    {detail.association_of_origin && (
                      <span className="text-xs text-zinc-500 dark:text-stone-400 mt-1 block">
                        Tutelle: {detail.association_of_origin}
                      </span>
                    )}
                  </div>

                  {detail.description && (
                    <div className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl border border-zinc-200/80 dark:border-stone-800 text-xs text-zinc-600 dark:text-stone-400">
                      {detail.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Directory of All Foyer Rooms on Floor */}
          <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl overflow-hidden shadow-sm min-h-[450px] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200/80 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
              <h3 className="text-[10px] font-black font-mono text-zinc-600 dark:text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                <Users className="w-4 h-4 text-amber-500" />
                Répertoire — Foyer Étage {activeFloor}
              </h3>
              <span className="text-[10px] font-mono text-zinc-500 dark:text-stone-500 uppercase tracking-widest font-bold">
                {currentFloorRooms.length} Locaux
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs text-zinc-400 dark:text-stone-500 uppercase tracking-widest">
                    Chargement des locaux...
                  </span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2 flex-1">
                  <AlertTriangle className="w-9 h-9 text-rose-500" />
                  <h3 className="font-bold text-base text-zinc-900 dark:text-stone-100">Erreur</h3>
                  <p className="text-zinc-500 dark:text-stone-400 text-xs font-mono">{error}</p>
                </div>
              ) : currentFloorRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2 flex-1">
                  <MapPin className="w-9 h-9 text-zinc-300 dark:text-stone-700" />
                  <h3 className="font-bold text-sm text-zinc-700 dark:text-stone-300">Aucun local</h3>
                  <p className="text-zinc-400 dark:text-stone-500 text-xs font-mono">
                    Aucune donnée disponible pour cet étage.
                  </p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {currentFloorRooms.map((room) => {
                    const isSelected = selectedRoomId === room.room_id;
                    return (
                      <div
                        key={room.room_id}
                        onClick={() => setSelectedRoomId(room.room_id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer font-mono flex items-center justify-between ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs"
                            : "bg-stone-50/70 dark:bg-stone-950/50 border-zinc-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-zinc-800 dark:text-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
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

      {/* Section 2: Foyer Building Wireframe 3D */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-200/80 dark:border-stone-800/80">
        
        {/* 3D Wireframe */}
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[600px] flex flex-col">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
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

        {/* Foyer Blueprint SVG Vector Direct Viewer */}
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-sm h-[600px] flex flex-col relative">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
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

    </section>
  );
}
