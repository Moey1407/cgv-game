import * as THREE from 'three';

// A compact sealed recording reel. The simple procedural silhouette keeps the
// project asset-free while making the target read as evidence, not treasure.
export function createArchiveReel(scale = 1) {
  const group = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xd9ad55,
    emissive: 0x8a4c12,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.78,
    clearcoat: 0.7
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x111820,
    emissive: 0x4f2b0d,
    emissiveIntensity: 0.18,
    roughness: 0.45,
    metalness: 0.55
  });
  const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffd98a });

  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 32), dark);
  spool.rotation.x = Math.PI / 2;
  group.add(spool);

  for (const z of [-0.105, 0.105]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.055, 10, 40), gold);
    rim.position.z = z;
    group.add(rim);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 20), gold);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  for (let i = 0; i < 5; i += 1) {
    const angle = i / 5 * Math.PI * 2;
    const aperture = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.02, 14), dark);
    aperture.rotation.x = Math.PI / 2;
    aperture.position.set(Math.cos(angle) * 0.235, Math.sin(angle) * 0.235, 0.205);
    group.add(aperture);
  }

  const label = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.035), labelMaterial);
  label.position.set(0, -0.34, 0.22);
  group.add(label);

  group.scale.setScalar(scale);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  return group;
}
