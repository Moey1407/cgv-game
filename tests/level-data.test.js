// tests/level-data.test.js
// Checks the level files against the schema and that every level can actually
// be walked: spawn to goal (through vents and stairs where they exist), every
// pickup, and every guard loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLevel } from '../levels/schema.js';
import level1 from '../levels/level1.js';
import level2 from '../levels/level2.js';
import level3 from '../levels/level3.js';

const LEVELS = [level1, level2, level3];
const PLAYER_RADIUS = 0.46;
const GUARD_RADIUS = 0.48;
const CELL = 0.25;
const BODY = 1.6; // height of the body that has to fit

// A wall blocks a point only if it overlaps the body standing at height y.
const solids = (level) => level.walls.filter((b) => b.collide !== false);
const hits = (b, x, y, z, r) =>
  y < b.pos[1] + b.size[1] / 2 && y + BODY > b.pos[1] - b.size[1] / 2 &&
  x + r > b.pos[0] - b.size[0] / 2 && x - r < b.pos[0] + b.size[0] / 2 &&
  z + r > b.pos[2] - b.size[2] / 2 && z - r < b.pos[2] + b.size[2] / 2;
const blocked = (level, x, y, z, r) => solids(level).some((b) => hits(b, x, y, z, r));
const floorsAt = (level, y) => level.floors.filter((f) => Math.abs(f.pos[1] + f.size[1] / 2 - y) < 1);
const onFloor = (floors, x, z) => floors.some((f) => Math.abs(x - f.pos[0]) <= f.size[0] / 2 && Math.abs(z - f.pos[2]) <= f.size[2] / 2);

// Flood fill on one storey, then follow any vent or stairs whose usePos it reached.
function reachable(level, from, to, radius) {
  const links = level.interactables.filter((i) => i.to && i.usePos);
  const done = new Set();
  const starts = [from];
  while (starts.length) {
    const start = starts.pop();
    const key = start.join(',');
    if (done.has(key)) continue;
    done.add(key);
    const region = fill(level, start, radius);
    if (!region) continue;
    if (Math.abs(start[1] - to[1]) < 1 && region.has(to[0], to[2])) return true;
    for (const link of links) if (Math.abs(start[1] - link.usePos[1]) < 1 && region.has(link.usePos[0], link.usePos[2])) starts.push(link.to);
  }
  return false;
}

function fill(level, [x0, y, z0], radius) {
  const floors = floorsAt(level, y);
  if (!floors.length) return null;
  const xs = floors.flatMap((f) => [f.pos[0] - f.size[0] / 2, f.pos[0] + f.size[0] / 2]);
  const zs = floors.flatMap((f) => [f.pos[2] - f.size[2] / 2, f.pos[2] + f.size[2] / 2]);
  const minX = Math.min(...xs), minZ = Math.min(...zs);
  const w = Math.ceil((Math.max(...xs) - minX) / CELL) + 1;
  const h = Math.ceil((Math.max(...zs) - minZ) / CELL) + 1;
  const cell = (x, z) => [Math.round((x - minX) / CELL), Math.round((z - minZ) / CELL)];
  const free = (cx, cz) => {
    const x = minX + cx * CELL, z = minZ + cz * CELL;
    return cx >= 0 && cz >= 0 && cx < w && cz < h && onFloor(floors, x, z) && !blocked(level, x, y, z, radius);
  };
  const seen = new Uint8Array(w * h);
  const [sx, sz] = cell(x0, z0);
  if (!free(sx, sz)) return null;
  const stack = [[sx, sz]];
  seen[sz * w + sx] = 1;
  while (stack.length) {
    const [cx, cz] = stack.pop();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, nz = cz + dz;
      if (!free(nx, nz) || seen[nz * w + nx]) continue;
      seen[nz * w + nx] = 1;
      stack.push([nx, nz]);
    }
  }
  return { has: (x, z) => { const [cx, cz] = cell(x, z); return cx >= 0 && cz >= 0 && cx < w && cz < h && seen[cz * w + cx] === 1; } };
}

const ground = ([x, y, z]) => [x, Math.round(y), z];

for (const level of LEVELS) {
  test(`level ${level.id} passes the schema`, () => {
    assert.deepEqual(validateLevel(level), []);
  });

  test(`level ${level.id}: spawn, goal, pickups and patrol points are not inside geometry`, () => {
    const check = (label, [x, y, z], r) => assert.equal(blocked(level, x, Math.round(y), z, r), false, `${label} at ${x},${y},${z} is inside a wall`);
    check('spawn', level.spawn, PLAYER_RADIUS);
    check('checkpoint', level.checkpoint, PLAYER_RADIUS);
    check('goal', level.goal, PLAYER_RADIUS);
    for (const p of level.pickups) check(`pickup ${p.id}`, p.usePos ?? [p.pos[0], Math.round(p.pos[1] / 20) * 20, p.pos[2]], 0.3);
    for (const i of level.interactables) if (i.usePos) check(`${i.id} usePos`, i.usePos, PLAYER_RADIUS);
    for (const g of level.guards) for (const w of g.route) check(`${g.name} waypoint`, w, GUARD_RADIUS);
  });

  test(`level ${level.id}: the player can walk from spawn to the goal`, () => {
    assert.ok(reachable(level, ground(level.spawn), ground(level.goal), PLAYER_RADIUS));
  });

  test(`level ${level.id}: every pickup and interactable can be reached from spawn`, () => {
    for (const p of level.pickups) {
      const y = Math.round(p.pos[1] / 20) * 20;
      assert.ok(reachable(level, ground(level.spawn), p.usePos ?? [p.pos[0], y, p.pos[2]], PLAYER_RADIUS), `${p.id} is unreachable`);
    }
    for (const i of level.interactables) {
      if (i.usePos) assert.ok(reachable(level, ground(level.spawn), ground(i.usePos), PLAYER_RADIUS), `${i.id} is unreachable`);
    }
  });

  test(`level ${level.id}: each guard can walk its whole loop`, () => {
    for (const g of level.guards) {
      for (let i = 0; i < g.route.length; i += 1) {
        const a = g.route[i], b = g.route[(i + 1) % g.route.length];
        assert.ok(reachable(level, ground(a), ground(b), GUARD_RADIUS), `${g.name}: no path from waypoint ${i} to ${(i + 1) % g.route.length}`);
      }
    }
  });
}

test('level 1: every guard waypoint has room around it', () => {
  // A waypoint a few centimetres off a wall is what jammed the old patrol.
  for (const g of level1.guards) {
    for (const [x, , z] of g.route) {
      let clear = 0;
      for (let r = 0.05; r <= 1.2; r += 0.05) {
        let hit = false;
        for (let a = 0; a < 16 && !hit; a += 1) {
          const t = (a / 16) * Math.PI * 2;
          hit = blocked(level1, x + Math.cos(t) * r, 0, z + Math.sin(t) * r, 0);
        }
        if (hit) break;
        clear = r;
      }
      assert.ok(clear >= 0.35, `${g.name} waypoint ${x},${z} has only ${clear.toFixed(2)} m of clearance`);
    }
  }
});

test('level 1: exactly one guard carries the keycard and the door needs it', () => {
  assert.equal(level1.guards.filter((g) => g.hasKeycard).length, 1);
  assert.ok(level1.interactables.some((i) => i.type === 'keycard_door' && i.requires === 'keycard'));
});

test('level 1: has 4 to 6 cameras, as the plan asks', () => {
  assert.ok(level1.cameras.length >= 4 && level1.cameras.length <= 6);
});

test('level 2: the vent is a real second route into the vault', () => {
  const vent = level2.interactables.find((i) => i.type === 'vent' && i.to);
  assert.ok(vent);
  assert.ok(reachable(level2, ground(level2.spawn), ground(vent.usePos), PLAYER_RADIUS));
  assert.ok(reachable(level2, ground(vent.to), ground(level2.goal), PLAYER_RADIUS));
});

test('level 3: the roof is only reachable by the stairwell', () => {
  const noStairs = { ...level3, interactables: level3.interactables.filter((i) => i.type !== 'stairs') };
  assert.equal(reachable(noStairs, ground(level3.spawn), ground(level3.goal), PLAYER_RADIUS), false);
});

test('a blocked doorway is caught', () => {
  const plugged = { ...level1, walls: [...level1.walls, { name: 'plug', pos: [0, 2, -40.2], size: [5, 4, 0.4] }] };
  assert.equal(reachable(plugged, ground(level1.spawn), [0, 0, -60.6], PLAYER_RADIUS), false);
});
