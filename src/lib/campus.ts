import type { Feature, FeatureCollection, Geometry } from "geojson";

export type PlaceProperties = {
    source_feature_id: string;
    name?: string;
    kind: string;
    selectable?: boolean;
    levels: number[];
    building_id?: number;
    location_id?: string;
    label_coordinates?: [number, number];
    geometry_area_m2?: number;
    description?: string;
    tag_names?: string[];
    address?: string;
    access?: string;
    opening_hours?: string;
    wheelchair?: string;
    category_name?: string;
    [key: string]: unknown;
};
export type Place = Feature<Geometry, PlaceProperties>;
export type CampusPlans = FeatureCollection<Geometry, PlaceProperties> & { metadata: { extracted_at: string; kinds: Record<string, number>; sources: { bounds: [number, number, number, number] }[] } };
export type CampusBuilding = { id: string; name: string; levels: number[]; rooms: number; residences?: {code:string;laundry:boolean}[]; feature_id?: string };
export const normalizePlace = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const floorName = (level: number) => level === 0 ? "Rez-de-chaussée" : level < 0 ? `Sous-sol ${Math.abs(level)}` : `Étage ${level}`;

// Destination identity and deduplication come from the private map API.
export function isCampusDestination(feature: Place) {
    return feature.properties.selectable === true;
}
export type PlaceCategory = "all" | "teaching" | "housing" | "services";
export function placeCategory(feature: Place): PlaceCategory {
    return ["housing", "teaching", "services"].includes(String(feature.properties.category)) ? feature.properties.category as PlaceCategory : "services";
}
export function campusHref(context: { feature?: string; building?: string; level?: number; room?: string }) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(context)) if (value !== undefined) params.set(key, String(value));
    return `/palantint/campus${params.size ? `?${params}` : ""}`;
}

export function campusDestinations(features: Place[]) {
    return features.filter(isCampusDestination);
}
