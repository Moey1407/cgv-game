import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafecrackSystem } from '../src/gameplay/safecrack.js';

test('safe needs all three tumblers and tightens each window', () => {
  const safe = createSafecrackSystem({ combination: [10, 50, 90], windows: [5, 3, 1] });
  safe.turn(6);
  assert.equal(safe.setTumbler().success, true);
  safe.turn(40);
  assert.equal(safe.setTumbler().success, false);
  safe.turn(4);
  assert.equal(safe.setTumbler().success, true);
  safe.turn(39.2);
  const result = safe.setTumbler();
  assert.equal(result.success, true);
  assert.equal(result.opened, true);
});

test('fast dial turns emit more noise and proximity feedback strengthens', () => {
  const safe = createSafecrackSystem({ combination: [20] });
  const slow = safe.turn(1, 1);
  const far = safe.feedback().strength;
  const fast = safe.turn(15, 0.05);
  assert.ok(fast.noise > slow.noise);
  assert.ok(safe.feedback().strength > far);
});
