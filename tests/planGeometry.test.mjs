import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planGeometry,polygonRings,planLines,readFloorPlan} from '../src/lib/planGeometry.ts';

test('unplaced plans retain local rings without pretending to be WGS84', async()=>{
 const rings=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[2,2],[2,4],[4,4],[4,2],[2,2]]];
 const feature={type:'Feature',id:'room-1',geometry:null,properties:{kind:'room',room_id:'1',plan_geometry:{type:'Polygon',coordinates:rings}}};
 const plan=await readFloorPlan(new Response(JSON.stringify({type:'FeatureCollection',metadata:{plan_coordinate_space:'local_plan'},features:[feature]})));
 assert.equal(plan.features[0].geometry,null);
 assert.deepEqual(polygonRings(planGeometry(plan.features[0])),[rings]);
 assert.deepEqual(planLines(planGeometry(plan.features[0])),rings);
});

test('plan loader rejects unavailable and incompatible responses',async()=>{
 await assert.rejects(readFloorPlan(new Response('',{status:404})),/indisponible/);
 await assert.rejects(readFloorPlan(new Response(JSON.stringify({type:'FeatureCollection',features:[]}))),/invalide/);
});
