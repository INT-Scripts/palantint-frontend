"use client";
import {readFloorPlan,type FloorPlan} from "@/lib/planGeometry";

import { useEffect, useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { fetchPublic } from "@/lib/api";
import { Building2, Info, Users } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import PublicFloorViewer from "./components/PublicFloorViewer";
import PortalFloorSelector from "../components/PortalFloorSelector";

// Canvas/WebGL sizing breaks under SSR hydration — must be client-only.
const BuildingModel = dynamic(() => import("@/components/BuildingModel"), { ssr: false });
import PortalDirectoryPanel from "../components/PortalDirectoryPanel";
import ApartmentDetailCard from "./components/ApartmentDetailCard";
import ApartmentTable from "./components/ApartmentTable";
import {BuildingCatalogBoundary, useBuildingCatalog} from "@/components/BuildingCatalog";
import { Apartment, matchFloor } from "./types";

function ApartmentsContent() {
    const {housing: BUILDINGS} = useBuildingCatalog();
  const searchParams = useSearchParams();

  const [apartments, setApartments] = useState<Record<string, Apartment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialBuilding = searchParams.get("bldg")?.toUpperCase();
  const [activeBuilding, setActiveBuilding] = useState<string>(
    initialBuilding && BUILDINGS[initialBuilding] ? initialBuilding : "U7"
  );
  const [activeFloor, setActiveFloor] = useState<string>("1");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const [buildingPlans, setBuildingPlans] = useState<Record<string, FloorPlan>>({});
  const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadApartmentDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublic("/students/apartments/details");
        setApartments(data || {});
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load apartment details.");
      } finally {
        setLoading(false);
      }
    };
    loadApartmentDetails();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const plans: Record<string, FloorPlan> = {};
      if (BUILDINGS[activeBuilding]) {
        await Promise.all(BUILDINGS[activeBuilding].map(async (f) => {
          try {
            const res = await fetch(f.assets.geojson);
            if (res.ok) {
              plans[f.value] = await readFloorPlan(res);
            }
          } catch (e) {}
        }));
      }

      let meta: any = {};
      try {
        meta = await fetchPublic(`/maps/${activeBuilding}/metadata`);
      } catch(e) {}

      if (isMounted) {
        setBuildingPlans(plans);
        setBuildingMetadata(meta || {});
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [activeBuilding]);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const apt = apartments[roomId];
    if (apt) {
      if (apt.Bâtiment) {
        const b = apt.plan?.building || "";
        if (b !== activeBuilding && BUILDINGS[b]) {
          setActiveBuilding(b);
        }
      }
      const validFloors = (BUILDINGS[apt.plan?.building || activeBuilding] || []).map(f => f.value);
      let targetFloor: string | null = null;
      for (const f of validFloors) {
        if (matchFloor(apt, f)) {
          targetFloor = f;
          break;
        }
      }
      if (targetFloor && targetFloor !== activeFloor) {
        setActiveFloor(targetFloor);
      }
    }
  };

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

  const apartmentsList = useMemo(() => Object.values(apartments), [apartments]);

  const currentFloorApartments = useMemo(() => {
    return apartmentsList
      .filter(apt => apt.plan?.building === activeBuilding && matchFloor(apt, activeFloor))
      .sort((a, b) => a.Logement.localeCompare(b.Logement));
  }, [apartmentsList, activeBuilding, activeFloor]);

  const filteredRoomIds = useMemo(() => {
    return new Set(currentFloorApartments.map(a => a.Logement));
  }, [currentFloorApartments]);

  return (
    <section className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">

      {/* Title Header */}
      <PortalHeader
        icon={<Building2 className="w-4 h-4 text-amber-500" />}
        badgeText="Logements MAISEL"
        title="Plans et catalogue des logements"
        subtitle="Survole une chambre sur le plan pour voir sa surface et ses tarifs."
        accentColor="amber"
      />

      {/* Building & Floor Selector (Top) */}
      <PortalFloorSelector
        buildings={BUILDINGS}
        activeBuilding={activeBuilding}
        activeFloor={activeFloor}
        onSelectBuilding={handleSelectBuilding}
        onSelectFloor={handleSelectFloor}
        accentColor="amber"
      />

      {/* TWO-COLUMN LAYOUT GRID (Matching Right Panel Height to Left GeoJSON Map Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* LEFT COLUMN (GeoJSON Floor Map) */}
        <div className="lg:col-span-7 w-full flex flex-col">
          <PublicFloorViewer
            building={activeBuilding}
            floor={activeFloor}
            selectedRoomId={selectedRoomId}
            filteredRoomIds={filteredRoomIds}
            onSelectRoom={handleRoomSelect}
            apartmentsMap={apartments}
          />
        </div>

        {/* RIGHT COLUMN (Single Container Matching Map Height exactly via absolute inset) */}
        <div className="lg:col-span-5 w-full relative min-h-[450px] lg:min-h-0">
          <PortalDirectoryPanel
            items={currentFloorApartments}
            getId={(apt) => apt.Logement}
            selectedId={selectedRoomId}
            onSelect={(id) => (id ? handleRoomSelect(id) : setSelectedRoomId(null))}
            loading={loading}
            error={error}
            accentColor="amber"
            icon={Users}
            title={`Directory — ${activeBuilding} Étage ${activeFloor}`}
            countLabel="Logements"
            emptyLabel="Aucune donnée disponible pour cet étage."
            renderDetail={(apt, onClose) => (
              <ApartmentDetailCard apartment={apt} activeFloor={activeFloor} onClose={onClose} />
            )}
            renderList={(apts) => (
              <ApartmentTable apartments={apts} selectedRoomId={selectedRoomId} onSelectRoom={handleRoomSelect} />
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
        accentColor="amber"
      />

      {/* Section 2: Building Wireframe & Blueprint Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-200/80 dark:border-stone-800/80">
        <div className="bg-white dark:bg-stone-900 border-2 border-zinc-200/90 dark:border-stone-800 rounded-3xl p-5 shadow-xs h-[500px] flex flex-col">
          <h3 className="text-xs font-bold font-mono text-zinc-500 dark:text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            Bâtiment Wireframe 3D
          </h3>
          <div className="flex-1 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50">
            <BuildingModel
              bldg={activeBuilding}
              floors={BUILDINGS[activeBuilding] || []}
              activeFloor={activeFloor}
              buildingPlans={buildingPlans}
              buildingMetadata={buildingMetadata}
            />
          </div>
        </div>


      </div>

    </section>
  );
}

export default function PublicApartmentsPage() {
  return (
    <Suspense fallback={null}>
      <BuildingCatalogBoundary><ApartmentsContent /></BuildingCatalogBoundary>
    </Suspense>
  );
}

