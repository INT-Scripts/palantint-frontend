"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Map, Check } from "lucide-react";
import type { CampusBuilding, Place } from "@/lib/campus";

function Outline({ feature }: { feature?: Place }) {
    if (!feature || !feature.bbox) return <Building2 className="h-8 w-8" />;
    const [west, south, east, north] = feature.bbox;
    const scale = 52 / Math.max(east - west, (north - south) * 1.5);
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
    return <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true"><g transform={`translate(${32 - (east - west) * scale / 2}, ${32 - (north - south) * scale * 1.5 / 2})`}><path d={polygons.flatMap(polygon => polygon.map(ring => ring.map(([x, y], index) => `${index ? "L" : "M"}${(x - west) * scale},${(north - y) * scale * 1.5}`).join(" ") + "Z")).join(" ")} fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" fillRule="evenodd" /></g></svg>;
}

export default function BuildingPicker({ buildings, features, selected, onSelect }: {
    buildings: CampusBuilding[];
    features: globalThis.Map<string, Place>;
    selected?: CampusBuilding;
    onSelect: (id: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", close);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
    }, [open]);
    const choose = (id: string | null) => { onSelect(id); setOpen(false); };
    return <div ref={root} className="relative">
        <button aria-label="Choisir un bâtiment" aria-expanded={open} aria-controls="campus-buildings" onClick={() => setOpen(!open)} className="flex h-11 w-full items-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/95 px-3 text-xs font-mono uppercase tracking-wider text-white shadow-xl backdrop-blur-xl hover:border-campus-400/60"><Building2 className="h-4 w-4 shrink-0 text-campus-400" /><span className="max-w-48 truncate">{selected?.name || "Campus"}</span><ChevronDown className={`ml-auto h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} /></button>
        {open && <div id="campus-buildings" className="absolute left-0 top-14 z-40 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-none border border-zinc-800 bg-zinc-950/95 p-2 font-mono shadow-2xl backdrop-blur-xl">
            <button onClick={() => choose(null)} className="mb-2 flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-xs uppercase tracking-wider text-zinc-300 hover:bg-zinc-900"><Map className="h-5 w-5 text-campus-400" />Campus{!selected && <Check className="ml-auto h-4 w-4" />}</button>
            <div className="grid max-h-[55dvh] grid-cols-3 gap-1 overflow-y-auto">{buildings.map(building => <button key={building.id} aria-pressed={selected?.id === building.id} onClick={() => choose(building.id)} className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-none border p-2 text-[10px] uppercase tracking-wide transition-colors ${selected?.id === building.id ? "border-campus-400/50 bg-campus-500/15 text-campus-300" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}><Outline feature={features.get(building.feature_id || "")} /><span className="line-clamp-2 text-center leading-tight">{building.name}</span></button>)}</div>
        </div>}
    </div>;
}
