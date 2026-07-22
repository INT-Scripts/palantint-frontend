"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { fetchPublic } from "@/lib/api";
import Navbar from "@/components/Navbar";
import BuildingModel from "../apartments/components/BuildingModel";
import { Box } from "@/components/ui/box";
import { MapPin, Users, Layers, FileText, X, ExternalLink, ShieldCheck } from "lucide-react";

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

function ClubsContent() {
    const router = useRouter();
    const [bldg, setBldg] = useState<string>("Foyer");
    const [floor, setFloor] = useState<string>("0");
    const [search, setSearch] = useState<string>("");
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

    const [foyerMap, setFoyerMap] = useState<Record<string, FoyerRoomDetail>>({});
    const [svgContent, setSvgContent] = useState<string>("");
    const [loadingSvg, setLoadingSvg] = useState<boolean>(true);
    const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});

    const svgRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hoveredRoomRef = useRef<string | null>(null);

    // Load foyer map metadata
    useEffect(() => {
        const loadFoyerMap = async () => {
            try {
                let data: Record<string, FoyerRoomDetail> = {};
                try {
                    data = await fetchPublic("/foyer/map");
                } catch {
                    const res = await fetch("/api/assets/clubs/foyer_map.json");
                    if (res.ok) data = await res.json();
                }
                setFoyerMap(data || {});
            } catch (err) {
                console.error("Failed to load foyer map metadata", err);
            }
        };
        loadFoyerMap();
    }, []);

    // Load SVG plan files for active floor & 3D model
    useEffect(() => {
        let isMounted = true;
        setLoadingSvg(true);

        const loadSvgs = async () => {
            const svgs: Record<string, string> = {};
            const floors = BUILDINGS[bldg] || [];

            for (const f of floors) {
                try {
                    const res = await fetch(`/api/assets/plans/${bldg}_${f.value}.svg`);
                    if (res.ok) {
                        const text = await res.text();
                        const cleanedText = text.replace(/<style[\s\S]*?<\/style>/gi, "");
                        svgs[f.value] = cleanedText;
                        if (f.value === floor && isMounted) {
                            setSvgContent(cleanedText);
                            setLoadingSvg(false);
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            if (isMounted) setBuildingSvgs(svgs);
        };

        loadSvgs();
        return () => { isMounted = false; };
    }, [bldg, floor]);

    // Active floor rooms list
    const currentViewRooms = useMemo(() => {
        return Object.values(foyerMap)
            .filter(r => r.floor === floor)
            .sort((a, b) => a.room_id.localeCompare(b.room_id, undefined, { numeric: true }));
    }, [foyerMap, floor]);

    const foyerMapRef = useRef(foyerMap);
    useEffect(() => {
        foyerMapRef.current = foyerMap;
    }, [foyerMap]);

    // Direct DOM event listeners for mouse interaction & zero-lag tooltips
    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const handleMouseMove = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                const roomNum = link.getAttribute("data-room") || "";

                if (tooltipRef.current) {
                    tooltipRef.current.style.display = "block";

                    const rect = el.getBoundingClientRect();
                    const tooltipWidth = tooltipRef.current.offsetWidth || 220;
                    const tooltipHeight = tooltipRef.current.offsetHeight || 160;

                    let x = e.clientX - rect.left + 16;
                    let y = e.clientY - rect.top + 16;

                    if (x + tooltipWidth > rect.width - 12) {
                        x = Math.max(12, e.clientX - rect.left - tooltipWidth - 16);
                    }
                    if (y + tooltipHeight > rect.height - 12) {
                        y = Math.max(12, e.clientY - rect.top - tooltipHeight - 16);
                    }

                    tooltipRef.current.style.left = `${x}px`;
                    tooltipRef.current.style.top = `${y}px`;

                    if (hoveredRoomRef.current !== roomNum) {
                        if (hoveredRoomRef.current) {
                            const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                            if (prev) prev.removeAttribute("data-hover");
                        }
                        link.setAttribute("data-hover", "true");
                        hoveredRoomRef.current = roomNum;

                        const detail = foyerMapRef.current[roomNum];
                        if (detail) {
                            tooltipRef.current.innerHTML = `
                                <div class="flex flex-col gap-2 font-mono">
                                    <div class="flex items-center justify-between gap-3 border-b border-zinc-800 pb-1.5">
                                        <span class="text-xs font-black text-white uppercase tracking-wider">LOCAL_${roomNum}</span>
                                        <span class="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 bg-housing-500/20 text-housing-400 border border-housing-500/40">
                                            ${detail.type || "Club"}
                                        </span>
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <span class="text-xs font-bold text-housing-400 uppercase">${detail.club_name || detail.raw_name || "Non attribué"}</span>
                                        ${detail.association_of_origin ? `<span class="text-[9px] text-zinc-400">Tutelle: ${detail.association_of_origin}</span>` : ""}
                                    </div>
                                </div>
                            `;
                        } else {
                            tooltipRef.current.innerHTML = `
                                <div class="flex flex-col gap-1 font-mono">
                                    <span class="text-xs font-black text-white uppercase tracking-wider">LOCAL_${roomNum}</span>
                                    <span class="text-[9px] text-zinc-500 uppercase">Non attribué</span>
                                </div>
                            `;
                        }
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
                const roomNum = link.getAttribute("data-room") || "";
                setSelectedRoom(roomNum);
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

    // Active & occupied state synchronization
    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const apply = () => {
            el.querySelectorAll("a[data-room]").forEach((a) => {
                const roomNum = a.getAttribute("data-room") || "";
                const isSelected = selectedRoom === roomNum;
                const hasClub = !!foyerMapRef.current[roomNum]?.club_name;

                if (isSelected) {
                    a.setAttribute("data-selected", "true");
                    a.setAttribute("data-active", "true");
                } else {
                    a.removeAttribute("data-selected");
                    a.removeAttribute("data-active");
                }

                if (hasClub) {
                    a.setAttribute("data-occupied", "true");
                } else {
                    a.removeAttribute("data-occupied");
                }
            });
        };

        apply();
        const raf = requestAnimationFrame(apply);
        return () => cancelAnimationFrame(raf);
    }, [svgContent, selectedRoom, foyerMap]);

    function renderSelectors() {
        return (
            <div className="flex flex-wrap gap-6 items-center bg-zinc-900/40 border border-zinc-800 p-4 font-mono text-xs shadow-xl">
                {/* Building Selector */}
                <div className="flex items-center gap-3">
                    <span className="text-zinc-500 uppercase tracking-widest font-bold text-[10px]">Bâtiment:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.keys(BUILDINGS).map((b) => (
                            <button
                                key={b}
                                onClick={() => {
                                    setBldg(b);
                                    if (!BUILDINGS[b].find(f => f.value === floor)) {
                                        setFloor(BUILDINGS[b][0].value);
                                    }
                                    setSelectedRoom(null);
                                }}
                                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                                    bldg === b
                                        ? "bg-housing-500 text-black shadow-sm"
                                        : "bg-zinc-950/80 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white"
                                }`}
                            >
                                {b}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Floor Selector */}
                <div className="flex items-center gap-3">
                    <span className="text-zinc-500 uppercase tracking-widest font-bold text-[10px]">Étage:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {(BUILDINGS[bldg] || []).map((f) => (
                            <button
                                key={f.value}
                                onClick={() => { setFloor(f.value); setSelectedRoom(null); }}
                                className={`px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                                    floor === f.value
                                        ? "bg-white text-black shadow-sm"
                                        : "bg-zinc-950/80 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-housing-500 selection:text-black">
            <Navbar />

            <main className="flex-1 p-4 sm:p-8 max-w-[1700px] mx-auto w-full space-y-6">
                <Box title="RECHERCHE INTELLIGENTE & RENSEIGNEMENTS FOYER">
                    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                                RECHERCHE DE LOCAL (EX: F0-1, F1-15, BDE, BDA, MINET, INTech...)
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Taper un code local ou un nom de club..."
                                className="w-full bg-black border border-zinc-800 px-4 py-2 text-sm font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-housing-500 transition-colors"
                            />
                        </div>
                    </div>
                </Box>

                {renderSelectors()}

                <div className="flex gap-6 flex-col lg:flex-row relative">
                    {/* Left SVG Floor Map Box */}
                    <Box
                        className="flex-1 min-h-[500px] lg:min-h-[800px]"
                        icon={<MapPin className="w-4 h-4 text-housing-500" />}
                        title="Carte Vectorielle du Foyer Associatif"
                        rightContent={
                            <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-orange-500/32 border border-orange-500 inline-block" />
                                    <span className="text-zinc-300">Attribué</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                    <span className="text-zinc-400">Libre</span>
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
                            className="flex-1 flex overflow-auto relative z-0 scrollbar-thin scrollbar-thumb-zinc-800 h-full w-full select-none"
                        >
                            {loadingSvg ? (
                                <div className="m-auto flex flex-col items-center justify-center gap-3 py-20 font-mono">
                                    <div className="w-8 h-8 border-2 border-housing-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Chargement de la carte...</span>
                                </div>
                            ) : (
                                <div className="m-auto flex w-full h-full">
                                    <div 
                                        className="m-auto flex w-full h-full
                                                   [&_svg]:m-auto [&_svg]:max-w-[95%] [&_svg]:max-h-[95%] [&_svg]:w-auto [&_svg]:h-auto [&_svg]:block
                                                   [&_a[data-room]]:cursor-pointer!
                                                   [&_a[data-room]_text]:pointer-events-none!
                                                   [&_a[data-room]_tspan]:pointer-events-none!
                                                   [&_a[data-room]_.room-area]:pointer-events-all!
                                                   [&_a[data-room]_.room-area]:transition-all!
                                                   [&_a[data-room]_.room-area]:duration-150!
                                                   [&_.room-area]:fill-zinc-800/20!
                                                   [&_.room-area]:stroke-zinc-700/60!
                                                   [&_.room-area]:stroke-[1px]!
                                                   [&_a[data-room][data-occupied='true']_.room-area]:fill-orange-500/32!
                                                   [&_a[data-room][data-occupied='true']_.room-area]:stroke-orange-500!
                                                   [&_a[data-room][data-occupied='true']_.room-area]:stroke-[1.5px]!
                                                   [&_a[data-room][data-occupied='true']_.room-label]:fill-orange-300!
                                                   [&_a[data-room][data-occupied='true']_.room-label]:font-bold!
                                                   [&_a[data-room][data-active='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-selected='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-2!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-2!
                                                   [&_a[data-room]:hover_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-hover='true']_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room]:hover_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:stroke-blue-400!
                                                   [&_a[data-room]:hover_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-selected='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-active='true']_.room-label]:fill-white!
                                                   [&_a[data-room]:hover_.room-label]:fill-white!
                                                   [&_a[data-room][data-hover='true']_.room-label]:fill-white!"
                                        dangerouslySetInnerHTML={{ __html: svgContent }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Container Relative Tooltip */}
                        <div
                            ref={tooltipRef}
                            className="absolute z-50 pointer-events-none select-none bg-zinc-950/95 backdrop-blur-xl border border-housing-500/40 p-3.5 rounded-none shadow-2xl hidden text-left transition-opacity duration-75 min-w-[220px]"
                        />

                        {/* Map Legend Footer */}
                        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-orange-500/32 border border-orange-500 inline-block" />
                                    <span className="text-zinc-200 font-bold">Attribué (Orange)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                    <span className="text-zinc-200 font-bold">Libre (Standard)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-blue-600/80 border border-blue-500 inline-block" />
                                    <span className="text-zinc-200 font-bold">Sélectionné</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-blue-500/55 border border-blue-400 inline-block" />
                                    <span className="text-zinc-200 font-bold">Survol (Actif)</span>
                                </div>
                            </div>
                        </div>
                    </Box>

                    {/* Right Directory Panel */}
                    <div className="xl:w-[450px] shrink-0 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col shadow-2xl relative rounded-none h-[500px] lg:h-[800px]">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800 bg-black/20 shrink-0">
                            <h3 className="text-[10px] font-black font-mono text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Users className="w-4 h-4 text-housing-500" />
                                Locaux Foyer — {bldg} Étage {floor}
                            </h3>
                            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                                {currentViewRooms.length} Espaces
                            </div>
                        </div>

                        {/* Selected Room Full Specs Card */}
                        {selectedRoom && foyerMap[selectedRoom] && (() => {
                            const detail = foyerMap[selectedRoom];
                            return (
                                <div className="p-4 border-b border-zinc-800 bg-zinc-950/70 space-y-3 font-mono">
                                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-housing-500 animate-pulse" />
                                            <span className="text-sm font-black text-white uppercase">Local {selectedRoom}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 border bg-housing-500/20 text-housing-400 border-housing-500/40">
                                                {detail.type || "Club"}
                                            </span>
                                            <button onClick={() => setSelectedRoom(null)} title="Désélectionner" className="text-zinc-500 hover:text-white p-1">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-zinc-900/80 border border-zinc-800 space-y-1">
                                        <span className="text-[8px] font-mono text-zinc-500 uppercase block font-bold">Club Attribué</span>
                                        <span className="font-bold text-housing-400 text-sm block uppercase">{detail.club_name || detail.raw_name || "Non attribué"}</span>
                                        {detail.association_of_origin && (
                                            <span className="text-[9px] text-zinc-400 block font-mono">Association: {detail.association_of_origin}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Room list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {currentViewRooms.length > 0 ? currentViewRooms.map((room) => (
                                <div 
                                    key={room.room_id} 
                                    className={`border-b border-zinc-800/30 p-4 transition-all cursor-pointer font-mono ${selectedRoom === room.room_id ? "bg-housing-500/5 border-l-2 border-housing-500" : "hover:bg-zinc-900/40 border-l-2 border-transparent"}`} 
                                    onClick={() => setSelectedRoom(room.room_id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white font-mono">{room.room_id}</span>
                                        <span className="text-[10px] text-housing-400 font-mono font-bold uppercase">{room.club_name || room.raw_name}</span>
                                    </div>
                                </div>
                            )) : <div className="p-10 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">Aucun local répertorié</div>}
                        </div>
                    </div>
                </div>

                {renderSelectors()}

                {/* Section 2: Building Skeleton & Reference Blueprint */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-800/60">
                    
                    {/* 3D Skeleton Wireframe */}
                    <Box
                        className="h-[600px] p-1"
                        contentClassName="bg-zinc-950/20"
                        icon={<Layers className="w-4 h-4 text-housing-500" />}
                        title="Bâtiment Foyer Wireframe 3D"
                    >
                        <BuildingModel
                            bldg={bldg}
                            floors={BUILDINGS[bldg]}
                            activeFloor={floor}
                            buildingSvgs={buildingSvgs}
                            buildingMetadata={{}}
                        />
                    </Box>

                    {/* Blueprint SVG Reference */}
                    <Box
                        className="h-[600px] p-1"
                        contentClassName="flex items-center justify-center bg-zinc-950/20 p-8"
                        icon={<FileText className="w-4 h-4 text-housing-500" />}
                        title="Plan Vectoriel de Référence"
                    >
                        <a href={`/api/assets/plans/Foyer_${floor}.svg`} target="_blank" rel="noopener noreferrer" className="absolute inset-0 p-4">
                            <img 
                                src={`/api/assets/plans/Foyer_${floor}.svg`} 
                                alt="Foyer Vector Plan" 
                                className="w-full h-full object-contain brightness-90 saturate-[0.8] contrast-125 hover:brightness-110 transition-all" 
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
                            />
                        </a>
                    </Box>

                </div>
            </main>
        </div>
    );
}

export default function FoyerClubsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                Loading foyer assets...
            </div>
        }>
            <ClubsContent />
        </Suspense>
    );
}
