import * as THREE from 'three';
import { bannerTexture } from '../render/props.js';

export const AIRLOCK = { length: 8, half: 1.05, shell: 1.25, height: 3, top: 3.3 };
const PARK = { pos: [0, -200, 0], yawDeg: 0 };

export function airlockTransform(placement) {
  const p = placement ?? PARK;
  const yaw = THREE.MathUtils.degToRad(p.yawDeg ?? 0);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x: p.pos[0], y: p.pos[1], z: p.pos[2], yaw,
    toLocal(x, z) {
      const dx = x - p.pos[0];
      const dz = z - p.pos[2];
      return { x: dx * c - dz * s, z: dx * s + dz * c };
    },
    toWorld(lx, lz) {
      return { x: p.pos[0] + lx * c + lz * s, z: p.pos[2] - lx * s + lz * c };
    }
  };
}

function buildShell(materials, own, geo) {
  const { length: L, half: W, shell: S, height: H, top: T } = AIRLOCK;
  const group = new THREE.Group();
  const concrete = own(new THREE.MeshStandardMaterial({ color: 0x5d5e60, roughness: 0.92 }));
  const stripe = own(new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.6 }));
  const doorMat = own(new THREE.MeshStandardMaterial({ color: 0x47515c, metalness: 0.7, roughness: 0.38 }));
  const lamp = own(new THREE.MeshBasicMaterial({ color: 0xfff1cf }));
  const add = (g, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo(g), m);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  add(new THREE.BoxGeometry(S * 2, 0.1, L), concrete, 0, -0.05, -L / 2);
  add(new THREE.BoxGeometry(S * 2, T - H, L), concrete, 0, H + (T - H) / 2, -L / 2);
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(S - W, T, L), concrete, side * (W + (S - W) / 2), T / 2, -L / 2);
    add(new THREE.BoxGeometry(0.02, 0.08, L), stripe, side * (W - 0.01), 1.0, -L / 2);
  }
  for (const z of [-L * 0.3, -L * 0.7]) add(new THREE.BoxGeometry(0.6, 0.04, 0.6), lamp, 0, H - 0.02, z);
  const doors = {};
  for (const [name, z] of [['near', -0.05], ['far', -L + 0.05]]) {
    const door = new THREE.Group();
    door.position.set(0, 0, z);
    const panel = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 2, H, 0.1)), doorMat);
    panel.position.y = H / 2;
    const band = new THREE.Mesh(geo(new THREE.BoxGeometry(W * 2, 0.12, 0.12)), stripe);
    band.position.y = 1.05;
    door.add(panel, band);
    group.add(door);
    doors[name] = { mesh: door, open: 0, target: 0 };
  }
  const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.3, 0.32)), own(new THREE.MeshBasicMaterial({ map: bannerTexture('SERVICE', 'PASSAGE'), side: THREE.DoubleSide })));
  sign.position.set(W - 0.01, 2.3, -L / 2);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);
  const lights = [-L * 0.3, -L * 0.7].map((z) => {
    const light = new THREE.PointLight(0xffe7c0, 7, 7, 1.6);
    light.position.set(0, H - 0.3, z);
    group.add(light);
    return light;
  });
  return { group, doors, lights };
}

export function createAirlock(materials) {
  const geometries = [];
  const owned = [];
  const geo = (g) => { geometries.push(g); return g; };
  const own = (m) => { owned.push(m); return m; };
  const world = buildShell(materials, own, geo);
  const twin = buildShell(materials, own, geo);
  let transform = airlockTransform(null);

  function place(placement) {
    transform = airlockTransform(placement);
    world.group.position.set(transform.x, transform.y, transform.z);
    world.group.rotation.y = transform.yaw;
    for (const name of ['near', 'far']) setDoor(name, 0, true);
  }

  function setDoor(name, open, instant = false) {
    for (const shell of [world, twin]) {
      const d = shell.doors[name];
      d.target = open;
      if (instant) d.open = open;
      d.mesh.position.x = d.open * AIRLOCK.half * 2.05;
    }
  }

  function update(dt) {
    for (const shell of [world, twin]) {
      for (const d of Object.values(shell.doors)) {
        if (d.open === d.target) continue;
        const step = dt * 2.2;
        d.open = d.target > d.open ? Math.min(d.target, d.open + step) : Math.max(d.target, d.open - step);
        d.mesh.position.x = d.open * AIRLOCK.half * 2.05;
      }
    }
  }

  function doorOpen(name) {
    return world.doors[name].open > 0.85;
  }

  function local(x, z) {
    return transform.toLocal(x, z);
  }

  // Where the panel edge has reached, in local x. Everything from here to the
  // +x jamb is still shut.
  function edge(name) {
    return world.doors[name].open * AIRLOCK.half * 2.05 - AIRLOCK.half;
  }

  function inside(x, z, r = 0.35, y = 0) {
    if (Math.abs(y - transform.y) > 1.5) return false;
    const p = transform.toLocal(x, z);
    if (Math.abs(p.x) > AIRLOCK.half - r) return false;
    // This widens where Wren may stand, so it has to agree with the solids above
    // or it would wave her through a gap she does not fit in. A door counts as
    // open only where she actually clears the panel.
    const clears = (name) => p.x + r < edge(name);
    const near = clears('near') ? 1.4 : -r - 0.08;
    const far = clears('far') ? -AIRLOCK.length - 1.4 : -AIRLOCK.length + r + 0.08;
    return p.z < near && p.z > far;
  }

  // Whatever each panel still covers of its opening, as a world-space box the
  // level's collision can hold. inside() above is OR'd into canStand, so it can
  // only ever widen where Wren may stand -- it can never stop her. Without these
  // the panels were scenery: she could walk into a shut door until she was half
  // inside it and see straight through to the other side.
  function solids() {
    const span = AIRLOCK.half * 2;
    // The panel slides toward +x, so the part of the opening it has not yet
    // uncovered runs from its leading edge across to the far jamb.
    const sideways = Math.abs(Math.sin(transform.yaw)) > 0.5;
    const out = [];
    for (const [name, lz] of [['near', -0.05], ['far', -AIRLOCK.length + 0.05]]) {
      const covered = Math.max(0, Math.min(span, span - world.doors[name].open * AIRLOCK.half * 2.05));
      if (covered < 0.05) continue;
      const centre = transform.toWorld(AIRLOCK.half - covered / 2, lz);
      out.push({
        name,
        pos: [centre.x, transform.y + AIRLOCK.height / 2, centre.z],
        size: sideways ? [0.24, AIRLOCK.height, covered] : [covered, AIRLOCK.height, 0.24]
      });
    }
    return out;
  }

  function contains(x, z, y = 0) {
    if (Math.abs(y - transform.y) > 1.5) return false;
    const p = transform.toLocal(x, z);
    return Math.abs(p.x) < AIRLOCK.half + 0.2 && p.z < 0 && p.z > -AIRLOCK.length;
  }

  function dispose() {
    for (const g of geometries) g.dispose();
    for (const m of owned) { m.map?.dispose(); m.dispose(); }
  }

  return {
    group: world.group,
    twin: twin.group,
    place, setDoor, update, inside, contains, local, doorOpen, solids, dispose,
    get transform() { return transform; },
    get doors() { return world.doors; }
  };
}