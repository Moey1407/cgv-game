import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLevelData, validateLevelData } from '../src/core/level-schema.js';

test('shared level contract accepts gameplay hooks owned by all three teammates', () => {
  const level = {
    id: 1,
    name: 'The Gala',
    spawn: { x: 0, z: 18 },
    walls: [], guards: [], lasers: [], echoRooms: [],
    cameras: [{ id: 'c1', x: 3, z: 4, yaw: 0 }],
    pickups: [{ id: 'evidence-1', type: 'evidence', x: 5, z: 6 }],
    checkpoints: [{ id: 'entry', x: 0, z: 18 }],
    ziplines: [{ id: 'service-line', start: { x: 0, z: 2 }, end: { x: 8, z: -4 } }]
  };
  assert.equal(assertLevelData(level), level);
  assert.deepEqual(validateLevelData(level), []);
});

test('shared level contract rejects silent integration mistakes', () => {
  assert.deepEqual(validateLevelData({ id: 0, name: '', spawn: {}, cameras: {} }), [
    'id must be a positive integer',
    'name is required',
    'spawn requires finite x and z',
    'cameras must be an array'
  ]);
});
