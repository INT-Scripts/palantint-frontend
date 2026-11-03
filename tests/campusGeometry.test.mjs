import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toScene } from '../src/lib/campusGeometry.ts';
import { extrudePolygons } from '../src/lib/campusExtrusion.ts';

const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('renderer applies the server-provided transform without inferring building matches',()=>{
    const metres = 6378137*Math.PI/180*.001;
    const center = toScene([.0005,.0005],{origin:[0,0],a:0,b:2,tx:10,tz:20,scale:2,altitude:5,anchors:3,error:0});
    close(center[0],10+metres);close(center[1],20+metres);
});

test('3D conversion keeps holes and disconnected polygons, with positive height', () => {
    const outer = [[0,0],[10,0],[10,10],[0,10],[0,0]];
    const hole = [[3,3],[3,7],[7,7],[7,3],[3,3]];
    const separate = [[20,0],[22,0],[22,2],[20,2],[20,0]];
    const geometry = extrudePolygons([[outer, hole], [separate]], 3.2);
    assert.ok(geometry);
    geometry.computeBoundingBox();
    close(geometry.boundingBox.min.y, 0); close(geometry.boundingBox.max.y, 3.2);
    close(geometry.boundingBox.max.x, 22);
    // Inspect actual top triangles: 10*10 - 4*4 + 2*2 = 88 square units.
    const positions = geometry.attributes.position;
    let area = 0;
    for (let i = 0; i < positions.count; i += 3) {
        if (![0,1,2].every(offset => Math.abs(positions.getY(i + offset) - 3.2) < 1e-5)) continue;
        const ax = positions.getX(i), az = positions.getZ(i);
        const bx = positions.getX(i+1), bz = positions.getZ(i+1);
        const cx = positions.getX(i+2), cz = positions.getZ(i+2);
        area += Math.abs((bx-ax)*(cz-az) - (cx-ax)*(bz-az)) / 2;
    }
    close(area, 88);
    geometry.dispose();
});
