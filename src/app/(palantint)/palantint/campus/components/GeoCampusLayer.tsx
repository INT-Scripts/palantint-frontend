"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Building2, Camera, Layers, Map, X, CalendarDays } from "lucide-react";
import { loadCampus } from "@/lib/campusData";
import { fetchPrivate } from "@/lib/api";
import { floorName, isCampusDestination, type CampusPlans, type CampusBuilding, type Place } from "@/lib/campus";
import { toScene, type Registration } from "@/lib/campusGeometry";
import { extrudePolygons } from "@/lib/campusExtrusion";
import { timetableHref } from "@/lib/timetableContext";
import BuildingPicker from "@/components/palantint/BuildingPicker";

export function useGeoCampus() {
    const params = useSearchParams();
    const pathname = usePathname();
    const [data, setData] = useState<{ plans: CampusPlans; buildings: CampusBuilding[] } | null>(null);
    const [registration, setRegistration] = useState<Registration | null>(null);
    const [finished, setFinished] = useState(false);
    useEffect(() => {
        let active = true;
        Promise.all([loadCampus(), fetchPrivate("/maps/indoor/registration")]).then(([[plans, manifest], alignment]) => { if (active) {setData({ plans, buildings: manifest.buildings });setRegistration(alignment.registration);} }).catch(() => {}).finally(() => { if (active) setFinished(true); });
        return () => { active = false; };
    }, []);
    // The server owns matching and alignment acceptance; the client renders its result.
    const aligned = registration;
    const features = useMemo(() => new globalThis.Map(data?.plans.features.map(feature => [String(feature.id), feature]) || []), [data]);
    const selected = features.get(params.get("feature") || "");
    const queryBuilding = params.get("building") || String(selected?.properties.building_id || "");
    const building = data?.buildings.find(item => item.id === queryBuilding || item.name.toLowerCase() === queryBuilding.toLowerCase() || item.residences?.some(residence=>residence.code===queryBuilding.toUpperCase()));
    const levels = building?.levels || [];
    const requested = Number(params.get("level") ?? selected?.properties.levels[0] ?? 0);
    const level = levels.includes(requested) ? requested : levels[0] ?? 0;
    const update = (values: Record<string, string | null>) => {
        const next = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(values)) if (value === null) next.delete(key); else next.set(key, value);
        next.set("view", "3d");
        window.history.pushState(null, "", `${pathname}?${next}`);
    };
    const chooseBuilding = (id: string | null) => update({ building: id, level: null, feature: null, room: null });
    const chooseRoom = (feature: Place) => update({ feature: String(feature.id), building: String(feature.properties.building_id), room: null });
    const flightTarget = useMemo(() => {
        if (!aligned || !data) return null;
        const target = selected || (building?.feature_id ? features.get(building.feature_id) : null);
        const bounds = target?.bbox || (!building ? data.plans.metadata.sources[0]?.bounds : null);
        if (!bounds) return null;
        const a = toScene([bounds[0], bounds[1]], aligned), b = toScene([bounds[2], bounds[3]], aligned);
        const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
        const radius = Math.max(selected ? 25 : 45, Math.hypot(a[0] - b[0], a[1] - b[1]) / 2);
        const y = aligned.altitude + level * 3.2 * aligned.scale;
        return { position: new THREE.Vector3(x, y + radius * 1.3, z + radius * 1.4), target: new THREE.Vector3(x, y, z) };
    }, [aligned, data, selected, building, features, level]);
    return { data, finished, registration: aligned, features, building, levels, level, selected, chooseBuilding, chooseRoom, update, flightTarget };
}

/** Convert every exterior and interior ring; no bounding-box approximation. */
export function extrudePlace(feature: Place, registration: Registration, height: number) {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
    return extrudePolygons(polygons.map(rings => rings.map(ring => ring.map(point => toScene(point, registration)))), height);
}

function PlanMesh({ feature, registration, height, altitude, selected, xray, onClick }: {
    feature: Place; registration: Registration; height: number; altitude: number; selected: boolean; xray: boolean; onClick?: () => void;
}) {
    const [hover, setHover] = useState(false);
    const geometry = useMemo(() => extrudePlace(feature, registration, height), [feature, registration, height]);
    const edges = useMemo(() => geometry ? new THREE.EdgesGeometry(geometry, 25) : null, [geometry]);
    useEffect(() => () => { geometry?.dispose(); edges?.dispose(); }, [geometry, edges]);
    const isBuilding = feature.properties.kind === "building";
    const color = selected ? "#fbbf24" : hover ? "#c4b5fd" : isBuilding ? "#a78bfa" : onClick ? "#38bdf8" : "#64748b";
    if (!geometry || !edges) return null;
    return <group position={[0, altitude, 0]}>
        <mesh geometry={geometry} onClick={onClick ? event => { event.stopPropagation(); onClick(); } : undefined} onPointerOver={onClick ? event => { event.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; } : undefined} onPointerOut={onClick ? () => { setHover(false); document.body.style.cursor = "auto"; } : undefined}>
            <meshBasicMaterial color={color} transparent opacity={selected ? 0.5 : hover ? 0.45 : isBuilding ? 0.16 : 0.25} depthWrite={false} depthTest={!xray} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={edges} raycast={() => {}} renderOrder={5}><lineBasicMaterial color={color} transparent opacity={selected || hover ? 1 : 0.65} depthTest={!xray} /></lineSegments>
        {hover && feature.properties.label_coordinates && <Html center position={(() => { const [x, z] = toScene(feature.properties.label_coordinates!, registration); return [x, height + 2, z] as [number, number, number]; })()} style={{ pointerEvents: "none" }}><span className="whitespace-nowrap rounded-none border border-zinc-800 bg-zinc-950/95 px-3 py-2 font-mono text-xs text-white">{feature.properties.name}</span></Html>}
    </group>;
}

export function GeoCampusMeshes({ geo, photo, excludedBuildings = [] }: { geo: ReturnType<typeof useGeoCampus>; photo: boolean; excludedBuildings?:string[] }) {
    const { registration, data, building, level, selected } = geo;
    const buildingFeatures = useMemo(() => data?.plans.features.filter(feature => feature.properties.kind === "building") || [], [data]);
    const rooms = useMemo(() => building ? data?.plans.features.filter(feature => String(feature.properties.building_id) === building.id && feature.properties.levels.includes(level) && ["room", "corridor", "stairs", "elevator"].includes(feature.properties.kind) && ["Polygon", "MultiPolygon"].includes(feature.geometry.type)) || [] : [], [data, building, level]);
    if (!registration) return null;
    if (building && excludedBuildings.includes(building.id)) return null;
    return <group>
        {(building ? [] : buildingFeatures.filter(feature=>!excludedBuildings.includes(String(feature.properties.building_id)))).map(feature => {
            const item = data!.buildings.find(building => building.id === String(feature.properties.building_id));
            const height = Math.max(1, Math.max(0, ...(item?.levels || [])) + 1) * 3.2 * registration.scale;
            return <PlanMesh key={String(feature.id)} feature={feature} registration={registration} height={height} altitude={registration.altitude} selected={false} xray={photo} onClick={() => geo.chooseBuilding(String(feature.properties.building_id))} />;
        })}
        {rooms.map(feature => <PlanMesh key={String(feature.id)} feature={feature} registration={registration} height={2.7 * registration.scale} altitude={registration.altitude + level * 3.2 * registration.scale} selected={selected?.id === feature.id} xray={photo} onClick={isCampusDestination(feature) ? () => geo.chooseRoom(feature) : undefined} />)}
    </group>;
}

function RoomLinks({ selected }: { selected: Place }) {
    const [result, setResult] = useState<{ id: string; room: string | null; occupants: {id: string; first_name: string; last_name: string}[]; clubs: {id: string; name: string}[] } | null>(null);
    const id = selected.properties.location_id;
    useEffect(() => {
        if (!id) return;
        const controller = new AbortController();
        fetchPrivate(`/maps/indoor/locations/${id}`, {signal: controller.signal}).then(data => setResult({ id, room: data.agenda_room, occupants: data.occupants, clubs: data.clubs })).catch(() => {});
        return () => controller.abort();
    }, [id]);
    if (result?.id !== id) return null;
    return <div className="mt-2 space-y-2 text-xs">{result?.room && <Link href={timetableHref({room: result.room, week: new Date()})} className="flex items-center gap-2 text-timetable-400"><CalendarDays className="h-4 w-4" />Agenda</Link>}{result?.occupants.map(person => <Link key={person.id} href={`/palantint/students/${person.id}`} className="block text-student-400">{person.first_name} {person.last_name}</Link>)}{result?.clubs.map(club => <Link key={club.id} href={`/palantint/clubs?club=${club.id}`} className="block text-orga-400">{club.name}</Link>)}</div>;
}

export function GeoCampusControls({ geo, photo, plans, onPhoto, onPlans, customFloors = false }: {
    geo: ReturnType<typeof useGeoCampus>; customFloors?:boolean; photo: boolean; plans: boolean; onPhoto: () => void; onPlans: () => void;
}) {
    return <>
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-24px)] font-mono flex-wrap items-start gap-2 sm:left-5 sm:top-5">
            {geo.data && plans && <div className="w-56"><BuildingPicker buildings={geo.data.buildings} features={geo.features} selected={geo.building} onSelect={geo.chooseBuilding} /></div>}
            {geo.registration && <button title="Plans géographiques 3D" aria-label="Plans géographiques 3D" aria-pressed={plans} onClick={onPlans} className={`rounded-none border border-zinc-800 bg-zinc-950/95 p-3 ${plans ? "text-campus-400" : "text-zinc-500"}`}><Layers className="h-4 w-4" /></button>}
            <button title="Photogrammétrie" aria-label="Photogrammétrie" aria-pressed={photo} onClick={onPhoto} className={`rounded-none border border-zinc-800 bg-zinc-950/95 p-3 ${photo ? "text-campus-400" : "text-zinc-500"}`}><Camera className="h-4 w-4" /></button>
        </div>
        {plans && geo.building && !customFloors && <nav aria-label="Étages 3D" className="absolute right-5 top-1/2 z-20 flex max-h-[60%] -translate-y-1/2 flex-col gap-1 overflow-auto rounded-none border border-zinc-800 bg-zinc-950/95 p-1.5">{[...geo.levels].reverse().map(level => <button key={level} title={floorName(level)} aria-label={floorName(level)} aria-pressed={geo.level === level} onClick={() => geo.update({level: String(level), feature: null})} className={`h-10 min-w-10 rounded-none px-2 text-xs ${geo.level === level ? "border border-campus-500/60 bg-campus-500/15 text-campus-300" : "text-zinc-500 hover:text-white"}`}>{level === 0 ? "RDC" : level}</button>)}</nav>}
        {plans && geo.selected && <section className="absolute bottom-20 left-3 z-20 max-h-[40%] w-64 overflow-y-auto rounded-none border border-zinc-800 bg-zinc-950/95 p-4 font-mono sm:bottom-5 sm:left-5"><div className="flex items-center justify-between gap-3"><h2 className="truncate text-sm font-semibold text-white">{geo.selected.properties.name}</h2><button title="Fermer" aria-label="Fermer le lieu 3D" onClick={() => geo.update({feature: null})}><X className="h-4 w-4 text-zinc-500" /></button></div><RoomLinks selected={geo.selected} /><Link href={`/palantint/campus?${new URLSearchParams({feature: String(geo.selected.id), building: geo.building?.id || "", level: String(geo.level)})}`} className="mt-3 flex items-center gap-2 text-xs text-campus-400"><Map className="h-4 w-4" />Plan 2D</Link></section>}
        {!geo.finished && <span className="absolute bottom-5 left-5 text-xs text-zinc-500">Chargement des plans…</span>}
        {geo.finished && !geo.registration && <span className="absolute bottom-5 left-5 max-w-xs rounded-none bg-zinc-950/90 p-3 text-xs text-zinc-400"><Building2 className="mr-2 inline h-4 w-4" />Alignement des plans indisponible : au moins trois repères cohérents sont nécessaires.</span>}
    </>;
}
