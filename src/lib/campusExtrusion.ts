import * as THREE from "three";

/** Local x/z polygons, retaining MultiPolygon parts and every interior ring. */
export function extrudePolygons(polygons: [number, number][][][], height: number) {
    const shapes = polygons.filter(rings => rings[0]?.length >= 3).map(rings => {
        const contours = rings.map(ring => ring.map(([x, z]) => new THREE.Vector2(x, -z)));
        const shape = new THREE.Shape(contours[0]);
        shape.holes = contours.slice(1).map(ring => new THREE.Path(ring));
        return shape;
    });
    if (!shapes.length) return null;
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: height, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
}
