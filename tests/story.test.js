import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STORY } from '../src/story.js';
import { createStageSystem } from '../src/stages.js';

test('the three acts form one connected heist', () => {
  assert.equal(STORY.protagonist, 'Imani Sulé');
  assert.match(STORY.opening, /recording reel/i);
  assert.match(STORY.stages[1].objective, /staff key/i);
  assert.match(STORY.stages[2].objective, /H-1968-07/);
  assert.match(STORY.stages[3].objective, /emergency lift/i);
  assert.match(STORY.outro, /reel remembers/i);
});

test('the visual arc gets darker as Imani descends and containment begins', () => {
  const material = new THREE.MeshBasicMaterial();
  const stages = createStageSystem({
    scene: new THREE.Scene(),
    level: new THREE.Group(),
    minimapScene: new THREE.Scene(),
    materials: { dark: material, stone: material },
    colliders: [],
    lights: [],
    sharedUniforms: {}
  });
  const gallery = stages.configurations[1];
  const store = stages.configurations[2];
  const containment = stages.configurations[3];
  assert.ok(gallery.ambient > store.ambient);
  assert.ok(store.ambient > containment.ambient);
  assert.ok(gallery.fogDensity < store.fogDensity);
  assert.ok(store.fogDensity < containment.fogDensity);
  assert.equal(containment.lightScale, 0);
});
