import { fetchPrivate } from "./api";
import type { CampusPlans, CampusBuilding } from "./campus";

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
