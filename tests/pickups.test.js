import test from 'node:test';
import assert from 'node:assert/strict';
import { createPickupSystem } from '../src/gameplay/pickups.js';

test('loot and evidence collect once and contribute different campaign values', () => {
  const system = createPickupSystem([
    { id: 'watch', type: 'loot', value: 250, stage: 1, x: 0, z: 0 },
    { id: 'dex-call', type: 'evidence', stage: 1, x: 5, z: 5 }
  ]);
  assert.equal(system.nearby({ x: 0.5, z: 0 }, 1).id, 'watch');
  assert.equal(system.collect('watch').value, 250);
  assert.equal(system.collect('watch'), null);
  system.collect('dex-call');
  assert.deepEqual(system.snapshot(), { cash: 250, evidence: ['dex-call'], collected: ['watch', 'dex-call'] });
  system.reset();
  assert.deepEqual(system.snapshot().collected, []);
});
