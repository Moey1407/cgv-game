import test from 'node:test';
import assert from 'node:assert/strict';
import { movementMode, movementProfile } from '../src/gameplay/player.js';

test('movement preserves the existing Valorant-style shift-to-walk controls', () => {
  assert.equal(movementMode({}).id, 'run');
  assert.equal(movementMode({ ShiftLeft: true }).id, 'walk');
  assert.equal(movementMode({ KeyC: true, ShiftLeft: true }).id, 'crouch');
  assert.equal(movementMode({ KeyZ: true }).id, 'crawl');
  assert.equal(movementMode({ KeyX: true }).id, 'sprint');
});

test('surface, carrying and dampener modifiers compose predictably', () => {
  const profile = movementProfile({}, { carrying: true, surfaceNoise: 1.4, damped: true });
  assert.equal(profile.speed, 4.85 * 0.88);
  assert.equal(profile.radius, 12.4 * 1.4);
  assert.ok(profile.noise < 0.3);
});
