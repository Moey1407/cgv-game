import * as THREE from 'three';
import './styles.css';
import './screens.css';
import './gameplay.css';
import { MAX_RINGS, createSoundMaterial, createSoundUniforms } from './shaders.js';
import { createStageSystem } from './stages.js';

const ui = {
  start: document.querySelector('#start-screen'),
  result: document.querySelector('#result-screen'),
  startButton: document.querySelector('#start-button'),
  restartButton: document.querySelector('#restart-button'),
  hud: document.querySelector('#hud'),
  reticle: document.querySelector('#reticle'),
  minimap: document.querySelector('#minimap'),
  mapCanvas: document.querySelector('#map-canvas'),
  sonar: document.querySelector('#sonar-status'),
  decoy: document.querySelector('#decoy-status'),
  objective: document.querySelector('#objective'),
  stageLabel: document.querySelector('#stage-label'),
  progressSteps: document.querySelectorAll('#level-progress i'),
  transition: document.querySelector('#stage-transition'),
  transitionKicker: document.querySelector('#transition-kicker'),
  transitionTitle: document.querySelector('#transition-title'),
  transitionCopy: document.querySelector('#transition-copy'),
  noise: document.querySelector('#noise-fill'),
  movement: document.querySelector('#movement-state'),
  mapStatus: document.querySelector('#map-status'),
  guard: document.querySelector('#guard-state'),
  interaction: document.querySelector('#interaction'),
  toast: document.querySelector('#toast'),
  resultKicker: document.querySelector('#result-kicker'),
  resultTitle: document.querySelector('#result-title'),
  resultCopy: document.querySelector('#result-copy'),
  statTime: document.querySelector('#stat-time'),
  statRings: document.querySelector('#stat-rings'),
  statAlerts: document.querySelector('#stat-alerts'),
  credits: document.querySelector('#credits-dialog'),
  creditsButton: document.querySelector('#credits-button'),
  closeCredits: document.querySelector('#close-credits')
};

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const pixelRatioCap = () => window.innerWidth < 900 ? 1 : 1.25;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.42;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050a);
scene.fog = new THREE.FogExp2(0x02050a, 0.026);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 90);
camera.rotation.order = 'YXZ';
const minimapCamera = new THREE.OrthographicCamera(-18, 18, 23, -23, 0.1, 80);
minimapCamera.position.set(0, 45, 0);
minimapCamera.up.set(0, 0, -1);
minimapCamera.lookAt(0, 0, 0);

const sharedUniforms = createSoundUniforms();
const level = new THREE.Group();
scene.add(level);
const minimapScene = new THREE.Scene();
minimapScene.background = new THREE.Color(0x02090d);
const minimapMaterial = new THREE.MeshBasicMaterial({ color: 0x1f7082 });
const minimapGrid = new THREE.GridHelper(46, 23, 0x1c6e7d, 0x0b2730);
minimapGrid.position.y = -0.03;
minimapGrid.material.transparent = true;
minimapGrid.material.opacity = 0.68;
minimapScene.add(minimapGrid);

const materials = {
  floor: createSoundMaterial(sharedUniforms, 0x17232e),
  wall: createSoundMaterial(sharedUniforms, 0x1c2630),
  stone: createSoundMaterial(sharedUniforms, 0x26313b),
  dark: createSoundMaterial(sharedUniforms, 0x0b1118)
};

const colliders = [];
const decor = [];
const rings = [];
const throwables = [];
const keys = Object.create(null);
const clock = new THREE.Clock();

const state = {
  running: false,
  stage: 1,
  ended: false,
  transitioning: false,
  locked: false,
  carrying: false,
  startTime: 0,
  elapsed: 0,
  ringCount: 0,
  alerts: 0,
  yaw: 0,
  pitch: 0,
  crouching: false,
  footstepTimer: 0,
  guardSoundTimer: 0,
  throwCooldown: 0,
  decoyCharges: 3,
  decoyRecharge: 0,
  pingCooldown: 0,
  mapReveal: 0,
  toastTimer: 0
};

const player = {
  position: new THREE.Vector3(0, 0, 18),
  velocity: new THREE.Vector3(),
  radius: 0.46
};

const colours = {
  player: new THREE.Color(0x70efff),
  guard: new THREE.Color(0xff315a),
  alert: new THREE.Color(0xffa43b),
  artefact: new THREE.Color(0xffd76a)
};

const mapContext = ui.mapCanvas.getContext('2d');

let audioContext = null;
let ambience = null;
let artifact;
let artifactGlow;
let extraction;
let extractionPortal;
let extractionRings = [];
let playerMarker;
let guardMarker;
let artifactMarker;
let extractionMarker;
let guard;
let stages;
let playerLight;
let gallery;
let artifactPlinth;
let artifactCase;
const museumLights = [];

function addBox(name, size, position, material, solid = true, parent = level, stage = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.name = name;
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (solid) {
    const mapBlock = new THREE.Mesh(new THREE.BoxGeometry(size.x, 0.12, size.z), minimapMaterial);
    mapBlock.position.set(position.x, 0, position.z);
    minimapScene.add(mapBlock);
    colliders.push({
      stage,
      minX: position.x - size.x / 2,
      maxX: position.x + size.x / 2,
      minZ: position.z - size.z / 2,
      maxZ: position.z + size.z / 2
    });
  }
  return mesh;
}

function createMapArrow(colour, scale = 1) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.42 * scale, 0, 0.34 * scale,
    0.42 * scale, 0, 0.34 * scale,
    0, 0, -0.72 * scale
  ], 3));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, side: THREE.DoubleSide }));
}

function addFrame(x, y, z, rotY, colour, parent = level) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 1.65, 0.11),
    new THREE.MeshStandardMaterial({ color: 0x090d12, roughness: 0.72, metalness: 0.25 })
  );
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 1.3),
    new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.18, roughness: 0.5 })
  );
  art.position.z = 0.061;
  group.add(backing, art);
  parent.add(group);
}

function addPedestal(x, z, shape, colour, parent = level, stage = null) {
  addBox('pedestal', new THREE.Vector3(1.45, 1.05, 1.45), new THREE.Vector3(x, 0.525, z), materials.stone, true, parent, stage);
  const object = new THREE.Mesh(
    shape,
    new THREE.MeshStandardMaterial({
      color: colour,
      emissive: colour,
      emissiveIntensity: 0.12,
      roughness: 0.28,
      metalness: 0.72
    })
  );
  object.position.set(x, 1.65, z);
  object.castShadow = true;
  parent.add(object);
  decor.push({ mesh: object, speed: 0.12 + Math.random() * 0.12 });
}

function createLabelSprite(text) {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext('2d');
  context.fillStyle = 'rgba(2, 12, 18, .82)';
  context.fillRect(4, 4, 504, 120);
  context.strokeStyle = '#72efff';
  context.lineWidth = 4;
  context.strokeRect(4, 4, 504, 120);
  context.fillStyle = '#dffcff';
  context.font = '700 42px Consolas, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

function createExtractionPortal() {
  const portal = new THREE.Group();
  portal.position.set(0, 0, 19.35);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x153b46, emissive: 0x4de8ff, emissiveIntensity: 1.2, roughness: 0.28, metalness: 0.68 });
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: 0x58eaff, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.1, 0.14), frameMaterial);
  const right = left.clone();
  left.position.set(-1.55, 1.55, 0);
  right.position.set(1.55, 1.55, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.14, 0.14), frameMaterial);
  top.position.set(0, 3.04, 0);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 2.78), fieldMaterial);
  field.position.set(0, 1.5, 0.03);
  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.27, 0),
    new THREE.MeshBasicMaterial({ color: 0xc7fbff })
  );
  beacon.position.set(0, 3.55, 0);
  const label = createLabelSprite('EXTRACTION // EXIT');
  label.position.set(0, 4.15, 0);
  extractionRings = [1.15, 1.38].map((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.045 : 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x72efff, transparent: true, opacity: index === 0 ? 0.75 : 0.35 })
    );
    ring.position.set(0, 1.52, 0);
    portal.add(ring);
    return ring;
  });
  portal.add(left, right, top, field, beacon, label);
  level.add(portal);
  return portal;
}

function createWorld() {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 46, 1, 1), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  level.add(floor);
  gallery = new THREE.Group();
  level.add(gallery);

  addBox('north-wall', new THREE.Vector3(34, 5.5, 0.45), new THREE.Vector3(0, 2.75, -23), materials.wall);
  addBox('south-wall', new THREE.Vector3(34, 5.5, 0.45), new THREE.Vector3(0, 2.75, 23), materials.wall);
  addBox('west-wall', new THREE.Vector3(0.45, 5.5, 46), new THREE.Vector3(-17, 2.75, 0), materials.wall);
  addBox('east-wall', new THREE.Vector3(0.45, 5.5, 46), new THREE.Vector3(17, 2.75, 0), materials.wall);

  addBox('divider-a', new THREE.Vector3(12, 4.2, 0.38), new THREE.Vector3(-10.5, 2.1, 8), materials.wall, true, gallery, 1);
  addBox('divider-b', new THREE.Vector3(12, 4.2, 0.38), new THREE.Vector3(10.5, 2.1, 8), materials.wall, true, gallery, 1);
  addBox('divider-c', new THREE.Vector3(0.38, 4.2, 13), new THREE.Vector3(-7, 2.1, -7.5), materials.wall, true, gallery, 1);
  addBox('divider-d', new THREE.Vector3(0.38, 4.2, 13), new THREE.Vector3(7, 2.1, -7.5), materials.wall, true, gallery, 1);

  for (const x of [-12.5, -4.2, 4.2, 12.5]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 5.2, 10), materials.stone);
    column.position.set(x, 2.6, -1);
    column.castShadow = true;
    column.receiveShadow = true;
    gallery.add(column);
    colliders.push({ stage: 1, minX: x - 0.64, maxX: x + 0.64, minZ: -1.64, maxZ: -0.36 });
  }

  addPedestal(-11, 14, new THREE.IcosahedronGeometry(0.72, 1), 0x375b6a, gallery, 1);
  addPedestal(11, 14, new THREE.TorusKnotGeometry(0.48, 0.16, 64, 10), 0x604941, gallery, 1);
  addPedestal(-12, -15, new THREE.OctahedronGeometry(0.76, 0), 0x5b3b4e, gallery, 1);
  addPedestal(12, -15, new THREE.TorusGeometry(0.62, 0.17, 12, 48), 0x31576b, gallery, 1);

  addFrame(-16.72, 2.55, 13, Math.PI / 2, 0x2b7080, gallery);
  addFrame(-16.72, 2.55, 3.5, Math.PI / 2, 0x74334a, gallery);
  addFrame(16.72, 2.55, 13, -Math.PI / 2, 0x71522c, gallery);
  addFrame(16.72, 2.55, 3.5, -Math.PI / 2, 0x2c526d, gallery);
  addFrame(-5, 2.6, -22.72, 0, 0x4b2b67, gallery);
  addFrame(5, 2.6, -22.72, 0, 0x2f6f69, gallery);

  const grid = new THREE.GridHelper(34, 34, 0x1a5a68, 0x0c252d);
  grid.position.y = 0.012;
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  gallery.add(grid);

  const hemi = new THREE.HemisphereLight(0x244657, 0x05070a, 0.42);
  scene.add(hemi);
  museumLights.push(hemi);
  const moon = new THREE.DirectionalLight(0x8dcce5, 1.05);
  moon.position.set(-12, 20, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -20;
  moon.shadow.camera.right = 20;
  moon.shadow.camera.top = 25;
  moon.shadow.camera.bottom = -25;
  scene.add(moon);
  museumLights.push(moon);

  for (const x of [-10, 0, 10]) {
    const light = new THREE.PointLight(0xffbb72, 14, 8, 2);
    light.position.set(x, 3.8, 11);
    scene.add(light);
    museumLights.push(light);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd39a })
    );
    lamp.position.copy(light.position);
    scene.add(lamp);
  }

  artifact = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.74, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xffd568,
      emissive: 0xffa51f,
      emissiveIntensity: 1.25,
      roughness: 0.12,
      metalness: 0.62,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    })
  );
  artifact.position.set(0, 1.55, -19.2);
  artifact.scale.setScalar(1);
  artifact.castShadow = true;
  level.add(artifact);
  artifactMarker = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, side: THREE.DoubleSide })
  );
  artifactMarker.rotation.x = -Math.PI / 2;
  artifactMarker.position.set(0, 0.14, -19.2);
  minimapScene.add(artifactMarker);

  artifactGlow = new THREE.PointLight(0xffb12f, 12, 7, 2);
  artifactGlow.position.copy(artifact.position);
  level.add(artifactGlow);
  artifactPlinth = addBox('artefact-plinth', new THREE.Vector3(1.7, 1.15, 1.7), new THREE.Vector3(0, 0.575, -19.2), materials.stone, false);

  artifactCase = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 1.6, 1.45),
    new THREE.MeshPhysicalMaterial({ color: 0x8de9f5, transparent: true, opacity: 0.08, roughness: 0.06, metalness: 0, side: THREE.DoubleSide })
  );
  artifactCase.position.set(0, 1.7, -19.2);
  level.add(artifactCase);

  extraction = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.08, 64),
    new THREE.MeshBasicMaterial({ color: 0x5deeff, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
  );
  extraction.rotation.x = -Math.PI / 2;
  extraction.position.set(0, 0.035, 19.4);
  level.add(extraction);
  extractionPortal = createExtractionPortal();

  extractionMarker = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.42, 32),
    new THREE.MeshBasicMaterial({ color: 0x69f6ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  );
  extractionMarker.rotation.x = -Math.PI / 2;
  extractionMarker.position.set(0, 0.11, 19.4);
  minimapScene.add(extractionMarker);

  playerMarker = createMapArrow(0x72efff, 1.7);
  playerMarker.position.y = 0.06;
  minimapScene.add(playerMarker);

  playerLight = new THREE.PointLight(0x7bddff, 1.15, 8, 2);
  scene.add(playerLight);

  createGuard();
  stages = createStageSystem({
    scene,
    level,
    minimapScene,
    materials,
    colliders,
    lights: museumLights,
    sharedUniforms
  });
}

function createGuard() {
  const group = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: 0x101923, roughness: 0.62, metalness: 0.18 });
  const armour = new THREE.MeshStandardMaterial({ color: 0x26313d, roughness: 0.38, metalness: 0.55 });
  const red = new THREE.MeshStandardMaterial({ color: 0x3b0711, emissive: 0xff294f, emissiveIntensity: 2.1, roughness: 0.35 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x6d5148, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.62, 4, 8), uniform);
  body.position.y = 1.22;
  body.scale.z = 0.72;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.4), armour);
  vest.position.set(0, 1.24, 0.03);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.43), red);
  belt.position.set(0, 0.92, 0.02);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8), skin);
  head.position.set(0, 1.88, 0);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.57), armour);
  helmet.position.set(0, 1.92, 0);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.07), new THREE.MeshBasicMaterial({ color: 0xff5871 }));
  visor.position.set(0, 1.9, 0.255);
  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.22), armour);
  capBrim.position.set(0, 2.09, 0.14);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.035), red);
  badge.position.set(0.19, 1.37, 0.225);
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.58, 3, 6), uniform);
  const rightArm = leftArm.clone();
  leftArm.position.set(-0.48, 1.23, 0);
  rightArm.position.set(0.48, 1.23, 0);
  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.62, 3, 6), uniform);
  const rightLeg = leftLeg.clone();
  leftLeg.position.set(-0.2, 0.43, 0);
  rightLeg.position.set(0.2, 0.43, 0);
  const flashlightBeam = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 3.7, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff315a, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  flashlightBeam.rotation.x = -Math.PI / 2;
  flashlightBeam.position.set(0, 1.35, 1.85);
  [body, vest, belt, head, helmet, visor, capBrim, badge, leftArm, rightArm, leftLeg, rightLeg].forEach((part) => { part.castShadow = true; });
  group.add(body, vest, belt, head, helmet, visor, capBrim, badge, leftArm, rightArm, leftLeg, rightLeg, flashlightBeam);
  group.position.set(10, 0, -10);
  scene.add(group);
  const light = new THREE.PointLight(0xff254e, 7, 5.5, 2);
  light.position.set(0, 1.55, 0.45);
  group.add(light);
  guardMarker = createMapArrow(0xff315a, 1.7);
  guardMarker.position.set(10, 0.15, -10);
  minimapScene.add(guardMarker);
  guard = {
    group,
    state: 'patrol',
    waypoint: 0,
    target: new THREE.Vector3(),
    speed: 1.65,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
    waypoints: [
      new THREE.Vector3(10, 0, -10),
      new THREE.Vector3(10, 0, 5),
      new THREE.Vector3(-10, 0, 5),
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(0, 0, -16)
    ]
  };
}

function createPulseVisual(position, colour, source) {
  const count = source === 'sonar' ? 3 : 1;
  const visuals = [];
  for (let index = 0; index < count; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity: source === 'sonar' ? 0.72 / (index + 1) : 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.08, 64), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y += 0.025 + index * 0.012;
    mesh.scale.setScalar(0.01);
    scene.add(mesh);
    visuals.push(mesh);
  }
  return visuals;
}

function disposeRing(ring) {
  for (const visual of ring.visuals) {
    scene.remove(visual);
    visual.geometry.dispose();
    visual.material.dispose();
  }
}

function emitRing(position, colour, maxRadius, source) {
  rings.push({
    position: position.clone(),
    colour: colour.clone(),
    age: 0,
    duration: Math.max(1.15, maxRadius / 8.4),
    maxRadius,
    source,
    visuals: createPulseVisual(position, colour, source)
  });
  const revealStrength = source === 'sonar' ? 1 : source === 'decoy' ? 0.72 : source === 'guard' ? 0.38 : 0.48;
  state.mapReveal = Math.max(state.mapReveal, revealStrength);
  while (rings.length > MAX_RINGS) disposeRing(rings.shift());
  state.ringCount += 1;
  ping(source);
  if ((source === 'player' || source === 'decoy' || source === 'sonar') && guard) {
    const dx = guard.group.position.x - position.x;
    const dz = guard.group.position.z - position.z;
    if (Math.hypot(dx, dz) < maxRadius + 3) {
      guard.state = 'investigate';
      guard.target.set(position.x, 0, position.z);
      state.alerts += 1;
      showToast('GUARD HEARD ' + (source === 'decoy' ? 'THE DECOY' : source === 'sonar' ? 'THE SONAR PULSE' : 'YOU'));
    }
  }
}

function updateRingUniforms(dt, elapsed) {
  sharedUniforms.uTime.value = elapsed;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    rings[i].age += dt;
    const t = Math.min(1, rings[i].age / rings[i].duration);
    const life = Math.pow(1 - t, rings[i].source === 'sonar' ? 0.85 : 1.25);
    rings[i].visuals.forEach((visual, visualIndex) => {
      const radius = Math.max(0.01, t * rings[i].maxRadius - visualIndex * 0.78);
      visual.scale.setScalar(radius);
      visual.material.opacity = life * (rings[i].source === 'sonar' ? 0.72 / (visualIndex + 1) : 0.34);
    });
    if (rings[i].age >= rings[i].duration) {
      disposeRing(rings[i]);
      rings.splice(i, 1);
    }
  }
  for (let i = 0; i < MAX_RINGS; i += 1) {
    const ring = rings[i];
    if (ring) {
      const t = ring.age / ring.duration;
      sharedUniforms.uRings.value[i].set(ring.position.x, ring.position.y, ring.position.z, t * ring.maxRadius);
      sharedUniforms.uRingColors.value[i].copy(ring.colour);
      sharedUniforms.uRingLife.value[i] = Math.pow(1 - t, 0.72);
    } else {
      sharedUniforms.uRings.value[i].set(0, -100, 0, -100);
      sharedUniforms.uRingLife.value[i] = 0;
    }
  }
}

function ping(source) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = source === 'guard' ? 'sawtooth' : 'sine';
  oscillator.frequency.setValueAtTime(source === 'guard' ? 105 : source === 'decoy' ? 480 : source === 'sonar' ? 310 : 240, now);
  oscillator.frequency.exponentialRampToValueAtTime(source === 'guard' ? 62 : 120, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(source === 'guard' ? 0.022 : 0.016, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

function startAmbience() {
  if (!audioContext || ambience) return;
  const master = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const droneA = audioContext.createOscillator();
  const droneB = audioContext.createOscillator();
  const drift = audioContext.createOscillator();
  const driftAmount = audioContext.createGain();

  master.gain.value = 0.0001;
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  filter.Q.value = 2.4;
  droneA.type = 'sine';
  droneB.type = 'triangle';
  droneA.frequency.value = 48;
  droneB.frequency.value = 72;
  droneB.detune.value = -7;
  drift.type = 'sine';
  drift.frequency.value = 0.11;
  driftAmount.gain.value = 2.2;

  drift.connect(driftAmount).connect(droneB.detune);
  droneA.connect(filter);
  droneB.connect(filter);
  filter.connect(master).connect(audioContext.destination);
  droneA.start();
  droneB.start();
  drift.start();

  ambience = { master, filter, droneA, droneB };
  setAmbienceForStage(state.stage);
}

function setAmbienceForStage(stage) {
  if (!ambience || !audioContext) return;
  const settings = {
    1: { root: 48, harmony: 72, cutoff: 235, gain: 0.012 },
    2: { root: 37, harmony: 55, cutoff: 145, gain: 0.016 },
    3: { root: 29, harmony: 43, cutoff: 92, gain: 0.019 }
  }[stage];
  const now = audioContext.currentTime;
  ambience.droneA.frequency.setTargetAtTime(settings.root, now, 0.7);
  ambience.droneB.frequency.setTargetAtTime(settings.harmony, now, 0.7);
  ambience.filter.frequency.setTargetAtTime(settings.cutoff, now, 0.8);
  ambience.master.gain.cancelScheduledValues(now);
  ambience.master.gain.setTargetAtTime(settings.gain, now, 1.1);
}

function playTransitionCue(stage) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const notes = stage === 2 ? [110, 146.83, 220] : [73.42, 98, 146.83];
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.025 / (index + 1), now + 0.08 + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65 + index * 0.08);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + index * 0.08);
    oscillator.stop(now + 0.8 + index * 0.08);
  });
}

function isBlocked(position) {
  const r = player.radius;
  return colliders.some((box) => {
    if (box.stage && box.stage !== state.stage) return false;
    return position.x + r > box.minX && position.x - r < box.maxX &&
      position.z + r > box.minZ && position.z - r < box.maxZ;
  });
}

function updatePlayer(dt) {
  state.crouching = Boolean(keys.KeyC || keys.ControlLeft);
  const walking = !state.crouching && Boolean(keys.ShiftLeft || keys.ShiftRight);
  let speed = state.crouching ? 1.55 : walking ? 2.45 : 4.85;
  if (state.carrying) speed *= 0.88;
  const input = new THREE.Vector2(
    (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
    (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0)
  );
  if (input.lengthSq() > 1) input.normalize();

  const forward = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const desired = forward.multiplyScalar(-input.y).add(right.multiplyScalar(input.x)).multiplyScalar(speed);
  player.velocity.lerp(desired, 1 - Math.exp(-dt * 11));

  const nextX = player.position.clone();
  nextX.x += player.velocity.x * dt;
  if (!isBlocked(nextX)) player.position.x = nextX.x;
  const nextZ = player.position.clone();
  nextZ.z += player.velocity.z * dt;
  if (!isBlocked(nextZ)) player.position.z = nextZ.z;

  const moving = input.lengthSq() > 0.05;
  const noiseLevel = !moving ? 0.03 : state.crouching ? 0.1 : walking ? 0.22 : 0.78;
  ui.noise.style.width = Math.round(noiseLevel * 100) + '%';
  ui.noise.style.background = noiseLevel > 0.7 ? 'var(--red)' : 'var(--cyan)';
  ui.movement.textContent = state.crouching ? 'CROUCH' : walking ? 'WALKING' : 'RUNNING';
  ui.movement.classList.toggle('walk', walking);
  ui.movement.classList.toggle('crouch', state.crouching);

  if (moving) {
    state.footstepTimer -= dt;
    if (state.footstepTimer <= 0) {
      const radius = (state.carrying ? 1.3 : 1) * (state.crouching ? 2.9 : walking ? 5.1 : 12.4);
      emitRing(new THREE.Vector3(player.position.x, 0.12, player.position.z), colours.player, radius, 'player');
      state.footstepTimer = state.crouching ? 1.35 : walking ? 0.88 : 0.4;
    }
  } else {
    state.footstepTimer = Math.min(state.footstepTimer, 0.1);
  }

  const bobSpeed = state.crouching ? 5 : walking ? 7 : 11;
  const bobAmount = state.crouching ? 0.012 : walking ? 0.018 : 0.042;
  const targetHeight = (state.crouching ? 1.08 : 1.68) + (moving ? Math.sin(clock.elapsedTime * bobSpeed) * bobAmount : 0);
  camera.position.set(player.position.x, THREE.MathUtils.lerp(camera.position.y, targetHeight, 1 - Math.exp(-dt * 10)), player.position.z);
  camera.rotation.set(state.pitch, state.yaw, 0);
  playerMarker.position.set(player.position.x, 0.06, player.position.z);
  playerMarker.rotation.y = state.yaw;
  playerLight.position.copy(camera.position);

  if (state.carrying) {
    const held = new THREE.Vector3(0.48, -0.48, -1.65).applyEuler(camera.rotation).add(camera.position);
    artifact.position.copy(held);
    artifact.scale.setScalar(THREE.MathUtils.lerp(artifact.scale.x, 0.2, 1 - Math.exp(-dt * 12)));
    artifact.rotation.y += dt * 1.8;
    artifactGlow.position.copy(artifact.position);
    artifactMarker.position.set(player.position.x, 0.14, player.position.z);
  }

  const artifactDistance = Math.hypot(player.position.x - artifact.position.x, player.position.z - artifact.position.z);
  if (!state.carrying && artifactDistance < 2.25) {
    ui.interaction.textContent = '[ E ] TAKE THE ARTEFACT';
    ui.interaction.classList.remove('is-hidden');
  } else {
    ui.interaction.classList.add('is-hidden');
  }

  if (state.carrying && player.position.z > 18.4 && Math.abs(player.position.x) < 3.2) completeStage();
}

function updateGuard(dt) {
  state.guardSoundTimer -= dt;
  if (state.guardSoundTimer <= 0) {
    emitRing(new THREE.Vector3(guard.group.position.x, 0.65, guard.group.position.z), guard.state === 'patrol' ? colours.guard : colours.alert, 9.5, 'guard');
    state.guardSoundTimer = guard.state === 'patrol' ? 2.8 : 1.45;
  }

  let target;
  if (guard.state === 'investigate') {
    target = guard.target;
  } else {
    target = guard.waypoints[guard.waypoint];
  }
  const delta = target.clone().sub(guard.group.position);
  delta.y = 0;
  if (delta.length() < 0.38) {
    if (guard.state === 'investigate') {
      guard.state = 'patrol';
    } else {
      guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
    }
  } else {
    delta.normalize();
    const pace = guard.state === 'investigate' ? (state.stage === 2 ? 2.05 : 1.9) : guard.speed;
    guard.group.position.addScaledVector(delta, pace * dt);
    guard.group.rotation.y = Math.atan2(delta.x, delta.z);
  }

  const stride = Math.sin(clock.elapsedTime * (guard.state === 'investigate' ? 10 : 7)) * 0.42;
  guard.limbs.leftArm.rotation.x = stride;
  guard.limbs.rightArm.rotation.x = -stride;
  guard.limbs.leftLeg.rotation.x = -stride * 0.7;
  guard.limbs.rightLeg.rotation.x = stride * 0.7;

  const distance = Math.hypot(
    guard.group.position.x - player.position.x,
    guard.group.position.z - player.position.z
  );
  guardMarker.position.set(guard.group.position.x, 0.15, guard.group.position.z);
  guardMarker.rotation.y = guard.group.rotation.y + Math.PI;
  if (distance < 1.05) finish(false, 'guard');
  ui.guard.textContent = guard.state === 'investigate' ? 'INVESTIGATING' : 'UNDETECTED';
  ui.guard.classList.toggle('alert', guard.state === 'investigate');
}

function throwDecoy() {
  if (!state.running || !state.locked || state.throwCooldown > 0) return;
  if (state.decoyCharges <= 0) {
    showToast('DECOYS RECHARGING // HOLD POSITION');
    return;
  }
  if (throwables.length >= 3) {
    showToast('TOO MANY ACTIVE DECOYS');
    return;
  }
  const direction = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16, 1),
    new THREE.MeshStandardMaterial({ color: 0x9cefff, emissive: 0x42dbea, emissiveIntensity: 1.4, roughness: 0.25 })
  );
  mesh.position.copy(camera.position).addScaledVector(direction, 0.7);
  mesh.castShadow = true;
  scene.add(mesh);
  throwables.push({
    mesh,
    velocity: direction.multiplyScalar(9).add(new THREE.Vector3(0, 2.4, 0)),
    landed: false,
    age: 0
  });
  state.throwCooldown = 0.75;
  state.decoyCharges -= 1;
  if (state.decoyRecharge <= 0) state.decoyRecharge = 6;
}

function updateDecoyCooldown(dt) {
  if (state.decoyCharges < 3) {
    state.decoyRecharge -= dt;
    if (state.decoyRecharge <= 0) {
      state.decoyCharges += 1;
      state.decoyRecharge = state.decoyCharges < 3 ? 6 : 0;
      showToast('DECOY CHARGE RESTORED // ×' + state.decoyCharges);
    }
  }
  ui.decoy.textContent = state.decoyCharges > 0
    ? 'DECOY ×' + state.decoyCharges + (state.decoyCharges < 3 ? '  NEXT ' + state.decoyRecharge.toFixed(1) + 's' : '  CLICK')
    : 'DECOY EMPTY  ' + Math.max(0, state.decoyRecharge).toFixed(1) + 's';
  ui.decoy.classList.toggle('cooldown', state.decoyCharges < 3);
}

function updateThrowables(dt) {
  for (let i = throwables.length - 1; i >= 0; i -= 1) {
    const item = throwables[i];
    item.age += dt;
    if (!item.landed) {
      item.velocity.y -= 11.5 * dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      item.mesh.rotation.x += dt * 8;
      item.mesh.rotation.z += dt * 5;
      if (item.mesh.position.y <= 0.18) {
        item.mesh.position.y = 0.18;
        item.landed = true;
        emitRing(item.mesh.position, colours.player, 15, 'decoy');
      }
    }
    if (item.age > 7) {
      scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      throwables.splice(i, 1);
    }
  }
}

function activePulse() {
  if (!state.running || !state.locked || state.transitioning || state.pingCooldown > 0) return;
  state.pingCooldown = 2.6;
  const radius = state.stage === 3 ? 22 : 16;
  emitRing(new THREE.Vector3(player.position.x, 0.18, player.position.z), colours.player, radius, 'sonar');
  document.body.classList.remove('sonar-flash');
  void document.body.offsetWidth;
  document.body.classList.add('sonar-flash');
  window.setTimeout(() => document.body.classList.remove('sonar-flash'), 450);
  showToast('ACTIVE SONAR // HOSTILES CAN TRACE IT');
}

function interact() {
  if (!state.running || state.carrying) return;
  const distance = Math.hypot(player.position.x - artifact.position.x, player.position.z - artifact.position.z);
  if (distance < 2.25) {
    state.carrying = true;
    ui.objective.textContent = 'Return to the extraction signal';
    showToast('ARTEFACT ACQUIRED — YOUR SIGNAL IS AMPLIFIED');
    emitRing(artifact.position, colours.artefact, 18, 'player');
  }
}

function clearThrowables() {
  for (const item of throwables) {
    scene.remove(item.mesh);
    item.mesh.geometry.dispose();
    item.mesh.material.dispose();
  }
  throwables.length = 0;
}

function setStagePreview(stage, announce = true) {
  state.stage = stage;
  state.carrying = false;
  state.ended = false;
  const config = stages.setStage(stage);
  gallery.visible = stage === 1;
  setAmbienceForStage(stage);
  player.position.set(0, 0, 18);
  player.velocity.set(0, 0, 0);
  camera.position.set(0, 1.68, 18);
  state.yaw = 0;
  state.pitch = 0;
  artifact.position.copy(config.artifact);
  artifact.scale.setScalar(1);
  artifact.visible = true;
  artifactPlinth.position.set(config.artifact.x, 0.575, config.artifact.z);
  artifactCase.position.set(config.artifact.x, 1.7, config.artifact.z);
  artifactGlow.position.copy(artifact.position);
  artifactMarker.position.set(config.artifact.x, 0.14, config.artifact.z);
  guard.group.position.copy(config.guard);
  guardMarker.position.set(config.guard.x, 0.15, config.guard.z);
  guard.waypoints = config.waypoints.map((point) => point.clone());
  guard.speed = config.guardSpeed;
  guard.state = 'patrol';
  guard.waypoint = 0;
  extraction.material.color.setHex(config.accent);
  state.guardSoundTimer = 0.65;
  rings.forEach(disposeRing);
  rings.length = 0;
  clearThrowables();
  ui.stageLabel.textContent = config.name + ' / ALPHA 0' + stage;
  ui.objective.textContent = config.objective;
  ui.progressSteps.forEach((step, index) => {
    step.classList.toggle('active', index === stage - 1);
    step.classList.toggle('complete', index < stage - 1);
  });
  ui.minimap.classList.remove('is-hidden');
  ui.minimap.classList.toggle('is-jammed', stage === 3);
  ui.mapStatus.textContent = stage === 3 ? 'JAMMED' : 'LIVE';
  ui.transition.classList.add('is-hidden');
  state.transitioning = false;
  emitRing(new THREE.Vector3(0, 0.12, 18), colours.player, stage === 3 ? 15 : 11, 'player');
  if (announce) showToast('PRACTICE JUMP // LEVEL 0' + stage + ' // ' + config.name);
}

function completeStage() {
  if (state.transitioning || state.ended) return;
  if (state.stage === 3) {
    finish(true);
    return;
  }

  const completed = state.stage;
  const nextStage = completed + 1;
  const nextConfig = stages.configurations[nextStage];
  state.transitioning = true;
  player.velocity.set(0, 0, 0);
  ui.interaction.classList.add('is-hidden');
  ui.transitionKicker.textContent = 'LEVEL 0' + completed + ' CLEARED';
  ui.transitionTitle.textContent = nextConfig.name;
  ui.transitionCopy.textContent = nextConfig.intro;
  ui.transition.classList.remove('is-hidden');
  playTransitionCue(nextStage);
  emitRing(extraction.position, colours.artefact, 20, 'player');

  window.setTimeout(() => {
    if (state.ended) return;
    setStagePreview(nextStage, false);
    showToast('LEVEL 0' + nextStage + ' // ' + nextConfig.name);
  }, 2100);
}

function resetGame() {
  state.running = true;
  state.ended = false;
  state.transitioning = false;
  state.startTime = performance.now();
  state.elapsed = 0;
  state.ringCount = 0;
  state.alerts = 0;
  state.footstepTimer = 0;
  state.throwCooldown = 0;
  state.decoyCharges = 3;
  state.decoyRecharge = 0;
  state.pingCooldown = 0;
  state.mapReveal = 0;
  setStagePreview(1, false);
  ui.result.classList.add('is-hidden');
  ui.hud.classList.remove('is-hidden');
  ui.reticle.classList.remove('is-hidden');
  ui.minimap.classList.remove('is-hidden');
  ui.minimap.classList.toggle('is-jammed', state.stage === 3);
  ui.sonar.classList.remove('is-hidden');
  ui.decoy.classList.remove('is-hidden');
  ui.transition.classList.add('is-hidden');
  ui.creditsButton.classList.add('is-hidden');
}
function startGame() {
  ui.start.classList.add('is-hidden');
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  startAmbience();
  resetGame();
  canvas.requestPointerLock();
}

function finish(won, reason = 'guard') {
  if (state.ended) return;
  state.ended = true;
  state.transitioning = false;
  state.running = false;
  ui.transition.classList.add('is-hidden');
  if (ambience && audioContext) ambience.master.gain.setTargetAtTime(0.0025, audioContext.currentTime, 0.7);
  state.elapsed = (performance.now() - state.startTime) / 1000;
  if (document.pointerLockElement) document.exitPointerLock();
  ui.hud.classList.add('is-hidden');
  ui.reticle.classList.add('is-hidden');
  ui.minimap.classList.add('is-hidden');
  ui.sonar.classList.add('is-hidden');
  ui.decoy.classList.add('is-hidden');
  ui.resultKicker.textContent = won ? 'MISSION COMPLETE' : 'SIGNAL INTERCEPTED';
  ui.resultTitle.textContent = won ? 'SIGNAL LOST.' : 'YOU WERE HEARD.';
  ui.resultCopy.textContent = won
    ? 'All three artefacts are secure. You left nothing behind but an echo.'
    : reason === 'laser'
      ? 'The moving laser grid crossed your body. Watch the emitters, wait for an opening, and crouch beneath high beams.'
      : reason === 'trap'
        ? 'A pressure plate armed beneath your feet. Read the floor markings and route around the glowing trap panels.'
        : 'The guard followed the wavefront back to its source. Move quieter—or send the sound somewhere else.';
  ui.statTime.textContent = formatTime(state.elapsed);
  ui.statRings.textContent = String(state.ringCount);
  ui.statAlerts.textContent = String(state.alerts);
  ui.result.classList.remove('is-hidden');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.remove('is-hidden');
  state.toastTimer = 2.2;
}

function updateToast(dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.add('is-hidden');
  }
}

function drawMapArrow(context, x, y, angle, colour, size = 14) {
  context.save();
  context.translate(x, y);
  context.rotate(angle + Math.PI / 2);
  context.beginPath();
  context.moveTo(0, -size);
  context.lineTo(size * 0.72, size * 0.68);
  context.lineTo(0, size * 0.38);
  context.lineTo(-size * 0.72, size * 0.68);
  context.closePath();
  context.fillStyle = colour;
  context.shadowColor = colour;
  context.shadowBlur = 12;
  context.fill();
  context.restore();
}

function drawMinimap() {
  const context = mapContext;
  const width = ui.mapCanvas.width;
  const height = ui.mapCanvas.height;
  const mapX = (x) => 22 + ((x + 17) / 34) * (width - 44);
  const mapY = (z) => 38 + ((z + 23) / 46) * (height - 84);
  context.clearRect(0, 0, width, height);
  context.fillStyle = 'rgba(2, 10, 15, .92)';
  context.fillRect(0, 0, width, height);

  if (state.stage === 3) {
    context.fillStyle = 'rgba(255, 49, 90, .12)';
    for (let line = 0; line < 11; line += 1) {
      const y = 38 + line * 22 + Math.sin(clock.elapsedTime * 3 + line) * 5;
      context.fillRect(28, y, width - 56, line % 3 === 0 ? 3 : 1);
    }
    context.textAlign = 'center';
    context.fillStyle = '#ff5571';
    context.font = '700 28px Consolas, monospace';
    context.fillText('SIGNAL JAMMED', width / 2, height / 2 - 5);
    context.fillStyle = '#7f99a4';
    context.font = '500 17px Consolas, monospace';
    context.fillText('USE SONAR TO NAVIGATE', width / 2, height / 2 + 28);
    return;
  }

  const reveal = THREE.MathUtils.clamp(state.mapReveal, 0, 1);
  context.save();
  context.globalAlpha = 0.045 + reveal * 0.955;

  for (const box of colliders) {
    if (box.stage && box.stage !== state.stage) continue;
    const x = mapX(box.minX);
    const y = mapY(box.minZ);
    const boxWidth = Math.max(2, mapX(box.maxX) - x);
    const boxHeight = Math.max(2, mapY(box.maxZ) - y);
    context.fillStyle = box.stage === 2 ? 'rgba(184, 49, 78, .58)' : 'rgba(41, 133, 151, .62)';
    context.strokeStyle = box.stage === 2 ? 'rgba(255, 91, 119, .9)' : 'rgba(114, 239, 255, .72)';
    context.lineWidth = 1.5;
    context.fillRect(x, y, boxWidth, boxHeight);
    context.strokeRect(x, y, boxWidth, boxHeight);
  }

  if (state.stage === 2) {
    for (const laser of stages.hazards.lasers) {
      const startX = mapX(laser.x - laser.length / 2);
      const endX = mapX(laser.x + laser.length / 2);
      const y = mapY(laser.z);
      context.beginPath();
      context.moveTo(startX, y);
      context.lineTo(endX, y);
      context.strokeStyle = '#ff315a';
      context.lineWidth = 3.5;
      context.shadowColor = '#ff315a';
      context.shadowBlur = 8;
      context.stroke();
    }
    context.shadowBlur = 0;
    for (const trap of stages.hazards.traps) {
      const left = mapX(trap.x - trap.halfX);
      const top = mapY(trap.z - trap.halfZ);
      const trapWidth = mapX(trap.x + trap.halfX) - left;
      const trapHeight = mapY(trap.z + trap.halfZ) - top;
      context.fillStyle = 'rgba(255, 49, 90, .5)';
      context.fillRect(left, top, trapWidth, trapHeight);
      context.strokeStyle = '#ff9a45';
      context.lineWidth = 2;
      context.strokeRect(left, top, trapWidth, trapHeight);
    }
  }

  const exitX = mapX(0);
  const exitY = mapY(19.4);
  context.beginPath();
  context.arc(exitX, exitY, 13, 0, Math.PI * 2);
  context.strokeStyle = '#76ffb2';
  context.lineWidth = 4;
  context.shadowColor = '#76ffb2';
  context.shadowBlur = 10;
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#9affc4';
  context.font = '700 14px Consolas, monospace';
  context.textAlign = 'center';
  context.fillText('EXIT', exitX, exitY - 18);

  const targetPosition = state.carrying ? player.position : artifact.position;
  const targetX = mapX(targetPosition.x);
  const targetY = mapY(targetPosition.z);
  context.save();
  context.translate(targetX, targetY);
  context.rotate(Math.PI / 4);
  context.fillStyle = '#ffd76a';
  context.shadowColor = '#ffd76a';
  context.shadowBlur = 14;
  context.fillRect(-8, -8, 16, 16);
  context.restore();

  const guardX = mapX(guard.group.position.x);
  const guardY = mapY(guard.group.position.z);
  const guardAngle = Math.atan2(Math.cos(guard.group.rotation.y), Math.sin(guard.group.rotation.y));
  context.beginPath();
  context.moveTo(guardX, guardY);
  context.arc(guardX, guardY, 48, guardAngle - 0.48, guardAngle + 0.48);
  context.closePath();
  context.fillStyle = 'rgba(255, 49, 90, .13)';
  context.fill();
  drawMapArrow(context, guardX, guardY, guardAngle, '#ff315a', 13);
  context.restore();

  const playerX = mapX(player.position.x);
  const playerY = mapY(player.position.z);
  const playerAngle = Math.atan2(-Math.cos(state.yaw), -Math.sin(state.yaw));
  drawMapArrow(context, playerX, playerY, playerAngle, '#72efff', 14);
  if (reveal > 0.05) {
    const radius = 18 + reveal * 62;
    context.beginPath();
    context.arc(playerX, playerY, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(114, 239, 255, ' + (0.2 + reveal * 0.65) + ')';
    context.lineWidth = 3;
    context.shadowColor = '#72efff';
    context.shadowBlur = 12;
    context.stroke();
    context.shadowBlur = 0;
  }
}

function render() {
  renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.render(scene, camera);
  drawMinimap();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!state.running) return;
  const elapsed = clock.elapsedTime;
  sharedUniforms.uTime.value = elapsed;
  artifact.rotation.y += dt * 0.75;
  artifact.rotation.x = Math.sin(elapsed * 0.8) * 0.12;
  if (!state.carrying) artifact.position.y = 1.55 + Math.sin(elapsed * 1.4) * 0.08;
  extraction.material.opacity = 0.2 + Math.sin(elapsed * 2.2) * 0.1;
  extractionRings.forEach((ring, index) => {
    const pulse = 1 + Math.sin(elapsed * 2.4 + index * 1.3) * (state.carrying ? 0.065 : 0.025);
    ring.scale.setScalar(pulse);
    ring.material.opacity = (state.carrying ? 0.78 : 0.42) - index * 0.16;
  });
  for (const item of decor) item.mesh.rotation.y += dt * item.speed;
  state.mapReveal = Math.max(0, state.mapReveal - dt * 0.3);
  if (state.stage !== 3) {
    ui.mapStatus.textContent = state.mapReveal > 0.08 ? 'ECHO' : 'DORMANT';
    ui.minimap.classList.toggle('revealed', state.mapReveal > 0.08);
  }

  if (state.running && state.locked && !state.transitioning) {
    state.elapsed = (performance.now() - state.startTime) / 1000;
    state.throwCooldown = Math.max(0, state.throwCooldown - dt);
    state.pingCooldown = Math.max(0, state.pingCooldown - dt);
    updateDecoyCooldown(dt);
    ui.sonar.textContent = state.pingCooldown > 0 ? 'SONAR RECHARGING ' + state.pingCooldown.toFixed(1) + 's' : 'SONAR READY  SPACE';
    ui.sonar.classList.toggle('cooldown', state.pingCooldown > 0);
    updatePlayer(dt);
    stages.update(state.stage, player.position, state.crouching, elapsed, (reason) => finish(false, reason));
    updateGuard(dt);
    updateThrowables(dt);
  }
  updateRingUniforms(dt, elapsed);
  updateToast(dt);
  render();
}

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Enter' && !state.running && !state.ended && !ui.start.classList.contains('is-hidden')) startGame();
  if (event.code === 'KeyE') interact();
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    activePulse();
  }
  if (state.running && !state.transitioning && ['Digit1','Digit2','Digit3'].includes(event.code)) setStagePreview(Number(event.code.slice(-1)));
  if (event.code === 'KeyR' && state.ended) {
    resetGame();
    canvas.requestPointerLock();
  }
});
document.addEventListener('keyup', (event) => { keys[event.code] = false; });
document.addEventListener('mousemove', (event) => {
  if (!state.locked || !state.running) return;
  state.yaw -= event.movementX * 0.0022;
  state.pitch -= event.movementY * 0.0019;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -1.38, 1.38);
});
document.addEventListener('pointerlockchange', () => {
  state.locked = document.pointerLockElement === canvas;
  if (!state.locked && state.running && !state.ended) showToast('PAUSED — CLICK TO RESUME');
});
canvas.addEventListener('click', () => {
  if (state.running && !state.locked) canvas.requestPointerLock();
});
canvas.addEventListener('mousedown', (event) => {
  if (event.button === 0) throwDecoy();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
ui.startButton.addEventListener('click', startGame);
ui.restartButton.addEventListener('click', () => {
  resetGame();
  canvas.requestPointerLock();
});
ui.creditsButton.addEventListener('click', () => ui.credits.showModal());
ui.closeCredits.addEventListener('click', () => ui.credits.close());

if (new URLSearchParams(window.location.search).has('qa')) {
  window.__signalQa = {
    completeStage,
    takeArtifact: interact,
    movePlayer: (x, z) => player.position.set(x, 0, z),
    setView: (yaw, pitch = 0) => { state.yaw = yaw; state.pitch = pitch; },
    isBlockedAt: (x, z) => isBlocked(new THREE.Vector3(x, 0, z)),
    getState: () => ({ stage: state.stage, running: state.running, ended: state.ended, transitioning: state.transitioning, carrying: state.carrying, rings: state.ringCount, alerts: state.alerts, decoys: state.decoyCharges, mapReveal: state.mapReveal })
  };
}

createWorld();
camera.position.set(0, 1.68, 18);
camera.rotation.set(0, 0, 0);
animate();
