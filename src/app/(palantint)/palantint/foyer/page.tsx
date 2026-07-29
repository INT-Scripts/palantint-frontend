"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { fetchPublic } from "@/lib/api";
import { useRouter } from "next/navigation";
import { MapPin, Layers, FileText } from "lucide-react";
import { Box } from "@/components/ui/box";
import PageHeader from "@/components/PageHeader";

// Canvas/WebGL sizing breaks under SSR hydration — must be client-only.
const BuildingModel = dynamic(() => import("../apartments/components/BuildingModel"), { ssr: false });
import PalantintFloorSelector from "../components/PalantintFloorSelector";
import PalantintRoomDirectory from "../components/PalantintRoomDirectory";
import { PalantintFoyerRoomDetail } from "../components/PalantintRoomDetailCard";
import { FOYER_BUILDINGS as BUILDINGS } from "@/lib/buildings";

function FoyerContent() {
    const router = useRouter();
    const svgRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hoveredRoomRef = useRef<string | null>(null);

    const [floor, setFloor] = useState("0");
    const [svgContent, setSvgContent] = useState<string>("");
    const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});
    const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});
    const [roomMap, setRoomMap] = useState<Record<string, PalantintFoyerRoomDetail>>({});
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
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

    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/assets/plans/Foyer_${floor}.svg`, { signal: controller.signal })
            .then((r) => (r.ok ? r.text() : ""))
            .then((text) => {
                if (text !== undefined) {
                    setSvgContent(text);
                }
            })
            .catch((e) => {
                if (e.name !== "AbortError") setSvgContent("");
            });
        return () => controller.abort();
    }, [floor]);

    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            const svgs: Record<string, string> = {};
            await Promise.all(
                BUILDINGS.Foyer.map(async (f) => {
                    try {
                        const res = await fetch(`/api/assets/plans/Foyer_${f.value}.svg`);
                        if (res.ok) {
                            svgs[f.value] = await res.text();
                        }
                    } catch (e) {}
                })
            );
            if (isMounted) setBuildingSvgs(svgs);
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

    const roomMapRef = useRef(roomMap);
    useEffect(() => {
        roomMapRef.current = roomMap;
    }, [roomMap]);

    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const handleMouseMove = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                const roomId = link.getAttribute("data-room") || "";

                if (tooltipRef.current) {
                    tooltipRef.current.style.display = "block";

                    const rect = el.getBoundingClientRect();
                    const tw = tooltipRef.current.offsetWidth || 220;
                    const th = tooltipRef.current.offsetHeight || 120;

                    let x = e.clientX - rect.left + 16;
                    let y = e.clientY - rect.top + 16;

                    if (x + tw > rect.width - 12) x = Math.max(12, e.clientX - rect.left - tw - 16);
                    if (y + th > rect.height - 12) y = Math.max(12, e.clientY - rect.top - th - 16);

                    tooltipRef.current.style.left = `${x}px`;
                    tooltipRef.current.style.top = `${y}px`;

                    if (hoveredRoomRef.current !== roomId) {
                        if (hoveredRoomRef.current) {
                            const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                            if (prev) prev.removeAttribute("data-hover");
                        }
                        link.setAttribute("data-hover", "true");
                        hoveredRoomRef.current = roomId;

                        const detail = roomMapRef.current[roomId];
                        const clubName = detail?.club_name || roomId;
                        const type = detail?.type || "";
                        const assoc = detail?.association_of_origin || "";

                        tooltipRef.current.innerHTML = `
                            <div class="flex flex-col gap-2 font-mono">
                                <div class="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-housing-400"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                    <span class="text-xs font-black text-white uppercase">${clubName}</span>
                                </div>
                                ${type ? `<div class="text-[9px] text-zinc-400 uppercase">Type: <span class="text-housing-400 font-bold">${type}</span></div>` : ""}
                                ${assoc ? `<div class="text-[9px] text-zinc-400 uppercase">Assoc: <span class="text-zinc-200 font-bold">${assoc}</span></div>` : ""}
                                <div class="text-[9px] text-zinc-500 uppercase">REF: ${roomId}</div>
                            </div>
                        `;
                    }
                }
            } else {
                if (hoveredRoomRef.current !== null) {
                    const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                    if (prev) prev.removeAttribute("data-hover");
                    hoveredRoomRef.current = null;
                    if (tooltipRef.current) tooltipRef.current.style.display = "none";
                }
            }
        };

        const handleClick = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                e.preventDefault();
                const roomId = link.getAttribute("data-room") || "";
                setSelectedRoom((prev) => (prev === roomId ? null : roomId));
            }
        };

        const handleMouseLeave = () => {
            if (hoveredRoomRef.current) {
                const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                if (prev) prev.removeAttribute("data-hover");
            }
            hoveredRoomRef.current = null;
            if (tooltipRef.current) tooltipRef.current.style.display = "none";
        };

        el.addEventListener("mousemove", handleMouseMove);
        el.addEventListener("click", handleClick);
        el.addEventListener("mouseleave", handleMouseLeave);
        if (tooltipRef.current) tooltipRef.current.style.display = "none";

        return () => {
            el.removeEventListener("mousemove", handleMouseMove);
            el.removeEventListener("click", handleClick);
            el.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [svgContent]);

    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const apply = () => {
            el.querySelectorAll("a[data-room]").forEach((a) => {
                const roomId = a.getAttribute("data-room") || "";
                if (roomId === selectedRoom) {
                    a.setAttribute("data-active", "true");
                } else {
                    a.removeAttribute("data-active");
                }
            });
        };

        apply();
        const raf = requestAnimationFrame(apply);
        return () => cancelAnimationFrame(raf);
    }, [selectedRoom, roomMap, svgContent]);

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
                        {/* SVG Map Box */}
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
                                ref={svgRef}
                                className="flex-1 flex flex-col overflow-hidden relative z-0 p-3 sm:p-5 w-full select-none items-center justify-center min-h-0"
                            >
                                <div className="w-full h-full flex-1 flex items-center justify-center min-h-0">
                                    <div
                                        className="w-full h-full flex items-center justify-center
                                                   [&_svg]:w-full [&_svg]:max-w-full [&_svg]:h-full [&_svg]:max-h-[78vh] [&_svg]:block [&_svg]:m-auto [&_svg]:object-contain
                                                   [&_a[data-room]]:cursor-pointer!
                                                   [&_a[data-room]_text]:pointer-events-none!
                                                   [&_a[data-room]_tspan]:pointer-events-none!
                                                   [&_a[data-room]_.room-area]:pointer-events-all!
                                                   [&_a[data-room]_.room-area]:transition-all!
                                                   [&_a[data-room]_.room-area]:duration-150!
                                                   [&_.room-area]:fill-zinc-800/20!
                                                   [&_.room-area]:stroke-zinc-700/60!
                                                   [&_.room-area]:stroke-[1px]!
                                                   [&_a[data-room][data-active='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-selected='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-2!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-2!
                                                   [&_a[data-room]:hover_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-hover='true']_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room]:hover_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-blue-400!
                                                   [&_a[data-room]:hover_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-[2.5px]!
                                                   [&_.room-label]:font-sans!
                                                   [&_a[data-room][data-active='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-selected='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-active='true']_.room-label]:font-black!
                                                   [&_a[data-room][data-selected='true']_.room-label]:font-black!
                                                   [&_a[data-room]:hover_.room-label]:fill-white!
                                                   [&_a[data-room]:hover_.room-label]:font-black!
                                                   [&_a[data-room][data-hover='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-hover='true']_.room-label]:font-black!"
                                        dangerouslySetInnerHTML={{
                                            __html: svgContent || `<div class="m-auto flex flex-col items-center justify-center text-zinc-600 gap-4 font-mono uppercase tracking-widest"><svg class="w-16 h-16 opacity-30 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-xs text-rose-500/80 text-center">PLAN_NOT_FOUND</span></div>`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Tooltip */}
                            <div
                                ref={tooltipRef}
                                className="absolute z-50 pointer-events-none select-none bg-zinc-950/95 backdrop-blur-xl border border-rose-500/40 p-3.5 rounded-none shadow-2xl hidden text-left transition-opacity duration-75 min-w-[220px]"
                            />

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
                            <PalantintRoomDirectory
                                rooms={currentFloorRooms}
                                floorLabel={BUILDINGS.Foyer.find((f) => f.value === floor)?.label || `F${floor}`}
                                selectedRoom={selectedRoom}
                                roomMap={roomMap}
                                onSelectRoom={setSelectedRoom}
                                onNavigateToClub={(clubId) => router.push(`/palantint/clubs/${clubId}`)}
                                loading={loading}
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

                    {/* Section 2: Building Wireframe & Reference SVG */}
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
                                buildingSvgs={buildingSvgs}
                                buildingMetadata={buildingMetadata}
                            />
                        </Box>

                        <Box
                            className="h-[600px] p-1"
                            contentClassName="flex items-center justify-center bg-zinc-950/20 p-8"
                            icon={<FileText className="w-4 h-4 text-rose-500" />}
                            title="Floor Map Reference"
                        >
                            <a
                                href={`/api/assets/plans/Foyer_${floor}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 p-4"
                            >
                                <img
                                    src={`/api/assets/plans/Foyer_${floor}.png`}
                                    alt={`Plan Foyer Étage ${floor}`}
                                    className="w-full h-full object-contain brightness-90 saturate-[0.8] contrast-125 hover:brightness-110 transition-all"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            </a>
                        </Box>
                    </div>
                </div>
            </main>
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
            <FoyerContent />
        </Suspense>
    );
}
