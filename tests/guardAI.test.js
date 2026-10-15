import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { inCone, wrapAngle, angleTo } from '../src/game/guardAI.js';

test('a guard facing +Z sees ahead but not behind', () => {
  const origin = new THREE.Vector3(0, 0, 0);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, 5), 8, Math.PI / 2), true);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, -5), 8, Math.PI / 2), false);
  assert.equal(inCone(origin, 0, new THREE.Vector3(0, 0, 9), 8, Math.PI / 2), false);
  assert.equal(inCone(origin, Math.PI / 2, new THREE.Vector3(5, 0, 0), 8, Math.PI / 2), true);
});

test('anything touching the guard counts as seen', () => {
  assert.equal(inCone(new THREE.Vector3(), 0, new THREE.Vector3(0, 0, -0.4), 8, 0.2), true);
});

test('angles wrap and point the right way', () => {
  assert.ok(Math.abs(wrapAngle(Math.PI * 3) - Math.PI) < 1e-9 || Math.abs(wrapAngle(Math.PI * 3) + Math.PI) < 1e-9);
  assert.ok(Math.abs(angleTo(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)) - Math.PI / 2) < 1e-9);
});
