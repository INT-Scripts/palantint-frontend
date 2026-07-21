"use client";
import { PALETTE } from "@/lib/colors";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { fetchPrivate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Share2, ZoomIn, Filter, Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import { Box } from "@/components/ui/box";

// Dynamically import the graph to avoid SSR issues with Canvas/window
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/80">
            <div className="w-12 h-12 border-4 border-orga-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-mono text-orga-400 uppercase tracking-widest animate-pulse">Initializing Neural Link...</p>
        </div>
    )
});

export default function NetworkPage() {
    const router = useRouter();
    const [rawGraphData, setRawGraphData] = useState<{nodes: any[], links: any[]}>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>(null);
    const hasInitiallyFit = useRef(false);

    // Filters
    const [onlyConnected, setOnlyConnected] = useState(true);
    const [showClubs, setShowClubs] = useState(true);

    // Reset the fit flag when filters change
    useEffect(() => {
        hasInitiallyFit.current = false;
    }, [onlyConnected, showClubs]);

    useEffect(() => {
        document.title = "Network";
        fetchPrivate("/graph")
            .then(data => {
                setRawGraphData(data || { nodes: [], links: [] });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load graph data", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener("resize", updateDimensions);
        // Initial delay to let CSS settle
        setTimeout(updateDimensions, 100);

        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    const graphData = useMemo(() => {
        if (!rawGraphData.nodes.length) return { nodes: [], links: [] };

        let filteredNodes = rawGraphData.nodes;
        let filteredLinks = rawGraphData.links;

        if (!showClubs) {
            filteredNodes = filteredNodes.filter((n: any) => n.group !== "club");
            filteredLinks = filteredLinks.filter((l: any) => {
                const sourceNode = rawGraphData.nodes.find((n: any) => n.id === (typeof l.source === 'object' ? l.source.id : l.source));
                const targetNode = rawGraphData.nodes.find((n: any) => n.id === (typeof l.target === 'object' ? l.target.id : l.target));
                return sourceNode?.group !== "club" && targetNode?.group !== "club";
            });
        }

        if (onlyConnected) {
            const connectedNodeIds = new Set();
            filteredLinks.forEach((l: any) => {
                connectedNodeIds.add(typeof l.source === 'object' ? l.source.id : l.source);
                connectedNodeIds.add(typeof l.target === 'object' ? l.target.id : l.target);
            });
            filteredNodes = filteredNodes.filter((n: any) => connectedNodeIds.has(n.id) || n.group === "club");
        }

        // Clean up links whose nodes have been filtered out to prevent physics engine crashes
        const finalNodeIds = new Set(filteredNodes.map((n: any) => n.id));
        filteredLinks = filteredLinks.filter((l: any) => {
            const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
            const targetId = typeof l.target === 'object' ? l.target.id : l.target;
            return finalNodeIds.has(sourceId) && finalNodeIds.has(targetId);
        });

        return { nodes: filteredNodes, links: filteredLinks };
    }, [rawGraphData, onlyConnected, showClubs]);

    const handleNodeClick = (node: any) => {
        if (node.group === "student") {
            router.push(`/palantint/students/${node.id}`);
        } else if (node.group === "club") {
            router.push(`/palantint/clubs/${node.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-orga-500/30 font-sans">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orga-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-network-600/10 blur-[150px] mix-blend-screen" />
            </div>

            <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-12">
                    <PageHeader
                        badgeText="Spy reports // Active"
                        title1="Neural"
                        title2="Network"
                        titleGradient="from-network-400 to-network-600"
                        subtitle="A visual representation of the interconnected relationships and organizational structures within the campus."
                        colorName="network"
                    />

                    <Box 
                        className="w-full h-[800px] p-1"
                        contentClassName="bg-zinc-950/80 w-full h-full"
                        icon={<Share2 className="w-4 h-4 text-network-500" />}
                        title="Relationship Graph"
                        rightContent={
                            <>
                                <span>Nodes: {graphData.nodes.length}</span>
                                <span>Links: {graphData.links.length}</span>
                            </>
                        }
                    >
                        <div className="absolute inset-0" ref={containerRef}>
                            {!loading && (
                                <ForceGraph2D
                                    ref={fgRef}
                                    width={dimensions.width}
                                    height={dimensions.height}
                                    graphData={graphData}
                                    nodeLabel="name"
                                    nodeColor={node => node.group === "club" ? PALETTE.housing[500] : PALETTE.orga[500]}
                                    nodeRelSize={6}
                                    linkColor={link => (link as any).color || PALETTE.zinc[700]}
                                    linkWidth={1.5}
                                    onNodeClick={handleNodeClick}
                                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                                        const label = node.name;
                                        const fontSize = 12/globalScale;
                                        ctx.font = `${fontSize}px JetBrains Mono, monospace`;
                                        
                                        ctx.beginPath();
                                        ctx.arc(node.x, node.y, node.group === "club" ? 8 : 4, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = node.group === "club" ? PALETTE.housing[500] : PALETTE.orga[500];
                                        ctx.fill();

                                        if (globalScale > 1.5) {
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';
                                            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                                            ctx.fillText(label, node.x, node.y + (node.group === "club" ? 12 : 8));
                                        }
                                    }}
                                    cooldownTicks={100}
                                    onEngineStop={() => {
                                        if (!hasInitiallyFit.current) {
                                            fgRef.current?.zoomToFit(400, 20);
                                            hasInitiallyFit.current = true;
                                        }
                                    }}
                                    d3AlphaDecay={0.02}
                                    d3VelocityDecay={0.1}
                                />
                            )}
                            
                            <div className="absolute top-6 right-6 flex flex-col gap-3">
                                <div className="bg-zinc-950/90 border border-zinc-800 p-4 backdrop-blur-md space-y-4 shadow-2xl min-w-[200px]">
                                    <button 
                                        onClick={() => fgRef.current?.zoomToFit(400, 20)}
                                        className="w-full py-2 bg-zinc-900 hover:bg-orga-500/10 border border-zinc-800 hover:border-orga-500/50 text-[10px] font-mono text-zinc-400 hover:text-orga-400 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Maximize className="w-3 h-3" /> Reset_Viewport
                                    </button>
                                    
                                    <div className="flex items-center gap-3 text-[10px] font-mono text-network-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                                        <Filter className="w-3 h-3" /> Filters
                                    </div>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-3 h-3 bg-zinc-900 border-zinc-700 checked:bg-orga-500 checked:border-orga-500 appearance-none flex-shrink-0 cursor-pointer"
                                                checked={onlyConnected}
                                                onChange={(e) => setOnlyConnected(e.target.checked)}
                                            />
                                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest group-hover:text-zinc-300">Hide Isolated Nodes</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                className="w-3 h-3 bg-zinc-900 border-zinc-700 checked:bg-housing-500 checked:border-housing-500 appearance-none flex-shrink-0 cursor-pointer"
                                                checked={showClubs}
                                                onChange={(e) => setShowClubs(e.target.checked)}
                                            />
                                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest group-hover:text-zinc-300">Show Associations</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Box>
                </div>
            </main>
        </div>
    );
}
