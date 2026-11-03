"use client";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";
import {readFloorPlan,type FloorPlan} from "@/lib/planGeometry";

import { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPrivate, fetchPublic } from "@/lib/api";
import {
    MapPin, Users
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Box } from "@/components/ui/box";

// Canvas/WebGL sizing breaks under SSR hydration — must be client-only.
const BuildingModel = dynamic(() => import("./components/BuildingModel"), { ssr: false });
import PalantintDirectoryPanel from "../components/PalantintDirectoryPanel";
import PalantintApartmentDetailCard from "./components/PalantintApartmentDetailCard";
import PalantintApartmentList from "./components/PalantintApartmentList";
import {BuildingCatalogBoundary, useBuildingCatalog} from "@/components/BuildingCatalog";

function ApartmentsContent() {
    const {housing: BUILDINGS, all: ALL_BUILDINGS} = useBuildingCatalog();
    const planAsset = (building: string, floor: string, kind: "geojson") => ALL_BUILDINGS[building]?.find(value=>value.value===floor)?.assets[kind] || "";
    const router = useRouter();
    const searchParams = useSearchParams();

    const [bldg, setBldg] = useState("U7");
    const [floor, setFloor] = useState("1");
    const [occupied, setOccupied] = useState<Record<string, any>>({});
    const [apartmentsDetails, setApartmentsDetails] = useState<Record<string, any>>({});
    const [search, setSearch] = useState("");
    const [plan,setPlan] = useState<FloorPlan|null>(null);
    const [buildingPlans, setBuildingPlans] = useState<Record<string, FloorPlan>>({});
    const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Apartments";

        const bldgQ = searchParams.get("bldg");
        const floorQ = searchParams.get("floor");

        if (bldgQ && BUILDINGS[bldgQ.toUpperCase()]) {
            setBldg(bldgQ.toUpperCase());
            if (floorQ && BUILDINGS[bldgQ.toUpperCase()].find(f => f.value === floorQ)) {
                setFloor(floorQ);
            }
        }

        const roomQ = searchParams.get("room");
        if (roomQ) {
            const cleanRoom = roomQ.replace(/\D/g, "");
            if (cleanRoom.length === 4) {
                setSearch(cleanRoom);
                setSelectedRoom(cleanRoom);


            }
        }

        fetchPublic("/students/apartments/details")
            .then(data => {
                setApartmentsDetails(data || {});
                const plan = roomQ ? data?.[roomQ.replace(/\D/g, "")]?.plan : null;
                if (plan && BUILDINGS[plan.building]?.some(floor=>floor.value===plan.floor)) {
                    setBldg(plan.building); setFloor(plan.floor);
                }
            })
            .catch(console.error);

        fetchPrivate("/students/apartments/occupied")
            .then(data => {
                setOccupied(data || {});
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [searchParams]);

    useEffect(() => {
        const controller = new AbortController();
        fetch(planAsset(bldg,floor,"geojson"), { signal: controller.signal })
            .then(readFloorPlan)
            .then(text => {
                if (text !== undefined) {
                    setPlan(text);
                }
            })
            .catch(e => { if (e.name !== "AbortError") setPlan(null); });
        return () => controller.abort();
    }, [bldg, floor]);

    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            const plans: Record<string, FloorPlan> = {};
            await Promise.all(BUILDINGS[bldg].map(async (f) => {
                try {
                    const res = await fetch(f.assets.geojson);
                    if (res.ok) {
                        plans[f.value] = await readFloorPlan(res);
                    }
                } catch (e) {}
            }));

            const meta = await fetchPrivate(`/maps/${bldg}/metadata`);

            if (isMounted) {
                setBuildingPlans(plans);
                setBuildingMetadata(meta || {});
            }
        };
        fetchAll();
        return () => { isMounted = false; };
    }, [bldg]);

    const belongsToCurrentView = (aptNum: string) => {
        const plan = apartmentsDetails[aptNum]?.plan;
        return plan?.building === bldg && plan?.floor === floor;
    };

    // All rooms for this building/floor, occupied or not — vacancy is shown
    // via the GeoJSON map coloring and the empty "Occupants" section in the
    // detail popup, not by hiding the room from the list.
    const currentViewApts = Object.keys(apartmentsDetails)
        .filter(belongsToCurrentView)
        .sort((a, b) => Number(a) - Number(b));

    const getBuildingResidentCount = useCallback((building: string) => Object.keys(occupied).filter(room=>apartmentsDetails[room]?.plan?.building===building).length, [occupied,apartmentsDetails]);
    const getFloorResidentCount = useCallback((building: string, floor: string) => Object.keys(occupied).filter(room=>apartmentsDetails[room]?.plan?.building===building && apartmentsDetails[room]?.plan?.floor===floor).length, [occupied,apartmentsDetails]);

    const renderSelectors = () => {
        const ControlBox = ({ label, currentLabel, currentValue, children, className = "" }: any) => (
            <div className={`p-3.5 space-y-2.5 ${className}`}>
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                    <label className="text-[10px] font-extrabold font-mono text-zinc-400 uppercase tracking-widest">{label}</label>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden sm:block">
                        {currentLabel}: <span className="text-white font-black">{currentValue}</span>
                    </span>
                </div>
                <div className="pt-0.5">{children}</div>
            </div>
        );

        const ControlButton = ({ active, onClick, label, count, className = "" }: any) => (
            <button
                type="button"
                onClick={onClick}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono border transition-all cursor-pointer ${
                    active
                        ? "bg-housing-500/20 text-white border-housing-500 shadow-sm shadow-housing-500/20"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-700"
                } ${className}`}
            >
                <span>{label}</span>
                <span className={`text-[9px] font-mono font-normal opacity-70 ${active ? "text-housing-300" : "text-zinc-500"}`}>({count})</span>
            </button>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-zinc-900/50 border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-3xl rounded-none">
                <ControlBox label="Bâtiments" currentLabel="Selection" currentValue={bldg} className="col-span-12 md:col-span-5 lg:col-span-4 xl:col-span-5">
                    <div className="flex flex-wrap gap-1.5">
                        {Object.keys(BUILDINGS).map(b => (
                            <ControlButton key={b} active={bldg === b} onClick={() => {
                                setBldg(b);
                                if (!BUILDINGS[b].find(f => f.value === floor)) {
                                    setFloor(BUILDINGS[b][0].value);
                                }
                            }} label={b} count={getBuildingResidentCount(b)} />
                        ))}
                    </div>
                </ControlBox>
                <ControlBox
                    label="Étages"
                    currentLabel="Selection"
                    currentValue={BUILDINGS[bldg].find(f => f.value === floor)?.label || floor}
                    className="col-span-12 md:col-span-7 lg:col-span-8 xl:col-span-7 border-t md:border-t-0 md:border-l border-zinc-800"
                >
                    <div className="flex flex-wrap gap-1.5">
                        {BUILDINGS[bldg].map(f => (
                            <ControlButton key={f.value} active={floor === f.value} onClick={() => { setFloor(f.value); setSelectedRoom(null); }} label={f.label} count={getFloorResidentCount(bldg, f.value)} />
                        ))}
                    </div>
                </ControlBox>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-housing-500/30 font-sans">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[50%] bg-housing-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[40%] bg-comms-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-8">

                    <PageHeader
                        badgeText="Thermal radar // Active"
                        title1="Residential"
                        title2="Overview"
                        titleGradient="from-housing-400 to-housing-600"
                        subtitle="Centralized mapping for student apartment assets."
                        colorName="housing"
                        searchPlaceholder="QUERY: APARTMENT NUMBER"
                        searchValue={search}
                        onSearchChange={(v) => {
                            setSearch(v);
                            const val = v.trim().replace(/\D/g, "");
                            if (val.length === 4) {
                                setSelectedRoom(val);
                                const plan = apartmentsDetails[val]?.plan;
                                if (plan && BUILDINGS[plan.building]?.some(floor=>floor.value===plan.floor)) {
                                    setBldg(plan.building); setFloor(plan.floor);
                                }

                            }
                        }}
                    />

                    <button onClick={() => router.push(`/palantint/campus?building=${encodeURIComponent(bldg)}${selectedRoom ? `&room=${encodeURIComponent(selectedRoom)}` : ""}`)} className="w-fit border border-campus-500/40 px-4 py-2 text-xs font-bold text-campus-400 hover:bg-campus-500/10">Voir ce bâtiment sur la carte géographique</button>

                    {/* Building & Floor Selector (Top) */}
                    {renderSelectors()}

                    {/* Main Map + Directory Panel Container */}
                    <div className="flex gap-6 flex-col lg:flex-row items-stretch relative">
                        <Box
                            className="flex-1 flex flex-col min-h-[580px] lg:min-h-[720px]"
                            icon={<MapPin className="w-4 h-4 text-housing-500" />}
                            title="Interactive Floor Map"
                            rightContent={
                                <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-orange-500/32 border border-orange-500 inline-block" />
                                        <span className="text-zinc-300">Occupé</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                        <span className="text-zinc-400">Vacant</span>
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
                                    <FloorPlanCanvas plan={plan?.metadata.building === bldg && plan.metadata.floor === floor ? plan : null} selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} details={apartmentsDetails} occupied={occupied} />
                                </div>
                            </div>



                            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400 shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-orange-500/32 border border-orange-500 inline-block" />
                                        <span className="text-zinc-200 font-bold">Occupé (Orange)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                        <span className="text-zinc-200 font-bold">Vacant</span>
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
                                items={currentViewApts}
                                getId={(apt) => apt}
                                selectedId={selectedRoom}
                                onSelect={(id) => { setSelectedRoom(id); setSearch(id || ""); }}
                                accentColor="housing"
                                resolveDetailItem={(id) => (apartmentsDetails[id] ? id : null)}
                                loading={loading}
                                icon={Users}
                                title={`Assets — ${bldg} Étage ${BUILDINGS[bldg].find(f => f.value === floor)?.label || floor}`}
                                countLabel="unités"
                                emptyLabel="Aucun logement détecté pour cet étage."
                                renderDetail={(apt, onClose) => (
                                    <PalantintApartmentDetailCard
                                        roomId={apt}
                                        detail={apartmentsDetails[apt]}
                                        occupants={occupied[apt] || []}
                                        onClose={onClose}
                                        onNavigateToStudent={(studentId) => router.push(`/palantint/students/${studentId}`)}
                                    />
                                )}
                                renderList={(apts) => (
                                    <PalantintApartmentList
                                        apartments={apts}
                                        occupied={occupied}
                                        selectedRoomId={selectedRoom}
                                        onSelectRoom={(id) => { setSelectedRoom(id); setSearch(id); }}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Building & Floor Selector (Bottom) */}
                    {renderSelectors()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-800/60">
                        <Box
                            className="h-[600px] p-1"
                            contentClassName="bg-zinc-950/20"
                            icon={<MapPin className="w-4 h-4 text-housing-500" />}
                            title="Building Wireframe"
                        >
                            <BuildingModel
                                bldg={bldg}
                                floors={BUILDINGS[bldg]}
                                activeFloor={floor}
                                buildingPlans={buildingPlans}
                                buildingMetadata={buildingMetadata}
                            />
                        </Box>


                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ApartmentsPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                    Loading assets...
                </div>
            }
        >
            <BuildingCatalogBoundary><ApartmentsContent /></BuildingCatalogBoundary>
        </Suspense>
    );
}
