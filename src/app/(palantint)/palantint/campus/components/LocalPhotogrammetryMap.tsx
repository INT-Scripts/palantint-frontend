"use client";
import { PALETTE } from "@/lib/colors";

import React, { Suspense, useMemo, useState, useEffect, useRef, useCallback, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Preload, Html, Bvh, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Building2, X, ArrowRight } from "lucide-react";
import { fetchPrivate } from "@/lib/api";
import { APARTMENT_BUILDINGS, FOYER_BUILDINGS, FloorDef } from "@/lib/buildings";
import { BuildingWireframe } from "../../apartments/components/BuildingModel";

interface WireframeTransform {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    floor_height: number;
}

interface BuildingDetails {
    address: string;
    coordinates: { lat: number, lng: number };
}

interface BuildingMarker {
    id: string;
    bldg_id: string;
    label: string;
    footprint: [number, number, number][];
    wireframe: WireframeTransform;
    details: BuildingDetails;
}

const BUILDING_FLOORS: Record<string, FloorDef[]> = { ...APARTMENT_BUILDINGS, ...FOYER_BUILDINGS };
const DEFAULT_WIREFRAME_SCALE = 10;
const DEFAULT_FLOOR_HEIGHT = 0.5;
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

function pointInPolygon2D(x: number, z: number, footprint: [number, number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
        const xi = footprint[i][0], zi = footprint[i][2];
        const xj = footprint[j][0], zj = footprint[j][2];
        const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Vertices + an interior grid clipped to the polygon, used to sample the real
// scanned surface height under the footprint (not just its raycast-clicked corners).
function buildHeightSamplePoints(footprint: [number, number, number][], resolution = 4): [number, number][] {
    const samples: [number, number][] = footprint.map(p => [p[0], p[2]]);
    const xs = footprint.map(p => p[0]);
    const zs = footprint.map(p => p[2]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
            const x = minX + (maxX - minX) * (i / resolution);
            const z = minZ + (maxZ - minZ) * (j / resolution);
            if (pointInPolygon2D(x, z, footprint)) samples.push([x, z]);
        }
    }
    return samples;
}

// Casts straight down onto the scanned terrain tiles only (ignores footprint
// overlays/vertex handles/other markers by requiring a "tile_" named ancestor).
function raycastTileHeight(raycaster: THREE.Raycaster, scene: THREE.Object3D, x: number, z: number): number | null {
    raycaster.set(new THREE.Vector3(x, 5000, z), new THREE.Vector3(0, -1, 0));
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
            if (obj.name && obj.name.startsWith('tile_')) return hit.point.y;
            obj = obj.parent;
        }
    }
    return null;
}

// Samples the polygon's footprint + interior grid against the real scan to find
// the highest surface point under the building, used as the glow volume's height.
// Recomputes once the scanned tiles have actually settled (see `tilesReady`)
// instead of guessing with a blind timeout.
function useFootprintSurfaceHeight(footprint: [number, number, number][], baseY: number, tilesReady: boolean): number {
    const { scene } = useThree();
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

    return useMemo(() => {
        if (footprint.length < 3) return 15;
        const samples = buildHeightSamplePoints(footprint);
        let maxY = baseY;
        for (const [sx, sz] of samples) {
            const h = raycastTileHeight(raycasterRef.current, scene, sx, sz);
            if (h !== null) maxY = Math.max(maxY, h);
        }
        return Math.max(5, maxY - baseY + 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [footprint, baseY, scene, tilesReady]);
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

    const { scene } = useGLTF(url, true, true, (loader: any) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            loader.setRequestHeader({
                Authorization: `Bearer ${token}`
            });
        }
    });
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

function BuildingFootprintMesh({ marker, onSelect, tilesReady, visible }: {
    marker: BuildingMarker,
    onSelect: (markerId: string) => void,
    tilesReady: boolean,
    visible: boolean
}) {
    const [hovered, setHovered] = useState(false);
    const footprint = marker.footprint;

    const [cx, avgY, cz] = useMemo(() => polygonCentroid(footprint), [footprint]);
    // Kept mounted (just hidden) while a building is focused, rather than
    // unmounted, so this surface-height raycast sampling — ~30 raycasts per
    // building — only ever runs once when tiles first settle instead of
    // re-running for every marker on every focus/unfocus toggle.
    const glowHeight = useFootprintSurfaceHeight(footprint, avgY, tilesReady);
    const geometry = useMemo(() => buildFootprintVolumeGeometry(footprint, cx, cz, glowHeight), [footprint, cx, cz, glowHeight]);

    if (footprint.length < 3) return null;

    const color = hovered ? PALETTE.campus[400] : PALETTE.campus[600];

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
                        <div className={`px-4 py-2 border backdrop-blur-md whitespace-nowrap font-mono text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 ${
                            hovered ? 'bg-campus-500/20 border-campus-500 text-campus-400' : 'bg-zinc-950/80 border-campus-500/50 text-white'
                        }`}>
                            <Building2 className={`w-4 h-4 ${hovered ? 'text-campus-400' : 'text-campus-600'}`} />
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

function BuildingDetailPanel({ marker, occupants, onClose, onBrowse }: {
    marker: BuildingMarker,
    occupants: number | null,
    onClose: () => void,
    onBrowse: () => void
}) {
    return (
        <div className="absolute top-0 right-0 h-full w-80 max-w-[90vw] bg-zinc-950/95 border-l border-zinc-800 backdrop-blur-md shadow-2xl z-20 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <button
                    onClick={onBrowse}
                    title="Parcourir ce bâtiment"
                    className="flex items-center gap-2 font-mono text-left cursor-pointer group"
                >
                    <Building2 className="w-4 h-4 text-campus-500 group-hover:text-campus-400 transition-colors" />
                    <span className="text-sm font-black text-white group-hover:text-campus-400 uppercase transition-colors">{marker.label || marker.bldg_id}</span>
                </button>
                <button onClick={onClose} title="Fermer" className="text-zinc-500 hover:text-white p-1 cursor-pointer">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 border-b border-zinc-800">
                <button
                    onClick={onBrowse}
                    className="w-full text-sm font-mono font-black text-white uppercase tracking-wider p-3 bg-campus-600 hover:bg-campus-500 shadow-lg shadow-campus-600/30 transition-colors flex items-center justify-between cursor-pointer"
                >
                    <span>Parcourir</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3 font-mono text-[11px] flex-1 overflow-y-auto">
                <div className="p-2.5 bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Adresse</span>
                    <span className="font-bold text-white">{marker.details?.address || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block">Latitude</span>
                        <span className="font-bold text-white">{marker.details?.coordinates?.lat ?? "—"}</span>
                    </div>
                    <div className="p-2.5 bg-zinc-900/80 border border-zinc-800">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block">Longitude</span>
                        <span className="font-bold text-white">{marker.details?.coordinates?.lng ?? "—"}</span>
                    </div>
                </div>
                <div className="p-2.5 bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase block">Occupants</span>
                    <span className="font-bold text-white">{occupants ?? "—"}</span>
                </div>
            </div>
        </div>
    );
}

export default function LocalPhotogrammetryMap() {
    const [tileUrls, setTileUrls] = useState<string[]>([]);

    const [config, setConfig] = useState<{ tile_mappings: Record<string, string>, markers: BuildingMarker[] }>({
        tile_mappings: {},
        markers: []
    });

    // Tracks which tiles have finished loading (or failed) so the building
    // footprints only appear once the whole map is actually on screen,
    // instead of popping in over an empty scene.
    const [settledTiles, setSettledTiles] = useState<Set<string>>(new Set());
    const handleTileSettled = useCallback((url: string) => {
        setSettledTiles(prev => (prev.has(url) ? prev : new Set(prev).add(url)));
    }, []);
    const tilesReady = useMemo(
        () => tileUrls.length > 0 && tileUrls.every(u => settledTiles.has(u)),
        [tileUrls, settledTiles]
    );

    const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
    const [focusedFloors, setFocusedFloors] = useState<FloorDef[]>([]);
    const [focusedSvgs, setFocusedSvgs] = useState<Record<string, string>>({});
    const [focusedMetadata, setFocusedMetadata] = useState<Record<string, any>>({});
    const [focusedActiveFloor, setFocusedActiveFloor] = useState<string>("");
    const [focusedOccupants, setFocusedOccupants] = useState<number | null>(null);

    useEffect(() => {
        fetchPrivate("/maps/3d-tiles")
            .then(data => {
                const urls = data.tiles || [];
                setTileUrls(urls);
            })
            .catch(console.error);

        fetchPrivate("/maps/3d-config")
            .then(setConfig)
            .catch(console.error);
    }, []);

    // Match by the marker's own stable id, not bldg_id — multiple footprints can
    // legitimately target the same building (or still carry the "U1" default),
    // so matching by bldg_id would focus whichever marker happens to come first.
    const focusedMarker = useMemo(
        () => config.markers.find(m => m.id === focusedMarkerId) || null,
        [config.markers, focusedMarkerId]
    );
    const focusedBldgId = focusedMarker?.bldg_id || null;

    // Lazily fetch the focused building's floor plans/metadata/occupants, same source apartments/page.tsx uses.
    useEffect(() => {
        if (!focusedBldgId) {
            setFocusedFloors([]);
            setFocusedSvgs({});
            setFocusedMetadata({});
            setFocusedOccupants(null);
            return;
        }
        const floors = BUILDING_FLOORS[focusedBldgId] || [];
        setFocusedFloors(floors);
        setFocusedActiveFloor(floors[0]?.value || "");
        let cancelled = false;
        (async () => {
            const svgs: Record<string, string> = {};
            await Promise.all(floors.map(async (f) => {
                try {
                    const res = await fetch(`/api/assets/plans/${focusedBldgId}_${f.value}.svg`);
                    if (res.ok) svgs[f.value] = await res.text();
                } catch {}
            }));
            const meta = await fetchPrivate(`/maps/${focusedBldgId}/metadata`).catch(() => ({}));
            const occupantsRes = await fetchPrivate(`/maps/${focusedBldgId}/occupants`).catch(() => null);
            if (!cancelled) {
                setFocusedSvgs(svgs);
                setFocusedMetadata(meta || {});
                setFocusedOccupants(typeof occupantsRes?.occupants === "number" ? occupantsRes.occupants : null);
            }
        })();
        return () => { cancelled = true; };
    }, [focusedBldgId]);

    const flightTarget = useMemo(() => {
        if (!focusedMarker) return null;
        const [cx, cy, cz] = polygonCentroid(focusedMarker.footprint);
        const radius = footprintRadius(focusedMarker.footprint, cx, cz);
        return {
            position: new THREE.Vector3(cx, cy + radius * 1.1 + 20, cz + radius * 2 + 30),
            target: new THREE.Vector3(cx, cy + 10, cz)
        };
    }, [focusedMarker]);

    const wireframeTransform = focusedMarker?.wireframe || { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: DEFAULT_WIREFRAME_SCALE, floor_height: DEFAULT_FLOOR_HEIGHT };

    const handleSelectBuilding = (markerId: string) => setFocusedMarkerId(markerId);
    const handleCloseFocus = () => setFocusedMarkerId(null);
    const navigateToBuilding = (bldgId: string) => {
        window.location.href = `/palantint/apartments?bldg=${bldgId}`;
    };
    const handleBrowse = () => {
        if (focusedMarker) navigateToBuilding(focusedMarker.bldg_id);
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
        <div className="w-full h-full relative cursor-crosshair bg-zinc-950">
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
                            <SafeScannedModel
                                key={url}
                                url={url}
                                dimmed={!!focusedMarker}
                                onSettled={() => handleTileSettled(url)}
                            />
                        ))}
                    </Bvh>
                </group>

                {config.markers.map((m) => (
                    <BuildingFootprintMesh
                        key={m.id}
                        marker={m}
                        onSelect={handleSelectBuilding}
                        tilesReady={tilesReady}
                        visible={!focusedMarker}
                    />
                ))}

                {focusedMarker && focusedFloors.length > 0 && (
                    <BuildingWireframe
                        floors={focusedFloors}
                        activeFloor={focusedActiveFloor}
                        buildingSvgs={focusedSvgs}
                        buildingMetadata={focusedMetadata}
                        autoRotate={false}
                        position={wireframeTransform.position}
                        rotation={wireframeTransform.rotation}
                        scale={wireframeTransform.scale}
                        floorHeight={wireframeTransform.floor_height}
                    />
                )}

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
                <BuildingDetailPanel
                    marker={focusedMarker}
                    occupants={focusedOccupants}
                    onClose={handleCloseFocus}
                    onBrowse={handleBrowse}
                />
            )}
        </div>
    );
}
