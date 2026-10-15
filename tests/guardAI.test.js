import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inCone, wrapAngle, angleTo } from '../src/game/guardAI.js';

test('a guard facing +Z sees ahead but not behind', () => {
  const origin = new THREE.Vector3(0, 0, 0);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, 5), 8, Math.PI / 2), true);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, -5), 8, Math.PI / 2), false);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, 9), 8, Math.PI / 2), false);
  assert.equal(inCone(origin, Math.PI / 2, new THREE.Vector3(5, 0, 0), 8, Math.PI / 2), true);
});

test('anything touching the guard counts as seen', () => {
  assert.equal(inCone(new THREE.Vector3(), 0, new THREE.Vector3(0, 0, -0.4), 8, 0.2), true);
});

test('angles wrap and point the right way', () => {
  assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9 || Math.abs(wrapAngle(Math.PI * 3) + Math.PI) < 1e-9);
  assert.ok(Math.abs(angleTo(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)) - Math.PI / 2) < 1e-9);
});

test('an investigating guard gives up on a noise he cannot reach', async () => {
  const THREE = await import('three');
  const { createGuardAI, INVESTIGATE_GIVE_UP } = await import('../src/game/guardAI.js');
  const root = new THREE.Group();
  const actor = { root, play() {}, update() {} };
  const g = createGuardAI({ id: 'test', actor, waypoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)], speed: 1 });
  g.reset();
  g.hear(new THREE.Vector3(0, 0, 10), 1);
  const ctx = { mode: 'night', time: 0, alarm: { guardSpeed: 1, pulseInterval: 1 }, canStand: (x, z) => z < 3, player: { position: new THREE.Vector3(50, 0, 50), crouching: false, visible: false } };
  for (let t = 0; t < INVESTIGATE_GIVE_UP + 4.5; t += 0.1) g.update(0.1, ctx);
  assert.equal(g.state, 'patrol', 'should have looked around and gone back to patrol');
});

test('a noise behind a wall: the guard stops pushing at the wall within a few seconds', async () => {
  const THREE = await import('three');
  const { createGuardAI, INVESTIGATE_NO_PROGRESS } = await import('../src/game/guardAI.js');
  const root = new THREE.Group();
  const actor = { root, play() {}, update() {} };
  const g = createGuardAI({ id: 'wall', actor, waypoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)], speed: 1 });
  g.reset();
  // A wall at z = 2 runs the full width; the noise is behind it at z = 6.
  const canStand = (x, z) => z < 1.6;
  g.hear(new THREE.Vector3(0, 0, 6), 1);
  const ctx = { mode: 'night', time: 0, alarm: { guardSpeed: 1, pulseInterval: 1 }, canStand, findPath: () => [], player: { position: new THREE.Vector3(50, 0, 50), crouching: false, visible: false } };
  let pushing = 0;
  for (let t = 0; t < 20 && g.state === 'investigate' && g.timer <= 0; t += 0.1) {
    g.update(0.1, ctx);
    if (root.position.z > 1.2) pushing += 0.1;
  }
  assert.ok(g.timer > 0 || g.state === 'patrol', 'gave up walking toward the noise');
  assert.ok(pushing < INVESTIGATE_NO_PROGRESS + 1, `pressed against the wall for ${pushing.toFixed(1)} s`);
});

test('a sedated guard ignores noise and the player, then wakes up searching', async () => {
  const THREE = await import('three');
  const { createGuardAI } = await import('../src/game/guardAI.js');
  const root = new THREE.Group();
  const actor = { root, play() {}, update() {} };
  const g = createGuardAI({ id: 'hale', actor, waypoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)], speed: 1 });
  g.reset();
  assert.equal(g.sedate(10), true);
  assert.equal(g.state, 'sedated');
  assert.equal(g.hear(new THREE.Vector3(1, 0, 0), 1), false);
  const ctx = { mode: 'night', time: 0, alarm: { guardSpeed: 1, pulseInterval: 1 }, canStand: () => true, player: { position: new THREE.Vector3(0, 0, 0.5), crouching: false, visible: true } };
  const start = root.position.clone();
  for (let t = 0; t < 9.5; t += 0.1) g.update(0.1, ctx);
  assert.equal(g.state, 'sedated');
  assert.ok(root.position.distanceTo(start) < 1e-6, 'a sleeping guard does not move');
  for (let t = 0; t < 1; t += 0.1) g.update(0.1, ctx);
  assert.equal(g.state === 'search' || g.state === 'pursue', true);
  assert.equal(root.rotation.z, 0);
  g.reset();
  assert.equal(g.sleep, 0);
});

test('a tripped laser: the guard hurries there and looks around longer than for a footstep', async () => {
  const THREE = await import('three');
  const { createGuardAI, URGENT_LOOK } = await import('../src/game/guardAI.js');
  const run = (urgent) => {
    const root = new THREE.Group();
    const g = createGuardAI({ id: 'test', actor: { root, play() {}, update() {} }, waypoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)], speed: 1 });
    g.reset();
    g.hear(new THREE.Vector3(0, 0, 10), 1, { urgent });
    const ctx = { mode: 'night', time: 0, alarm: { guardSpeed: 1, pulseInterval: 1 }, canStand: () => true, player: { position: new THREE.Vector3(50, 0, 50), crouching: false, visible: false } };
    let arrived = null;
    for (let t = 0; t < 30 && g.state === 'investigate'; t += 0.1) {
      g.update(0.1, ctx);
      if (arrived === null && root.position.z > 9.7) arrived = t;
    }
    return arrived;
  };
  const walk = run(false), hurry = run(true);
  assert.ok(hurry < walk * 0.75, `urgent ${hurry?.toFixed(1)} s should beat a walk ${walk?.toFixed(1)} s`);
  assert.ok(URGENT_LOOK > 3);
});
