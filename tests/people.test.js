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

test('a dress carries no thigh: nothing is skinned to the leg bones, so nothing can leave the skirt', () => {
  const skinnedToLegs = (actor) => {
    const skeleton = actor.model.skeleton;
    const legBones = new Set(['leg--1', 'leg-1']
      .map((name) => skeleton.bones.indexOf(skeleton.getBoneByName(name))));
    const index = actor.model.geometry.attributes.skinIndex;
    const weight = actor.model.geometry.attributes.skinWeight;
    let count = 0;
    for (let i = 0; i < index.count; i++) {
      for (const axis of ['getX', 'getY', 'getZ', 'getW']) {
        if (legBones.has(index[axis](i)) && weight[axis](i) > 0) { count += 1; break; }
      }
    }
    return count;
  };
  const dress = createPerson({ style: 'dress' });
  const suit = createPerson({ style: 'suit' });
  assert.equal(skinnedToLegs(dress), 0, 'a dressed character is built from the ankle up, with no thigh to clip through the hem');
  assert.ok(skinnedToLegs(suit) > 0, 'trousered characters still have full legs');
  dress.dispose();
  suit.dispose();
});

test('the neck is shared between chest and head so it cannot float away when she looks down', () => {
  const actor = createPerson({ style: 'suit' });
  const skeleton = actor.model.skeleton;
  const head = skeleton.bones.indexOf(skeleton.getBoneByName('head'));
  const chest = skeleton.bones.indexOf(skeleton.getBoneByName('chest'));
  const index = actor.model.geometry.attributes.skinIndex;
  const weight = actor.model.geometry.attributes.skinWeight;
  let shared = 0;
  for (let i = 0; i < index.count; i++) {
    const pairs = [[index.getX(i), weight.getX(i)], [index.getY(i), weight.getY(i)]];
    const onHead = pairs.some(([b, w]) => b === head && w > 0.01);
    const onChest = pairs.some(([b, w]) => b === chest && w > 0.01);
    if (onHead && onChest) shared += 1;
  }
  assert.ok(shared > 0, 'the neck must blend across both bones, not ride the head alone');
  actor.dispose();
});

test('crouching and crawling pose the skeleton and return cleanly to standing', () => {
  const actor = createPerson({ style: 'suit' });
  const skeleton = actor.model.skeleton;
  const hips = skeleton.getBoneByName('hips');
  const chest = skeleton.getBoneByName('chest');
  const settle = (mode, stance) => {
    actor.play(mode, stance);
    for (let i = 0; i < 90; i++) actor.update(1 / 60);
    return { hipY: hips.position.y, lean: chest.rotation.x };
  };
  const stand = settle('idle', 'stand');
  assert.ok(Math.abs(stand.hipY - 0.94) < 0.05, 'standing hips sit at full height');
  assert.ok(Math.abs(stand.lean) < 0.05, 'standing torso is upright');

  const crouch = settle('idle', 'crouch');
  assert.ok(crouch.hipY < stand.hipY - 0.3, 'crouching drops the hips rather than squashing the figure');
  assert.ok(crouch.lean > 0.2, 'crouching leans the torso forward');

  const crawl = settle('idle', 'crawl');
  assert.ok(crawl.hipY < crouch.hipY, 'crawling is lower than crouching');
  assert.ok(crawl.lean > 1, 'crawling brings the torso down near horizontal');

  const back = settle('idle', 'stand');
  assert.ok(Math.abs(back.hipY - 0.94) < 0.05, 'standing up again restores full height');
  assert.ok(Math.abs(back.lean) < 0.05, 'standing up again restores an upright torso');
  actor.dispose();
});

test('crouching and crawling keep the soles on the floor instead of sinking through it', () => {
  // The sole sits at this point in the knee bone's own space; where it ends up in
  // the world is the whole question, since a hip height that does not match the
  // fold of the leg buries the feet.
  const SOLE = new THREE.Vector3(0, -0.47, 0.049);
  for (const style of ['suit', 'guard']) {
    const actor = createPerson({ style });
    const knees = ['knee-0', 'knee-1'].map((n) => actor.model.skeleton.getBoneByName(n));
    for (const stance of ['stand', 'crouch', 'crawl']) {
      actor.play('idle', stance);
      for (let i = 0; i < 120; i++) actor.update(1 / 60);
      actor.root.updateMatrixWorld(true);
      for (const knee of knees) {
        const y = SOLE.clone().applyMatrix4(knee.matrixWorld).y;
        assert.ok(y > -0.06, `${style} ${stance}: sole sank to ${y.toFixed(3)}, below the floor`);
        assert.ok(y < 0.35, `${style} ${stance}: sole floating at ${y.toFixed(3)}`);
      }
    }
    actor.dispose();
  }
});