import * as THREE from 'three';

export function createZiplineRig(camera) {
  const root = new THREE.Group(); root.visible = false; camera.add(root);
  const metal = new THREE.MeshStandardMaterial({ color: 0xc0b8a3, metalness: 0.65, roughness: 0.4 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x777a75, roughness: 0.9 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x334d66, roughness: 0.85 });
  const geometries = [];
  function bar(a, b, radius, material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radius, radius * 1.05, direction.length(), 10);
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); root.add(mesh);
  }
  bar([-0.27, 0.16, -0.52], [0.27, 0.16, -0.52], 0.027, metal);
  bar([0, 0.16, -0.52], [0, 0.65, -0.52], 0.018, metal);
  for (const side of [-1, 1]) {
    bar([side * 0.39, -0.5, -0.11], [side * 0.2, 0.07, -0.47], 0.063, sleeve);
    bar([side * 0.2, 0.04, -0.48], [side * 0.17, 0.2, -0.52], 0.046, glove);
    bar([side * 0.14, 0.14, -0.48], [side * 0.19, 0.14, -0.54], 0.021, glove);
  }
  root.traverse((mesh) => { mesh.layers.set(3); mesh.frustumCulled = false; });
  camera.layers.enable(3);
  return { root, update(mount, progress, lean, time) {
    root.visible = mount > 0;
    root.position.y = -0.8 * (1 - mount);
    root.rotation.z = -lean * 0.06 + Math.sin(time * 8) * 0.006 * Math.sin(progress * Math.PI);
  }, hide() { root.visible = false; }, dispose() {
    geometries.forEach((g) => g.dispose()); [metal, glove, sleeve].forEach((m) => m.dispose()); camera.remove(root);
  } };
}
