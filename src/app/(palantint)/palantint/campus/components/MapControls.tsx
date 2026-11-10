"use client";

import type { ComponentType } from "react";
import { Box, LocateFixed, Map as MapIcon, Minus, Navigation2, Plus, Satellite, Tags } from "lucide-react";

export type CampusView = "plan" | "satellite" | "3d";

const VIEWS: { value: CampusView; label: string; title: string; icon: ComponentType<{ className?: string }> }[] = [
    { value: "plan", label: "Plan", title: "Plan du campus", icon: MapIcon },
    { value: "satellite", label: "Satellite", title: "Photographie aérienne", icon: Satellite },
    { value: "3d", label: "3D", title: "Vue 3D (photogrammétrie et relief)", icon: Box },
];
const button = "flex h-10 w-10 items-center justify-center rounded-none text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 disabled:opacity-40";

/** One choice of rendering: each view brings its own base layers, so there is nothing else to toggle. */
export function ViewSwitch({ view, onChange, available }: { view: CampusView; onChange: (view: CampusView) => void; available: Record<CampusView, boolean> }) {
    return <div role="radiogroup" aria-label="Vue du campus" className="flex rounded-none border border-zinc-800 bg-zinc-950/95 p-1 font-mono shadow-xl backdrop-blur-xl">
        {VIEWS.filter(item => available[item.value]).map(({ value, label, title, icon: Icon }) => <button key={value} role="radio" aria-checked={view === value} title={title} onClick={() => onChange(value)} className={`flex h-9 items-center gap-2 rounded-none px-3 text-[11px] uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 ${view === value ? "bg-campus-500/15 text-campus-300" : "text-zinc-500 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}
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
