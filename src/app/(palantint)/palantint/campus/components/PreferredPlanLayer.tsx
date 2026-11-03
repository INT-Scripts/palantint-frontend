"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Map } from 'lucide-react';
import { fetchPrivate } from '@/lib/api';
import { readFloorPlan, type FloorPlan } from '@/lib/planGeometry';
import type { FloorDef } from '@/lib/buildings';
import { BuildingWireframe } from '../../apartments/components/BuildingModel';
import type { useGeoCampus } from './GeoCampusLayer';
type Overlay = {
    id: string;
    building: string;
    campus_building_ids: string[];
    campus_requirements: Record<string, string[]>;
    floors: FloorDef[];
    metadata: Record<string, {
        pillars?: {
            x: number;
            y: number;
        }[];
    }>;
    wireframe: {
        position: [
            number,
            number,
            number
        ];
        rotation: [
            number,
            number,
            number
        ];
        scale: number;
        floor_height: number;
    };
};
export type ReadyOverlay = Overlay & {
    plans: Record<string, FloorPlan>;
};
export function usePreferredPlans() {
    const [overlays, setOverlays] = useState<ReadyOverlay[]>([]);
    useEffect(() => {
        const controller = new AbortController();
        fetchPrivate('/maps/3d-overlays', { signal: controller.signal }).then(async (result) => {
            const values = await Promise.all((result.overlays as Overlay[]).map(async (overlay) => { try {
                const plans = Object.fromEntries(await Promise.all(overlay.floors.map(async (floor) => [floor.value, await readFloorPlan(await fetch(floor.assets.geojson, { signal: controller.signal }))] as const)));
                return { ...overlay, plans };
            }
            catch {
                return null;
            } }));
            if (!controller.signal.aborted)
                setOverlays(values.filter((value): value is ReadyOverlay => value !== null));
        }).catch(() => { });
        return () => controller.abort();
    }, []);
    return overlays;
}
export function PreferredPlanMeshes({ overlays, geo, photo }: {
    overlays: ReadyOverlay[];
    geo: ReturnType<typeof useGeoCampus>;
    photo: boolean;
}) {
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    return <group>{overlays.map(overlay => { const active = params.get('plan_building') === overlay.building ? params.get('plan_floor') : null; const floor = overlay.floors.find(f => f.value === active)?.value || overlay.floors[0].value; return <BuildingWireframe key={overlay.id} floors={overlay.floors} activeFloor={floor} buildingPlans={overlay.plans} buildingMetadata={overlay.metadata} autoRotate={false} position={overlay.wireframe.position} rotation={overlay.wireframe.rotation} scale={overlay.wireframe.scale} floorHeight={overlay.wireframe.floor_height} accent="#a78bfa" xray={photo} selectedRoom={params.get('plan_building') === overlay.building ? params.get('plan_room') : null} onSelectRoom={(room, selectedFloor) => geo.update({ building: overlay.campus_building_ids[0] || null, feature: null, plan_building: overlay.building, plan_floor: selectedFloor, plan_room: room })}/>; })}</group>;
}
export function PreferredPlanControls({ overlays, geo }: {
    overlays: ReadyOverlay[];
    geo: ReturnType<typeof useGeoCampus>;
}) {
    const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
    const selected = overlays.find(o => o.building === params.get('plan_building')) || overlays[0];
    if (!selected)
        return null;
    const floor = selected.floors.find(f => f.value === params.get('plan_floor')) || selected.floors[0];
    const room = params.get('plan_building') === selected.building ? params.get('plan_room') : null;
    const query = new URLSearchParams({ bldg: selected.building, floor: floor.value, ...(room ? { room } : {}) });
    const href = selected.building === 'Foyer' ? `/palantint/foyer?${query}` : `/palantint/apartments?${query}`;
    return <><nav aria-label="Étages des plans du bâtiment" className="absolute right-5 top-1/2 z-20 flex max-h-[65%] -translate-y-1/2 flex-col gap-1 overflow-auto border border-zinc-800 bg-zinc-950/95 p-1.5 font-mono">{overlays.length > 1 && <div className="flex gap-1">{overlays.map(o => <button key={o.id} aria-pressed={o.id === selected.id} onClick={() => geo.update({ plan_building: o.building, plan_floor: o.floors[0].value, plan_room: null })} className="p-2 text-xs text-campus-300">{o.building}</button>)}</div>}{[...selected.floors].reverse().map(f => <button key={f.value} aria-label={`${selected.building} ${f.label}`} aria-pressed={f.value === floor.value} onClick={() => geo.update({ plan_building: selected.building, plan_floor: f.value, plan_room: null })} className={`min-h-10 px-3 text-xs ${f.value === floor.value ? 'border border-campus-500/60 bg-campus-500/15 text-campus-300' : 'text-zinc-500 hover:text-white'}`}>{f.label}</button>)}</nav>{room && <section className="absolute bottom-5 left-5 z-20 w-64 border border-zinc-800 bg-zinc-950/95 p-4 font-mono"><div className="flex justify-between text-sm text-white"><span>{room}</span><button aria-label="Fermer la salle du plan" onClick={() => geo.update({ plan_room: null })}><X size={16}/></button></div><Link href={href} className="mt-3 flex items-center gap-2 text-xs text-campus-400"><Map size={16}/>Plan 2D</Link></section>}</>;
}
