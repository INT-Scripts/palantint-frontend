"use client";
import {readFloorPlan,type FloorPlan} from "@/lib/planGeometry";

import { useEffect, useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { fetchPublic } from "@/lib/api";
import { Layers, FileText, Users } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "../apartments/components/PublicFloorViewer";
import PortalFloorSelector from "../components/PortalFloorSelector";

// Canvas/WebGL sizing breaks under SSR hydration — must be client-only.
const BuildingModel = dynamic(() => import("@/components/BuildingModel"), { ssr: false });
import PortalDirectoryPanel from "../components/PortalDirectoryPanel";
import FoyerRoomList from "../components/FoyerRoomList";
import FoyerRoomDetailCard, { FoyerRoomDetail } from "../components/FoyerRoomDetailCard";
import PortalClubModal, { ClubDetail } from "../components/PortalClubModal";
import {BuildingCatalogBoundary, useBuildingCatalog} from "@/components/BuildingCatalog";

function FoyerContent() {
    const {foyer: BUILDINGS} = useBuildingCatalog();
  const searchParams = useSearchParams();
  const [foyerMap, setFoyerMap] = useState<Record<string, FoyerRoomDetail>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [activeBuilding, setActiveBuilding] = useState<string>("Foyer");
  const [activeFloor, setActiveFloor] = useState<string>("0");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubDetail | null>(null);
  const [buildingPlans, setBuildingPlans] = useState<Record<string, FloorPlan>>({});
  const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});

  const handleOpenClub = async (clubId: string) => {
    try {
      const fullDetails = await fetchPublic(`/clubs/${clubId}`);
      if (fullDetails) setSelectedClub(fullDetails);
    } catch { /* ignore, keep panel state */ }
  };

  const getOriginBadgeStyle = (origin?: string) => {
    if (!origin) return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700";
    const u = origin.toUpperCase();
    if (u.includes("BDE")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (u.includes("BDA")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    if (u.includes("ASINT") || u.includes("BDS")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        let fMap: Record<string, FoyerRoomDetail> = {};
        try { fMap = await fetchPublic("/foyer/map"); } catch {
          const res = await fetch("/api/assets/clubs/foyer_map.json");
          if (res.ok) fMap = await res.json();
        }
        if (isMounted) setFoyerMap(fMap || {});
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  // Deep-link support: /foyer?room=F0-5 (used by "Jump to location" from a club).
  useEffect(() => {
    const roomId = searchParams.get("room");
    if (!roomId || !foyerMap[roomId]) return;
    setSelectedRoomId(roomId);
    setActiveFloor(foyerMap[roomId].floor);
  }, [searchParams, foyerMap]);

  useEffect(() => {
    const loadSvgs = async () => {
      const plans: Record<string, FloorPlan> = {};
      for (const f of BUILDINGS[activeBuilding] || []) {
        try {
          const res = await fetch(f.assets.geojson);
          if (res.ok) plans[f.value] = await readFloorPlan(res);
        } catch { /* skip */ }
      }
      setBuildingPlans(plans);
    };
    loadSvgs();
  }, [activeBuilding]);

  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      let meta: any = {};
      try {
        meta = await fetchPublic(`/maps/${activeBuilding}/metadata`);
      } catch { /* skip */ }
      if (isMounted) setBuildingMetadata(meta || {});
    };
    loadMetadata();
    return () => { isMounted = false; };
  }, [activeBuilding]);

  const foyerRoomsList = useMemo(() => Object.values(foyerMap), [foyerMap]);

  const currentFloorRooms = useMemo(() =>
    foyerRoomsList
      .filter(r => r.floor === activeFloor)
      .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true })),
    [foyerRoomsList, activeFloor]
  );

  const filteredRoomIds = useMemo(() => new Set(currentFloorRooms.map(r => r.room_id)), [currentFloorRooms]);

  const handleSelectBuilding = (b: string) => {
    setActiveBuilding(b);
    if (!BUILDINGS[b].find(f => f.value === activeFloor)) {
      setActiveFloor(BUILDINGS[b][0].value);
    }
  };

  const handleSelectFloor = (f: string) => {
    setActiveFloor(f);
    setSelectedRoomId(null);
  };

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
      <PortalHeader
        icon={<Layers className="w-4 h-4 text-rose-500" />}
        badgeText="Plans des Locaux Associatifs"
        title="Plan du foyer"
        subtitle="Les plans du foyer : survole une salle pour voir qui l’occupe, clique pour la sélectionner."
        accentColor="rose"
      />

      {/* Building & Floor Selector (Top) */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={handleSelectBuilding}
        onSelectFloor={handleSelectFloor}
        accentColor="rose"
      />

      {/* Two-column: GeoJSON Map (Left) + Room Directory (Right, exact matching height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 w-full flex flex-col">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={setSelectedRoomId}
            apartmentsMap={foyerMap}
          />
        </div>

        <div className="lg:col-span-5 w-full relative min-h-[450px] lg:min-h-0">
          <PortalDirectoryPanel
            items={currentFloorRooms}
            getId={(room) => room.room_id}
            selectedId={selectedRoomId}
            onSelect={setSelectedRoomId}
            loading={loading}
            accentColor="rose"
            icon={Users}
            title={`Répertoire Locaux — Étage ${activeFloor}`}
            countLabel="Locaux"
            emptyLabel="Aucun local pour cet étage."
            renderDetail={(room, onClose) => <FoyerRoomDetailCard room={room} onClose={onClose} onOpenClub={handleOpenClub} />}
            renderList={(rooms) => (
              <FoyerRoomList rooms={rooms} selectedRoomId={selectedRoomId} onSelectRoom={setSelectedRoomId} />
            )}
          />
        </div>
      </div>

      {/* Building & Floor Selector (Bottom) */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={handleSelectBuilding}
        onSelectFloor={handleSelectFloor}
        accentColor="rose"
      />

      {/* 3D Wireframe + Blueprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-200/80 dark:border-stone-800/80">
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs h-[500px] flex flex-col">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-500" />
            Bâtiment Foyer Wireframe 3D
          </h3>
          <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50">
            <BuildingModel bldg={activeBuilding} floors={BUILDINGS[activeBuilding] || []} activeFloor={activeFloor} buildingPlans={buildingPlans} buildingMetadata={buildingMetadata} />
          </div>
        </div>


      </div>

      <PortalClubModal
        club={selectedClub}
        onClose={() => setSelectedClub(null)}
        getOriginBadgeStyle={getOriginBadgeStyle}
      />
    </section>
  );
}

export default function PublicFoyerPage() {
  return (
    <Suspense fallback={null}>
      <BuildingCatalogBoundary><FoyerContent /></BuildingCatalogBoundary>
    </Suspense>
  );
}
