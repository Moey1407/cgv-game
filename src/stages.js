import * as THREE from 'three';

export function createStageSystem({ scene, level, minimapScene, materials, colliders, lights, sharedUniforms }) {
  const vault = new THREE.Group();
  const blackout = new THREE.Group();
  const vaultMap = new THREE.Group();
  const blackoutMap = new THREE.Group();
  const lasers = [];
  const traps = [];
  level.add(vault, blackout);
  minimapScene.add(vaultMap, blackoutMap);

  const mapVault = new THREE.MeshBasicMaterial({ color: 0xb33b58 });
  const mapBlackout = new THREE.MeshBasicMaterial({ color: 0x356d8c });

  function addStageBox(group, mapGroup, stage, size, position, material, mapMaterial, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) {
      colliders.push({
        stage,
        minX: position.x - size.x / 2,
        maxX: position.x + size.x / 2,
        minZ: position.z - size.z / 2,
        maxZ: position.z + size.z / 2
      });
      const map = new THREE.Mesh(new THREE.BoxGeometry(size.x, 0.14, size.z), mapMaterial);
      map.position.set(position.x, 0.02, position.z);
      mapGroup.add(map);
    }
    return mesh;
  }

  // Level 2: an alternating vault gauntlet. Each blast wall forces a different route.
  const vaultWalls = [
    [new THREE.Vector3(20, 3.8, 0.55), new THREE.Vector3(7, 1.9, 8)],
    [new THREE.Vector3(20, 3.8, 0.55), new THREE.Vector3(-7, 1.9, 0)],
    [new THREE.Vector3(20, 3.8, 0.55), new THREE.Vector3(7, 1.9, -8)],
    [new THREE.Vector3(20, 3.8, 0.55), new THREE.Vector3(-7, 1.9, -15)]
  ];
  for (const [size, position] of vaultWalls) {
    addStageBox(vault, vaultMap, 2, size, position, materials.dark, mapVault);
  }

  // Armoured vault ribs make the layout read differently from the gallery.
  for (const [x, z] of [[-15.2, 12], [15.2, 4], [-15.2, -4], [15.2, -12]]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.4, 1.1), materials.stone);
    rib.position.set(x, 2.2, z);
    rib.rotation.y = Math.PI / 4;
    rib.castShadow = true;
    vault.add(rib);
  }

  const laserMaterial = new THREE.MeshBasicMaterial({
    color: 0xff315a,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending
  });
  const emitterMaterial = new THREE.MeshStandardMaterial({ color: 0x281018, emissive: 0xff214a, emissiveIntensity: 2.4, metalness: 0.7, roughness: 0.25 });

  function addLaserGate(x, z, length, baseY, amplitude, speed, phase) {
    const rig = new THREE.Group();
    rig.position.set(x, baseY, z);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, length, 8), laserMaterial.clone());
    beam.rotation.z = Math.PI / 2;
    const emitterA = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 10), emitterMaterial);
    const emitterB = emitterA.clone();
    emitterA.rotation.z = Math.PI / 2;
    emitterB.rotation.z = Math.PI / 2;
    emitterA.position.x = -length / 2;
    emitterB.position.x = length / 2;
    rig.add(beam, emitterA, emitterB);
    vault.add(rig);

    for (const railX of [x - length / 2, x + length / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), emitterMaterial);
      rail.position.set(railX, 1.4, z);
      rail.material = emitterMaterial.clone();
      rail.material.emissiveIntensity = 0.65;
      vault.add(rail);
    }

    const glow = new THREE.PointLight(0xff214a, 4, 4.5, 2);
    glow.position.set(0, 0, 0);
    rig.add(glow);
    lasers.push({ x, z, length, baseY, amplitude, speed, phase, rig, beam, currentY: baseY });
  }

  addLaserGate(-8, 5.3, 16, 1.18, 0, 0, 0);
  addLaserGate(8, -2.7, 16, 1.15, 0.72, 1.25, 0.4);
  addLaserGate(-8, -10.4, 16, 1.1, 0.62, 1.55, 2.2);
  addLaserGate(8, -17.1, 16, 1.2, 0.42, 1.05, 4.1);

  function addFloorTrap(x, z, width = 2.5, depth = 2.5, phase = 0) {
    const material = new THREE.MeshStandardMaterial({ color: 0x21080e, emissive: 0xff284f, emissiveIntensity: 0.55, roughness: 0.48, metalness: 0.72 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, depth), material);
    plate.position.set(x, 0.045, z);
    vault.add(plate);
    const warning = new THREE.Mesh(
      new THREE.RingGeometry(Math.min(width, depth) * 0.25, Math.min(width, depth) * 0.33, 4),
      new THREE.MeshBasicMaterial({ color: 0xff315a, transparent: true, opacity: 0.52, side: THREE.DoubleSide })
    );
    warning.rotation.x = -Math.PI / 2;
    warning.rotation.z = Math.PI / 4;
    warning.position.set(x, 0.095, z);
    vault.add(warning);
    traps.push({ x, z, halfX: width / 2, halfZ: depth / 2, plate, warning, phase });
  }

  addFloorTrap(8.5, 3.6, 2.8, 2.5, 0.2);
  addFloorTrap(-8.5, -4.2, 2.6, 3.0, 1.7);
  addFloorTrap(7.8, -12.2, 3.1, 2.4, 3.1);

  for (const z of [12, 4, -4, -12, -19]) {
    const lamp = new THREE.PointLight(0xff315a, 7, 6, 2);
    lamp.position.set(z % 2 === 0 ? -2.8 : 2.8, 2.8, z);
    vault.add(lamp);
  }

  // Level 3: a reshaped blackout maze. Geometry reads only when wavefronts cross it.
  const blackoutWalls = [
    [new THREE.Vector3(8, 4.4, 0.5), new THREE.Vector3(-9, 2.2, 13)],
    [new THREE.Vector3(8, 4.4, 0.5), new THREE.Vector3(9, 2.2, 13)],
    [new THREE.Vector3(0.5, 4.4, 8), new THREE.Vector3(-11, 2.2, 5)],
    [new THREE.Vector3(0.5, 4.4, 8), new THREE.Vector3(11, 2.2, 5)],
    [new THREE.Vector3(11, 4.4, 0.5), new THREE.Vector3(-8.5, 2.2, -7)],
    [new THREE.Vector3(11, 4.4, 0.5), new THREE.Vector3(8.5, 2.2, -7)],
    [new THREE.Vector3(0.5, 4.4, 7), new THREE.Vector3(0, 2.2, -16)]
  ];
  for (const [size, position] of blackoutWalls) {
    addStageBox(blackout, blackoutMap, 3, size, position, materials.dark, mapBlackout);
  }
  for (const [x, z] of [[-13, -14], [13, -14], [-6, 1], [6, 1]]) {
    const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), materials.stone);
    monolith.scale.y = 2.4;
    monolith.position.set(x, 2.5, z);
    monolith.rotation.y = Math.PI / 4;
    blackout.add(monolith);
  }

  const configurations = {
    1: {
      name: 'GALLERIES',
      objective: 'Locate the gallery artefact',
      intro: 'Read the echoes. Misdirect the guard. Reach the display chamber.',
      artifact: new THREE.Vector3(0, 1.55, -19.2),
      guard: new THREE.Vector3(10, 0, -10),
      guardSpeed: 1.65,
      waypoints: [
        new THREE.Vector3(10, 0, -10),
        new THREE.Vector3(10, 0, 5),
        new THREE.Vector3(-10, 0, 5),
        new THREE.Vector3(-10, 0, -10),
        new THREE.Vector3(0, 0, -16)
      ],
      accent: 0x72efff,
      ambient: 0.3,
      fog: 0x04101a,
      fogDensity: 0.021
    },
    2: {
      name: 'THE VAULT',
      objective: 'Cross the moving grid and avoid floor traps',
      intro: 'New floorplan // Weave through moving lasers and armed pressure plates.',
      artifact: new THREE.Vector3(0, 1.55, -19),
      guard: new THREE.Vector3(-10, 0, 12),
      guardSpeed: 1.85,
      waypoints: [
        new THREE.Vector3(-10, 0, 12),
        new THREE.Vector3(-10, 0, 4),
        new THREE.Vector3(10, 0, 4),
        new THREE.Vector3(10, 0, -4),
        new THREE.Vector3(-10, 0, -4),
        new THREE.Vector3(-10, 0, -12),
        new THREE.Vector3(10, 0, -12),
        new THREE.Vector3(8, 0, -18)
      ],
      accent: 0xff315a,
      ambient: 0.17,
      fog: 0x10040a,
      fogDensity: 0.026
    },
    3: {
      name: 'BLACKOUT',
      objective: 'Navigate by sound alone',
      intro: 'Power failure // A separate maze. The map feed is jammed; sonar reveals the walls.',
      artifact: new THREE.Vector3(12, 1.55, -16),
      guard: new THREE.Vector3(-12, 0, -14),
      guardSpeed: 2.05,
      waypoints: [
        new THREE.Vector3(-12, 0, -14),
        new THREE.Vector3(-12, 0, 8),
        new THREE.Vector3(0, 0, 12),
        new THREE.Vector3(12, 0, 8),
        new THREE.Vector3(12, 0, -14),
        new THREE.Vector3(0, 0, -5)
      ],
      accent: 0x72efff,
      ambient: 0.035,
      fog: 0x00040a,
      fogDensity: 0.032
    }
  };

  function setStage(stage) {
    const config = configurations[stage];
    vault.visible = stage === 2;
    vaultMap.visible = stage === 2;
    blackout.visible = stage === 3;
    blackoutMap.visible = stage === 3;
    sharedUniforms.uAmbient.value = config.ambient;
    scene.background.setHex(config.fog);
    scene.fog.color.setHex(config.fog);
    scene.fog.density = config.fogDensity;
    for (const light of lights) light.visible = stage !== 3;
    return config;
  }

  function update(stage, player, crouching, elapsed, onHazardTrip) {
    if (stage !== 2) return;
    for (let i = 0; i < lasers.length; i += 1) {
      const laser = lasers[i];
      laser.currentY = laser.baseY + Math.sin(elapsed * laser.speed + laser.phase) * laser.amplitude;
      laser.rig.position.y = laser.currentY;
      laser.beam.material.opacity = 0.58 + Math.sin(elapsed * 7 + i) * 0.22;
      const playerHeight = crouching ? 0.96 : 1.72;
      if (Math.abs(player.z - laser.z) < 0.2 && Math.abs(player.x - laser.x) < laser.length / 2 && laser.currentY < playerHeight) {
        onHazardTrip('laser');
        return;
      }
    }

    for (const trap of traps) {
      const pulse = 0.48 + Math.sin(elapsed * 3.2 + trap.phase) * 0.3;
      trap.plate.material.emissiveIntensity = 0.45 + pulse;
      trap.warning.material.opacity = 0.32 + pulse * 0.42;
      trap.warning.rotation.z = Math.PI / 4 + elapsed * 0.35;
      if (Math.abs(player.x - trap.x) < trap.halfX && Math.abs(player.z - trap.z) < trap.halfZ) {
        onHazardTrip('trap');
        return;
      }
    }
  }

  return { setStage, update, configurations, hazards: { lasers, traps } };
}
