import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const FORWARD = { soldier: Math.PI, xbot: 0, michelle: 0 };

const loader = new GLTFLoader();
const cache = new Map();

export function loadCharacter(url) {
  if (!cache.has(url)) cache.set(url, new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject)));
  return cache.get(url);
}

export function spawnCharacter(gltf, { clip, time = 0, position, rotationY = 0, forward = 0, recolor, field, castShadow = true, cull = false } = {}) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(gltf.scene);
  model.rotation.y = forward;
  root.add(model);
  if (position) root.position.copy(position);
  root.rotation.y = rotationY;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = castShadow;
    child.receiveShadow = false;
    child.frustumCulled = cull;
    if (recolor) {
      child.material = child.material.clone();
      recolor(child.material);
    }
    if (field && 'emissive' in child.material) {
      if (!recolor) child.material = child.material.clone();
      field.patch(child.material);
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const animation of gltf.animations) actions[animation.name] = mixer.clipAction(animation);
  const first = actions[clip] ?? Object.values(actions)[0];
  if (first) first.play();
  mixer.setTime(time);
  let current = first;
  function play(name, fade = 0.3) {
    const next = actions[name];
    if (!next || next === current) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, fade, false);
    current = next;
  }
  return { root, model, mixer, actions, play, update: (dt) => mixer.update(dt) };
}

let blobTexture = null;

export function blobShadow(radius = 0.45, opacity = 0.55) {
  if (!blobTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const g = canvas.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    blobTexture = new THREE.CanvasTexture(canvas);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  mesh.renderOrder = 1;
  return mesh;
}
