"use client";
import { PALETTE } from "@/lib/colors";

import React, { Suspense, useMemo, useState, useEffect, useRef, useCallback, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Preload, Html, Bvh, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Building2, ArrowRight } from "lucide-react";
import { fetchPublic } from "@/lib/api";
import DirectoryDetailCard, { PortalStatItem } from "../../components/DirectoryDetailCard";

interface BuildingDetails {
    address: string;
}

interface BuildingMarker {
    id: string;
    bldg_id: string;
    label: string;
    footprint: [number, number, number][];
    details: BuildingDetails;
}

const OVERVIEW_CAMERA_POS = new THREE.Vector3(0, 500, 500);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

function polygonCentroid(footprint: [number, number, number][]): [number, number, number] {
    if (footprint.length === 0) return [0, 0, 0];
    const sum = footprint.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
    return [sum[0] / footprint.length, sum[1] / footprint.length, sum[2] / footprint.length];
}

function footprintRadius(footprint: [number, number, number][], cx: number, cz: number): number {
    return footprint.reduce((max, p) => Math.max(max, Math.hypot(p[0] - cx, p[2] - cz)), 10);
}

// Extrudes the ground polygon upward into a translucent glowing shell so the
// whole building volume reads as highlighted, not just a flat ground disc.
function buildFootprintVolumeGeometry(footprint: [number, number, number][], cx: number, cz: number, height: number) {
    if (footprint.length < 3) return null;
    const shape = new THREE.Shape();
    footprint.forEach((p, i) => {
        const u = p[0] - cx;
        const v = -(p[2] - cz);
        if (i === 0) shape.moveTo(u, v);
        else shape.lineTo(u, v);
    });
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
}

class ErrorBoundary extends Component<{ fallback: ReactNode, children: ReactNode, url?: string, onError?: () => void }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error) {
        console.error(`Failed to load tile ${this.props.url}:`, error);
        // A failed tile still counts as "settled" — otherwise one bad tile
        // would block the map-ready gate forever.
        this.props.onError?.();
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Highly optimized mesh renderer for photogrammetry
function ScannedModel({ url, dimmed, onSettled }: {
    url: string,
    dimmed: boolean,
    onSettled?: () => void
}) {
    // Mounting only happens once the Suspense-wrapped GLTF promise resolves —
    // used as the "this tile is ready" signal for the map-ready gate.
    useEffect(() => {
        onSettled?.();
    }, [onSettled]);

    const { scene } = useGLTF(url);
    const tileId = useMemo(() => url.split('/').pop()?.replace('.gltf', '') || "unknown", [url]);
    const { invalidate } = useThree();
    const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
    const originalColorsRef = useRef<THREE.Color[]>([]);
    const brightnessRef = useRef<number[]>([]);

    useMemo(() => {
        scene.name = tileId;
        const materials: THREE.MeshBasicMaterial[] = [];
        const originalColors: THREE.Color[] = [];
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;

                if (child.material && !(child.material instanceof THREE.MeshBasicMaterial)) {
                    const basicMat = new THREE.MeshBasicMaterial();
                    if (child.material.map) basicMat.map = child.material.map;
                    if (child.material.color) basicMat.color = child.material.color;
                    child.material = basicMat;
                }
                if (child.material instanceof THREE.MeshBasicMaterial) {
                    // Stays fully opaque always — dim/undim is expressed by darkening
                    // the color rather than animating opacity, so tiles never enter the
                    // transparent render pass and keep depth-sorting correctly against
                    // each other and the building-footprint meshes.
                    child.material.transparent = false;
                    materials.push(child.material);
                    originalColors.push(child.material.color.clone());
                }
            }
        });
        materialsRef.current = materials;
        originalColorsRef.current = originalColors;
        brightnessRef.current = materials.map(() => 1);
    }, [scene, tileId]);

    // Ease brightness toward its target every frame instead of snapping it, so
    // dimming/undimming reads as an actual fade. Keeps invalidating the
    // (on-demand) frameloop until the fade has visibly settled.
    useFrame((_, delta) => {
        const target = dimmed ? 0.15 : 1;
        let animating = false;
        const materials = materialsRef.current;
        const originalColors = originalColorsRef.current;
        const brightness = brightnessRef.current;
        for (let i = 0; i < materials.length; i++) {
            const diff = target - brightness[i];
            if (Math.abs(diff) > 0.004) {
                brightness[i] += diff * Math.min(1, delta * 6);
                animating = true;
            } else if (brightness[i] !== target) {
                brightness[i] = target;
            } else {
                continue;
            }
            materials[i].color.copy(originalColors[i]).multiplyScalar(brightness[i]);
        }
        if (animating) invalidate();
    });

    return <primitive object={scene} />;
}

function BuildingFootprintMesh({ marker, onSelect, visible }: {
    marker: BuildingMarker,
    onSelect: (markerId: string) => void,
    visible: boolean
}) {
    const [hovered, setHovered] = useState(false);
    const footprint = marker.footprint;

    const [cx, avgY, cz] = useMemo(() => polygonCentroid(footprint), [footprint]);
    const glowHeight = 15;
    const geometry = useMemo(() => buildFootprintVolumeGeometry(footprint, cx, cz, glowHeight), [footprint, cx, cz, glowHeight]);

    if (footprint.length < 3) return null;

    const color = hovered ? PALETTE.student[400] : PALETTE.student[600];

    return (
        <group visible={visible}>
            <mesh
                position={[cx, avgY, cz]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometry!}
                onPointerOver={(e: any) => { if (!visible) return; e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
                onPointerOut={(e: any) => { if (!visible) return; e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
                onClick={(e: any) => { if (!visible) return; e.stopPropagation(); onSelect(marker.id); }}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 2.4 : 1.4}
                    transparent
                    opacity={hovered ? 0.5 : 0.28}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {visible && (
                <Html center zIndexRange={[100, 0]} position={[cx, avgY + glowHeight + 10, cz]}>
                    <div
                        onClick={(e) => { e.stopPropagation(); onSelect(marker.id); }}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        className={`cursor-pointer transition-all duration-300 transform ${hovered ? 'scale-110' : 'scale-100'}`}
                    >
                        <div className={`px-4 py-2 border backdrop-blur-md whitespace-nowrap font-mono text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 rounded-xl ${
                            hovered ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-950/80 border-blue-500/50 text-white'
                        }`}>
                            <Building2 className={`w-4 h-4 ${hovered ? 'text-blue-400' : 'text-blue-500'}`} />
                            <span>{marker.label || marker.bldg_id}</span>
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

function SafeScannedModel({ url, dimmed, onSettled }: { url: string, dimmed: boolean, onSettled?: () => void }) {
    return (
        <ErrorBoundary fallback={null} url={url} onError={onSettled}>
            <Suspense fallback={null}>
                <ScannedModel url={url} dimmed={dimmed} onSettled={onSettled} />
            </Suspense>
        </ErrorBoundary>
    );
}

// Smoothly flies the camera/orbit-target toward a focused building, or back to the overview.
function CameraRig({ flightTarget }: {
    flightTarget: { position: THREE.Vector3, target: THREE.Vector3 } | null
}) {
    const { camera, invalidate } = useThree();
    const controls = useThree((s) => s.controls) as any;
    const flightRef = useRef<{ fromPos: THREE.Vector3, toPos: THREE.Vector3, fromTarget: THREE.Vector3, toTarget: THREE.Vector3, t: number } | null>(null);
    const lastKeyRef = useRef<string>("");

    useEffect(() => {
        if (!controls) return;
        const key = flightTarget
            ? `${flightTarget.position.toArray().join(',')}|${flightTarget.target.toArray().join(',')}`
            : "overview";
        if (key === lastKeyRef.current) return;
        lastKeyRef.current = key;

        flightRef.current = {
            fromPos: camera.position.clone(),
            toPos: flightTarget ? flightTarget.position.clone() : OVERVIEW_CAMERA_POS.clone(),
            fromTarget: controls.target.clone(),
            toTarget: flightTarget ? flightTarget.target.clone() : OVERVIEW_TARGET.clone(),
            t: 0
        };
        invalidate();
    }, [flightTarget, camera, controls, invalidate]);

    useFrame((_, delta) => {
        const flight = flightRef.current;
        if (!flight || !controls) return;
        flight.t = Math.min(1, flight.t + delta / 1.1);
        const ease = flight.t < 0.5 ? 2 * flight.t * flight.t : 1 - Math.pow(-2 * flight.t + 2, 2) / 2;
        camera.position.lerpVectors(flight.fromPos, flight.toPos, ease);
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
        controls.update();
        invalidate();
        if (flight.t >= 1) flightRef.current = null;
    });

    return null;
}

// Reuses the same detail-card component the apartments/foyer directory
// panels use elsewhere in INT Portal, so the 3D map's popup matches the
// rest of the site instead of inventing its own dark, brutalist panel.
function BuildingInfoPanel({ marker, onClose, onBrowse }: {
    marker: BuildingMarker,
    onClose: () => void,
    onBrowse: () => void
}) {
    const stats: PortalStatItem[] = marker.details?.address
        ? [{ label: "Address", value: marker.details.address, span: 2 }]
        : [];

    return (
        <div className="absolute bottom-4 right-4 w-72 max-w-[calc(100%-2rem)] z-20 animate-in slide-in-from-bottom-2 duration-300">
            <DirectoryDetailCard
                accentColor="blue"
                title={marker.label || marker.bldg_id}
                onClose={onClose}
                stats={stats}
                footer={
                    <button
                        onClick={onBrowse}
                        className="w-full h-11 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-stone-50 dark:text-stone-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                        <span>Browse apartments</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                }
            />
        </div>
    );
}

export default function PublicCampusMap() {
    const [tileUrls, setTileUrls] = useState<string[]>([]);
    const [config, setConfig] = useState<{ tile_mappings: Record<string, string>, markers: BuildingMarker[] }>({
        tile_mappings: {},
        markers: []
    });

    const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);

    useEffect(() => {
        fetchPublic("/maps/3d-tiles")
            .then(data => setTileUrls(data.tiles || []))
            .catch(console.error);

        fetchPublic("/maps/3d-config")
            .then(setConfig)
            .catch(console.error);
    }, []);

    const focusedMarker = useMemo(
        () => config.markers.find(m => m.id === focusedMarkerId) || null,
        [config.markers, focusedMarkerId]
    );

    const flightTarget = useMemo(() => {
        if (!focusedMarker) return null;
        const [cx, cy, cz] = polygonCentroid(focusedMarker.footprint);
        const radius = footprintRadius(focusedMarker.footprint, cx, cz);
        return {
            position: new THREE.Vector3(cx, cy + radius * 1.1 + 20, cz + radius * 2 + 30),
            target: new THREE.Vector3(cx, cy + 10, cz)
        };
    }, [focusedMarker]);

    const handleSelectBuilding = (markerId: string) => setFocusedMarkerId(markerId);
    const handleCloseFocus = () => setFocusedMarkerId(null);
    const handleBrowse = () => {
        if (focusedMarker) window.location.href = `/apartments?bldg=${focusedMarker.bldg_id}`;
    };

    // Distinguishes an orbit-drag (release lands on the terrain too, but the
    // pointer travelled) from an actual tap-to-dismiss on the terrain.
    const terrainPointerDown = useRef<{ x: number, y: number } | null>(null);
    const handleTerrainPointerDown = (e: any) => {
        terrainPointerDown.current = { x: e.clientX, y: e.clientY };
    };
    const handleTerrainPointerUp = (e: any) => {
        const start = terrainPointerDown.current;
        terrainPointerDown.current = null;
        if (!start || !focusedMarker) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) {
            handleCloseFocus();
        }
    };

    return (
        <div className="absolute inset-0 cursor-crosshair bg-zinc-950">
            <Canvas
                camera={{ position: [0, 500, 500], fov: 45, near: 1, far: 1500 }}
                gl={{ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
                frameloop="demand"
                onPointerMissed={() => { if (focusedMarker) handleCloseFocus(); }}
            >
                <color attach="background" args={[PALETTE.zinc[950]]} />

                <Suspense fallback={null}>
                    <Environment preset="city" />
                </Suspense>

                <ambientLight intensity={3} />
                <directionalLight position={[100, 500, 100]} intensity={2} />

                <group
                    position={[-150, 0, -150]}
                    onPointerDown={handleTerrainPointerDown}
                    onPointerUp={handleTerrainPointerUp}
                >
                    <Bvh firstHitOnly>
                        {tileUrls.map((url) => (
                            <SafeScannedModel key={url} url={url} dimmed={!!focusedMarker} />
                        ))}
                    </Bvh>
                </group>

                {config.markers.map((m) => (
                    <BuildingFootprintMesh
                        key={m.id}
                        marker={m}
                        onSelect={handleSelectBuilding}
                        visible={!focusedMarker}
                    />
                ))}

                <CameraRig flightTarget={flightTarget} />

                <AdaptiveDpr pixelated />
                <Preload all />

                <OrbitControls
                    makeDefault
                    minDistance={1}
                    maxDistance={600}
                    enableDamping={false}
                />
            </Canvas>

            {focusedMarker && (
                <BuildingInfoPanel
                    marker={focusedMarker}
                    onClose={handleCloseFocus}
                    onBrowse={handleBrowse}
                />
            )}
        </div>
    );
}
