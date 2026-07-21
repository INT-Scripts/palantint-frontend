"use client";
import { PALETTE } from "@/lib/colors";

import React, { Suspense, useMemo, useState, useEffect, Component, ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Sky, Environment, useGLTF, Preload, Html, Bvh, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import { Layers, MapPin, ExternalLink } from "lucide-react";
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
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Intercept clicks to capture positions for config
function SceneClickHandler({ onSceneClick }: { onSceneClick: (point: THREE.Vector3, tileId: string) => void }) {
    const { raycaster, mouse, camera, scene } = useThree();

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!e.altKey) return; // Only capture if Alt is held
            
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            if (intersects.length > 0) {
                const point = intersects[0].point;
                // Find the primitive name (tile ID)
                let tileId = "unknown";
                let current: any = intersects[0].object;
                while (current) {
                    if (current.name && current.name.startsWith('tile_')) {
                        tileId = current.name;
                        break;
                    }
                    current = current.parent;
                }
                onSceneClick(point, tileId);
            }
        };

        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [camera, mouse, raycaster, scene, onSceneClick]);

    return null;
}

// Highly optimized mesh renderer for photogrammetry
function ScannedModel({ url, onClick, mapping }: { 
    url: string, 
    onClick: (url: string) => void,
    mapping?: string 
}) {
    const { scene } = useGLTF(url, true, true, (loader: any) => {
        const token = typeof window !== "undefined" ? localStorage.getItem("palantint_token") : null;
        if (token) {
            loader.setRequestHeader({
                Authorization: `Bearer ${token}`
            });
        }
    });
    const tileId = useMemo(() => url.split('/').pop()?.replace('.gltf', '') || "unknown", [url]);
    
    // Optimize: Mutate the cached scene directly instead of cloning it.
    // Cloning 160 massive meshes causes massive memory bloat and GC stutters.
    useMemo(() => {
        scene.name = tileId;
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                
                // Aggressive optimization for photogrammetry: Use MeshBasicMaterial.
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
                if (mapping) document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e: any) => {
                document.body.style.cursor = "auto";
            }}
        />
    );
}

function Hotspot({ pos, bldgId, label, onClick }: { pos: [number, number, number], bldgId: string, label: string, onClick: (id: string) => void }) {
    const [hovered, setHovered] = useState(false);
    const { invalidate } = useThree();
    
    return (
        <group position={[pos[0], pos[1] + 10, pos[2]]}>
            <mesh 
                onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; invalidate(); }}
                onPointerOut={(e: any) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "auto"; invalidate(); }}
                onClick={(e: any) => { e.stopPropagation(); onClick(bldgId); }}
            >
                <sphereGeometry args={[8, 16, 16]} />
                <meshStandardMaterial 
                    color={hovered ? PALETTE.campus[400] : PALETTE.campus[600]} 
                    emissive={hovered ? PALETTE.campus[400] : PALETTE.campus[600]}
                    emissiveIntensity={2}
                    transparent 
                    opacity={0.8} 
                />
            </mesh>
            <Html center zIndexRange={[100, 0]} position={[0, -25, 0]}>
                <div className={`transition-all duration-300 transform ${hovered ? 'scale-110' : 'scale-100'}`}>
                    <div className={`px-4 py-2 border backdrop-blur-md whitespace-nowrap font-mono text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 ${
                        hovered ? 'bg-campus-500/20 border-campus-500 text-campus-400' : 'bg-zinc-950/80 border-campus-500/50 text-white'
                    }`}>
                        <MapPin className={`w-4 h-4 ${hovered ? 'text-campus-400' : 'text-campus-600'}`} />
                        {label || bldgId}
                    </div>
                </div>
            </Html>
        </group>
    );
}

function SafeScannedModel({ url, onClick, mapping }: any) {
    return (
        <ErrorBoundary fallback={null} url={url}>
            <Suspense fallback={null}>
                <ScannedModel url={url} onClick={onClick} mapping={mapping} />
            </Suspense>
        </ErrorBoundary>
    );
}

function LoadingOverlay({ progress }: { progress: number }) {
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 shadow-2xl">
            <div className="flex flex-col items-center gap-3 w-64">
                <div className="w-full flex items-center justify-between">
                    <p className="text-[10px] font-black font-mono text-campus-400 uppercase tracking-widest animate-pulse">
                        Streaming_Data
                    </p>
                    <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                        {Math.round(progress)}%
                    </p>
                </div>
                <div className="w-full h-1 bg-zinc-900 rounded-none overflow-hidden">
                    <div 
                        className="h-full bg-campus-500 transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }} 
                    />
                </div>
            </div>
        </div>
    );
}

export default function LocalPhotogrammetryMap() {
    const [tileUrls, setTileUrls] = useState<string[]>([]);
    const [totalTiles, setTotalTiles] = useState(0);
    const [loadedCount, setLoadedCount] = useState(0);
    
    const [config, setConfig] = useState<{tile_mappings: Record<string, string>, markers: any[]}>({
        tile_mappings: {},
        markers: []
    });

    useEffect(() => {
        fetchPrivate("/maps/3d-tiles")
            .then(data => {
                const urls = data.tiles || [];
                setTileUrls(urls);
                setTotalTiles(urls.length);
            })
            .catch(console.error);

        fetchPrivate("/maps/3d-config")
            .then(setConfig)
            .catch(console.error);
    }, []);

    // Batch loading: Instead of triggering a heavy React state cascade 160 times,
    // we use a simple interval to inject tiles into the scene in batches.
    useEffect(() => {
        if (totalTiles === 0) return;
        
        const interval = setInterval(() => {
            setLoadedCount(prev => {
                if (prev >= totalTiles) {
                    clearInterval(interval);
                    return prev;
                }
                // Stream 10 tiles every 200ms
                return Math.min(prev + 10, totalTiles);
            });
        }, 200);
        
        return () => clearInterval(interval);
    }, [totalTiles]);

    const activeQueue = useMemo(() => tileUrls.slice(0, loadedCount), [tileUrls, loadedCount]);

    const handleBuildingClick = (url: string) => {
        const fileName = url.split('/').pop()?.replace('.gltf', '') || "";
        const bldgId = config.tile_mappings[fileName];
        if (bldgId) window.location.href = `/palantint/apartments?bldg=${bldgId}`;
    };

    const handleMarkerClick = (bldgId: string) => {
        window.location.href = `/palantint/apartments?bldg=${bldgId}`;
    };

    const handleSceneCapture = (point: THREE.Vector3, tileId: string) => {
        const entry = {
            label: "NEW_POI",
            bldg_id: "U1",
            position: [point.x, point.y, point.z]
        };
        console.log("%c 📍 POSITIONAL CAPTURE ", `background: ${PALETTE.campus[500]}; color: white; font-weight: bold; padding: 2px 5px;`);
        console.log(`To add a marker at this position, add this to "markers" in config.json:`);
        console.log(JSON.stringify(entry, null, 4));
        console.log(`To link the entire tile "${tileId}", add this to "tile_mappings":`);
        console.log(`"${tileId}": "U1"`);
    };

    const isLoading = totalTiles > 0 && loadedCount < totalTiles;
    const progress = totalTiles > 0 ? (loadedCount / totalTiles) * 100 : 0;

    return (
        <div className="w-full h-full relative cursor-crosshair bg-zinc-950">
            {isLoading && <LoadingOverlay progress={progress} />}
            
            <Canvas 
                camera={{ position: [0, 500, 500], fov: 45, near: 1, far: 1500 }} 
                gl={{ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }}
                frameloop="demand"
            >
                <color attach="background" args={[PALETTE.zinc[950]]} />
                
                <Suspense fallback={null}>
                    <Sky sunPosition={[100, 20, 100]} turbidity={0.01} rayleigh={0.2} />
                    <Environment preset="city" />
                </Suspense>

                <ambientLight intensity={3} />
                <directionalLight position={[100, 500, 100]} intensity={2} />
                
                <group position={[-150, 0, -150]}>
                    <Bvh firstHitOnly>
                        {activeQueue.map((url) => (
                            <SafeScannedModel 
                                key={url} 
                                url={url} 
                                onClick={handleBuildingClick}
                                mapping={config.tile_mappings[url.split('/').pop()?.replace('.gltf', '') || ""]}
                            />
                        ))}
                    </Bvh>
                </group>

                {/* Render markers outside the group so world coordinates captured by click handler map perfectly */}
                {config.markers.map((m, i) => (
                    <Hotspot 
                        key={i}
                        pos={m.position}
                        bldgId={m.bldg_id}
                        label={m.label}
                        onClick={handleMarkerClick}
                    />
                ))}

                <SceneClickHandler onSceneClick={handleSceneCapture} />
                <AdaptiveDpr pixelated />
                <Preload all />

                <OrbitControls 
                    makeDefault 
                    minDistance={1}
                    maxDistance={600}
                    enableDamping={false}
                />
            </Canvas>
        </div>
    );
}
