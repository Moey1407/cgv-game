import test from 'node:test';
import assert from 'node:assert/strict';
import { missionPhase } from '../src/gameplay/mission.js';
import { makeTraversalPath } from '../src/gameplay/traversal.js';
import { createNavigation } from '../src/gameplay/navigation.js';

test('gala requires copied access and reader authorisation before the lobby exit', () => {
  assert.equal(missionPhase(1).id, 'badge');
  assert.equal(missionPhase(1, { hasKeycard: true }).id, 'reader');
  assert.equal(missionPhase(1, {}, { nightEntry: true }).exitReady, false);
  assert.equal(missionPhase(1, { hasKeycard: true }, { nightEntry: true }).exitReady, true);
});

test('opening the safe does not magically collect the Star or finish the vault', () => {
  assert.equal(missionPhase(2).id, 'circuit');
  assert.equal(missionPhase(2, {}, { sensorDisabled: true }).id, 'safe');
  assert.equal(missionPhase(2, {}, { sensorDisabled: true, safeOpened: true }).id, 'star');
  assert.equal(missionPhase(2, { hasStar: true }, { sensorDisabled: true, safeOpened: true }).exitReady, true);
});

test('roof departure is gated by the Echo interlocks and hatch', () => {
  assert.equal(missionPhase(3).id, 'shutter');
  assert.equal(missionPhase(3, {}, { pastShutter: true }).id, 'sensors');
  assert.equal(missionPhase(3, {}, { pastShutter: true, armed: true }).id, 'hatch');
  assert.equal(missionPhase(3, {}, { pastShutter: true, armed: true, hatch: true }).exitReady, true);
});

test('duct travel follows each bend, clamps endpoints and supports reverse entry', () => {
  const points = [[0, 0, 0], [0, 0, -4], [3, 0, -4]];
  const path = makeTraversalPath(points);
  assert.equal(path.length, 7);
  assert.deepEqual(path.sample(5), { x: 1, y: 0, z: -4, yaw: -Math.PI / 2 });
  assert.equal(path.sample(-100).z, 0);
  assert.equal(path.sample(100).x, 3);
  assert.equal(makeTraversalPath([...points].reverse()).sample(7).z, 0);
});

test('guard navigation goes around cover and never cuts through a solid wall', () => {
  const canStand = (x, z) => x >= 0 && x <= 10 && z >= 0 && z <= 10 && !(x >= 4 && x <= 6 && z < 7);
  const nav = createNavigation({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, canStand);
  const path = nav.findPath({ x: 2, z: 2 }, { x: 8, z: 2 });
  assert.ok(path.length >= 3);
  let from = { x: 2, z: 2 };
  for (const to of path) {
    for (let t = 0; t <= 1; t += 0.02) assert.ok(canStand(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t));
    from = to;
  }
  const sealed = createNavigation({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, (x, z) => canStand(x, z) && z < 6);
  assert.deepEqual(sealed.findPath({ x: 2, z: 2 }, { x: 8, z: 2 }), []);
});
