import type { Geometry } from 'geojson';
export type PlanFeature = {
    type: 'Feature';
    id: string;
    geometry: Geometry | null;
    properties: {
        // floor: the storey slab; corridor…space: unnumbered areas (plan-spaces.json).
        kind: 'wall' | 'room' | 'floor' | 'corridor' | 'stairs' | 'elevator' | 'space';
        building: string;
        floor: string;
        plan_geometry: Geometry;
        room_id?: string;
        space_id?: string;
        name?: string;
        label_coordinates?: number[];
        extraction?: string;
    };
};
export type FloorPlan = {
    type: 'FeatureCollection';
    metadata: {
        schema_version: number;
        building: string;
        floor: string;
        plan_coordinate_space: 'local_plan';
        view_box: number[];
        georeferenced: boolean;
        room_count: number;
        unresolved_rooms: string[];
    };
    features: PlanFeature[];
};
export function planGeometry(feature: PlanFeature) { return feature.properties.plan_geometry; }
export const PLAN_SPACE_KINDS: ReadonlySet<string> = new Set(['corridor', 'stairs', 'elevator', 'space']);
export function polygonRings(geometry: Geometry): number[][][][] {
    return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
}
export function planLines(geometry: Geometry): number[][][] {
    if (geometry.type === 'LineString')
        return [geometry.coordinates];
    if (geometry.type === 'MultiLineString')
        return geometry.coordinates;
    return polygonRings(geometry).flat();
}
export async function readFloorPlan(response: Response): Promise<FloorPlan> {
    if (!response.ok)
        throw new Error('Le plan est indisponible.');
    const plan = await response.json();
    if (plan.type !== 'FeatureCollection' || plan.metadata?.plan_coordinate_space !== 'local_plan' || !Array.isArray(plan.features))
        throw new Error('Format de plan invalide.');
    return plan;
}
