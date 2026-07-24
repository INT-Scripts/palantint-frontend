"use client";

import { PALETTE } from "@/lib/colors";
import React, { Suspense, useMemo, useState, useEffect, useRef, Component, ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, Preload, Html, Bvh, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { 
    MapPin, Save, ArrowLeft, Plus, Trash2, Crosshair, 
    Compass, Move, Layers, Check, RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { fetchPrivate } from "@/lib/api";

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
function ScannedModel({ url, onClick, isSelected }: { url: string, onClick: (url: string) => void, isSelected?: boolean }) {
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

    return (
        <primitive 
            object={scene} 
            onClick={(e: any) => {
                e.stopPropagation();
                onClick(url);
            }}
            onPointerOver={(e: any) => {
                e.stopPropagation();
                document.body.style.cursor = "crosshair";
            }}
            onPointerOut={() => {
                document.body.style.cursor = "auto";
            }}
        />
    );
}

function SafeScannedModel({ url, onClick, isSelected }: any) {
    return (
        <ErrorBoundary fallback={null} url={url}>
            <Suspense fallback={null}>
                <ScannedModel url={url} onClick={onClick} isSelected={isSelected} />
            </Suspense>
        </ErrorBoundary>
    );
}

// Interactive 3D Waypoint Pin
function AdminHotspot({ 
    marker, 
    index, 
    isSelected, 
    onSelect, 
    onDelete 
}: { 
    marker: { bldg_id: string, label: string, position: [number, number, number] },
    index: number,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void
}) {
    const [hovered, setHovered] = useState(false);
    const { pos } = { pos: marker.position };

    return (
        <group position={[pos[0], pos[1], pos[2]]}>
            {/* Ground Laser Beam */}
            <line>
                <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, -pos[1], 0)
                ])} />
                <lineBasicMaterial attach="material" color={isSelected ? "#f59e0b" : hovered ? "#38bdf8" : "#0284c7"} transparent opacity={0.8} linewidth={2} />
            </line>

            {/* Sphere Beacon */}
            <mesh 
                position={[0, 10, 0]}
                onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
                onPointerOut={(e: any) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; }}
                onClick={(e: any) => { e.stopPropagation(); onSelect(); }}
            >
                <sphereGeometry args={[isSelected ? 10 : 8, 16, 16]} />
                <meshStandardMaterial 
                    color={isSelected ? "#f59e0b" : hovered ? "#38bdf8" : "#0284c7"} 
                    emissive={isSelected ? "#f59e0b" : hovered ? "#38bdf8" : "#0284c7"}
                    emissiveIntensity={isSelected ? 3 : 1.5}
                    transparent 
                    opacity={0.9} 
                />
            </mesh>

            {/* Label Badge */}
            <Html center zIndexRange={[100, 0]} position={[0, -15, 0]}>
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
                        <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-sky-400'}`} />
                        <span>{marker.label || marker.bldg_id}</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="ml-1 p-0.5 hover:bg-rose-500/30 text-rose-400 rounded transition-all"
                            title="Supprimer ce waypoint"
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
    const { raycaster, mouse, camera, scene } = useThree();

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.no-raycast')) return;

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
    }, [camera, mouse, raycaster, scene, onPickPoint]);

    return null;
}

export default function CampusCalibrationAdminPage() {
    const [tileUrls, setTileUrls] = useState<string[]>([]);
    const [config, setConfig] = useState<{ tile_mappings: Record<string, string>, markers: any[] }>({
        tile_mappings: {},
        markers: []
    });
    const [selectedMarkerIdx, setSelectedMarkerIdx] = useState<number | null>(null);
    const [repositioningIdx, setRepositioningIdx] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

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

    const handlePickPoint = (point: THREE.Vector3, tileId: string) => {
        const roundX = Math.round(point.x * 10) / 10;
        const roundY = Math.round(point.y * 10) / 10;
        const roundZ = Math.round(point.z * 10) / 10;

        if (repositioningIdx !== null && repositioningIdx < config.markers.length) {
            const updated = [...config.markers];
            updated[repositioningIdx] = {
                ...updated[repositioningIdx],
                position: [roundX, roundY, roundZ]
            };
            setConfig({ ...config, markers: updated });
            toast.success(`Position mise à jour pour ${updated[repositioningIdx].label}`);
            setRepositioningIdx(null);
        } else {
            const newMarker = {
                bldg_id: "U1",
                label: `Bâtiment U1`,
                position: [roundX, roundY, roundZ]
            };
            const updated = [...config.markers, newMarker];
            setConfig({ ...config, markers: updated });
            setSelectedMarkerIdx(updated.length - 1);
            toast.info(`Nouveau waypoint ajouté à [${roundX}, ${roundY}, ${roundZ}]`);
        }
    };

    const updateSelectedMarker = (key: string, value: any) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        updated[selectedMarkerIdx] = {
            ...updated[selectedMarkerIdx],
            [key]: value
        };
        setConfig({ ...config, markers: updated });
    };

    const updateSelectedMarkerPos = (axisIdx: number, val: number) => {
        if (selectedMarkerIdx === null) return;
        const updated = [...config.markers];
        const pos = [...updated[selectedMarkerIdx].position];
        pos[axisIdx] = Math.round(val * 10) / 10;
        updated[selectedMarkerIdx] = {
            ...updated[selectedMarkerIdx],
            position: pos
        };
        setConfig({ ...config, markers: updated });
    };

    const deleteMarker = (idx: number) => {
        const updated = config.markers.filter((_, i) => i !== idx);
        setConfig({ ...config, markers: updated });
        if (selectedMarkerIdx === idx) setSelectedMarkerIdx(null);
        toast.success("Waypoint supprimé");
    };

    const addMarker = () => {
        const newMarker = {
            bldg_id: "U1",
            label: "Bâtiment U1",
            position: [0, 20, 0]
        };
        const updated = [...config.markers, newMarker];
        setConfig({ ...config, markers: updated });
        setSelectedMarkerIdx(updated.length - 1);
    };

    const focusMarkerCamera = (idx: number) => {
        const m = config.markers[idx];
        if (!m || !controlsRef.current) return;
        setSelectedMarkerIdx(idx);
        const [x, y, z] = m.position;
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
        <div className="w-screen h-screen relative bg-zinc-950 font-sans overflow-hidden flex">
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
                                <Compass className="w-4 h-4 text-amber-500" /> Waypoints 3D
                            </h2>
                            <p className="text-[10px] font-mono text-zinc-500">Calibration des Marqueurs Campus</p>
                        </div>
                    </div>
                </div>

                {/* Status & Add Button */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">
                        {config.markers.length} Waypoints Définis
                    </span>
                    <Button 
                        onClick={addMarker}
                        variant="outline" 
                        size="sm" 
                        className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5 text-amber-400" /> Ajouter
                    </Button>
                </div>

                {/* Repositioning Banner */}
                {repositioningIdx !== null && (
                    <div className="p-3 bg-amber-500/20 border-b border-amber-500/40 text-amber-400 text-xs font-mono flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Crosshair className="w-4 h-4 animate-spin" /> Cliquez sur la carte 3D...
                        </span>
                        <button 
                            onClick={() => setRepositioningIdx(null)}
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
                        const isRepo = repositioningIdx === idx;
                        return (
                            <div 
                                key={idx}
                                onClick={() => setSelectedMarkerIdx(idx)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    isSel 
                                        ? 'bg-amber-500/10 border-amber-500/80 shadow-lg' 
                                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className={`w-4 h-4 ${isSel ? 'text-amber-400' : 'text-zinc-500'}`} />
                                        <span className="font-mono text-xs font-bold text-white uppercase">{m.label || m.bldg_id}</span>
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

                                        <div>
                                            <label className="block text-[10px] font-mono text-zinc-500 mb-1">Position 3D [X, Y, Z]</label>
                                            <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                                                {["X", "Y", "Z"].map((axis, aIdx) => (
                                                    <div key={axis} className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1">
                                                        <span className="text-[10px] text-zinc-500 mr-1">{axis}:</span>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            value={m.position[aIdx]}
                                                            onChange={(e) => updateSelectedMarkerPos(aIdx, parseFloat(e.target.value) || 0)}
                                                            className="w-full bg-transparent text-amber-400 text-xs focus:outline-hidden"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => setRepositioningIdx(isRepo ? null : idx)}
                                            variant="outline"
                                            size="sm"
                                            className={`w-full text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                                                isRepo 
                                                    ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400' 
                                                    : 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-amber-500/10'
                                            }`}
                                        >
                                            <Crosshair className="w-3.5 h-3.5" />
                                            {isRepo ? "Sélectionner sur la carte..." : "Placer sur le Modèle 3D"}
                                        </Button>
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
                                <SafeScannedModel 
                                    key={url} 
                                    url={url} 
                                    onClick={() => {}}
                                />
                            ))}
                        </Bvh>
                    </group>

                    {/* Render Markers */}
                    {config.markers.map((m, i) => (
                        <AdminHotspot 
                            key={i}
                            marker={m}
                            index={i}
                            isSelected={selectedMarkerIdx === i}
                            onSelect={() => setSelectedMarkerIdx(i)}
                            onDelete={() => deleteMarker(i)}
                        />
                    ))}

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
                        <Crosshair className="w-3.5 h-3.5 text-amber-500" /> Clic sur le Sol: Définir la Position
                    </span>
                </div>
            </div>
        </div>
    );
}
