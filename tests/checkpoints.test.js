import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { createCheckpointStore } from '../src/gameplay/checkpoints.js';

test('checkpoint snapshots are isolated from later mutations', () => {
  const events = createEventBus();
  const emitted = [];
  events.on('checkpoint:save', ({ id }) => emitted.push('save:' + id));
  events.on('checkpoint:restore', ({ id }) => emitted.push('restore:' + id));
  const store = createCheckpointStore({ events });
  const state = { player: { x: 2, z: 5 }, inventory: ['key'] };
  store.save('level-1-entry', state);
  state.player.x = 99;
  const restored = store.restore();
  restored.inventory.push('loot');
  assert.deepEqual(store.restore('level-1-entry'), { player: { x: 2, z: 5 }, inventory: ['key'] });
  assert.deepEqual(emitted, ['save:level-1-entry', 'restore:level-1-entry', 'restore:level-1-entry']);
});
