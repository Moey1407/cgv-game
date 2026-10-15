import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { chandelier, framedPainting, cocktailTable, velvetRope, column, bannerTexture } from '../render/props.js';

export const HALL = { halfWidth: 13, front: 8, back: -40, height: 10 };
export const CORRIDOR = { halfWidth: 2.4, front: -40, back: -62, height: 4.2 };

const PAINTINGS = [
  { file: 'starry-night.jpg', width: 3.4, side: -1, z: -6.5 },
  { file: 'the-scream.jpg', width: 1.7, side: -1, z: -13.5 },
  { file: 'wave.jpg', width: 3.4, side: 1, z: -6.5 },
  { file: 'shipwreck.jpg', width: 3.2, side: 1, z: -13.5 }
];

function box(group, w, h, d, material, x, y, z, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export async function buildHall(scene, materials, renderer, { width, height }) {
  const { halfWidth: HW, front: Z0, back: Z1, height: HT } = HALL;
  const L = Z0 - Z1;
  const ZC = (Z0 + Z1) / 2;
  const world = new THREE.Group();
  world.name = 'hall';
  scene.add(world);
  const ceilingGroup = new THREE.Group();
  world.add(ceilingGroup);

  const mirror = new Reflector(new THREE.PlaneGeometry(HW * 2, L), { textureWidth: width, textureHeight: height, color: 0x777777 });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, -0.002, ZC);
  world.add(mirror);

  materials.marbleFloor.transparent = true;
  materials.marbleFloor.opacity = 0.82;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), materials.marbleFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, ZC);
  floor.receiveShadow = true;
  world.add(floor);

  const runner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, L - 6), materials.carpet);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.005, ZC + 1);
  runner.receiveShadow = true;
  world.add(runner);
  for (const x of [-1.62, 1.62]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, L - 6), materials.gold);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.006, ZC + 1);
    world.add(edge);
  }

  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L, HT), materials.damaskWall);
    wall.position.set(s * HW, HT / 2, ZC);
    wall.rotation.y = -s * Math.PI / 2;
    wall.receiveShadow = true;
    world.add(wall);
    box(world, 0.12, 1.3, L, materials.cream, s * (HW - 0.06), 0.65, ZC);
    box(world, 0.16, 0.08, L, materials.gold, s * (HW - 0.08), 1.32, ZC, false);
    box(world, 0.3, 0.6, L, materials.cream, s * (HW - 0.15), HT - 0.3, ZC, false);
    for (let z = Z0 - 6.5; z > Z1 + 2; z -= 7) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshBasicMaterial({ color: 0x2a3f66, fog: false }));
      win.position.set(s * (HW - 0.02), 7.6, z);
      win.rotation.y = -s * Math.PI / 2;
      win.userData.window = true;
      world.add(win);
      box(world, 0.1, 0.12, 2.5, materials.gold, s * (HW - 0.05), 7.6, z, false);
      box(world, 0.1, 2.5, 0.12, materials.gold, s * (HW - 0.05), 7.6, z, false);
    }
    for (let z = Z0 - 3; z > Z1; z -= 7) {
      const c = column(materials, HT);
      c.position.set(s * (HW - 1.1), 0, z);
      world.add(c);
    }
  }

  const backLeft = new THREE.Mesh(new THREE.PlaneGeometry(HW - 3.1, HT), materials.damaskWall);
  backLeft.position.set(-(HW + 3.1) / 2, HT / 2, Z1);
  const backRight = backLeft.clone();
  backRight.position.x = (HW + 3.1) / 2;
  const backTop = new THREE.Mesh(new THREE.PlaneGeometry(6.2, HT - 6.2), materials.damaskWall);
  backTop.position.set(0, 6.2 + (HT - 6.2) / 2, Z1);
  world.add(backLeft, backRight, backTop);
  for (const [x, width, y, height] of [[-9.3, 7.4, 5, 10], [5.1, 15.8, 5, 10], [-4.2, 2.8, 6.6, 6.8]]) {
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materials.damaskWall);
    frontWall.position.set(x, y, Z0); frontWall.rotation.y = Math.PI; world.add(frontWall);
  }
  const oak = new THREE.MeshStandardMaterial({ color: 0x654c35, roughness: 0.56 });
  for (const side of [-1, 1]) {
    box(world, 1.25, 3.05, 0.15, oak, -4.2 + side * 0.64, 1.525, 7.94);
    box(world, 0.045, 2.8, 0.04, materials.brass, -4.2 + side * 0.64, 1.52, 7.84);
    box(world, 0.42, 0.07, 0.1, materials.brass, -4.2 + side * 0.32, 1.12, 7.78);
    box(world, 0.16, 3.3, 0.26, materials.cream, -4.2 + side * 1.4, 1.65, 7.94);
  }
  box(world, 3, 0.2, 0.26, materials.cream, -4.2, 3.25, 7.94);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.42), new THREE.MeshBasicMaterial({ map: bannerTexture('PUBLIC EXIT', 'LOBBY'), side: THREE.DoubleSide }));
  exitSign.position.set(-4.2, 3.65, 7.86); exitSign.rotation.y = Math.PI; world.add(exitSign);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.35, 16, 48, Math.PI), materials.cream);
  arch.position.set(0, 6.2, Z1 + 0.3);
  world.add(arch);
  for (const x of [-3.1, 3.1]) box(world, 0.7, 6.2, 0.7, materials.cream, x, 3.1, Z1 + 0.3);
  const banner = bannerTexture('THE VARGA MUSEUM', 'Closing Night Gala');
  const bannerMaterial = new THREE.MeshStandardMaterial({ map: banner, roughness: 0.6, emissive: 0xffffff, emissiveMap: banner, emissiveIntensity: 0.18 });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), bannerMaterial);
  bannerMesh.position.set(0, 8.3, Z1 + 0.25);
  world.add(bannerMesh);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), materials.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HT, ZC);
  ceilingGroup.add(ceiling);
  for (let z = Z0; z >= Z1; z -= 4) box(ceilingGroup, HW * 2, 0.35, 0.3, materials.darkGold, 0, HT - 0.18, z, false);
  for (let x = -HW; x <= HW; x += 4.33) box(ceilingGroup, 0.3, 0.35, L, materials.darkGold, x, HT - 0.18, ZC, false);

  const chandelierPositions = [-3, -15, -27].map((z) => new THREE.Vector3(0, 7.4, z));
  for (const p of chandelierPositions) {
    const c = chandelier(materials);
    c.position.copy(p);
    ceilingGroup.add(c);
  }

  const loader = new THREE.TextureLoader();
  const pictures = [];
  await Promise.all(PAINTINGS.map((p) => new Promise((resolve) => loader.load('./textures/paintings/' + p.file, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const frame = framedPainting(materials, texture, p.width);
    const x = p.side * (HW - 0.05);
    frame.position.set(x, 3.3, p.z);
    frame.rotation.y = -p.side * Math.PI / 2;
    world.add(frame);
    pictures.push({
      position: new THREE.Vector3(x - p.side * 1.2, 3.3 + frame.userData.height / 2 + 0.9, p.z),
      target: new THREE.Vector3(x, 3.0, p.z)
    });
    resolve();
  }, undefined, resolve))));

  world.add(velvetRope(materials, [-8.5, -6.5, -4.5].map((z) => new THREE.Vector3(-HW + 1.6, 0, z))));
  // A visible social boundary matches Level 1's disguise rule. Guests can
  // pass through the central opening, but security treats it as trespass.
  world.add(velvetRope(materials, [-11, -7, -3].map((x) => new THREE.Vector3(x, 0, -30))));
  world.add(velvetRope(materials, [3, 7, 11].map((x) => new THREE.Vector3(x, 0, -30))));
  const restrictedSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.55),
    // Opaque on purpose: as a transparent, non-depth-writing plane, the see-through
    // marble floor (drawn later) painted over its lower half.
    new THREE.MeshBasicMaterial({ map: bannerTexture('PRIVATE', 'STAFF ONLY'), side: THREE.DoubleSide })
  );
  restrictedSign.position.set(0, 1.15, -30);
  world.add(restrictedSign);

  const tables = [[1.4, -3.2, 4], [-2.4, -11, 3], [4.2, -16, 5], [-1.6, -22, 3], [6.5, -8, 3]].map(([x, z, n], i) => {
    const t = cocktailTable(materials, { glasses: n, seed: i });
    t.position.set(x, 0, z);
    world.add(t);
    return t;
  });

  const corridor = new THREE.Group();
  corridor.name = 'corridor';
  world.add(corridor);
  const { halfWidth: CW, front: C0, back: C1, height: CH } = CORRIDOR;
  const CL = C0 - C1;
  const CZ = (C0 + C1) / 2;
  const cFloor = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CL), materials.steel);
  cFloor.rotation.x = -Math.PI / 2;
  cFloor.position.set(0, 0, CZ);
  cFloor.receiveShadow = true;
  corridor.add(cFloor);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(CL, CH), materials.steel);
    w.position.set(s * CW, CH / 2, CZ);
    w.rotation.y = -s * Math.PI / 2;
    w.receiveShadow = true;
    corridor.add(w);
    for (let z = C0 - 2; z > C1; z -= 4) box(corridor, 0.2, CH, 0.25, materials.darkGold, s * (CW - 0.1), CH / 2, z, false);
  }
  const cCeil = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CL), materials.steel);
  cCeil.rotation.x = Math.PI / 2;
  cCeil.position.set(0, CH, CZ);
  corridor.add(cCeil);
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xb8c4cc, metalness: 1, roughness: 0.18 });
  const vaultHinge = new THREE.Group();
  vaultHinge.position.set(-1.8, 2, C1 + 0.3);
  corridor.add(vaultHinge);
  const vaultDoor = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.5, 64), doorMaterial);
  vaultDoor.rotation.x = Math.PI / 2;
  vaultDoor.position.set(1.8, 0, 0);
  vaultDoor.castShadow = true;
  vaultHinge.add(vaultDoor);
  const dial = new THREE.Group();
  dial.position.set(1.8, 0, 0.35);
  vaultHinge.add(dial);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 32), materials.gold);
  hub.rotation.x = Math.PI / 2;
  dial.add(hub);
  for (let i = 0; i < 3; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), materials.gold);
    spoke.position.z = 0.15;
    spoke.rotation.z = (i * Math.PI * 2) / 3;
    spoke.translateY(0.6);
    dial.add(spoke);
  }
  const notch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3f62 }));
  notch.position.set(0, 0.6, 0.18);
  dial.add(notch);
  for (const s of [-1, 1]) box(corridor, 0.75, 6.2, 0.2, materials.steel, s * 2.78, 3.1, C0 - 0.12, false);
  box(corridor, 6.3, 2.0, 0.2, materials.steel, 0, CH + 1.0, C0 - 0.12, false);
  const backPlate = new THREE.Mesh(new THREE.PlaneGeometry(CW * 2, CH), materials.steel);
  backPlate.position.set(0, CH / 2, C1);
  corridor.add(backPlate);
  const corridorLight = new THREE.PointLight(0xcfe3ff, 6, 10, 2);
  corridorLight.position.set(0, CH - 0.4, C1 + 4);
  corridor.add(corridorLight);

  const layout = {
    key: { position: new THREE.Vector3(1, 9.6, -7), target: new THREE.Vector3(0, 0, -10) },
    chandeliers: chandelierPositions.map((p) => p.clone().setY(7.1)),
    pictures,
    moon: { position: new THREE.Vector3(-30, 26, -6), target: new THREE.Vector3(4, 0, -12) },
    exits: [new THREE.Vector3(HW - 0.4, 2.6, -2), new THREE.Vector3(HW - 0.4, 2.6, -20)],
    beacons: [new THREE.Vector3(-HW + 1.2, 8.8, -10), new THREE.Vector3(HW - 1.2, 8.8, -24), new THREE.Vector3(0, CH - 0.2, -50)]
  };

  const windows = [];
  world.traverse((o) => { if (o.userData.window) windows.push(o); });

  let reflection = 0.5;
  let currentMode = 'gala';
  const viewSize = { width, height };

  function applyFloor() {
    const reflective = reflection > 0;
    mirror.visible = reflective;
    if (materials.marbleFloor.transparent !== reflective) {
      materials.marbleFloor.transparent = reflective;
      materials.marbleFloor.needsUpdate = true;
    }
    materials.marbleFloor.opacity = reflective ? (currentMode === 'gala' ? 0.82 : 0.9) : 1;
  }

  function setReflection(scale, w = viewSize.width, h = viewSize.height) {
    reflection = scale;
    viewSize.width = w;
    viewSize.height = h;
    if (scale > 0) mirror.getRenderTarget().setSize(Math.max(64, Math.round(w * scale)), Math.max(64, Math.round(h * scale)));
    applyFloor();
  }

  function setMode(mode) {
    currentMode = mode;
    for (const w of windows) w.material.color.setHex(mode === 'gala' ? 0x2a3f66 : mode === 'night' ? 0x4a6d99 : 0x4a1a24);
    bannerMaterial.emissiveIntensity = mode === 'gala' ? 0.18 : 0.02;
    applyFloor();
  }

  function inside(p, r = 0.35) {
    const inHall = p.x > -HW + 1.7 + r && p.x < HW - 1.7 - r && p.z < Z0 - r && p.z > Z1 + r;
    const inDoor = Math.abs(p.x) < 2.6 - r && p.z <= Z1 + r + 0.5 && p.z > C0 - 0.5;
    const inCorridor = Math.abs(p.x) < CW - r && p.z <= C0 && p.z > C1 + 0.9 + r;
    return inHall || inDoor || inCorridor;
  }

  return { world, ceilingGroup, layout, tables, setMode, setReflection, inside, vaultDoor, vaultHinge, dial };
}
