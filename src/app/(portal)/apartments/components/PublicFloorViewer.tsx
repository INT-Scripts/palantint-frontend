"use client";
import { useEffect, useState } from 'react';
import { useBuildingCatalog } from '@/components/BuildingCatalog';
import FloorPlanCanvas from '@/components/FloorPlanCanvas';
import { readFloorPlan, type FloorPlan } from '@/lib/planGeometry';
export default function PublicFloorViewer({ building, floor, selectedRoomId, filteredRoomIds, onSelectRoom, apartmentsMap }: {
    building: string;
    floor: string;
    selectedRoomId: string | null;
    filteredRoomIds: Set<string>;
    onSelectRoom: (id: string) => void;
    apartmentsMap: Record<string, unknown>;
}) {
    const catalog = useBuildingCatalog();
    const [result, setResult] = useState<{
        key: string;
        plan: FloorPlan;
    } | null>(null);
    const [error, setError] = useState('');
    const key = `${building}:${floor}`;
    useEffect(() => { const controller = new AbortController(); const url = catalog.all[building]?.find(value => value.value === floor)?.assets.geojson; if (!url)
        return; fetch(url, { signal: controller.signal }).then(readFloorPlan).then(plan => { setResult({ key, plan }); setError(''); }).catch(() => { if (!controller.signal.aborted)
        setError('Le plan est indisponible.'); }); return () => controller.abort(); }, [catalog, building, floor, key]);
    return <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">{error && <p role="alert" className="p-3 text-sm">{error}</p>}<FloorPlanCanvas plan={result?.key === key ? result.plan : null} privateView={false} selectedRoom={selectedRoomId} filteredRooms={filteredRoomIds} details={apartmentsMap} onSelectRoom={onSelectRoom}/></div>;
}
