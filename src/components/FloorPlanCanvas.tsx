"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PLAN_SPACE_KINDS, planGeometry, planLines, polygonRings, type FloorPlan, type PlanFeature } from '@/lib/planGeometry';
const DEFAULT_VIEW = [0, 0, 1000, 1000];
type Props = {
    plan: FloorPlan | null;
    reference?: FloorPlan | null;
    selectedRoom?: string | null;
    filteredRooms?: Set<string>;
    // Fill and outline per room, under the selection and hover colours.
    tones?: Record<string, { fill: string; stroke: string }>;
    occupied?: Record<string, unknown[]>;
    details?: Record<string, unknown>;
    onSelectRoom?: (id: string) => void;
    onPick?: (point: {
        x: number;
        y: number;
    }) => void;
    pillars?: {
        x: number;
        y: number;
    }[];
    privateView?: boolean;
    className?: string;
    controlsClassName?: string;
};
function pathFor(feature: PlanFeature) {
    const path = new Path2D();
    for (const line of planLines(planGeometry(feature))) {
        line.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y));
        if (polygonRings(planGeometry(feature)).length)
            path.closePath();
    }
    return path;
}
export default function FloorPlanCanvas({ plan, reference, selectedRoom, filteredRooms, tones = {}, occupied = {}, details = {}, onSelectRoom, onPick, pillars = [], privateView = true, className = 'min-h-[420px]', controlsClassName = 'right-3 top-3' }: Props) {
    const { resolvedTheme } = useTheme();
    const dark = privateView || resolvedTheme === 'dark';
    const canvas = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 800, height: 520 });
    const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
    const [hover, setHover] = useState<string | null>(null);
    const drag = useRef<{
        x: number;
        y: number;
        moved: boolean;
    } | null>(null);
    useEffect(() => { if (!host.current)
        return; const observer = new ResizeObserver(entries => { const rect = entries[0].contentRect; setSize({ width: rect.width, height: rect.height }); }); observer.observe(host.current); return () => observer.disconnect(); }, []);
    const paths = useMemo(() => typeof Path2D === 'undefined' ? [] : (plan?.features || []).map(feature => ({ feature, path: pathFor(feature) })), [plan]);
    const view = plan?.metadata.view_box || DEFAULT_VIEW;
    const scale = Math.min(size.width / view[2], size.height / view[3]) * .91 * camera.zoom;
    const offset = { x: (size.width - view[2] * scale) / 2 - view[0] * scale + camera.x, y: (size.height - view[3] * scale) / 2 - view[1] * scale + camera.y };
    const current = plan?.features.find(f => f.properties.room_id === (hover || selectedRoom));
    const detail = current ? details[current.properties.room_id || ''] as {
        Type?: unknown;
    } | undefined : undefined;
    useEffect(() => {
        const el = canvas.current, ctx = el?.getContext('2d');
        if (!el || !ctx)
            return;
        const dpr = window.devicePixelRatio || 1;
        el.width = size.width * dpr;
        el.height = size.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size.width, size.height);
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, scale);
        if (reference) {
            ctx.globalAlpha = .12;
            ctx.strokeStyle = privateView ? '#a1a1aa' : '#57534e';
            ctx.lineWidth = 1 / scale;
            for (const feature of reference.features)
                ctx.stroke(pathFor(feature));
            ctx.globalAlpha = 1;
        }
        // Storey slab and unnumbered spaces under the walls and rooms.
        for (const { feature, path } of paths) {
            const p = feature.properties;
            if (planGeometry(feature).type === 'Point')
                continue;
            if (p.kind === 'floor')
                ctx.fillStyle = privateView ? '#18181b' : dark ? '#292524' : '#e7e5e4aa';
            else if (PLAN_SPACE_KINDS.has(p.kind))
                ctx.fillStyle = privateView ? '#47556959' : dark ? '#57534e88' : '#d6d3d1aa';
            else
                continue;
            ctx.fill(path, 'evenodd');
        }
        for (const { feature, path } of paths) {
            const p = feature.properties, id = p.room_id;
            ctx.lineWidth = 1 / scale;
            if (p.kind !== 'wall' && p.kind !== 'room')
                continue;
            if (p.kind === 'wall') {
                ctx.strokeStyle = privateView ? '#71717a' : '#78716c';
                ctx.stroke(path);
                continue;
            }
            const active = id === selectedRoom, hot = id === hover, marked = !!id && (!!occupied[id]?.length || filteredRooms?.has(id));
            const tone = id ? tones[id] : undefined;
            ctx.fillStyle = active ? '#2563eb' : hot ? '#3b82f6' : tone ? `${tone.fill}cc` : marked ? '#f9731655' : privateView ? '#a1a1aa18' : '#a8a29e25';
            ctx.strokeStyle = active || hot ? '#60a5fa' : tone ? tone.stroke : marked ? '#f97316' : privateView ? '#71717a' : '#a8a29e';
            if (planGeometry(feature).type === 'Point') {
                const xy = p.label_coordinates || [0, 0];
                ctx.beginPath();
                ctx.arc(xy[0], xy[1], 5 / scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            else {
                ctx.fill(path, 'evenodd');
                ctx.stroke(path);
            }
        }
        for (const { feature } of paths) {
            const p = feature.properties;
            if (p.kind !== 'room' || !p.label_coordinates)
                continue;
            ctx.fillStyle = p.room_id === selectedRoom || p.room_id === hover ? '#ffffff' : dark ? '#e4e4e7' : '#292524';
            ctx.font = `${Math.max(7 / scale, Math.min(11 / scale, view[2] / 85))}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(p.name || p.room_id || '', p.label_coordinates[0], p.label_coordinates[1]);
        }
        pillars.forEach((p, i) => { const x = view[0] + p.x / 100 * view[2], y = view[1] + p.y / 100 * view[3]; ctx.fillStyle = i ? '#22d3ee' : '#eab308'; ctx.beginPath(); ctx.arc(x, y, 6 / scale, 0, Math.PI * 2); ctx.fill(); });
    }, [plan, paths, reference, size, scale, offset.x, offset.y, hover, selectedRoom, filteredRooms, tones, occupied, privateView, dark, pillars, view]);
    const locate = (event: React.PointerEvent<HTMLCanvasElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left - offset.x) / scale, y: (event.clientY - rect.top - offset.y) / scale }; };
    const hit = (point: {
        x: number;
        y: number;
    }) => { const ctx = canvas.current?.getContext('2d'); if (!ctx)
        return null; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const found = [...paths].reverse().find(({ feature, path }) => feature.properties.kind === 'room' && (planGeometry(feature).type === 'Point' ? Math.hypot((feature.properties.label_coordinates?.[0] || 0) - point.x, (feature.properties.label_coordinates?.[1] || 0) - point.y) < 15 / scale : ctx.isPointInPath(path, point.x, point.y, 'evenodd'))); ctx.restore(); return found?.feature.properties.room_id || null; };
    return <div ref={host} className={`relative w-full overflow-hidden ${privateView ? 'bg-zinc-950 text-zinc-300' : 'bg-stone-50 text-stone-800 dark:bg-stone-950 dark:text-stone-200'} ${className}`}>
  {!plan ? <p role="status" className="p-6 text-sm">Plan GeoJSON indisponible.</p> : <>
   <canvas ref={canvas} aria-label={`Plan ${plan.metadata.building}, étage ${plan.metadata.floor}`} className="absolute inset-0 h-full w-full touch-none" onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { const g = drag.current; if (g) {
            const dx = event.clientX - g.x, dy = event.clientY - g.y;
            if (Math.hypot(dx, dy) > 3 || g.moved) {
                setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
                g.x = event.clientX;
                g.y = event.clientY;
                g.moved = true;
            }
        }
        else
            setHover(hit(locate(event))); }} onPointerLeave={() => setHover(null)} onPointerCancel={() => { drag.current = null; }} onPointerUp={event => { const moved = drag.current?.moved; drag.current = null; if (moved)
            return; const point = locate(event); if (onPick)
            onPick({ x: (point.x - view[0]) / view[2] * 100, y: (point.y - view[1]) / view[3] * 100 });
        else {
            const id = hit(point);
            if (id)
                onSelectRoom?.(id);
        } }}/>
   <div className={`absolute ${controlsClassName} flex flex-col gap-1 border p-1 ${privateView ? 'border-zinc-800 bg-zinc-950/95' : 'rounded-xl border-stone-300 bg-white/95 dark:bg-stone-900'}`}>
    <button aria-label="Zoom avant" title="Zoom avant" onClick={() => setCamera(c => ({ ...c, zoom: Math.min(12, c.zoom * 1.3) }))} className="p-2"><Plus size={16}/></button>
    <button aria-label="Zoom arrière" title="Zoom arrière" onClick={() => setCamera(c => ({ ...c, zoom: Math.max(.3, c.zoom / 1.3) }))} className="p-2"><Minus size={16}/></button>
    <button aria-label="Recentrer le plan" title="Recentrer le plan" onClick={() => setCamera({ zoom: 1, x: 0, y: 0 })} className="p-2"><Maximize2 size={16}/></button>
   </div>
   {current && <div role="status" className={`pointer-events-none absolute bottom-3 left-3 max-w-xs border p-3 text-xs ${privateView ? 'border-zinc-700 bg-zinc-950/95 font-mono' : 'rounded-xl border-stone-300 bg-white/95 dark:bg-stone-900'}`}><strong>{current.properties.room_id}</strong>{detail?.Type ? ` · ${String(detail.Type)}` : ''}{current.properties.extraction === 'unresolved' && <p className="mt-1 text-amber-500">Contour à vérifier</p>}</div>}
   <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:bottom-0 focus-within:bg-zinc-900 focus-within:p-3" aria-label="Salles du plan">{plan.features.filter(f => f.properties.kind === 'room').map(f => <button key={f.id} aria-pressed={f.properties.room_id === selectedRoom} onClick={() => f.properties.room_id && onSelectRoom?.(f.properties.room_id)} className="m-1 border p-1">{f.properties.room_id}</button>)}</div>
  </>}
 </div>;
}
