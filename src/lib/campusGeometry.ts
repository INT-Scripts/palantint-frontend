import type { Position } from "geojson";

export type Point2 = [number, number];
export type Registration = { origin: Point2; a: number; b: number; tx: number; tz: number; scale: number; altitude: number; anchors: number; error: number };
export function projectMeters(position: Position, origin: Point2): Point2 {
    const radians = Math.PI / 180;
    return [(position[0] - origin[0]) * radians * 6378137 * Math.cos(origin[1] * radians), -(position[1] - origin[1]) * radians * 6378137];
}
export function toScene(position: Position, registration: Registration): Point2 {
    const [x, z] = projectMeters(position, registration.origin);
    return [registration.a * x - registration.b * z + registration.tx, registration.b * x + registration.a * z + registration.tz];
}
