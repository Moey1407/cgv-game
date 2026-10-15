import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWindow, mapPoint, sameMapFloor } from '../src/gameplay/mapView.js';
import { LEVELS } from '../levels/index.js';

test('local map follows the player without revealing the whole layout', () => {
  const view = mapWindow(LEVELS[1].floors, { x: 8, y: 0, z: -12 }, false, 1.2);
  assert.equal(view.x, 8); assert.equal(view.z, -12); assert.equal(view.height, 14);
  assert.equal(view.width, 16.8);
});
test('sonar fits every current-floor rectangle without stretching metres', () => {
  for (const level of Object.values(LEVELS)) for (const y of level.id === 3 ? [0, 20] : [0]) {
    const view = mapWindow(level.floors, { x: 0, y, z: 0 }, true, 1.2);
    assert.ok(Math.abs(view.width / view.height - 1.2) < 1e-8);
    for (const f of level.floors.filter((f) => sameMapFloor(f.pos[1], y))) {
      assert.ok(f.pos[0] - f.size[0] / 2 >= view.x - view.width / 2);
      assert.ok(f.pos[0] + f.size[0] / 2 <= view.x + view.width / 2);
      assert.ok(f.pos[2] - f.size[2] / 2 >= view.z - view.height / 2);
      assert.ok(f.pos[2] + f.size[2] / 2 <= view.z + view.height / 2);
    }
  }
});
test('roof scan does not include underground geometry', () => {
  const roof = mapWindow(LEVELS[3].floors, { x: 0, y: 20, z: -60 }, true, 1);
  assert.ok(roof.z < -50); assert.ok(roof.height < 40);
});
test('distant objective is clamped in its actual direction; north remains up', () => {
  const view = { x: 0, z: 0, width: 20, height: 20 };
  const p = mapPoint({ x: 100, z: -100 }, view, 200, 200);
  assert.equal(p.edge, true); assert.equal(p.x, 188); assert.equal(p.y, 12);
  assert.equal(mapPoint({ x: 0, z: -2 }, view, 200, 200).y, 80);
});
