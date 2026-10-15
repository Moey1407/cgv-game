import * as THREE from 'three';

function tracker() {
  const geometries = [];
  const materials = [];
  return {
    g: (x) => { geometries.push(x); return x; },
    m: (x) => { materials.push(x); return x; },
    dispose() {
      for (const x of geometries) x.dispose();
      for (const x of materials) x.dispose();
    }
  };
}

function lootMesh(item, shared, t) {
  const group = new THREE.Group();
  const label = (item.label ?? '').toLowerCase();
  if (item.kind === 'evidence') {
    const folder = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.32, 0.03, 0.24)), t.m(new THREE.MeshStandardMaterial({ color: 0xc8a96a, roughness: 0.8, emissive: 0x3a2a08, emissiveIntensity: 0.4 })));
    const stamp = new THREE.Mesh(t.g(new THREE.PlaneGeometry(0.1, 0.04)), t.m(new THREE.MeshBasicMaterial({ color: 0xb01020 })));
    stamp.rotation.x = -Math.PI / 2;
    stamp.position.set(0.06, 0.017, 0.06);
    group.add(folder, stamp);
    group.userData.spin = false;
  } else if (label.includes('watch')) {
    const body = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24)), shared.gold);
    body.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(t.g(new THREE.TorusGeometry(0.02, 0.006, 8, 16)), shared.gold);
    ring.position.y = 0.075;
    group.add(body, ring);
  } else if (label.includes('purse') || label.includes('clutch')) {
    const bag = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.22, 0.12, 0.06)), t.m(new THREE.MeshStandardMaterial({ color: 0x6a1630, roughness: 0.4, metalness: 0.3 })));
    const clasp = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.05, 0.02, 0.07)), shared.gold);
    clasp.position.y = 0.06;
    group.add(bag, clasp);
  } else if (label.includes('sketch')) {
    const roll = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 16)), t.m(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 })));
    roll.rotation.z = Math.PI / 2;
    const tie = new THREE.Mesh(t.g(new THREE.TorusGeometry(0.037, 0.006, 6, 16)), shared.gold);
    tie.rotation.y = Math.PI / 2;
    group.add(roll, tie);
  } else {
    const box = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.34, 0.2, 0.46)), t.m(new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.8, roughness: 0.35 })));
    const plate = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.12, 0.05, 0.02)), shared.gold);
    plate.position.set(0, 0.02, 0.24);
    group.add(box, plate);
    group.userData.spin = false;
  }
  group.position.set(item.pos[0], item.pos[1] + 0.04, item.pos[2]);
  group.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  if (group.userData.spin === undefined) group.userData.spin = true;
  return group;
}

function panel(t, colour) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.42, 0.6, 0.1)), t.m(new THREE.MeshStandardMaterial({ color: 0x1c2229, metalness: 0.7, roughness: 0.4 })));
  const lamp = new THREE.Mesh(t.g(new THREE.PlaneGeometry(0.28, 0.12)), t.m(new THREE.MeshBasicMaterial({ color: colour })));
  lamp.position.set(0, 0.12, 0.051);
  const grip = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.08, 0.22, 0.08)), t.m(new THREE.MeshStandardMaterial({ color: 0xb8a060, metalness: 0.8, roughness: 0.3 })));
  grip.position.set(0, -0.12, 0.08);
  group.add(body, lamp, grip);
  group.userData.lamp = lamp;
  return group;
}

export function buildProps(scene, shared, field, level, { hall } = {}) {
  const t = tracker();
  const group = new THREE.Group();
  group.name = 'props-' + level.id;
  scene.add(group);
  const steel = t.m(new THREE.MeshStandardMaterial({ color: 0x4a545e, metalness: 0.85, roughness: 0.45 }));
  field?.patch(steel);
  const dark = t.m(new THREE.MeshStandardMaterial({ color: 0x23282f, metalness: 0.6, roughness: 0.5 }));
  field?.patch(dark);
  const wood = t.m(new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.6 }));
  field?.patch(wood);

  const loot = new Map();
  for (const item of level.pickups) {
    if (item.id === 'kestrel_star') continue; // the stone is physically inside the safe
    const mesh = lootMesh(item, shared, t);
    group.add(mesh);
    loot.set(item.id, mesh);
  }

  const api = { group, loot, panels: new Map(), plates: [], keycard: null, reader: null, safe: null, shutter: null, hatch: null, vents: [], zip: null };

  if (level.id === 1) {
    for (const d of level.decor ?? []) {
      if (d.type !== 'desk') continue;
      const desk = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.4, 1.02, 0.7)), wood);
      desk.position.set(d.pos[0], 0.51, d.pos[2] + 0.5);
      desk.castShadow = desk.receiveShadow = true;
      const lamp = new THREE.PointLight(0xffd59a, 3, 3, 2);
      lamp.position.set(d.pos[0], 1.4, d.pos[2] + 0.5);
      group.add(desk, lamp);
    }
    const sketch = level.pickups.find((p) => p.id === 'loot_sketch');
    if (sketch) {
      const plinth = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.6, 0.95, 0.6)), shared.cream ?? wood);
      plinth.position.set(sketch.pos[0], 0.475, sketch.pos[2]);
      plinth.castShadow = plinth.receiveShadow = true;
      group.add(plinth);
    }
    api.keycard = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.09, 0.13, 0.01)), t.m(new THREE.MeshStandardMaterial({ color: 0xe8c46a, emissive: 0x6a4a10, emissiveIntensity: 0.6, roughness: 0.3 })));
    const door = level.interactables.find((i) => i.type === 'keycard_door');
    if (door) {
      const reader = panel(t, 0xff3048);
      reader.position.set(door.pos[0] + 2.1, 1.35, door.pos[2] + 0.45);
      group.add(reader);
      api.reader = reader;
    }
  }

  if (level.id === 2) {
    const def = level.walls.find((w) => w.name === 'safe');
    const front = def.pos[2] + def.size[2] / 2;
    const hinge = new THREE.Group();
    hinge.position.set(def.pos[0] - 0.62, 1.0, front + 0.02);
    const door = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.24, 1.3, 0.12)), steel);
    door.position.set(0.62, 0, 0.06);
    door.castShadow = true;
    const dial = new THREE.Group();
    dial.position.set(0.62, 0.1, 0.13);
    const hub = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 40)), shared.brass ?? shared.gold);
    hub.rotation.x = Math.PI / 2;
    dial.add(hub);
    for (let i = 0; i < 4; i += 1) {
      const spoke = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.04, 0.42, 0.04)), shared.gold);
      spoke.rotation.z = i * Math.PI / 4;
      spoke.position.z = 0.04;
      dial.add(spoke);
    }
    const notch = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.03, 0.06, 0.02)), t.m(new THREE.MeshBasicMaterial({ color: 0xff3048 })));
    notch.position.set(0, 0.2, 0.04);
    dial.add(notch);
    const handle = new THREE.Mesh(t.g(new THREE.TorusGeometry(0.12, 0.02, 8, 24)), shared.gold);
    handle.position.set(0.95, -0.35, 0.14);
    hinge.add(door, dial, handle);
    group.add(hinge);
    const gem = new THREE.Mesh(t.g(new THREE.OctahedronGeometry(0.2, 1)), t.m(new THREE.MeshPhysicalMaterial({ color: 0x9fd9ff, emissive: 0x1a3a66, emissiveIntensity: 0.8, roughness: 0.05, clearcoat: 1, iridescence: 1 })));
    gem.position.set(def.pos[0], 1.05, def.pos[2] + 0.1);
    gem.visible = false;
    const gemLight = new THREE.PointLight(0x9fd9ff, 0, 4, 2);
    gemLight.position.set(def.pos[0], 1.2, front + 0.4);
    group.add(gem, gemLight);
    api.safe = { hinge, dial, gem, gemLight, open: 0 };
    loot.set('kestrel_star', gem);
    const breaker = level.interactables.find((i) => i.id === 'tamper_panel');
    const p = panel(t, 0xffb020);
    p.position.set(...breaker.pos); p.rotation.y = Math.PI / 2;
    group.add(p); api.panels.set('tamper_panel', p);
    const exit = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.09, 2.4, 1.25)), steel);
    exit.position.set(1.44, 1.2, -25.7); group.add(exit);
    const pushbar = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.14, 0.07, 0.8)), shared.brass);
    pushbar.position.set(1.35, 1.08, -25.7); group.add(pushbar);
  }

  // Vents have real, lit interiors in both the vault and the escape gallery.
  if (level.id >= 2) {
    for (const v of level.interactables.filter((i) => i.type === 'vent')) {
      const grate = new THREE.Group();
      const frame = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.86, 0.78, 0.06)), dark);
      grate.add(frame);
      for (let i = 0; i < 5; i += 1) {
        const bar = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.8, 0.04, 0.05)), steel);
        bar.position.set(0, -0.22 + i * 0.11, 0.04);
        grate.add(bar);
      }
      grate.position.set(v.pos[0], v.pos[1], v.pos[2]);
      grate.rotation.y = THREE.MathUtils.degToRad(v.rotYDeg ?? 0);
      group.add(grate);
      api.vents.push({ id: v.id, mesh: grate });
    }
    const points = level.interactables.find((i) => i.type === 'vent' && i.path)?.path ?? [];
    const duct = t.m(new THREE.MeshStandardMaterial({ color: 0x617582, metalness: 0.35, roughness: 0.74, side: THREE.DoubleSide }));
    const strip = t.m(new THREE.MeshBasicMaterial({ color: 0xb8d5c0 }));
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
      const length = a.distanceTo(b), center = a.clone().add(b).multiplyScalar(0.5);
      const span = new THREE.Group(); span.position.copy(center); span.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.04, 1, Math.max(0.02, length - 1.1))), duct);
        wall.position.set(side * 0.55, 0.5, 0); span.add(wall);
      }
      for (const y of [0, 1]) {
        const slab = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.14, 0.04, Math.max(0.02, length - 1.1))), duct);
        slab.position.y = y; span.add(slab);
      }
      for (let z = -length / 2; z < length / 2; z += 1.4) {
        const rib = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.1, 0.025, 0.035)), steel);
        rib.position.set(0, 0.96, z); span.add(rib);
      }
      const lamp = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.2, 0.02, Math.min(0.7, length))), strip);
      lamp.position.set(0, 0.95, 0); span.add(lamp);
      const fill = new THREE.PointLight(0xc1dfd0, 2.2, 6, 1.3);
      fill.position.set(0, 0.7, 0); span.add(fill);
      group.add(span);
    }
    // Open elbows join the straight spans. Extending four full side walls
    // across a corner would visibly clip through a crawling player's view.
    points.forEach((point, index) => {
      const connected = new Set();
      for (const next of [points[index - 1], points[index + 1]].filter(Boolean)) {
        const dx = next[0] - point[0], dz = next[2] - point[2];
        connected.add(Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? '+x' : '-x') : (dz > 0 ? '+z' : '-z'));
      }
      if (connected.size === 1) { const only = [...connected][0]; connected.add((only[0] === '+' ? '-' : '+') + only[1]); }
      for (const y of [0, 1]) {
        const slab = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.14, 0.04, 1.14)), duct);
        slab.position.set(point[0], point[1] + y, point[2]); group.add(slab);
      }
      for (const side of ['+x', '-x', '+z', '-z']) if (!connected.has(side)) {
        const alongX = side[1] === 'x', offset = side[0] === '+' ? 0.55 : -0.55;
        const wall = new THREE.Mesh(t.g(new THREE.BoxGeometry(alongX ? 0.04 : 1.14, 1, alongX ? 1.14 : 0.04)), duct);
        wall.position.set(point[0] + (alongX ? offset : 0), point[1] + 0.5, point[2] + (alongX ? 0 : offset)); group.add(wall);
      }
    });
  }

  if (level.id === 3) {
    const shutterDef = level.interactables.find((i) => i.id === 'shutter_door');
    const shutter = new THREE.Group();
    for (let i = 0; i < 8; i += 1) {
      const slat = new THREE.Mesh(t.g(new THREE.BoxGeometry(shutterDef.size[0], 0.48, 0.12)), steel);
      slat.position.y = 0.24 + i * 0.5;
      slat.castShadow = true;
      shutter.add(slat);
    }
    shutter.position.set(shutterDef.pos[0], 0, shutterDef.pos[2]);
    const light = new THREE.Mesh(t.g(new THREE.BoxGeometry(shutterDef.size[0] + 0.2, 0.08, 0.08)), t.m(new THREE.MeshBasicMaterial({ color: 0xff3f62 })));
    light.position.set(shutterDef.pos[0], 3.9, shutterDef.pos[2] + 0.12);
    group.add(shutter, light);
    api.shutter = { mesh: shutter, light, lift: 0 };

    const hatchDef = level.interactables.find((i) => i.id === 'roof_hatch');
    const hatch = new THREE.Mesh(t.g(new THREE.BoxGeometry(hatchDef.size[0], hatchDef.size[1], 0.16)), steel);
    hatch.position.set(hatchDef.pos[0], 20 + hatchDef.size[1] / 2, hatchDef.pos[2]);
    hatch.castShadow = true;
    const hatchFrame = new THREE.Mesh(t.g(new THREE.BoxGeometry(hatchDef.size[0] + 0.3, 0.2, 0.3)), dark);
    hatchFrame.position.set(hatchDef.pos[0], 20 + hatchDef.size[1] + 0.1, hatchDef.pos[2]);
    group.add(hatch, hatchFrame);
    api.hatch = { mesh: hatch, lift: 0, base: hatch.position.y };

    for (const id of ['shutter_hold', 'roof_override']) {
      const def = level.interactables.find((i) => i.id === id);
      const p = panel(t, 0xffb020);
      p.position.set(def.pos[0], def.pos[1], def.pos[2]);
      if (id === 'shutter_hold') {
        p.position.x = -4.94;
        p.rotation.y = Math.PI / 2;
      } else {
        p.position.z = -66.84;
      }
      group.add(p);
      api.panels.set(id, p);
    }

    for (const def of level.interactables.filter((i) => i.type === 'plate')) {
      const mesh = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.7, 0.75, 0.05, 40)), t.m(new THREE.MeshStandardMaterial({ color: 0x3a4652, metalness: 0.8, roughness: 0.35 })));
      mesh.position.set(def.pos[0], def.pos[1] + 0.025, def.pos[2]);
      mesh.receiveShadow = true;
      const ring = new THREE.Mesh(t.g(new THREE.RingGeometry(0.62, 0.7, 48)), t.m(new THREE.MeshBasicMaterial({ color: 0x72efff, transparent: true, opacity: 0.35 })));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(def.pos[0], def.pos[1] + 0.055, def.pos[2]);
      group.add(mesh, ring);
      api.plates.push({ id: def.id, mesh, ring });
    }

    const stairs = level.interactables.find((i) => i.type === 'stairs');
    const exitDoor = new THREE.Mesh(t.g(new THREE.BoxGeometry(1.4, 2.3, 0.1)), dark);
    exitDoor.position.set(stairs.pos[0], 1.15, -45.0 + 0.06);
    const sign = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.6, 0.22, 0.05)), t.m(new THREE.MeshBasicMaterial({ color: 0x23ff7a })));
    sign.position.set(stairs.pos[0], 2.55, -45.0 + 0.08);
    const signLight = new THREE.PointLight(0x23ff7a, 2.5, 4, 2);
    signLight.position.set(stairs.pos[0], 2.4, -44.4);
    group.add(exitDoor, sign, signLight);
    const topDoor = exitDoor.clone();
    topDoor.position.set(stairs.to[0], 21.15, -53.0 + 0.06);
    group.add(topDoor);
    // Both doors slide aside while Wren is in the shaft (main.js calls setStairDoors).
    api.stairDoors = [exitDoor, topDoor].map((mesh) => ({ mesh, x: mesh.position.x }));

    // The shaft's flights and landings, built from the climb path in the level data.
    // Every rising leg of the path gets 14 steps; one instanced mesh draws all of them.
    if (stairs.path) {
      const flights = [];
      for (let i = 1; i < stairs.path.length; i += 1) {
        const a = stairs.path[i - 1], b = stairs.path[i];
        if (b[1] - a[1] > 0.5) flights.push([a, b]);
      }
      const STEPS = 14;
      const steps = new THREE.InstancedMesh(t.g(new THREE.BoxGeometry(1.9, 0.12, 0.44)), steel, flights.length * STEPS);
      const m = new THREE.Matrix4();
      let k = 0;
      for (const [a, b] of flights) {
        for (let s = 0; s < STEPS; s += 1) {
          const f = (s + 1) / STEPS;
          m.makeTranslation(a[0], a[1] + (b[1] - a[1]) * f - 0.06, a[2] + (b[2] - a[2]) * (s + 0.5) / STEPS);
          steps.setMatrixAt(k, m);
          k += 1;
        }
      }
      steps.receiveShadow = true;
      group.add(steps);
      // A landing slab at the top of every flight, plus the shaft floor.
      const slab = (y, z, depth) => {
        const mesh = new THREE.Mesh(t.g(new THREE.BoxGeometry(3.9, 0.14, depth)), dark);
        mesh.position.set(6, y - 0.07, z);
        mesh.receiveShadow = true;
        group.add(mesh);
      };
      slab(0, -49, 7.9);
      for (const [, b] of flights) {
        if (b[1] >= 20) continue; // the top flight ends on the landing floor itself
        slab(b[1], b[2] < -49 ? -52.15 : -45.85, b[2] < -49 ? 1.6 : 1.4);
      }
      for (const y of [5.5, 15.5]) {
        const lamp = new THREE.PointLight(0xffd59a, 8, 11, 1.8);
        lamp.position.set(6, y, -49);
        group.add(lamp);
      }
    }

    const zip = level.interactables.find((i) => i.type === 'zipline');
    const start = new THREE.Vector3(zip.pos[0], 23.2, zip.pos[2]);
    const end = new THREE.Vector3(zip.pos[0], 6, zip.pos[2] - 70);
    const post = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 10)), steel);
    post.position.set(zip.pos[0], 21.7, zip.pos[2]);
    const length = start.distanceTo(end);
    const cable = new THREE.Mesh(t.g(new THREE.CylinderGeometry(0.015, 0.015, length, 6)), t.m(new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.3 })));
    cable.position.copy(start).add(end).multiplyScalar(0.5);
    cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    const beacon = new THREE.Mesh(t.g(new THREE.SphereGeometry(0.08, 12, 8)), t.m(new THREE.MeshBasicMaterial({ color: 0xff3048 })));
    beacon.position.copy(start).add(new THREE.Vector3(0, 0.25, 0));
    group.add(post, cable, beacon);
    // The pre-rigged line ends on a real service roof rather than empty space.
    const landing = new THREE.Mesh(t.g(new THREE.BoxGeometry(7, 0.3, 8)), dark);
    landing.position.set(end.x, end.y - 2.55, end.z - 1.4); group.add(landing);
    for (const x of [-3.4, 3.4]) {
      const rail = new THREE.Mesh(t.g(new THREE.BoxGeometry(0.08, 1.1, 8)), steel);
      rail.position.set(x, end.y - 1.85, end.z - 1.4); group.add(rail);
    }
    const arrivalLight = new THREE.PointLight(0xffdb9f, 20, 14, 1.5);
    arrivalLight.position.set(2.5, end.y + 0.5, end.z - 2); group.add(arrivalLight);
    api.zip = { start, end, beacon };
  }

  function setPlate(index, active, locked = false) {
    const p = api.plates[index];
    if (!p) return;
    p.ring.material.opacity = active || locked ? 0.95 : 0.35;
    p.ring.material.color.setHex(locked ? 0x23ff7a : active ? 0xc7fbff : 0x72efff);
    p.mesh.material.emissive.setHex(locked ? 0x0a6a30 : active ? 0x72efff : 0x000000);
    p.mesh.material.emissiveIntensity = active || locked ? 0.6 : 0;
  }

  function setStairDoors(open) {
    for (const d of api.stairDoors ?? []) d.mesh.position.x = d.x + (open ? 1.35 : 0);
  }

  function setPanel(id, colour) {
    const p = id === 'reader' ? api.reader : api.panels.get(id);
    p?.userData.lamp.material.color.setHex(colour);
  }

  function update(dt, time) {
    for (const mesh of loot.values()) if (mesh.visible && mesh.userData.spin) mesh.rotation.y += dt * 1.2;
    if (api.safe?.gem.visible) {
      api.safe.gem.rotation.y += dt * 0.8;
      api.safe.gem.position.y = 1.05 + Math.sin(time * 1.6) * 0.04;
    }
    if (api.zip) api.zip.beacon.visible = Math.sin(time * 5) > 0;
  }

  function reset(collected = []) {
    for (const [id, mesh] of loot) mesh.visible = !collected.includes(id);
    for (let i = 0; i < api.plates.length; i += 1) setPlate(i, false);
    if (api.safe) {
      api.safe.open = 0;
      api.safe.hinge.rotation.y = 0;
      api.safe.gem.visible = false;
      api.safe.gemLight.intensity = 0;
    }
    if (api.shutter) {
      api.shutter.lift = 0;
      api.shutter.mesh.position.y = 0;
    }
    if (api.hatch) {
      api.hatch.lift = 0;
      api.hatch.mesh.position.y = api.hatch.base;
    }
    for (const id of api.panels.keys()) setPanel(id, 0xffb020);
    api.vents.forEach(({ mesh }) => { mesh.visible = true; });
    setStairDoors(false);
    if (api.reader) setPanel('reader', 0xff3048);
    if (hall && level.id === 1) hall.vaultHinge.rotation.y = 0;
  }

  function dispose() {
    api.keycard?.removeFromParent();
    scene.remove(group);
    group.traverse((c) => { c.shadow?.map?.dispose(); if (c.isInstancedMesh) c.dispose(); });
    t.dispose();
  }

  return Object.assign(api, { setPlate, setPanel, setStairDoors, update, reset, dispose });
}
