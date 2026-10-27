import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Authored, stylised humans. All clothing and facial parts are merged into one
// vertex-coloured skinned draw: no downloaded textures or per-button materials.
export function createPerson({ style = 'suit', colour = 0x426997, skin = 0xba8568,
  hair = 0x30231e, accent = 0xd5b578, trouser, shirt = 0xf1e7d6,
  position, rotationY = 0, field, phase = 0, build = 1, height = 1, hairStyle } = {}) {
  const uniform = style === 'guard', dress = style === 'dress';
  const root = new THREE.Group();
  root.name = uniform ? 'uniformed-security-officer' : `gala-${style}`;
  if (position) root.position.copy(position);
  root.rotation.y = rotationY;
  root.scale.set(build, height, 1);
  const bones = [], positions = [], pieces = [];
  function bone(name, parent, pos) {
    const b = new THREE.Bone(); b.name = name; b.position.set(...pos);
    if (parent !== null) bones[parent].add(b);
    positions.push(parent !== null ? positions[parent].clone().add(b.position) : b.position.clone());
    bones.push(b); return bones.length - 1;
  }
  const hips = bone('hips', null, [0, .94, 0]);
  const chest = bone('chest', hips, [0, .32, 0]);
  const head = bone('head', chest, [0, .39, 0]);
  const arms = [-1, 1].map((side) => bone(`arm-${side}`, chest, [side * .22, .19, 0]));
  const elbows = arms.map((arm, i) => bone(`elbow-${i}`, arm, [0, -.29, 0]));
  const legs = [-1, 1].map((side) => bone(`leg-${side}`, hips, [side * .105, -.015, 0]));
  const knees = legs.map((leg, i) => bone(`knee-${i}`, leg, [0, -.4, 0]));
  const tint = (value, lightness) => new THREE.Color(value).multiplyScalar(lightness);
  function part(g, joint, offset, colour, scale = [1, 1, 1], rotation = [0, 0, 0], blend) {
    g.scale(...scale); g.rotateX(rotation[0]); g.rotateY(rotation[1]); g.rotateZ(rotation[2]);
    const base = positions[joint]; g.translate(base.x + offset[0], base.y + offset[1], base.z + offset[2]);
    const count = g.attributes.position.count, color = new THREE.Color(colour);
    const colors = new Float32Array(count * 3), indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      color.toArray(colors, i * 3); indices[i * 4] = joint; weights[i * 4] = 1;
      if (blend) {
        const weight = THREE.MathUtils.smoothstep(g.attributes.position.getY(i), blend.bottom, blend.top);
        indices[i * 4 + 1] = blend.joint; weights[i * 4] = weight; weights[i * 4 + 1] = 1 - weight;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4)); pieces.push(g);
  }
  // Continuous cross-sections shape the shoulders, waist, jaw and garments.
  function loft(rings, segments = 16) {
    const vertices = [], uv = [], indices = [];
    rings.forEach(([y, width, depth, z = 0], row) => {
      for (let i = 0; i <= segments; i++) {
        const a = i / segments * Math.PI * 2;
        vertices.push(Math.sin(a) * width, y, Math.cos(a) * depth + z);
        uv.push(i / segments, row / (rings.length - 1));
        if (row && i) {
          const n = row * (segments + 1) + i;
          indices.push(n, n - 1, n - segments - 1, n - 1, n - segments - 2, n - segments - 1);
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices); g.computeVertexNormals(); return g;
  }
  function panel(points, joint, colour) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2));
    g.setIndex([0, 1, 2, 2, 1, 0]);
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    part(g, joint, [0, 0, 0], colour);
  }
  const sphere = (r = 1) => new THREE.SphereGeometry(r, 10, 7);
  const box = (...size) => new THREE.BoxGeometry(...size);
  const tube = (top, bottom, length) => new THREE.CylinderGeometry(top, bottom, length, 10);
  const cloth = uniform ? 0x7197b6 : colour;
  const pants = uniform ? 0x354d69 : (trouser ?? tint(colour, .55));

  // Smaller shaped head: chin, jaw, cheeks, temples and forehead, not a ball.
  part(tube(.049, .062, .14), head, [0, -.055, 0], skin);
  part(loft([[-.107, .035, .046, .026], [-.092, .063, .061, .014], [-.05, .085, .077, 0],
    [.005, .097, .085, -.005], [.065, .096, .086, -.008], [.112, .075, .074, -.014], [.139, .012, .027, -.016]]),
  head, [0, .065, 0], skin);
  const skinShadow = tint(skin, .82);
  for (const side of [-1, 1]) {
    part(sphere(.024), head, [side * .097, .067, -.008], skin, [.45, 1.25, .7]);
    part(sphere(.013), head, [side * .102, .065, .003], skinShadow, [.22, 1, .65]);
    part(sphere(.017), head, [side * .039, .088, .075], skinShadow, [1.15, .53, .37]);
    part(sphere(.014), head, [side * .039, .088, .080], 0xdad3c4, [1, .36, .27]);
    part(sphere(.0065), head, [side * .039, .088, .083], 0x3b3027, [.65, .85, .3]);
    part(box(.032, .006, .006), head, [side * .039, .112, .076], hair, [1, 1, 1], [0, 0, side * -.08]);
  }
  part(loft([[-.027, .011, .007], [-.009, .016, .016], [.003, .011, .019], [.047, .007, .004]], 8), head, [0, .048, .084], skin);
  part(sphere(.021), head, [0, .004, .073], 0x8f5e53, [1, .19, .2]);
  part(box(.028, .0025, .003), head, [0, .004, .078], 0x5b3c35);
  part(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * .57), head,
    [0, .125, -.015], hair, [.101, .087, .091]);
  for (const side of [-1, 1]) part(sphere(.025), head, [side * .087, .103, -.027], hair, [.44, 1.55, 1.7]);
  part(sphere(.068), head, [-.023, .177, -.006], tint(hair, 1.12), [1.05, .4, 1.13], [0, 0, -.12]);
  if (dress) {
    if (hairStyle === 'bob') {
      for (const side of [-1, 1]) part(sphere(.06), head, [side * .075, .065, -.056], hair, [.6, 1.55, 1]);
    } else part(sphere(.055), head, [0, .105, -.107], hair, [1, 1.15, .85]);
  }

  const bodyBlend = { joint: hips, bottom: .97, top: 1.22 };
  part(loft([[-.31, dress ? .15 : .177, .12], [-.19, dress ? .132 : .165, .113], [-.06, dress ? .143 : .187, .115],
    [.10, dress ? .18 : .212, dress ? .112 : .124], [.20, .216, .098], [.25, .17, .079], [.28, .065, .052]]),
  chest, [0, 0, 0], cloth, [1, 1, 1], [0, 0, 0], bodyBlend);
  part(loft([[-.1, .14, .105], [.04, .163, .114], [.135, .15, .105]]), hips, [0, 0, 0], dress ? colour : pants);
  if (dress) {
    // A long, wider hem keeps the animated thighs inside the dress in third person.
    part(loft([[-.88, .32, .30], [-.75, .31, .285], [-.55, .28, .26], [-.35, .25, .225],
      [-.10, .205, .16], [.12, .15, .11]]),
      hips, [0, 0, 0], colour);
    part(tube(.144, .144, .027), hips, [0, .12, 0], accent, [1, 1, .78]);
    part(tube(.064, .073, .026), chest, [0, .257, .003], skin, [1, 1, .9]);
    for (const side of [-1, 1]) {
      part(sphere(.012), head, [side * .103, .035, .007], 0xe4c170, [.5, 1.3, .5]);
      part(tube(.004, .004, .52), hips, [side * .14, -.32, .13], tint(colour, .8), [1, 1, .6], [0, 0, side * .12]);
    }
    part(sphere(.013), chest, [0, .22, .073], accent, [.65, 1, .3]);
  } else {
    if (uniform) part(box(.12, .31, .012), chest, [0, .08, .117], 0xb1c3cd);
    else panel([[-.073, .239, .123], [.073, .239, .123], [0, -.03, .132]], chest, shirt);
    for (const side of [-1, 1]) {
      panel([[side * .012, .265, .071], [side * .081, .216, .114], [side * .041, .162, .135]], chest, uniform ? 0xd2d9d5 : shirt);
      if (!uniform) {
        panel([[side * .069, .23, .12], [side * .147, .153, .123], [side * .025, -.015, .13]], chest, tint(cloth, .79));
        panel([[side * .069, .23, .12], [side * .101, .248, .096], [side * .147, .153, .123]], chest, tint(cloth, 1.14));
      }
    }
    part(box(.023, .023, .007), chest, [0, .195, .135], uniform ? 0x263a50 : accent, [1, 1, 1], [0, 0, Math.PI / 4]);
    part(tube(.011, .023, .20), chest, [0, .085, .134], uniform ? 0x263a50 : accent, [1, 1, .22]);
    part(box(.06, .014, .013), chest, [-.112, .085, .123], tint(cloth, .7));
    if (!uniform) part(box(.035, .018, .014), chest, [-.112, .101, .125], shirt, [1, 1, 1], [0, 0, -.12]);
    for (const y of [-.065, -.14]) part(sphere(.007), chest, [.02, y, .117], 0xb8ad99, [1, 1, .35]);
    part(tube(.165, .165, .035), hips, [0, .06, 0], 0x30343a, [1, 1, .69]);
    part(box(.034, .026, .014), hips, [0, .06, .119], 0xbca67a);
  }
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1, sleeve = dress ? skin : cloth;
    part(loft([[-.30, .046, .05], [-.22, .055, .059], [-.06, .063, .064], [.005, .054, .056], [.034, .03, .035], [.043, .001, .001]], 12), arms[i], [0, 0, 0], sleeve);
    part(sphere(.048), elbows[i], [0, -.005, 0], sleeve);
    part(loft([[-.25, .034, .033], [-.18, .041, .042], [-.06, .049, .05], [.012, .043, .045]], 10), elbows[i], [0, 0, 0], sleeve);
    part(sphere(.042), elbows[i], [0, -.278, .008], skin, [.73, 1.12, .43]);
    for (let finger = 0; finger < 3; finger++) part(tube(.007, .006, .042), elbows[i], [(finger - 1) * .013, -.318, .012], skin);
    part(sphere(.015), elbows[i], [-side * .026, -.27, .025], skin, [.55, 1.25, .7], [0, 0, side * -.4]);
    if (!dress) part(tube(.037, .037, .024), elbows[i], [0, -.235, 0], uniform ? 0xb1c3cd : shirt);
    part(loft([[-.405, .061, .063], [-.30, .073, .077], [-.1, .088, .09], [.025, .085, .084]], 10), legs[i], [0, 0, 0], dress ? skin : pants);
    part(sphere(.06), knees[i], [0, -.005, 0], dress ? skin : pants, [1, 1, 1.03]);
    part(loft([[-.40, .041, .045], [-.29, .047, .053], [-.13, .061, .063], [.012, .059, .063]], 10), knees[i], [0, 0, 0], dress ? skin : pants);
    part(sphere(.069), knees[i], [0, -.43, .046], uniform ? 0x252b34 : 0x45403a, [.84, .54, 1.55]);
    part(box(.115, .015, .19), knees[i], [0, -.463, .049], 0x292b2e);
  }
  if (uniform) {
    part(tube(.098, .108, .073), head, [0, .205, -.012], 0x314e70, [1, 1, .94]);
    part(sphere(.088), head, [0, .174, .063], 0x263d56, [1.22, .085, 1]);
    part(sphere(.022), head, [0, .207, .089], 0xe0c16e, [.7, 1, .16]);
    part(sphere(.03), chest, [-.108, .105, .133], 0xe0c16e, [.7, 1, .15]);
    part(box(.067, .013, .01), chest, [.108, .105, .13], 0x28394b);
    for (const side of [-1, 1]) {
      part(box(.085, .021, .065), chest, [side * .178, .211, 0], 0xd7be7f);
      part(box(.071, .066, .012), chest, [side * .108, .025, .126], 0x597a96);
      part(sphere(.025), arms[side === -1 ? 0 : 1], [side * .069, -.105, 0], 0xd7be7f, [.16, 1, 1]);
    }
    part(box(.066, .12, .047), hips, [.157, .015, .075], 0x29323d);
    part(tube(.005, .005, .075), hips, [.157, .113, .075], 0x252a31);
  }
  const geometry = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, envMapIntensity: .75 });
  field?.patch(material);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = root.name + '-body'; mesh.add(bones[hips]); mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false; mesh.castShadow = uniform; root.add(mesh);
  let mode = uniform ? 'walk' : 'idle', time = phase, stride = 0;
  function update(dt) {
    time += dt;
    const moving = mode === 'walk' || mode === 'run';
    stride = THREE.MathUtils.damp(stride, moving ? 1 : 0, 10, Math.max(0, dt));
    const gait = Math.sin(time * (mode === 'run' ? 10 : 5.2));
    const amplitude = stride * (dress ? (mode === 'run' ? .32 : .25) : mode === 'run' ? .65 : .32);
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      bones[legs[i]].rotation.x = sign * gait * amplitude;
      bones[knees[i]].rotation.x = Math.max(0, -sign * gait) * amplitude * 1.3;
      bones[arms[i]].rotation.set(-sign * gait * amplitude * .65, 0, -sign * .065);
      bones[elbows[i]].rotation.x = -.12 - (1 - stride) * (.06 + Math.sin(time * .65) * .035);
    }
    bones[chest].rotation.y = stride * gait * .035 + (1 - stride) * Math.sin(time * .55) * .025;
    bones[head].rotation.y = (1 - stride) * Math.sin(time * .4) * .10;
    bones[hips].position.y = .94 + stride * Math.abs(gait) * .01 + (1 - stride) * Math.sin(time) * .003;
  }
  update(0);
  return { root, model: mesh, play(name) { mode = String(name).toLowerCase(); }, update,
    dispose() { geometry.dispose(); material.dispose(); mesh.skeleton.dispose(); } };
}
