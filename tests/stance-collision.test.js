import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision } from '../src/world/levelBuilder.js';

// One room with a slab hanging over the middle of it, leaving a gap underneath.
const room = {
  floors: [{ pos: [0, 0, 0], size: [20, 0.2, 20] }],
  walls: [{ pos: [0, 2.2, 0], size: [6, 2.6, 1] }]
};

const CROUCH = 1.08;
const CRAWL = 0.58;
const STANDING = 1.7;

test('a low gap is passable crouched or crawling, but not standing', () => {
  const collision = createCollision(room);
  // The slab runs from y 0.9 up to 3.5, so there is 0.9 m of clear air under it.
  assert.equal(collision.inside(0, 0, 0.35, 0, STANDING), false, 'standing does not fit under a 0.9 m gap');
  assert.equal(collision.inside(0, 0, 0.35, 0, CROUCH), false, 'nor does a 1.08 m crouch');
  assert.equal(collision.inside(0, 0, 0.35, 0, CRAWL), true, 'crawling at 0.58 m does fit');
});

test('stance never opens a gap that is not there', () => {
  const solid = createCollision({
    floors: [{ pos: [0, 0, 0], size: [20, 0.2, 20] }],
    // A full-height wall: no gap underneath at any stance.
    walls: [{ pos: [0, 1.5, 0], size: [6, 3, 1] }]
  });
  for (const height of [STANDING, CROUCH, CRAWL]) {
    assert.equal(solid.inside(0, 0, 0.35, 0, height), false, `a solid wall blocks at height ${height}`);
  }
});

test('the default height is a standing adult, so guards and navigation are unchanged', () => {
  const collision = createCollision(room);
  assert.equal(collision.inside(0, 0, 0.35, 0), collision.inside(0, 0, 0.35, 0, STANDING));
});

test('open floor stays walkable at every stance', () => {
  const collision = createCollision(room);
  for (const height of [STANDING, CROUCH, CRAWL]) {
    assert.equal(collision.inside(7, 7, 0.35, 0, height), true, `clear floor is walkable at height ${height}`);
  }
});