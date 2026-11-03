import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayIntervals} from '../src/lib/timetable.ts';
import {timetableHref} from '../src/lib/timetableContext.ts';
import {indexNetwork,shortestConnection,networkLayout} from '../src/lib/network.ts';

test('busy windows are clipped, merged and span midnight without false free time',()=>{
 const day=new Date(2026,9,26);
 const events=[{id:'1',name:'Overnight',start_time:'2026-10-25T22:00:00',end_time:'2026-10-26T10:00:00'},{id:'2',name:'Adjacent',start_time:'2026-10-26T10:00:00',end_time:'2026-10-26T11:00:00'},{id:'3',name:'Late',start_time:'2026-10-26T20:00:00',end_time:'2026-10-27T03:00:00'}];
 const output=dayIntervals(day,events);
 assert.deepEqual(output.map(({type,start,end})=>({type,start,end})),[{type:'busy',start:480,end:660},{type:'free',start:660,end:1200},{type:'busy',start:1200,end:1260}]);
 assert.equal(output[0].events.length,2);
 assert.deepEqual(dayIntervals(day,[]).map(x=>[x.start,x.end]),[[480,1260]]);
});

test('weekly links always start Monday',()=>{
 const url=new URL(timetableHref({week:new Date(2026,9,28)}),'https://test.invalid');
 assert.equal(url.searchParams.get('week'),'2026-10-26');
});

test('connection paths honor direction, filters and unknown or disconnected nodes',()=>{
 const data={nodes:['a','b','c','d'].map(id=>({id,name:id,group:'student'})),links:[{id:'ab',source:'a',target:'b',kind:'relationship',label:'Mentor',directed:true},{id:'bc',source:'b',target:'c',kind:'membership',label:'Membre'}]};
 const original=JSON.stringify(data);const index=indexNetwork(data);
 assert.deepEqual(shortestConnection(index,'a','c').edges.map(x=>x.id),['ab','bc']);
 assert.equal(shortestConnection(index,'c','a'),null);
 assert.equal(shortestConnection(index,'a','c','relationship'),null);
 assert.equal(shortestConnection(index,'a','d'),null);
 assert.equal(shortestConnection(index,'missing','a'),null);
 assert.equal(JSON.stringify(data),original);
});

test('network layout accommodates thousands of nodes and long paths without coincident positions',()=>{
 const nodes=Array.from({length:3000},(_,i)=>({id:String(i),name:String(i),group:'student'}));
 const positions=networkLayout(nodes);
 assert.equal(positions.size,3000);
 assert.equal(new Set([...positions.values()].map(p=>`${p.x},${p.y}`)).size,3000);
 assert.ok(Math.max(...[...positions.values()].map(p=>Math.hypot(p.x,p.y)))>2000);
 const path=networkLayout(nodes,true);
 assert.equal(path.get('2999').x,2999*200);
});
