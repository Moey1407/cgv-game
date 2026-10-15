import * as THREE from 'three';

export const LOOT = [
  { id: 'watch', type: 'loot', label: 'Gold pocket watch', value: 4200, stage: 1, x: 1.4, y: 1.1, z: -3.2 },
  { id: 'clutch', type: 'loot', label: 'Beaded clutch', value: 2600, stage: 1, x: -2.4, y: 1.1, z: -11 },
  { id: 'cufflinks', type: 'loot', label: 'Sapphire cufflinks', value: 6800, stage: 1, x: 4.2, y: 1.1, z: -16 },
  { id: 'evidence-1', type: 'evidence', label: 'Security roster with Dex on it', value: 0, stage: 1, x: 10.6, y: 0.86, z: -35.6 }
];

export const PLATES = [
  { id: 'plate-west', x: -4.6, z: -37.2, halfX: 0.75, halfZ: 0.75 },
  { id: 'plate-east', x: 4.6, z: -37.2, halfX: 0.75, halfZ: 0.75 }
];

export const SAFE_POINT = new THREE.Vector3(0, 0, -60.2);

function glow(mesh, colour, intensity) {
  mesh.material.emissive = new THREE.Color(colour);
  mesh.material.emissiveIntensity = intensity;
}

function lootMesh(item, materials) {
  const group = new THREE.Group();
  if (item.id === 'watch') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), materials.gold);
    body.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 16), materials.gold);
    ring.position.y = 0.075;
    group.add(body, ring);
  } else if (item.id === 'clutch') {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0x6a1630, roughness: 0.4, metalness: 0.3 }));
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.07), materials.gold);
    clasp.position.y = 0.06;
    group.add(bag, clasp);
  } else if (item.id === 'cufflinks') {
    const gem = new THREE.MeshStandardMaterial({ color: 0x1f4fff, emissive: 0x0a1a60, roughness: 0.1, metalness: 0.2 });
    for (const x of [-0.04, 0.04]) {
      const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), gem);
      g.position.x = x;
      group.add(g);
    }
  } else {
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.24), new THREE.MeshStandardMaterial({ color: 0xc8a96a, roughness: 0.8 }));
    const stamp = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0xb01020 }));
    stamp.rotation.x = -Math.PI / 2;
    stamp.position.set(0.06, 0.017, 0.06);
    group.add(folder, stamp);
  }
  group.position.set(item.x, item.y + 0.04, item.z);
  group.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return group;
}

export function buildObjects(scene, materials, field) {
  const group = new THREE.Group();
  group.name = 'objects';
  scene.add(group);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.7), new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.6 }));
  desk.position.set(10.6, 0.4, -35.6);
  desk.castShadow = desk.receiveShadow = true;
  field?.patch(desk.material);
  const lamp = new THREE.PointLight(0xffd59a, 3, 3, 2);
  lamp.position.set(10.6, 1.4, -35.6);
  group.add(desk, lamp);

  const loot = new Map();
  for (const item of LOOT) {
    const mesh = lootMesh(item, materials);
    group.add(mesh);
    loot.set(item.id, mesh);
  }

  const plateMeshes = PLATES.map((plate) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0x3a4652, metalness: 0.8, roughness: 0.35 }));
    mesh.position.set(plate.x, 0.025, plate.z);
    mesh.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 48), new THREE.MeshBasicMaterial({ color: 0x72efff, transparent: true, opacity: 0.35 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(plate.x, 0.055, plate.z);
    group.add(mesh, ring);
    return { mesh, ring };
  });

  const shutterMaterial = new THREE.MeshStandardMaterial({ color: 0x4a545e, metalness: 0.85, roughness: 0.45 });
  field?.patch(shutterMaterial);
  const shutter = new THREE.Group();
  for (let i = 0; i < 12; i += 1) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 0.12), shutterMaterial);
    slat.position.y = 0.25 + i * 0.52;
    slat.castShadow = true;
    shutter.add(slat);
  }
  shutter.position.set(0, 0, -39.75);
  const shutterLight = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3f62 }));
  shutterLight.position.set(0, 6.3, -39.7);
  group.add(shutter, shutterLight);

  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), new THREE.MeshPhysicalMaterial({ color: 0x9fd9ff, emissive: 0x1a3a66, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.1, clearcoat: 1, iridescence: 1 }));
  gem.position.set(0, 1.5, -61.6);
  gem.visible = false;
  const gemLight = new THREE.PointLight(0x9fd9ff, 0, 4, 2);
  gemLight.position.set(0, 1.6, -61.0);
  group.add(gem, gemLight);

  const keycard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.01), new THREE.MeshStandardMaterial({ color: 0xe8c46a, emissive: 0x6a4a10, emissiveIntensity: 0.6, roughness: 0.3 }));

  let shutterOpen = false;
  let shutterLift = 0;

  function setPlate(index, active) {
    const p = plateMeshes[index];
    p.ring.material.opacity = active ? 0.95 : 0.35;
    p.ring.material.color.setHex(active ? 0xc7fbff : 0x72efff);
    glow(p.mesh, active ? 0x72efff : 0x000000, active ? 0.6 : 0);
  }

  function openShutter() {
    shutterOpen = true;
    shutterLight.material.color.setHex(0x23ff7a);
  }

  function update(dt, time) {
    if (shutterOpen && shutterLift < 6.4) {
      shutterLift = Math.min(6.4, shutterLift + dt * 2.2);
      shutter.position.y = shutterLift;
    }
    for (const [id, mesh] of loot) if (mesh.visible && id !== 'evidence-1') mesh.rotation.y += dt * 1.2;
    gem.rotation.y += dt * 0.8;
    gem.position.y = 1.7 + Math.sin(time * 1.6) * 0.04;
  }

  function reset({ shutterOpened = false, collected = [] } = {}) {
    shutterOpen = shutterOpened;
    shutterLift = shutterOpened ? 6.4 : 0;
    shutter.position.y = shutterLift;
    shutterLight.material.color.setHex(shutterOpened ? 0x23ff7a : 0xff3f62);
    for (const [id, mesh] of loot) mesh.visible = !collected.includes(id);
    for (let i = 0; i < plateMeshes.length; i += 1) setPlate(i, false);
    gemLight.intensity = 0;
    gem.visible = false;
  }

  return {
    group, loot, keycard, gem, gemLight, setPlate, openShutter, update, reset,
    get shutterOpen() { return shutterOpen; },
    get shutterBlocking() { return shutterLift < 2.2; }
  };
}
