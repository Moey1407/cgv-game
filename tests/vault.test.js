import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVaultMission, SIGNATURES } from '../src/vault.js';
import { hasClearAccess } from '../src/interactions.js';
import { createStageSystem } from '../src/stages.js';
import { createNavigator } from '../src/navigation.js';

function fixture(random = () => 0.99) {
  const colliders = [];
  const mission = createVaultMission({ level: new THREE.Group(),
    materials: { stone: new THREE.MeshBasicMaterial() }, colliders,
    createLabelPanel: () => new THREE.Mesh(), random });
  mission.reset(2);
  return { mission, colliders };
}
function ring(position, source = 'sonar', maxRadius = 16) {
  return { position: position.clone(), source, maxRadius };
}
function scan(mission, exhibit) {
  mission.scanWave(ring(exhibit.position), 0, 0.1);
}

test('only an arriving player sonar wave reveals a case; sound beyond its radius does not', () => {
  const { mission } = fixture();
  const exhibit = mission.cases[0];
  const origin = exhibit.position.clone();
  origin.x += 5;
  const pulse = ring(origin);
  assert.equal(mission.scanWave(pulse, 0, 4.9).length, 0);
  assert.equal(exhibit.scanned, false);
  assert.equal(mission.scanWave(pulse, 4.9, 5.1).length, 1);
  assert.equal(exhibit.scanned, true);
  assert.equal(mission.scanWave(pulse, 0, 6).length, 0);
  mission.reset(2);
  for (const source of ['player', 'guard', 'decoy']) mission.scanWave(ring(origin, source), 0, 6);
  assert.equal(exhibit.scanned, false);
  assert.equal(mission.scanWave(ring(origin, 'sonar', 4), 0, 6).length, 0);
});

test('exactly one case matches the stored signature and retry preserves the solution', () => {
  const { mission } = fixture();
  assert.equal(mission.cases.filter((exhibit) => exhibit.signature === mission.keySignature).length, 1);
  assert.ok(SIGNATURES[mission.keySignature]);
  const solution = mission.cases.find((exhibit) => exhibit.signature === mission.keySignature).id;
  mission.reset(2);
  assert.equal(mission.cases.find((exhibit) => exhibit.signature === mission.keySignature).id, solution);
});

test('new heists randomize both the key and all three case signatures without duplicate matches', () => {
  const keys = new Set(), arrangements = new Set(), solutions = new Set();
  for (const first of [0.1, 0.5, 0.9]) for (const second of [0.1, 0.9]) for (const third of [0.1, 0.5, 0.9]) {
    const draws = [first, second, third];
    let cursor = 0;
    const { mission } = fixture(() => draws[cursor++ % draws.length]);
    keys.add(mission.keySignature);
    arrangements.add(mission.cases.map((exhibit) => exhibit.signature).join(','));
    const matches = mission.cases.filter((exhibit) => exhibit.signature === mission.keySignature);
    assert.equal(matches.length, 1);
    solutions.add(matches[0].id);
    assert.equal(new Set(mission.cases.map((exhibit) => exhibit.signature)).size, 3);
    assert.ok(mission.readout().includes(SIGNATURES[mission.keySignature].name));
  }
  assert.equal(keys.size, 3);
  assert.equal(arrangements.size, 6);
  assert.equal(solutions.size, 3);
  const draws = [0.1, 0.1, 0.1, 0.9, 0.9, 0.9];
  let cursor = 0;
  const { mission } = fixture(() => draws[cursor++ % draws.length]);
  const original = mission.keySignature;
  mission.reset(2);
  assert.equal(mission.keySignature, original);
  mission.newHeist();
  mission.reset(2);
  assert.notEqual(mission.keySignature, original);
});

test('middle spawn is clear and outside initial scan range; whole-map patrol routes use openings', () => {
  const { mission, colliders } = fixture();
  const material = new THREE.MeshBasicMaterial();
  const stages = createStageSystem({ scene: new THREE.Scene(), level: new THREE.Group(),
    minimapScene: new THREE.Scene(), colliders, lights: [], sharedUniforms: {},
    materials: { dark: material, stone: material } });
  const config = stages.configurations[2];
  const navigator = createNavigator(colliders, 2);
  assert.equal(navigator.blocked(config.spawn), false);
  assert.equal(navigator.blocked(config.guard), false);
  assert.ok(config.guard.distanceTo(config.spawn) > 7);
  assert.ok(config.guard.distanceTo(config.spawn) < 12);
  for (const exhibit of mission.cases) assert.ok(exhibit.position.distanceTo(config.spawn) > 10);
  let previous = config.guard;
  for (const target of [...config.waypoints, config.waypoints[0]]) {
    const path = navigator.route(previous, target);
    assert.ok(path.length > 0);
    for (const point of path) {
      assert.equal(navigator.canTravel(previous, point), true);
      previous = point;
    }
    assert.ok(Math.hypot(previous.x - target.x, previous.z - target.z) < 0.4);
  }
  const inaccessible = navigator.route(config.guard, mission.cases[0].position);
  assert.ok(inaccessible.length > 0);
  assert.equal(navigator.blocked(inaccessible.at(-1)), false);
});

test('wrong choice produces a recoverable, rate-limited alert; only the matching scanned case unlocks', () => {
  const { mission } = fixture();
  const wrong = mission.cases.find((exhibit) => exhibit.signature !== mission.keySignature);
  const correct = mission.cases.find((exhibit) => exhibit.signature === mission.keySignature);
  assert.equal(mission.tryUnlock(correct, true), 'scan-first');
  scan(mission, wrong);
  scan(mission, correct);
  assert.equal(mission.tryUnlock(wrong, false), 'no-key');
  assert.equal(mission.tryUnlock(wrong, true), 'wrong');
  assert.equal(mission.acquired, false);
  assert.equal(mission.tryUnlock(wrong, true), 'cooldown');
  mission.update(0);
  assert.equal(mission.tryUnlock(wrong, true), 'cooldown');
  mission.update(2);
  assert.equal(mission.tryUnlock(wrong, true), 'wrong');
  assert.equal(mission.tryUnlock(correct, true), 'diamond');
  assert.equal(mission.acquired, true);
  assert.equal(correct.diamond.visible, false);
  assert.equal(mission.tryUnlock(correct, true), 'already-open');
});

test('a matching case can hand off to safecracking before the target is acquired', () => {
  const { mission } = fixture();
  const correct = mission.cases.find((exhibit) => exhibit.signature === mission.keySignature);
  scan(mission, correct);
  assert.equal(mission.inspect(correct, true), 'safe-ready');
  assert.equal(mission.acquired, false);
  assert.equal(correct.diamond.visible, true);
  assert.equal(mission.acquire(correct), true);
  assert.equal(mission.acquired, true);
  assert.equal(correct.diamond.visible, false);
});

test('response persists for comparison, pause preserves it and retry clears all puzzle state', () => {
  const { mission } = fixture();
  const exhibit = mission.cases[0];
  scan(mission, exhibit);
  mission.update(0.5);
  const remaining = exhibit.responseTime;
  mission.update(0);
  assert.equal(exhibit.responseTime, remaining);
  mission.update(10);
  assert.equal(exhibit.responseTime, 0);
  assert.equal(exhibit.scanned, true);
  assert.match(mission.readout(), /A: \| SINGLE ECHO/);
  mission.reset(2);
  assert.equal(mission.acquired, false);
  for (const entry of mission.cases) {
    assert.equal(entry.scanned, false);
    assert.equal(entry.unlocked, false);
    assert.equal(entry.diamond.visible, true);
    assert.equal(entry.echoes.every(({ mesh }) => !mesh.visible), true);
  }
});

test('all cases have usable front access, block access through their bodies and respect walls', () => {
  const { mission, colliders } = fixture();
  for (const exhibit of mission.cases) {
    const front = { x: exhibit.x, z: exhibit.z + 1.8 };
    assert.equal(hasClearAccess(front, exhibit.access, colliders, 2), true);
    assert.equal(hasClearAccess({ x: exhibit.x, z: exhibit.z - 1 }, exhibit.access, colliders, 2), false);
    const wall = { stage: 2, minX: exhibit.x - 2, maxX: exhibit.x + 2,
      minZ: exhibit.z + 1.4, maxZ: exhibit.z + 1.5 };
    assert.equal(hasClearAccess(front, exhibit.access, [...colliders, wall], 2), false);
  }
});

test('all case access points are reachable in the actual vault layout without stepping on plates', () => {
  const { mission, colliders } = fixture();
  const material = new THREE.MeshBasicMaterial();
  const stages = createStageSystem({ scene: new THREE.Scene(), level: new THREE.Group(),
    minimapScene: new THREE.Scene(), colliders, lights: [], sharedUniforms: {},
    materials: { dark: material, stone: material } });
  const obstacles = colliders.filter((box) => box.stage === 2).concat(stages.hazards.traps.map((trap) => ({
    minX: trap.x - trap.halfX, maxX: trap.x + trap.halfX,
    minZ: trap.z - trap.halfZ, maxZ: trap.z + trap.halfZ
  })));
  const radius = 0.46;
  const blocked = (x, z) => obstacles.some((box) => x + radius > box.minX &&
    x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ);
  const queue = [[0, 18]];
  const seen = new Set(['0,18']);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, z] = queue[cursor];
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const nx = x + dx, nz = z + dz;
      const key = nx + ',' + nz;
      if (Math.abs(nx) > 16 || Math.abs(nz) > 22 || seen.has(key) || blocked(nx, nz)) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  for (const exhibit of mission.cases) {
    assert.equal(queue.some(([x, z]) => hasClearAccess({ x, z }, exhibit.access, colliders, 2)), true, exhibit.id);
  }
});
