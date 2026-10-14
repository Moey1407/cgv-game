import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { hasClearAccess } from '../src/interactions.js';
import { createGalleriesMission } from '../src/galleries.js';

function fixture() {
  const gallery = new THREE.Group();
  const colliders = [];
  const mission = createGalleriesMission({
    gallery,
    materials: { wall: null, stone: null },
    createLabelPanel: (text, width) => new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4)),
    addBox(name, size, position, material, solid, parent, stage) {
      if (solid) colliders.push({ name, stage,
        minX: position.x - size.x / 2, maxX: position.x + size.x / 2,
        minZ: position.z - size.z / 2, maxZ: position.z + size.z / 2 });
    }
  });
  return { gallery, colliders, mission };
}

test('key pickup is accessible from inside the room but blocked behind its north wall', () => {
  const { mission, colliders } = fixture();
  assert.equal(hasClearAccess({ x: 12.5, z: -19 }, mission.keyPosition, colliders, 1), true);
  assert.equal(hasClearAccess({ x: 12.5, z: -22.1 }, mission.keyPosition, colliders, 1), false);
  assert.equal(hasClearAccess({ x: 12.5, z: -17 }, mission.keyPosition, colliders, 1), false);
});

test('vault reader is accessible from the gallery side and blocked from behind the door', () => {
  const { mission, colliders } = fixture();
  assert.equal(hasClearAccess({ x: 0, z: -19 }, mission.entrancePosition, colliders, 1), true);
  assert.equal(hasClearAccess({ x: 0, z: -22 }, mission.entrancePosition, colliders, 1), false);
});

test('security doorway admits the player radius along the approach to the key', () => {
  const { colliders } = fixture();
  const radius = 0.46;
  for (let z = -16; z >= -19.4; z -= 0.1) {
    assert.equal(colliders.some((box) => 12.5 + radius > box.minX &&
      12.5 - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ), false);
  }
});

test('key visibility resets on retry and disappears on pickup or a different stage', () => {
  const { gallery, mission } = fixture();
  const keycard = gallery.children.find((child) => child.isGroup);
  mission.setStage(1, false);
  assert.equal(keycard.visible, true);
  mission.setStage(1, true);
  assert.equal(keycard.visible, false);
  mission.setStage(2, true);
  assert.equal(keycard.visible, false);
  mission.setStage(1, false);
  assert.equal(keycard.visible, true);
});

test('access checks respect stage, range, parallel segments and diagonal wall crossings', () => {
  const wall = { stage: 1, minX: -0.1, maxX: 0.1, minZ: -1, maxZ: 1 };
  assert.equal(hasClearAccess({ x: -1, z: 0 }, { x: 1, z: 0 }, [wall], 1), false);
  assert.equal(hasClearAccess({ x: -1, z: 0 }, { x: 1, z: 0 }, [wall], 2), true);
  assert.equal(hasClearAccess({ x: -1, z: -0.5 }, { x: 1, z: 0.5 }, [wall], 1), false);
  assert.equal(hasClearAccess({ x: 1, z: -0.5 }, { x: 1, z: 0.5 }, [wall], 1), true);
  assert.equal(hasClearAccess({ x: 0, z: 0 }, { x: 2.25, z: 0 }, [], 1), false);
  assert.equal(hasClearAccess({ x: -1, z: 0 }, { x: 1, z: 0 }, [{ ...wall, stage: null }], 2), false);
});
