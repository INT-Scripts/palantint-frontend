"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useSearchParams } from "next/navigation";
import Map, { Source, Layer, Marker, NavigationControl, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { FeatureCollection, Geometry } from "geojson";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, X, MapPin, Layers, Loader2, LocateFixed, Copy, ArrowRight, Tags, Check, CalendarDays, Users, Building2, WashingMachine, Info } from "lucide-react";
import { loadCampus, lookupCampusRoom } from "@/lib/campusData";
import { fetchPrivate } from "@/lib/api";
import { timetableHref } from "@/lib/timetableContext";

import Link from "next/link";
import BuildingPicker from "@/components/palantint/BuildingPicker";
import { usePathname } from "next/navigation";
import { floorName, normalizePlace as text, isCampusDestination, campusDestinations, type Place as PlanFeature, type CampusPlans as Plans, type CampusBuilding as Building, type PlaceProperties as Properties } from "@/lib/campus";

type Context = {
    code: string;
    kind: string;
    occupants: { id: string; first_name: string; last_name: string }[];
    clubs: { id: string; name: string }[];
    events: { id: string; name: string; start_time: string; end_time: string }[];
    agenda_room: string | null;
};

const style: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#09090b" } }] };
const isPolygon: ExpressionSpecification = ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]];
const availableLevels = (building: Building | undefined) =>
    [...new Set(building ? building.levels : [])].sort((a, b) => a - b);

export default function IndoorCampusMap() {
    const pathname = usePathname();
    const params = useSearchParams();
    const mapRef = useRef<MapRef>(null);
    const [plans, setPlans] = useState<Plans | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [contextResponse, setContextResponse] = useState<{ locationId: string; data: Context | null } | null>(null);
    const [viewport, setViewport] = useState<{ west: number; east: number; north: number; south: number; zoom: number; width: number; height: number } | null>(null);
    const [copied, setCopied] = useState(false);
    const [retry, setRetry] = useState(0);
    const hovered = useRef<string | number | null>(null);
    const hoverLabel = useRef<HTMLDivElement>(null);
    const deferredSearch = useDeferredValue(search);
    const [labels, setLabels] = useState(true);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        loadCampus()
            .then(([data, manifest]) => { if (active) { setPlans(data); setBuildings(manifest.buildings); } })
            .catch(() => { if (active) setError("Les plans du campus ne sont pas disponibles pour le moment."); });
        return () => { active = false; };
    }, [retry]);

    const featureIndex = useMemo(() => new globalThis.Map(plans?.features.map(feature => [String(feature.id), feature]) || []), [plans]);
    const selected = featureIndex.get(params.get("feature") || "") || plans?.features.find(feature => params.get("room") && feature.properties.name === params.get("room") && feature.properties.kind === "room");
    const roomQuery = params.get("room");
    const featureQuery = params.get("feature");
    useEffect(() => {
        if (!roomQuery || featureQuery) return;
        let active = true;
        lookupCampusRoom(roomQuery).then(matches => {
            if (!active || matches.length !== 1) return;
            const match = matches[0];
            const next = new URLSearchParams(window.location.search);
            if (next.get("room") !== roomQuery) return;
            next.set("feature", match.feature_id);
            next.delete("room");
            if (match.building_id !== null) next.set("building", String(match.building_id));
            if (match.levels.length) next.set("level", String(match.levels[0]));
            window.history.replaceState(null, "", `${pathname}?${next}`);
        }).catch(() => {});
        return () => { active = false; };
    }, [roomQuery, featureQuery, pathname]);
    const buildingQuery = params.get("building") || (selected?.properties.building_id ? String(selected.properties.building_id) : null);
    const building = useMemo(() => buildings.find(item => item.id === buildingQuery || item.name.toLowerCase() === buildingQuery?.toLowerCase() || (buildingQuery && item.residences?.some(residence=>residence.code===buildingQuery.toUpperCase()))), [buildings, buildingQuery]);
    const levels = useMemo(() => availableLevels(building), [building]);
    const requestedLevel = Number(params.get("level") ?? selected?.properties.levels[0] ?? 0);
    const level = levels.includes(requestedLevel) ? requestedLevel : levels[0] ?? 0;

    const selectedLocationId = selected?.properties.location_id;
    const context = contextResponse?.locationId === selectedLocationId ? contextResponse?.data : null;
    const loadingContext = !!selectedLocationId && contextResponse?.locationId !== selectedLocationId;
    const buildingId = building?.id;

    const setQuery = (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(updates)) {
            if (value === null) next.delete(key); else next.set(key, value);
        }
        next.delete("view");
        window.history.pushState(null, "", `${pathname}${next.size ? `?${next}` : ""}`);
    };

    const select = (feature: PlanFeature) => {
        const p = feature.properties;
        setSearch("");
        setCopied(false);
        setQuery({ feature: p.kind === "building" ? null : String(feature.id), room: null, building: p.building_id ? String(p.building_id) : null, level: String(p.levels.includes(level) ? level : p.levels[0] ?? level) });
    };

    useEffect(() => {
        if (!loaded || !plans) return;
        const target = selected || (building?.feature_id ? plans.features.find(feature => feature.id === building.feature_id) : undefined);
        const bounds = target?.bbox || (!building ? plans.metadata.sources[0]?.bounds : null);
        if (bounds && bounds.length >= 4) mapRef.current?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 60, maxZoom: selected ? 20 : 19, duration: 500 });
    }, [loaded, plans, selected, building]);

    useEffect(() => {
        let active = true;
        if (!selectedLocationId) return;
        const controller = new AbortController();
        fetchPrivate(`/maps/indoor/locations/${selectedLocationId}`, { signal: controller.signal })
            .then(data => { if (active) setContextResponse({ locationId: selectedLocationId, data }); })
            .catch(() => { if (active) setContextResponse({ locationId: selectedLocationId, data: null }); });
        return () => { active = false; controller.abort(); };
    }, [selectedLocationId]);

    const filtered: FeatureCollection<Geometry, Properties> = useMemo(() => ({ type: "FeatureCollection", features: plans?.features.filter(feature => {
        const p = feature.properties;
        if (p.kind === "building") return true;
        if (buildingId && p.building_id && String(p.building_id) !== buildingId) return false;
        return !p.levels.length || p.levels.includes(level);
    }) || [] }), [plans, buildingId, level]);

    const destinations = useMemo(() => campusDestinations(plans?.features || []), [plans]);
    const destinationIds = useMemo(() => new Set(destinations.map(feature => String(feature.id))), [destinations]);
    const searchIndex = useMemo(() => destinations.map(feature => ({ feature, query: text(`${feature.properties.name} ${(feature.properties.tag_names || []).join(" ")}`) })), [destinations]);
    const searchResults = useMemo(() => {
        const query = text(deferredSearch.trim());
        const seen = new Set<string>();
        return searchIndex.filter(({ feature, query: value }) => {
            if (query && !value.includes(query)) return false;
            if (!query && buildingId && String(feature.properties.building_id) !== buildingId) return false;
            if (!query && !buildingId && feature.properties.kind !== "building") return false;
            const p = feature.properties;
            const key = p.location_id || `${p.name}:${p.building_id}:${p.levels}:${p.label_coordinates}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => Number(text(b.feature.properties.name || "") === query) - Number(text(a.feature.properties.name || "") === query))
            .slice(0, 60).map(item => item.feature);
    }, [searchIndex, deferredSearch, buildingId]);

    // This source changes only with the floor/building, never with hover, typing,
    // place selection or a detail response. MapLibre keeps its worker-side index.
    const renderData = useMemo(() => ({ ...filtered, features: filtered.features.map(feature => ({ ...feature, properties: { ...feature.properties, actionable: destinationIds.has(String(feature.id)) } })) }), [filtered, destinationIds]);
    const visibleLabels = useMemo(() => {
        if (!labels || !viewport) return [];
        const candidates = filtered.features.filter(feature => {
            const p = feature.properties;
            const xy = p.label_coordinates;
            return xy && p.name && ((p.kind === "building" && viewport.zoom < 20) || (viewport.zoom >= 19 && destinationIds.has(String(feature.id)) && p.kind !== "building")) && xy[0] >= viewport.west && xy[0] <= viewport.east && xy[1] >= viewport.south && xy[1] <= viewport.north;
        });
        const boxes: { x: number; y: number; width: number }[] = [];
        return candidates.filter(feature => {
            const xy = feature.properties.label_coordinates!;
            const x = (xy[0] - viewport.west) / (viewport.east - viewport.west) * viewport.width;
            const y = (viewport.north - xy[1]) / (viewport.north - viewport.south) * viewport.height;
            const width = Math.min(112, (feature.properties.name?.length || 0) * 6 + 10);
            if (boxes.some(box => Math.abs(box.x - x) < (box.width + width) / 2 + 4 && Math.abs(box.y - y) < 26)) return false;
            boxes.push({ x, y, width });
            return boxes.length <= 70;
        });
    }, [filtered, labels, viewport, destinationIds]);
    const updateViewport = () => {
        const map = mapRef.current;
        const bounds = map?.getBounds();
        if (map && bounds) setViewport({ west: bounds.getWest(), east: bounds.getEast(), north: bounds.getNorth(), south: bounds.getSouth(), zoom: map.getZoom(), width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight });
    };
    const onClick = (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.source_feature_id;
        const feature = featureIndex.get(String(id));
        if (feature && isCampusDestination(feature)) select(feature);
    };
    const hover = (event?: MapLayerMouseEvent) => {
        const map = mapRef.current?.getMap();
        if (!map) return;
        if (hovered.current !== null) map.setFeatureState({ source: "indoor-plans", id: hovered.current }, { hover: false });
        hovered.current = event?.features?.[0]?.id ?? null;
        if (hovered.current !== null) map.setFeatureState({ source: "indoor-plans", id: hovered.current }, { hover: true });
        map.getCanvas().style.cursor = hovered.current === null ? "grab" : "pointer";
        const label = hoverLabel.current;
        if (label) {
            const name = event?.features?.[0]?.properties?.name;
            label.hidden = !name;
            label.textContent = name || "";
            if (event) label.style.transform = `translate(${Math.min(event.point.x + 14, map.getCanvas().clientWidth - 150)}px, ${event.point.y + 14}px)`;
        }
    };
    const resetView = () => {
        setQuery({ feature: null, room: null, building: null, level: null });
        const bounds = plans?.metadata.sources[0]?.bounds;
        if (bounds) mapRef.current?.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 40, duration: 400 });
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { setCopied(false); }
    };
    const selectedBuilding = buildings.find(item => item.id === String(selected?.properties.building_id));
    const residences = (selectedBuilding || building)?.residences || [];
    const residenceNames = residences.map(value=>value.code);


    if (error) return <div role="alert" className="border border-zinc-800 p-10 text-zinc-400"><p>{error}</p><button onClick={() => { setError(""); setLoaded(false); setRetry(value => value + 1); }} className="mt-4 border border-zinc-700 p-2 text-white">Réessayer</button></div>;
    if (!plans) return <div className="h-[650px] flex items-center justify-center gap-3 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /> Chargement des plans…</div>;

    return <div className="relative h-full w-full overflow-hidden bg-zinc-950 font-mono">
                    <Map ref={mapRef} initialViewState={{ longitude: 2.44348, latitude: 48.62517, zoom: 17 }} mapStyle={style} style={{ width: "100%", height: "100%" }} aria-label="Carte interactive du campus" onLoad={() => { setLoaded(true); updateViewport(); }} onMoveEnd={updateViewport} interactiveLayerIds={["destination-buildings", "destinations", "destination-points"]} onMouseMove={hover} onMouseLeave={() => hover()} onClick={onClick} onError={() => setError("Le rendu de la carte a échoué. Vérifiez que WebGL est disponible dans votre navigateur.")} maxZoom={23} minZoom={14} attributionControl={false}>
                        <NavigationControl position="bottom-right" showCompass={false} />
                        <Source id="indoor-plans" type="geojson" data={renderData}>
                            <Layer id="grounds" type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "structure"]]} paint={{ "fill-color": ["case", ["has", "landuse"], "#12281d", ["has", "leisure"], "#1b263b", "#17202a"], "fill-opacity": 0.65, "fill-outline-color": "#334155" }} />
                            <Layer id="buildings" type="fill" filter={["==", ["get", "kind"], "building"]} paint={{ "fill-color": "#27272a", "fill-opacity": 0.8, "fill-outline-color": "#71717a" }} />
                            <Layer id="active-building" type="line" filter={["all", ["==", ["get", "kind"], "building"], ["==", ["to-string", ["get", "building_id"]], buildingId || ""]]} paint={{ "line-color": "#a78bfa", "line-width": 2 }} />
                            <Layer id="floors" minzoom={17.8} type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "floor"]]} paint={{ "fill-color": "#18181b", "fill-opacity": 0.9 }} />
                            <Layer id="circulation" minzoom={17.8} type="fill" filter={["all", isPolygon, ["in", ["get", "kind"], ["literal", ["corridor", "stairs", "elevator"]]]]} paint={{ "fill-color": "#475569", "fill-opacity": 0.5, "fill-outline-color": "#64748b" }} />
                            <Layer id="rooms" minzoom={17.8} type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "room"]]} paint={{ "fill-color": ["case", ["==", ["get", "actionable"], true], "#164e63", "#27272a"], "fill-opacity": 0.8, "fill-outline-color": ["case", ["==", ["get", "actionable"], true], "#38bdf8", "#52525b"] }} />
                            <Layer id="lines" minzoom={18} type="line" filter={["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]]} paint={{ "line-color": "#64748b", "line-width": 1 }} />
                            <Layer id="points" minzoom={18} type="circle" filter={["==", ["geometry-type"], "Point"]} paint={{ "circle-color": "#fbbf24", "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 1, 21, 3], "circle-opacity": 0.65 }} />
                            <Layer id="destination-buildings" type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "building"], ["==", ["get", "actionable"], true]]} paint={{ "fill-color": "#67e8f9", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.2, 0] }} />
                            <Layer id="destinations" minzoom={17.8} type="fill" filter={["all", isPolygon, ["!=", ["get", "kind"], "building"], ["==", ["get", "actionable"], true]]} paint={{ "fill-color": "#67e8f9", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.25, 0] }} />
                            <Layer id="destination-points" minzoom={18} type="circle" filter={["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "actionable"], true]]} paint={{ "circle-radius": 7, "circle-color": "#67e8f9", "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.5, 0] }} />
                            <Layer id="selected-room" type="line" filter={["==", ["get", "source_feature_id"], String(selected?.id || "")]} paint={{ "line-color": "#fbbf24", "line-width": 3 }} />
                        </Source>
                        {visibleLabels.map(feature => <Marker key={String(feature.id)} ref={marker => { if (marker) { const element = marker.getElement(); element.setAttribute("aria-hidden", "true"); element.setAttribute("role", "presentation"); element.tabIndex = -1; } }} style={{ pointerEvents: "none" }} longitude={feature.properties.label_coordinates![0]} latitude={feature.properties.label_coordinates![1]}><span className={`pointer-events-none block max-w-28 text-center text-[10px] leading-tight ${feature.properties.kind === "building" ? "text-white font-bold bg-zinc-950/90 p-1" : "text-sky-100 bg-zinc-950/80 px-1"}`}>{feature.properties.name}</span></Marker>)}
                    </Map>
        <div ref={hoverLabel} hidden className="pointer-events-none absolute left-0 top-0 z-30 max-w-40 rounded-none border border-zinc-800 bg-zinc-950/95 px-2.5 py-1.5 text-xs text-white shadow-xl" />
        <div className="absolute left-3 top-3 z-20 w-[min(320px,calc(100%-80px))] space-y-2 sm:left-5 sm:top-5">
            <div className="relative rounded-none border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur-xl">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Escape") setSearch(""); if (event.key === "Enter" && searchResults.length === 1) select(searchResults[0]); }} placeholder="Un lieu, une salle…" aria-label="Rechercher dans les plans" className="h-11 w-full rounded-none bg-transparent pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-campus-400" />
                {search && <button title="Effacer" aria-label="Effacer la recherche" onClick={() => setSearch("")} className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>}
                {!!search.trim() && <div className="max-h-[40dvh] overflow-y-auto border-t border-zinc-800/60 p-1.5">{searchResults.map(feature => <button key={String(feature.id)} onClick={() => select(feature)} className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-900"><MapPin className="h-4 w-4 shrink-0 text-campus-400" /><span className="min-w-0 flex-1 truncate">{feature.properties.name}</span><span className="shrink-0 text-[10px] text-zinc-500">{feature.properties.levels.map(value => value === 0 ? "RDC" : value).join(" · ")}</span><ArrowRight className="h-3 w-3 text-zinc-600" /></button>)}{!searchResults.length && <p className="px-3 py-4 text-xs text-zinc-500">Aucun résultat</p>}</div>}
            </div>
            <BuildingPicker buildings={buildings} features={featureIndex} selected={building} onSelect={id => { setSearch(""); setQuery({ building: id, feature: null, room: null, level: null }); }} />
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2 sm:right-5 sm:top-5">
            <button title="Tout le campus" aria-label="Tout le campus" onClick={resetView} className="rounded-none border border-zinc-800 bg-zinc-950/95 p-3 text-zinc-300 shadow-lg hover:text-white"><LocateFixed className="h-4 w-4" /></button>
            <button title="Noms des lieux" aria-label="Noms des lieux" aria-pressed={labels} onClick={() => setLabels(!labels)} className={`rounded-none border border-zinc-800 bg-zinc-950/95 p-3 shadow-lg ${labels ? "text-campus-400" : "text-zinc-500"}`}><Tags className="h-4 w-4" /></button>
        </div>
        {building && levels.length > 0 && <nav aria-label="Étages" className="absolute right-3 top-[55%] z-10 flex max-h-[calc(100%-220px)] -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-none border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur-xl sm:right-5">
            <Layers className="mx-auto my-1 h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {[...levels].reverse().map(value => <button key={value} title={floorName(value)} aria-label={floorName(value)} aria-pressed={level === value} onClick={() => setQuery({ level: String(value), feature: null, room: null })} className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-none px-2 text-xs font-semibold transition-colors ${level === value ? "border border-campus-500/60 bg-campus-500/15 text-campus-300" : "text-zinc-500 hover:bg-zinc-900 hover:text-white"}`}>{value === 0 ? "RDC" : value}</button>)}
        </nav>}
        {selected && selected.properties.kind !== "building" && <section aria-label="Lieu sélectionné" className="absolute bottom-20 left-3 z-10 max-h-[42%] w-[min(320px,calc(100%-80px))] overflow-y-auto rounded-none border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:left-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-white">{selected.properties.name}</h2><div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500"><Layers className="h-3 w-3" />{selected.properties.levels.map(value => value === 0 ? "RDC" : value).join(" · ")}{!!selected.properties.geometry_area_m2 && <span>· ≈ {Math.round(selected.properties.geometry_area_m2)} m²</span>}</div></div><button aria-label="Fermer le détail" title="Fermer" onClick={() => setQuery({ feature: null, room: null })} className="p-1 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
            <div className="mt-3 flex flex-wrap gap-2">
                {context?.agenda_room && <Link title="Emploi du temps" href={timetableHref({ room: context.agenda_room, week: new Date() })} className="flex items-center gap-2 rounded-none bg-timetable-500/10 px-3 py-2 text-xs text-timetable-400"><CalendarDays className="h-4 w-4" />Agenda</Link>}
                {residenceNames.map(name => <Link key={name} href={`/palantint/apartments?bldg=${name}${context?.kind === "APARTMENT" ? `&room=${encodeURIComponent(context.code)}` : ""}`} title={`Logements ${name}`} aria-label={`Logements ${name}`} className="rounded-none bg-housing-500/10 p-2 text-housing-400"><Building2 className="h-4 w-4" /></Link>)}
                {/foyer/i.test(selectedBuilding?.name || "") && <Link title="Associations du Foyer" aria-label="Associations du Foyer" href="/palantint/foyer" className="rounded-none bg-orga-500/10 p-2 text-orga-400"><Users className="h-4 w-4" /></Link>}
                {(context?.occupants.length || 0) > 1 && <Link title="Comparer les disponibilités" aria-label="Comparer les disponibilités" href={timetableHref({ students: context!.occupants.map(person => person.id), week: new Date() })} className="rounded-none bg-timetable-500/10 p-2 text-timetable-400"><Users className="h-4 w-4" /></Link>}
                <button title={copied ? "Lien copié" : "Copier le lien"} aria-label={copied ? "Lien copié" : "Copier le lien"} onClick={copyLink} className="rounded-none bg-white/5 p-2 text-zinc-400 hover:text-white">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</button>
                {loadingContext && <Loader2 className="m-2 h-4 w-4 animate-spin text-zinc-500" />}
            </div>
            {!!context?.occupants.length && <div className="mt-3 space-y-1">{context.occupants.map(person => <Link key={person.id} href={`/palantint/students/${person.id}`} className="flex items-center gap-2 rounded-none p-2 text-xs text-student-400 hover:bg-zinc-900"><Users className="h-3.5 w-3.5" />{person.first_name} {person.last_name}</Link>)}</div>}
            {!!context?.clubs.length && <div className="mt-2 space-y-1">{context.clubs.map(club => <Link key={club.id} href={`/palantint/clubs?club=${encodeURIComponent(club.id)}`} className="flex items-center gap-2 rounded-none p-2 text-xs text-orga-400 hover:bg-zinc-900"><Users className="h-3.5 w-3.5" />{club.name}</Link>)}</div>}
            {!!context?.events.length && <Link href={timetableHref({ room: context.agenda_room, week: new Date(context.events[0].start_time) })} className="mt-3 flex items-center gap-2 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{context.events[0].name}</span><span className="ml-auto shrink-0 text-zinc-600">{new Date(context.events[0].start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></Link>}
            <details className="mt-3 text-xs text-zinc-500"><summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] hover:text-zinc-300"><Info className="h-3.5 w-3.5" />Détails</summary><div className="mt-2 space-y-2">{selected.properties.tag_names?.length ? <p>{selected.properties.tag_names.join(" · ")}</p> : null}{selected.properties.description && <p>{selected.properties.description}</p>}{selected.properties.opening_hours && <p>{selected.properties.opening_hours}</p>}{selected.properties.access && <p>{selected.properties.access}</p>}</div></details>
        </section>}
        {!!residenceNames.length && !selected && <div className="absolute bottom-20 left-3 z-10 flex gap-2 sm:bottom-5 sm:left-5">{residenceNames.map(name => <div key={name} className="flex gap-1 rounded-none border border-zinc-800 bg-zinc-950/95 p-1 shadow-xl"><Link title={`Logements ${name}`} href={`/palantint/apartments?bldg=${name}`} className="flex items-center gap-2 rounded-none px-3 py-2 text-xs text-housing-400 hover:bg-zinc-900"><Building2 className="h-4 w-4" />{name}</Link>{residences.some(value=>value.code===name && value.laundry) && <Link title={`Laverie ${name}`} aria-label={`Laverie ${name}`} href={`/palantint/laundry?building=${name}`} className="rounded-none p-2 text-zinc-400 hover:bg-zinc-900"><WashingMachine className="h-4 w-4" /></Link>}</div>)}</div>}
        {!selected && /foyer/i.test(building?.name || "") && <Link href="/palantint/foyer" title="Associations du Foyer" className="absolute bottom-20 left-3 z-10 flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-950/95 px-3 py-2.5 text-xs text-orga-400 shadow-lg sm:bottom-5 sm:left-5"><Users className="h-4 w-4" />Foyer</Link>}
        <span title={`Wemap · ${new Date(plans.metadata.extracted_at).toLocaleDateString("fr-FR")}`} className="pointer-events-none absolute bottom-1 left-3 text-[9px] text-zinc-600">Wemap</span>
    </div>;
}
