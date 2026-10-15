import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlateSystem } from '../src/gameplay/plates.js';

test('player and Echo can occupy two plates at the same time', () => {
  const system = createPlateSystem([
    { id: 'left', x: -2, z: 0 },
    { id: 'right', x: 2, z: 0 }
  ]);
  system.update([
    { id: 'player', position: { x: -2, z: 0 } },
    { id: 'echo', position: { x: 2, z: 0 } }
  ]);
  assert.equal(system.allActive(), true);
  assert.deepEqual(system.plates[1].occupants, ['echo']);
  system.update([{ id: 'player', position: { x: -2, z: 0 } }]);
  assert.equal(system.allActive(), false);
});
