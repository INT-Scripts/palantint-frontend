import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCampusDestination, placeCategory, campusHref, floorName } from '../src/lib/campus.ts';

const place = (kind, name, extra = {}) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [2.44, 48.62] }, properties: { kind, name, levels: [0], ...extra } });

test('only the server determines which geometries are selectable', () => {
    assert.equal(isCampusDestination(place('room', 'A008', {selectable:false})),false);
    assert.equal(isCampusDestination(place('room', 'A008', {selectable:true})),true);
    assert.equal(isCampusDestination(place('room', 'A008')),false);
});

test('categories use authoritative server metadata, not room or building names', () => {
    assert.equal(placeCategory(place('building', 'U1 U2 U4', {category:'housing'})), 'housing');
    assert.equal(placeCategory(place('room', 'A008', {category:'teaching'})), 'teaching');
    assert.equal(placeCategory(place('room', 'Amphithéâtre Étoile', {category:'services'})), 'services');
    assert.equal(placeCategory(place('poi', 'Bibliothèque')), 'services');
});

test('links round-trip source identities, level zero and special room characters', () => {
    const url = new URL(campusHref({ feature: 'features:room/1', level: 0, room: 'A & B' }), 'https://example.test');
    assert.equal(url.pathname, '/palantint/campus');
    assert.equal(url.searchParams.get('feature'), 'features:room/1');
    assert.equal(url.searchParams.get('room'), 'A & B');
    assert.equal(url.searchParams.get('level'), '0');
    assert.equal(floorName(-1), 'Sous-sol 1');
});

test('laundry uses provider state even when start time is stale or missing', async () => {
    const { isDryer, isRunning, machinePrice } = await import('../src/lib/laundry.ts');
    const machine = { machine_type: 'sec', machine_state: '1', started_at: null, machine_price: '100' };
    assert.equal(isDryer(machine), true);
    assert.equal(isRunning(machine), true);
    assert.equal(isRunning({ ...machine, machine_state: '0', started_at: '2026-01-01' }), false);
    assert.equal(isDryer({ ...machine, machine_type: 'mal' }), false);
    assert.match(machinePrice(machine), /1,00/);
});

test('destination lists honor server deduplication flags', async () => {
    const { campusDestinations } = await import('../src/lib/campus.ts');
    const a = {...place('room','A008',{selectable:true}),id:'room-1'};
    const b = {...place('room','A008',{selectable:true}),id:'room-2'};
    const label = {...place('poi','A008',{selectable:false}),id:'label'};
    assert.deepEqual(campusDestinations([a,b,label]).map(item=>item.id),['room-1','room-2']);
});
