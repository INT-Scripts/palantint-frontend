"use client";
import { PALETTE } from "@/lib/colors";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { stripStyle } from "@/lib/svgPlan";

interface FloorData {
    value: string;
    label: string;
}

interface BuildingModelProps {
    bldg: string;
    floors: FloorData[];
    activeFloor: string;
    buildingSvgs: Record<string, string>;
    buildingMetadata: Record<string, any>;
}

export interface BuildingWireframeProps {
    floors: FloorData[];
    activeFloor: string;
    buildingSvgs: Record<string, string>;
    buildingMetadata: Record<string, any>;
    /** Continuously spin the model (used for the standalone floor-plan preview). Disable for a fixed, admin-placed orientation. */
    autoRotate?: boolean;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    /** Vertical distance between floors, in the same world units as `scale`. Uniform across the whole building. */
    floorHeight?: number;
}

const DEFAULT_floorHeight = 0.5;
const BASE_WORLD_SCALE = 0.006; // Slightly reduced to fit better

/**
 * Intelligent Vertex Decimation:
 * Only keeps points where the direction changes (corners/spikes).
 */
function getInterestingPoints(points: THREE.Vector2[]) {
    if (points.length < 3) return points;
    const result = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const p3 = points[i + 1];
        const v1 = new THREE.Vector2().subVectors(p2, p1).normalize();
        const v2 = new THREE.Vector2().subVectors(p3, p2).normalize();
        if (v1.dot(v2) < 0.999) {
            result.push(p2);
        }
    }
    result.push(points[points.length - 1]);
    return result;
}

function parseDimensions(svgContent: string) {
    let vw = 1000, vh = 1000;
    if (!svgContent) return { vw, vh };
    const vbMatch = svgContent.match(/viewBox=["']([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)["']/);
    if (vbMatch) {
        vw = parseFloat(vbMatch[3]) || 1000;
        vh = parseFloat(vbMatch[4]) || 1000;
    } else {
        const wMatch = svgContent.match(/width=["']([\d.]+)["']/);
        const hMatch = svgContent.match(/height=["']([\d.]+)["']/);
        if (wMatch) vw = parseFloat(wMatch[1]) || 1000;
        if (hMatch) vh = parseFloat(hMatch[1]) || 1000;
    }
    return { vw, vh };
}

function FloorPlate({ 
    svgContent, 
    yOffset, 
    isActive, 
    scale,
    tx,
    ty
}: { 
    svgContent: string, 
    yOffset: number, 
    isActive: boolean,
    scale: number,
    tx: number,
    ty: number
}) {
    // Merged into a single BufferGeometry (instead of one THREE.Line + one
    // THREE.LineBasicMaterial per wall segment) so a floor's walls are one
    // GPU object to create/dispose rather than dozens — mounting/unmounting
    // the focused building's wireframe was creating/tearing down hundreds of
    // Three.js objects and causing a big main-thread freeze.
    const geometry = useMemo(() => {
        if (!svgContent) return null;

        const sanitizedSvg = stripStyle(svgContent)
            .replace(/fill="transparent"/g, 'fill="none"')
            .replace(/stroke="transparent"/g, 'stroke="none"')
            .replace(/color="transparent"/g, 'color="none"');

        const loader = new SVGLoader();
        const svgData = loader.parse(sanitizedSvg);

        const positions: number[] = [];
        svgData.paths.forEach((path) => {
            path.subPaths.forEach((subPath) => {
                const points = subPath.getPoints();
                for (let i = 0; i < points.length - 1; i++) {
                    positions.push(points[i].x, points[i].y, 0);
                    positions.push(points[i + 1].x, points[i + 1].y, 0);
                }
            });
        });
        if (positions.length === 0) return null;

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geom;
    }, [svgContent]);

    if (!geometry) return null;

    return (
        <group position={[0, yOffset, 0]} scale={[scale, scale, scale]} rotation={[Math.PI / 2, 0, 0]}>
            <lineSegments geometry={geometry} renderOrder={999} position={[tx, ty, 0]}>
                <lineBasicMaterial
                    color={isActive ? PALETTE.housing[500] : PALETTE.white}
                    transparent
                    opacity={0.9}
                    linewidth={1}
                    depthTest={false}
                    depthWrite={false}
                />
            </lineSegments>
        </group>
    );
}

export function BuildingWireframe({
    floors,
    activeFloor,
    buildingSvgs,
    buildingMetadata,
    autoRotate = false,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    floorHeight = DEFAULT_floorHeight,
}: BuildingWireframeProps) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (autoRotate && groupRef.current) {
            groupRef.current.rotation.y += delta * 0.15;
        }
    });

    // 1. Calculate the Master Pillar Distance
    const masterPillarDistPx = useMemo(() => {
        for (const f of floors) {
            const meta = buildingMetadata[f.value];
            const svg = buildingSvgs[f.value];
            if (meta?.pillars?.length >= 2 && svg) {
                const { vw, vh } = parseDimensions(svg);
                const p = meta.pillars;
                const x0 = (p[0].x / 100) * vw;
                const y0 = (p[0].y / 100) * vh;
                const x1 = (p[1].x / 100) * vw;
                const y1 = (p[1].y / 100) * vh;
                return Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
            }
        }
        return null;
    }, [buildingMetadata, buildingSvgs, floors]);

    // 2. Process all floors with Decimation
    const { processedFloors, buildingCenter } = useMemo(() => {
        const data: Record<string, any> = {};
        let sumX = 0, sumZ = 0, count = 0;

        floors.forEach((f: any) => {
            const meta = buildingMetadata[f.value];
            const svg = buildingSvgs[f.value];
            if (!svg) return;

            const { vw, vh } = parseDimensions(svg);

            let finalScale = BASE_WORLD_SCALE;
            let tx = -0.5 * vw, ty = -0.5 * vh;

            if (meta?.pillars?.length >= 2 && masterPillarDistPx) {
                const p = meta.pillars;
                const x0 = (p[0].x / 100) * vw;
                const y0 = (p[0].y / 100) * vh;
                const x1 = (p[1].x / 100) * vw;
                const y1 = (p[1].y / 100) * vh;
                const currentDistPx = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
                
                const relativeScaleFactor = masterPillarDistPx / currentDistPx;
                finalScale = BASE_WORLD_SCALE * relativeScaleFactor;
                tx = -x0; ty = -y0;
            }

            sumX += (0.5 * vw + tx) * finalScale;
            sumZ += (0.5 * vh + ty) * finalScale;
            count++;

            const worldPoints: {x: number, z: number}[] = [];
            const loader = new SVGLoader();
            const svgData = loader.parse(stripStyle(svg));
            svgData.paths.forEach((path) => {
                path.subPaths.forEach((subPath) => {
                    const rawPoints = subPath.getPoints();
                    const interestingPoints = getInterestingPoints(rawPoints);
                    interestingPoints.forEach((p) => {
                        worldPoints.push({
                            x: (p.x + tx) * finalScale,
                            z: (p.y + ty) * finalScale
                        });
                    });
                });
            });

            data[f.value] = { scale: finalScale, tx, ty, vertices: worldPoints };
        });

        return {
            processedFloors: data,
            buildingCenter: count > 0 ? { x: sumX / count, z: sumZ / count } : { x: 0, z: 0 }
        };
    }, [buildingMetadata, buildingSvgs, floors, masterPillarDistPx]);

    // 2b. A flat roof plate has no volume of its own — duplicate the top
    // floor one story above itself so the building's last level reads as a
    // real story (with skeleton walls) instead of ending in a bare plane.
    const displayFloors = useMemo(() => {
        if (floors.length === 0) return floors;
        return [...floors, floors[floors.length - 1]];
    }, [floors]);

    // 3. Skeleton Geometry
    const skeletonGeometry = useMemo(() => {
        const positions: number[] = [];
        for (let i = 0; i < displayFloors.length - 1; i++) {
            const f1 = displayFloors[i].value;
            const f2 = displayFloors[i+1].value;
            const d1 = processedFloors[f1];
            const d2 = processedFloors[f2];
            if (!d1 || !d2) continue;

            d1.vertices.forEach((v1: any) => {
                let closest: any = null;
                let minDist = Infinity;
                d2.vertices.forEach((v2: any) => {
                    const d = Math.pow(v1.x - v2.x, 2) + Math.pow(v1.z - v2.z, 2);
                    if (d < minDist) {
                        minDist = d;
                        closest = v2;
                    }
                });
                if (closest && minDist < 0.15) {
                    positions.push(v1.x, i * floorHeight, v1.z);
                    positions.push(closest.x, (i + 1) * floorHeight, closest.z);
                }
            });
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geometry;
    }, [processedFloors, displayFloors, floorHeight]);

    const totalHeightFinal = (displayFloors.length - 1) * floorHeight;

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <group ref={groupRef}>
                <group position={[-buildingCenter.x, -totalHeightFinal / 2, -buildingCenter.z]}>
                    {displayFloors.map((f: any, i: number) => {
                        const data = processedFloors[f.value];
                        if (!data) return null;
                        return (
                            <FloorPlate
                                key={`${f.value}-${i}`}
                                svgContent={buildingSvgs[f.value]}
                                yOffset={i * floorHeight}
                                isActive={f.value === activeFloor}
                                scale={data.scale}
                                tx={data.tx}
                                ty={data.ty}
                            />
                        )
                    })}

                    <lineSegments geometry={skeletonGeometry} renderOrder={999}>
                        <lineBasicMaterial color={PALETTE.white} transparent opacity={0.9} linewidth={1} depthTest={false} depthWrite={false} />
                    </lineSegments>
                </group>
            </group>
        </group>
    );
}

export default function BuildingModel({ bldg, floors, activeFloor, buildingSvgs, buildingMetadata }: BuildingModelProps) {
    return (
        <div className="w-full h-full relative bg-zinc-950/10 rounded-none overflow-hidden">
            <Canvas camera={{ position: [8, 6, 8], fov: 35 }} dpr={[1, 2]}>
                <ambientLight intensity={3} />
                <BuildingWireframe
                    floors={floors}
                    activeFloor={activeFloor}
                    buildingSvgs={buildingSvgs}
                    buildingMetadata={buildingMetadata}
                    autoRotate
                />
                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2.2}
                />
            </Canvas>
        </div>
    );
}
