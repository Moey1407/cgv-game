import * as THREE from 'three';

export function createStageSystem({ scene, level, minimapScene, materials, colliders, lights, sharedUniforms }) {
  const vault = new THREE.Group();
  const blackout = new THREE.Group();
  const vaultMap = new THREE.Group();
  const blackoutMap = new THREE.Group();
  const lasers = [];
  level.add(vault, blackout);
  minimapScene.add(vaultMap, blackoutMap);

  const mapVault = new THREE.MeshBasicMaterial({ color: 0x70283a });
  const mapBlackout = new THREE.MeshBasicMaterial({ color: 0x25445d });

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

  // Level 2: a tight emergency-lit vault spine with crouch-only laser gates.
  addStageBox(vault, vaultMap, 2, new THREE.Vector3(4.8, 3.4, 0.35), new THREE.Vector3(-14.2, 1.7, 3.2), materials.dark, mapVault);
  addStageBox(vault, vaultMap, 2, new THREE.Vector3(4.8, 3.4, 0.35), new THREE.Vector3(14.2, 1.7, 3.2), materials.dark, mapVault);
  addStageBox(vault, vaultMap, 2, new THREE.Vector3(0.4, 3.4, 10), new THREE.Vector3(-3.8, 1.7, -11.5), materials.dark, mapVault);
  addStageBox(vault, vaultMap, 2, new THREE.Vector3(0.4, 3.4, 10), new THREE.Vector3(3.8, 1.7, -11.5), materials.dark, mapVault);

  const laserMaterial = new THREE.MeshBasicMaterial({
    color: 0xff315a,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending
  });
  for (const z of [4.3, -5.8, -12.8]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 6.8, 8), laserMaterial.clone());
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 1.12, z);
    vault.add(beam);
    const glow = new THREE.PointLight(0xff214a, 4, 4, 2);
    glow.position.set(0, 1.2, z);
    vault.add(glow);
    lasers.push({ z, width: 3.6, beam });
  }

  for (const z of [7, -2, -11, -19]) {
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
      ambient: 0.2,
      fog: 0x02050a,
      fogDensity: 0.026
    },
    2: {
      name: 'THE VAULT',
      objective: 'Crouch beneath the laser grid',
      intro: 'Security escalation // Stay low beneath every red beam.',
      artifact: new THREE.Vector3(0, 1.55, -18),
      guard: new THREE.Vector3(-10, 0, -8),
      guardSpeed: 1.85,
      waypoints: [
        new THREE.Vector3(-10, 0, -8),
        new THREE.Vector3(-10, 0, 6),
        new THREE.Vector3(8, 0, 6),
        new THREE.Vector3(8, 0, -17),
        new THREE.Vector3(-8, 0, -17)
      ],
      accent: 0xff315a,
      ambient: 0.095,
      fog: 0x090207,
      fogDensity: 0.03
    },
    3: {
      name: 'BLACKOUT',
      objective: 'Navigate by sound alone',
      intro: 'Power failure // No map. Every footstep briefly reveals the way.',
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
      ambient: 0.012,
      fog: 0x000103,
      fogDensity: 0.038
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

  function update(stage, player, crouching, elapsed, onLaserTrip) {
    if (stage !== 2) return;
    for (let i = 0; i < lasers.length; i += 1) {
      const laser = lasers[i];
      laser.beam.material.opacity = 0.58 + Math.sin(elapsed * 7 + i) * 0.22;
      if (!crouching && Math.abs(player.z - laser.z) < 0.18 && Math.abs(player.x) < laser.width) {
        onLaserTrip();
        return;
      }
    }
  }

  return { setStage, update, configurations };
}
