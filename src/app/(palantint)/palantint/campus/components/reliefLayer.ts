import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map as MapLibreMap } from "maplibre-gl";
import type { ReliefIndex, ReliefTile, ScanRegistration } from "@/lib/campusData";

// EPSG:3857 metres per MapLibre mercator unit.
const CIRCUMFERENCE = 2 * Math.PI * 6378137;
// The calibrated scan scene places its tiles under this group offset (admin calibration frame).
const SCAN_OFFSET = new THREE.Vector3(-150, 0, -150);
// Extent of the scan coverage mask around the scan origin, in EPSG:3857 metres.
const MASK_EXTENT = 1600;
const MASK_PIXELS = 1024;
// The scan has ragged outer borders: the relief is kept this far inside them (metres) so it
// overlaps the scan edge rather than leaving gaps. Seams between scan tiles stay masked.
const EDGE_OVERLAP = 10;

export type CampusScan = { urls: string[]; registration: ScanRegistration };

/** Scan scene (x right, y up, z towards the viewer) → layer scene (EPSG:3857 metres east/south, metres up). */
function scanMatrix(registration: ScanRegistration, anchor: MercatorCoordinate) {
    const { a, b, tx, tz, scale, altitude } = registration;
    const origin = MercatorCoordinate.fromLngLat(registration.origin, 0);
    const ox = (origin.x - anchor.x) * CIRCUMFERENCE;
    const oz = (origin.y - anchor.y) * CIRCUMFERENCE;
    // Inverse of the server similarity, with real metres stretched to mercator metres at the origin latitude.
    const k = 1 / (scale * scale * Math.cos(registration.origin[1] * Math.PI / 180));
    return new THREE.Matrix4().set(
        a * k, 0, b * k, ox - (a * tx + b * tz) * k,
        0, 1 / scale, 0, -altitude / scale,
        -b * k, 0, a * k, oz + (b * tx - a * tz) * k,
        0, 0, 0, 1,
    );
}

function convexHull(points: [number, number][]) {
    const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o: number[], p: number[], q: number[]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const half = (list: [number, number][]) => {
        const hull: [number, number][] = [];
        for (const point of list) {
            while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
            hull.push(point);
        }
        return hull.slice(0, -1);
    };
    return [...half(sorted), ...half([...sorted].reverse())];
}

// Relief cell (scripts: ``write_relief_tile``): magic, samples, reserved, cell size (EPSG:3857
// metres), lowest height, height step (metres), texture length; then the heights as row
// deltas modulo 2^16, then the JPEG texture.
const RELIEF_MAGIC = 0x31485250; // "PRH1"
const RELIEF_HEADER = 24;
// Relief cells loaded at once; the view is filled first, then whatever the camera reaches next.
const WORKERS = 6;

type Grid = { uv: THREE.BufferAttribute; index: THREE.BufferAttribute };
const grids = new Map<number, Grid>();

/** Texture coordinates and triangles of a samples×samples grid: the same for every cell of that size. */
function grid(samples: number): Grid {
    const known = grids.get(samples);
    if (known) return known;
    const uv = new Float32Array(samples * samples * 2);
    for (let j = 0; j < samples; j++) for (let i = 0; i < samples; i++) uv.set([i / (samples - 1), j / (samples - 1)], (j * samples + i) * 2);
    const index = new (samples * samples <= 65536 ? Uint16Array : Uint32Array)((samples - 1) * (samples - 1) * 6);
    let k = 0;
    for (let j = 0; j < samples - 1; j++) for (let i = 0; i < samples - 1; i++) {
        const node = j * samples + i;
        // Counter-clockwise when seen from above (+y), with z pointing south.
        index.set([node, node + samples, node + 1, node + 1, node + samples, node + samples + 1], k);
        k += 6;
    }
    const created = { uv: new THREE.BufferAttribute(uv, 2), index: new THREE.BufferAttribute(index, 1) };
    grids.set(samples, created);
    return created;
}

/** Mesh of one relief cell, local to its north-west corner: x east, z south, y up, in metres. */
async function reliefMesh(data: ArrayBuffer) {
    const view = new DataView(data);
    if (view.getUint32(0, true) !== RELIEF_MAGIC) throw new Error("Format de relief inconnu");
    const samples = view.getUint16(4, true);
    const spacing = view.getFloat32(8, true) / (samples - 1);
    const low = view.getFloat32(12, true);
    const step = view.getFloat32(16, true);
    const deltas = new Uint16Array(data, RELIEF_HEADER, samples * samples);
    const positions = new Float32Array(samples * samples * 3);
    for (let j = 0; j < samples; j++) {
        let height = 0;
        for (let i = 0; i < samples; i++) {
            const node = j * samples + i;
            height = (height + deltas[node]) & 0xffff;
            positions[node * 3] = i * spacing;
            positions[node * 3 + 1] = low + height * step;
            positions[node * 3 + 2] = j * spacing;
        }
    }
    const jpeg = new Uint8Array(data, RELIEF_HEADER + samples * samples * 2, view.getUint32(20, true));
    // Same decoding as GLTFLoader: image rows from north to south, no vertical flip.
    const texture = new THREE.Texture(await createImageBitmap(new Blob([jpeg], { type: "image/jpeg" }), { premultiplyAlpha: "none" }));
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    const { uv, index } = grid(samples);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", uv);
    geometry.setIndex(index);
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));
}

/**
 * The campus photogrammetry and the IGN LiDAR relief, drawn inside the MapLibre
 * canvas. The calibrated scan is the reference where it exists; the relief
 * fills the surroundings and is discarded under the scan's footprint.
 *
 * The scan loads first. Relief cells then load as the camera reaches them,
 * closest to the centre of the view first; a cell entirely under the scan is
 * never downloaded. The scene is expressed relative to one origin so vertex
 * values stay small; the mercator offset is folded into the camera matrix in
 * double precision.
 */
export function createReliefLayer(relief: ReliefIndex | null, scan: CampusScan | null, origin: [number, number], headers: () => Record<string, string>) {
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const anchor = MercatorCoordinate.fromLngLat(origin, 0);
    const metre = anchor.meterInMercatorCoordinateUnits();
    const model = new THREE.Matrix4().set(
        1 / CIRCUMFERENCE, 0, 0, anchor.x,
        0, 0, 1 / CIRCUMFERENCE, anchor.y,
        0, metre, 0, 0,
        0, 0, 0, 1,
    );
    const materials = new Set<THREE.MeshBasicMaterial>();
    let renderer: THREE.WebGLRenderer | null = null;
    let map: MapLibreMap | null = null;
    let dimmed = false;
    let disposed = false;
    const aborted = new AbortController();
    // Most scan tiles are Draco-compressed. The decoder is the one shipped with three.js, served locally.
    const draco = new DRACOLoader().setDecoderPath("/draco/");

    // Coverage mask of the scan, in layer scene coordinates.
    const mask = document.createElement("canvas");
    mask.width = mask.height = MASK_PIXELS;
    // Read back for each relief cell, to skip the ones under the scan.
    const maskContext = mask.getContext("2d", { willReadFrequently: true })!;
    maskContext.fillStyle = "#fff";
    const maskTexture = new THREE.CanvasTexture(mask);
    maskTexture.flipY = false;
    maskTexture.minFilter = maskTexture.magFilter = THREE.NearestFilter;
    // Centred on the scan origin, whatever part of the map is in view when the layer is added.
    const scanOrigin = scan ? MercatorCoordinate.fromLngLat(scan.registration.origin, 0) : anchor;
    const maskBox = new THREE.Vector4((scanOrigin.x - anchor.x) * CIRCUMFERENCE - MASK_EXTENT / 2, (scanOrigin.y - anchor.y) * CIRCUMFERENCE - MASK_EXTENT / 2, MASK_EXTENT, MASK_EXTENT);
    const scanRoot = new THREE.Group();
    scene.add(scanRoot);
    if (scan) {
        scanRoot.matrixAutoUpdate = false;
        scanRoot.matrix.copy(scanMatrix(scan.registration, anchor));
    }
    const scanTiles = new THREE.Group();
    scanTiles.position.copy(SCAN_OFFSET);
    scanRoot.add(scanTiles);

    const applyDimming = (material: THREE.MeshBasicMaterial) => {
        // Faded surfaces stop writing depth so the focused floor stays visible inside them.
        material.transparent = dimmed;
        material.opacity = dimmed ? 0.28 : 1;
        material.depthWrite = !dimmed;
        material.needsUpdate = true;
    };

    const maskRelief = (material: THREE.MeshBasicMaterial) => {
        material.onBeforeCompile = shader => {
            shader.uniforms.scanMask = { value: maskTexture };
            shader.uniforms.scanMaskBox = { value: maskBox };
            shader.uniforms.scanEdge = { value: EDGE_OVERLAP / MASK_EXTENT };
            shader.vertexShader = shader.vertexShader
                .replace("#include <common>", "#include <common>\nvarying vec2 vScanXZ;")
                .replace("#include <project_vertex>", "#include <project_vertex>\nvScanXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");
            shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", `#include <common>
uniform sampler2D scanMask;
uniform vec4 scanMaskBox;
uniform float scanEdge;
varying vec2 vScanXZ;
// Eroded coverage: covered only if the neighbourhood is covered too, which pulls the mask in at the scan's outer edge only.
bool scanCovered(vec2 uv) {
	if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return false;
	for (int i = 0; i < 8; i++) {
		float angle = float(i) * 0.785398;
		if (texture2D(scanMask, uv + vec2(cos(angle), sin(angle)) * scanEdge).r < 0.5) return false;
	}
	return texture2D(scanMask, uv).r > 0.5;
}`)
                .replace("void main() {", "void main() {\n\tif (scanCovered((vScanXZ - scanMaskBox.xy) / scanMaskBox.zw)) discard;");
        };
        material.customProgramCacheKey = () => "relief-scan-mask";
    };

    const markCoverage = (object: THREE.Object3D) => {
        scene.updateMatrixWorld(true);
        const point = new THREE.Vector3();
        object.traverse(child => {
            if (!(child instanceof THREE.Mesh)) return;
            const position = child.geometry.getAttribute("position");
            const stride = Math.max(1, Math.floor(position.count / 3000));
            const points: [number, number][] = [];
            for (let i = 0; i < position.count; i += stride) {
                point.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
                points.push([point.x, point.z]);
            }
            const hull = convexHull(points);
            if (hull.length < 3) return;
            maskContext.beginPath();
            hull.forEach(([x, z], index) => {
                const px = (x - maskBox.x) / maskBox.z * MASK_PIXELS;
                const py = (z - maskBox.y) / maskBox.w * MASK_PIXELS;
                if (index) maskContext.lineTo(px, py); else maskContext.moveTo(px, py);
            });
            maskContext.closePath();
            maskContext.fill();
        });
        maskTexture.needsUpdate = true;
    };

    const prepare = (object: THREE.Object3D, isRelief: boolean) => {
        object.traverse(child => {
            if (!(child instanceof THREE.Mesh)) return;
            // Photogrammetry carries its lighting in the texture: draw it unlit.
            if (!(child.material instanceof THREE.MeshBasicMaterial)) {
                const source = child.material as THREE.MeshStandardMaterial;
                child.material = new THREE.MeshBasicMaterial({ map: source.map, color: source.color });
                source.dispose();
            }
            const material = child.material as THREE.MeshBasicMaterial;
            if (isRelief) maskRelief(material);
            materials.add(material);
            applyDimming(material);
        });
    };

    // Whether the eroded scan footprint, as the relief shader tests it, covers a whole relief cell.
    const hiddenByScan = (tile: ReliefTile) => {
        if (!scan) return false;
        const [west, south, east, north] = tile.bounds;
        const corner = (lng: number, lat: number) => {
            const point = MercatorCoordinate.fromLngLat([lng, lat], 0);
            return [((point.x - anchor.x) * CIRCUMFERENCE - maskBox.x) / maskBox.z * MASK_PIXELS, ((point.y - anchor.y) * CIRCUMFERENCE - maskBox.y) / maskBox.w * MASK_PIXELS];
        };
        const margin = EDGE_OVERLAP / MASK_EXTENT * MASK_PIXELS + 1;
        const [x0, y0] = corner(west, north).map(value => Math.floor(value - margin));
        const [x1, y1] = corner(east, south).map(value => Math.ceil(value + margin));
        if (x0 < 0 || y0 < 0 || x1 > MASK_PIXELS || y1 > MASK_PIXELS) return false;
        const pixels = maskContext.getImageData(x0, y0, x1 - x0, y1 - y0).data;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 128) return false;
        return true;
    };

    const pending = new Map((relief?.tiles || []).map(tile => [tile.path, tile]));
    let scanLoaded = !scan;
    let loading = 0;

    const loadRelief = async (tile: ReliefTile) => {
        const response = await fetch(`/api/private/maps/indoor/relief/${tile.path}`, { headers: headers(), signal: aborted.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const mesh = await reliefMesh(await response.arrayBuffer());
        if (disposed) { mesh.geometry.dispose(); mesh.material.map?.dispose(); mesh.material.dispose(); return; }
        const corner = MercatorCoordinate.fromLngLat([tile.bounds[0], tile.bounds[3]], 0);
        mesh.position.set((corner.x - anchor.x) * CIRCUMFERENCE, 0, (corner.y - anchor.y) * CIRCUMFERENCE);
        prepare(mesh, true);
        scene.add(mesh);
        map?.triggerRepaint();
    };

    // Cells in view (with a quarter of a view around it) first, then all the others, each
    // group from the centre of the view outwards: the whole relief ends up loaded.
    const schedule = () => {
        if (!map || disposed || !scanLoaded || !pending.size) return;
        const bounds = map.getBounds();
        const center = map.getCenter();
        const marginX = (bounds.getEast() - bounds.getWest()) / 4, marginY = (bounds.getNorth() - bounds.getSouth()) / 4;
        const inView = ({ bounds: [west, south, east, north] }: ReliefTile) =>
            east >= bounds.getWest() - marginX && west <= bounds.getEast() + marginX && north >= bounds.getSouth() - marginY && south <= bounds.getNorth() + marginY;
        const priority = (tile: ReliefTile) => {
            const [west, south, east, north] = tile.bounds;
            return (inView(tile) ? 0 : 1) + Math.hypot((west + east) / 2 - center.lng, (south + north) / 2 - center.lat);
        };
        const ordered = [...pending.values()].map(tile => ({ tile, rank: priority(tile) })).sort((a, b) => a.rank - b.rank).map(({ tile }) => tile);
        for (const tile of ordered) {
            if (loading >= WORKERS) return;
            pending.delete(tile.path);
            if (hiddenByScan(tile)) continue;
            loading++;
            loadRelief(tile)
                // A missing cell leaves a hole in the surface; the 2D layers stay usable underneath.
                .catch(error => { if (!disposed) console.warn(`Tuile 3D non chargée : ${tile.path}`, error); })
                .finally(() => { loading--; schedule(); });
        }
    };

    const loadScan = async () => {
        const loader = new GLTFLoader().setDRACOLoader(draco);
        const queue = [...(scan?.urls || [])];
        const next = async () => {
            while (queue.length && !disposed) {
                const url = queue.shift()!;
                loader.setRequestHeader(headers());
                try {
                    const gltf = await loader.loadAsync(url);
                    if (disposed) return;
                    prepare(gltf.scene, false);
                    scanTiles.add(gltf.scene);
                    markCoverage(gltf.scene);
                    map?.triggerRepaint();
                } catch (error) {
                    console.warn(`Tuile 3D non chargée : ${url}`, error);
                }
            }
        };
        await Promise.all(Array.from({ length: WORKERS }, next));
        // The relief waits for the whole scan footprint, so that no cell under it is downloaded.
        scanLoaded = true;
        schedule();
    };

    const layer: CustomLayerInterface & { setDimmed: (value: boolean) => void } = {
        id: "relief",
        type: "custom",
        renderingMode: "3d",
        onAdd(target, gl) {
            map = target;
            renderer = new THREE.WebGLRenderer({ canvas: target.getCanvas(), context: gl, antialias: true });
            renderer.autoClear = false;
            target.on("moveend", schedule);
            schedule();
            void loadScan();
        },
        render(_gl, options: CustomRenderMethodInput) {
            if (!renderer) return;
            camera.projectionMatrix = new THREE.Matrix4().fromArray(options.defaultProjectionData.mainMatrix).multiply(model);
            camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
            renderer.resetState();
            renderer.render(scene, camera);
        },
        onRemove() {
            disposed = true;
            aborted.abort();
            map?.off("moveend", schedule);
            scene.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    (object.material as THREE.MeshBasicMaterial).map?.dispose();
                    (object.material as THREE.Material).dispose();
                }
            });
            maskTexture.dispose();
            draco.dispose();
            renderer?.dispose();
            renderer = null;
            map = null;
        },
        setDimmed(value) {
            if (dimmed === value) return;
            dimmed = value;
            materials.forEach(applyDimming);
            map?.triggerRepaint();
        },
    };
    return layer;
}
