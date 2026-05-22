"use client";
import { PALETTE } from "@/lib/colors";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

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

const FLOOR_SPACING = 0.5; 
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
    const { lines, vw, vh } = useMemo(() => {
        if (!svgContent) return { lines: [], vw: 1000, vh: 1000 };
        
        // Aggressive sanitization to prevent "Unknown color transparent" errors
        const sanitizedSvg = svgContent
            .replace(/fill="transparent"/g, 'fill="none"')
            .replace(/stroke="transparent"/g, 'stroke="none"')
            .replace(/color="transparent"/g, 'color="none"');
        
        const loader = new SVGLoader();
        const svgData = loader.parse(sanitizedSvg);
        const viewBoxMatch = sanitizedSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
        const vw = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 1000;
        const vh = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 1000;
        
        const floorLines: any[] = [];
        svgData.paths.forEach((path) => {
            path.subPaths.forEach((subPath) => {
                const points = subPath.getPoints();
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                floorLines.push(geometry);
            });
        });
        return { lines: floorLines, vw, vh };
    }, [svgContent]);

    if (lines.length === 0) return null;

    return (
        <group position={[0, yOffset, 0]} scale={[scale, -scale, scale]} rotation={[Math.PI / 2, 0, 0]}>
            {lines.map((geometry, i) => (
                <primitive 
                    key={i} 
                    object={new THREE.Line(
                        geometry, 
                        new THREE.LineBasicMaterial({
                            color: isActive ? PALETTE.housing[500] : PALETTE.white,
                            transparent: true,
                            opacity: 0.9,
                            linewidth: 1
                        })
                    )} 
                    position={[tx, ty, 0]} 
                />
            ))}
        </group>
    );
}

function SceneContent({ floors, activeFloor, buildingSvgs, buildingMetadata }: any) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.15;
        }
    });

    // 1. Calculate the Master Pillar Distance
    const masterPillarDistPx = useMemo(() => {
        for (const f of floors) {
            const meta = buildingMetadata[f.value];
            const svg = buildingSvgs[f.value];
            if (meta?.pillars?.length >= 2 && svg) {
                const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
                const vw = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 1000;
                const vh = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 1000;
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

            const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
            const vw = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 1000;
            const vh = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 1000;

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
            sumZ += -(0.5 * vh + ty) * finalScale;
            count++;

            const worldPoints: {x: number, z: number}[] = [];
            const loader = new SVGLoader();
            const svgData = loader.parse(svg);
            svgData.paths.forEach((path) => {
                path.subPaths.forEach((subPath) => {
                    const rawPoints = subPath.getPoints();
                    const interestingPoints = getInterestingPoints(rawPoints);
                    interestingPoints.forEach((p) => {
                        worldPoints.push({
                            x: (p.x + tx) * finalScale,
                            z: -(p.y + ty) * finalScale
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

    // 3. Skeleton Geometry
    const skeletonGeometry = useMemo(() => {
        const positions: number[] = [];
        for (let i = 0; i < floors.length - 1; i++) {
            const f1 = floors[i].value;
            const f2 = floors[i+1].value;
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
                if (closest && minDist < 0.05) { 
                    positions.push(v1.x, i * FLOOR_SPACING, v1.z);
                    positions.push(closest.x, (i + 1) * FLOOR_SPACING, closest.z);
                }
            });
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geometry;
    }, [processedFloors, floors]);

    const totalHeightFinal = (floors.length - 1) * FLOOR_SPACING;

    return (
        <group ref={groupRef}>
            <group position={[-buildingCenter.x, -totalHeightFinal / 2, -buildingCenter.z]}>
                {floors.map((f: any, i: number) => {
                    const data = processedFloors[f.value];
                    if (!data) return null;
                    return (
                        <FloorPlate 
                            key={f.value}
                            svgContent={buildingSvgs[f.value]}
                            yOffset={i * FLOOR_SPACING}
                            isActive={f.value === activeFloor}
                            scale={data.scale}
                            tx={data.tx}
                            ty={data.ty}
                        />
                    )
                })}

                <lineSegments geometry={skeletonGeometry}>
                    <lineBasicMaterial color={PALETTE.white} transparent opacity={0.9} linewidth={1} />
                </lineSegments>
            </group>
        </group>
    );
}

export default function BuildingModel({ bldg, floors, activeFloor, buildingSvgs, buildingMetadata }: BuildingModelProps) {
    return (
        <div className="w-full h-full relative bg-zinc-950/10 rounded-none overflow-hidden">
            <Canvas camera={{ position: [8, 6, 8], fov: 35 }} dpr={[1, 2]}>
                <ambientLight intensity={3} />
                <SceneContent 
                    floors={floors} 
                    activeFloor={activeFloor} 
                    buildingSvgs={buildingSvgs} 
                    buildingMetadata={buildingMetadata} 
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
