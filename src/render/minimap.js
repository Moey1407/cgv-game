import * as THREE from 'three';

export const LAYER_WORLD_ONLY = 1;
export const LAYER_MAP_ONLY = 2;

export function createMinimap(renderer, scene, { width = 36, height = 24, altitude = 30, rate = 8 } = {}) {
  const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, altitude + 20);
  camera.up.set(0, 0, -1);
  camera.position.set(0, altitude, 0);
  camera.lookAt(0, 0, 0);
  camera.layers.enable(LAYER_MAP_ONLY);
  camera.layers.disable(LAYER_WORLD_ONLY);

  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  const screen = new THREE.Scene();
  screen.add(quad);
  const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const markers = [];
  const markerGeometry = new THREE.ShapeGeometry(new THREE.Shape([
    new THREE.Vector2(0, -0.9), new THREE.Vector2(0.6, 0.6), new THREE.Vector2(0, 0.25), new THREE.Vector2(-0.6, 0.6)
  ]));
  markerGeometry.rotateX(-Math.PI / 2);
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let interval = 1 / rate;
  let age = Infinity;

  function hideFromMap(object) {
    object.traverse((child) => child.layers.set(LAYER_WORLD_ONLY));
  }

  function addMarker(object, colour, scale = 1, offset = 0) {
    const mesh = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: colour, depthTest: false, fog: false }));
    mesh.scale.setScalar(scale);
    mesh.renderOrder = 10;
    mesh.layers.set(LAYER_MAP_ONLY);
    scene.add(mesh);
    const marker = { mesh, target: object, offset };
    markers.push(marker);
    return marker;
  }

  function removeMarker(marker) {
    const i = markers.indexOf(marker);
    if (i >= 0) markers.splice(i, 1);
    scene.remove(marker.mesh);
    marker.mesh.material.dispose();
  }

  function update(follow, bounds, dt = 0) {
    age += dt;
    for (const marker of markers) {
      marker.target.getWorldPosition(marker.mesh.position);
      marker.mesh.position.y = altitude - 2;
      marker.target.getWorldQuaternion(q);
      marker.mesh.rotation.set(0, e.setFromQuaternion(q, 'YXZ').y + marker.offset, 0);
    }
    if (!follow) return;
    camera.position.x = follow.x;
    camera.position.z = follow.z;
    if (bounds) {
      const hx = Math.max(0, (bounds.maxX - bounds.minX) / 2 - camera.right);
      const hz = Math.max(0, (bounds.maxZ - bounds.minZ) / 2 - camera.top);
      const cx = (bounds.maxX + bounds.minX) / 2;
      const cz = (bounds.maxZ + bounds.minZ) / 2;
      camera.position.x = THREE.MathUtils.clamp(follow.x, cx - hx, cx + hx);
      camera.position.z = THREE.MathUtils.clamp(follow.z, cz - hz, cz + hz);
    }
  }

  function refresh(viewport) {
    if (target.width !== viewport.w || target.height !== viewport.h) {
      target.setSize(viewport.w, viewport.h);
      age = Infinity;
    }
    if (age < interval) return;
    age = 0;
    camera.right = (width / 2) * (viewport.w / viewport.h) / (width / height);
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
    const fog = scene.fog;
    scene.fog = null;
    const shadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = shadows;
    scene.fog = fog;
  }

  function render(viewport) {
    refresh(viewport);
    const size = renderer.getSize(new THREE.Vector2());
    const y = size.y - viewport.y - viewport.h;
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setScissorTest(true);
    renderer.setViewport(viewport.x, y, viewport.w, viewport.h);
    renderer.setScissor(viewport.x, y, viewport.w, viewport.h);
    renderer.render(screen, screenCamera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.autoClear = auto;
  }

  function setRate(value) {
    interval = 1 / value;
  }

  function dispose() {
    target.dispose();
    quad.geometry.dispose();
    quad.material.dispose();
  }

  return { camera, hideFromMap, addMarker, removeMarker, update, render, setRate, dispose };
}
