import test from 'node:test';
import assert from 'node:assert/strict';
import { createPickpocketSystem, pickpocketAccess, PICKPOCKET_SECONDS } from '../src/gameplay/pickpocket.js';

const guard = { id: 'okafor', position: { x: 0, z: 0 }, yaw: 0, state: 'patrol' };

test('pickpocket access requires a close, clear position behind the guard', () => {
  assert.equal(pickpocketAccess({ x: 0, z: -1 }, guard), true);
  assert.equal(pickpocketAccess({ x: 0, z: 1 }, guard), false);
  assert.equal(pickpocketAccess({ x: 0, z: -3 }, guard), false);
  assert.equal(pickpocketAccess({ x: 0, z: -1 }, guard, { clear: false }), false);
  assert.equal(pickpocketAccess({ x: 0, z: -1 }, { ...guard, state: 'pursue' }), false);
});

test('pickpocket needs an uninterrupted hold and completes only once', () => {
  const system = createPickpocketSystem();
  let result = system.update({ dt: PICKPOCKET_SECONDS / 2, holding: true, player: { x: 0, z: -1 }, guard });
  assert.equal(result.completed, false);
  system.update({ dt: 0.1, holding: false, player: { x: 0, z: -1 }, guard });
  assert.equal(system.snapshot().progress, 0);
  result = system.update({ dt: PICKPOCKET_SECONDS, holding: true, player: { x: 0, z: -1 }, guard });
  assert.equal(result.completed, true);
  assert.equal(system.update({ dt: 2, holding: true, player: { x: 0, z: -1 }, guard }).completed, false);
});

test('moving patrols do not require players to hold two keys while tailing', () => {
  assert.equal(pickpocketAccess({ x: 0, z: -1 }, { ...guard, stationary: false }), false);
  assert.equal(pickpocketAccess({ x: 0, z: -1 }, { ...guard, stationary: true }), true);
});
