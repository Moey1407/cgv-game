import * as THREE from 'three';
import { heightToNormal } from '../render/materials.js';

const ROOM_HEIGHT = 4;

export function boxBounds(box, pad = 0) {
  const [x, y, z] = box.pos;
  const [w, h, d] = box.size;
  return {
    minX: x - w / 2 - pad, maxX: x + w / 2 + pad,
    minY: y - h / 2, maxY: y + h / 2,
    minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad
  };
}

export function circleHitsBox(x, z, r, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  return (x - cx) ** 2 + (z - cz) ** 2 < r * r;
}

export function createCollision(data) {
  const floors = data.floors.map((f) => ({ ...boxBounds(f), top: f.pos[1] + f.size[1] / 2, surface: f.surface }));
  const solids = new Map();
  for (const [i, w] of data.walls.entries()) {
    if (w.collide === false) continue;
    solids.set(w.name ?? 'wall-' + i, boxBounds(w));
  }

  function groundAt(x, z, y = 0) {
    let best = null;
    for (const f of floors) {
      if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      if (Math.abs(f.top - y) > 1.5) continue;
      if (best === null || Math.abs(f.top - y) < Math.abs(best - y)) best = f.top;
    }
    return best;
  }

  function inside(x, z, r = 0.35, y = 0) {
    const ground = groundAt(x, z, y);
    if (ground === null) return false;
    for (const b of solids.values()) {
      if (b.maxY <= ground + 0.2 || b.minY >= ground + 1.7) continue;
      if (circleHitsBox(x, z, r, b)) return false;
    }
    return true;
  }

  function clearView(a, b) {
    const ground = groundAt(a.x, a.z, a.y ?? 0) ?? (a.y ?? 0);
    const eye = ground + 1.5;
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25);
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      for (const s of solids.values()) {
        if (s.minY > eye || s.maxY < eye) continue;
        if (x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ) return false;
      }
    }
    return true;
  }

  function block(id, box) { solids.set(id, boxBounds(box)); }
  function unblock(id) { solids.delete(id); }

  function bounds() {
    const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const f of floors) {
      b.minX = Math.min(b.minX, f.minX); b.maxX = Math.max(b.maxX, f.maxX);
      b.minZ = Math.min(b.minZ, f.minZ); b.maxZ = Math.max(b.maxZ, f.maxZ);
    }
    return b;
  }

  return { floors, solids, groundAt, inside, clearView, block, unblock, bounds };
}

function concrete() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const g = canvas.getContext('2d');
  let seed = 47;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  g.fillStyle = '#a8a396'; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
    const x = col * 256 + (row % 2) * 128, y = row * 128, v = Math.floor(rand() * 14);
    g.fillStyle = `rgb(${160 + v},${155 + v},${143 + v})`; g.fillRect(x + 2, y + 2, 252, 124);
    g.strokeStyle = '#c7c0ad'; g.lineWidth = 1; g.strokeRect(x + 3, y + 3, 250, 122);
  }
  for (let i = 0; i < 10000; i++) {
    g.fillStyle = rand() > .5 ? '#292b2d18' : '#f2e7d220';
    g.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildLevel(scene, materials, field, data, { roofRain = false } = {}) {
  const group = new THREE.Group();
  group.name = 'level-' + data.id;
  scene.add(group);
  const ceilings = new THREE.Group();
  group.add(ceilings);
  const owned = [];
  const own = (m) => { owned.push(m); if (field && 'emissive' in m) field.patch(m); return m; };

  const concreteTex = concrete();
  const concreteNormal = new THREE.CanvasTexture(heightToNormal(concreteTex.image, 1.2));
  concreteNormal.wrapS = concreteNormal.wrapT = THREE.RepeatWrapping;
  const mats = {
    steelWall: own(new THREE.MeshStandardMaterial({ map: materials.steel.map, normalMap: materials.steel.normalMap, color: 0x8c96a2, metalness: 0.7, roughness: 0.42 })),
    concreteWall: own(new THREE.MeshStandardMaterial({ map: concreteTex, normalMap: concreteNormal, normalScale: new THREE.Vector2(.5, .5), color: 0xc4c8c9, roughness: 0.88 })),
    prop: own(new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.6, roughness: 0.45 })),
    marble: own(new THREE.MeshPhysicalMaterial({ map: materials.marbleFloor.map, normalMap: materials.marbleFloor.normalMap, roughness: 0.3, clearcoat: 0.8 })),
    carpet: materials.carpet,
    steelFloor: own(new THREE.MeshStandardMaterial({ map: materials.steel.map, normalMap: materials.steel.normalMap, color: 0x6f7884, metalness: 0.75, roughness: 0.5 })),
    concreteFloor: own(new THREE.MeshStandardMaterial({ map: concreteTex, color: 0x8f8a86, roughness: 0.95 })),
    ceiling: own(new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9 })),
    trim: own(new THREE.MeshStandardMaterial({ color: 0x0c0f13, emissive: 0x3a0a10, emissiveIntensity: 0.4, roughness: 0.6 }))
  };
  const wallMaterial = data.id === 3 ? mats.concreteWall : mats.steelWall;
  const floorMaterial = (surface) => surface === 'marble' ? mats.marble : surface === 'carpet' ? mats.carpet : surface === 'concrete' ? mats.concreteFloor : mats.steelFloor;
  const geometries = [];
  const geo = (g) => { geometries.push(g); return g; };

  for (const f of data.floors) {
    const [w, , d] = f.size;
    const mesh = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, d)), floorMaterial(f.surface));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(f.pos[0], f.pos[1] + f.size[1] / 2 + 0.001, f.pos[2]);
    mesh.receiveShadow = true;
    const map = mesh.material.map;
    if (map) {
      mesh.material = mesh.material.clone();
      own(mesh.material);
      mesh.material.map = map.clone();
      mesh.material.map.repeat.set(w / 2, d / 2);
      mesh.material.map.needsUpdate = true;
      if (mesh.material.normalMap) {
        mesh.material.normalMap = mesh.material.normalMap.clone();
        mesh.material.normalMap.repeat.set(w / 2, d / 2);
        mesh.material.normalMap.needsUpdate = true;
      }
    }
    group.add(mesh);
    const top = f.pos[1] + f.size[1] / 2;
    const outdoors = roofRain && top > 10 && f.pos[2] < -66;
    if (!outdoors) {
      const ceil = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, d)), mats.ceiling);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(f.pos[0], top + ROOM_HEIGHT, f.pos[2]);
      ceilings.add(ceil);
    }
  }

  function wallPiece(pos, size, prop = false) {
    if (size.some((n) => n <= 0.005)) return;
    const mesh = new THREE.Mesh(geo(new THREE.BoxGeometry(...size)), prop ? mats.prop : wallMaterial);
    if (!prop) {
      // World-scale UVs avoid stretching one tiny tile across a whole corridor.
      const uv = mesh.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const face = Math.floor(i / 4);
        const width = face < 2 ? size[2] : face < 4 ? size[0] : size[0];
        const height = face < 2 ? size[1] : face < 4 ? size[2] : size[1];
        uv.setXY(i, uv.getX(i) * width / (2 * (wallMaterial.map?.repeat.x ?? 1)), uv.getY(i) * height / (2 * (wallMaterial.map?.repeat.y ?? 1)));
      }
      uv.needsUpdate = true;
    }
    mesh.position.set(...pos); mesh.castShadow = prop; mesh.receiveShadow = true; group.add(mesh);
  }
  for (const w of data.walls) {
    const axis = w.size[0] < 0.5 ? 2 : w.size[2] < 0.5 ? 0 : -1;
    const plane = axis === 2 ? 0 : 2;
    const openings = axis < 0 ? [] : data.interactables.filter((v) => v.type === 'vent'
      && Math.abs(v.pos[plane] - w.pos[plane]) < 0.3
      && Math.abs(v.pos[axis] - w.pos[axis]) < w.size[axis] / 2
      && Math.abs(v.pos[1] - (w.pos[1] - w.size[1] / 2 + 0.42)) < 0.3).sort((a, b) => a.pos[axis] - b.pos[axis]);
    if (!openings.length) wallPiece(w.pos, w.size, w.kind === 'prop');
    else {
      let cursor = w.pos[axis] - w.size[axis] / 2;
      const high = w.pos[axis] + w.size[axis] / 2;
      for (const v of openings) {
        const from = Math.max(cursor, v.pos[axis] - 0.55), to = Math.min(high, v.pos[axis] + 0.55);
        const pos = [...w.pos], size = [...w.size];
        pos[axis] = (cursor + from) / 2; size[axis] = from - cursor; wallPiece(pos, size);
        const lintel = [...w.pos], lintelSize = [...w.size];
        lintel[axis] = (from + to) / 2; lintelSize[axis] = to - from;
        lintel[1] += 0.525; lintelSize[1] -= 1.05; wallPiece(lintel, lintelSize);
        cursor = to;
      }
      const pos = [...w.pos], size = [...w.size]; pos[axis] = (cursor + high) / 2; size[axis] = high - cursor; wallPiece(pos, size);
    }
    if (w.kind !== 'prop' && w.size[1] >= 2 && !openings.length) {
      const trim = new THREE.Mesh(geo(new THREE.BoxGeometry(w.size[0] + 0.02, 0.08, w.size[2] + 0.02)), mats.trim);
      trim.position.set(w.pos[0], w.pos[1] - w.size[1] / 2 + 0.25, w.pos[2]);
      group.add(trim);
    }
  }

  for (const label of data.labels ?? []) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 144;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#21312e'; ctx.fillRect(0, 0, 768, 144);
    ctx.strokeStyle = '#d4d8c6'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, 752, 128);
    ctx.fillStyle = '#ecebdc'; ctx.font = '600 37px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label.text, 384, 73, 710);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = own(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, emissive: 0x333b31, emissiveIntensity: 0.35 }));
    const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(label.width, label.width * 144 / 768)), material);
    sign.position.set(...label.pos); sign.rotation.y = THREE.MathUtils.degToRad(label.rotYDeg ?? 0); group.add(sign);
  }

  const lights = new THREE.Group();
  group.add(lights);
  const beacons = [];
  const beaconMat = own(new THREE.MeshStandardMaterial({ color: 0x400608, emissive: 0xff2020, emissiveIntensity: 2.4, roughness: 0.4 }));
  const housingMat = own(new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.6, roughness: 0.5 }));
  function addBeacon(x, ceiling, z, glow) {
    const rig = new THREE.Group();
    rig.position.set(x, ceiling - 0.25, z);
    const housing = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 20)), housingMat);
    housing.position.y = 0.16;
    const dome = new THREE.Mesh(geo(new THREE.SphereGeometry(0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), own(beaconMat.clone()));
    dome.rotation.x = Math.PI;
    dome.position.y = 0.1;
    const spin = new THREE.Group();
    for (const side of [1, -1]) {
      const spot = new THREE.SpotLight(0xff2a1a, 220, 22, 0.42, 0.5, 1.4);
      spot.target.position.set(side * 6, -2.4, 0);
      spin.add(spot, spot.target);
    }
    rig.add(housing, dome, spin);
    lights.add(rig);
    beacons.push({ spin, dome, glow, base: glow.intensity });
  }
  for (const l of data.lights) {
    const colour = new THREE.Color(l.color);
    if (l.type === 'ambient') lights.add(new THREE.HemisphereLight(colour, data.id === 3 ? 0x1a0606 : 0x050608, l.intensity * (data.id === 3 ? 2.6 : 1)));
    if (l.type === 'point') {
      const p = new THREE.PointLight(colour, l.intensity * 30, 18, 1.6);
      p.position.set(...l.pos);
      lights.add(p);
    }
  }
  for (const z of data.zones ?? []) {
    const cx = (z.min[0] + z.max[0]) / 2;
    const cz = (z.min[2] + z.max[2]) / 2;
    const p = new THREE.PointLight(data.id === 3 ? 0xaeb9c7 : 0xa8c8ff, data.id === 3 ? 18 : 30, Math.max(z.max[0] - z.min[0], z.max[2] - z.min[2]) * 1.1, 1.6);
    p.position.set(cx, z.min[1] + ROOM_HEIGHT - 0.4, cz);
    lights.add(p);
    if (data.id === 3 && z.min[1] < 10) addBeacon(cx, z.min[1] + ROOM_HEIGHT, cz, p);
  }

  let rain = null;
  let searchlight = null;
  if (roofRain) {
    const moon = new THREE.DirectionalLight(0xa9c4e4, 0.8);
    moon.position.set(-30, 60, -90); moon.target.position.set(0, 20, -75);
    group.add(moon, moon.target, new THREE.HemisphereLight(0x819bb9, 0x18212c, 0.28));
    const count = 1800;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 30;
      const y = 20 + Math.random() * 14;
      const z = -67.5 - Math.random() * 24;
      positions.set([x, y, z, x + 0.03, y - 0.45, z], i * 6);
    }
    const g = geo(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rain = new THREE.LineSegments(g, own(new THREE.LineBasicMaterial({ color: 0x9fb8e8, transparent: true, opacity: 0.35, depthWrite: false })));
    rain.frustumCulled = false;
    group.add(rain);
    searchlight = new THREE.SpotLight(0xe8f2ff, 900, 60, 0.12, 0.4, 1.2);
    searchlight.position.set(0, 46, -96);
    searchlight.target.position.set(0, 20, -72);
    group.add(searchlight, searchlight.target);
  }

  const collision = createCollision(data);

  function update(dt, time) {
    if (rain) {
      const a = rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i += 2) {
        let y = a.getY(i) - dt * 16;
        if (y < 20) y += 14;
        a.setY(i, y);
        a.setY(i + 1, y - 0.45);
      }
      a.needsUpdate = true;
    }
    for (const [i, b] of beacons.entries()) {
      b.spin.rotation.y = time * 3.2 + i * 1.7;
      const pulse = 0.5 + 0.5 * Math.max(0, Math.sin(time * 6.4 + i));
      b.glow.intensity = b.base * (0.7 + pulse * 1.3);
      b.dome.material.emissiveIntensity = 1.2 + pulse * 2.4;
    }
    if (searchlight) {
      searchlight.target.position.set(Math.sin(time * 0.5) * 9, 20, -72 + Math.cos(time * 0.37) * 6);
    }
  }

  function dispose() {
    for (const g of geometries) g.dispose();
    for (const m of owned) {
      if (m.map && m.map !== materials.steel.map && m.map !== materials.marbleFloor.map) m.map.dispose();
      if (m.normalMap && m.normalMap !== materials.steel.normalMap && m.normalMap !== materials.marbleFloor.normalMap) m.normalMap.dispose();
      m.dispose();
    }
    concreteTex.dispose();
    lights.traverse((l) => l.shadow?.map?.dispose());
    scene.remove(group);
  }

  return { group, ceilings, collision, inside: collision.inside, groundAt: collision.groundAt, update, dispose };
}
