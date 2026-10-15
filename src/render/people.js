import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Original coloured people: one small skinned draw per person. Clothes, skin,
// face and uniform details retain their colours on every graphics setting.
export function createPerson({ style = 'suit', colour = 0x426997, skin = 0xba8568,
  hair = 0x30231e, accent = 0xd5b578, trouser = 0x38475a, shirt = 0xf1e7d6,
  position, rotationY = 0, field, phase = 0 } = {}) {
  const uniform = style === 'guard', dress = style === 'dress';
  const root = new THREE.Group();
  root.name = uniform ? 'uniformed-security-officer' : `gala-${style}`;
  if (position) root.position.copy(position);
  root.rotation.y = rotationY;
  const bones = [], positions = [], pieces = [];
  function bone(name, parent, pos) {
    const b = new THREE.Bone(); b.name = name; b.position.set(...pos);
    if (parent !== null) bones[parent].add(b);
    positions.push(parent !== null ? positions[parent].clone().add(b.position) : b.position.clone());
    bones.push(b); return bones.length - 1;
  }
  const hips = bone('hips', null, [0, 0.94, 0]);
  const chest = bone('chest', hips, [0, 0.32, 0]);
  const head = bone('head', chest, [0, 0.39, 0]);
  const arms = [-1, 1].map((side) => bone(`arm-${side}`, chest, [side * 0.255, 0.19, 0]));
  const elbows = arms.map((arm, i) => bone(`elbow-${i}`, arm, [0, -0.29, 0]));
  const legs = [-1, 1].map((side) => bone(`leg-${side}`, hips, [side * 0.12, -0.015, 0]));
  const knees = legs.map((leg, i) => bone(`knee-${i}`, leg, [0, -0.4, 0]));
  function part(g, joint, offset, tint, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    g.scale(...scale); g.rotateX(rotation[0]); g.rotateY(rotation[1]); g.rotateZ(rotation[2]);
    const base = positions[joint]; g.translate(base.x + offset[0], base.y + offset[1], base.z + offset[2]);
    const count = g.attributes.position.count, color = new THREE.Color(tint);
    const colors = new Float32Array(count * 3), indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { color.toArray(colors, i * 3); indices[i * 4] = joint; weights[i * 4] = 1; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4)); pieces.push(g);
  }
  const sphere = (r = 1) => new THREE.SphereGeometry(r, 12, 8);
  const box = (...size) => new THREE.BoxGeometry(...size);
  const tube = (top, bottom, length) => new THREE.CylinderGeometry(top, bottom, length, 10);
  const cloth = uniform ? 0x658bad : colour, pants = uniform ? 0x31465f : trouser;
  part(tube(0.062, 0.073, 0.12), head, [0, -0.07, 0], skin);
  part(sphere(0.14), head, [0, 0.085, 0], skin, [0.88, 1.23, 0.92]);
  for (const side of [-1, 1]) {
    part(sphere(0.028), head, [side * 0.125, 0.08, 0], skin, [0.65, 1.2, 0.85]);
    part(sphere(0.018), head, [side * 0.046, 0.105, 0.12], 0xe9e4dc, [1.1, 0.55, 0.48]);
    part(sphere(0.009), head, [side * 0.046, 0.104, 0.128], 0x241f1e, [0.7, 0.85, 0.5]);
    part(box(0.041, 0.009, 0.01), head, [side * 0.046, 0.132, 0.121], hair);
  }
  part(sphere(0.025), head, [0, 0.074, 0.135], skin, [0.65, 1.3, 0.8]);
  part(box(0.037, 0.009, 0.009), head, [0, 0.016, 0.122], 0x795149);
  part(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48), head, [0, 0.128, -0.008], hair, [0.91, 0.84, 0.94]);
  if (dress) part(sphere(0.084), head, [0, 0.1, -0.115], hair, [1, 1.4, 0.8]);
  part(tube(dress ? 0.19 : 0.23, dress ? 0.125 : 0.18, 0.49), chest, [0, -0.035, 0], cloth, [1, 1, 0.61]);
  if (dress) {
    part(tube(0.13, 0.34, 0.78), hips, [0, -0.18, 0], colour, [1, 1, 0.78]);
    part(tube(0.142, 0.142, 0.035), hips, [0, 0.19, 0], accent, [1, 1, 0.68]);
    for (const side of [-1, 1]) part(sphere(0.014), head, [side * 0.126, 0.035, 0.017], 0xe4c170, [0.55, 1.4, 0.55]);
  } else {
    part(box(0.115, 0.35, 0.018), chest, [0, 0.025, 0.135], uniform ? 0x9bafbe : shirt);
    part(tube(0.016, 0.027, 0.255), chest, [0, 0.035, 0.153], uniform ? 0x253548 : accent, [1, 1, 0.4]);
    for (const side of [-1, 1]) part(box(0.055, 0.28, 0.023), chest, [side * 0.085, 0.06, 0.137], uniform ? 0x83a0b7 : cloth, [1, 1, 1], [0, 0, side * -0.23]);
    part(tube(0.18, 0.18, 0.045), hips, [0, 0.075, 0], 0x24272d, [1, 1, 0.65]);
    part(box(0.045, 0.035, 0.018), hips, [0, 0.075, 0.12], 0xc0ad7d);
  }
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, sleeve = dress ? skin : cloth;
    part(sphere(0.087), arms[i], [0, -0.025, 0], sleeve, [0.9, 1.1, 0.94]);
    part(tube(0.074, 0.055, 0.29), arms[i], [side * 0.012, -0.145, 0], sleeve);
    part(tube(0.058, 0.045, 0.27), elbows[i], [side * 0.01, -0.12, 0.006], sleeve);
    part(sphere(0.047), elbows[i], [side * 0.01, -0.285, 0.015], skin, [0.8, 1.4, 0.62]);
    if (!dress) part(tube(0.047, 0.047, 0.035), elbows[i], [side * 0.01, -0.245, 0.006], uniform ? 0x9bafbe : shirt);
    part(tube(0.095, 0.075, 0.4), legs[i], [0, -0.18, 0], dress ? skin : pants);
    part(tube(0.075, 0.055, 0.4), knees[i], [0, -0.18, 0], dress ? skin : pants);
    part(sphere(0.08), knees[i], [0, -0.43, 0.045], 0x393b42, [0.83, 0.55, 1.6]);
  }
  if (uniform) {
    part(tube(0.14, 0.15, 0.09), head, [0, 0.25, 0], 0x263c59, [1, 1, 0.92]);
    part(sphere(0.11), head, [0, 0.213, 0.1], 0x263c59, [1.25, 0.1, 1.1]);
    part(sphere(0.025), head, [0, 0.255, 0.135], 0xe0c16e, [0.7, 1, 0.2]);
    part(sphere(0.036), chest, [-0.11, 0.04, 0.136], 0xe0c16e, [0.7, 1.1, 0.13]);
    for (const side of [-1, 1]) part(box(0.11, 0.022, 0.065), chest, [side * 0.19, 0.215, 0], 0xd7be7f);
    part(box(0.075, 0.13, 0.045), hips, [0.16, 0.04, 0.08], 0x29323d);
    part(tube(0.006, 0.006, 0.08), hips, [0.16, 0.15, 0.08], 0x252a31);
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0, envMapIntensity: 0.6 });
  field?.patch(material);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = root.name + '-body'; mesh.add(bones[hips]); mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false; mesh.castShadow = uniform; root.add(mesh);
  let mode = uniform ? 'walk' : 'idle', time = phase;
  function update(dt) {
    time += dt;
    const moving = mode === 'walk' || mode === 'run', gait = Math.sin(time * (mode === 'run' ? 10 : 6.2));
    const amplitude = moving ? (mode === 'run' ? 0.7 : 0.38) : 0;
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      bones[legs[i]].rotation.x = sign * gait * amplitude;
      bones[knees[i]].rotation.x = moving ? Math.max(0, -sign * gait) * amplitude : 0;
      bones[arms[i]].rotation.set(-sign * gait * amplitude * 0.65, 0, -sign * 0.08);
      bones[elbows[i]].rotation.x = moving ? -0.14 : -0.25 + Math.sin(time * 0.65) * 0.05;
    }
    bones[chest].rotation.y = moving ? gait * 0.04 : Math.sin(time * 0.55) * 0.035;
    bones[head].rotation.y = moving ? 0 : Math.sin(time * 0.4) * 0.11;
    bones[hips].position.y = 0.94 + (moving ? Math.abs(gait) * 0.015 : Math.sin(time) * 0.003);
  }
  update(0);
  return { root, model: mesh, play(name) { mode = String(name).toLowerCase(); }, update,
    dispose() { geometry.dispose(); material.dispose(); mesh.skeleton.dispose(); } };
}
