import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const vertexShader = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uNight;
uniform float uAlarm;
uniform vec3 uMoonDir;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float skyline(float a) {
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    float s = 6.0 + float(i) * 9.0;
    float c = floor(a * s);
    h = max(h, (0.02 + hash(vec2(c, float(i))) * 0.09) * (1.0 - float(i) * 0.25));
  }
  return h;
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 dusk = mix(vec3(0.42, 0.22, 0.16), vec3(0.05, 0.08, 0.18), smoothstep(0.0, 0.5, y));
  vec3 night = mix(vec3(0.05, 0.07, 0.12), vec3(0.005, 0.01, 0.03), smoothstep(0.0, 0.6, y));
  vec3 col = mix(dusk, night, uNight);
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(y, -1.0, 1.0))) * 120.0;
  float star = step(0.987, hash(floor(sp))) * (1.0 - smoothstep(0.035, 0.09, length(fract(sp) - 0.5))) * smoothstep(0.05, 0.3, y);
  col += vec3(star) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(floor(sp)) * 20.0)) * uNight;
  float m = max(dot(d, normalize(uMoonDir)), 0.0);
  col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9994, 0.9997, m) + pow(m, 64.0) * 0.25) * uNight;
  float clouds = noise(d.xz / max(y, 0.05) * 1.4 + uTime * 0.01);
  col = mix(col, col * 1.6 + vec3(0.02), smoothstep(0.55, 0.8, clouds) * smoothstep(0.05, 0.4, y) * 0.5);
  float a = atan(d.z, d.x) / 6.28318 + 0.5;
  float city = step(y, skyline(a));
  vec2 win = vec2(a * 230.0, y * 140.0);
  float lit = step(0.72, hash(floor(win))) * step(0.3, fract(win.x)) * step(0.3, fract(win.y));
  lit *= step(0.0, y);
  vec3 cityCol = vec3(0.012, 0.016, 0.024) + vec3(0.45, 0.39, 0.28) * lit * 0.18;
  col = mix(col, cityCol, city);
  col += vec3(1.0, 0.55, 0.25) * exp(-abs(y) * 22.0) * 0.12 * (1.0 - city);
  col += vec3(0.025, 0.003, 0.002) * uAlarm * exp(-abs(y) * 35.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSkybox({ radius = 400 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uAlarm: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(-0.6, 0.45, -0.4) }
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  const city = new THREE.Group(); city.name = 'service-yard-skyline'; city.visible = false;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const glow = document.createElement('canvas'); glow.width = 256; glow.height = 512;
  const ctx = canvas.getContext('2d'), lights = glow.getContext('2d');
  ctx.fillStyle = '#77766d'; ctx.fillRect(0, 0, 256, 512);
  lights.fillStyle = '#000'; lights.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = '#525a60'; ctx.fillRect(0, y, 256, 4);
    ctx.fillStyle = '#a4a498'; ctx.fillRect(0, y + 4, 256, 2);
    for (let x = 0; x < 256; x += 32) {
      ctx.strokeStyle = '#525a6050'; ctx.strokeRect(x + (y % 128 ? 16 : 0), y + 5, 32, 58);
    }
  }
  for (let y = 22; y < 490; y += 64) for (let x = 14; x < 246; x += 46) {
    const lit = ((x * 7 + y * 13) % 43) < 13;
    ctx.fillStyle = '#1e2b34'; ctx.fillRect(x - 3, y - 3, 28, 37);
    ctx.fillStyle = lit ? '#b4a578' : '#354858'; ctx.fillRect(x, y, 22, 30);
    ctx.fillStyle = '#101b23'; ctx.fillRect(x + 10, y, 2, 30); ctx.fillRect(x, y + 14, 22, 2);
    ctx.fillStyle = '#a2a398'; ctx.fillRect(x - 5, y + 31, 32, 3);
    if (lit) { lights.fillStyle = '#a99b70'; lights.fillRect(x, y, 22, 30); }
  }
  ctx.fillStyle = '#3c474e'; ctx.fillRect(0, 0, 256, 12); ctx.fillRect(0, 500, 256, 12);
  // A little ambient facade bounce keeps unlit buildings readable without
  // another dynamic light or extra draw call. Windows remain the bright part.
  lights.globalAlpha = .18; lights.drawImage(canvas, 0, 0); lights.globalAlpha = 1;
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const emissiveMap = new THREE.CanvasTexture(glow); emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
  const walls = [], roofs = [], details = [], beacons = [];
  const tints = [0xc7c4b8, 0x9ea9b5, 0x8796a5, 0xb3a18e, 0xa49787, 0x8f9a8e];
  const colour = new THREE.Color();
  function face(w, h, x, y, z, ry, tint, floors) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 16, uv.getY(k) * floors / 8);
    g.rotateY(ry); g.translate(x, y, z);
    colour.set(tint);
    const c = new Float32Array(g.attributes.position.count * 3);
    for (let k = 0; k < c.length; k += 3) { c[k] = colour.r; c[k + 1] = colour.g; c[k + 2] = colour.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    walls.push(g);
  }
  function block(g, x, y, z, list = details) { g.translate(x, y, z); list.push(g); }
  function building(x, z, w, d, floors, n) {
    const h = floors * 3.2, base = -4, tint = tints[n % tints.length];
    face(w, h, x, base + h / 2, z + d / 2, 0, tint, floors);
    face(w, h, x, base + h / 2, z - d / 2, Math.PI, tint, floors);
    face(d, h, x + w / 2, base + h / 2, z, Math.PI / 2, tint, floors);
    face(d, h, x - w / 2, base + h / 2, z, -Math.PI / 2, tint, floors);
    const top = base + h;
    const roof = new THREE.PlaneGeometry(w, d); roof.rotateX(-Math.PI / 2); block(roof, x, top, z, roofs);
    for (const [px, pz, sx, sz] of [[0, d / 2, w + 0.3, 0.3], [0, -d / 2, w + 0.3, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]]) {
      block(new THREE.BoxGeometry(sx, 0.9, sz), x + px, top + 0.45, z + pz);
    }
    block(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), x - w * 0.15, top + 1.2, z + d * 0.1);
    if (n % 3 === 0) {
      block(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12), x + w * 0.25, top + 3.1, z - d * 0.2);
      for (const lx of [-0.7, 0.7]) block(new THREE.BoxGeometry(0.15, 2, 0.15), x + w * 0.25 + lx, top + 1, z - d * 0.2);
    }
    if (n % 2 === 1) for (let a = 0; a < 3; a++) block(new THREE.BoxGeometry(1.2, 0.8, 0.9), x + w * 0.3, top + 0.4, z - d * 0.3 + a * 1.3);
    if (n % 4 === 2 || floors > 9) {
      block(new THREE.CylinderGeometry(0.06, 0.1, 6, 6), x, top + 3, z);
      beacons.push(new THREE.Vector3(x, top + 6.1, z));
    }
  }
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1, row = Math.floor(i / 2);
    building(side * (22 + i * 7 % 47), -30 - row * 15, 9 + i % 5 * 2, 9 + i % 4 * 3, 3 + (i * 5 % 8), i);
  }
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? -1 : 1;
    building(side * (11 + i * 3 % 7), -96 - i * 11, 7 + i % 3 * 2, 8, 2 + i % 3, i + 30);
  }
  const wallMat = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.5, vertexColors: true, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c3237, roughness: 0.95 });
  const detailMat = new THREE.MeshStandardMaterial({ color: 0x4a5359, roughness: 0.8, metalness: 0.2 });
  city.add(new THREE.Mesh(mergeGeometries(walls), wallMat), new THREE.Mesh(mergeGeometries(roofs), roofMat), new THREE.Mesh(mergeGeometries(details), detailMat));
  [...walls, ...roofs, ...details].forEach((g) => g.dispose());
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false });
  const beaconMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), beaconMat, beacons.length);
  const dummy = new THREE.Object3D();
  beacons.forEach((p, i) => { dummy.position.copy(p); dummy.updateMatrix(); beaconMesh.setMatrixAt(i, dummy.matrix); });
  city.add(beaconMesh);
  function setMode(mode) {
    uniforms.uNight.value = mode === 'gala' ? 0 : 1;
    uniforms.uAlarm.value = mode === 'lockdown' ? 1 : 0;
  }
  function update(dt, time, camera) {
    uniforms.uTime.value = time;
    beaconMat.color.setRGB(Math.sin(time * 3) > 0.2 ? 1 : 0.15, 0.05, 0.05);
    if (camera) mesh.position.copy(camera.position);
  }
  return { mesh, city, uniforms, setMode, update };
}
