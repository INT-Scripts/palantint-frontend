"use client";

import { PALETTE } from "@/lib/colors";
import React, { Suspense, useMemo, useState, useEffect, useRef, Component, ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Preload, Html, Bvh, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import {
    Save, ArrowLeft, Plus, Trash2, Crosshair,
    Compass, Move, Eye, Building2, Pencil, X, Check, Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { fetchPrivate } from "@/lib/api";
import { APARTMENT_BUILDINGS, FOYER_BUILDINGS, FloorDef } from "@/lib/buildings";
import { BuildingWireframe } from "../../apartments/components/BuildingModel";

const BUILDING_FLOORS: Record<string, FloorDef[]> = { ...APARTMENT_BUILDINGS, ...FOYER_BUILDINGS };

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

// The wireframe model's own SVG-derived geometry is tuned for the tiny
// apartments-page preview (camera ~8 world units away, BASE_WORLD_SCALE=0.006
// in BuildingModel.tsx) — at campus scale (buildings tens of units wide) a
// scale of 1 renders as a barely-visible speck, hence the much bigger default.
const DEFAULT_WIREFRAME_SCALE = 10;
const DEFAULT_FLOOR_HEIGHT = 0.5;

function generateMarkerId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `marker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const BLANK_MARKER = (footprint: [number, number, number][], centroid: [number, number, number]): BuildingMarker => ({
    id: generateMarkerId(),
    bldg_id: "U1",
    label: "Bâtiment U1",
    footprint,
    wireframe: { position: centroid, rotation: [0, 0, 0], scale: DEFAULT_WIREFRAME_SCALE, floor_height: DEFAULT_FLOOR_HEIGHT },
    details: { address: "", coordinates: { lat: 0, lng: 0 } }
});

function polygonCentroid(footprint: [number, number, number][]): [number, number, number] {
    if (footprint.length === 0) return [0, 0, 0];
    const sum = footprint.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
    return [sum[0] / footprint.length, sum[1] / footprint.length, sum[2] / footprint.length];
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
// Recomputes once the scanned tiles have actually finished loading (see
// `tilesLoaded`, driven by THREE.DefaultLoadingManager.onLoad) instead of
// guessing with a blind timeout.
function useFootprintSurfaceHeight(footprint: [number, number, number][], baseY: number, tilesLoaded: boolean): number {
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
    }, [footprint, baseY, scene, tilesLoaded]);
}

class ErrorBoundary extends Component<{ fallback: ReactNode, children: ReactNode, url?: string }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: Error) {
        console.error(`Failed to load tile ${this.props.url}:`, error);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

// 3D Model tile loader
function ScannedModel({ url }: { url: string }) {
    const { scene } = useGLTF(url, true, true, (loader: any) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            loader.setRequestHeader({ Authorization: `Bearer ${token}` });
        }
    });
    const tileId = useMemo(() => url.split('/').pop()?.replace('.gltf', '') || "unknown", [url]);

    useMemo(() => {
        scene.name = tileId;
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
            }
        });
    }, [scene, tileId]);

    return <primitive object={scene} />;
}

function SafeScannedModel({ url }: { url: string }) {
    return (
        <ErrorBoundary fallback={null} url={url}>
            <Suspense fallback={null}>
                <ScannedModel url={url} />
            </Suspense>
        </ErrorBoundary>
    );
}

// In-progress polygon while the admin is clicking out a new footprint
function DraftFootprintOutline({ vertices, onRemoveVertex }: {
    vertices: THREE.Vector3[],
    onRemoveVertex: (idx: number) => void
}) {
    const lineGeometry = useMemo(() => {
        if (vertices.length < 2) return null;
        return new THREE.BufferGeometry().setFromPoints(vertices);
    }, [vertices]);

    return (
        <group>
            {lineGeometry && (
                <line>
                    <primitive object={lineGeometry} attach="geometry" />
                    <lineBasicMaterial attach="material" color="#f59e0b" transparent opacity={0.9} linewidth={2} />
                </line>
            )}
            {vertices.map((v, i) => (
                <mesh
                    key={i}
                    position={v}
                    onClick={(e: any) => { e.stopPropagation(); onRemoveVertex(i); }}
                    onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
                    onPointerOut={() => { document.body.style.cursor = "auto"; }}
                >
                    <sphereGeometry args={[4, 12, 12]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2} />
                </mesh>
            ))}
        </group>
    );
}

// Interactive Building Footprint (glowing ground polygon + vertex handles)
function AdminFootprint({
    marker,
    isSelected,
    onSelect,
    onDelete,
    onSelectVertex,
    repositioningVertexIdx,
    tilesLoaded
}: {
    marker: BuildingMarker,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void,
    onSelectVertex: (vertexIdx: number) => void,
    repositioningVertexIdx: number | null,
    tilesLoaded: boolean
}) {
    const [hovered, setHovered] = useState(false);
    const footprint = marker.footprint;

    const [cx, avgY, cz] = useMemo(() => polygonCentroid(footprint), [footprint]);
    const glowHeight = useFootprintSurfaceHeight(footprint, avgY, tilesLoaded);
    const geometry = useMemo(() => buildFootprintVolumeGeometry(footprint, cx, cz, glowHeight), [footprint, cx, cz, glowHeight]);

    if (footprint.length < 3) return null;

    const color = isSelected ? "#f59e0b" : hovered ? "#38bdf8" : "#0284c7";

    return (
        <group>
            <mesh
                position={[cx, avgY, cz]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometry!}
                onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
                onPointerOut={(e: any) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
                onClick={(e: any) => { e.stopPropagation(); onSelect(); }}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isSelected ? 2.5 : hovered ? 1.8 : 1}
                    transparent
                    opacity={isSelected ? 0.55 : hovered ? 0.4 : 0.22}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {isSelected && footprint.map((p, vIdx) => (
                <mesh
                    key={vIdx}
                    position={p}
                    onClick={(e: any) => { e.stopPropagation(); onSelectVertex(vIdx); }}
                >
                    <sphereGeometry args={[repositioningVertexIdx === vIdx ? 5 : 3.5, 12, 12]} />
                    <meshStandardMaterial
                        color={repositioningVertexIdx === vIdx ? "#f59e0b" : "#fbbf24"}
                        emissive={repositioningVertexIdx === vIdx ? "#f59e0b" : "#fbbf24"}
                        emissiveIntensity={2}
                    />
                </mesh>
            ))}

            <Html center zIndexRange={[100, 0]} position={[cx, avgY + glowHeight + 10, cz]}>
                <div
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className={`cursor-pointer transition-all duration-300 transform ${isSelected ? 'scale-110' : hovered ? 'scale-105' : 'scale-100'}`}
                >
                    <div className={`px-3 py-1.5 border backdrop-blur-md whitespace-nowrap font-mono text-[11px] font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 rounded-md ${
                        isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 ring-2 ring-amber-500/50'
                            : hovered
                                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                : 'bg-zinc-950/90 border-zinc-700 text-zinc-200'
                    }`}>
                        <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-sky-400'}`} />
                        <span>{marker.label || marker.bldg_id}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="ml-1 p-0.5 hover:bg-rose-500/30 text-rose-400 rounded transition-all"
                            title="Supprimer ce bâtiment"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </Html>
        </group>
    );
}

// Raycast Click Handler
function SceneClickHandler({ onPickPoint }: { onPickPoint: (point: THREE.Vector3, tileId: string) => void }) {
    const { raycaster, mouse, camera, scene, gl } = useThree();

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Only raycast when the click actually landed on the WebGL canvas itself —
            // sidebar/banner buttons and drei <Html> overlays are never children of it,
            // so this is more robust than opting out via a "no-raycast" class.
            if (e.target !== gl.domElement) return;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                let tileId = "unknown";
                let current: any = intersects[0].object;
                while (current) {
                    if (current.name && current.name.startsWith('tile_')) {
                        tileId = current.name;
                        break;
                    }
                    current = current.parent;
                }
                onPickPoint(point, tileId);
            }
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [camera, mouse, raycaster, scene, gl, onPickPoint]);

    return null;
}

export default function CampusCalibrationAdminPage() {
    const [tileUrls, setTileUrls] = useState<string[]>([]);
    const [config, setConfig] = useState<{ tile_mappings: Record<string, string>, markers: BuildingMarker[] }>({
        tile_mappings: {},
        markers: []
    });
    const [selectedMarkerIdx, setSelectedMarkerIdx] = useState<number | null>(null);
    const [drawingVertices, setDrawingVertices] = useState<THREE.Vector3[] | null>(null);
    const [repositioningVertexIdx, setRepositioningVertexIdx] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [previewFloors, setPreviewFloors] = useState<FloorDef[]>([]);
    const [previewSvgs, setPreviewSvgs] = useState<Record<string, string>>({});
    const [previewMetadata, setPreviewMetadata] = useState<Record<string, any>>({});
    const [previewOccupants, setPreviewOccupants] = useState<number | null>(null);

    const [tilesLoaded, setTilesLoaded] = useState(false);

    const controlsRef = useRef<any>(null);

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

    // Fires once THREE's global loading manager has no more pending requests —
    // i.e. every queued scanned tile has actually finished loading — rather
    // than guessing with a timer.
    useEffect(() => {
        const manager = THREE.DefaultLoadingManager;
        const prevOnLoad = manager.onLoad;
        manager.onLoad = () => {
            setTilesLoaded(true);
            prevOnLoad?.();
        };
        return () => { manager.onLoad = prevOnLoad; };
    }, []);

    const selectedMarker = selectedMarkerIdx !== null ? config.markers[selectedMarkerIdx] : null;
    const selectedBldgId = selectedMarker?.bldg_id || null;

    // Lazily fetch the selected marker's real floor plans/metadata/occupants so the
    // wireframe preview and the "computed" occupants figure reflect actual DB data.
    useEffect(() => {
        if (!selectedBldgId) {
            setPreviewFloors([]);
            setPreviewSvgs({});
            setPreviewMetadata({});
            setPreviewOccupants(null);
            return;
        }
        const floors = BUILDING_FLOORS[selectedBldgId] || [];
        setPreviewFloors(floors);
        let cancelled = false;
        (async () => {
            const svgs: Record<string, string> = {};
            await Promise.all(floors.map(async (f) => {
                try {
                    const res = await fetch(`/api/assets/plans/${selectedBldgId}_${f.value}.svg`);
                    if (res.ok) svgs[f.value] = await res.text();
                } catch {}
            }));
            const meta = await fetchPrivate(`/maps/${selectedBldgId}/metadata`).catch(() => ({}));
            const occupantsRes = await fetchPrivate(`/maps/${selectedBldgId}/occupants`).catch(() => null);
            if (!cancelled) {
                setPreviewSvgs(svgs);
                setPreviewMetadata(meta || {});
                setPreviewOccupants(typeof occupantsRes?.occupants === "number" ? occupantsRes.occupants : null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedBldgId]);

    const handlePickPoint = (point: THREE.Vector3, tileId: string) => {
        const rounded = new THREE.Vector3(
            Math.round(point.x * 10) / 10,
            Math.round(point.y * 10) / 10,
            Math.round(point.z * 10) / 10
        );

        if (drawingVertices !== null) {
            setDrawingVertices([...drawingVertices, rounded]);
            return;
        }

        if (repositioningVertexIdx !== null && selectedMarkerIdx !== null) {
            const updated = [...config.markers];
            const marker = { ...updated[selectedMarkerIdx] };
            const footprint = [...marker.footprint];
            footprint[repositioningVertexIdx] = [rounded.x, rounded.y, rounded.z];
            marker.footprint = footprint;
            updated[selectedMarkerIdx] = marker;
            setConfig({ ...config, markers: updated });
            toast.success(`Sommet ${repositioningVertexIdx + 1} repositionné`);
            setRepositioningVertexIdx(null);
        }
    };

    const startDrawingFootprint = () => {
        setDrawingVertices([]);
        setSelectedMarkerIdx(null);
        setRepositioningVertexIdx(null);
    };

    const cancelDrawingFootprint = () => setDrawingVertices(null);

    const undoLastVertex = () => {
        if (!drawingVertices || drawingVertices.length === 0) return;
        setDrawingVertices(drawingVertices.slice(0, -1));
    };

    const removeDraftVertex = (idx: number) => {
        if (!drawingVertices) return;
        setDrawingVertices(drawingVertices.filter((_, i) => i !== idx));
    };

    const finishDrawingFootprint = () => {
        if (!drawingVertices || drawingVertices.length < 3) return;
        const footprint: [number, number, number][] = drawingVertices.map(v => [v.x, v.y, v.z]);
        const newMarker = BLANK_MARKER(footprint, polygonCentroid(footprint));
        const updated = [...config.markers, newMarker];
        setConfig({ ...config, markers: updated });
        setSelectedMarkerIdx(updated.length - 1);
        setDrawingVertices(null);
        toast.success(`Bâtiment ajouté avec ${footprint.length} sommets`);
    };

    const updateSelectedMarker = (key: "bldg_id" | "label", value: string) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        updated[selectedMarkerIdx] = { ...updated[selectedMarkerIdx], [key]: value };
        setConfig({ ...config, markers: updated });
    };

    const updateWireframeAxis = (field: "position" | "rotation", axisIdx: number, val: number) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const marker = { ...updated[selectedMarkerIdx] };
        const arr = [...marker.wireframe[field]] as [number, number, number];
        arr[axisIdx] = val;
        marker.wireframe = { ...marker.wireframe, [field]: arr };
        updated[selectedMarkerIdx] = marker;
        setConfig({ ...config, markers: updated });
    };

    const updateWireframeScalar = (field: "scale" | "floor_height", val: number) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const marker = updated[selectedMarkerIdx];
        updated[selectedMarkerIdx] = { ...marker, wireframe: { ...marker.wireframe, [field]: val } };
        setConfig({ ...config, markers: updated });
    };

    const updateDetailsField = (field: "address", val: string) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const marker = updated[selectedMarkerIdx];
        updated[selectedMarkerIdx] = { ...marker, details: { ...marker.details, [field]: val } };
        setConfig({ ...config, markers: updated });
    };

    const updateCoordinateField = (field: "lat" | "lng", val: number) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const marker = updated[selectedMarkerIdx];
        updated[selectedMarkerIdx] = {
            ...marker,
            details: { ...marker.details, coordinates: { ...marker.details.coordinates, [field]: val } }
        };
        setConfig({ ...config, markers: updated });
    };

    const addVertexToSelected = () => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const marker = { ...updated[selectedMarkerIdx] };
        const last = marker.footprint[marker.footprint.length - 1] || [0, 0, 0];
        marker.footprint = [...marker.footprint, [last[0] + 2, last[1], last[2] + 2]];
        updated[selectedMarkerIdx] = marker;
        setConfig({ ...config, markers: updated });
        setRepositioningVertexIdx(marker.footprint.length - 1);
    };

    const deleteVertex = (vertexIdx: number) => {
        if (selectedMarkerIdx === null) return;
        const marker = config.markers[selectedMarkerIdx];
        if (marker.footprint.length <= 3) {
            toast.error("Un bâtiment nécessite au moins 3 sommets");
            return;
        }
        const updated = [...config.markers];
        updated[selectedMarkerIdx] = { ...marker, footprint: marker.footprint.filter((_, i) => i !== vertexIdx) };
        setConfig({ ...config, markers: updated });
        if (repositioningVertexIdx === vertexIdx) setRepositioningVertexIdx(null);
    };

    const deleteMarker = (idx: number) => {
        const updated = config.markers.filter((_, i) => i !== idx);
        setConfig({ ...config, markers: updated });
        if (selectedMarkerIdx === idx) setSelectedMarkerIdx(null);
        toast.success("Bâtiment supprimé");
    };

    const focusMarkerCamera = (idx: number) => {
        const m = config.markers[idx];
        if (!m || !controlsRef.current) return;
        setSelectedMarkerIdx(idx);
        const [x, y, z] = polygonCentroid(m.footprint);
        controlsRef.current.target.set(x, y, z);
        controlsRef.current.update();
    };

    const saveConfigToVault = async () => {
        setSaving(true);
        try {
            await fetchPrivate("/maps/3d-config", {
                method: "POST",
                body: JSON.stringify(config)
            });
            toast.success("✓ Configuration 3D enregistrée dans le Vault (DB & exports/3d_config.json)!");
        } catch (e: any) {
            toast.error("Erreur lors de l'enregistrement: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="-mx-6 -mt-6 -mb-6 md:-mx-12 md:-mt-16 md:-mb-12 w-[calc(100%+3rem)] md:w-[calc(100%+6rem)] h-[800px] relative bg-zinc-950 font-sans overflow-hidden flex rounded-xl border border-zinc-800 shadow-2xl">
            {/* Left Admin Control Sidebar */}
            <div className="w-96 h-full bg-zinc-950/95 border-r border-zinc-800 z-20 flex flex-col no-raycast shadow-2xl backdrop-blur-md">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/palantint/admin" className="p-2 hover:bg-zinc-900 rounded-lg transition-all text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <Compass className="w-4 h-4 text-amber-500" /> Bâtiments 3D
                            </h2>
                            <p className="text-[10px] font-mono text-zinc-500">Empreintes des Bâtiments Campus</p>
                        </div>
                    </div>
                </div>

                {/* Status & Add Button */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">
                        {config.markers.length} Bâtiments Définis
                    </span>
                    <Button
                        onClick={startDrawingFootprint}
                        disabled={drawingVertices !== null}
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
                    >
                        <Pencil className="w-3.5 h-3.5 text-amber-400" /> Dessiner
                    </Button>
                </div>

                {/* Drawing Banner */}
                {drawingVertices !== null && (
                    <div className="p-3 bg-amber-500/20 border-b border-amber-500/40 text-amber-400 text-xs font-mono">
                        <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5">
                                <Pencil className="w-4 h-4" /> {drawingVertices.length} sommet(s) — cliquez sur le sol (cliquez un point pour le supprimer)
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={undoLastVertex}
                                    disabled={drawingVertices.length === 0}
                                    className="p-1 hover:bg-amber-500/30 rounded text-amber-300 disabled:opacity-30 disabled:pointer-events-none"
                                    title="Annuler le dernier point"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={cancelDrawingFootprint} className="p-1 hover:bg-amber-500/30 rounded text-amber-300" title="Annuler tout le dessin">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <Button
                            onClick={finishDrawingFootprint}
                            disabled={drawingVertices.length < 3}
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider gap-1.5"
                        >
                            <Check className="w-3.5 h-3.5" /> Terminer ({drawingVertices.length}/3 min.)
                        </Button>
                    </div>
                )}

                {/* Repositioning Banner */}
                {repositioningVertexIdx !== null && drawingVertices === null && (
                    <div className="p-3 bg-amber-500/20 border-b border-amber-500/40 text-amber-400 text-xs font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Crosshair className="w-4 h-4 animate-spin" /> Cliquez pour repositionner le sommet {repositioningVertexIdx + 1}
                        </span>
                        <button
                            onClick={() => setRepositioningVertexIdx(null)}
                            className="px-2 py-0.5 bg-amber-500/30 hover:bg-amber-500/50 rounded text-[10px] text-white"
                        >
                            Annuler
                        </button>
                    </div>
                )}

                {/* Markers List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {config.markers.map((m, idx) => {
                        const isSel = selectedMarkerIdx === idx;
                        return (
                            <div
                                key={m.id}
                                onClick={() => setSelectedMarkerIdx(idx)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    isSel
                                        ? 'bg-amber-500/10 border-amber-500/80 shadow-lg'
                                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 className={`w-4 h-4 ${isSel ? 'text-amber-400' : 'text-zinc-500'}`} />
                                        <span className="font-mono text-xs font-bold text-white uppercase">{m.label || m.bldg_id}</span>
                                        <span className="text-[10px] font-mono text-zinc-600">({m.footprint.length} sommets)</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); focusMarkerCamera(idx); }}
                                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
                                            title="Centrer la caméra"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteMarker(idx); }}
                                            className="p-1 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {isSel && (
                                    <div className="mt-3 space-y-3 pt-3 border-t border-zinc-800/80" onClick={(e) => e.stopPropagation()}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-mono text-zinc-500 mb-1">Bâtiment Cible</label>
                                                <select
                                                    value={m.bldg_id}
                                                    onChange={(e) => updateSelectedMarker("bldg_id", e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-md p-1.5 font-mono focus:border-amber-500 focus:outline-hidden"
                                                >
                                                    {["U1", "U2", "U3", "U4", "U5", "U6", "U7", "Foyer", "CentraleSupélec", "Autre"].map(b => (
                                                        <option key={b} value={b}>{b}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono text-zinc-500 mb-1">Libellé</label>
                                                <input
                                                    type="text"
                                                    value={m.label}
                                                    onChange={(e) => updateSelectedMarker("label", e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded-md p-1.5 font-mono focus:border-amber-500 focus:outline-hidden"
                                                />
                                            </div>
                                        </div>

                                        {/* Vertex List */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[10px] font-mono text-zinc-500">Sommets ({m.footprint.length})</label>
                                                <button
                                                    onClick={addVertexToSelected}
                                                    className="p-0.5 hover:bg-zinc-800 text-amber-400 rounded"
                                                    title="Ajouter un sommet"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                                {m.footprint.map((v, vIdx) => (
                                                    <div key={vIdx} className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 font-mono text-[10px] text-zinc-400">
                                                        <span className="text-zinc-600 w-3">{vIdx + 1}</span>
                                                        <span className="flex-1 truncate">[{v[0].toFixed(1)}, {v[1].toFixed(1)}, {v[2].toFixed(1)}]</span>
                                                        <button
                                                            onClick={() => setRepositioningVertexIdx(vIdx)}
                                                            className={`p-0.5 rounded ${repositioningVertexIdx === vIdx ? 'bg-amber-500 text-zinc-950' : 'hover:bg-zinc-800 text-amber-400'}`}
                                                            title="Repositionner sur la carte"
                                                        >
                                                            <Crosshair className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteVertex(vIdx)}
                                                            className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"
                                                            title="Supprimer ce sommet"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Wireframe Placement */}
                                        <div className="pt-2 border-t border-zinc-800/60">
                                            <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Placement du Modèle 3D</label>
                                            <p className="text-[9px] font-mono text-zinc-600 mb-2">Le modèle est affiché en direct sur la carte 3D à droite.</p>
                                            <div className="space-y-2">
                                                <div>
                                                    <span className="text-[9px] font-mono text-zinc-600">Position [X, Y, Z]</span>
                                                    <div className="grid grid-cols-3 gap-1.5 font-mono text-xs mt-0.5">
                                                        {["X", "Y", "Z"].map((axis, aIdx) => (
                                                            <div key={axis} className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1">
                                                                <span className="text-[10px] text-zinc-500 mr-1">{axis}:</span>
                                                                <input
                                                                    type="number"
                                                                    step="1"
                                                                    value={m.wireframe.position[aIdx]}
                                                                    onChange={(e) => updateWireframeAxis("position", aIdx, parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-transparent text-amber-400 text-xs focus:outline-hidden"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-mono text-zinc-600">Rotation (Y)</span>
                                                        <span className="text-[10px] font-mono text-amber-400">{Math.round(m.wireframe.rotation[1] * (180 / Math.PI))}°</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={360}
                                                        step={1}
                                                        value={Math.round(m.wireframe.rotation[1] * (180 / Math.PI))}
                                                        onChange={(e) => updateWireframeAxis("rotation", 1, parseFloat(e.target.value) * (Math.PI / 180))}
                                                        className="w-full mt-1 accent-amber-500"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono text-zinc-600">Échelle</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={m.wireframe.scale}
                                                        onChange={(e) => updateWireframeScalar("scale", parseFloat(e.target.value) || 1)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-amber-400 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-mono text-zinc-600">Hauteur d'étage</span>
                                                    <input
                                                        type="number"
                                                        step="0.05"
                                                        min="0.05"
                                                        value={m.wireframe.floor_height}
                                                        onChange={(e) => updateWireframeScalar("floor_height", parseFloat(e.target.value) || DEFAULT_FLOOR_HEIGHT)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-amber-400 text-xs font-mono focus:outline-hidden focus:border-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Building Details */}
                                        <div className="pt-2 border-t border-zinc-800/60">
                                            <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Détails</label>
                                            <div className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    placeholder="Adresse (placeholder)"
                                                    value={m.details.address}
                                                    onChange={(e) => updateDetailsField("address", e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-white text-xs font-mono focus:outline-hidden focus:border-amber-500"
                                                />
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        placeholder="Latitude"
                                                        value={m.details.coordinates.lat}
                                                        onChange={(e) => updateCoordinateField("lat", parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-white text-xs font-mono focus:outline-hidden focus:border-amber-500"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        placeholder="Longitude"
                                                        value={m.details.coordinates.lng}
                                                        onChange={(e) => updateCoordinateField("lng", parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-white text-xs font-mono focus:outline-hidden focus:border-amber-500"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono">
                                                    <span className="text-zinc-500">Occupants (calculé depuis la DB)</span>
                                                    <span className="text-white font-bold">{previewOccupants ?? "—"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                    <Button
                        onClick={saveConfigToVault}
                        disabled={saving}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-2.5 shadow-xl flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Enregistrement..." : "Enregistrer dans le Vault"}
                    </Button>
                </div>
            </div>

            {/* Right 3D Viewport */}
            <div className="flex-1 h-full relative bg-zinc-950">
                <Canvas
                    camera={{ position: [0, 500, 500], fov: 45, near: 1, far: 1500 }}
                    gl={{ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
                    frameloop="demand"
                >
                    <color attach="background" args={[PALETTE.zinc[950]]} />

                    <Suspense fallback={null}>
                        <Environment preset="city" />
                    </Suspense>

                    <ambientLight intensity={3} />
                    <directionalLight position={[100, 500, 100]} intensity={2} />

                    <group position={[-150, 0, -150]}>
                        <Bvh firstHitOnly>
                            {tileUrls.map((url) => (
                                <SafeScannedModel key={url} url={url} />
                            ))}
                        </Bvh>
                    </group>

                    {/* Render building footprints */}
                    {config.markers.map((m, i) => (
                        <AdminFootprint
                            key={m.id}
                            marker={m}
                            isSelected={selectedMarkerIdx === i}
                            onSelect={() => setSelectedMarkerIdx(i)}
                            onDelete={() => deleteMarker(i)}
                            onSelectVertex={(vIdx) => setRepositioningVertexIdx(vIdx)}
                            repositioningVertexIdx={selectedMarkerIdx === i ? repositioningVertexIdx : null}
                            tilesLoaded={tilesLoaded}
                        />
                    ))}

                    {selectedMarker && previewFloors.length > 0 && (
                        <BuildingWireframe
                            floors={previewFloors}
                            activeFloor={previewFloors[0]?.value || ""}
                            buildingSvgs={previewSvgs}
                            buildingMetadata={previewMetadata}
                            autoRotate={false}
                            position={selectedMarker.wireframe.position}
                            rotation={selectedMarker.wireframe.rotation}
                            scale={selectedMarker.wireframe.scale}
                            floorHeight={selectedMarker.wireframe.floor_height}
                        />
                    )}

                    {drawingVertices !== null && (
                        <DraftFootprintOutline vertices={drawingVertices} onRemoveVertex={removeDraftVertex} />
                    )}

                    <SceneClickHandler onPickPoint={handlePickPoint} />
                    <AdaptiveDpr pixelated />
                    <Preload all />

                    <OrbitControls
                        ref={controlsRef}
                        makeDefault
                        minDistance={1}
                        maxDistance={800}
                        enableDamping={false}
                    />
                </Canvas>

                {/* Top Info Badge */}
                <div className="absolute top-6 right-6 z-10 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl text-[11px] font-mono text-zinc-400 no-raycast shadow-2xl flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                        <Move className="w-3.5 h-3.5 text-amber-500" /> Rotation: Clic Gauche
                    </span>
                    <span className="text-zinc-700">|</span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                        <Pencil className="w-3.5 h-3.5 text-amber-500" /> Dessiner: Cliquez le Sol pour Tracer l'Empreinte
                    </span>
                </div>
            </div>
        </div>
    );
}
