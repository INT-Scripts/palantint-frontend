import { Building2 } from "lucide-react";
import type { Place } from "@/lib/campus";

/** Silhouette of a building's footprint, used to recognise it at a glance. */
export default function BuildingOutline({ feature, className = "h-12 w-12" }: { feature?: Place; className?: string }) {
    if (!feature || !feature.bbox) return <Building2 className={className} />;
    const [west, south, east, north] = feature.bbox;
    const scale = 52 / Math.max(east - west, (north - south) * 1.5);
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
    return <svg viewBox="0 0 64 64" className={className} aria-hidden="true"><g transform={`translate(${32 - (east - west) * scale / 2}, ${32 - (north - south) * scale * 1.5 / 2})`}><path d={polygons.flatMap(polygon => polygon.map(ring => ring.map(([x, y], index) => `${index ? "L" : "M"}${(x - west) * scale},${(north - y) * scale * 1.5}`).join(" ") + "Z")).join(" ")} fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" fillRule="evenodd" /></g></svg>;
}
