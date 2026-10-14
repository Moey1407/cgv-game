import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEscapeMission, ESCAPE_EXIT, OVERRIDE_SECONDS } from '../src/escape.js';
import { createStageSystem } from '../src/stages.js';
import { createNavigator } from '../src/navigation.js';
import { playerIlluminated, updateGuardAwareness, hearSound, DECOY_COMMIT_SECONDS } from '../src/visibility.js';

function fixture() {
  const colliders = [];
  const level = new THREE.Group();
  const material = new THREE.MeshBasicMaterial();
  const stages = createStageSystem({ scene: new THREE.Scene(), level,
    minimapScene: new THREE.Scene(), colliders, lights: [], sharedUniforms: {},
    materials: { dark: material, stone: material } });
  const mission = createEscapeMission({ level, colliders, createLabelPanel: () => new THREE.Mesh() });
  mission.reset(3);
  return { mission, colliders, config: stages.configurations[3] };
}
function tick(mission, extra = {}) {
  return mission.update({ dt: 0.1, player: new THREE.Vector3(0, 0, 10), yaw: 0,
    holding: true, active: true, hasDiamond: true, ...extra });
}
function open(mission, door) {
  return tick(mission, { dt: OVERRIDE_SECONDS, player: new THREE.Vector3(door.x, 0, door.z + 2) });
}

test('override requires range, facing and clear front access', () => {
  const { mission, colliders } = fixture();
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 10), 0).id, 1);
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 10), Math.PI), undefined);
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 10), 0, Math.PI / 2), undefined);
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 12), 0), undefined);
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 6), Math.PI), undefined);
  colliders.push({ stage: 3, minX: -1, maxX: 1, minZ: 9.4, maxZ: 9.5 });
  assert.equal(mission.eligible(new THREE.Vector3(0, 0, 10), 0), undefined);
});

test('release, moving away and pause cancel progress; override noise is bounded', () => {
  const { mission } = fixture();
  let result = tick(mission, { dt: 1 });
  assert.equal(mission.doors[0].progress, 1);
  assert.equal(result.noises.filter((noise) => noise.source === 'override').length, 1);
  result = tick(mission);
  assert.equal(result.noises.length, 0);
  tick(mission, { holding: false });
  assert.equal(mission.doors[0].progress, 0);
  tick(mission, { dt: 1 });
  tick(mission, { player: new THREE.Vector3(0, 0, 18) });
  assert.equal(mission.doors[0].progress, 0);
  tick(mission, { dt: 1 });
  tick(mission, { dt: 30, active: false });
  assert.equal(mission.doors[0].progress, 0);
  assert.equal(mission.doors[0].opened, false);
});

test('each barrier blocks player and guard routes until its door opens', () => {
  const { mission, colliders, config } = fixture();
  let navigator = createNavigator(colliders, 3);
  assert.equal(navigator.blocked({ x: 0, z: 8 }), true);
  assert.ok(navigator.route(config.spawn, ESCAPE_EXIT).at(-1).z > 8);
  const first = open(mission, mission.doors[0]);
  assert.deepEqual(first.opened, [1]);
  assert.equal(mission.doors[0].panel.visible, false);
  navigator = createNavigator(colliders, 3);
  assert.equal(navigator.canTravel({ x: 0, z: 9 }, { x: 0, z: 7 }), true);
  assert.ok(navigator.route(config.spawn, ESCAPE_EXIT).at(-1).z > -8);
  assert.equal(navigator.blocked({ x: 9, z: -8 }), true);
  assert.deepEqual(open(mission, mission.doors[1]).opened, [2]);
  navigator = createNavigator(colliders, 3);
  assert.equal(navigator.canTravel({ x: 9, z: -7 }, { x: 9, z: -9 }), true);
  for (const start of [config.spawn, ...config.guards.map((guard) => guard.position)]) {
    const path = navigator.route(start, ESCAPE_EXIT);
    assert.ok(Math.hypot(path.at(-1).x - ESCAPE_EXIT.x, path.at(-1).z - ESCAPE_EXIT.z) < 0.3);
    let previous = start;
    for (const point of path) {
      assert.equal(navigator.canTravel(previous, point), true);
      previous = point;
    }
  }
});

test('Echo sync plates can open the first barrier without override noise', () => {
  const { mission, colliders } = fixture();
  assert.equal(mission.openDoor(1), true);
  assert.equal(mission.openDoor(1), false);
  assert.equal(mission.doors[0].opened, true);
  assert.equal(mission.doors[0].panel.visible, false);
  assert.equal(mission.doors[0].collider.disabled, true);
  assert.equal(createNavigator(colliders, 3).canTravel({ x: 0, z: 9 }, { x: 0, z: 7 }), true);
});

test('carrying the diamond stays silent while overrides still emit noise', () => {
  const { mission } = fixture();
  for (let second = 0; second < 60; second++) {
    assert.equal(tick(mission, { dt: 1, holding: false }).noises.length, 0);
  }
  assert.equal(tick(mission, { dt: 30, holding: false, active: false }).noises.length, 0);
  const result = tick(mission, { dt: 1, holding: true });
  assert.equal(result.noises.length, 1);
  assert.equal(result.noises[0].source, 'override');
});

test('success requires the carried diamond and both open doors; retry restores them', () => {
  const { mission } = fixture();
  assert.equal(mission.canEscape(ESCAPE_EXIT, true), false);
  open(mission, mission.doors[0]);
  assert.equal(mission.canEscape(ESCAPE_EXIT, true), false);
  open(mission, mission.doors[1]);
  assert.equal(mission.canEscape(ESCAPE_EXIT, false), false);
  assert.equal(tick(mission, { player: ESCAPE_EXIT, holding: false }).finished, true);
  assert.equal(tick(mission, { player: ESCAPE_EXIT, holding: false }).finished, false);
  mission.reset(3);
  assert.equal(mission.canEscape(ESCAPE_EXIT, true), false);
  for (const door of mission.doors) {
    assert.equal(door.opened, false);
    assert.equal(door.collider.disabled, false);
    assert.equal(door.panel.visible, true);
    assert.equal(door.progress, 0);
  }
});

function guardAt(x, z) {
  return { group: { position: new THREE.Vector3(x, 0, z), rotation: { y: 0 } },
    state: 'patrol', suspicion: 0, searchTimer: 0,
    target: new THREE.Vector3(), lastSeen: new THREE.Vector3() };
}

test('guards see illuminated players in range/FOV with clear access, then search last-seen positions independently', () => {
  const a = guardAt(0, 0), b = guardAt(20, 0);
  const player = new THREE.Vector3(0, 0, 5);
  updateGuardAwareness(a, player, false, [], 1);
  assert.equal(a.suspicion, 0);
  updateGuardAwareness(a, new THREE.Vector3(0, 0, -5), true, [], 1);
  assert.equal(a.suspicion, 0);
  const wall = { stage: 3, minX: -2, maxX: 2, minZ: 2, maxZ: 2.4 };
  updateGuardAwareness(a, player, true, [wall], 1);
  assert.equal(a.suspicion, 0);
  updateGuardAwareness(a, player, true, [], 0.25);
  assert.equal(a.state, 'patrol');
  updateGuardAwareness(a, player, true, [], 0.25);
  assert.equal(a.state, 'pursue');
  updateGuardAwareness(b, player, true, [], 1);
  assert.equal(b.state, 'patrol');
  updateGuardAwareness(a, new THREE.Vector3(7, 0, 5), false, [], 0.1);
  assert.equal(a.state, 'search');
  assert.deepEqual(a.target.toArray(), [0, 0, 5]);
  assert.deepEqual(b.target.toArray(), [0, 0, 0]);
  updateGuardAwareness(a, player, false, [], 4);
  assert.equal(a.state, 'patrol');
});

test('exposure follows the rendered wave bands, not every sound throughout its lifetime', () => {
  // Distance is measured on the ground plane, matching the shader, so the
  // offset here is horizontal rather than the emitter's height.
  const ring = { position: new THREE.Vector3(0, 0.6, 0), duration: 1, maxRadius: 10,
    age: 0.05, source: 'sonar' };
  const player = new THREE.Vector3(0.5, 0, 0);
  assert.equal(playerIlluminated([ring], player), true);
  ring.age = 0.4;
  assert.equal(playerIlluminated([ring], player), false);
  ring.age = 0.165;
  assert.equal(playerIlluminated([ring], player), true);
  ring.source = 'briefing';
  assert.equal(playerIlluminated([ring], player), false);
});

test('exposure ignores how high the sound was made', () => {
  // A guard pulse leaves at chest height and a footstep at ankle height; both
  // sweep the floor the same way, so neither should expose differently.
  const player = new THREE.Vector3(0.5, 0, 0);
  const atHeight = (y) => ({ position: new THREE.Vector3(0, y, 0), duration: 1,
    maxRadius: 10, age: 0.05, source: 'player' });
  assert.equal(playerIlluminated([atHeight(0.12)], player), true);
  assert.equal(playerIlluminated([atHeight(0.65)], player), true);
  assert.equal(playerIlluminated([atHeight(1.8)], player), true);
});

test('decoy investigations commit briefly and guards hear/reset independent targets', () => {
  const a = guardAt(0, 0), b = guardAt(20, 0);
  a.active = b.active = true;
  a.decoyFocus = b.decoyFocus = 0;
  const decoy = new THREE.Vector3(-5, 0, 0);
  assert.equal(hearSound(a, decoy, 15, 'decoy'), true);
  assert.equal(hearSound(b, decoy, 15, 'decoy'), false);
  assert.equal(a.decoyFocus, DECOY_COMMIT_SECONDS);
  assert.ok(DECOY_COMMIT_SECONDS > OVERRIDE_SECONDS + 1);
  assert.equal(b.decoyFocus, 0);
  assert.deepEqual(a.target.toArray(), [-5, 0, 0]);
  assert.equal(hearSound(a, new THREE.Vector3(0, 0, 5), 13, 'override'), false);
  assert.deepEqual(a.target.toArray(), [-5, 0, 0]);
  a.decoyFocus = 0;
  assert.equal(hearSound(a, new THREE.Vector3(0, 0, 5), 13, 'override'), true);
  assert.deepEqual(a.target.toArray(), [0, 0, 5]);
  assert.deepEqual(b.target.toArray(), [0, 0, 0]);
});

test('override alerts stay on the accessible side of a closed door and remain local', () => {
  const { mission, colliders } = fixture();
  const source = new THREE.Vector3(0, 0.6, 10);
  const near = guardAt(0, 12), beyond = guardAt(0, 6), distant = guardAt(14, 12);
  for (const guard of [near, beyond, distant]) { guard.active = true; guard.decoyFocus = 0; }
  const noise = tick(mission).noises[0];
  assert.equal(noise.radius, 7);
  assert.equal(hearSound(near, source, noise.radius, 'override', colliders), true);
  assert.equal(hearSound(beyond, source, noise.radius, 'override', colliders), false);
  assert.equal(beyond.state, 'patrol');
  assert.equal(hearSound(distant, source, noise.radius, 'override', colliders), false);
  open(mission, mission.doors[0]);
  assert.equal(hearSound(beyond, source, noise.radius, 'override', colliders), true);
});

test('first door has a clear approach, protective cover and patrols away from both thresholds', () => {
  const { config, colliders } = fixture();
  const navigator = createNavigator(colliders, 3);
  assert.equal(navigator.canTravel(config.spawn, { x: 0, z: 10 }), true);
  const override = new THREE.Vector3(0, 0.6, 10);
  const nearestPatrolPoint = config.guards[0].waypoints[1];
  const guard = guardAt(nearestPatrolPoint.x, nearestPatrolPoint.z);
  guard.group.rotation.y = Math.atan2(-nearestPatrolPoint.x, 10 - nearestPatrolPoint.z);
  guard.active = true;
  guard.decoyFocus = 0;
  assert.equal(hearSound(guard, override, 7, 'override', colliders), false);
  assert.equal(updateGuardAwareness(guard, new THREE.Vector3(0, 0, 10), true, colliders, 1), false);
  for (const settings of config.guards) {
    let previous = settings.position;
    for (const target of [...settings.waypoints, settings.waypoints[0]]) {
      const route = navigator.route(previous, target);
      assert.ok(Math.hypot(route.at(-1).x - target.x, route.at(-1).z - target.z) < 0.4);
      previous = route.at(-1);
    }
  }
  for (const point of config.guards[1].waypoints) assert.ok(point.x <= -9);
});
