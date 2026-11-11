"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { Box, LocateFixed, Map as MapIcon, Minus, Navigation2, Plus, Satellite, Tags } from "lucide-react";

export type CampusView = "plan" | "satellite" | "3d";

/**
 * Side panel on desktop; on phones a bottom sheet with two sizes: a short one that
 * leaves the map usable, and a tall one for reading. Tap or drag the handle to switch.
 * It mounts with the selection, so it always opens short and is absent without focus.
 */
export function PanelSheet({ children }: { children: ReactNode }) {
    const [tall, setTall] = useState(false);
    const drag = useRef<{ y: number; moved: boolean } | null>(null);
    return <div className={`absolute inset-x-0 bottom-0 z-20 flex flex-col transition-[height] duration-200 ${tall ? "h-[88%]" : "h-[38%]"} sm:inset-x-auto sm:left-0 sm:top-0 sm:h-auto sm:w-[380px] sm:pt-[76px] sm:bg-zinc-950/95 sm:transition-none`}>
        <button aria-label={tall ? "Réduire le panneau" : "Agrandir le panneau"} aria-expanded={tall} title={tall ? "Réduire" : "Agrandir"}
            onPointerDown={event => { drag.current = { y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={event => { const start = drag.current; if (start && Math.abs(event.clientY - start.y) > 24) { start.moved = true; setTall(event.clientY < start.y); } }}
            onPointerUp={() => { if (drag.current && !drag.current.moved) setTall(!tall); drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            className="flex h-7 w-full shrink-0 touch-none items-center justify-center border-t border-zinc-800 bg-zinc-950/95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 sm:hidden">
            <span className="h-1 w-10 bg-zinc-600" />
        </button>
        <div className="min-h-0 flex-1">{children}</div>
    </div>;
}

const VIEWS: { value: CampusView; label: string; title: string; icon: ComponentType<{ className?: string }> }[] = [
    { value: "plan", label: "Plan", title: "Plan du campus", icon: MapIcon },
    { value: "satellite", label: "Satellite", title: "Photographie aérienne", icon: Satellite },
    { value: "3d", label: "3D", title: "Vue 3D (photogrammétrie et relief)", icon: Box },
];
const button = "flex h-10 w-10 items-center justify-center rounded-none text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 disabled:opacity-40";

/** One choice of rendering: each view brings its own base layers, so there is nothing else to toggle. */
export function ViewSwitch({ view, onChange, onPrepare, available }: { view: CampusView; onChange: (view: CampusView) => void; onPrepare?: (view: CampusView) => void; available: Record<CampusView, boolean> }) {
    return <div role="radiogroup" aria-label="Vue du campus" className="flex rounded-none border border-zinc-800 bg-zinc-950/95 p-1 font-mono shadow-xl backdrop-blur-xl">
        {VIEWS.filter(item => available[item.value]).map(({ value, label, title, icon: Icon }) => <button key={value} role="radio" aria-checked={view === value} title={title} onClick={() => onChange(value)} onPointerEnter={() => onPrepare?.(value)} onFocus={() => onPrepare?.(value)} className={`flex h-9 items-center gap-2 rounded-none px-3 text-[11px] uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 ${view === value ? "bg-campus-500/15 text-campus-300" : "text-zinc-500 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}
    </div>;
}

/** Zoom, orientation and display commands in the PalantINT style, replacing MapLibre's defaults. */
export function NavigationControls({ bearing, pitched, labels, onZoomIn, onZoomOut, onNorth, onOverview, onLabels }: {
    bearing: number; pitched: boolean; labels: boolean;
    onZoomIn: () => void; onZoomOut: () => void; onNorth: () => void; onOverview: () => void; onLabels: () => void;
}) {
    return <div className="flex flex-col gap-2 font-mono">
        <div className="flex flex-col divide-y divide-zinc-800 border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur-xl">
            <button className={button} title="Tout le campus" aria-label="Tout le campus" onClick={onOverview}><LocateFixed className="h-4 w-4" /></button>
            <button className={`${button} ${labels ? "text-campus-400" : "text-zinc-500"}`} title="Noms des lieux" aria-label="Noms des lieux" aria-pressed={labels} onClick={onLabels}><Tags className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-col divide-y divide-zinc-800 border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur-xl">
            <button className={button} title="Zoomer" aria-label="Zoomer" onClick={onZoomIn}><Plus className="h-4 w-4" /></button>
            <button className={button} title="Dézoomer" aria-label="Dézoomer" onClick={onZoomOut}><Minus className="h-4 w-4" /></button>
            {pitched && <button className={button} title="Orienter vers le nord" aria-label="Orienter vers le nord" onClick={onNorth}><Navigation2 className="h-4 w-4 text-campus-400 transition-transform" style={{ transform: `rotate(${-bearing}deg)` }} /></button>}
        </div>
    </div>;
}
