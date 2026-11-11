"use client";

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Map, { Source, Layer, Marker, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, X, MapPin, Layers, Loader2, ArrowRight, Building2, Bookmark, BookmarkX } from "lucide-react";
import { loadBookmarks, loadCampus, loadCampusContext, loadOccupancy, loadSurfaces, removeBookmark, resolveCampusRoom, saveBookmark, type AerialIndex, type PlaceBookmark, type BasemapData, type DrawnPlans, type LocalPlans, type ResidenceSummary } from "@/lib/campusData";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";
import type { FloorPlan } from "@/lib/planGeometry";
import { fetchPrivate } from "@/lib/api";
import { floorName, normalizePlace as text, isCampusDestination, campusDestinations, type Place as PlanFeature, type CampusPlans as Plans, type CampusBuilding as Building, type PlaceProperties as Properties } from "@/lib/campus";
import { createReliefLayer, type SceneLine, type SceneMarker } from "./reliefLayer";
import CampusPanel, { OCCUPANCY_TONES, type DrawnRoom, type OccupancyState, type PlaceContext as Context, type PlaceTools } from "./CampusPanel";
import type { MapOverlay } from "./PlaceActions";
import { NavigationControls, PanelSheet, ViewSwitch, type CampusView } from "./MapControls";

type Viewport = { west: number; east: number; north: number; south: number; zoom: number; pitch: number; width: number; height: number };

const style: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#09090b" } }] };
const isPolygon: ExpressionSpecification = ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]];
const STOREY_M = 3.2;
const PITCH_3D = 60;
// With the 3D surfaces, the scene and every extrusion are raised by two storeys: MapLibre
// cannot extrude below its ground plane, and basements need room under the ground.
const LIFT = 2 * STOREY_M;
// Height of a marker above its floor: about mid-room.
const MARKER_ABOVE_FLOOR = 1.3;
const EARTH_CIRCUMFERENCE = 2 * Math.PI * 6378137;
// Street-level camera of the immersive view: the steepest pitch the map allows, close in.
const IMMERSIVE = { pitch: 75, zoom: 20.6 };
// Places pinned in this browser before bookmarks were kept by the server; moved there once.
const LEGACY_PINS_KEY = "palantint_campus_pins";
const readLegacyPins = (): string[] => { try { return JSON.parse(localStorage.getItem(LEGACY_PINS_KEY) || "[]"); } catch { return []; } };
const levelLabel = (value: number) => value === 0 ? "RDC" : String(value);
const tokenHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("palantint_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Where a place is marked: its label point, else the centre of its bounds. */
function placeCenter(feature: PlanFeature | undefined): Position | null {
    const box = feature?.bbox;
    return feature?.properties.label_coordinates || (box && box.length >= 4 ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null);
}
function polygonCenter(geometry: Geometry): Position | null {
    const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.type === "MultiPolygon" ? geometry.coordinates[0]?.[0] : null;
    if (!ring?.length) return null;
    return [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length];
}
function inside(point: Position, geometry: Geometry) {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
    return polygons.some(([ring]) => {
        let result = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            if ((ring[i][1] > point[1]) !== (ring[j][1] > point[1]) && point[0] < (ring[j][0] - ring[i][0]) * (point[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) result = !result;
        }
        return result;
    });
}

export default function CampusMap() {
    const pathname = usePathname();
    const params = useSearchParams();
    const mapRef = useRef<MapRef>(null);
    const [plans, setPlans] = useState<Plans | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [drawn, setDrawn] = useState<DrawnPlans | null>(null);
    const [basemap, setBasemap] = useState<BasemapData | null>(null);
    const [aerialIndex, setAerialIndex] = useState<AerialIndex | null>(null);
    const [housing, setHousing] = useState<Record<string, ResidenceSummary> | null>(null);
    const [localPlans, setLocalPlans] = useState<LocalPlans | null>(null);
    const [occupancy, setOccupancy] = useState<Map<string, OccupancyState> | null>(null);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [contextResponse, setContextResponse] = useState<{ locationId: string; data: Context | null } | null>(null);
    const [viewport, setViewport] = useState<Viewport | null>(null);
    const [copied, setCopied] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    // People placed on the map by a place action; kept while other places are opened.
    const [overlay, setOverlay] = useState<(MapOverlay & { action: string }) | null>(null);
    // Bookmarked places: marked on the map and listed under the bookmark button, on every device.
    const [bookmarks, setBookmarks] = useState<PlaceBookmark[]>([]);
    const [bookmarksOpen, setBookmarksOpen] = useState(false);
    const pins = useMemo(() => bookmarks.map(bookmark => bookmark.feature_id), [bookmarks]);
    const immersiveTarget = useRef<Position | null>(null);
    const [retry, setRetry] = useState(0);
    const hovered = useRef<string | number | null>(null);
    const hoverLabel = useRef<HTMLDivElement>(null);
    const deferredSearch = useDeferredValue(search);
    const [labels, setLabels] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [reliefState, setReliefState] = useState<"idle" | "loading" | "ready" | "missing">("idle");
    // Pointing at the 3D view starts loading it, so that it is mostly there once chosen.
    const [warm, setWarm] = useState(false);
    const reliefLayer = useRef<ReturnType<typeof createReliefLayer> | null>(null);
    const [bearing, setBearing] = useState(0);
    const [searchOpen, setSearchOpen] = useState(false);
    // One choice per view: the plan uses the vector base map, satellite the aerial photo,
    // and 3D always shows the campus scan and the surrounding relief.
    const requestedView = params.get("view");
    const view: CampusView = requestedView === "3d" ? "3d" : requestedView === "satellite" ? "satellite" : "plan";
    const is3D = view === "3d";
    const aerial = view === "satellite";

    useEffect(() => {
        let active = true;
        loadCampus()
            .then(([data, manifest]) => { if (active) { setPlans(data); setBuildings(manifest.buildings); } })
            .catch(() => { if (active) setError("Les plans du campus ne sont pas disponibles pour le moment."); });
        loadCampusContext().then(([drawnPlans, osm, aerialTiles, residences, offMap]) => { if (active) { setDrawn(drawnPlans); setBasemap(osm); setAerialIndex(aerialTiles); setHousing(residences); setLocalPlans(offMap); } });
        // Without it the flats keep the neutral room colours.
        fetchPrivate("/users/me").then(user => { if (active) setIsAdmin(!!user?.is_admin); }).catch(() => {});
        loadBookmarks().then(list => { if (active) setBookmarks(list); }).catch(() => {});
        loadOccupancy().then(data => { if (active) setOccupancy(new globalThis.Map([...data.occupied.map(id => [id, "occupied"] as const), ...data.vacant.map(id => [id, "vacant"] as const)])); }).catch(() => {});
        return () => { active = false; };
    }, [retry]);

    // Historical drawings replace the Wemap rooms they cover; their room numbers are authoritative.
    const superseded = useMemo(() => new Set(drawn?.metadata.superseded || []), [drawn]);
    const drawnFeatures = useMemo(() => (drawn?.features || []).map(feature => ({ ...feature, properties: { ...feature.properties, source_feature_id: String(feature.id), selectable: feature.properties.kind === "room" } })) as PlanFeature[], [drawn]);
    // Residences without any placed floor (U6 is off campus) keep their drawings in plan
    // coordinates: same identifiers, panel and search, but drawn on a canvas instead of the map.
    const localFeatures = useMemo(() => [
        ...(localPlans?.buildings || []).map(item => ({ type: "Feature", id: `local:${item.code}`, geometry: { type: "Point", coordinates: [0, 0] }, properties: { source_feature_id: `local:${item.code}`, kind: "building", name: item.code, building_id: item.code, levels: [], selectable: true } })),
        ...(localPlans?.features || []).map(feature => ({ ...feature, geometry: feature.properties.plan_geometry, properties: { ...feature.properties, source_feature_id: String(feature.id), selectable: feature.properties.kind === "room" } })),
    ] as PlanFeature[], [localPlans]);
    const featureIndex = useMemo(() => new globalThis.Map([...(plans?.features || []), ...drawnFeatures, ...localFeatures].map(feature => [String(feature.id), feature])), [plans, drawnFeatures, localFeatures]);
    const drawnLevels = useMemo(() => {
        const levels = new globalThis.Map<string, number[]>();
        for (const plan of drawn?.metadata.plans || []) if (plan.building_id !== null && plan.level !== null) levels.set(String(plan.building_id), [...(levels.get(String(plan.building_id)) || []), plan.level]);
        return levels;
    }, [drawn]);

    const selected = featureIndex.get(params.get("feature") || "") || plans?.features.find(feature => params.get("room") && feature.properties.name === params.get("room") && feature.properties.kind === "room");
    const roomQuery = params.get("room");
    const featureQuery = params.get("feature");
    useEffect(() => {
        if (!roomQuery || featureQuery) return;
        let active = true;
        const select = (feature: string | null, building: string | number | null | undefined, levels: number[]) => {
            const next = new URLSearchParams(window.location.search);
            if (next.get("room") !== roomQuery) return;
            if (feature) next.set("feature", feature);
            next.delete("room");
            if (building !== null && building !== undefined) next.set("building", String(building));
            if (levels.length) next.set("level", String(levels[0]));
            window.history.replaceState(null, "", `${pathname}?${next}`);
        };
        const local = [...drawnFeatures, ...localFeatures].filter(feature => feature.properties.kind === "room" && text(feature.properties.name || "") === text(roomQuery));
        if (local.length === 1) { select(String(local[0].id), local[0].properties.building_id, local[0].properties.levels); return; }
        resolveCampusRoom(roomQuery).then(target => {
            if (active && (target.feature || target.building)) select(target.feature, target.building, target.level === null ? [] : [target.level]);
        }).catch(() => {});
        return () => { active = false; };
    }, [roomQuery, featureQuery, pathname, drawnFeatures, localFeatures]);

    const buildingQuery = params.get("building") || (selected?.properties.building_id ? String(selected.properties.building_id) : null);
    const offMap = localPlans?.buildings.find(item => item.code === buildingQuery?.toUpperCase());
    const building = useMemo(() => buildings.find(item => item.id === buildingQuery || item.name.toLowerCase() === buildingQuery?.toLowerCase() || (buildingQuery && item.residences?.some(residence => residence.code === buildingQuery.toUpperCase())))
        ?? (offMap ? { id: offMap.code, name: offMap.code, levels: offMap.floors.map(floor => floor.level), rooms: 0, residences: [{ code: offMap.code, laundry: offMap.laundry }] } : undefined), [buildings, buildingQuery, offMap]);
    const levels = useMemo(() => [...new Set([...(building?.levels || []), ...(building ? drawnLevels.get(building.id) || [] : [])])].sort((a, b) => a - b), [building, drawnLevels]);
    const requestedLevel = Number(params.get("level") ?? selected?.properties.levels[0] ?? 0);
    const level = levels.includes(requestedLevel) ? requestedLevel : levels.includes(0) ? 0 : levels[0] ?? 0;

    const selectedLocationId = selected?.properties.location_id;
    const context = contextResponse?.locationId === selectedLocationId ? contextResponse?.data : null;
    const loadingContext = !!selectedLocationId && contextResponse?.locationId !== selectedLocationId;
    const buildingId = building?.id;
    const drawnRoom = selected?.properties.source === "plan" ? selected.properties as unknown as DrawnRoom : null;

    const setQuery = (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(updates)) {
            if (value === null) next.delete(key); else next.set(key, value);
        }
        window.history.pushState(null, "", `${pathname}${next.size ? `?${next}` : ""}`);
    };
    const select = (feature: PlanFeature) => {
        const p = feature.properties;
        setSearch("");
        setCopied(false);
        setQuery({ feature: p.kind === "building" ? null : String(feature.id), room: null, building: p.building_id ? String(p.building_id) : null, level: String(p.levels.includes(level) ? level : p.levels[0] ?? level) });
    };
    const camera = (bounds: number[], options: { padding: number; maxZoom?: number; duration: number }) => {
        const map = mapRef.current;
        if (map && bounds.length >= 4) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { ...options, pitch: is3D ? PITCH_3D : 0, bearing: is3D ? map.getBearing() : 0 });
    };

    const selectedId = selected ? String(selected.id) : "";
    useEffect(() => {
        if (!loaded || !plans) return;
        const target = selected || (building?.feature_id ? featureIndex.get(building.feature_id) : undefined);
        const bounds = target?.bbox || (!building ? plans.metadata.sources[0]?.bounds : null);
        if (bounds) camera(bounds, { padding: 60, maxZoom: selected ? 20 : 19, duration: 500 });
        // Selecting a place or a building moves the camera; the view mode keeps it in place.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, plans, selectedId, building]);

    // Only a change of mode tilts the camera; the initial view already has the right pitch
    // and must not interrupt the first framing.
    const shownMode = useRef(is3D);
    useEffect(() => {
        const map = mapRef.current;
        if (!loaded || !map || shownMode.current === is3D) return;
        shownMode.current = is3D;
        const target = is3D ? immersiveTarget.current : null;
        immersiveTarget.current = null;
        map.easeTo(target ? { center: target as [number, number], ...IMMERSIVE, bearing: map.getBearing() || -20, duration: 900 } : { pitch: is3D ? PITCH_3D : 0, bearing: is3D ? (map.getBearing() || -20) : 0, duration: 600 });
    }, [is3D, loaded]);

    useEffect(() => {
        let active = true;
        if (!selectedLocationId) return;
        const controller = new AbortController();
        fetchPrivate(`/maps/indoor/locations/${selectedLocationId}`, { signal: controller.signal })
            .then(data => { if (active) setContextResponse({ locationId: selectedLocationId, data }); })
            .catch(() => { if (active) setContextResponse({ locationId: selectedLocationId, data: null }); });
        return () => { active = false; controller.abort(); };
    }, [selectedLocationId]);

    // Sources are created in any order (context data can arrive before or after the style and
    // the campus plans), and a late layer is added on top: whenever the style changes, put the
    // context layers back under the campus ones, in their declared order.
    useEffect(() => {
        const map = mapRef.current?.getMap();
        if (!loaded || !map) return;
        const context = ["osm-landuse", "osm-water", "osm-waterway", "aerial", "osm-road-casing", "osm-roads", "osm-paths", "osm-rail", "osm-buildings"];
        const order = () => {
            const ids = map.getStyle().layers.map(layer => layer.id);
            const grounds = ids.indexOf("grounds");
            if (grounds < 0 || !context.some(id => ids.indexOf(id) > grounds)) return;
            for (const id of context) if (map.getLayer(id)) map.moveLayer(id, "grounds");
        };
        order();
        map.on("styledata", order);
        return () => { map.off("styledata", order); };
    }, [loaded]);

    // The campus scan and the surrounding relief load the first time the 3D view needs them, then stay in the map.
    const showRelief = is3D;
    useEffect(() => {
        const map = mapRef.current?.getMap();
        if (!loaded || !map || !(showRelief || warm) || reliefLayer.current || reliefState !== "idle") return;
        setReliefState("loading");
        loadSurfaces().then(({ relief: index, scan }) => {
            if ((!index && !scan) || !mapRef.current) { setReliefState("missing"); return; }
            const center = map.getCenter();
            reliefLayer.current = createReliefLayer(index, scan, [center.lng, center.lat], tokenHeaders, LIFT);
            map.addLayer(reliefLayer.current, "campus-buildings-3d");
            // Hidden until the 3D view is shown, from the first frame.
            if (!shownMode.current) map.setLayoutProperty("relief", "visibility", "none");
            setReliefState("ready");
        });
    }, [loaded, showRelief, warm, reliefState]);
    useEffect(() => {
        const map = mapRef.current?.getMap();
        if (map && reliefLayer.current && map.getLayer("relief")) map.setLayoutProperty("relief", "visibility", showRelief ? "visible" : "none");
        reliefLayer.current?.setDimmed(!!building);
    }, [showRelief, building, reliefState]);
    useEffect(() => () => { reliefLayer.current = null; }, []);

    const destinations = useMemo(() => campusDestinations([...(plans?.features.filter(feature => !superseded.has(String(feature.id))) || []), ...drawnFeatures, ...localFeatures]), [plans, drawnFeatures, localFeatures, superseded]);
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
    const buildingHeights = useMemo(() => new globalThis.Map(buildings.map(item => [item.id, (Math.max(0, ...item.levels, ...(drawnLevels.get(item.id) || [])) + 1) * STOREY_M])), [buildings, drawnLevels]);

    const filtered = useMemo(() => [...(plans?.features || []), ...drawnFeatures].filter(feature => {
        const p = feature.properties;
        if (superseded.has(String(feature.id)) && String(feature.id) !== selectedId) return false;
        if (p.kind === "building") return true;
        if (buildingId && p.building_id && String(p.building_id) !== buildingId) return false;
        return !p.levels.length || p.levels.includes(level);
    }), [plans, drawnFeatures, superseded, selectedId, buildingId, level]);

    // Places on the map by location, for the people overlays: drawn plans win over Wemap.
    const locationIndex = useMemo(() => {
        const index = new globalThis.Map<string, PlanFeature>();
        for (const feature of [...(plans?.features || []), ...drawnFeatures]) if (feature.properties.location_id) index.set(feature.properties.location_id, feature);
        for (const feature of localFeatures) if (feature.properties.location_id && !index.has(feature.properties.location_id)) index.set(feature.properties.location_id, feature);
        return index;
    }, [plans, drawnFeatures, localFeatures]);
    const overlayData: FeatureCollection = useMemo(() => {
        // Off-map residences (U6) have no geographic position: they stay in the list only.
        const offMapIds = new Set(localFeatures.map(feature => String(feature.id)));
        const at = (id?: string) => { const feature = id ? locationIndex.get(id) : undefined; return feature && !offMapIds.has(String(feature.id)) ? placeCenter(feature) : null; };
        const hub = at(overlay?.hub);
        const homes = (overlay?.homes || []).flatMap(home => { const xy = at(home.location_id); return xy ? [{ home, xy }] : []; });
        return { type: "FeatureCollection", features: [
            ...(hub ? homes.filter(({ home }) => home.location_id !== overlay?.hub).map(({ xy }) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [hub, xy] } })) : []),
            ...homes.map(({ home, xy }) => ({ type: "Feature" as const, properties: { role: "home", count: home.people.length }, geometry: { type: "Point" as const, coordinates: xy } })),
            ...(hub ? [{ type: "Feature" as const, properties: { role: "hub" }, geometry: { type: "Point" as const, coordinates: hub } }] : []),
        ] };
    }, [overlay, locationIndex, localFeatures]);
    const pinData: FeatureCollection = useMemo(() => ({ type: "FeatureCollection", features: pins.flatMap(id => {
        const feature = featureIndex.get(id);
        const xy = feature && !localFeatures.includes(feature) ? placeCenter(feature) : null;
        return xy ? [{ type: "Feature" as const, properties: { id }, geometry: { type: "Point" as const, coordinates: xy } }] : [];
    }) }), [pins, featureIndex, localFeatures]);
    // Pins of this browser become bookmarks once the places they name are known.
    useEffect(() => {
        const legacy = readLegacyPins();
        if (!legacy.length || !featureIndex.size) return;
        try { localStorage.removeItem(LEGACY_PINS_KEY); } catch { /* moved again next visit */ }
        Promise.all(legacy.flatMap(id => { const feature = featureIndex.get(id); return feature ? [saveBookmark(bookmarkOf(feature))] : []; }))
            .then(() => loadBookmarks()).then(setBookmarks).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [featureIndex]);
    // The same people and bookmarks for the 3D layer: a room at mid-height of its floor, a building on its roof.
    useEffect(() => {
        const layer = reliefLayer.current;
        if (!layer) return;
        if (!(is3D && reliefState === "ready")) { layer.setMarkers([], []); return; }
        const offMapIds = new Set(localFeatures.map(feature => String(feature.id)));
        const marker = (feature: PlanFeature | undefined, role: SceneMarker["role"]): SceneMarker | null => {
            const xy = feature && !offMapIds.has(String(feature.id)) ? placeCenter(feature) : null;
            if (!feature || !xy) return null;
            const p = feature.properties;
            const height = p.kind === "building" ? buildingHeights.get(String(p.building_id)) ?? 6 : (p.levels[0] ?? 0) * STOREY_M + MARKER_ABOVE_FLOOR;
            return { lngLat: [xy[0], xy[1]], height, role };
        };
        const hub = overlay?.hub ? marker(locationIndex.get(overlay.hub), "hub") : null;
        const homes = (overlay?.homes || []).filter(home => home.location_id !== overlay?.hub).flatMap(home => { const point = marker(locationIndex.get(home.location_id), "home"); return point ? [point] : []; });
        const bookmarks = pins.flatMap(id => { const point = marker(featureIndex.get(id), "pin"); return point ? [point] : []; });
        const lines: SceneLine[] = hub ? homes.map(home => ({ from: hub, to: home })) : [];
        layer.setMarkers([...homes, ...bookmarks, ...(hub ? [hub] : [])], lines);
    }, [is3D, reliefState, overlay, pins, locationIndex, featureIndex, localFeatures, buildingHeights]);

    // This source changes only with the floor/building, never with hover, typing,
    // or a detail response. MapLibre keeps its worker-side index.
    const renderData: FeatureCollection<Geometry, Properties> = useMemo(() => ({
        type: "FeatureCollection",
        features: filtered.map(feature => ({ ...feature, properties: { ...feature.properties, actionable: destinationIds.has(String(feature.id)), occupancy: occupancy?.get(feature.properties.location_id || "") ?? null, height_m: buildingHeights.get(String(feature.properties.building_id)) ?? 6, base_m: level * STOREY_M } })),
    }), [filtered, destinationIds, occupancy, buildingHeights, level]);

    // OpenStreetMap buildings already drawn by Wemap are kept out of the 3D city.
    const context3D = useMemo(() => {
        if (!basemap || !plans) return null;
        const campus = plans.features.filter(feature => feature.properties.kind === "building");
        return { ...basemap, features: basemap.features.filter(feature => {
            if (feature.properties.kind !== "building") return false;
            const center = polygonCenter(feature.geometry);
            return center && !campus.some(item => inside(center, item.geometry));
        }) };
    }, [basemap, plans]);

    const roadLabels = useMemo(() => {
        const names = new globalThis.Map<string, Feature<Geometry, Record<string, string | number>>[]>();
        for (const feature of basemap?.features || []) {
            const p = feature.properties;
            if (p.kind === "road" && p.name && p.class !== "path" && feature.geometry.type === "LineString") names.set(String(p.name), [...(names.get(String(p.name)) || []), feature]);
        }
        return names;
    }, [basemap]);

    const visibleLabels = useMemo(() => {
        if (!labels || !viewport) return [];
        const within = (xy: Position) => xy[0] >= viewport.west && xy[0] <= viewport.east && xy[1] >= viewport.south && xy[1] <= viewport.north;
        const places = filtered.filter(feature => {
            const p = feature.properties;
            const xy = p.label_coordinates;
            // Floors float above the ground in 3D, so only ground-level names stay pinned there.
            const room = viewport.zoom >= 19 && destinationIds.has(String(feature.id)) && p.kind !== "building" && (!is3D || level <= 0);
            return xy && p.name && ((p.kind === "building" && viewport.zoom < 20) || room) && within(xy);
        }).map(feature => ({ id: String(feature.id), xy: feature.properties.label_coordinates!, name: feature.properties.name!, kind: feature.properties.kind === "building" ? "building" : "room", height: feature.properties.kind === "building" ? buildingHeights.get(String(feature.properties.building_id)) ?? 6 : 0 }));
        const roads = viewport.zoom < 16 ? [] : [...roadLabels].flatMap(([name, lines]) => {
            const center = [(viewport.west + viewport.east) / 2, (viewport.north + viewport.south) / 2];
            const points = lines.map(line => (line.geometry as { coordinates: Position[] }).coordinates).map(coordinates => coordinates[Math.floor(coordinates.length / 2)]).filter(within);
            const best = points.sort((a, b) => Math.hypot(a[0] - center[0], a[1] - center[1]) - Math.hypot(b[0] - center[0], b[1] - center[1]))[0];
            return best ? [{ id: `road:${name}`, xy: best, name, kind: "road", height: 0 }] : [];
        });
        const boxes: { x: number; y: number; width: number }[] = [];
        return [...places, ...roads].filter(label => {
            const x = (label.xy[0] - viewport.west) / (viewport.east - viewport.west) * viewport.width;
            const y = (viewport.north - label.xy[1]) / (viewport.north - viewport.south) * viewport.height;
            const width = Math.min(130, label.name.length * 6 + 10);
            if (is3D && label.kind !== "building") return false;
            if (boxes.some(box => Math.abs(box.x - x) < (box.width + width) / 2 + 4 && Math.abs(box.y - y) < 26)) return false;
            boxes.push({ x, y, width });
            return boxes.length <= 80;
        });
    }, [filtered, labels, viewport, destinationIds, roadLabels, is3D, level, buildingHeights]);
    // Labels are drawn on the ground plane: in 3D, building names are raised to the roof.
    const labelOffset = (label: { xy: Position; height: number }): [number, number] => {
        if (!is3D || !viewport || !label.height) return [0, 0];
        const pixelsPerMetre = 512 * 2 ** viewport.zoom / (EARTH_CIRCUMFERENCE * Math.cos(label.xy[1] * Math.PI / 180));
        return [0, -(lift + label.height) * pixelsPerMetre * Math.sin(viewport.pitch * Math.PI / 180)];
    };

    const updateViewport = () => {
        const map = mapRef.current;
        const bounds = map?.getBounds();
        if (map && bounds) setViewport({ west: bounds.getWest(), east: bounds.getEast(), north: bounds.getNorth(), south: bounds.getSouth(), zoom: map.getZoom(), pitch: map.getPitch(), width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight });
    };
    const focusBuilding = (id: string | null) => { setSearch(""); setSearchOpen(false); setQuery({ building: id, feature: null, room: null, level: null }); };
    const closePlace = () => setQuery({ feature: null, room: null });
    // Leaving a focus goes one step back: the place first, then the building.
    const unfocus = () => { if (selected && selected.properties.kind !== "building") closePlace(); else if (building) focusBuilding(null); else setOverlay(null); };
    const onClick = (event: MapLayerMouseEvent) => {
        const target = event.features?.[0];
        const feature = featureIndex.get(String(target?.properties?.source_feature_id));
        if (!target || !feature) { unfocus(); return; }
        if (feature.properties.kind === "building") { if (feature.properties.building_id) focusBuilding(String(feature.properties.building_id)); }
        else if (isCampusDestination(feature)) select(feature);
    };
    useEffect(() => {
        const escape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || (event.target as HTMLElement)?.closest?.("input")) return;
            if (bookmarksOpen) { setBookmarksOpen(false); return; }
            unfocus();
        };
        window.addEventListener("keydown", escape);
        return () => window.removeEventListener("keydown", escape);
    });
    const hover = (event?: MapLayerMouseEvent) => {
        const map = mapRef.current?.getMap();
        if (!map) return;
        if (hovered.current !== null) map.setFeatureState({ source: "campus", id: hovered.current }, { hover: false });
        hovered.current = event?.features?.[0]?.id ?? null;
        if (hovered.current !== null) map.setFeatureState({ source: "campus", id: hovered.current }, { hover: true });
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
        if (bounds) camera(bounds, { padding: 40, duration: 400 });
    };
    const changeView = (next: CampusView) => setQuery({ view: next === "plan" ? null : next });
    const bookmarkOf = (feature: PlanFeature) => ({
        feature_id: String(feature.id), name: feature.properties.name || String(feature.id),
        building_id: feature.properties.building_id === null || feature.properties.building_id === undefined ? null : String(feature.properties.building_id),
        level: feature.properties.levels[0] ?? null, location_id: feature.properties.location_id || null,
    });
    const toggleBookmark = async () => {
        if (!selected) return;
        const id = String(selected.id);
        const previous = bookmarks;
        // Shown at once, put back if the server refuses.
        if (pins.includes(id)) {
            setBookmarks(bookmarks.filter(bookmark => bookmark.feature_id !== id));
            try { await removeBookmark(id); } catch { setBookmarks(previous); }
        } else {
            const draft = { ...bookmarkOf(selected), created_at: new Date().toISOString() };
            setBookmarks([draft, ...bookmarks]);
            try { const saved = await saveBookmark(bookmarkOf(selected)); setBookmarks(list => list.map(bookmark => bookmark.feature_id === id ? saved : bookmark)); } catch { setBookmarks(previous); }
        }
    };
    const forgetBookmark = async (id: string) => {
        const previous = bookmarks;
        setBookmarks(bookmarks.filter(bookmark => bookmark.feature_id !== id));
        try { await removeBookmark(id); } catch { setBookmarks(previous); }
    };
    const openBookmark = (bookmark: PlaceBookmark) => {
        setBookmarksOpen(false);
        const feature = featureIndex.get(bookmark.feature_id);
        if (feature) select(feature);
        // A place no longer drawn: its building and floor still open.
        else setQuery({ feature: null, room: null, building: bookmark.building_id, level: bookmark.level === null ? null : String(bookmark.level) });
    };
    const tools: PlaceTools = {
        isAdmin,
        pinned: !!selected && pins.includes(String(selected.id)),
        onTogglePin: () => { void toggleBookmark(); },
        onImmersive: () => {
            const center = placeCenter(selected);
            const map = mapRef.current;
            if (!center || !map) return;
            if (is3D) map.easeTo({ center: center as [number, number], ...IMMERSIVE, bearing: map.getBearing() || -20, duration: 900 });
            else { immersiveTarget.current = center; changeView("3d"); }
        },
        // Same resolution as a shared `room` link: drawn plans, then the server's room correspondences.
        onGoToRoom: room => setQuery({ room, feature: null, building: null, level: null }),
        overlay,
        onOverlay: setOverlay,
        describe: id => {
            const feature = locationIndex.get(id);
            if (!feature) return null;
            const home = buildings.find(item => item.id === String(feature.properties.building_id));
            return [feature.properties.name, home?.name || (typeof feature.properties.building_id === "string" ? feature.properties.building_id : null)].filter(Boolean).join(" · ");
        },
        onSelectLocation: id => { const feature = locationIndex.get(id); if (feature) select(feature); },
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { setCopied(false); }
    };
    const transformRequest = (url: string) => url.includes("/api/private/") ? { url, headers: tokenHeaders() } : { url };
    const flat = is3D && reliefState === "ready" ? "none" : "visible";
    const lift = reliefState === "ready" ? LIFT : 0;
    // In 3D with the surfaces, people and bookmarks are drawn by the 3D layer at their floor's height.
    const markers3D = is3D && reliefState === "ready";
    const roomFilter: ExpressionSpecification = ["all", isPolygon, ["in", ["get", "kind"], ["literal", ["room", "corridor", "stairs", "elevator"]]]];
    const attribution = ["Wemap", basemap && !aerial && "© OpenStreetMap", (aerial || is3D) && "© IGN"].filter(Boolean).join(" · ");
    const panelOpen = !!building || (!!selected && selected.properties.kind !== "building");
    const buildingFeature = building?.feature_id ? featureIndex.get(building.feature_id) : undefined;
    const floorRooms = useMemo(() => buildingId ? destinations.filter(feature => String(feature.properties.building_id) === buildingId && feature.properties.kind !== "building" && feature.properties.levels.includes(level)) : [], [destinations, buildingId, level]);
    const showResults = searchOpen && (!!search.trim() || !buildingId);
    const offMapFloor = offMap?.floors.find(floor => floor.level === level);
    const offMapPlan = useMemo<FloorPlan | null>(() => offMapFloor ? {
        type: "FeatureCollection",
        metadata: { schema_version: 1, building: offMap!.code, floor: offMapFloor.floor, plan_coordinate_space: "local_plan", view_box: offMapFloor.view_box, georeferenced: false, room_count: 0, unresolved_rooms: [] },
        features: (localPlans?.features || []).filter(feature => feature.properties.building_id === offMap!.code && feature.properties.levels.includes(level))
            .map(feature => ({ type: "Feature", id: String(feature.id), geometry: null, properties: { kind: feature.properties.kind as "room" | "wall", building: offMap!.code, floor: offMapFloor.floor, plan_geometry: feature.properties.plan_geometry as Geometry, room_id: feature.properties.room_id as string | undefined, name: feature.properties.name, label_coordinates: feature.properties.label_coordinates } })),
    } : null, [offMap, offMapFloor, localPlans, level]);
    const offMapTones = useMemo(() => Object.fromEntries((localPlans?.features || []).flatMap(feature => {
        const state = occupancy?.get(feature.properties.location_id || "");
        return state && feature.properties.room_id ? [[feature.properties.room_id as string, OCCUPANCY_TONES[state]]] : [];
    })), [localPlans, occupancy]);

    if (error) return <div role="alert" className="border border-zinc-800 p-10 text-zinc-400"><p>{error}</p><button onClick={() => { setError(""); setLoaded(false); setRetry(value => value + 1); }} className="mt-4 border border-zinc-700 p-2 text-white">Réessayer</button></div>;

    return <div className="relative h-full w-full overflow-hidden bg-zinc-950 font-mono">
        <Map ref={mapRef} initialViewState={{ longitude: 2.44348, latitude: 48.62517, zoom: 17, pitch: is3D ? PITCH_3D : 0, bearing: is3D ? -20 : 0 }} mapStyle={style} style={{ width: "100%", height: "100%" }} aria-label="Carte interactive du campus"
            onLoad={() => { setLoaded(true); updateViewport(); }} onMoveEnd={updateViewport} onRotate={event => setBearing(event.viewState.bearing)}
            interactiveLayerIds={is3D ? ["rooms-3d", "campus-buildings-3d", "destination-points"] : ["destinations", "destination-points", "buildings"]}
            onMouseMove={hover} onMouseLeave={() => hover()} onClick={onClick}
            onError={event => { console.error("Carte du campus :", event.error); setError("Le rendu de la carte a échoué. Vérifiez que WebGL est disponible dans votre navigateur."); }}
            transformRequest={transformRequest} maxZoom={23} minZoom={13} maxPitch={75} dragRotate={is3D} touchPitch={is3D} pitchWithRotate={is3D} attributionControl={false}>
            <Source id="campus" type="geojson" data={renderData} promoteId="source_feature_id">
                <Layer id="grounds" type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "structure"]]} layout={{ visibility: aerial ? "none" : flat }} paint={{ "fill-color": ["case", ["has", "landuse"], "#12281d", ["has", "leisure"], "#1b263b", "#17202a"], "fill-opacity": 0.65, "fill-outline-color": "#334155" }} />
                <Layer id="buildings" type="fill" filter={["==", ["get", "kind"], "building"]} layout={{ visibility: flat }} paint={{ "fill-color": "#27272a", "fill-opacity": aerial ? 0.25 : 0.8, "fill-outline-color": aerial ? "#e4e4e7" : "#71717a" }} />
                <Layer id="active-building" type="line" filter={["all", ["==", ["get", "kind"], "building"], ["==", ["to-string", ["get", "building_id"]], buildingId || ""]]} paint={{ "line-color": "#a78bfa", "line-width": 2 }} />
                <Layer id="floors" minzoom={17.8} type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "floor"]]} layout={{ visibility: flat }} paint={{ "fill-color": "#18181b", "fill-opacity": 0.9 }} />
                <Layer id="circulation" minzoom={17.8} type="fill" filter={["all", isPolygon, ["in", ["get", "kind"], ["literal", ["corridor", "stairs", "elevator"]]]]} layout={{ visibility: flat }} paint={{ "fill-color": "#475569", "fill-opacity": 0.5, "fill-outline-color": "#64748b" }} />
                <Layer id="rooms" minzoom={17.8} type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "room"]]} layout={{ visibility: flat }} paint={{ "fill-color": ["match", ["get", "occupancy"], "occupied", OCCUPANCY_TONES.occupied.fill, "vacant", OCCUPANCY_TONES.vacant.fill, ["case", ["==", ["get", "actionable"], true], "#164e63", "#27272a"]], "fill-opacity": 0.8, "fill-outline-color": ["match", ["get", "occupancy"], "occupied", OCCUPANCY_TONES.occupied.stroke, "vacant", OCCUPANCY_TONES.vacant.stroke, ["case", ["==", ["get", "actionable"], true], "#38bdf8", "#52525b"]] }} />
                <Layer id="lines" minzoom={18} type="line" filter={["all", ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]], ["!=", ["get", "kind"], "wall"]]} layout={{ visibility: flat }} paint={{ "line-color": "#64748b", "line-width": 1 }} />
                <Layer id="walls" minzoom={18} type="line" filter={["==", ["get", "kind"], "wall"]} layout={{ visibility: flat }} paint={{ "line-color": "#a1a1aa", "line-width": ["interpolate", ["linear"], ["zoom"], 18, 0.6, 21, 2] }} />
                <Layer id="points" minzoom={18} type="circle" filter={["==", ["geometry-type"], "Point"]} layout={{ visibility: flat }} paint={{ "circle-color": "#fbbf24", "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 1, 21, 3], "circle-opacity": 0.65 }} />
                <Layer id="destination-buildings" type="fill" filter={["all", isPolygon, ["==", ["get", "kind"], "building"], ["==", ["get", "actionable"], true]]} layout={{ visibility: flat }} paint={{ "fill-color": "#67e8f9", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.2, 0] }} />
                <Layer id="destinations" minzoom={17.8} type="fill" filter={["all", isPolygon, ["!=", ["get", "kind"], "building"], ["==", ["get", "actionable"], true]]} layout={{ visibility: flat }} paint={{ "fill-color": "#67e8f9", "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.25, 0] }} />
                <Layer id="destination-points" minzoom={18} type="circle" filter={["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "actionable"], true]]} layout={{ visibility: flat }} paint={{ "circle-radius": 7, "circle-color": "#67e8f9", "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.5, 0] }} />
                <Layer id="selected-room" type="line" filter={["==", ["get", "source_feature_id"], selectedId]} layout={{ visibility: flat }} paint={{ "line-color": "#fbbf24", "line-width": 3 }} />
                <Layer id="campus-buildings-3d" type="fill-extrusion" filter={["all", isPolygon, ["==", ["get", "kind"], "building"], ["!=", ["to-string", ["get", "building_id"]], buildingId || ""]]} layout={{ visibility: is3D ? "visible" : "none" }} paint={{ "fill-extrusion-color": ["case", ["boolean", ["feature-state", "hover"], false], "#7c6fb0", "#3f3f46"], "fill-extrusion-base": lift, "fill-extrusion-height": ["+", lift, ["get", "height_m"]], "fill-extrusion-opacity": showRelief && reliefState === "ready" ? 0.01 : 0.9 }} />
                <Layer id="building-shell-3d" type="fill-extrusion" filter={["all", isPolygon, ["==", ["get", "kind"], "building"], ["==", ["to-string", ["get", "building_id"]], buildingId || ""]]} layout={{ visibility: is3D && building ? "visible" : "none" }} paint={{ "fill-extrusion-color": "#a78bfa", "fill-extrusion-base": lift, "fill-extrusion-height": ["max", lift, ["+", lift, ["get", "base_m"]]], "fill-extrusion-opacity": 0.25 }} />
                <Layer id="rooms-3d" type="fill-extrusion" filter={roomFilter} layout={{ visibility: is3D && building ? "visible" : "none" }} paint={{ "fill-extrusion-color": ["case", ["==", ["get", "source_feature_id"], selectedId], "#fbbf24", ["boolean", ["feature-state", "hover"], false], "#67e8f9", ["==", ["get", "occupancy"], "occupied"], OCCUPANCY_TONES.occupied.fill, ["==", ["get", "occupancy"], "vacant"], OCCUPANCY_TONES.vacant.fill, ["==", ["get", "kind"], "room"], ["case", ["==", ["get", "actionable"], true], "#0e7490", "#3f3f46"], "#52525b"], "fill-extrusion-base": ["max", 0, ["+", lift, ["get", "base_m"]]], "fill-extrusion-height": ["max", 0, ["+", lift, ["get", "base_m"], ["case", ["==", ["get", "kind"], "room"], 2.6, 0.4]]], "fill-extrusion-opacity": 0.88 }} />
            </Source>
            {basemap && <Source id="basemap" type="geojson" data={basemap}>
                <Layer id="osm-landuse" type="fill" filter={["in", ["get", "kind"], ["literal", ["landuse", "vegetation", "leisure", "parking", "pedestrian_area"]]]} layout={{ visibility: aerial ? "none" : flat }} paint={{ "fill-color": ["match", ["get", "kind"], "vegetation", "#0f1f17", "leisure", "#112419", "parking", "#16161a", "pedestrian_area", "#1a1a1e", "#121214"], "fill-opacity": 0.9 }} />
                <Layer id="osm-water" type="fill" filter={["==", ["get", "kind"], "water"]} layout={{ visibility: aerial ? "none" : flat }} paint={{ "fill-color": "#0c1b2c" }} />
                <Layer id="osm-waterway" type="line" filter={["==", ["get", "kind"], "waterway"]} layout={{ visibility: aerial ? "none" : flat }} paint={{ "line-color": "#13314f", "line-width": 2 }} />
            </Source>}
            {aerialIndex && <Source id="aerial" type="raster" tiles={[`${typeof window === "undefined" ? "" : window.location.origin}/api/private/maps/indoor/aerial/{z}/{x}/{y}.jpg`]} tileSize={256} minzoom={aerialIndex.minzoom} maxzoom={aerialIndex.maxzoom} bounds={aerialIndex.bounds}>
                <Layer id="aerial" type="raster" layout={{ visibility: aerial ? flat : "none" }} paint={{ "raster-opacity": 0.92, "raster-saturation": -0.25, "raster-brightness-max": 0.85 }} />
            </Source>}
            {basemap && <Source id="basemap-lines" type="geojson" data={basemap}>
                <Layer id="osm-road-casing" type="line" minzoom={14} filter={["all", ["==", ["get", "kind"], "road"], ["!=", ["get", "class"], "path"]]} layout={{ visibility: aerial ? "none" : flat, "line-cap": "round", "line-join": "round" }} paint={{ "line-color": "#09090b", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, ["match", ["get", "class"], "major", 4, "secondary", 3, 1.5], 20, ["match", ["get", "class"], "major", 40, "secondary", 30, "minor", 20, 12]] }} />
                <Layer id="osm-roads" type="line" filter={["all", ["==", ["get", "kind"], "road"], ["!=", ["get", "class"], "path"]]} layout={{ visibility: aerial ? "none" : flat, "line-cap": "round", "line-join": "round" }} paint={{ "line-color": ["match", ["get", "class"], "major", "#52525b", "secondary", "#3f3f46", "#2e2e33"], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, ["match", ["get", "class"], "major", 2.5, "secondary", 1.8, 0.8], 20, ["match", ["get", "class"], "major", 36, "secondary", 26, "minor", 17, 10]] }} />
                <Layer id="osm-paths" type="line" minzoom={15} filter={["all", ["==", ["get", "kind"], "road"], ["==", ["get", "class"], "path"]]} layout={{ visibility: flat }} paint={{ "line-color": aerial ? "#e4e4e7" : "#3f3f46", "line-opacity": aerial ? 0.35 : 1, "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.6, 20, 2.5], "line-dasharray": [2, 1.5] }} />
                <Layer id="osm-rail" type="line" filter={["==", ["get", "kind"], "railway"]} layout={{ visibility: aerial ? "none" : flat }} paint={{ "line-color": "#52525b", "line-width": 1.5, "line-dasharray": [3, 2] }} />
                <Layer id="osm-buildings" type="fill" filter={["==", ["get", "kind"], "building"]} layout={{ visibility: aerial || is3D ? "none" : "visible" }} paint={{ "fill-color": "#1c1c20", "fill-outline-color": "#3f3f46" }} />
            </Source>}
            <Source id="overlay" type="geojson" data={overlayData}>
                <Layer id="overlay-lines" type="line" filter={["==", ["geometry-type"], "LineString"]} layout={{ visibility: markers3D ? "none" : "visible" }} paint={{ "line-color": "#a78bfa", "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [2, 1] }} />
                <Layer id="overlay-homes" type="circle" filter={["==", ["get", "role"], "home"]} layout={{ visibility: markers3D ? "none" : "visible" }} paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 4, 20, 8], "circle-color": "#a78bfa", "circle-opacity": 0.85, "circle-stroke-color": "#f4f4f5", "circle-stroke-width": 1.5 }} />
                <Layer id="overlay-hub" type="circle" filter={["==", ["get", "role"], "hub"]} layout={{ visibility: markers3D ? "none" : "visible" }} paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 6, 20, 11], "circle-color": "#09090b", "circle-stroke-color": "#a78bfa", "circle-stroke-width": 3 }} />
            </Source>
            <Source id="pins" type="geojson" data={pinData}>
                <Layer id="pins" type="circle" layout={{ visibility: markers3D ? "none" : "visible" }} paint={{ "circle-radius": 6, "circle-color": "#fbbf24", "circle-stroke-color": "#09090b", "circle-stroke-width": 2 }} />
            </Source>
            {context3D && <Source id="city-3d" type="geojson" data={context3D}>
                <Layer id="osm-buildings-3d" type="fill-extrusion" layout={{ visibility: is3D && !(showRelief && reliefState === "ready") ? "visible" : "none" }} paint={{ "fill-extrusion-color": "#27272a", "fill-extrusion-height": ["case", ["has", "height"], ["to-number", ["get", "height"], 8], ["has", "building_levels"], ["*", ["to-number", ["get", "building_levels"], 2], STOREY_M], 8], "fill-extrusion-opacity": 0.85 }} />
            </Source>}
            {visibleLabels.map(label => <Marker key={label.id} ref={marker => { if (marker) { const element = marker.getElement(); element.setAttribute("aria-hidden", "true"); element.setAttribute("role", "presentation"); element.tabIndex = -1; } }} style={{ pointerEvents: "none" }} longitude={label.xy[0]} latitude={label.xy[1]} offset={labelOffset(label)}><span className={`pointer-events-none block max-w-32 text-center text-[10px] leading-tight ${label.kind === "building" ? "bg-zinc-950/90 p-1 font-bold text-white" : label.kind === "road" ? "bg-zinc-950/70 px-1 italic text-zinc-400" : "bg-zinc-950/80 px-1 text-sky-100"}`}>{label.name}</span></Marker>)}
        </Map>
        {offMap && <div className="absolute inset-0 z-[5] bg-zinc-950 max-sm:bottom-[38%] sm:left-[380px]">
            <FloorPlanCanvas plan={offMapPlan} tones={offMapTones} selectedRoom={selected?.properties.room_id as string | undefined} className="h-full" controlsClassName="left-3 top-3 max-sm:top-[68px]"
                onSelectRoom={id => { const room = localFeatures.find(feature => feature.properties.building_id === offMap.code && feature.properties.room_id === id && feature.properties.levels.includes(level)); if (room) select(room); }} />
            <p className="pointer-events-none absolute bottom-3 right-3 bg-zinc-950/90 px-2 py-1 text-[10px] text-zinc-500 max-sm:hidden">Résidence hors campus · plan non géolocalisé</p>
        </div>}
        <div ref={hoverLabel} hidden className="pointer-events-none absolute left-0 top-0 z-30 max-w-40 rounded-none border border-zinc-800 bg-zinc-950/95 px-2.5 py-1.5 text-xs text-white shadow-xl" />
        {panelOpen && <PanelSheet>
            <CampusPanel building={building} buildingFeature={buildingFeature} level={level} levelCount={levels.length} rooms={floorRooms} occupancy={occupancy} selected={selected} context={context ?? null} loadingContext={loadingContext} drawnRoom={drawnRoom} housing={housing} copied={copied} tools={tools}
                onSelect={select} onCloseBuilding={() => focusBuilding(null)} onClosePlace={closePlace} onCopy={copyLink} />
        </PanelSheet>}
        <div className="absolute left-3 top-3 z-30 flex w-[min(352px,calc(100%-24px))] items-start gap-1.5 sm:left-3.5 sm:top-4">
            <div className="relative min-w-0 flex-1 rounded-none border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur-xl">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                <input value={search} onChange={event => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => { setSearchOpen(true); setBookmarksOpen(false); }} onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                    onKeyDown={event => { if (event.key === "Escape") { setSearch(""); event.currentTarget.blur(); } if (event.key === "Enter" && searchResults.length === 1) select(searchResults[0]); }}
                    role="combobox" placeholder={building ? `Rechercher dans ${building.name}…` : "Un bâtiment, une salle…"} aria-label="Rechercher dans les plans" aria-expanded={showResults} aria-controls="campus-search-results"
                    className="h-11 w-full rounded-none bg-transparent pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-campus-400" />
                {search && <button title="Effacer" aria-label="Effacer la recherche" onClick={() => setSearch("")} className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>}
                {showResults && <div id="campus-search-results" className="max-h-[50dvh] overflow-y-auto border-t border-zinc-800/60 p-1.5">
                    {searchResults.map(feature => {
                        const isBuilding = feature.properties.kind === "building";
                        const Icon = isBuilding ? Building2 : MapPin;
                        return <button key={String(feature.id)} onMouseDown={event => event.preventDefault()} onClick={() => isBuilding && feature.properties.building_id ? focusBuilding(String(feature.properties.building_id)) : select(feature)} className="flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-900">
                            <Icon className="h-4 w-4 shrink-0 text-campus-400" /><span className="min-w-0 flex-1 truncate">{feature.properties.name}</span><span className="shrink-0 text-[10px] text-zinc-500">{isBuilding ? "Bâtiment" : feature.properties.levels.map(levelLabel).join(" · ")}</span><ArrowRight className="h-3 w-3 text-zinc-600" />
                        </button>;
                    })}
                    {!searchResults.length && <p className="px-3 py-4 text-xs text-zinc-500">Aucun résultat</p>}
                </div>}
            </div>
            {/* Bookmarks: always one press away, next to the search. */}
            <button onClick={() => { setBookmarksOpen(!bookmarksOpen); setSearchOpen(false); }} title="Signets" aria-label={`Signets (${bookmarks.length})`} aria-expanded={bookmarksOpen} aria-controls="campus-bookmarks"
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center border bg-zinc-950/95 shadow-xl backdrop-blur-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-campus-400 ${bookmarksOpen ? "border-campus-500/60 text-campus-300" : "border-zinc-800 text-timetable-400 hover:text-white"}`}>
                <Bookmark className="h-4 w-4" />
                {!!bookmarks.length && <span className="absolute -right-1 -top-1 min-w-4 bg-timetable-400 px-1 font-mono text-[9px] font-bold leading-4 text-zinc-950">{bookmarks.length}</span>}
            </button>
            {bookmarksOpen && <div id="campus-bookmarks" className="absolute inset-x-0 top-full mt-1.5 max-h-[50dvh] overflow-y-auto border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur-xl">
                <p className="px-3 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Signets</p>
                {bookmarks.map(bookmark => {
                    const home = buildings.find(item => item.id === bookmark.building_id);
                    const where = [home?.name || bookmark.building_id, bookmark.level === null ? null : floorName(bookmark.level)].filter(Boolean).join(" · ");
                    return <div key={bookmark.feature_id} className="flex items-center hover:bg-zinc-900">
                        <button onClick={() => openBookmark(bookmark)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-300">
                            <Bookmark className="h-4 w-4 shrink-0 text-timetable-400" /><span className="min-w-0 flex-1 truncate">{bookmark.name}</span><span className="shrink-0 font-mono text-[10px] text-zinc-500">{where}</span>
                        </button>
                        <button onClick={() => void forgetBookmark(bookmark.feature_id)} title="Retirer le signet" aria-label={`Retirer le signet ${bookmark.name}`} className="p-2.5 text-zinc-500 hover:text-comms-400"><BookmarkX className="h-4 w-4" /></button>
                    </div>;
                })}
                {!bookmarks.length && <p className="px-3 py-3 text-xs text-zinc-500">Aucun signet. Ajoutez un lieu depuis sa fiche avec « Signet ».</p>}
            </div>}
        </div>
        {building && levels.length > 0 && <nav aria-label="Étages" className="absolute right-3 top-1/2 z-10 flex max-h-[calc(100%-300px)] -translate-y-1/2 max-sm:top-[24%] max-sm:max-h-[30%] flex-col gap-1 overflow-y-auto rounded-none border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur-xl sm:right-5 sm:top-[42%]">
            <Layers className="mx-auto my-1 h-3.5 w-3.5 shrink-0 text-zinc-600" />
            {[...levels].reverse().map(value => <button key={value} title={floorName(value)} aria-label={floorName(value)} aria-pressed={level === value} onClick={() => setQuery({ level: String(value), feature: null, room: null })} className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-none px-2 text-xs font-semibold transition-colors ${level === value ? "border border-campus-500/60 bg-campus-500/15 text-campus-300" : "text-zinc-500 hover:bg-zinc-900 hover:text-white"}`}>{levelLabel(value)}</button>)}
        </nav>}
        {!offMap && <><div className="absolute bottom-8 right-3 z-10 sm:right-5">
            <NavigationControls bearing={bearing} pitched={is3D} labels={labels} onLabels={() => setLabels(!labels)} onOverview={resetView}
                onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()} onNorth={() => mapRef.current?.resetNorth()} />
        </div>
        <div className={`absolute bottom-4 z-20 -translate-x-1/2 ${panelOpen ? "left-1/2 max-sm:hidden sm:left-[calc(50%+190px)]" : "left-1/2"}`}>
            <ViewSwitch view={view} onChange={changeView} onPrepare={value => { if (value === "3d") setWarm(true); }} available={{ plan: true, satellite: !!aerialIndex, "3d": true }} />
        </div></>}
        {!plans && <span className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 bg-zinc-950/90 px-3 py-1.5 text-[11px] text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement des plans…</span>}
        {is3D && reliefState === "loading" && <span className="absolute bottom-16 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 bg-zinc-950/90 px-3 py-1.5 text-[11px] text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement de la 3D…</span>}
        {is3D && reliefState === "missing" && <span className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 bg-zinc-950/90 px-3 py-1.5 text-[11px] text-zinc-400">Photogrammétrie et relief indisponibles : bâtiments extrudés à partir des plans.</span>}
        {!offMap && plans && <span title={`Wemap · ${new Date(plans.metadata.extracted_at).toLocaleDateString("fr-FR")}`} className="pointer-events-none absolute bottom-1 right-3 z-10 text-[9px] text-zinc-600 sm:right-5">{attribution}</span>}
    </div>;
}
