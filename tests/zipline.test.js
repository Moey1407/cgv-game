import test from 'node:test';
import assert from 'node:assert/strict';
import { createZiplineSystem } from '../src/gameplay/zipline.js';

test('zipline mounts only near an anchor and travels to the opposite end', () => {
  const zipline = createZiplineSystem([{ id: 'roof', start: { x: 0, y: 4, z: 0 }, end: { x: 10, y: 1, z: 0 }, speed: 10 }]);
  assert.equal(zipline.mount({ x: 5, y: 0, z: 5 }), false);
  assert.equal(zipline.mount({ x: 0.5, y: 4, z: 0 }), true);
  const halfway = zipline.update(0.5);
  assert.ok(halfway.position.x > 4 && halfway.position.x < 6);
  zipline.update(0.6);
  assert.equal(zipline.snapshot().riding, false);
});

test('zipline supports reverse mounting, lean and emergency drop controls', () => {
  const zipline = createZiplineSystem([{ id: 'service', start: { x: 0, z: 0 }, end: { x: 0, z: 10 }, speed: 5 }]);
  assert.equal(zipline.nearest({ x: 0, z: 9.5 }).reverse, true);
  assert.equal(zipline.mount({ x: 0, z: 9.5 }), true);
  const moving = zipline.update(0.5, { lean: 1 });
  assert.ok(moving.position.x > 0);
  const dropped = zipline.update(0.1, { drop: true });
  assert.equal(dropped.reason, 'drop');
  assert.equal(zipline.snapshot().riding, false);
});
