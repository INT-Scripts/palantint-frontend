"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Home, Search, User, MapPin, Building2, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
const BUILDINGS: Record<string, { label: string; value: string }[]> = {
    U1: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
    U2: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
    U3: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }],
    U4: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
    U5: [{ label: "RDC -", value: "-0.5" }, { label: "RDC +", value: "0.5" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }],
    U6: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }],
    U7: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
};

// Map floor value to the old PNG naming convention
function getPngPath(bldg: string, floor: string) {
    let f = floor;
    if (bldg === "U5" && floor === "-0.5") f = "_-1";
    else if (bldg === "U5" && floor === "0.5") f = "_0";
    return `/api/assets/plans/${bldg}-${f}.png`;
}

function ApartmentsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const svgRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [bldg, setBldg] = useState("U7");
    const [floor, setFloor] = useState("1");
    const [occupied, setOccupied] = useState<Record<string, any>>({});
    const [search, setSearch] = useState("");
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [svgContent, setSvgContent] = useState<string>("");
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

    useEffect(() => {
        if (!BUILDINGS[bldg].find(f => f.value === floor)) {
            setFloor(BUILDINGS[bldg][0].value);
        }
    }, [bldg, floor]);

    useEffect(() => {
        document.title = "Bâtiments | PalantINT";
        fetchAPI("/students/apartments/occupied")
            .then(data => {
                setOccupied(data || {});
                const roomQ = searchParams.get("room");
                if (roomQ && roomQ.length === 4) {
                    setSearch(roomQ);
                    setSelectedRoom(roomQ);
                    const b = `U${roomQ[0]}`;
                    if (BUILDINGS[b]) {
                        setBldg(b);
                        let f = roomQ[1];
                        if (b === "U5" && f === "0") f = "0.5";
                        if (BUILDINGS[b].find(fl => fl.value === f)) setFloor(f);
                    }
                }
            })
            .catch(console.error);
    }, [searchParams]);

    // Load SVG
    useEffect(() => {
        fetch(`/api/assets/plans/${bldg}_${floor}.svg`)
            .then(r => r.ok ? r.text() : "")
            .then(setSvgContent)
            .catch(() => setSvgContent(""));
    }, [bldg, floor]);

    // Wire SVG interactivity
    const occupiedRef = useRef(occupied);
    occupiedRef.current = occupied;

    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const container = el;

        const handleMouseMove = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                const roomNum = link.getAttribute("data-room") || "";
                setHoveredRoom(roomNum);
                // Position tooltip relative to SVG container
                const containerRect = container.getBoundingClientRect();
                setTooltipPos({
                    x: e.clientX - containerRect.left,
                    y: e.clientY - containerRect.top - 10
                });
            } else {
                setHoveredRoom(null);
            }
        };

        const handleClick = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                e.preventDefault();
                const roomNum = link.getAttribute("data-room") || "";
                setSelectedRoom(roomNum);
                setSearch(roomNum);
            }
        };

        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("click", handleClick);
        container.addEventListener("mouseleave", () => setHoveredRoom(null));

        // Highlight selected room
        // First clear all existing
        container.querySelectorAll("a.group[data-active='true']").forEach(a => {
            a.removeAttribute("data-active");
            
            // Clean up any historical inline styles from old code
            const r = a.querySelector(".room-area");
            if (r) r.removeAttribute("style");
            const t = a.querySelector(".room-label");
            if (t) t.removeAttribute("style");
        });

        if (selectedRoom) {
            const selectedLink = container.querySelector(`a[data-room="${selectedRoom}"]`);
            if (selectedLink) {
                selectedLink.setAttribute("data-active", "true");
            }
        }

        return () => {
            container.removeEventListener("mousemove", handleMouseMove);
            container.removeEventListener("click", handleClick);
            container.removeEventListener("mouseleave", () => setHoveredRoom(null));
        };
    }, [svgContent, selectedRoom]);

    const belongsToCurrentView = (aptNum: string) => {
        if (aptNum.length !== 4 || isNaN(Number(aptNum))) return false;
        const b = bldg.replace("U", "");
        let f = floor;
        if (f === "-0.5" || f === "0.5") f = "0";
        return aptNum[0] === b && aptNum[1] === f;
    };

    const currentViewApts = Object.keys(occupied)
        .filter(belongsToCurrentView)
        .sort((a, b) => Number(a) - Number(b));

    const searchedApt = search.trim() !== "" ? occupied[search.trim()] : null;
    const hoveredOccupants = hoveredRoom ? occupied[hoveredRoom] : null;

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-orange-500/30">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[50%] bg-orange-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[40%] bg-red-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-20 sm:pb-24">
                <div className="space-y-10">

                    {/* Header */}
                    <PageHeader
                        badgeText="Thermal Radar // Active"
                        title1="Facility"
                        title2="Overview"
                        titleGradient="from-orange-500 to-red-600"
                        subtitle="Mapping student housing locations."
                        colorName="orange"
                        searchPlaceholder="QUERY: APT_NUM [e.g. 7523]"
                        searchValue={search}
                        onSearchChange={(v) => {
                            setSearch(v);
                            const val = v.trim();
                            if (val.length === 4 && !isNaN(Number(val))) {
                                setSelectedRoom(val);
                                const b = `U${val[0]}`;
                                if (BUILDINGS[b]) {
                                    setBldg(b);
                                    const f = val[1];
                                    if (BUILDINGS[b].find(fl => fl.value === f)) setFloor(f);
                                }
                            }
                        }}
                        searchResults={
                            search.trim() !== "" ? (
                                searchedApt && searchedApt.length > 0 ? searchedApt.map((o: any) => (
                                    <div key={o.id} className="p-4 bg-transparent hover:bg-zinc-900 border-l-2 border-transparent hover:border-orange-500 cursor-pointer transition-all flex items-center gap-4 group" onClick={() => router.push(`/students/${o.id}`)}>
                                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                            <Home className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-white uppercase tracking-wider truncate">{o.first_name} {o.last_name}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-1 tracking-widest">LOC_ID: {search.trim()}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-sm text-zinc-600 font-mono text-center uppercase tracking-widest">
                                        No Native Resident Found
                                    </div>
                                )
                            ) : undefined
                        }
                    />

                    {/* Building / Floor Selectors */}
                    <div className="flex gap-6 items-center flex-wrap bg-zinc-950/80 p-3 border border-zinc-800 backdrop-blur-2xl shadow-2xl">
                        <div className="flex flex-wrap gap-2 p-1 bg-zinc-900 border border-zinc-800 w-full sm:w-auto">
                            {Object.keys(BUILDINGS).map(b => (
                                <button key={b} onClick={() => setBldg(b)}
                                    className={`px-3 sm:px-5 py-2 text-xs sm:text-sm font-mono font-bold tracking-widest uppercase transition-all border ${bldg === b ? "bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/80"}`}>
                                    {b}
                                </button>
                            ))}
                        </div>
                        <div className="h-8 w-px bg-zinc-800 hidden sm:block" />
                        <div className="flex gap-2 overflow-x-auto p-1 scrollbar-hide">
                            {BUILDINGS[bldg].map(f => (
                                <button key={f.value} onClick={() => { setFloor(f.value); setSelectedRoom(null); }}
                                    className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${floor === f.value ? "bg-zinc-800 text-white border-zinc-600 shadow-inner" : "text-zinc-600 border-transparent hover:text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"}`}>
                                    FL:{f.label}
                                </button>
                            ))}
                        </div>
                        <span className="ml-auto pr-4 text-[10px] text-zinc-500 font-mono tracking-widest hidden lg:block uppercase">
                            LOC_NODE: <span className="text-orange-500 font-bold">{bldg}</span> // Z-INDEX: {BUILDINGS[bldg].find(f => f.value === floor)?.label || floor}
                        </span>
                    </div>

                    {/* Main Layout */}
                    <div className="flex gap-8 flex-col xl:flex-row relative" style={{ minHeight: "650px" }}>

                        {/* Top Left Bracket Accent */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/50 z-20 pointer-events-none -ml-2 -mt-2 hidden xl:block" />
                        {/* Bottom Right Bracket Accent */}
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/50 z-20 pointer-events-none -mr-2 -mb-2 hidden xl:block" />

                        {/* SVG Plan */}
                        <div className="flex-1 bg-zinc-950/60 backdrop-blur-3xl border border-zinc-800 overflow-hidden flex flex-col relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            
                            {/* Scanning Line Animation overlay */}
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500/30 blur-[2px] z-10 animate-[scan_6s_ease-in-out_infinite] pointer-events-none" />

                            {/* Original building image thumbnail */}
                            <div className="absolute top-4 left-4 z-20 bg-zinc-950/90 border border-zinc-800 p-1.5 backdrop-blur-xl group hover:p-2 transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)] hidden sm:block group-hover:border-orange-500/50">
                                <span className="absolute -top-3 -left-2 bg-orange-500 text-black text-[9px] font-mono font-bold px-1 py-0.5 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Raw_View</span>
                                <img
                                    src={getPngPath(bldg, floor)}
                                    alt={`Plan original ${bldg}`}
                                    className="w-16 h-16 group-hover:w-64 group-hover:h-64 object-contain opacity-40 grayscale sepia hue-rotate-15 group-hover:opacity-100 group-hover:grayscale-0 group-hover:sepia-0 transition-all duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                            </div>

                            {/* SVG Container */}
                            <div
                                ref={svgRef}
                                className="flex-1 flex items-center justify-center p-6 overflow-auto relative z-0"
                                dangerouslySetInnerHTML={{ __html: svgContent || `<div class="flex flex-col items-center justify-center text-zinc-600 gap-4 font-mono uppercase tracking-widest"><svg class="w-16 h-16 opacity-30 animate-pulse text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-xs text-red-500/80">ERROR: VECTOR MAP NOT FOUND<br/>NODE: ${bldg} / ${BUILDINGS[bldg].find(f => f.value === floor)?.label || floor}</span></div>` }}
                            />
                            <style dangerouslySetInnerHTML={{__html: `
                                a.group:hover .room-area, a.group[data-active="true"] .room-area {
                                    fill: rgba(249,115,22,0.3) !important;
                                    stroke: rgba(249,115,22,1) !important;
                                    stroke-width: 2px !important;
                                    cursor: crosshair;
                                }
                                a.group:hover .room-label, a.group[data-active="true"] .room-label {
                                    fill: white !important;
                                    font-weight: 900;
                                    font-family: monospace;
                                }
                            `}} />

                            {/* Hover Tooltip */}
                            {hoveredRoom && (
                                <div
                                    ref={tooltipRef}
                                    className="absolute z-50 bg-zinc-950/90 backdrop-blur-md border border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] px-3 py-2 pointer-events-none rounded-none"
                                    style={{
                                        left: `${tooltipPos.x}px`,
                                        top: `${tooltipPos.y}px`,
                                        transform: "translate(-50%, -100%)"
                                    }}
                                >
                                    {/* Tooltip Room Labels */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-orange-500" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-orange-500" />
                                    
                                    <div className="flex items-center gap-2 mb-2 border-b border-orange-500/30 pb-1">
                                        <Home className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="text-xs font-black text-white font-mono uppercase tracking-widest">Room: {hoveredRoom}</span>
                                    </div>
                                    {hoveredOccupants && hoveredOccupants.length > 0 ? (
                                        hoveredOccupants.slice(0, 4).map((o: any) => (
                                            <div key={o.id} className="flex items-center gap-2 text-xs text-zinc-300 font-mono mt-1">
                                                <User className="w-3 h-3 text-orange-500/70" />
                                                <span className="uppercase">{o.first_name} {o.last_name}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Vacant</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Residents Panel */}
                        <div className="xl:w-[400px] shrink-0 bg-zinc-950/80 border border-zinc-800 p-0 flex flex-col shadow-2xl relative" style={{ maxHeight: "750px" }}>
                            {/* Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600" />
                            
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3 p-5 border-b-2 border-zinc-800 bg-zinc-900/50">
                                <Users className="w-5 h-5 text-orange-500" />
                                Sector {bldg} <span className="text-zinc-500">//</span> {BUILDINGS[bldg].find(f => f.value === floor)?.label}
                                <span className="ml-auto px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-mono border border-orange-500/30">
                                    COUNT: {currentViewApts.length}
                                </span>
                            </h3>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950">
                                {currentViewApts.length > 0 ? currentViewApts.map((apt, i) => (
                                    <div
                                        key={apt}
                                        className={`group border-b border-zinc-800/50 cursor-pointer transition-all ${selectedRoom === apt ? "bg-orange-500/10 border-l-2 border-l-orange-500" : "hover:bg-zinc-900 border-l-2 border-l-transparent hover:border-l-zinc-600"}`}
                                        onClick={() => { setSelectedRoom(apt); setSearch(apt); }}
                                    >
                                        <div className="flex items-center gap-3 p-4">
                                            <div className={`w-2 h-2 rounded-sm ${occupied[apt]?.length > 0 ? "bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "bg-zinc-800"}`} />
                                            <span className="text-sm font-black text-white font-mono tracking-widest">APT_{apt}</span>
                                            <span className="text-[10px] text-zinc-600 font-mono ml-auto uppercase group-hover:text-zinc-400 transition-colors">
                                                Entities: {occupied[apt]?.length || 0}
                                            </span>
                                        </div>
                                        
                                        {occupied[apt]?.length > 0 && (
                                            <div className="px-4 pb-4 space-y-2">
                                                {occupied[apt].map((o: any) => (
                                                    <button key={o.id} onClick={(e) => { e.stopPropagation(); router.push(`/students/${o.id}`); }}
                                                        className="w-full text-left bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-[11px] font-mono text-zinc-400 hover:text-white hover:border-orange-500/50 hover:bg-orange-500/10 transition-all flex items-center justify-between group/btn">
                                                        <span className="uppercase tracking-wide">{o.first_name} {o.last_name}</span>
                                                        <User className="w-3 h-3 text-zinc-600 group-hover/btn:text-orange-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                                        <Building2 className="w-12 h-12 mb-4 text-zinc-800" />
                                        <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">No residents found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ApartmentsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Chargement...</div>}>
            <ApartmentsContent />
        </Suspense>
    );
}
