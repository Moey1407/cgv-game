import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPerson } from '../src/render/people.js';

test('human silhouettes stay single-draw, lightweight and fully skin-bound', () => {
  for (const style of ['suit', 'dress', 'guard']) {
    const actor = createPerson({ style });
    const meshes = []; actor.root.traverse((node) => { if (node.isMesh) meshes.push(node); });
    assert.equal(meshes.length, 1);
    const mesh = meshes[0], g = mesh.geometry;
    assert.ok(g.index.count / 3 < 12000, `${style} must stay under the per-person triangle budget`);
    assert.equal(g.groups.length, 0, 'one material, no per-clothing draws');
    assert.equal(mesh.material.vertexColors, true);
    for (let i = 0; i < g.attributes.skinWeight.count; i++) {
      const w = g.attributes.skinWeight;
      assert.ok(Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < .00001);
    }
    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.y > 1.7 && size.y < 2, 'adult human height');
    assert.ok(size.x < .7, 'no oversized head or shoulders');
    actor.dispose();
  }
});

test('people support grounded body variation and eased walking animation', () => {
  const actor = createPerson({ height: .95, build: 1.06, style: 'dress', hairStyle: 'bob' });
  assert.equal(actor.root.scale.y, .95);
  assert.equal(actor.root.scale.x, 1.06);
  const leg = actor.model.skeleton.getBoneByName('leg--1');
  actor.play('walk'); actor.update(.15);
  assert.notEqual(leg.rotation.x, 0);
  actor.play('idle');
  for (let i = 0; i < 100; i++) actor.update(.1);
  assert.ok(Math.abs(leg.rotation.x) < .001, 'walking eases into a standing pose');
  actor.dispose();
});

test('the gala dress covers the upper legs through the running pose', () => {
  const colour = 0x123f3a;
  const actor = createPerson({ style: 'dress', colour });
  const position = actor.model.geometry.attributes.position;
  const vertexColour = actor.model.geometry.attributes.color;
  const dressColour = new THREE.Color(colour);
  let hem = Infinity;
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(vertexColour.getX(i) - dressColour.r) < 0.0001 &&
        Math.abs(vertexColour.getY(i) - dressColour.g) < 0.0001 &&
        Math.abs(vertexColour.getZ(i) - dressColour.b) < 0.0001) {
      hem = Math.min(hem, position.getY(i));
    }
  }
  assert.ok(hem < 0.1, 'dress hem should reach close to the shoes');
  actor.play('run');
  const legs = ['leg--1', 'leg-1'].map((name) => actor.model.skeleton.getBoneByName(name));
  for (let i = 0; i < 60; i++) {
    actor.update(0.05);
    for (const leg of legs) assert.ok(Math.abs(leg.rotation.x) <= 0.321, 'running legs stay inside the skirt');
  }
  actor.dispose();
});
