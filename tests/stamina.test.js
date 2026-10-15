import test from 'node:test';
import assert from 'node:assert/strict';
import { createStaminaSystem } from '../src/gameplay/stamina.js';

test('sprint stamina drains, pauses, then recovers', () => {
  const stamina = createStaminaSystem({ max: 2, drainPerSecond: 1, recoverPerSecond: 1, recoveryDelay: 1 });
  stamina.update(2, true);
  assert.equal(stamina.snapshot().canSprint, false);
  stamina.update(0.5, false);
  assert.equal(stamina.snapshot().value, 0);
  stamina.update(0.5, false);
  assert.equal(stamina.snapshot().value, 0.5);
  stamina.update(2, false);
  assert.equal(stamina.snapshot().value, 2);
});
