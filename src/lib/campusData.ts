import { fetchPrivate } from "./api";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { CampusPlans, CampusBuilding, PlaceProperties } from "./campus";

type Match = { feature_id: string; building_id: number | null; levels: number[] };
let session: string | null = null;
const requests = new Map<string, { expires: number; value: Promise<unknown> }>();

// Keep only map reference data in memory, scoped to the current login. Occupants,
// memberships and room schedules are intentionally fetched fresh for each selection.
function referenceRequest<T>(endpoint: string): Promise<T> {
    const token = localStorage.getItem("palantint_token");
    if (token !== session) { requests.clear(); session = token; }
    const existing = requests.get(endpoint);
    if (existing && existing.expires > Date.now()) return existing.value as Promise<T>;
    if (requests.size >= 128) requests.delete(requests.keys().next().value!);
    const value = fetchPrivate(endpoint).catch(error => {
        if (requests.get(endpoint)?.value === value) requests.delete(endpoint);
        throw error;
    });
    requests.set(endpoint, { expires: Date.now() + 120_000, value });
    return value;
}
export const loadCampus = () => Promise.all([
    referenceRequest<CampusPlans>("/maps/indoor/geojson?compact=true"),
    referenceRequest<{ buildings: CampusBuilding[] }>("/maps/indoor/manifest"),
]);
export const lookupCampusRoom = (room: string) => referenceRequest<Match[]>(`/maps/indoor/lookup?q=${encodeURIComponent(room)}`);
// Drawn plan rooms first, then Wemap, then at least the building of a known residence.
export const resolveCampusRoom = (room: string) => referenceRequest<{ building: string | null; level: number | null; feature: string | null }>(`/maps/indoor/legacy?room=${encodeURIComponent(room)}`);

export type DrawnPlans = FeatureCollection<Geometry, PlaceProperties> & { metadata: { superseded: string[]; plans: { plan: string; building: string; floor: string; level: number | null; building_id: number | null; method: string; rms_m?: number }[] } };
export type AerialIndex = { attribution: string; minzoom: number; maxzoom: number; bounds: [number, number, number, number] };
export type BasemapData = FeatureCollection<Geometry, Record<string, string | number>> & { metadata: { attribution: string } };
// Residences without any placed floor (U6 is off campus): drawings in plan coordinates,
// features carry `plan_geometry` and no geographic geometry.
export type LocalPlans = { buildings: { code: string; laundry: boolean; floors: { plan: string; floor: string; level: number; view_box: number[] }[] }[]; features: (Omit<Feature<Geometry, PlaceProperties>, "geometry"> & { geometry: null })[] };
export type RentRange = { min: number; max: number } | null;
export type ResidenceSummary = { apartments: number; occupied: number; rent: RentRange; types: { type: string; count: number; rent: RentRange }[] };

// Optional context layers: the map stays usable when a collection has not run yet.
const optional = <T,>(endpoint: string) => referenceRequest<T>(endpoint).catch(() => null);
export const loadCampusContext = () => Promise.all([
    optional<DrawnPlans>("/maps/indoor/plans"),
    optional<BasemapData>("/maps/indoor/basemap"),
    optional<AerialIndex>("/maps/indoor/aerial"),
    optional<Record<string, ResidenceSummary>>("/maps/indoor/housing"),
    optional<LocalPlans>("/maps/indoor/local-plans"),
]);
// Flats by location: occupied ones have a current resident. Fetched fresh, like occupants.
export type Occupancy = { occupied: string[]; vacant: string[] };
export const loadOccupancy = () => fetchPrivate("/maps/indoor/occupancy") as Promise<Occupancy>;
export type ReliefTile = { z: number; x: number; y: number; lod: "detail" | "context"; path: string; bounds: [number, number, number, number] };
export type ReliefIndex = { attribution: string; tiles: ReliefTile[] };
export type ScanRegistration = { origin: [number, number]; a: number; b: number; tx: number; tz: number; scale: number; altitude: number; anchors: number; error: number };
// The campus scan is placed by the server registration; without it only the IGN relief is shown.
export const loadSurfaces = async () => {
    const [relief, tiles, alignment] = await Promise.all([
        optional<ReliefIndex>("/maps/indoor/relief"),
        optional<{ tiles: string[] }>("/maps/3d-tiles"),
        optional<{ registration: ScanRegistration | null }>("/maps/indoor/registration"),
    ]);
    const urls = (tiles?.tiles || []).filter(url => url.endsWith(".gltf"));
    return { relief: relief?.tiles.length ? relief : null, scan: urls.length && alignment?.registration ? { urls, registration: alignment.registration } : null };
};
