import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSoundField, MAX_RINGS } from '../src/render/soundField.js';
import { createLaserSystem, distanceToSegment } from '../src/render/lasers.js';

test('rings expand, fade and expire', () => {
  const field = createSoundField();
  field.emit(new THREE.Vector3(0, 0, 0), 0x72efff, 10, { speed: 5 });
  field.update(1);
  assert.equal(field.rings.length, 1);
  assert.equal(field.rings[0].radius, 5);
  assert.ok(Math.abs(field.rings[0].life - 0.5) < 1e-9);
  assert.ok(field.uniforms.uRingColor.value[0].w > 0);
  field.update(1.1);
  assert.equal(field.rings.length, 0);
  assert.equal(field.uniforms.uRingColor.value[0].w, 0);
});

test('ring buffer keeps the newest rings', () => {
  const field = createSoundField();
  for (let i = 0; i < MAX_RINGS + 3; i += 1) field.emit(new THREE.Vector3(i, 0, 0), 0xffffff, 20, { source: 'n' + i });
  assert.equal(field.rings.length, MAX_RINGS);
  assert.equal(field.rings[0].source, 'n3');
});

test('reached matches the visible band', () => {
  const field = createSoundField({ band: 0.5 });
  const ring = field.emit(new THREE.Vector3(0, 0, 0), 0xffffff, 20, { speed: 4 });
  field.update(1);
  assert.equal(field.reached(new THREE.Vector3(4.2, 0, 0), ring), true);
  assert.equal(field.reached(new THREE.Vector3(2, 0, 0), ring), false);
});

test('patching a material is idempotent', () => {
  const field = createSoundField();
  const material = new THREE.MeshStandardMaterial();
  field.patch(material);
  const hook = material.onBeforeCompile;
  field.patch(material);
  assert.equal(material.onBeforeCompile, hook);
  const shader = {
    uniforms: {},
    vertexShader: '#include <common>\n#include <worldpos_vertex>',
    fragmentShader: '#include <common>\n#include <emissivemap_fragment>'
  };
  material.onBeforeCompile(shader);
  assert.ok(shader.uniforms.uRingPos);
  assert.match(shader.vertexShader, /vSfWorld = /);
  assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= sfAccum/);
});

test('distance to a segment clamps to its ends', () => {
  const a = new THREE.Vector3(0, 0, 0);
  const b = new THREE.Vector3(4, 0, 0);
  assert.equal(distanceToSegment(new THREE.Vector3(2, 1, 0), a, b), 1);
  assert.equal(distanceToSegment(new THREE.Vector3(-3, 0, 0), a, b), 3);
});

test('laser patterns move and blink', () => {
  const scene = new THREE.Scene();
  const lasers = createLaserSystem(scene);
  const rise = lasers.add({ start: new THREE.Vector3(-2, 1, 0), end: new THREE.Vector3(2, 1, 0), pattern: 'rise', amplitude: 0.5 });
  const blink = lasers.add({ start: new THREE.Vector3(-2, 1, -3), end: new THREE.Vector3(2, 1, -3), pattern: 'blink', period: 2 });
  lasers.update(Math.PI / 2);
  assert.ok(Math.abs(rise.a.y - 1.5) < 1e-9);
  assert.equal(lasers.hits(new THREE.Vector3(0, 1.5, 0)), true);
  assert.equal(lasers.hits(new THREE.Vector3(0, 0.4, 0)), false);
  lasers.update(1.5);
  assert.equal(blink.active, false);
  assert.equal(lasers.hits(new THREE.Vector3(0, 1, -3)), false);
  lasers.dispose();
  assert.equal(scene.children.length, 0);
});

test('laser collision checks the whole body and rewards the correct stance', () => {
  const lasers = createLaserSystem(new THREE.Scene());
  lasers.add({ start: new THREE.Vector3(-3, 0.85, 0), end: new THREE.Vector3(3, 0.85, 0) });
  assert.equal(lasers.hitsBody({ x: 0, z: 0 }, { height: 1.68 }), true);
  assert.equal(lasers.hitsBody({ x: 0, z: 0 }, { height: 1.08 }), true);
  assert.equal(lasers.hitsBody({ x: 0, z: 0 }, { height: 0.58 }), false);
  lasers.dispose();
  const low = createLaserSystem(new THREE.Scene());
  low.add({ start: new THREE.Vector3(-3, 0.3, 0), end: new THREE.Vector3(3, 0.3, 0) });
  assert.equal(low.hitsBody({ x: 0, z: 0 }, { height: 1.68 }), true);
  assert.equal(low.hitsBody({ x: 0, z: 0 }, { height: 1.68, jump: 0.5 }), false);
  low.dispose();
});
