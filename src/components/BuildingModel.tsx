"use client";
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PLAN_SPACE_KINDS, planGeometry, planLines, polygonRings, type FloorPlan } from '@/lib/planGeometry';
import { extrudePolygons } from '@/lib/campusExtrusion';
type FloorData = {
    value: string;
    label: string;
};
export type BuildingWireframeProps = {
    floors: FloorData[];
    activeFloor: string;
    buildingPlans: Record<string, FloorPlan>;
    buildingMetadata: Record<string, {
        pillars?: {
            x: number;
            y: number;
        }[];
    }>;
    autoRotate?: boolean;
    position?: [
        number,
        number,
        number
    ];
    rotation?: [
        number,
        number,
        number
    ];
    scale?: number;
    floorHeight?: number;
    accent?: string;
    xray?: boolean;
    selectedRoom?: string | null;
    onSelectRoom?: (room: string, floor: string) => void;
};
export function BuildingWireframe({ floors, activeFloor, buildingPlans, buildingMetadata, autoRotate = true, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, floorHeight = .5, accent = '#f97316', xray = false, selectedRoom, onSelectRoom }: BuildingWireframeProps) {
    const group = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (autoRotate && group.current)
            group.current.rotation.y += delta * .15;
    });
    const aligned = useMemo(() => {
        let master: number | null = null;
        for (const floor of floors) {
            const plan = buildingPlans[floor.value], p = buildingMetadata[floor.value]?.pillars;
            if (plan && p && p.length >= 2) {
                const v = plan.metadata.view_box;
                master = Math.hypot((p[1].x - p[0].x) / 100 * v[2], (p[1].y - p[0].y) / 100 * v[3]);
                if (master > 0)
                    break;
            }
        }
        const layouts = floors.flatMap(floor => {
            const plan = buildingPlans[floor.value];
            if (!plan)
                return [];
            const v = plan.metadata.view_box, p = buildingMetadata[floor.value]?.pillars;
            let factor = .006, tx = -v[0] - v[2] / 2, ty = -v[1] - v[3] / 2;
            if (p && p.length >= 2 && master) {
                const distance = Math.hypot((p[1].x - p[0].x) / 100 * v[2], (p[1].y - p[0].y) / 100 * v[3]);
                if (distance > 0) {
                    factor *= master / distance;
                    tx = -v[0] - p[0].x / 100 * v[2];
                    ty = -v[1] - p[0].y / 100 * v[3];
                }
            }
            return [{ floor, plan, factor, tx, ty, cx: (v[0] + v[2] / 2 + tx) * factor, cy: (v[1] + v[3] / 2 + ty) * factor }];
        });
        const center = layouts.reduce((sum, p) => ({ x: sum.x + p.cx / Math.max(1, layouts.length), y: sum.y + p.cy / Math.max(1, layouts.length) }), { x: 0, y: 0 });
        return { layouts, center };
    }, [floors, buildingPlans, buildingMetadata]);
    return <group position={position} rotation={rotation} scale={scale}><group ref={group}>{aligned.layouts.map((layout, i) => <PlanFloor key={layout.floor.value} {...layout} center={aligned.center} y={i * floorHeight} height={floorHeight} active={layout.floor.value === activeFloor} accent={accent} xray={xray} selectedRoom={selectedRoom} onSelectRoom={onSelectRoom ? room => onSelectRoom(room, layout.floor.value) : undefined}/>)}</group></group>;
}
function PlanFloor({ plan, factor, tx, ty, center, y, height, active, accent, xray, selectedRoom, onSelectRoom }: {
    plan: FloorPlan;
    factor: number;
    tx: number;
    ty: number;
    center: {
        x: number;
        y: number;
    };
    y: number;
    height: number;
    active: boolean;
    accent: string;
    xray: boolean;
    selectedRoom?: string | null;
    onSelectRoom?: (room: string) => void;
}) {
    const geometries = useMemo(() => {
        const positions: number[] = [];
        const spaces: THREE.ExtrudeGeometry[] = [];
        const surfaces: {
            geometry: THREE.ExtrudeGeometry;
            room: string;
        }[] = [];
        const convert = (p: number[]) => [(p[0] + tx) * factor - center.x, (p[1] + ty) * factor - center.y] as [
            number,
            number
        ];
        for (const feature of plan.features) {
            const geometry = planGeometry(feature);
            if (feature.properties.kind === 'wall')
                for (const line of planLines(geometry)) {
                    for (let i = 1; i < line.length; i++) {
                        const a = convert(line[i - 1]), b = convert(line[i]);
                        positions.push(a[0], 0, a[1], b[0], 0, b[1], a[0], height, a[1], b[0], height, b[1]);
                    }
                    for (const p of line) {
                        const a = convert(p);
                        positions.push(a[0], 0, a[1], a[0], height, a[1]);
                    }
                }
            if (feature.properties.kind === 'room') {
                const polygons = polygonRings(geometry).map(rings => rings.map(ring => ring.map(convert)));
                const surface = extrudePolygons(polygons, .015);
                if (surface)
                    surfaces.push({ geometry: surface, room: feature.properties.room_id || String(feature.id) });
            }
            if (PLAN_SPACE_KINDS.has(feature.properties.kind)) {
                const surface = extrudePolygons(polygonRings(geometry).map(rings => rings.map(ring => ring.map(convert))), .01);
                if (surface)
                    spaces.push(surface);
            }
        }
        const walls = new THREE.BufferGeometry();
        walls.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return { walls, surfaces, spaces };
    }, [plan, factor, tx, ty, center, height]);
    useEffect(() => () => { geometries.walls.dispose(); geometries.surfaces.forEach(({ geometry }) => geometry.dispose()); geometries.spaces.forEach(geometry => geometry.dispose()); }, [geometries]);
    return <group position={[0, y, 0]}><lineSegments geometry={geometries.walls} raycast={() => { }} renderOrder={5}><lineBasicMaterial color={active ? accent : '#71717a'} transparent opacity={active ? 1 : .35} depthTest={!xray}/></lineSegments>{geometries.spaces.map((geometry, i) => <mesh key={`space-${i}`} geometry={geometry} raycast={() => { }}><meshBasicMaterial color="#475569" transparent opacity={active ? .3 : .05} depthWrite={false} depthTest={!xray} side={THREE.DoubleSide}/></mesh>)}{geometries.surfaces.map(({ geometry, room }) => <mesh key={room} geometry={geometry} onClick={active && onSelectRoom ? event => { event.stopPropagation(); onSelectRoom(room); } : undefined}><meshBasicMaterial color={active && room === selectedRoom ? '#fbbf24' : active ? accent : '#52525b'} transparent opacity={active ? .35 : .07} depthWrite={false} depthTest={!xray} side={THREE.DoubleSide}/></mesh>)}</group>;
}
export default function BuildingModel({ bldg, floors, activeFloor, buildingPlans, buildingMetadata }: BuildingWireframeProps & {
    bldg: string;
}) {
    return <div className="h-full min-h-[380px] w-full" role="img" aria-label={`Plans 3D de ${bldg}`}><Canvas camera={{ position: [8, 8, 8], fov: 45 }}><ambientLight intensity={1}/><BuildingWireframe floors={floors} activeFloor={activeFloor} buildingPlans={buildingPlans} buildingMetadata={buildingMetadata}/><OrbitControls makeDefault enablePan enableZoom/></Canvas></div>;
}
