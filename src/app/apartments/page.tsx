"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
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

export default function ApartmentsPage() {
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
        if (!BUILDINGS[bldg].find(f => f.value === floor)) {
            setFloor(BUILDINGS[bldg][0].value);
        }
    }, [bldg, floor]);

    useEffect(() => {
        document.title = "Apartments | PalantINT";
        
        // Handle search params for building and floor
        const bldgQ = searchParams.get("bldg");
        const floorQ = searchParams.get("floor");
        
        if (bldgQ && BUILDINGS[bldgQ.toUpperCase()]) {
            setBldg(bldgQ.toUpperCase());
            if (floorQ && BUILDINGS[bldgQ.toUpperCase()].find(f => f.value === floorQ)) {
                setFloor(floorQ);
            }
        }

        fetchAPI("/students/apartments/details")
            .then(data => {
                setApartmentsDetails(data || {});
            })
            .catch(console.error);

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
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [searchParams]);

    useEffect(() => {
        fetch(`/api/assets/plans/${bldg}_${floor}.svg`)
            .then(r => r.ok ? r.text() : "")
            .then(setSvgContent)
            .catch(() => setSvgContent(""));
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
            
            const meta = await fetchAPI(`/maps/${bldg}/metadata`);
            
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
                const containerRect = el.getBoundingClientRect();
                
                if (tooltipRef.current) {
                    tooltipRef.current.style.display = 'block';
                    tooltipRef.current.style.left = `${e.clientX - containerRect.left + 15}px`;
                    tooltipRef.current.style.top = `${e.clientY - containerRect.top + 15}px`;

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
                                <div class="flex items-center gap-2 text-xs text-zinc-300 font-mono mt-1 uppercase">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-housing-500/50"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    ${o.first_name?.[0] || ""}. ${o.last_name || ""}
                                </div>
                            `).join('')
                            : `<p class="text-[10px] text-zinc-500 font-mono italic uppercase">VACANT</p>`;
                        
                        const logData = apartmentsDetailsRef.current[roomNum];
                        let logHtml = '';
                        if (logData) {
                            logHtml = `
                                <div class="mt-3 pt-2 border-t border-zinc-800/50 flex flex-col gap-1.5">
                                    <div class="flex justify-between items-center gap-4 text-[10px] font-mono text-zinc-400">
                                        <span>TYPE</span> <span class="text-white uppercase font-bold">${logData.Type || '-'}</span>
                                    </div>
                                    <div class="flex justify-between items-center gap-4 text-[10px] font-mono text-zinc-400">
                                        <span>SURFACE</span> <span class="text-white uppercase font-bold">${logData.Superficie || '-'}</span>
                                    </div>
                                    <div class="flex justify-between items-center gap-4 text-[10px] font-mono text-zinc-400">
                                        <span>TARIF</span> <span class="text-housing-400 font-black">${logData.Tarif || '-'}</span>
                                    </div>
                                    <div class="flex justify-between items-center gap-4 text-[10px] font-mono text-zinc-500">
                                        <span>ALLOC. BOURSIER</span> <span>${logData['Allocation boursier'] || '-'}</span>
                                    </div>
                                    <div class="flex justify-between items-center gap-4 text-[10px] font-mono text-zinc-500">
                                        <span>ALLOC. NON-BOURSIER</span> <span>${logData['Allocation non boursier'] || '-'}</span>
                                    </div>
                                </div>
                            `;
                        }

                        tooltipRef.current.innerHTML = `
                            <div class="flex items-center gap-2 mb-2 border-b border-housing-500/30 pb-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-housing-500"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                <span class="text-xs font-black text-white font-mono uppercase">APT_${roomNum}</span>
                            </div>
                            ${occupantsHtml}
                            ${logHtml}
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

    // 2. Visual State Sync Hook (Only Selection)
    useEffect(() => {
        const el = svgRef.current;
        if (!el) return;

        el.querySelectorAll("a.group").forEach(a => {
            if (a.getAttribute("data-room") === selectedRoom) {
                a.setAttribute("data-active", "true");
            } else {
                a.removeAttribute("data-active");
            }
        });
    }, [selectedRoom, svgContent]);

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
            <div className={`p-4 sm:p-6 space-y-4 ${className}`}>
                <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                    <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">{label}</label>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden sm:block">
                        {currentLabel}: <span className="text-white font-black">{currentValue}</span>
                    </span>
                </div>
                <div className="pt-2">{children}</div>
            </div>
        );

        const ControlButton = ({ active, onClick, label, count, className = "" }: any) => (
            <button
                onClick={onClick}
                className={`group relative w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 border transition-all duration-300 rounded-none ${
                    active 
                        ? "bg-zinc-800 text-white border-zinc-500 shadow-inner" 
                        : "bg-zinc-950/50 border-transparent text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 hover:border-zinc-700"
                } ${className}`}
            >
                <span className={`text-[10px] sm:text-[11px] font-black font-mono tracking-widest mb-1 sm:mb-1.5 transition-colors ${active ? "text-housing-400" : "text-zinc-500"}`}>{label}</span>
                <div className="flex items-center gap-1.5 w-full justify-center">
                    <div className={`h-1 w-6 sm:w-10 transition-colors ${active ? "bg-housing-500" : "bg-zinc-800 group-hover:bg-zinc-700"}`} />
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold opacity-60">({count})</span>
                </div>
            </button>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-zinc-900/50 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-3xl rounded-none">
                <ControlBox label="Buildings" currentLabel="Current" currentValue={bldg} className="col-span-12 md:col-span-5 lg:col-span-4 xl:col-span-5">
                    <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-7 gap-1.5">
                        {Object.keys(BUILDINGS).map(b => (
                            <ControlButton key={b} active={bldg === b} onClick={() => setBldg(b)} label={b} count={getBuildingResidentCount(b)} />
                        ))}
                    </div>
                </ControlBox>
                <ControlBox 
                    label="Floors" 
                    currentLabel="Current" 
                    currentValue={BUILDINGS[bldg].find(f => f.value === floor)?.label || floor}
                    className="col-span-12 md:col-span-7 lg:col-span-8 xl:col-span-7 border-t md:border-t-0 md:border-l border-zinc-800"
                >
                    <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5">
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
                        subtitle="Centralized mapping for student housing assets."
                        colorName="housing"
                        searchPlaceholder="QUERY: APARTMENT NUMBER"
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
                                                   [&_.room-area]:fill-transparent [&_.room-area]:stroke-zinc-800/50 [&_.room-area]:stroke-[0.5px] [&_.room-area]:transition-none
                                                   [&_a.group[data-hover='true']_.room-area]:fill-student-500/30 [&_a.group[data-hover='true']_.room-area]:stroke-student-400 [&_a.group[data-hover='true']_.room-area]:stroke-[1.5px] [&_a.group[data-hover='true']_.room-area]:cursor-crosshair
                                                   [&_a.group[data-active='true']_.room-area]:fill-housing-500/60 [&_a.group[data-active='true']_.room-area]:stroke-housing-500 [&_a.group[data-active='true']_.room-area]:stroke-2
                                                   [&_a.group[data-active='true'][data-hover='true']_.room-area]:fill-housing-400/80
                                                   [&_.room-label]:font-sans
                                                   [&_a.group:hover_.room-label]:fill-white [&_a.group:hover_.room-label]:font-black
                                                   [&_a.group[data-active='true']_.room-label]:fill-white [&_a.group[data-active='true']_.room-label]:font-black"
                                        dangerouslySetInnerHTML={{ __html: svgContent || `<div class="m-auto flex flex-col items-center justify-center text-zinc-600 gap-4 font-mono uppercase tracking-widest"><svg class="w-16 h-16 opacity-30 text-comms-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span class="text-xs text-comms-500/80 text-center">PLAN_NOT_FOUND</span></div>` }}
                                    />
                                </div>
                            </div>

                            {/* Direct DOM updated tooltip */}
                            <div
                                ref={tooltipRef}
                                className="absolute z-50 bg-zinc-950/90 backdrop-blur-md border border-housing-500 px-3 py-2 pointer-events-none rounded-none"
                            />
                        </Box>

                        <div className="xl:w-[450px] shrink-0 bg-zinc-900/40 backdrop-blur-3xl border border-zinc-800 flex flex-col shadow-2xl relative rounded-none h-[500px] lg:h-[800px]">
                            <div className="absolute top-0 left-0 w-full h-1 bg-housing-500" />
                            <h3 className="text-sm font-black text-white uppercase tracking-widest p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                                <span className="flex items-center gap-3"><Users className="w-5 h-5 text-housing-500" /> {bldg}</span>
                                <span className="text-[10px] font-mono opacity-50">{BUILDINGS[bldg].find(f => f.value === floor)?.label}</span>
                            </h3>
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
                                                    <button key={o.id} onClick={(e) => { e.stopPropagation(); router.push(`/students/${o.id}`); }} className="w-full text-left text-[11px] font-mono text-zinc-400 hover:text-housing-400 truncate uppercase border border-zinc-800/50 p-1 bg-black/20 hover:bg-black/40 transition-colors">
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
