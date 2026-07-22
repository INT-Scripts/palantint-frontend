"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPrivate, fetchPublic } from "@/lib/api";
import { 
    Home, User, Building2, Users, 
    Maximize2, X, Eye, FileText, Layers, MapPin
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Box } from "@/components/ui/box";
import BuildingModel from "./components/BuildingModel";

const BUILDINGS: Record<string, { label: string; value: string }[]> = {
    U1: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
    U2: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
    U3: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }],
    U4: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
    U5: [{ label: "RDC -", value: "-0.5" }, { label: "RDC +", value: "0.5" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }],
    U6: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }],
    U7: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
};

function getPngPath(bldg: string, floor: string) {
    let f = floor;
    if (bldg === "U5" && floor === "-0.5") f = "_-1";
    else if (bldg === "U5" && floor === "0.5") f = "_0";
    return `/api/assets/plans/${bldg}-${f}.png`;
}

function parseNumeric(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(",", ".").replace(/[^\d.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function ApartmentsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const svgRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hoveredRoomRef = useRef<string | null>(null);

    const [bldg, setBldg] = useState("U7");
    const [floor, setFloor] = useState("1");
    const [occupied, setOccupied] = useState<Record<string, any>>({});
    const [apartmentsDetails, setApartmentsDetails] = useState<Record<string, any>>({});
    const [search, setSearch] = useState("");
    const [svgContent, setSvgContent] = useState<string>("");
    const [buildingSvgs, setBuildingSvgs] = useState<Record<string, string>>({});
    const [buildingMetadata, setBuildingMetadata] = useState<Record<string, any>>({});
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        document.title = "Apartments";
        
        // Handle search params for building and floor
        const bldgQ = searchParams.get("bldg");
        const floorQ = searchParams.get("floor");
        
        if (bldgQ && BUILDINGS[bldgQ.toUpperCase()]) {
            setBldg(bldgQ.toUpperCase());
            if (floorQ && BUILDINGS[bldgQ.toUpperCase()].find(f => f.value === floorQ)) {
                setFloor(floorQ);
            }
        }

        // Process room query param synchronously for instant plan loading
        const roomQ = searchParams.get("room");
        if (roomQ) {
            const cleanRoom = roomQ.replace(/\D/g, "");
            if (cleanRoom.length === 4) {
                setSearch(cleanRoom);
                setSelectedRoom(cleanRoom);
                
                const b = `U${cleanRoom[0]}`;
                if (BUILDINGS[b]) {
                    let f = cleanRoom[1];
                    if (b === "U5" && f === "0") {
                        const roomNum = parseInt(cleanRoom.substring(2)) || 0;
                        f = roomNum >= 10 ? "0.5" : "-0.5";
                    }
                    if (BUILDINGS[b].find(fl => fl.value === f)) {
                        setBldg(b);
                        setFloor(f);
                    }
                }
            }
        }

        fetchPublic("/students/apartments/details")
            .then(data => {
                setApartmentsDetails(data || {});
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
        fetch(`/api/assets/plans/${bldg}_${floor}.svg`, { signal: controller.signal })
            .then(r => r.ok ? r.text() : "")
            .then(text => {
                if (text !== undefined) {
                    const cleanedText = text.replace(/<style[\s\S]*?<\/style>/gi, "");
                    setSvgContent(cleanedText);
                }
            })
            .catch(e => { if (e.name !== "AbortError") setSvgContent(""); });
        return () => controller.abort();
    }, [bldg, floor]);

    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            const svgs: Record<string, string> = {};
            await Promise.all(BUILDINGS[bldg].map(async (f) => {
                try {
                    const res = await fetch(`/api/assets/plans/${bldg}_${f.value}.svg`);
                    if (res.ok) {
                        svgs[f.value] = await res.text();
                    }
                } catch (e) {}
            }));
            
            const meta = await fetchPrivate(`/maps/${bldg}/metadata`);
            
            if (isMounted) {
                setBuildingSvgs(svgs);
                setBuildingMetadata(meta || {});
            }
        };
        fetchAll();
        return () => { isMounted = false; };
    }, [bldg]);

    const occupiedRef = useRef(occupied);
    useEffect(() => {
        occupiedRef.current = occupied;
    }, [occupied]);

    const apartmentsDetailsRef = useRef(apartmentsDetails);
    useEffect(() => {
        apartmentsDetailsRef.current = apartmentsDetails;
    }, [apartmentsDetails]);

    // 1. Direct DOM manipulation for fast tooltips & highlights
    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const handleMouseMove = (e: MouseEvent) => {
            const link = (e.target as Element).closest?.("a[data-room]");
            if (link) {
                const roomNum = link.getAttribute("data-room") || "";
                
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'block';
                    
                    const rect = el.getBoundingClientRect();
                    const tooltipWidth = tooltipRef.current.offsetWidth || 240;
                    const tooltipHeight = tooltipRef.current.offsetHeight || 220;

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
                        const occupants = occupiedRef.current[roomNum] || [];
                        const occupantsHtml = occupants.length > 0 
                            ? occupants.map((o: any) => `
                                <div class="flex items-center gap-2 text-[11px] text-zinc-200 font-mono mt-1 bg-zinc-950/60 border border-zinc-800/40 px-2 py-0.5 uppercase rounded-none">
                                    <div class="w-1.5 h-1.5 rounded-full bg-housing-500 animate-pulse"></div>
                                    <span class="font-bold text-zinc-200">${o.first_name?.[0] || ""}. ${o.last_name || ""}</span>
                                </div>
                            `).join('')
                            : `<div class="text-[9px] text-zinc-500 font-mono italic uppercase px-1.5 py-0.5 bg-zinc-950/30 border border-zinc-900/50">Aucun occupant</div>`;
                        
                        const logData = apartmentsDetailsRef.current[roomNum];
                        let logHtml = '';
                        if (logData) {
                            const baseRent = parseNumeric(logData.Tarif);
                            const allocBoursier = parseNumeric(logData['Allocation boursier']);
                            const allocNonBoursier = parseNumeric(logData['Allocation non boursier']);

                            const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
                            const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
                            const surf = parseNumeric(logData.Superficie);

                            logHtml = `
                                <div class="mt-2 pt-1.5 border-t border-zinc-800/60 flex flex-col gap-1.5">
                                    <div class="grid grid-cols-2 gap-1 font-mono text-[9px]">
                                        <div class="flex flex-col p-1 bg-zinc-950/50 border border-zinc-900">
                                            <span class="text-[7px] text-zinc-500 uppercase font-bold">Type</span>
                                            <span class="font-bold text-white uppercase truncate" title="${logData.Type || '-'}">${logData.Type || '-'}</span>
                                        </div>
                                        <div class="flex flex-col p-1 bg-zinc-950/50 border border-zinc-900">
                                            <span class="text-[7px] text-zinc-500 uppercase font-bold">Superficie</span>
                                            <span class="font-bold text-white">${surf > 0 ? `${surf} m²` : (logData.Superficie || '-')}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-between items-center p-1.5 bg-housing-500/10 border border-housing-500/20 font-mono text-[10px]">
                                        <span class="text-zinc-300 uppercase font-bold">Loyer Brut</span>
                                        <span class="font-black text-housing-400">${baseRent > 0 ? `${baseRent} €/m` : (logData.Tarif || '-')}</span>
                                    </div>
                                    
                                    <div class="flex flex-col gap-0.5 bg-zinc-950/60 border border-zinc-900/60 p-1.5 font-mono text-[9px]">
                                        <div class="flex justify-between items-center gap-3 text-emerald-400">
                                            <span>Boursier:</span>
                                            <span class="font-bold">${netBoursier > 0 ? `${netBoursier} €` : '-'} <span class="text-[7.5px] text-zinc-500 font-normal">(-${allocBoursier}€ APL/ALS)</span></span>
                                        </div>
                                        <div class="flex justify-between items-center gap-3 text-zinc-300">
                                            <span>Non-Boursier:</span>
                                            <span class="font-bold">${netNonBoursier > 0 ? `${netNonBoursier} €` : '-'} <span class="text-[7.5px] text-zinc-500 font-normal">(-${allocNonBoursier}€ APL/ALS)</span></span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
 
                        tooltipRef.current.innerHTML = `
                            <div class="flex flex-col gap-2">
                                <div class="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-1.5">
                                    <div class="flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-housing-400"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                        <span class="text-xs font-black text-white font-mono tracking-wider">LOGEMENT_${roomNum}</span>
                                    </div>
                                    <span class="text-[8px] font-mono font-black px-1.5 py-0.5 ${occupants.length > 0 ? 'bg-housing-500/20 text-housing-400 border border-housing-500/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} uppercase">
                                        ${occupants.length > 0 ? 'Occupé' : 'Vacant'}
                                    </span>
                                </div>
                                ${logHtml}
                                ${occupants.length > 0 ? `
                                  <div class="flex flex-col gap-0.5 pt-1 border-t border-zinc-800/50">
                                      <span class="text-[7.5px] font-mono text-zinc-500 uppercase font-black">Occupants</span>
                                      ${occupantsHtml}
                                  </div>
                                ` : ''}
                            </div>
                        `;
                    }
                }
            } else {
                if (hoveredRoomRef.current !== null) {
                    const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                    if (prev) prev.removeAttribute("data-hover");
                    hoveredRoomRef.current = null;
                    if (tooltipRef.current) {
                        tooltipRef.current.style.display = 'none';
                    }
                }
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

        const handleMouseLeave = () => {
            if (hoveredRoomRef.current) {
                const prev = el.querySelector(`a[data-room="${hoveredRoomRef.current}"]`);
                if (prev) prev.removeAttribute("data-hover");
            }
            hoveredRoomRef.current = null;
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        };

        el.addEventListener("mousemove", handleMouseMove);
        el.addEventListener("click", handleClick);
        el.addEventListener("mouseleave", handleMouseLeave);

        if (tooltipRef.current) tooltipRef.current.style.display = 'none';

        return () => {
            el.removeEventListener("mousemove", handleMouseMove);
            el.removeEventListener("click", handleClick);
            el.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [svgContent]); 

    // 2. Visual State Sync Hook (Selection & Occupied Passive Glow)
    // Uses rAF to ensure dangerouslySetInnerHTML has committed to DOM before querying
    useEffect(() => {
        const el = svgRef.current;
        if (!el || !svgContent) return;

        const apply = () => {
            el.querySelectorAll("a[data-room]").forEach(a => {
                const roomNum = a.getAttribute("data-room") || "";
                const isSelected = roomNum === selectedRoom;
                const isOccupied = Array.isArray(occupied[roomNum]) && occupied[roomNum].length > 0;

                if (isSelected) {
                    a.setAttribute("data-active", "true");
                } else {
                    a.removeAttribute("data-active");
                }

                if (isOccupied) {
                    a.setAttribute("data-occupied", "true");
                } else {
                    a.removeAttribute("data-occupied");
                }
            });
        };

        // Run immediately in case SVG is already in DOM, then once more after paint
        apply();
        const raf = requestAnimationFrame(apply);
        return () => cancelAnimationFrame(raf);
    }, [selectedRoom, occupied, svgContent]);

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

    const getBuildingResidentCount = useCallback((b: string) => {
        const b_num = b.replace("U", "");
        return Object.keys(occupied).filter(apt => apt[0] === b_num).length;
    }, [occupied]);

    const getFloorResidentCount = useCallback((b: string, f: string) => {
        const b_num = b.replace("U", "");
        let f_val = f;
        if (f_val === "-0.5" || f_val === "0.5") f_val = "0";
        return Object.keys(occupied).filter(apt => apt[0] === b_num && apt[1] === f_val).length;
    }, [occupied]);

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
                <div className="space-y-12">

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
                                const b = `U${val[0]}`;
                                if (BUILDINGS[b]) {
                                    let f = val[1];
                                    if (b === "U5" && f === "0") {
                                        const roomNum = parseInt(val.substring(2)) || 0;
                                        f = roomNum >= 10 ? "0.5" : "-0.5";
                                    }
                                    if (BUILDINGS[b].find(fl => fl.value === f)) {
                                        setBldg(b);
                                        setFloor(f);
                                    }
                                }
                            }
                        }}
                    />

                    {renderSelectors()}

                    <div className="flex gap-6 flex-col lg:flex-row relative">
                        <Box
                            className="flex-1 min-h-[500px] lg:min-h-[800px]"
                            icon={<MapPin className="w-4 h-4 text-housing-500" />}
                            title="Interactive Floor Map"
                        >
                            <div
                                ref={svgRef}
                                className="flex-1 flex overflow-auto relative z-0 scrollbar-thin scrollbar-thumb-zinc-800 h-full w-full"
                            >
                                <div 
                                    className="m-auto flex w-full h-full"
                                >
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
                                                   [&_a[data-room][data-occupied='true'][data-active='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-selected='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-occupied='true'][data-selected='true']_.room-area]:fill-blue-600/80!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-occupied='true'][data-active='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-occupied='true'][data-selected='true']_.room-area]:stroke-blue-500!
                                                   [&_a[data-room][data-active='true']_.room-area]:stroke-2!
                                                   [&_a[data-room][data-occupied='true'][data-active='true']_.room-area]:stroke-2!
                                                   [&_a[data-room][data-selected='true']_.room-area]:stroke-2!
                                                   [&_a[data-room][data-occupied='true'][data-selected='true']_.room-area]:stroke-2!
                                                   [&_a[data-room]:hover_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-hover='true']_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:fill-blue-500/55!
                                                   [&_a[data-room]:hover_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-blue-400!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:stroke-blue-400!
                                                   [&_a[data-room]:hover_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-occupied='true']:hover_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-hover='true']_.room-area]:stroke-[2.5px]!
                                                   [&_a[data-room][data-occupied='true'][data-hover='true']_.room-area]:stroke-[2.5px]!
                                                   [&_.room-label]:font-sans!
                                                   [&_a[data-room][data-active='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-selected='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-active='true']_.room-label]:font-black!
                                                   [&_a[data-room][data-selected='true']_.room-label]:font-black!
                                                   [&_a[data-room]:hover_.room-label]:fill-white!
                                                   [&_a[data-room]:hover_.room-label]:font-black!
                                                   [&_a[data-room][data-hover='true']_.room-label]:fill-white!
                                                   [&_a[data-room][data-hover='true']_.room-label]:font-black!"
                                        dangerouslySetInnerHTML={{ __html: svgContent || `<div class="m-auto flex flex-col items-center justify-center text-zinc-600 gap-4 font-mono uppercase tracking-widest"><svg class="w-16 h-16 opacity-30 text-comms-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-xs text-comms-500/80 text-center">PLAN_NOT_FOUND</span></div>` }}
                                    />
                                </div>
                            </div>

                            {/* Direct DOM updated tooltip */}
                            <div
                                ref={tooltipRef}
                                className="absolute z-50 pointer-events-none select-none bg-zinc-950/95 backdrop-blur-xl border border-housing-500/40 p-3.5 rounded-none shadow-2xl hidden text-left transition-opacity duration-75 min-w-[220px]"
                            />

                            {/* PalantINT Map Legend Footer */}
                            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-orange-500/32 border border-orange-500 inline-block" />
                                        <span className="text-zinc-200 font-bold">Occupé (Orange)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-zinc-800/40 border border-zinc-700 inline-block" />
                                        <span className="text-zinc-200 font-bold">Vacant (Standard)</span>
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

                        <div className="xl:w-[450px] shrink-0 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col shadow-2xl relative rounded-none h-[500px] lg:h-[800px]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-housing-500" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                                <span className="flex items-center gap-3"><Users className="w-5 h-5 text-housing-500" /> {bldg}</span>
                                <span className="text-[10px] font-mono opacity-50">{BUILDINGS[bldg].find(f => f.value === floor)?.label}</span>
                            </h3>

                            {/* Selected Apartment Full Specs Card (with occupancy info) */}
                            {selectedRoom && apartmentsDetails[selectedRoom] && (() => {
                                const detail = apartmentsDetails[selectedRoom];
                                const baseRent = parseNumeric(detail.Tarif);
                                const allocBoursier = parseNumeric(detail['Allocation boursier']);
                                const allocNonBoursier = parseNumeric(detail['Allocation non boursier']);

                                const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
                                const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
                                const surf = parseNumeric(detail.Superficie);

                                return (
                                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/70 space-y-3">
                                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                            <div className="flex items-center gap-2 font-mono">
                                                <div className="w-2 h-2 rounded-full bg-housing-500 animate-pulse" />
                                                <span className="text-sm font-black text-white uppercase">Logement {selectedRoom}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 border ${occupied[selectedRoom]?.length > 0 ? 'bg-housing-500/20 text-housing-400 border-housing-500/40' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {occupied[selectedRoom]?.length > 0 ? `Occupé (${occupied[selectedRoom].length})` : 'Vacant'}
                                                </span>
                                                <button onClick={() => setSelectedRoom(null)} title="Désélectionner" className="text-zinc-500 hover:text-white p-1">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                                            <div className="p-2 bg-zinc-900/80 border border-zinc-800">
                                                <span className="text-[8px] font-mono text-zinc-500 uppercase block">Type de logement</span>
                                                <span className="font-bold text-white uppercase">{detail.Type || '-'}</span>
                                            </div>
                                            <div className="p-2 bg-zinc-900/80 border border-zinc-800">
                                                <span className="text-[8px] font-mono text-zinc-500 uppercase block">Superficie</span>
                                                <span className="font-bold text-white">{surf > 0 ? `${surf} m²` : (detail.Superficie || '-')}</span>
                                            </div>
                                            <div className="p-2 bg-housing-500/10 border border-housing-500/20 col-span-2 flex justify-between items-center">
                                                <span className="text-[8px] font-mono text-zinc-300 uppercase font-bold">Loyer Brut</span>
                                                <span className="font-black text-housing-400">{baseRent > 0 ? `${baseRent} €/mois` : (detail.Tarif || '-')}</span>
                                            </div>
                                            <div className="p-2 bg-zinc-900/80 border border-zinc-800 flex flex-col gap-0.5">
                                                <span className="text-[8px] font-mono text-zinc-500 uppercase">Boursier (-${allocBoursier}€ APL/ALS)</span>
                                                <span className="font-bold text-emerald-400 text-xs">{netBoursier > 0 ? `${netBoursier} €/m` : '-'}</span>
                                            </div>
                                            <div className="p-2 bg-zinc-900/80 border border-zinc-800 flex flex-col gap-0.5">
                                                <span className="text-[8px] font-mono text-zinc-500 uppercase">Non-Boursier (-${allocNonBoursier}€ APL/ALS)</span>
                                                <span className="font-bold text-zinc-200 text-xs">{netNonBoursier > 0 ? `${netNonBoursier} €/m` : '-'}</span>
                                            </div>
                                        </div>

                                        {/* Occupants list with student profile links */}
                                        {occupied[selectedRoom]?.length > 0 && (
                                            <div className="pt-2 border-t border-zinc-800/60 space-y-1 font-mono">
                                                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black block mb-1">Occupants enregistrés</span>
                                                {occupied[selectedRoom].map((o: any) => (
                                                    <button key={o.id} onClick={() => router.push(`/palantint/students/${o.id}`)} className="w-full text-left text-[11px] font-mono text-zinc-300 hover:text-housing-400 truncate uppercase border border-zinc-800 p-1.5 bg-black/40 hover:bg-zinc-900 transition-colors flex items-center justify-between">
                                                        <span>{o.first_name} {o.last_name}</span>
                                                        <Eye className="w-3 h-3 text-zinc-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {currentViewApts.length > 0 ? currentViewApts.map((apt) => (
                                    <div key={apt} className={`border-b border-zinc-800/30 p-4 transition-all cursor-pointer ${selectedRoom === apt ? "bg-housing-500/5 border-l-2 border-housing-500" : "hover:bg-zinc-900/40 border-l-2 border-transparent"}`} onClick={() => { setSelectedRoom(apt); setSearch(apt); }}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white font-mono">{apt}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono">{occupied[apt]?.length || 0} residents</span>
                                        </div>
                                        {occupied[apt]?.length > 0 && (
                                            <div className="mt-3 space-y-1">
                                                {occupied[apt].map((o: any) => (
                                                    <button key={o.id} onClick={(e) => { e.stopPropagation(); router.push(`/palantint/students/${o.id}`); }} className="w-full text-left text-[11px] font-mono text-zinc-400 hover:text-housing-400 truncate uppercase border border-zinc-800/50 p-1 bg-black/20 hover:bg-black/40 transition-colors">
                                                        {o.first_name} {o.last_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : <div className="p-10 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">No assets detected</div>}
                            </div>
                        </div>
                    </div>

                    {renderSelectors()}

                    {/* Section 2: Building Skeleton & Reference Blueprint */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-800/60">
                        
                        {/* 3D Skeleton */}
                        <Box
                            className="h-[600px] p-1"
                            contentClassName="bg-zinc-950/20"
                            icon={<Layers className="w-4 h-4 text-housing-500" />}
                            title="Building Wireframe"
                        >
                            <BuildingModel
                                bldg={bldg}
                                floors={BUILDINGS[bldg]}
                                activeFloor={floor}
                                buildingSvgs={buildingSvgs}
                                buildingMetadata={buildingMetadata}
                            />
                        </Box>
                        {/* Reference PNG */}
                        <Box
                            className="h-[600px] p-1"
                            contentClassName="flex items-center justify-center bg-zinc-950/20 p-8"
                            icon={<FileText className="w-4 h-4 text-housing-500" />}
                            title="Floor Map Image"
                        >
                            <a href={getPngPath(bldg, floor)} target="_blank" rel="noopener noreferrer" className="absolute inset-0 p-4">
                                <img 
                                    src={getPngPath(bldg, floor)} 
                                    alt="Full Plan" 
                                    className="w-full h-full object-contain brightness-90 saturate-[0.8] contrast-125 hover:brightness-110 transition-all" 
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
                                />
                            </a>
                            {!getPngPath(bldg, floor) && (
                                <div className="text-zinc-800 font-mono text-[10px] uppercase tracking-widest">No blueprint data</div>
                            )}
                        </Box>

                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ApartmentsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                Loading assets...
            </div>
        }>
            <ApartmentsContent />
        </Suspense>
    );
}
