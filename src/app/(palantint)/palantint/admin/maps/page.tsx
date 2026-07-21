"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { fetchPrivate } from "@/lib/api";
import { 
    Target, Undo, Ghost, 
    ArrowLeft, Building2, Layers, Save,
    ChevronLeft, ChevronRight, Trash2, Map, Compass,
    ZoomIn, ZoomOut, Maximize2, Move, MousePointer2,
    ChevronUp, ChevronDown, Plus, Crosshair, ArrowUpDown,
    Magnet, MousePointer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const BUILDINGS = {
    U1: ["0", "1", "2", "3", "4", "5"],
    U2: ["1", "2", "3", "4", "5"],
    U3: ["0", "1", "2"],
    U4: ["1", "2", "3", "4", "5", "6"],
    U5: ["-0.5", "0.5", "1", "2", "3", "4"],
    U6: ["1", "2", "3"],
    U7: ["1", "2", "3", "4", "5", "6"],
};

export default function MapCalibrationPage() {
    const [bldg, setBldg] = useState("U7");
    const [floor, setFloor] = useState("1");
    const [svgContent, setSvgContent] = useState("");
    const [prevSvgContent, setPrevSvgContent] = useState("");
    const [metadata, setMetadata] = useState<any>({ pillars: [] });
    const [prevMetadata, setPrevMetadata] = useState<any>(null);
    const [showGhost, setShowGhost] = useState(true);
    const [loading, setLoading] = useState(false);
    const [snapMode, setSnapMode] = useState(true);
    
    // Viewport State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [didDrag, setDidDrag] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const startMousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setLoading(true);
        const load = async () => {
            try {
                const res = await fetch(`/api/assets/plans/${bldg}_${floor}.svg`);
                if (res.ok) setSvgContent(await res.text());
                const meta = await fetchPrivate(`/maps/${bldg}/${floor}/metadata`);
                setMetadata(meta || { pillars: [] });
            } catch (e) {
                setSvgContent("");
            }

            const floors = (BUILDINGS as any)[bldg];
            const idx = floors.indexOf(floor);
            if (idx > 0) {
                const prevF = floors[idx - 1];
                const pRes = await fetch(`/api/assets/plans/${bldg}_${prevF}.svg`);
                if (pRes.ok) setPrevSvgContent(await pRes.text());
                const pMeta = await fetchPrivate(`/maps/${bldg}/${prevF}/metadata`);
                setPrevMetadata(pMeta);
            } else {
                setPrevSvgContent("");
                setPrevMetadata(null);
            }
            setLoading(false);
        };
        load();
    }, [bldg, floor]);

    // Extract all geometric vertices for snapping
    const svgVertices = useMemo(() => {
        if (!svgContent) return [];
        try {
            const loader = new SVGLoader();
            const svgData = loader.parse(svgContent);
            const viewBoxMatch = svgContent.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
            const vw = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 1000;
            const vh = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 1000;

            const vertices: {x: number, y: number}[] = [];
            svgData.paths.forEach((path) => {
                path.subPaths.forEach((subPath) => {
                    const points = subPath.getPoints();
                    points.forEach(p => {
                        vertices.push({
                            x: (p.x / vw) * 100,
                            y: (p.y / vh) * 100
                        });
                    });
                });
            });
            return vertices;
        } catch (e) {
            console.error("Vertex extraction failed", e);
            return [];
        }
    }, [svgContent]);

    const handleMapClick = (e: React.MouseEvent) => {
        if (didDrag || !containerRef.current) return;
        
        if (metadata.pillars.length >= 2) {
            toast.error("Calibration requires exactly two reference pillars.");
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // APPLY SNAPPING (Always find closest if enabled)
        if (snapMode && svgVertices.length > 0) {
            let closest = svgVertices[0];
            let minDist = Math.pow(x - closest.x, 2) + Math.pow(y - closest.y, 2);
            
            for (let i = 1; i < svgVertices.length; i++) {
                const d = Math.pow(x - svgVertices[i].x, 2) + Math.pow(y - svgVertices[i].y, 2);
                if (d < minDist) {
                    minDist = d;
                    closest = svgVertices[i];
                }
            }
            
            x = closest.x;
            y = closest.y;
            toast.success("Locked to geometric vertex.");
        }

        setMetadata({ ...metadata, pillars: [...metadata.pillars, { x, y }] });
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        setDidDrag(false);
        startMousePos.current = { x: e.clientX, y: e.clientY };
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        const totalDist = Math.sqrt(Math.pow(e.clientX - startMousePos.current.x, 2) + Math.pow(e.clientY - startMousePos.current.y, 2));
        if (totalDist > 5) setDidDrag(true);
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, [isPanning]);

    const onMouseUp = useCallback(() => setIsPanning(false), []);

    useEffect(() => {
        if (isPanning) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isPanning, onMouseMove, onMouseUp]);

    const save = async () => {
        try {
            await fetchPrivate(`/maps/${bldg}/${floor}/metadata`, {
                method: "POST",
                body: JSON.stringify(metadata)
            });
            toast.success("Structural skeleton updated for level " + floor);
        } catch (e) {
            toast.error("Data synchronization failed");
        }
    };

    const removePillar = (idx: number) => {
        const p = [...metadata.pillars];
        p.splice(idx, 1);
        setMetadata({ ...metadata, pillars: p });
    };

    const swapPillars = () => {
        if (metadata.pillars.length !== 2) return;
        const p = [metadata.pillars[1], metadata.pillars[0]];
        setMetadata({ ...metadata, pillars: p });
        toast.info("Pillar IDs interchanged.");
    };

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    return (
        <div className="space-y-8 pb-20">
            <header className="animate-in fade-in slide-in-from-top-4 duration-1000 ease-out flex items-end justify-between border-b border-zinc-800/60 pb-6 relative rounded-none">
                <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-housing-500 to-transparent shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                <div className="flex items-center gap-6">
                    <Link href="/palantint/admin">
                        <Button variant="outline" size="icon" className="rounded-none border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-colors h-12 w-12 shadow-none">
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-housing-500 mb-2">
                            <Compass className="w-4 h-4" />
                            <span className="font-mono text-xs tracking-[0.3em] font-bold">STRUCTURAL CALIBRATION</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">
                            Skeleton <span className="text-zinc-700">Editor</span>
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 border border-zinc-800">
                    <div className="flex items-center bg-black/40 border border-zinc-800/60 p-1 mr-2 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(prev + 0.2, 10))} className="h-8 w-8 text-zinc-400 hover:text-white rounded-none">
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.2))} className="h-8 w-8 text-zinc-400 hover:text-white rounded-none">
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={resetView} className="h-8 w-8 text-zinc-400 hover:text-white rounded-none" title="Reset View">
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                        <div className="h-4 w-px bg-zinc-800 mx-1" />
                        <span className="text-[10px] font-black font-mono text-white px-2">{(zoom * 100).toFixed(0)}%</span>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => setShowGhost(!showGhost)} className={`font-mono text-[10px] uppercase tracking-widest h-9 px-4 rounded-none transition-all ${showGhost ? 'bg-housing-500/10 border-housing-500/40 text-housing-400 shadow-none' : 'bg-zinc-950 border-zinc-800 text-zinc-600'}`}>
                        <Ghost className="w-3.5 h-3.5 mr-2" /> Reference: {showGhost ? 'VISIBLE' : 'HIDDEN'}
                    </Button>
                    
                    <div className="w-px h-6 bg-zinc-800 mx-1" />

                    <Button size="sm" onClick={save} className="bg-housing-600 hover:bg-housing-500 text-white font-mono text-[10px] uppercase tracking-widest h-9 px-6 rounded-none border border-housing-400/30 shadow-none">
                        <Save className="w-3.5 h-3.5 mr-2" /> Commit Changes
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-3 space-y-6">
                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-none space-y-6 shadow-xl">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">Building Identification</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {Object.keys(BUILDINGS).map(b => (
                                    <button 
                                        key={b} 
                                        onClick={() => setBldg(b)}
                                        className={`h-10 text-[11px] font-black font-mono border transition-all rounded-none ${bldg === b ? 'bg-housing-600/20 border-comms-500 text-white shadow-none' : 'bg-black/40 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                            <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">Vertical Level</label>
                            <div className="flex flex-wrap gap-1.5">
                                {(BUILDINGS as any)[bldg].map((f: string) => (
                                    <button 
                                        key={f} 
                                        onClick={() => setFloor(f)}
                                        className={`px-4 py-2 text-[10px] font-bold font-mono border transition-all rounded-none ${floor === f ? 'bg-zinc-100 border-white text-black shadow-none' : 'bg-black/40 border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-none space-y-6 shadow-xl">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">Precision Mode</label>
                                <div className="flex bg-black/40 border border-zinc-800 p-0.5">
                                    <button 
                                        onClick={() => setSnapMode(false)}
                                        className={`p-1 transition-all ${!snapMode ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                                        title="Manual Mode"
                                    >
                                        <MousePointer className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => setSnapMode(true)}
                                        className={`p-1 transition-all ${snapMode ? 'bg-housing-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'text-zinc-600 hover:text-zinc-400'}`}
                                        title="Auto-Snap to Vertex"
                                    >
                                        <Magnet className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className={`p-4 border flex items-center gap-4 transition-all ${snapMode ? 'bg-housing-500/5 border-housing-500/20' : 'bg-zinc-950 border-zinc-800'}`}>
                                {snapMode ? <Magnet className="w-6 h-6 text-housing-500 animate-pulse" /> : <MousePointer className="w-6 h-6 text-zinc-600" />}
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight">
                                        {snapMode ? "Auto-Snap Active" : "Manual Placement"}
                                    </span>
                                    <span className="text-[8px] font-mono text-zinc-500 uppercase">
                                        {snapMode ? "Aligns to closest vertex" : "Free coordinate capture"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">Reference Points</label>
                                {metadata.pillars.length === 2 && (
                                    <button 
                                        onClick={swapPillars}
                                        className="text-[9px] font-bold font-mono text-housing-500 hover:text-white flex items-center gap-1.5 transition-colors uppercase px-2 py-0.5 border border-housing-500/20 hover:bg-housing-500/10"
                                    >
                                        <ArrowUpDown className="w-3 h-3" /> Interchange
                                    </button>
                                )}
                            </div>
                            <div className="space-y-1 pr-2">
                                {[0, 1].map((i) => {
                                    const p = metadata.pillars[i];
                                    return (
                                        <div key={i} className="flex items-center justify-between bg-black/40 border border-zinc-800/50 p-2.5 group transition-all hover:border-housing-500/30 rounded-none min-h-[40px]">
                                            {p ? (
                                                <>
                                                    <span className="text-[9px] font-mono text-zinc-400 tracking-wider flex-1">PILLAR_{i+1} ➔ {p.x.toFixed(2)}%, {p.y.toFixed(2)}%</span>
                                                    <button onClick={() => removePillar(i)} className="text-zinc-700 hover:text-comms-500 transition-colors ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </>
                                            ) : (
                                                <span className="text-[9px] font-mono text-zinc-700 italic uppercase tracking-widest">Awaiting Pillar {i+1}...</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-6 rounded-none space-y-3 shadow-xl">
                        <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-[0.2em]">Navigation Legend</label>
                        <div className="space-y-2 font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
                            <div className="flex items-center gap-3">
                                <Move className="w-3.5 h-3.5" /> <span>Click & Drag to Pan</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Plus className="w-3.5 h-3.5" /> <span>Click to set Reference</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    ref={workspaceRef}
                    onMouseDown={onMouseDown}
                    className={`col-span-9 bg-black border border-zinc-800/60 rounded-none relative overflow-hidden group min-h-[750px] flex items-center justify-center shadow-2xl ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                >
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    
                    {loading && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center rounded-none">
                            <div className="w-12 h-12 border-2 border-housing-500 border-t-transparent animate-spin rounded-none" />
                        </div>
                    )}

                    <div 
                        className="relative w-full h-full flex items-center justify-center p-16 transition-transform duration-75 ease-out select-none"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
                    >
                        <div 
                            ref={containerRef}
                            onClick={handleMapClick}
                            className="relative group/svg-box origin-center transition-transform duration-200 inline-block"
                            style={{ transform: `scale(${zoom})` }}
                        >
                            {showGhost && prevSvgContent && (
                                <div 
                                    className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
                                    dangerouslySetInnerHTML={{ __html: prevSvgContent }}
                                />
                            )}

                            <div 
                                className="relative flex items-center justify-center pointer-events-none [&_svg]:block [&_svg]:w-auto [&_svg]:h-auto [&_svg]:max-w-[80vw] [&_svg]:max-h-[70vh] [&_svg_path]:stroke-zinc-100 [&_svg_path]:stroke-[1.5px] [&_svg_path]:fill-none [&_svg_rect]:stroke-zinc-100 [&_svg_text]:fill-zinc-400"
                                dangerouslySetInnerHTML={{ __html: svgContent }}
                            />

                            <div className="absolute inset-0 pointer-events-none">
                                {showGhost && prevMetadata && prevMetadata.pillars?.map((p: any, i: number) => (
                                    <div 
                                        key={`ghost-${i}`}
                                        className="absolute w-6 h-6 flex items-center justify-center opacity-20"
                                        style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                                    >
                                        <Crosshair className="w-full h-full text-white" />
                                    </div>
                                ))}

                                {metadata.pillars.map((p: any, i: number) => (
                                    <div 
                                        key={i}
                                        className="absolute w-10 h-10 flex items-center justify-center group/pillar z-20"
                                        style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
                                    >
                                        <div className="absolute w-full h-[1px] bg-housing-500/40" />
                                        <div className="absolute h-full w-[1px] bg-housing-500/40" />
                                        <div className="absolute w-2 h-2 border border-housing-500 bg-housing-500/30 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                        <span className="absolute text-[10px] font-black text-white font-mono drop-shadow-[0_0_4px_rgba(0,0,0,1)]">{i+1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
