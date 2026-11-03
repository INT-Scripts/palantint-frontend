"use client";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";
import {readFloorPlan,type FloorPlan} from "@/lib/planGeometry";
import Link from "next/link";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { fetchPublic } from "@/lib/api";
import { MapPin, Layers, FileText, Users } from "lucide-react";
import { Box } from "@/components/ui/box";
import PageHeader from "@/components/PageHeader";

// Canvas/WebGL sizing breaks under SSR hydration — must be client-only.
const BuildingModel = dynamic(() => import("../apartments/components/BuildingModel"), { ssr: false });
import PalantintFloorSelector from "../components/PalantintFloorSelector";
import PalantintDirectoryPanel from "../components/PalantintDirectoryPanel";
import PalantintRoomList from "../components/PalantintRoomList";
import PalantintRoomDetailCard, { PalantintFoyerRoomDetail } from "../components/PalantintRoomDetailCard";
import PalantintClubModal from "../components/PalantintClubModal";
import {BuildingCatalogBoundary, useBuildingCatalog} from "@/components/BuildingCatalog";

function FoyerContent() {
    const {foyer: BUILDINGS, all: ALL_BUILDINGS} = useBuildingCatalog();
    const planAsset = (building: string, floor: string, kind: "geojson") => ALL_BUILDINGS[building]?.find(value=>value.value===floor)?.assets[kind] || "";
    const searchParams = useSearchParams();

    const [floor, setFloor] = useState("0");
    const [plan,setPlan] = useState<FloorPlan|null>(null);
    const [buildingPlans, setBuildingPlans] = useState<Record<string, FloorPlan>>({});
    const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});
    const [roomMap, setRoomMap] = useState<Record<string, PalantintFoyerRoomDetail>>({});
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Foyer Associatif — PalantINT";

        fetchPublic("/foyer/map")
            .then((data: Record<string, PalantintFoyerRoomDetail>) => {
                setRoomMap(data || {});
            })
            .catch(() => {
                fetch("/api/assets/clubs/foyer_map.json")
                    .then((r) => (r.ok ? r.json() : []))
                    .then((data: PalantintFoyerRoomDetail[]) => {
                        const map: Record<string, PalantintFoyerRoomDetail> = {};
                        (data || []).forEach((r) => {
                            map[r.room_id] = r;
                        });
                        setRoomMap(map);
                    })
                    .catch(() => {});
            })
            .finally(() => setLoading(false));
    }, []);

    // Deep-link support: /palantint/foyer?room=F0-5 (used by "Jump to location" from a club).
    useEffect(() => {
        const roomId = searchParams.get("room");
        if (!roomId || !roomMap[roomId]) return;
        setSelectedRoom(roomId);
        setFloor(roomMap[roomId].floor);
    }, [searchParams, roomMap]);

    useEffect(() => {
        const controller = new AbortController();
        fetch(planAsset("Foyer",floor,"geojson"), { signal: controller.signal })
            .then(readFloorPlan)
            .then((text) => {
                if (text !== undefined) {
                    setPlan(text);
                }
            })
            .catch((e) => {
                if (e.name !== "AbortError") setPlan(null);
            });
        return () => controller.abort();
    }, [floor]);

    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            const plans: Record<string, FloorPlan> = {};
            await Promise.all(
                BUILDINGS.Foyer.map(async (f) => {
                    try {
                        const res = await fetch(f.assets.geojson);
                        if (res.ok) {
                            plans[f.value] = await readFloorPlan(res);
                        }
                    } catch (e) {}
                })
            );
            if (isMounted) setBuildingPlans(plans);
        };
        fetchAll();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadMetadata = async () => {
            let meta: any = {};
            try {
                meta = await fetchPublic("/maps/Foyer/metadata");
            } catch { /* skip */ }
            if (isMounted) setBuildingMetadata(meta || {});
        };
        loadMetadata();
        return () => { isMounted = false; };
    }, []);

    const currentFloorRooms = Object.values(roomMap).filter(
        (r) => r.floor === floor || r.floor === `F${floor}`
    );

    const handleSelectFloor = (newFloor: string) => {
        setFloor(newFloor);
        setSelectedRoom(null);
    };

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-rose-500/30 font-sans">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[50%] bg-rose-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[40%] bg-rose-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-8">

                    <PageHeader
                        badgeText="Foyer Map // Active"
                        title1="Foyer"
                        title2="Associatif"
                        titleGradient="from-rose-400 to-rose-600"
                        subtitle="Cartographie des locaux associatifs — navigation interactive par étage."
                        colorName="rose"
                    />

                    <Link href={`/palantint/campus?building=${encodeURIComponent(Object.keys(BUILDINGS)[0] || "")}`} className="inline-block border border-campus-500/40 px-4 py-2 text-xs font-bold text-campus-400 hover:bg-campus-500/10">Voir le Foyer sur la carte géographique</Link>

                    {/* Building & Floor Selector (Top) */}
                    <PalantintFloorSelector
                        buildings={BUILDINGS}
                        activeBuilding="Foyer"
                        activeFloor={floor}
                        onSelectFloor={handleSelectFloor}
                        title="Étages — Foyer Associatif"
                        accentColor="rose"
                    />

                    {/* Main Map + Directory Panel Container (Exact matching height) */}
                    <div className="flex gap-6 flex-col lg:flex-row items-stretch relative">
                        {/* GeoJSON Map Box */}
                        <Box
                            className="flex-1 flex flex-col min-h-[580px] lg:min-h-[720px]"
                            icon={<MapPin className="w-4 h-4 text-rose-500" />}
                            title="Interactive Floor Map"
                            rightContent={
                                <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                        <span className="text-zinc-400">Standard</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-blue-600/80 border border-blue-500 inline-block" />
                                        <span className="text-zinc-300">Sélectionné</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-blue-500/55 border border-blue-400 inline-block" />
                                        <span className="text-zinc-300">Survol</span>
                                    </div>
                                </div>
                            }
                        >
                            <div
                                className="flex-1 flex flex-col overflow-hidden relative z-0 p-3 sm:p-5 w-full select-none items-center justify-center min-h-0"
                            >
                                <div className="w-full h-full flex-1 flex items-center justify-center min-h-0">
                                    <FloorPlanCanvas plan={plan?.metadata.floor === floor ? plan : null} selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} details={roomMap} />
                                </div>
                            </div>

                            {/* Tooltip */}


                            {/* Legend Footer */}
                            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400 shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                        <span className="text-zinc-200 font-bold">Standard</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-blue-600/80 border border-blue-500 inline-block" />
                                        <span className="text-zinc-200 font-bold">Sélectionné</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-blue-500/55 border border-blue-400 inline-block" />
                                        <span className="text-zinc-200 font-bold">Survol</span>
                                    </div>
                                </div>
                            </div>
                        </Box>

                        {/* Right Directory Panel Wrapper (Pinned strictly to Left Box height) */}
                        <div className="w-full lg:w-[420px] shrink-0 relative min-h-[450px] lg:min-h-0">
                            <PalantintDirectoryPanel
                                items={currentFloorRooms}
                                getId={(room) => room.room_id}
                                selectedId={selectedRoom}
                                onSelect={setSelectedRoom}
                                accentColor="rose"
                                loading={loading}
                                icon={Users}
                                title={`Locaux — ${BUILDINGS.Foyer.find((f) => f.value === floor)?.label || `F${floor}`}`}
                                countLabel="locaux"
                                emptyLabel="Aucun local pour cet étage."
                                renderDetail={(room, onClose) => (
                                    <PalantintRoomDetailCard
                                        room={room}
                                        onClose={onClose}
                                        onNavigateToClub={(clubId) => setSelectedClubId(clubId)}
                                    />
                                )}
                                renderList={(rooms) => (
                                    <PalantintRoomList rooms={rooms} selectedRoomId={selectedRoom} onSelectRoom={setSelectedRoom} />
                                )}
                            />
                        </div>
                    </div>

                    {/* Building & Floor Selector (Bottom) */}
                    <PalantintFloorSelector
                        buildings={BUILDINGS}
                        activeBuilding="Foyer"
                        activeFloor={floor}
                        onSelectFloor={handleSelectFloor}
                        title="Étages — Foyer Associatif"
                        accentColor="rose"
                    />

                    {/* Section 2: Building Wireframe & Reference GeoJSON */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-800/60">
                        <Box
                            className="h-[600px] p-1"
                            contentClassName="bg-zinc-950/20"
                            icon={<Layers className="w-4 h-4 text-rose-500" />}
                            title="Building Wireframe"
                        >
                            <BuildingModel
                                bldg="Foyer"
                                floors={BUILDINGS.Foyer}
                                activeFloor={floor}
                                buildingPlans={buildingPlans}
                                buildingMetadata={buildingMetadata}
                            />
                        </Box>


                    </div>
                </div>
            </main>

            <PalantintClubModal clubId={selectedClubId} onClose={() => setSelectedClubId(null)} />
        </div>
    );
}

export default function FoyerPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                    Loading assets...
                </div>
            }
        >
            <BuildingCatalogBoundary><FoyerContent /></BuildingCatalogBoundary>
        </Suspense>
    );
}
