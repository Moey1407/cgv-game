// Level 1 layout check. Rebuilds the stage-1 collider set exactly as
// createWorld() does, then verifies the patrol loop, both routes and the
// mission path are all actually walkable through the new rooms.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGalleriesMission, surfaceAt, noiseScaleAt, FLOOR_ZONES } from '../src/galleries.js';
import { createNavigator, stepToward, unstick } from '../src/navigation.js';

const PLAYER_RADIUS = 0.46;
const GUARD_RADIUS = 0.48;

// Mirrors the stage-1 waypoints in src/stages.js.
const WAYPOINTS = [
  [12.5, -15], [-1.5, -13], [-11, -14.5], [-7.6, 5],
  [-14.5, 12.5], [0, 10.5], [10.5, 6], [11, -10]
];

function buildColliders() {
  const colliders = [];
  const gallery = new THREE.Group();
  const addBox = (name, size, position, material, solid = true, parent = gallery, stage = null) => {
    if (!solid) return;
    colliders.push({ name, stage,
      minX: position.x - size.x / 2, maxX: position.x + size.x / 2,
      minZ: position.z - size.z / 2, maxZ: position.z + size.z / 2 });
  };
  createGalleriesMission({
    gallery,
    addBox,
    materials: { wall: null, stone: null },
    createLabelPanel: (text, width) => new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4))
  });

  // Outer shell.
  for (const [size, position] of [
    [[34, 0.45], [0, -23]], [[34, 0.45], [0, 23]],
    [[0.45, 46], [-17, 0]], [[0.45, 46], [17, 0]]
  ]) {
    colliders.push({ name: 'shell', stage: null,
      minX: position[0] - size[0] / 2, maxX: position[0] + size[0] / 2,
      minZ: position[1] - size[1] / 2, maxZ: position[1] + size[1] / 2 });
  }
  // Hall columns.
  for (const [x, z] of [[-3.4, 10.5], [3.4, 10.5], [-3.4, 1.5], [3.4, 1.5]]) {
    colliders.push({ name: 'column', stage: 1,
      minX: x - 0.64, maxX: x + 0.64, minZ: z - 0.64, maxZ: z + 0.64 });
  }
  // Pedestals.
  for (const [x, z] of [[-13.5, -6], [-11, 19], [2.6, -1.5], [10.5, -12], [12.5, 11.5]]) {
    colliders.push({ name: 'pedestal', stage: 1,
      minX: x - 0.725, maxX: x + 0.725, minZ: z - 0.725, maxZ: z + 0.725 });
  }
  return colliders;
}

const colliders = buildColliders();
const blockedFor = (radius) => ({ x, z }) => colliders.some((box) =>
  (!box.stage || box.stage === 1) &&
  x + radius > box.minX && x - radius < box.maxX &&
  z + radius > box.minZ && z - radius < box.maxZ);

test('no patrol waypoint or key position sits inside geometry', () => {
  const blocked = blockedFor(GUARD_RADIUS);
  for (const [x, z] of WAYPOINTS) {
    assert.equal(blocked({ x, z }), false, `waypoint ${x},${z} is inside a collider`);
  }
  const playerBlocked = blockedFor(PLAYER_RADIUS);
  for (const [x, z] of [[0, 18], [12.5, -19], [0, -19.5]]) {
    assert.equal(playerBlocked({ x, z }), false, `position ${x},${z} is inside a collider`);
  }
});

test('every patrol waypoint has room around it', () => {
  // A waypoint sitting a couple of centimetres off a wall is what jammed the
  // original patrol: the guard creeps onto the collision boundary and then no
  // step in any direction is legal. Planning clearance is 0.22m, so insist on
  // comfortably more than that.
  const bare = createNavigator(colliders, 1, GUARD_RADIUS, 0);
  for (const [x, z] of WAYPOINTS) {
    let clear = 0;
    for (let r = 0.05; r <= 1.2; r += 0.05) {
      let hit = false;
      for (let a = 0; a < 16; a += 1) {
        const angle = a / 16 * Math.PI * 2;
        if (bare.blocked({ x: x + Math.cos(angle) * r, z: z + Math.sin(angle) * r })) { hit = true; break; }
      }
      if (hit) break;
      clear = r;
    }
    assert.ok(clear >= 0.35,
      `waypoint ${x},${z} has only ${clear.toFixed(2)}m of clearance - move it off the wall`);
  }
});

test('routes are planned with a margin and come back smoothed', () => {
  const navigator = createNavigator(colliders, 1, GUARD_RADIUS);
  const route = navigator.route({ x: 12.5, z: -15 }, { x: -1.5, z: -13 });
  assert.ok(route.length > 0, 'no route produced');
  // String-pulling should collapse a half-metre staircase into a few legs.
  assert.ok(route.length < 12, `route still has ${route.length} nodes - smoothing is not running`);
  // Every leg must be walkable in a straight line, which is what lets the
  // guard follow it without sliding along walls.
  let anchor = { x: 12.5, z: -15 };
  for (const point of route) {
    assert.equal(navigator.canTravel(anchor, point), true,
      `leg to ${point.x},${point.z} is not walkable in a straight line`);
    anchor = point;
  }
});

test('the patrol can path around its whole loop', () => {
  const navigator = createNavigator(colliders, 1, GUARD_RADIUS);
  for (let i = 0; i < WAYPOINTS.length; i += 1) {
    const from = WAYPOINTS[i];
    const to = WAYPOINTS[(i + 1) % WAYPOINTS.length];
    const route = navigator.route({ x: from[0], z: from[1] }, { x: to[0], z: to[1] });
    assert.ok(route.length > 0, `no route from ${from} to ${to}`);
    const end = route[route.length - 1];
    assert.ok(Math.hypot(end.x - to[0], end.z - to[1]) < 1.2,
      `route from ${from} stopped ${Math.hypot(end.x - to[0], end.z - to[1]).toFixed(2)}m short of ${to}`);
  }
});

test('both routes reach the north hall from the atrium', () => {
  const navigator = createNavigator(colliders, 1, PLAYER_RADIUS);
  const spawn = { x: 0, z: 18 };
  // West doorway, through conservation, out via the mid gap.
  const west = navigator.route(spawn, { x: -10, z: -6 });
  assert.ok(west.length > 0, 'no route through the conservation wing');
  // East doorway, down the transit corridor.
  const east = navigator.route(spawn, { x: 11, z: -6 });
  assert.ok(east.length > 0, 'no route through the transit corridor');
  // The west route has to be meaningfully longer, not incidentally longer -
  // the extra distance is what the quiet floor and the cover are paid for with.
  const metres = (route) => route.reduce((total, point, i) =>
    i ? total + Math.hypot(point.x - route[i - 1].x, point.z - route[i - 1].z) : 0, 0);
  const westLength = metres(west), eastLength = metres(east);
  assert.ok(westLength > eastLength * 1.25,
    `west route is ${westLength.toFixed(1)}m against east ${eastLength.toFixed(1)}m - not enough of a detour`);
});

test('the mission path is walkable end to end', () => {
  const navigator = createNavigator(colliders, 1, PLAYER_RADIUS);
  const legs = [
    [{ x: 0, z: 18 }, { x: 12.5, z: -19 }],      // spawn -> the key
    [{ x: 12.5, z: -19 }, { x: 0, z: -19.5 }]    // key -> the deep store door
  ];
  for (const [from, to] of legs) {
    const route = navigator.route(from, to);
    assert.ok(route.length > 0, `no route from ${JSON.stringify(from)} to ${JSON.stringify(to)}`);
    const end = route[route.length - 1];
    assert.ok(Math.hypot(end.x - to.x, end.z - to.z) < 1.2,
      `route stopped short of ${JSON.stringify(to)}`);
  }
});

test('surfaces map to the rooms they belong to', () => {
  assert.equal(surfaceAt(0, 18), 'carpet');        // atrium
  assert.equal(surfaceAt(-10, 6), 'carpet');       // conservation
  assert.equal(surfaceAt(0, 6), 'marble');         // central hall
  assert.equal(surfaceAt(11, 6), 'tile');          // transit
  assert.equal(surfaceAt(0, -15), 'stone');        // north hall, the default
  assert.ok(noiseScaleAt(0, 6) > noiseScaleAt(-10, 6) * 2,
    'the hall should be far louder than the carpeted wing');
});

test('floor zones do not overlap each other', () => {
  for (let i = 0; i < FLOOR_ZONES.length; i += 1) {
    for (let j = i + 1; j < FLOOR_ZONES.length; j += 1) {
      const [aMinX, aMinZ, aMaxX, aMaxZ] = FLOOR_ZONES[i].rect;
      const [bMinX, bMinZ, bMaxX, bMaxZ] = FLOOR_ZONES[j].rect;
      const overlap = aMinX < bMaxX && aMaxX > bMinX && aMinZ < bMaxZ && aMaxZ > bMinZ;
      assert.equal(overlap, false,
        `${FLOOR_ZONES[i].name} overlaps ${FLOOR_ZONES[j].name}`);
    }
  }
});

test('a walker wedged in inflated geometry is freed', () => {
  const navigator = createNavigator(colliders, 1, GUARD_RADIUS);
  // The north tip of the spine wall - where the patrol used to jam permanently.
  const wedged = { x: 4.1, z: -11.2 };
  assert.equal(navigator.blocked(wedged), true, 'fixture point should be inside geometry');
  const freed = unstick(navigator, wedged);
  assert.ok(freed, 'unstick returned nothing for a blocked position');
  assert.equal(navigator.blocked(freed), false, 'unstick returned a blocked position');
  assert.equal(unstick(navigator, { x: 0, z: 18 }), null, 'clear positions should be left alone');
});

test('a step into a corner slides along the wall instead of stopping dead', () => {
  const navigator = createNavigator(colliders, 1, GUARD_RADIUS);
  // Running south beside the spine wall: the direct line clips it, the slide
  // along z does not.
  const from = { x: 4.9, z: -12 };
  const target = { x: 4.0, z: -16 };
  const next = stepToward(navigator, from, target, 0.0275);
  assert.ok(next, 'stepToward gave up where a slide was available');
  assert.ok(Math.hypot(next.x - from.x, next.z - from.z) > 0, 'stepToward produced no movement');
  assert.equal(navigator.blocked(next), false, 'stepToward moved into geometry');
});

test('the patrol completes its full loop without stalling', () => {
  const navigator = createNavigator(colliders, 1, GUARD_RADIUS);
  const guard = { pos: { x: 12.5, z: -15 }, waypoint: 1, route: [], routeIndex: 0,
    goalKey: null, replanIn: 0, speed: 1.65 };
  const dt = 1 / 60;
  let blockedFrames = 0, movedFrames = 0;
  const visited = new Set();

  for (let frame = 0; frame < 60 * 180; frame += 1) {
    const target = WAYPOINTS[guard.waypoint];
    const goalKey = 'patrol:' + Math.round(target[0] * 2) + ':' + Math.round(target[1] * 2);
    guard.replanIn = Math.max(0, guard.replanIn - dt);
    if (guard.goalKey !== goalKey && guard.replanIn === 0) {
      guard.route = navigator.route(guard.pos, { x: target[0], z: target[1] });
      guard.routeIndex = 0; guard.goalKey = goalKey; guard.replanIn = 0.6;
    }
    while (guard.routeIndex < guard.route.length && Math.hypot(
      guard.route[guard.routeIndex].x - guard.pos.x,
      guard.route[guard.routeIndex].z - guard.pos.z) < 0.08) guard.routeIndex += 1;
    const freed = unstick(navigator, guard.pos);
    if (freed) { guard.pos = freed; guard.goalKey = null; guard.replanIn = 0; }
    const point = guard.route[guard.routeIndex];
    if (point) {
      const next = stepToward(navigator, guard.pos, point, guard.speed * dt);
      if (next) { guard.pos = next; movedFrames += 1; }
      else { guard.goalKey = null; guard.replanIn = 0; blockedFrames += 1; }
    } else if (guard.goalKey === goalKey) {
      visited.add(guard.waypoint);
      guard.waypoint = (guard.waypoint + 1) % WAYPOINTS.length;
      guard.goalKey = null;
    }
  }

  const blockedRatio = blockedFrames / (movedFrames + blockedFrames);
  assert.ok(blockedRatio < 0.005,
    `${(blockedRatio * 100).toFixed(2)}% of frames were blocked - the planner is handing out routes the guard cannot walk`);
  assert.equal(visited.size, WAYPOINTS.length,
    `patrol only reached ${visited.size} of ${WAYPOINTS.length} waypoints in three minutes`);
});
