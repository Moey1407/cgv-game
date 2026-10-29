import test from 'node:test';
import assert from 'node:assert/strict';

// The shell builds a signboard from a canvas, which node has no DOM for. A stub
// is enough: nothing here looks at a pixel, only at the collision boxes.
const noop = () => {};
const stubContext = new Proxy({}, {
  get: (_, key) => (key === 'canvas' ? { width: 2, height: 2 } : noop)
});
globalThis.document = {
  createElement: () => ({ width: 2, height: 2, getContext: () => stubContext })
};

const { createAirlock, AIRLOCK } = await import('../src/world/airlock.js');

const SPAN = AIRLOCK.half * 2;
const widthOf = (box, sideways) => (sideways ? box.size[2] : box.size[0]);

test('a shut passage door is a solid wall, not scenery to walk into', () => {
  const lock = createAirlock();
  lock.place({ pos: [0, 0, 10.1], yawDeg: 0 });

  const shut = lock.solids();
  assert.deepEqual(shut.map((s) => s.name).sort(), ['far', 'near'], 'both doors start shut and both block');
  for (const box of shut) {
    assert.ok(Math.abs(widthOf(box, false) - SPAN) < 0.01, 'a shut panel covers the whole opening');
    assert.ok(box.pos[1] - AIRLOCK.height / 2 < 0.01, 'the panel stands on the floor');
    assert.ok(box.pos[1] + AIRLOCK.height / 2 > 2.4, 'and is tall enough to stop anyone walking over it');
  }

  lock.setDoor('near', 1, true);
  assert.deepEqual(lock.solids().map((s) => s.name), ['far'], 'a fully open door blocks nothing');

  lock.setDoor('near', 0.5, true);
  const half = lock.solids().find((s) => s.name === 'near');
  const width = widthOf(half, false);
  assert.ok(width > 0.3 && width < SPAN - 0.3, 'a half-open door blocks about half the opening');
  // The panel slides toward +x, so what remains shut hugs the +x jamb.
  assert.ok(half.pos[0] > 0, 'the shut part sits on the side the panel has not reached yet');
  lock.dispose();
});

test('a rotated airlock blocks across its own opening, not the world axis', () => {
  const lock = createAirlock();
  lock.place({ pos: [1.6, 0, -25.7], yawDeg: -90 });
  const near = lock.solids().find((s) => s.name === 'near');
  assert.ok(near.size[2] > 1.5, 'a quarter-turned doorway spans z');
  assert.ok(near.size[0] < 0.5, 'and stays thin through x');
  assert.ok(Math.abs(near.pos[2] - -25.7) < 1.3, 'the panel sits across the mouth of the passage');
  lock.dispose();
});