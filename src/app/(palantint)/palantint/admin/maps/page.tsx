"use client";
import { useEffect, useState } from 'react';
import { BuildingCatalogBoundary, useBuildingCatalog } from '@/components/BuildingCatalog';
import FloorPlanCanvas from '@/components/FloorPlanCanvas';
import { readFloorPlan, type FloorPlan } from '@/lib/planGeometry';
import { fetchPrivate } from '@/lib/api';
import { Save, Undo2, Trash2 } from 'lucide-react';
function Calibration() {
    const catalog = useBuildingCatalog();
    const [building, setBuilding] = useState('U7'), [floor, setFloor] = useState('1');
    const [loaded, setLoaded] = useState<{
        key: string;
        plan: FloorPlan;
        reference: FloorPlan | null;
    } | null>(null), [pillars, setPillars] = useState<{
        x: number;
        y: number;
    }[]>([]);
    const [saved, setSaved] = useState<{
        x: number;
        y: number;
    }[]>([]), [error, setError] = useState(''), [saving, setSaving] = useState(false), [notice, setNotice] = useState('');
    const key = `${building}:${floor}`;
    useEffect(() => {
        const controller = new AbortController();
        let current = true;
        const floors = catalog.all[building] || [], index = floors.findIndex(f => f.value === floor), url = floors[index]?.assets.geojson;
        if (!url)
            return;
        Promise.all([fetch(url, { signal: controller.signal }).then(readFloorPlan), index > 0 ? fetch(floors[index - 1].assets.geojson, { signal: controller.signal }).then(readFloorPlan) : Promise.resolve(null), fetchPrivate(`/maps/${building}/${floor}/metadata`, { signal: controller.signal })]).then(([plan, reference, metadata]) => { if (current) {
            setLoaded({ key, plan, reference });
            setPillars(metadata.pillars || []);
            setSaved(metadata.pillars || []);
            setError('');
        } }).catch(() => { if (current)
            setError('Impossible de charger le plan ou sa calibration.'); });
        return () => { current = false; controller.abort(); };
    }, [catalog, building, floor, key]);
    const save = async () => { setSaving(true); try {
        await fetchPrivate(`/maps/${building}/${floor}/metadata`, { method: 'POST', body: JSON.stringify({ pillars }) });
        setSaved(pillars);
        setNotice('Calibration enregistrée.');
    }
    catch {
        setError('La calibration n’a pas pu être enregistrée.');
    }
    finally {
        setSaving(false);
    } };
    return <main className="min-h-screen bg-zinc-950 p-5 font-mono text-zinc-300"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-lg font-bold uppercase text-white">Calibration des plans</h1><button disabled={saving || loaded?.key !== key} onClick={save} className="flex items-center gap-2 border border-campus-500/40 px-4 py-2 text-sm text-campus-400"><Save size={16}/>Enregistrer</button></div>
 <div className="mb-4 flex flex-wrap gap-3"><label>Bâtiment <select className="border border-zinc-700 bg-zinc-950 p-2" value={building} onChange={event => { const value = event.target.value; setBuilding(value); setFloor(catalog.all[value][0].value); setNotice(''); }}>{Object.keys(catalog.all).map(value => <option key={value}>{value}</option>)}</select></label><label>Étage <select className="border border-zinc-700 bg-zinc-950 p-2" value={floor} onChange={event => { setFloor(event.target.value); setNotice(''); }}>{catalog.all[building]?.map(value => <option key={value.value} value={value.value}>{value.label}</option>)}</select></label></div>
 {error && <p role="alert" className="mb-3 text-red-400">{error}</p>}{notice && <p role="status" className="mb-3 text-campus-400">{notice}</p>}
 <div className="grid gap-4 lg:grid-cols-[1fr_280px]"><div className="border border-zinc-800"><FloorPlanCanvas plan={loaded?.key === key ? loaded.plan : null} reference={loaded?.key === key ? loaded.reference : null} pillars={loaded?.key === key ? pillars : []} onPick={point => { if (loaded?.key === key)
        setPillars(value => value.length < 2 ? [...value, point] : value); }} className="h-[65dvh]"/></div>
 <aside className="border border-zinc-800 p-4"><p className="text-xs text-zinc-400">Choisissez les deux mêmes repères sur chaque étage. Le plan de l’étage précédent apparaît en transparence.</p><div className="mt-4 space-y-3">{pillars.map((point, index) => <div key={index} className="flex items-center gap-2"><span>{index + 1}</span>{(['x', 'y'] as const).map(axis => <label key={axis} className="text-xs">{axis.toUpperCase()} %<input aria-label={`Repère ${index + 1} ${axis}`} type="number" min={0} max={100} step="0.01" value={Number(point[axis].toFixed(2))} onChange={event => { const number = Number(event.target.value); if (number >= 0 && number <= 100)
        setPillars(values => values.map((value, i) => i === index ? { ...value, [axis]: number } : value)); }} className="w-20 border border-zinc-700 bg-zinc-950 p-1"/></label>)}<button title="Supprimer le repère" aria-label={`Supprimer le repère ${index + 1}`} onClick={() => setPillars(value => value.filter((_, i) => i !== index))}><Trash2 size={14}/></button></div>)}</div><button onClick={() => setPillars(saved)} className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><Undo2 size={14}/>Annuler les modifications</button>{loaded?.key === key && <p className="mt-6 text-xs text-zinc-500">{loaded.plan.metadata.room_count} salles · {loaded.plan.metadata.unresolved_rooms.length} contours à vérifier</p>}</aside></div></main>;
}
export default function Page() { return <BuildingCatalogBoundary><Calibration /></BuildingCatalogBoundary>; }
