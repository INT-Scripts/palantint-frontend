"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Users, GraduationCap, Building2, ArrowUpRight, ChevronRight, Route, Orbit, X, Loader2, CalendarDays, MapPin, Plus, Minus, Maximize2, Expand } from "lucide-react";
import { fetchPrivate } from "@/lib/api";
import { campusHref } from "@/lib/campus";
import { timetableHref } from "@/lib/timetableContext";
import { indexNetwork, shortestConnection, networkName, networkLayout, type NetworkData, type NetworkNode } from "@/lib/network";

const EMPTY: NetworkData = {nodes: [], links: []};
const INITIAL_VISIBLE = 40;
const confidence: Record<string, string> = {CONFIRMED: "Confirmé", LIKELY: "Probable", UNCONFIRMED: "À confirmer"};

function NetworkWorkspace() {
    const params = useSearchParams();
    const [data, setData] = useState<NetworkData | null>(null);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(40);
    const [pathMode, setPathMode] = useState(false);
    const [edgeId, setEdgeId] = useState<string | null>(null);
    const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [manual, setManual] = useState<Map<string, {x:number;y:number}>>(new Map());
    const [viewport, setViewport] = useState<{nodes:NetworkNode[];rect:{x:number;y:number;width:number;height:number}}|null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const gesture = useRef<{id:string|null;x:number;y:number;moved:boolean}|null>(null);
    const dragged = useRef(false);
    const deferred = useDeferredValue(query);
    useEffect(() => {
        document.title = "Relations | PalantINT";
        const controller = new AbortController();
        fetchPrivate("/graph", {signal: controller.signal}).then(setData).catch(() => { if (!controller.signal.aborted) setError("Le réseau n’est pas disponible pour le moment."); });
        return () => controller.abort();
    }, [retry]);
    const index = useMemo(() => indexNetwork(data || EMPTY), [data]);
    const ranked = useMemo(() => [...index.nodes.values()].sort((a,b) => (index.neighbors.get(b.id)?.length || 0) - (index.neighbors.get(a.id)?.length || 0) || a.name.localeCompare(b.name)), [index]);
    const initial = ranked.find(node => node.group !== "student" && (index.neighbors.get(node.id)?.length || 0) > 0) || ranked[0];
    const focus = index.nodes.get(params.get("focus") || "") || initial;
    const target = index.nodes.get(params.get("target") || "");
    const kind = ["relationship", "membership", "class_group"].includes(params.get("links") || "") ? params.get("links")! : "all";
    const focusedEdges = useMemo(() => focus ? (index.neighbors.get(focus.id) || []).filter(edge => kind === "all" || edge.kind === kind) : [], [index, focus, kind]);
    const neighbors = useMemo(() => {
        const ids = new Set(focusedEdges.map(edge => edge.source === focus?.id ? edge.target : edge.source));
        return [...ids].map(id => index.nodes.get(id)!).sort((a,b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    }, [focusedEdges, focus, index]);
    const path = useMemo(() => focus && target ? shortestConnection(index, focus.id, target.id, kind) : null, [index, focus, target, kind]);
    const update = (values: Record<string, string | null>) => {
        const next = new URLSearchParams(window.location.search);
        for (const [key,value] of Object.entries(values)) if (value === null) next.delete(key); else next.set(key,value);
        window.history.pushState(null, "", `/palantint/network${next.size ? `?${next}` : ""}`);
    };
    const chooseFocus = (node: NetworkNode) => { setQuery(""); setLimit(40); setEdgeId(null); setVisibleLimit(INITIAL_VISIBLE); setExpanded(new Set()); setManual(new Map()); update({focus: node.id, target: null, page: null}); };
    const chooseResult = (node: NetworkNode) => {
        if (pathMode && focus) { setQuery(""); setEdgeId(null); setVisibleLimit(INITIAL_VISIBLE); setExpanded(new Set()); setManual(new Map()); update({focus: focus.id, target: node.id, page: null}); }
        else chooseFocus(node);
    };
    const visibleNodes = useMemo(() => {
        if (target) return path?.nodes || (focus ? [focus,target] : []);
        const ids = new Set(focus ? [focus.id,...neighbors.slice(0,visibleLimit).map(node=>node.id)] : []);
        for (const id of expanded) {
            ids.add(id);
            for (const edge of index.neighbors.get(id) || []) {
                if (kind !== "all" && edge.kind !== kind) continue;
                ids.add(edge.source); ids.add(edge.target);
            }
        }
        return [...ids].map(id=>index.nodes.get(id)!).filter(Boolean);
    }, [target,path,focus,neighbors,visibleLimit,expanded,index,kind]);
    const positions = useMemo(() => {
        const result = networkLayout(visibleNodes, !!target);
        for (const [id,point] of manual) if (result.has(id)) result.set(id,point);
        return result;
    }, [visibleNodes,target,manual]);
    const defaultView = useMemo(() => {
        const points = [...networkLayout(visibleNodes, !!target).values()];
        const extent = points.reduce((v,p)=>({left:Math.min(v.left,p.x),top:Math.min(v.top,p.y),right:Math.max(v.right,p.x),bottom:Math.max(v.bottom,p.y)}),{left:0,top:0,right:0,bottom:0});
        return {x:extent.left-140,y:extent.top-120,width:Math.max(500,extent.right-extent.left+280),height:Math.max(340,extent.bottom-extent.top+240)};
    }, [visibleNodes,target]);
    const view = viewport?.nodes === visibleNodes ? viewport.rect : defaultView;
    const setView = useCallback((value:typeof defaultView | ((value:typeof defaultView)=>typeof defaultView)) => {
        setViewport(previous=>({nodes:visibleNodes,rect:typeof value === "function" ? value(previous?.nodes===visibleNodes ? previous.rect : defaultView) : value}));
    }, [visibleNodes,defaultView]);
    const visibleIds = new Set(visibleNodes.map(node => node.id));
    const edges = target ? path?.edges || [] : (data?.links || []).filter(edge => (kind === "all" || edge.kind === kind) && visibleIds.has(edge.source) && visibleIds.has(edge.target));
    const fit = () => {
        const points = [...positions.values()];
        if (!points.length) return;
        const extent = points.reduce((v,p)=>({left:Math.min(v.left,p.x),right:Math.max(v.right,p.x),top:Math.min(v.top,p.y),bottom:Math.max(v.bottom,p.y)}),{left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity});
        const minX = extent.left-120, maxX = extent.right+120;
        const minY = extent.top-100, maxY = extent.bottom+100;
        setView({x:minX,y:minY,width:Math.max(400,maxX-minX),height:Math.max(300,maxY-minY)});
    };
    const zoom = (factor:number) => setView(v=>({x:v.x+v.width*(1-factor)/2,y:v.y+v.height*(1-factor)/2,width:Math.max(100,Math.min(100000,v.width*factor)),height:Math.max(65,Math.min(65000,v.height*factor))}));
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const wheel = (event:WheelEvent) => {
            event.preventDefault();
            const matrix = svg.getScreenCTM()?.inverse();
            if (!matrix) return;
            const point = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix);
            const factor = Math.exp(Math.max(-.3,Math.min(.3,event.deltaY*.001)));
            setView(v=> { if (v.width*factor<100 || v.width*factor>100000) return v; return {x:point.x+(v.x-point.x)*factor,y:point.y+(v.y-point.y)*factor,width:v.width*factor,height:v.height*factor}; });
        };
        svg.addEventListener("wheel",wheel,{passive:false});
        return ()=>svg.removeEventListener("wheel",wheel);
    }, [data,setView]);
    const selectedEdge = (data?.links || []).find(edge => edge.id === edgeId);
    const results = useMemo(() => {
        const text = networkName(deferred.trim());
        const pool = text || pathMode ? ranked : neighbors;
        return pool.filter(node => !text || networkName(node.name).includes(text));
    }, [deferred, ranked, neighbors, pathMode]);
    const relatedLabels = (node: NetworkNode) => [...new Set(focusedEdges.filter(edge => edge.source === node.id || edge.target === node.id).map(edge => edge.label))].join(" · ");
    const profileHref = (node: NetworkNode) => node.group === "club" ? `/palantint/clubs?club=${node.id}` : node.group === "class_group" ? `/palantint/class-groups/${node.id}` : `/palantint/students/${node.id}`;

    if (error) return <main className="p-8 font-mono text-sm text-zinc-400"><p role="alert">{error}</p><button onClick={() => {setError("");setRetry(value=>value+1);}} className="mt-4 border border-zinc-700 p-3">Réessayer</button></main>;
    if (!data) return <main className="flex h-[70dvh] items-center justify-center gap-3 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" />Chargement des relations…</main>;
    return <main className="flex min-h-[calc(100dvh-80px)] flex-col bg-zinc-950 p-3 font-mono sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Orbit className="h-5 w-5 text-network-400" /><h1 className="text-lg font-bold uppercase tracking-wider text-white">Relations</h1></div><span className="text-[10px] text-zinc-600">{data.nodes.length} éléments · {data.links.length} liens</span></div>
        <div className="grid flex-1 gap-3 lg:grid-cols-[290px_1fr]">
            <aside className="flex max-h-[55dvh] flex-col border border-zinc-800 bg-zinc-900/20 lg:max-h-[calc(100dvh-160px)]">
                <div className="border-b border-zinc-800 p-3">
                    <div className="mb-3 grid grid-cols-2 gap-1">{[{label:"Explorer",icon:Orbit,value:false},{label:"Chemin",icon:Route,value:true}].map(({label,icon:Icon,value}) => <button key={label} aria-pressed={value === (pathMode || !!target)} onClick={() => {setPathMode(value);setQuery("");setLimit(40);if(!value)update({target:null});}} className={`flex items-center justify-center gap-2 border px-2 py-2 text-[10px] uppercase tracking-wider ${(pathMode || !!target) === value ? "border-network-500/40 bg-network-500/10 text-network-400" : "border-zinc-800 text-zinc-500"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>
                    <label className="relative block"><Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-zinc-600" /><input aria-label={pathMode ? "Choisir le second point" : "Rechercher dans le réseau"} placeholder={pathMode ? "Relier à…" : "Personne, association…"} value={query} onChange={event => {setQuery(event.target.value);setLimit(40);}} className="h-10 w-full border border-zinc-800 bg-zinc-950 pl-8 pr-2 text-xs text-white outline-none focus:border-network-500" /></label>
                </div>
                {focus && <div className="border-b border-zinc-800 p-3"><span className="text-[9px] uppercase tracking-widest text-network-400">Point de départ</span><h2 className="mt-1 text-sm font-bold text-white">{focus.name}</h2><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-400"><Link href={profileHref(focus)} className="flex items-center gap-1 border border-zinc-700 px-2 py-1.5 hover:text-white">{focus.group === "club" ? "Association" : focus.group === "class_group" ? "Groupe" : "Profil"}<ArrowUpRight className="h-3 w-3" /></Link>{focus.group === "student" && <Link href={timetableHref({students:[focus.id,...(target?.group === "student" && target.id !== focus.id ? [target.id] : [])]})} title="Disponibilités" className="border border-zinc-700 p-1.5 text-timetable-400"><CalendarDays className="h-3.5 w-3.5" /></Link>}{focus.map?.feature && <Link title="Voir sur le campus" href={campusHref({feature:focus.map.feature,building:focus.map.building == null ? undefined : String(focus.map.building),level:focus.map.level ?? undefined})} className="border border-zinc-700 p-1.5 text-campus-400"><MapPin className="h-3.5 w-3.5" /></Link>}{focus.apartment && <Link href={campusHref({ room: focus.apartment })} title={`Logement ${focus.apartment}`} className="flex items-center gap-1 border border-zinc-700 p-1.5 text-housing-400"><Building2 className="h-3.5 w-3.5" />{focus.apartment}</Link>}</div></div>}
                <div className="flex-1 overflow-y-auto p-1">{results.slice(0,limit).map(node => <button key={node.id} onClick={() => chooseResult(node)} className="flex w-full items-center gap-3 border-b border-zinc-900 p-3 text-left hover:bg-network-500/5">{node.group === "club" ? <Building2 className="h-4 w-4 shrink-0 text-orga-400" /> : node.group === "class_group" ? <GraduationCap className="h-4 w-4 shrink-0 text-timetable-400" /> : <Users className="h-4 w-4 shrink-0 text-student-400" />}<span className="min-w-0"><span className="block truncate text-xs text-zinc-300">{node.name}</span>{!query && !pathMode && <span className="block truncate text-[9px] text-zinc-600">{relatedLabels(node) || (node.group === "club" ? "Association" : node.group === "class_group" ? "Groupe" : "Personne")}</span>}</span><ChevronRight className="ml-auto h-3 w-3 shrink-0 text-zinc-700" /></button>)}{results.length > limit && <button onClick={() => setLimit(value => value+40)} className="w-full py-3 text-xs text-network-400">Afficher davantage ({results.length-limit})</button>}{!results.length && <p className="p-4 text-xs text-zinc-600">Aucun résultat pour ces critères.</p>}</div>
            </aside>
            <section className="relative flex min-h-[500px] flex-col overflow-hidden border border-zinc-800 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px]">
                <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/90 p-3"><div className="flex gap-1">{[{value:"all",label:"Tous"},{value:"relationship",label:"Relations"},{value:"membership",label:"Associations"},{value:"class_group",label:"Groupes"}].map(item => <button key={item.value} aria-pressed={kind === item.value} onClick={() => {setEdgeId(null);update({links:item.value === "all" ? null : item.value,page:null});}} className={`border px-2 py-1.5 text-[10px] ${kind === item.value ? "border-network-500/40 text-network-400" : "border-zinc-800 text-zinc-600 hover:text-white"}`}>{item.label}</button>)}</div>{target ? <button onClick={() => update({target:null})} className="flex max-w-60 items-center gap-2 truncate text-xs text-zinc-300">{target.name}<X className="h-3.5 w-3.5 shrink-0" /></button> : <span className="text-[10px] text-zinc-500">{neighbors.length} connexions directes</span>}</div>
                <div className="absolute right-3 top-16 z-10 flex flex-col gap-1 border border-zinc-700 bg-zinc-950/95 p-1">
                    <button title="Zoom avant" onClick={()=>zoom(.75)} className="p-2 text-zinc-300 hover:bg-zinc-800"><Plus className="h-4 w-4" /></button>
                    <button title="Zoom arrière" onClick={()=>zoom(1.333)} className="p-2 text-zinc-300 hover:bg-zinc-800"><Minus className="h-4 w-4" /></button>
                    <button title="Tout cadrer" onClick={fit} className="p-2 text-zinc-300 hover:bg-zinc-800"><Maximize2 className="h-4 w-4" /></button>
                    {!target && <button title="Afficher toutes les connexions du point de départ" onClick={()=>setVisibleLimit(neighbors.length)} className="p-2 text-zinc-300 hover:bg-zinc-800"><Expand className="h-4 w-4" /></button>}
                </div>
                <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} style={{touchAction:"none"}}
                    onPointerDown={event=>{
                        if(event.button!==0)return;
                        const node=(event.target as Element).closest("[data-node-id]");
                        gesture.current={id:node?.getAttribute("data-node-id") || null,x:event.clientX,y:event.clientY,moved:false};
                        dragged.current=false;
                    }}
                    onPointerMove={event=>{
                        const g=gesture.current,svg=svgRef.current;if(!g||!svg)return;
                        const dx=event.clientX-g.x,dy=event.clientY-g.y;
                        if(!g.moved && Math.hypot(dx,dy)<4)return;
                        const matrix=svg.getScreenCTM()?.inverse();if(!matrix)return;
                        const before=new DOMPoint(g.x,g.y).matrixTransform(matrix),after=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix);
                        if(g.id){const old=positions.get(g.id)!;setManual(value=>new Map(value).set(g.id!,{x:old.x+after.x-before.x,y:old.y+after.y-before.y}));}
                        else setView(v=>({...v,x:v.x-(after.x-before.x),y:v.y-(after.y-before.y)}));
                        event.currentTarget.setPointerCapture(event.pointerId);
                        g.x=event.clientX;g.y=event.clientY;g.moved=true;dragged.current=true;
                    }}
                    onPointerUp={()=>{gesture.current=null;}} onPointerCancel={()=>{gesture.current=null;}}
                    onClickCapture={event=>{if(dragged.current){event.stopPropagation();dragged.current=false;}}} className="min-h-[420px] w-full flex-1" role="group" aria-label="Constellation des relations">
                    <defs><marker id="network-arrow" viewBox="0 0 10 10" refX="32" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" /></marker></defs>

                    {edges.map(edge => {const a=positions.get(edge.source),b=positions.get(edge.target);if(!a||!b)return null;return <g key={edge.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edgeId===edge.id ? "#e4e4e7" : edge.color || "#52525b"} strokeOpacity={edgeId===edge.id ? 1 : .45} strokeWidth={edgeId===edge.id ? 2 : 1} strokeDasharray={edge.kind!=="relationship" ? "4 5" : undefined} markerEnd={edge.directed ? "url(#network-arrow)" : undefined} /><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="16" role="button" tabIndex={0} aria-label={`Lien ${edge.label}`} onClick={() => setEdgeId(edge.id)} onKeyDown={event => {if(event.key==="Enter")setEdgeId(edge.id);}} className="cursor-pointer" /><title>{edge.label}{edge.confidence ? ` · ${confidence[edge.confidence] || edge.confidence}` : ""}</title>{target && <text x={(a.x+b.x)/2} y={(a.y+b.y)/2-12} textAnchor="middle" fontSize="9" fill="#a1a1aa">{edge.label}</text>}</g>;})}
                    {visibleNodes.map(node => {const p=positions.get(node.id)!;const center=node.id===focus?.id;const color=node.group==="club" ? "#34d399" : node.group==="class_group" ? "#fbbf24" : "#818cf8";return <g key={node.id} data-node-id={node.id} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`Explorer ${node.name}`} onClick={event => {if(event.shiftKey){setExpanded(value=>new Set(value).add(node.id));}else chooseFocus(node);}} onKeyDown={event => {if(event.key==="Enter"||event.key===" "){event.preventDefault();chooseFocus(node);}}} className="cursor-pointer outline-none focus:[&>circle]:stroke-white focus:[&>rect]:stroke-white"><title>{node.name}</title>{node.group!=="student" ? <rect x={center?-48:-23} y={center?-48:-23} width={center?96:46} height={center?96:46} fill="#09090b" stroke={color} strokeWidth={center?2:1} /> : <circle r={center?52:25} fill="#09090b" stroke={color} strokeWidth={center?2:1} />}<text textAnchor="middle" dominantBaseline="central" fontSize={center?22:13} fontWeight="700" fill={color}>{node.name.split(/\s+/).map(word=>word[0]).slice(0,2).join("")}</text><foreignObject x={center?-100:-65} y={center?62:32} width={center?200:130} height="40"><div className="line-clamp-2 text-center text-[10px] leading-tight text-zinc-300">{node.name}</div></foreignObject></g>;})}
                </svg>
                {target && !path && <p role="status" className="absolute inset-x-0 top-1/2 text-center text-xs text-zinc-500">Aucun chemin connu avec ces filtres.</p>}
                {selectedEdge && <div className="absolute bottom-14 left-3 max-w-xs border border-zinc-700 bg-zinc-950/95 p-3 text-xs text-zinc-300"><button title="Fermer le lien" onClick={() => setEdgeId(null)} className="float-right ml-4 text-zinc-500"><X className="h-3 w-3" /></button><p>{selectedEdge.label}</p><p className="mt-1 text-[10px] text-zinc-500">{selectedEdge.origin === "housing" ? "Colocation issue des logements actifs" : selectedEdge.kind === "membership" ? "Rattachement actif à une association" : selectedEdge.kind === "class_group" ? "Rattachement actif à un groupe" : confidence[selectedEdge.confidence || ""] || "Relation renseignée"}</p></div>}
                <footer className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/90 p-3 text-[10px] text-zinc-500"><span>{target ? path ? `${path.edges.length} lien${path.edges.length>1?"s":""} · sens des relations respecté` : "Aucun lien déduit ou inventé" : "Glisser pour déplacer · Maj + clic pour déployer"}</span>{!target && neighbors.length>visibleLimit && <button onClick={()=>setVisibleLimit(value=>value+40)} className="border border-zinc-700 px-2 py-1 text-network-400">+ {Math.min(40,neighbors.length-visibleLimit)} connexions</button>}<span>{visibleNodes.length} visibles</span></footer>
            </section>
        </div>
    </main>;
}
export default function NetworkPage() { return <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}><NetworkWorkspace /></Suspense>; }
