import * as THREE from 'three';
import { bannerTexture } from '../render/props.js';

const WING_WALL = /^(wing-|office-)/;
const HEIGHT = 3.2;

function screenTexture(title, line) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const g = canvas.getContext('2d');
  g.fillStyle = '#071423';
  g.fillRect(0, 0, 256, 160);
  for (let y = 0; y < 160; y += 4) {
    g.fillStyle = 'rgba(114,239,255,0.04)';
    g.fillRect(0, y, 256, 2);
  }
  g.fillStyle = '#72efff';
  g.font = 'bold 22px monospace';
  g.textAlign = 'center';
  g.fillText(title, 128, 74);
  g.fillStyle = '#9fb7bd';
  g.font = '14px monospace';
  g.fillText(line, 128, 102);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSecurityWing(scene, materials, field, level) {
  const group = new THREE.Group();
  group.name = 'security-wing';
  scene.add(group);
  const ceilings = new THREE.Group();
  group.add(ceilings);
  const geometries = [];
  const owned = [];
  const geo = (g) => { geometries.push(g); return g; };
  const own = (m) => { owned.push(m); if (field && 'emissive' in m) field.patch(m); return m; };

  const plaster = own(new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.85 }));
  const skirting = own(new THREE.MeshStandardMaterial({ color: 0x2d2a26, roughness: 0.6 }));
  const metal = own(new THREE.MeshStandardMaterial({ color: 0x3b434c, metalness: 0.65, roughness: 0.4 }));
  const wood = own(new THREE.MeshStandardMaterial({ color: 0x3a2a1d, roughness: 0.55 }));
  const fabric = own(new THREE.MeshStandardMaterial({ color: 0x24344a, roughness: 0.95 }));
  const ceilingMat = own(new THREE.MeshStandardMaterial({ color: 0x5c5a56, roughness: 0.9 }));
  const lino = own(new THREE.MeshStandardMaterial({ color: 0x4d4e4a, roughness: 0.7 }));

  const add = (g, m, x, y, z, cast = true) => {
    const mesh = new THREE.Mesh(geo(g), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  for (const f of level.floors.filter((f) => f.pos[0] > 11)) {
    const [w, , d] = f.size;
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, d)), f.surface === 'carpet' ? materials.carpet : lino);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(f.pos[0], 0.004, f.pos[2]);
    floor.receiveShadow = true;
    group.add(floor);
    const ceil = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, d)), ceilingMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(f.pos[0], HEIGHT, f.pos[2]);
    ceilings.add(ceil);
  }

  for (const w of level.walls.filter((w) => WING_WALL.test(w.name))) {
    add(new THREE.BoxGeometry(...w.size), plaster, ...w.pos, false);
    add(new THREE.BoxGeometry(w.size[0] + 0.02, 0.12, w.size[2] + 0.02), skirting, w.pos[0], 0.06, w.pos[2], false);
  }
  const lintel = add(new THREE.BoxGeometry(0.2, HEIGHT - 2.4, 2), plaster, 17, 2.4 + (HEIGHT - 2.4) / 2, -19.5, false);
  lintel.receiveShadow = true;

  const prop = (name) => level.walls.find((w) => w.name === name);
  const desk = prop('security-desk');
  add(new THREE.BoxGeometry(desk.size[0], 0.06, desk.size[2]), wood, desk.pos[0], 0.87, desk.pos[2]);
  add(new THREE.BoxGeometry(desk.size[0] - 0.1, 0.82, desk.size[2] - 0.1), metal, desk.pos[0], 0.41, desk.pos[2]);

  const offline = screenTexture('NO SIGNAL', 'SECURITY NETWORK');
  const monitors = [];
  for (let i = 0; i < 4; i += 1) {
    const z = desk.pos[2] - 1.5 + i;
    add(new THREE.BoxGeometry(0.08, 0.5, 0.82), metal, desk.pos[0] + 0.45, 1.25, z);
    add(new THREE.BoxGeometry(0.06, 0.32, 0.06), metal, desk.pos[0] + 0.47, 0.98, z);
    const screen = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.74, 0.42)), own(new THREE.MeshBasicMaterial({ map: offline, toneMapped: false })));
    screen.position.set(desk.pos[0] + 0.405, 1.25, z);
    screen.rotation.y = -Math.PI / 2;
    group.add(screen);
    monitors.push(screen);
  }
  const keyboard = add(new THREE.BoxGeometry(0.22, 0.03, 0.6), metal, desk.pos[0] - 0.25, 0.915, desk.pos[2]);
  keyboard.castShadow = false;

  const rig = new THREE.Group();
  rig.position.set(desk.pos[0] - 0.35, 0.92, desk.pos[2] + 0.75);
  const rigBody = new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.06, 0.3)), own(new THREE.MeshStandardMaterial({ color: 0x15181c, metalness: 0.6, roughness: 0.4 })));
  const rigLed = new THREE.Mesh(geo(new THREE.BoxGeometry(0.03, 0.02, 0.03)), own(new THREE.MeshBasicMaterial({ color: 0x23ff7a })));
  rigLed.position.set(-0.07, 0.04, 0.1);
  rig.add(rigBody, rigLed);
  rig.visible = false;
  group.add(rig);

  const chair = new THREE.Group();
  chair.position.set(desk.pos[0] - 1.05, 0, desk.pos[2] - 0.4);
  const seat = new THREE.Mesh(geo(new THREE.BoxGeometry(0.5, 0.08, 0.5)), fabric);
  seat.position.y = 0.48;
  const back = new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.6, 0.5)), fabric);
  back.position.set(-0.24, 0.8, 0);
  const post = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8)), metal);
  post.position.y = 0.23;
  chair.add(seat, back, post);
  chair.rotation.y = 0.35;
  group.add(chair);

  const cabinet = prop('records-cabinet');
  add(new THREE.BoxGeometry(...cabinet.size), metal, ...cabinet.pos);
  for (let i = 0; i < 3; i += 1) add(new THREE.BoxGeometry(0.5, 0.03, 0.02), materials.brass, cabinet.pos[0] - 0.55 + i * 0.55, 0.85, cabinet.pos[2] - 0.36, false);

  const lockers = prop('staff-lockers');
  for (let i = 0; i < 3; i += 1) {
    const x = lockers.pos[0] - 0.6 + i * 0.6;
    add(new THREE.BoxGeometry(0.56, lockers.size[1], lockers.size[2]), metal, x, lockers.pos[1], lockers.pos[2]);
    add(new THREE.BoxGeometry(0.3, 0.03, 0.02), skirting, x, 1.7, lockers.pos[2] + 0.36, false);
  }

  const sofa = prop('office-sofa');
  add(new THREE.BoxGeometry(sofa.size[0], 0.42, sofa.size[2]), fabric, sofa.pos[0], 0.21, sofa.pos[2]);
  add(new THREE.BoxGeometry(sofa.size[0], 0.5, 0.2), fabric, sofa.pos[0], 0.62, sofa.pos[2] + 0.35);

  const boardTex = bannerTexture('SHIFT ROSTER', 'Gala night · 18:00 to 02:00');
  const board = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.6, 0.45)), own(new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.8 })));
  board.position.set(21, 1.9, -24.98);
  group.add(board);

  const lights = [];
  for (const [x, z, colour, intensity] of [[20, -17, 0xdfe8f0, 9], [20, -22, 0xdfe8f0, 9], [15.2, -19.5, 0xffe2b0, 4]]) {
    const light = new THREE.PointLight(colour, intensity, 9, 1.8);
    light.position.set(x, HEIGHT - 0.3, z);
    group.add(light);
    lights.push(light);
    add(new THREE.BoxGeometry(0.9, 0.04, 0.3), own(new THREE.MeshBasicMaterial({ color: 0xf2f4f6 })), x, HEIGHT - 0.03, z, false);
  }
  const glow = new THREE.PointLight(0x72efff, 2.2, 3.5, 2);
  glow.position.set(desk.pos[0] - 0.2, 1.3, desk.pos[2]);
  group.add(glow);

  const wingSign = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.2, 0.3)), own(new THREE.MeshBasicMaterial({ map: bannerTexture('SECURITY', 'AUTHORISED STAFF'), side: THREE.DoubleSide })));
  wingSign.position.set(16.88, 2.7, -19.5);
  wingSign.rotation.y = -Math.PI / 2;
  group.add(wingSign);

  let live = false;
  function setLive(feeds) {
    live = Boolean(feeds?.length);
    rig.visible = live;
    monitors.forEach((m, i) => {
      const feed = live ? feeds[i % feeds.length] : null;
      m.material.map = feed ? feed.target.texture : offline;
      m.material.needsUpdate = true;
    });
  }

  function update(time) {
    rigLed.visible = !live || Math.sin(time * 6) > -0.4;
    glow.intensity = live ? 2.6 + Math.sin(time * 3) * 0.4 : 1.4;
  }

  function dispose() {
    setLive(null);
    for (const g of geometries) g.dispose();
    for (const m of owned) { m.map?.dispose?.(); m.dispose(); }
    offline.dispose();
    boardTex.dispose();
    lights.forEach((l) => l.shadow?.map?.dispose());
    scene.remove(group);
  }

  return { group, ceilings, monitors, setLive, update, dispose, get live() { return live; } };
}
