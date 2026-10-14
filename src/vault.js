import * as THREE from 'three';
import { createArchiveReel } from './reel.js';

export const SIGNATURES = {
  single: { name: 'SINGLE ECHO', glyph: '|', offsets: [0] },
  double: { name: 'DOUBLE ECHO', glyph: '||', offsets: [0, 0.2] },
  triple: { name: 'TRIPLE ECHO', glyph: '| | |', offsets: [0, 0.65, 1.3] }
};
export const VAULT_CASES = [
  { id: 'A', x: 5, z: 14 },
  { id: 'B', x: 8, z: -20 },
  { id: 'C', x: 11, z: 2 }
];

export function createVaultMission({ level, materials, colliders, createLabelPanel, random = Math.random }) {
  const group = new THREE.Group();
  level.add(group);
  const cases = VAULT_CASES.map((config, index) => {
    const position = new THREE.Vector3(config.x, 1.55, config.z);
    const access = position.clone();
    access.z += 1.05;
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 1.6), materials.stone);
    pedestal.position.set(config.x, 0.525, config.z);
    group.add(pedestal);
    colliders.push({ stage: 2, minX: config.x - 0.9, maxX: config.x + 0.9,
      minZ: config.z - 0.8, maxZ: config.z + 0.8 });
    const diamond = createArchiveReel(0.92);
    diamond.position.copy(position);
    group.add(diamond);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.35, 1.45),
      new THREE.MeshPhysicalMaterial({ color: 0x8de9f5, transparent: true,
        opacity: 0.08, roughness: 0.06, depthWrite: false }));
    glass.position.set(config.x, 1.725, config.z);
    group.add(glass);
    const label = createLabelPanel('CASE ' + config.id, 1.55);
    label.position.set(config.x, 0.65, config.z + 0.82);
    group.add(label);
    const echoes = [0, 1, 2].map(() => {
      const echo = new THREE.Mesh(new THREE.RingGeometry(0.92, 0.97, 64),
        new THREE.MeshBasicMaterial({ color: 0x72efff, side: THREE.DoubleSide,
          transparent: true, opacity: 0.8, depthWrite: false }));
      echo.rotation.x = -Math.PI / 2;
      echo.position.set(config.x, 0.08, config.z);
      echo.visible = false;
      group.add(echo);
      return { mesh: echo };
    });
    return { ...config, signature: Object.keys(SIGNATURES)[index], position, access, diamond, glass, echoes,
      scanned: false, responseTime: 0, responseAge: 0, unlocked: false };
  });
  let wrongCooldown = 0;
  let acquired = false;
  let keySignature;
  function newHeist() {
    const signatures = Object.keys(SIGNATURES);
    for (let i = signatures.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [signatures[i], signatures[j]] = [signatures[j], signatures[i]];
    }
    cases.forEach((exhibit, index) => { exhibit.signature = signatures[index]; });
    keySignature = Object.keys(SIGNATURES)[Math.floor(random() * 3)];
  }
  newHeist();

  return {
    cases,
    newHeist,
    get keySignature() { return keySignature; },
    get acquired() { return acquired; },
    reset(stage) {
      group.visible = stage === 2;
      wrongCooldown = 0;
      acquired = false;
      for (const exhibit of cases) {
        exhibit.scanned = exhibit.unlocked = false;
        exhibit.responseTime = exhibit.responseAge = 0;
        exhibit.diamond.visible = exhibit.glass.visible = true;
        exhibit.echoes.forEach(({ mesh }) => { mesh.visible = false; });
      }
    },
    // Called when an expanding player sonar wave reaches a case, using the
    // same spherical distance and radius as the environment shader.
    scanWave(ring, previousRadius, radius) {
      if (ring.source !== 'sonar') return [];
      ring.scannedCases ??= new Set();
      const reached = [];
      for (const exhibit of cases) {
        const distance = ring.position.distanceTo(exhibit.position);
        if (distance > ring.maxRadius || distance < previousRadius || distance > radius || ring.scannedCases.has(exhibit.id)) continue;
        ring.scannedCases.add(exhibit.id);
        exhibit.scanned = true;
        exhibit.responseTime = 10;
        exhibit.responseAge = 0;
        reached.push(exhibit);
      }
      return reached;
    },
    tryUnlock(exhibit, hasKey) {
      if (!hasKey) return 'no-key';
      if (acquired || exhibit.unlocked) return 'already-open';
      if (!exhibit.scanned) return 'scan-first';
      if (exhibit.signature !== keySignature) {
        if (wrongCooldown > 0) return 'cooldown';
        wrongCooldown = 2;
        return 'wrong';
      }
      acquired = exhibit.unlocked = true;
      exhibit.diamond.visible = exhibit.glass.visible = false;
      return 'diamond';
    },
    readout() {
      return 'KEY: ' + SIGNATURES[keySignature].glyph + ' ' + SIGNATURES[keySignature].name + '  ·  ' +
        cases.map((exhibit) => exhibit.id + ': ' +
          (exhibit.scanned ? SIGNATURES[exhibit.signature].glyph + ' ' + SIGNATURES[exhibit.signature].name : '?')).join('  ·  ');
    },
    update(dt) {
      wrongCooldown = Math.max(0, wrongCooldown - dt);
      for (const exhibit of cases) {
        exhibit.responseTime = Math.max(0, exhibit.responseTime - dt);
        exhibit.responseAge += dt;
        exhibit.diamond.rotation.y += dt * 0.75;
        const cycle = (exhibit.responseAge % 2.6) * 1.7;
        const offsets = SIGNATURES[exhibit.signature].offsets;
        exhibit.echoes.forEach(({ mesh }, index) => {
          const offset = offsets[index] ?? 0;
          mesh.visible = index < offsets.length && exhibit.responseTime > 0 && !exhibit.unlocked && cycle > offset;
          mesh.scale.setScalar(Math.max(0.01, 1 + cycle - offset));
          mesh.material.opacity = Math.max(0, 0.9 - cycle / 5);
        });
      }
    }
  };
}
