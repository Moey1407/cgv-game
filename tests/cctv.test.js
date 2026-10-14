import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraSees, createCctvSystem, CCTV_LOOP_SECONDS } from '../src/gameplay/cctv.js';

const camera = { id: 'c1', x: 0, z: 0, yaw: 0, range: 10, fov: Math.PI / 2, enabled: true, loopRemaining: 0 };

test('camera detection respects range, cone, occlusion and looping', () => {
  assert.equal(cameraSees(camera, { x: 0, z: 5 }), true);
  assert.equal(cameraSees(camera, { x: 8, z: 0 }), false);
  assert.equal(cameraSees(camera, { x: 0, z: 11 }), false);
  assert.equal(cameraSees(camera, { x: 0, z: 5 }, false), false);
  assert.equal(cameraSees({ ...camera, loopRemaining: 1 }, { x: 0, z: 5 }), false);
});

test('loop suppresses detection for exactly eight seconds and events fire on entry', () => {
  const system = createCctvSystem([camera]);
  assert.equal(system.loop('c1'), true);
  assert.equal(system.snapshot()[0].loopRemaining, CCTV_LOOP_SECONDS);
  assert.deepEqual(system.update(7.9, { x: 0, z: 5 }), []);
  assert.deepEqual(system.update(0.1, { x: 0, z: 5 }), ['c1']);
  assert.deepEqual(system.update(1, { x: 0, z: 5 }), []);
  system.update(0, { x: 8, z: 0 });
  assert.deepEqual(system.update(0, { x: 0, z: 5 }), ['c1']);
});
