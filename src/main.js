import * as THREE from 'three';
import './styles.css';
import './screens.css';
import './gameplay.css';
import { MAX_RINGS, createSoundMaterial, createSoundUniforms } from './shaders.js';
import { createStageSystem } from './stages.js';
import { createGalleriesMission, FLOOR_ZONES, SURFACES, surfaceAt, noiseScaleAt } from './galleries.js';
import { createTutorial, createTutorialRun, advanceTutorial, TUTORIAL_STEPS, TUTORIAL_STAGE,
  TUTORIAL_FLOOR, DAMPENER_PICKUP, DECOY_TARGET, TUTORIAL_EXIT, SENSOR_ORIGIN,
  MARBLE_RESET_Z, MARBLE_GRACE } from './tutorial.js';
import { hasClearAccess } from './interactions.js';
import { createVaultMission, SIGNATURES } from './vault.js';
import { createNavigator, stepToward, unstick } from './navigation.js';
import { THROW, advanceThrow, simulateThrow, impactRadius } from './throwing.js';
import { createEscapeMission, ESCAPE_EXIT, OVERRIDE_SECONDS } from './escape.js';
import { playerIlluminated, updateGuardAwareness, hearSound } from './visibility.js';
import { STORY } from './story.js';
import { createArchiveReel } from './reel.js';
import { createEventBus } from './core/events.js';
import { ALARM_RAISE, createAlarmSystem } from './gameplay/alarm.js';
import { createCheckpointStore } from './gameplay/checkpoints.js';
import { MOVEMENT, canUseDecoy, movementMode, movementProfile } from './gameplay/player.js';
import { createPickpocketSystem, PICKPOCKET_SECONDS } from './gameplay/pickpocket.js';
import { createEchoSystem } from './gameplay/echo.js';
import { createStaminaSystem } from './gameplay/stamina.js';
import { createPickupSystem } from './gameplay/pickups.js';
import { createCctvSystem } from './gameplay/cctv.js';
import { createSafecrackSystem } from './gameplay/safecrack.js';
import { createPlateSystem } from './gameplay/plates.js';

const ui = {
  start: document.querySelector('#start-screen'),
  result: document.querySelector('#result-screen'),
  startButton: document.querySelector('#start-button'),
  restartButton: document.querySelector('#restart-button'),
  hud: document.querySelector('#hud'),
  reticle: document.querySelector('#reticle'),
  cctvFilter: document.querySelector('#cctv-filter'),
  cctvCells: document.querySelectorAll('.cctv-cell'),
  minimap: document.querySelector('#minimap'),
  mapCanvas: document.querySelector('#map-canvas'),
  sonar: document.querySelector('#sonar-status'),
  decoy: document.querySelector('#decoy-status'),
  dampener: document.querySelector('#dampener-status'),
  echo: document.querySelector('#echo-status'),
  echoStep: document.querySelector('#echo-step'),
  echoTime: document.querySelector('#echo-time'),
  echoAction: document.querySelector('#echo-action'),
  echoHelp: document.querySelector('#echo-help'),
  echoFill: document.querySelector('#echo-fill'),
  veil: document.querySelector('#dampener-veil'),
  surface: document.querySelector('#surface-state'),
  objective: document.querySelector('#objective'),
  signature: document.querySelector('#vault-signature'),
  safe: document.querySelector('#safecrack'),
  safeDial: document.querySelector('#safe-dial'),
  safeNumber: document.querySelector('#safe-number'),
  safeSignal: document.querySelector('#safe-signal'),
  safeProgress: document.querySelector('#safe-progress'),
  safeHint: document.querySelector('#safe-hint'),
  override: document.querySelector('#door-override'),
  overrideText: document.querySelector('#override-text'),
  overrideFill: document.querySelector('#override-fill'),
  exposure: document.querySelector('#exposure-state'),
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
  newHeistButton: document.querySelector('#newheist-button'),
  resultCampaign: document.querySelector('#result-campaign'),
  practiceFlag: document.querySelector('#practice-flag'),
  trainingButton: document.querySelector('#training-button'),
  lesson: document.querySelector('#lesson'),
  lessonTitle: document.querySelector('#lesson-title'),
  lessonHint: document.querySelector('#lesson-hint'),
  lessonStep: document.querySelector('#lesson-step'),
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
const cctvCamera = new THREE.PerspectiveCamera(62, 1, 0.08, 90);
cctvCamera.rotation.order = 'YXZ';
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
const events = createEventBus();
const alarm = createAlarmSystem({ events });
const checkpoints = createCheckpointStore({ events });
const pickpocket = createPickpocketSystem({ events });
const echo = createEchoSystem({ events });
const sprintStamina = createStaminaSystem();
const pickups = createPickupSystem([
  { id: 'gala-watch', label: 'VINTAGE WATCH', type: 'loot', value: 250, stage: 1, x: -13.5, z: -5.1 },
  { id: 'gala-clutch', label: 'GALA CLUTCH', type: 'loot', value: 400, stage: 1, x: 11.8, z: 10.8 },
  { id: 'evidence-1', label: 'DEX AUDIO LOG 01', type: 'evidence', value: 0, stage: 1, x: 11.3, z: -20.2 },
  { id: 'evidence-2', label: 'GUARD RADIO INTERCEPT', type: 'evidence', value: 0, stage: 2, x: -12.8, z: -18.5 },
  { id: 'evidence-3', label: 'SECURITY CHIEF FILE', type: 'evidence', value: 0, stage: 3, x: 12.4, z: -14.2 }
], { events });
const cctv = createCctvSystem([
  { id: 'CAM 01 / ATRIUM', x: 0, z: 20.5, yaw: Math.PI, range: 15, fov: Math.PI / 2.8 },
  { id: 'CAM 02 / WEST WING', x: -15.5, z: 4, yaw: Math.PI / 2, range: 13, fov: Math.PI / 2.7 },
  { id: 'CAM 03 / TRANSIT', x: 15.5, z: -3, yaw: -Math.PI / 2, range: 14, fov: Math.PI / 2.8 },
  { id: 'CAM 04 / NORTH HALL', x: 0, z: -20.5, yaw: 0, range: 13, fov: Math.PI / 2.7 }
], { events });
const safecrack = createSafecrackSystem({ events });
const echoPlates = createPlateSystem([
  { id: 'SYNC A', x: -6, z: 13, halfX: 1.05, halfZ: 1.05 },
  { id: 'SYNC B', x: 6, z: 13, halfX: 1.05, halfZ: 1.05 }
], { events });

const state = {
  running: false,
  stage: 1,
  ended: false,
  transitioning: false,
  locked: false,
  carrying: false,
  hasKey: false,
  hasDiamond: false,
  won: false,
  exposure: 0,
  playTime: 0,
  startTime: 0,
  elapsed: 0,
  ringCount: 0,
  alerts: 0,
  yaw: 0,
  pitch: 0,
  crouching: false,
  crawling: false,
  sprinting: false,
  jumpOffset: 0,
  verticalVelocity: 0,
  footstepTimer: 0,
  throwCooldown: 0,
  decoyCharges: 3,
  decoyRecharge: 0,
  cloak: 6,
  cloakActive: false,
  cloakCooldown: 0,
  aiming: false,
  hasDampener: true,
  pingCooldown: 0,
  mapReveal: 0,
  toastTimer: 0,
  hazardCooldown: 0,
  cctvActive: false,
  cctvIndex: -1,
  safeActive: false,
  safeCase: null,
  safeNoiseCooldown: 0
};

// A campaign is one honest run through all three levels in order. Practice
// jumps and the ?qa hooks taint it permanently, so a skipped run can never
// present itself as a completed heist. Totals accumulate across level
// transitions AND across level retries - a retry is part of how long the job
// took you - and only a full restart clears them.
const campaign = {
  valid: true,
  stagesCleared: 0,
  sonarUses: 0,
  detections: 0,
  retries: 0,
  time: 0
};

function resetCampaign() {
  campaign.valid = true;
  campaign.stagesCleared = 0;
  campaign.sonarUses = 0;
  campaign.detections = 0;
  campaign.retries = 0;
  campaign.time = 0;
  updatePracticeFlag();
}

function taintCampaign(reason) {
  if (!campaign.valid) return;
  campaign.valid = false;
  updatePracticeFlag();
  if (reason) showToast(reason);
}

function updatePracticeFlag() {
  if (!ui.practiceFlag) return;
  ui.practiceFlag.classList.toggle('is-hidden', campaign.valid);
}

const player = {
  position: new THREE.Vector3(0, 0, 18),
  velocity: new THREE.Vector3(),
  radius: 0.46
};

// Dampener. The rig keeps pinging while it runs - the player still sees the
// room - but the returns come back as noise on every other rig in the
// building. It draws from the same cell as the rig, so pushing the rig harder
// empties it faster: that is the decision inside the safe window.
const CLOAK_MAX = 6;
const CLOAK_RECHARGE = 0.82;
const CLOAK_COOLDOWN = 1.6;
const CLOAK_MIN_ENGAGE = 0.7;
const CLOAK_DRAIN = { still: 0.45, crouch: 0.6, walk: 1, run: 1.9 };
const CLOAK_PING_COST = 1.1;

// Arrow-key look. Rates are chosen to feel close to a slow deliberate mouse
// sweep rather than a snap turn, since reading echoes rewards panning slowly.
const LOOK_YAW_RATE = 2.1;
const LOOK_PITCH_RATE = 1.5;

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
let artifactMarker;
let extractionMarker;
let guard;
const guards = [];
let stages;
let playerLight;
let throwPreview;
let tutorial;
let echoAvatar;
let echoFrame = null;
let echoPrevious = null;
let echoStepTimer = 0;
const pickupMeshes = new Map();
const echoPlateMeshes = new Map();
// Per-run tutorial progress and the measurements its steps are judged on.
const tutorialRun = Object.assign(createTutorialRun(), {
  lookTravel: 0, walkDistance: 0, ranOnMarble: false, sonarUsed: 0,
  decoyLandedNearTarget: false, reachedExit: false, sensorTimer: 0, finished: false,
  stepAge: 0, lastYaw: undefined
});

function resetTutorialRun() {
  Object.assign(tutorialRun, createTutorialRun(), {
    lookTravel: 0, walkDistance: 0, ranOnMarble: false, sonarUsed: 0,
    decoyLandedNearTarget: false, reachedExit: false, sensorTimer: 0, finished: false,
    stepAge: 0, lastYaw: undefined
  });
}
let gallery;
let galleriesMission;
let vaultMission;
let escapeMission;
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
    const collider = {
      stage,
      minX: position.x - size.x / 2,
      maxX: position.x + size.x / 2,
      minZ: position.z - size.z / 2,
      maxZ: position.z + size.z / 2,
      // Height matters only to thrown objects; walking collision stays 2D.
      top: position.y + size.y / 2
    };
    colliders.push(collider);
    // Exposed so callers can open and close a wall later - the training gates
    // disable theirs as each lesson is completed.
    mesh.userData.collider = collider;
    mesh.userData.mapBlock = mapBlock;
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

function createLabelTexture(text) {
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
  return texture;
}

function createLabelSprite(text) {
  const texture = createLabelTexture(text);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

function createLabelPanel(text, width) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: createLabelTexture(text), alphaTest: 0.1 }));
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
  const label = createLabelPanel('EMERGENCY EXIT', 3.4);
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

  // Surface patches sit just above the base floor. They are the only cue the
  // player gets about how far their footsteps will carry, so they need to read
  // instantly - hence a flat colour step rather than a blend.
  for (const zone of FLOOR_ZONES) {
    const [minX, minZ, maxX, maxZ] = zone.rect;
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      createSoundMaterial(sharedUniforms, SURFACES[zone.surface].colour)
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((minX + maxX) / 2, 0.014, (minZ + maxZ) / 2);
    patch.receiveShadow = true;
    patch.name = 'floor-' + zone.name;
    gallery.add(patch);
  }

  galleriesMission = createGalleriesMission({ gallery, addBox, materials, createLabelPanel });

  for (const securityCamera of cctv.cameras) {
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.68),
      new THREE.MeshStandardMaterial({ color: 0x1b2530, emissive: 0xff315a, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.32 })
    );
    housing.position.set(securityCamera.x, 3.35, securityCamera.z);
    housing.rotation.y = securityCamera.yaw + Math.PI;
    housing.userData.cameraId = securityCamera.id;
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff315a })
    );
    lens.position.set(0, 0, -0.36);
    housing.add(lens);
    gallery.add(housing);
    securityCamera.mesh = housing;
    securityCamera.lens = lens;
  }

  tutorial = createTutorial({ level, materials, addBox, createLabelPanel });
  for (const zone of TUTORIAL_FLOOR) {
    const [minX, minZ, maxX, maxZ] = zone.rect;
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
      createSoundMaterial(sharedUniforms, SURFACES[zone.surface].colour)
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set((minX + maxX) / 2, 0.014, (minZ + maxZ) / 2);
    patch.receiveShadow = true;
    tutorial.group.add(patch);
  }
  tutorial.setVisible(false);

  // Hall columns. They flank the walking line rather than sitting on it, so
  // the hall stays fast to cross and only costs you cover.
  for (const [x, z] of [[-3.4, 10.5], [3.4, 10.5], [-3.4, 1.5], [3.4, 1.5]]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 5.2, 10), materials.stone);
    column.position.set(x, 2.6, z);
    column.castShadow = true;
    column.receiveShadow = true;
    gallery.add(column);
    colliders.push({ stage: 1, minX: x - 0.64, maxX: x + 0.64, minZ: z - 0.64, maxZ: z + 0.64, top: 5.2 });
  }

  // Exhibits are placed off the mirror line: each wing gets a different count
  // and a different silhouette so the two halves never read as the same room.
  addPedestal(-13.5, -6, new THREE.IcosahedronGeometry(0.72, 1), 0x375b6a, gallery, 1);
  addPedestal(-11, 19, new THREE.OctahedronGeometry(0.76, 0), 0x5b3b4e, gallery, 1);
  addPedestal(2.6, -1.5, new THREE.TorusKnotGeometry(0.48, 0.16, 64, 10), 0x604941, gallery, 1);
  addPedestal(10.5, -12, new THREE.TorusGeometry(0.62, 0.17, 12, 48), 0x31576b, gallery, 1);
  addPedestal(12.5, 11.5, new THREE.DodecahedronGeometry(0.7, 0), 0x6a5a2f, gallery, 1);

  addFrame(-16.72, 2.55, 6, Math.PI / 2, 0x2b7080, gallery);
  addFrame(-16.72, 2.55, -2, Math.PI / 2, 0x74334a, gallery);
  addFrame(16.72, 2.55, 8, -Math.PI / 2, 0x71522c, gallery);
  addFrame(-8, 2.6, 22.72, Math.PI, 0x4b2b67, gallery);
  addFrame(7, 2.6, 22.72, Math.PI, 0x2f6f69, gallery);
  addFrame(-5, 2.6, -22.72, 0, 0x2c526d, gallery);

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

  // Emergency lighting only, and deliberately uneven. The atrium and the
  // transit corridor keep a little light; conservation and the stacks get
  // none, which is the second reason the west route is the safe one.
  for (const [x, z] of [[-2, 19], [9, 18.5], [11.5, 7], [12.5, -13]]) {
    const light = new THREE.PointLight(0xffbb72, 11, 7.5, 2);
    light.position.set(x, 3.8, z);
    scene.add(light);
    museumLights.push(light);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd39a })
    );
    lamp.position.copy(light.position);
    scene.add(lamp);
  }

  artifact = createArchiveReel();
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

  for (const item of pickups.items) {
    const evidence = item.type === 'evidence';
    const mesh = new THREE.Mesh(
      evidence ? new THREE.BoxGeometry(0.42, 0.08, 0.55) : new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: evidence ? 0xa989ff : 0xffd76a,
        emissive: evidence ? 0x5835b5 : 0xa45b12,
        emissiveIntensity: 1.1,
        metalness: evidence ? 0.2 : 0.72,
        roughness: 0.28
      })
    );
    mesh.position.set(item.x, evidence ? 0.2 : 0.34, item.z);
    mesh.rotation.x = evidence ? -0.08 : 0;
    mesh.userData.pickupId = item.id;
    level.add(mesh);
    pickupMeshes.set(item.id, mesh);
  }

  for (const plate of echoPlates.plates) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.2, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x12222b, metalness: 0.75, roughness: 0.32 })
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 48),
      new THREE.MeshBasicMaterial({ color: 0xff315a, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.075;
    group.position.set(plate.x, 0.06, plate.z);
    group.add(base, ring);
    const label = createLabelPanel(plate.id + ' // ECHO SYNC', 2.5);
    label.position.set(plate.x, 0.18, plate.z - 1.35);
    label.rotation.x = -Math.PI / 2;
    level.add(group, label);
    echoPlateMeshes.set(plate.id, { group, ring, label });
  }

  throwPreview = createThrowPreview();
  guard = createGuard();
  guards.push(guard, createGuard());
  echoAvatar = createEchoAvatar();
  galleriesMission.setGuardCarriesKey(true);
  stages = createStageSystem({
    scene,
    level,
    minimapScene,
    materials,
    colliders,
    lights: museumLights,
    sharedUniforms,
    renderer
  });
  vaultMission = createVaultMission({ level, materials, colliders, createLabelPanel });
  escapeMission = createEscapeMission({ level, colliders, createLabelPanel });
}

function createEchoAvatar() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x72efff,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.72, 4, 8), material);
  body.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), material.clone());
  head.position.y = 1.72;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.025, 6, 30),
    new THREE.MeshBasicMaterial({ color: 0xc7fbff, transparent: true, opacity: 0.48, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  group.add(body, head, ring);
  group.visible = false;
  scene.add(group);
  return group;
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
  const keycard = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.28, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffb329, emissiveIntensity: 1.1, metalness: 0.55, roughness: 0.3 })
  );
  keycard.position.set(0.42, 0.91, -0.02);
  keycard.rotation.z = -0.18;
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
  group.add(body, vest, belt, keycard, head, helmet, visor, capBrim, badge, leftArm, rightArm, leftLeg, rightLeg, flashlightBeam);
  group.position.set(10, 0, -10);
  scene.add(group);
  const light = new THREE.PointLight(0xff254e, 7, 5.5, 2);
  light.position.set(0, 1.55, 0.45);
  group.add(light);
  const marker = createMapArrow(0xff315a, 1.7);
  marker.position.set(10, 0.15, -10);
  minimapScene.add(marker);
  const createdGuard = {
    id: 'okafor',
    marker,
    active: false,
    soundTimer: 0.65,
    lastSeen: new THREE.Vector3(),
    suspicion: 0,
    decoyFocus: 0,
    searchTimer: 0,
    group,
    state: 'patrol',
    waypoint: 0,
    target: new THREE.Vector3(),
    speed: 1.65,
    keycard,
    limbs: { leftArm, rightArm, leftLeg, rightLeg },
    waypoints: [
      new THREE.Vector3(10, 0, -10),
      new THREE.Vector3(10, 0, 5),
      new THREE.Vector3(-10, 0, 5),
      new THREE.Vector3(-10, 0, -10),
      new THREE.Vector3(0, 0, -16)
    ]
  };
  return createdGuard;
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
    // Pinned just above the floor rather than to the emitter's height, so the
    // drawn ring sits on the same ground band the shader is lighting. A guard
    // pulse starts at chest height and used to float a long way above it.
    mesh.position.y = 0.03 + index * 0.012;
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

function emitRing(position, colour, maxRadius, source, damped = false) {
  rings.push({
    position: position.clone(),
    colour: colour.clone(),
    age: 0,
    duration: Math.max(1.15, maxRadius / 8.4),
    maxRadius,
    source,
    damped,
    visuals: createPulseVisual(position, colour, source)
  });
  // The map is local by default. Only an intentional sonar pulse resolves
  // the whole floor; footsteps, guards and decoys never grant free intel.
  if (source === 'sonar') state.mapReveal = 1;
  while (rings.length > MAX_RINGS) disposeRing(rings.shift());
  state.ringCount += 1;
  if (source !== 'guard' && source !== 'briefing') {
    events.emit('player:noise', { position: position.clone(), radius: maxRadius, source, damped });
  }
  ping(source);
  // A damped return still draws, so the player keeps their picture of the
  // room. It just never reaches another rig, so nobody comes looking.
  if (!damped && ['player', 'decoy', 'sonar', 'override', 'echo'].includes(source)) {
    let heard = false;
    for (const guard of guards) {
      if (hearSound(guard, position, maxRadius, source, colliders, state.stage)) heard = true;
    }
    if (heard) {
      state.alerts += 1;
      alarm.raise(ALARM_RAISE[source] ?? ALARM_RAISE.footstep, source);
      showToast('GUARD HEARD ' + (source === 'decoy' ? 'THE DECOY' : source === 'override' ? 'THE OVERRIDE' : source === 'sonar' ? 'THE SONAR PULSE' : 'YOU'));
    }
  }
}

function updateRingUniforms(dt, elapsed) {
  sharedUniforms.uTime.value = elapsed;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const previousRadius = rings[i].age / rings[i].duration * rings[i].maxRadius;
    rings[i].age += dt;
    const t = Math.min(1, rings[i].age / rings[i].duration);
    if (dt > 0 && state.stage === 2 && !state.transitioning) {
      const reached = vaultMission.scanWave(rings[i], previousRadius, t * rings[i].maxRadius);
      if (reached.length) {
        ui.signature.textContent = vaultMission.readout();
        showToast(reached.map((exhibit) => 'CASE ' + exhibit.id + ': ' + SIGNATURES[exhibit.signature].name).join(' // '));
      }
    }
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
    3: { root: 29, harmony: 43, cutoff: 92, gain: 0.019 },
    4: { root: 55, harmony: 82, cutoff: 280, gain: 0.009 }
  }[stage];
  // An unknown stage used to throw here and take the whole frame loop with it.
  if (!settings) return;
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
    if (box.disabled) return false;
    if (box.stage && box.stage !== state.stage) return false;
    return position.x + r > box.minX && position.x - r < box.maxX &&
      position.z + r > box.minZ && position.z - r < box.maxZ;
  });
}

function updatePlayer(dt) {
  const requestedMode = movementMode(keys);
  const mode = requestedMode.id === 'sprint' && (state.stage !== 3 || !sprintStamina.snapshot().canSprint)
    ? MOVEMENT.run
    : requestedMode;
  state.crawling = mode.id === 'crawl';
  state.crouching = mode.id === 'crouch' || state.crawling;
  const walking = mode.id === 'walk';
  const speed = movementProfile(keys, { carrying: state.carrying, mode }).speed;
  const input = new THREE.Vector2(
    (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
    (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0)
  );
  if (input.lengthSq() > 1) input.normalize();

  // Arrow keys drive the same yaw and pitch the mouse does, so either input
  // works and they can be used together.
  const lookX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  const lookY = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
  if (lookX !== 0) state.yaw -= lookX * LOOK_YAW_RATE * dt;
  if (lookY !== 0) {
    state.pitch = THREE.MathUtils.clamp(state.pitch - lookY * LOOK_PITCH_RATE * dt, -1.38, 1.38);
  }

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
  state.sprinting = mode.id === 'sprint' && moving;
  const staminaState = sprintStamina.update(dt, state.sprinting);
  // The floor is part of the noise model in Level 1: the same run costs you
  // seven metres of echo on carpet and nearly seventeen on marble.
  const surfaced = state.stage === 1 || state.stage === TUTORIAL_STAGE;
  const surface = surfaced ? surfaceAt(player.position.x, player.position.z) : 'stone';
  const surfaceNoise = surfaced ? noiseScaleAt(player.position.x, player.position.z) : 1;
  const profile = movementProfile(keys, { carrying: state.carrying, surfaceNoise, damped: state.cloakActive, mode });
  const noiseLevel = moving ? profile.noise : 0.03;
  ui.noise.style.width = Math.round(noiseLevel * 100) + '%';
  ui.noise.style.background = state.cloakActive ? 'var(--cyan)' : noiseLevel > 0.7 ? 'var(--red)' : 'var(--cyan)';
  ui.movement.textContent = mode.label + (mode.id === 'sprint' ? ' ' + Math.round(staminaState.ratio * 100) + '%' : '');
  ui.movement.classList.toggle('walk', walking);
  ui.movement.classList.toggle('crouch', state.crouching);
  ui.movement.classList.toggle('sprint', state.sprinting);
  if (ui.surface) {
    ui.surface.textContent = SURFACES[surface].label;
    ui.surface.classList.toggle('is-hidden', state.stage !== 1 && state.stage !== TUTORIAL_STAGE);
    ui.surface.classList.toggle('loud', surfaceNoise > 1.1);
    ui.surface.classList.toggle('quiet', surfaceNoise < 0.9);
  }

  if (moving) {
    state.footstepTimer -= dt;
    if (state.footstepTimer <= 0) {
      emitRing(new THREE.Vector3(player.position.x, 0.12, player.position.z), colours.player, profile.radius, 'player', state.cloakActive);
      state.footstepTimer = profile.step;
    }
  } else {
    state.footstepTimer = Math.min(state.footstepTimer, 0.1);
  }

  updateDampener(dt, moving, walking);
  updateTutorial(dt, moving, walking, surface);

  if (state.jumpOffset > 0 || state.verticalVelocity > 0) {
    state.verticalVelocity -= 14 * dt;
    state.jumpOffset += state.verticalVelocity * dt;
    if (state.jumpOffset <= 0) {
      state.jumpOffset = 0;
      state.verticalVelocity = 0;
    }
  }

  const bobSpeed = state.crouching ? 5 : walking ? 7 : 11;
  const bobAmount = state.crouching ? 0.012 : walking ? 0.018 : 0.042;
  const targetHeight = mode.height + state.jumpOffset + (moving && state.jumpOffset === 0 ? Math.sin(state.playTime * bobSpeed) * bobAmount : 0);
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

  const prompt = interactionPrompt();
  ui.interaction.textContent = prompt;
  ui.interaction.classList.toggle('is-hidden', !prompt);

}

function updateGuard(guard, dt) {
  guard.decoyFocus = Math.max(0, guard.decoyFocus - dt);
  guard.soundTimer -= dt;
  if (guard.soundTimer <= 0) {
    emitRing(new THREE.Vector3(guard.group.position.x, 0.65, guard.group.position.z), guard.state === 'patrol' ? colours.guard : colours.alert, 9.5, 'guard');
    guard.soundTimer = (guard.state === 'patrol' ? 2.8 : 1.45) * alarm.snapshot().pulseInterval;
  }

  // Guards resolve the player only when a live return lights them up, they are
  // inside the cone and nothing is in the way - the same picture the player is
  // working from. Level 2 keeps its tuned sound-only behaviour.
  if (state.stage !== 2) {
    const wasPursuing = guard.state === 'pursue';
    updateGuardAwareness(guard, player.position, state.exposure > 0, colliders, dt, state.stage);
    // Count the moment a guard resolves the player, not every sound it heard.
    if (!wasPursuing && guard.state === 'pursue') {
      campaign.detections += 1;
      alarm.raise(ALARM_RAISE.detected, 'detected');
    }
  }

  let target;
  if (guard.state !== 'patrol') {
    target = guard.target;
  } else {
    target = guard.waypoints[guard.waypoint];
  }
  if (guard.navigator) {
    guard.replanIn = Math.max(0, guard.replanIn - dt);
    const goalKey = guard.state + ':' + Math.round(target.x * 2) + ':' + Math.round(target.z * 2);
    if (guard.goalKey !== goalKey && guard.replanIn === 0) {
      guard.route = guard.navigator.route(guard.group.position, target);
      guard.routeIndex = 0;
      guard.goalKey = goalKey;
      guard.replanIn = 0.6;
    }
    while (guard.routeIndex < guard.route.length && Math.hypot(
      guard.route[guard.routeIndex].x - guard.group.position.x,
      guard.route[guard.routeIndex].z - guard.group.position.z) < 0.08) guard.routeIndex++;
    // A guard that has ended up inside inflated geometry can never produce a
    // legal step, so free it before trying to move.
    const freed = unstick(guard.navigator, guard.group.position);
    if (freed) {
      guard.group.position.x = freed.x;
      guard.group.position.z = freed.z;
      guard.goalKey = null;
      guard.replanIn = 0;
    }
    const point = guard.route[guard.routeIndex];
    if (point) {
      const dx = point.x - guard.group.position.x, dz = point.z - guard.group.position.z;
      const pace = (guard.state === 'pursue' ? 2.8 : guard.state !== 'patrol' ? 2.05 : guard.speed) * alarm.snapshot().guardSpeed;
      const next = stepToward(guard.navigator, guard.group.position, point, pace * dt);
      if (next) {
        guard.group.position.x = next.x;
        guard.group.position.z = next.z;
        guard.group.rotation.y = Math.atan2(dx, dz);
      } else {
        // Nothing legal in any direction: replan immediately rather than
        // standing against the wall until the throttle expires.
        guard.goalKey = null;
        guard.replanIn = 0;
      }
    } else if (guard.goalKey === goalKey) {
      if (guard.state === 'investigate') {
        guard.state = state.stage !== 2 ? 'search' : 'patrol';
        guard.searchTimer = 3;
      }
      else if (guard.state === 'patrol') {
        guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
        guard.goalKey = null;
      }
    }
  } else {
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
      const pace = (guard.state === 'investigate' ? (state.stage === 2 ? 2.05 : 1.9) : guard.speed) * alarm.snapshot().guardSpeed;
      guard.group.position.addScaledVector(delta, pace * dt);
      guard.group.rotation.y = Math.atan2(delta.x, delta.z);
    }
  }

  const stride = Math.sin(state.playTime * (guard.state === 'investigate' ? 10 : 7)) * 0.42;
  guard.limbs.leftArm.rotation.x = stride;
  guard.limbs.rightArm.rotation.x = -stride;
  guard.limbs.leftLeg.rotation.x = -stride * 0.7;
  guard.limbs.rightLeg.rotation.x = stride * 0.7;

  const distance = Math.hypot(
    guard.group.position.x - player.position.x,
    guard.group.position.z - player.position.z
  );
  guard.marker.position.set(guard.group.position.x, 0.15, guard.group.position.z);
  guard.marker.rotation.y = guard.group.rotation.y + Math.PI;
  if (echoFrame && echo.snapshot().mode === 'replaying') {
    const echoDistance = Math.hypot(guard.group.position.x - echoFrame.x, guard.group.position.z - echoFrame.z);
    if (echoDistance < 1.05 && hasClearAccess(guard.group.position, echoFrame, colliders, state.stage, 1.05)) {
      echo.shatter('guard');
      echoAvatar.visible = false;
      echoFrame = null;
      updateEchoUi();
      alarm.raise(ALARM_RAISE.echoCaught, 'echo-caught');
      showToast('ECHO SHATTERED // GUARD RESOLVED THE RECORDING');
    }
  }
  if (distance < 1.05 && hasClearAccess(player.position, guard.group.position, colliders, state.stage, 1.05)) finish(false, 'guard');
}

function throwDecoy() {
  if (!canUseDecoy(state)) return;
  if (state.decoyCharges <= 0) {
    showToast('DECOYS RECHARGING // HOLD POSITION');
    return;
  }
  if (throwables.length >= 3) {
    showToast('TOO MANY ACTIVE DECOYS');
    return;
  }
  const { position, velocity } = throwOrigin();
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(THROW.radius, 1),
    new THREE.MeshStandardMaterial({ color: 0x9cefff, emissive: 0x42dbea, emissiveIntensity: 1.4, roughness: 0.25 })
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  scene.add(mesh);
  throwables.push({
    mesh,
    // Plain object rather than Vector3: the integrator carries a `resting`
    // flag on it and is shared with the preview.
    velocity: { x: velocity.x, y: velocity.y, z: velocity.z, resting: false },
    spin: new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6),
    noises: 0,
    age: 0
  });
  hideThrowPreview();
  state.throwCooldown = 0.75;
  state.decoyCharges -= 1;
  if (state.decoyRecharge <= 0) state.decoyRecharge = 6;
}

function toggleDampener() {
  if (!state.running || !state.locked || state.transitioning || state.ended || state.cctvActive) return;
  if (state.cloakActive) {
    setDampener(false, 'DAMPENER OFF // RETURNS RESOLVING');
    return;
  }
  if (!state.hasDampener) {
    showToast('NO DAMPENER FITTED // FIND ONE IN TRAINING');
    return;
  }
  if (state.cloak < CLOAK_MIN_ENGAGE) {
    showToast('CELL TOO LOW // WAIT FOR CHARGE');
    return;
  }
  setDampener(true, 'DAMPENER ON // YOUR RETURNS READ AS NOISE');
}

function setDampener(active, message) {
  if (state.cloakActive === active) return;
  state.cloakActive = active;
  if (!active) state.cloakCooldown = CLOAK_COOLDOWN;
  if (message) showToast(message);
  if (ui.veil) ui.veil.classList.toggle('is-active', active);
  playerLight.color.setHex(active ? 0x9f7bff : 0x7bddff);
  playerLight.intensity = active ? 0.7 : 1.15;
}

function updateDampener(dt, moving, walking) {
  if (state.cloakActive) {
    const drain = !moving ? CLOAK_DRAIN.still
      : state.crouching ? CLOAK_DRAIN.crouch
        : walking ? CLOAK_DRAIN.walk : CLOAK_DRAIN.run;
    state.cloak = Math.max(0, state.cloak - drain * dt);
    if (state.cloak === 0) setDampener(false, 'DAMPENER DROPPED // GET BEHIND SOMETHING');
  } else {
    state.cloakCooldown = Math.max(0, state.cloakCooldown - dt);
    if (state.cloakCooldown === 0) state.cloak = Math.min(CLOAK_MAX, state.cloak + CLOAK_RECHARGE * dt);
  }
  if (!ui.dampener) return;
  if (!state.hasDampener) {
    ui.dampener.textContent = 'NO DAMPENER';
    ui.dampener.classList.remove('active');
    ui.dampener.classList.add('cooldown');
    return;
  }
  const percent = Math.round(state.cloak / CLOAK_MAX * 100);
  ui.dampener.textContent = state.cloakActive
    ? 'DAMPENER ' + percent + '%  ACTIVE'
    : state.cloak >= CLOAK_MAX ? 'DAMPENER READY  F'
      : 'DAMPENER ' + percent + '%' + (state.cloakCooldown > 0 ? '  VENTING' : '  CHARGING');
  ui.dampener.classList.toggle('active', state.cloakActive);
  ui.dampener.classList.toggle('cooldown', !state.cloakActive && state.cloak < CLOAK_MAX);
}

// --- Training ------------------------------------------------------------
// Measurements are gathered here each frame and judged by the pure step tests
// in tutorial.js, so the whole sequence is unit-testable without a renderer.
function updateTutorial(dt, moving, walking, surface) {
  if (state.stage !== TUTORIAL_STAGE || !tutorial) return;

  // `a - b ?? 0` would parse as `(a - b) ?? 0` and yield NaN on the first
  // frame, so seed the previous yaw explicitly.
  if (typeof tutorialRun.lastYaw !== 'number') tutorialRun.lastYaw = state.yaw;
  tutorialRun.lookTravel += Math.abs(state.yaw - tutorialRun.lastYaw);
  tutorialRun.lastYaw = state.yaw;
  // A beat after the gate opens before the marble starts being judged. Without
  // it, a player still holding W from the previous lesson sprints onto the
  // strip and fails before the new prompt has even been read.
  tutorialRun.stepAge += dt;
  if (moving) {
    tutorialRun.walkDistance += Math.hypot(player.velocity.x, player.velocity.z) * dt;
    // Running across the marble strip is the mistake this bay teaches.
    if (surface === 'marble' && !walking && !state.crouching &&
      !tutorialRun.ranOnMarble && tutorialRun.stepAge > MARBLE_GRACE) {
      tutorialRun.ranOnMarble = true;
      showToast('TOO LOUD ON MARBLE // GO BACK AND TRY IT WALKING');
    }
  }
  // Returning to the near side of the marble clears the mistake, so the lesson
  // can be retried without leaving the player stuck past a strip they already
  // spoiled. Judged by position, not surface, so it works wherever they stand.
  if (player.position.z > MARBLE_RESET_Z && tutorialRun.ranOnMarble) {
    tutorialRun.ranOnMarble = false;
    showToast('RESET // WALK OR CROUCH ACROSS');
  }

  if (Math.hypot(player.position.x - TUTORIAL_EXIT.x, player.position.z - TUTORIAL_EXIT.z) < 1.7) {
    tutorialRun.reachedExit = true;
  }

  // The sensor sweeps the last bay. It cannot catch you - it is there to be
  // walked through under the dampener.
  tutorialRun.sensorTimer -= dt;
  if (tutorialRun.sensorTimer <= 0 && tutorialRun.index >= 5) {
    emitRing(SENSOR_ORIGIN.clone(), colours.guard, 13, 'guard');
    tutorialRun.sensorTimer = 3.4;
  }
  tutorial.update(state.playTime, Math.max(0, 1 - tutorialRun.sensorTimer / 3.4));

  const advanced = advanceTutorial(tutorialRun, {
    lookTravel: tutorialRun.lookTravel,
    walkDistance: tutorialRun.walkDistance,
    position: player.position,
    ranOnMarble: tutorialRun.ranOnMarble,
    sonarUsed: tutorialRun.sonarUsed,
    decoyLandedNearTarget: tutorialRun.decoyLandedNearTarget,
    hasDampener: state.hasDampener,
    reachedExit: tutorialRun.reachedExit
  });

  if (advanced) {
    tutorialRun.stepAge = 0;
    if (advanced.step.gate) tutorial.setGateOpen(advanced.step.gate, true);
    playTransitionCue(2);
    if (advanced.finished) {
      tutorialRun.finished = true;
      showToast('TRAINING COMPLETE // YOU ARE READY');
      window.setTimeout(() => { if (state.stage === TUTORIAL_STAGE) finish(true, 'training'); }, 1200);
    } else {
      showToast('LESSON CLEAR // ' + TUTORIAL_STEPS[tutorialRun.index].title);
    }
  }
  renderLesson();
}

function renderLesson() {
  if (!ui.lesson) return;
  const active = state.stage === TUTORIAL_STAGE && !state.ended;
  ui.lesson.classList.toggle('is-hidden', !active);
  if (!active) return;
  const step = TUTORIAL_STEPS[Math.min(tutorialRun.index, TUTORIAL_STEPS.length - 1)];
  ui.lessonStep.textContent = Math.min(tutorialRun.index + 1, TUTORIAL_STEPS.length) +
    ' / ' + TUTORIAL_STEPS.length;
  const spoiled = Boolean(step.retryHint) && tutorialRun.ranOnMarble;
  ui.lessonTitle.textContent = tutorialRun.finished ? 'TRAINING COMPLETE' : step.title;
  ui.lessonHint.textContent = tutorialRun.finished ? 'Head back and start the heist.'
    : spoiled ? step.retryHint : step.hint;
  // The prompt itself carries the retry state, so a player who missed the
  // toast still knows why the gate has not opened.
  ui.lesson.classList.toggle('needs-retry', spoiled);
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

// Thrown objects respect geometry, including height, so a decoy can clear a
// bench but not a wall.
function throwBlockedAt(x, y, z) {
  return colliders.some((box) => {
    if (box.disabled) return false;
    if (box.stage && box.stage !== state.stage) return false;
    if (box.top !== undefined && y > box.top) return false;
    return x + THROW.radius > box.minX && x - THROW.radius < box.maxX &&
      z + THROW.radius > box.minZ && z - THROW.radius < box.maxZ;
  });
}

// Thrown from the hand rather than the bridge of the nose: offset right and
// down from the camera so the arc reads as a throw leaving your hand instead
// of a line projected out of your face.
function throwOrigin() {
  const direction = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyEuler(camera.rotation).normalize();
  const position = camera.position.clone()
    .addScaledVector(direction, 0.45)
    .addScaledVector(right, 0.28)
    .add(new THREE.Vector3(0, -0.22, 0));
  return {
    direction,
    position,
    velocity: direction.clone().multiplyScalar(THROW.speed).add(new THREE.Vector3(0, THROW.lift, 0))
  };
}

const PREVIEW_POINTS = 150;
const PREVIEW_FORWARD = new THREE.Vector3(0, 0, 1);
const PREVIEW_NORMAL = new THREE.Vector3();

function createThrowPreview() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PREVIEW_POINTS * 3), 3));
  // Points rather than a line: a row of beads reads as a thrown trajectory,
  // and it stays legible when the arc is pointing away from the camera.
  const beads = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0x7fe9ff, size: 0.055, transparent: true, opacity: 0.92,
    depthWrite: false, sizeAttenuation: true
  }));
  beads.frustumCulled = false;
  beads.visible = false;
  scene.add(beads);

  const marker = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.36, 28),
    new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.85,
      side: THREE.DoubleSide, depthWrite: false })
  );
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.075, 14),
    new THREE.MeshBasicMaterial({ color: 0xd8f7ff, transparent: true, opacity: 0.95, depthWrite: false })
  );
  // Left unrotated: the marker group is turned to face whatever surface the
  // decoy strikes, so a wall hit shows a disc flat against the wall rather
  // than a horizontal ring floating in mid air.
  marker.add(ring, dot);
  marker.visible = false;
  scene.add(marker);

  // Where it finally stops rolling, shown faintly so the first impact stays
  // the thing the eye goes to.
  const restMarker = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 20),
    new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false })
  );
  restMarker.rotation.x = -Math.PI / 2;
  restMarker.visible = false;
  scene.add(restMarker);

  return { beads, marker, ring, dot, restMarker };
}

function hideThrowPreview() {
  if (!throwPreview) return;
  throwPreview.beads.visible = false;
  throwPreview.marker.visible = false;
  throwPreview.restMarker.visible = false;
}

function updateThrowPreview() {
  if (!throwPreview) return;
  // Only while actually aiming. The arc is a tool for lining up a throw, not
  // permanent furniture in the middle of a dark room.
  const aiming = state.aiming && state.running && state.locked &&
    !state.transitioning && !state.ended && !state.cctvActive && !state.safeActive &&
    state.decoyCharges > 0 && throwables.length < 3;
  if (!aiming) { hideThrowPreview(); return; }

  const { position, velocity } = throwOrigin();
  const { points, impacts, rest } = simulateThrow(position, velocity, throwBlockedAt);
  const first = impacts[0] ?? null;

  // Trim the drawn path at the first impact: beyond that the bounce matters
  // less than knowing precisely where it lands.
  let cut = points.length;
  if (first) {
    for (let i = 0; i < points.length; i += 1) {
      if (Math.abs(points[i].x - first.x) < 1e-6 && Math.abs(points[i].z - first.z) < 1e-6) { cut = i + 1; break; }
    }
  }
  // Skip the first stretch: beads right at the hand sit a few centimetres from
  // the camera and bloom into big squares without telling the player anything.
  let begin = 0;
  while (begin < cut - 1 && Math.hypot(points[begin].x - position.x,
    points[begin].y - position.y, points[begin].z - position.z) < 0.9) begin += 1;
  const span = Math.max(1, cut - begin);
  const stride = Math.max(1, Math.ceil(span / PREVIEW_POINTS));
  const attribute = throwPreview.beads.geometry.getAttribute('position');
  let count = 0;
  for (let i = begin; i < cut && count < PREVIEW_POINTS; i += stride, count += 1) {
    attribute.setXYZ(count, points[i].x, points[i].y, points[i].z);
  }
  attribute.needsUpdate = true;
  throwPreview.beads.geometry.setDrawRange(0, count);
  throwPreview.beads.visible = count > 1;

  const wall = first && first.type === 'wall';
  const colour = wall ? 0xffa43b : 0x7fe9ff;
  throwPreview.beads.material.color.setHex(colour);
  throwPreview.ring.material.color.setHex(colour);
  throwPreview.dot.material.color.setHex(colour);
  throwPreview.restMarker.material.color.setHex(colour);

  if (first) {
    // Mark the first contact, on the surface it actually hits.
    const onWall = first.type === 'wall';
    if (onWall) {
      // Face back along the incoming path, flattened, so the disc sits against
      // the wall and stays readable from where the throw came from.
      const prior = points[Math.max(0, cut - 2)];
      PREVIEW_NORMAL.set(prior.x - first.x, 0, prior.z - first.z);
      if (PREVIEW_NORMAL.lengthSq() < 1e-6) PREVIEW_NORMAL.set(0, 0, 1);
      PREVIEW_NORMAL.normalize();
      throwPreview.marker.position.set(
        first.x + PREVIEW_NORMAL.x * 0.03, first.y, first.z + PREVIEW_NORMAL.z * 0.03);
    } else {
      PREVIEW_NORMAL.set(0, 1, 0);
      throwPreview.marker.position.set(first.x, 0.03, first.z);
    }
    throwPreview.marker.quaternion.setFromUnitVectors(PREVIEW_FORWARD, PREVIEW_NORMAL);
    throwPreview.marker.scale.setScalar(1 + Math.sin(state.playTime * 6) * 0.07);
    throwPreview.marker.visible = true;
  } else {
    throwPreview.marker.visible = false;
  }

  const rolled = first && Math.hypot(rest.x - first.x, rest.z - first.z) > 0.6;
  if (rolled) {
    throwPreview.restMarker.position.set(rest.x, 0.03, rest.z);
    throwPreview.restMarker.visible = true;
  } else {
    throwPreview.restMarker.visible = false;
  }
}

// Three noises per decoy at most: the landing, then the bounces trailing off.
const MAX_DECOY_NOISES = 3;

function updateThrowables(dt) {
  for (let i = throwables.length - 1; i >= 0; i -= 1) {
    const item = throwables[i];
    item.age += dt;
    if (!item.velocity.resting) {
      const impact = advanceThrow(item.mesh.position, item.velocity, dt, throwBlockedAt);
      // Tumbling while airborne, settling as it slows.
      const speed = Math.hypot(item.velocity.x, item.velocity.y, item.velocity.z);
      item.mesh.rotation.x += item.spin.x * dt * Math.min(1, speed / 4);
      item.mesh.rotation.y += item.spin.y * dt * Math.min(1, speed / 4);
      item.mesh.rotation.z += item.spin.z * dt * Math.min(1, speed / 4);
      if (impact && item.noises < MAX_DECOY_NOISES && impact.speed > 0.9) {
        item.noises += 1;
        emitRing(new THREE.Vector3(impact.x, 0.12, impact.z),
          colours.player, impactRadius(impact.speed), 'decoy');
      }
      // Training: any contact inside the marked ring clears that lesson.
      if (impact && state.stage === TUTORIAL_STAGE &&
        Math.hypot(impact.x - DECOY_TARGET.x, impact.z - DECOY_TARGET.z) < 2) {
        tutorialRun.decoyLandedNearTarget = true;
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
  if (!state.running || !state.locked || state.transitioning || state.pingCooldown > 0 || state.cctvActive) return;
  state.pingCooldown = 2.6;
  campaign.sonarUses += 1;
  tutorialRun.sonarUsed += 1;
  const radius = state.stage === 3 ? 22 : state.stage === 2 ? 10 : 16;
  // A full pulse is the most expensive thing the rig does. Under the dampener
  // it is free of consequence but it empties the cell fast, so the choice is
  // between covering ground and learning the room.
  const damped = state.cloakActive;
  if (damped) {
    state.cloak = Math.max(0, state.cloak - CLOAK_PING_COST);
    if (state.cloak === 0) setDampener(false, 'DAMPENER DROPPED // GET BEHIND SOMETHING');
  }
  emitRing(new THREE.Vector3(player.position.x, 0.18, player.position.z), colours.player, radius, 'sonar', damped);
  document.body.classList.remove('sonar-flash');
  void document.body.offsetWidth;
  document.body.classList.add('sonar-flash');
  window.setTimeout(() => document.body.classList.remove('sonar-flash'), 450);
  showToast(damped ? 'ACTIVE SONAR // DAMPED, CELL DRAINING' : 'ACTIVE SONAR // HOSTILES CAN TRACE IT');
}

function tryJump() {
  if (!state.running || !state.locked || state.transitioning || state.ended || state.cctvActive) return false;
  if (state.stage === 1 || state.stage === TUTORIAL_STAGE || state.jumpOffset > 0 || state.crawling || state.crouching) return false;
  state.verticalVelocity = 5.4;
  state.jumpOffset = 0.01;
  events.emit('player:jump', { stage: state.stage, position: player.position.clone() });
  return true;
}

function cycleCctvFeed() {
  if (!state.running || state.stage !== 1 || state.transitioning || state.ended) return;
  if (state.cctvActive) {
    exitCctvFeed();
    return;
  }
  state.cctvActive = true;
  state.cctvIndex = 0;
  state.aiming = false;
  hideThrowPreview();
  document.body.classList.add('cctv-mode');
  ui.cctvFilter.classList.remove('is-hidden');
  ui.minimap.classList.add('is-hidden');
}

function exitCctvFeed() {
  if (!state.cctvActive) return false;
  state.cctvActive = false;
  document.body.classList.remove('cctv-mode');
  ui.cctvFilter.classList.add('is-hidden');
  ui.minimap.classList.remove('is-hidden');
  ui.interaction.classList.add('is-hidden');
  showToast('SECURITY CONSOLE CLOSED');
  return true;
}

function selectCctvFeed(index) {
  if (!state.cctvActive || index < 0 || index >= cctv.cameras.length) return false;
  state.cctvIndex = index;
  return true;
}

function loopCctvFeed() {
  if (!state.cctvActive) return false;
  const selected = cctv.cameras[state.cctvIndex];
  if (!cctv.loop(selected.id)) return false;
  showToast(selected.id + ' // FEED LOOPED FOR 8 SECONDS');
  return true;
}

function updateCctv(dt) {
  if (state.stage !== 1) return;
  const detections = dt > 0 ? cctv.update(dt, player.position, {
    clear: (securityCamera) => hasClearAccess(securityCamera, player.position, colliders, 1, securityCamera.range)
  }) : [];
  for (const id of detections) {
    alarm.raise(ALARM_RAISE.camera, 'camera');
    showToast(id + ' SPOTTED MOVEMENT // ALARM RISING');
  }
  for (const securityCamera of cctv.cameras) {
    if (securityCamera.lens) securityCamera.lens.material.color.setHex(securityCamera.loopRemaining > 0 ? 0x72efff : 0xff315a);
  }
  if (!state.cctvActive) return;
  ui.cctvCells.forEach((cell, index) => {
    const securityCamera = cctv.cameras[index];
    cell.classList.toggle('selected', index === state.cctvIndex);
    cell.classList.toggle('looped', securityCamera.loopRemaining > 0);
    const status = cell.querySelector('b');
    status.textContent = securityCamera.loopRemaining > 0
      ? 'LOOP ' + securityCamera.loopRemaining.toFixed(1) + 's'
      : 'LIVE';
  });
  ui.interaction.classList.add('is-hidden');
}

function updateSafeUi(noise = 0) {
  const snapshot = safecrack.snapshot();
  const feedback = safecrack.feedback();
  ui.safeNumber.textContent = Math.round(snapshot.dial).toString().padStart(2, '0');
  ui.safeDial.style.transform = 'rotate(' + snapshot.dial * 3.6 + 'deg)';
  ui.safeNumber.style.transform = 'rotate(' + snapshot.dial * -3.6 + 'deg)';
  ui.safeSignal.style.opacity = String(0.22 + feedback.strength * 0.78);
  ui.safeSignal.style.filter = 'drop-shadow(0 0 ' + (4 + feedback.strength * 20) + 'px #72efff)';
  ui.safeProgress.textContent = 'TUMBLER ' + Math.min(snapshot.tumbler + 1, snapshot.total) + ' / ' + snapshot.total;
  ui.safeHint.textContent = feedback.strength > 0.82
    ? 'STRONG RESONANCE // PRESS E TO SET'
    : 'MOVE MOUSE LEFT / RIGHT SLOWLY · PRESS E TO SET · ESC TO CANCEL';
  ui.safe.classList.toggle('hot', noise > 0.35);
}

function beginSafecrack(exhibit) {
  state.safeActive = true;
  state.safeCase = exhibit;
  state.safeNoiseCooldown = 0;
  safecrack.reset();
  ui.safe.classList.remove('is-hidden', 'set', 'hot');
  ui.signature.classList.add('is-hidden');
  ui.interaction.classList.add('is-hidden');
  player.velocity.set(0, 0, 0);
  updateSafeUi();
  showToast('SIGNATURE MATCH // MECHANICAL LOCK ENGAGED', 3);
}

function cancelSafecrack(message = 'SAFECRACK CANCELLED') {
  if (!state.safeActive) return false;
  state.safeActive = false;
  state.safeCase = null;
  safecrack.reset();
  ui.safe.classList.add('is-hidden');
  ui.safe.classList.remove('set', 'hot');
  ui.signature.classList.toggle('is-hidden', state.stage !== 2);
  showToast(message);
  return true;
}

function secureVaultTarget(exhibit) {
  if (!vaultMission.acquire(exhibit)) return;
  state.safeActive = false;
  state.safeCase = null;
  ui.safe.classList.add('is-hidden');
  state.carrying = state.hasDiamond = true;
  events.emit('item:picked', { id: STORY.targetShort, stage: state.stage });
  artifact.position.copy(exhibit.position);
  artifact.scale.setScalar(0.6);
  artifact.visible = artifactGlow.visible = true;
  ui.objective.textContent = STORY.stages[3].objective;
  showToast(STORY.target + ' RECOVERED // CONTAINMENT ACTIVE');
  emitRing(exhibit.position, colours.artefact, 20, 'player');
  completeStage();
}

function setSafeTumbler() {
  if (!state.safeActive) return false;
  const result = safecrack.setTumbler();
  if (!result.success) {
    alarm.raise(4, 'safe-miss');
    showToast('FALSE GATE // RESET YOUR POSITION');
    return true;
  }
  ui.safe.classList.remove('set');
  void ui.safe.offsetWidth;
  ui.safe.classList.add('set');
  updateSafeUi();
  if (result.opened) secureVaultTarget(state.safeCase);
  else showToast('TUMBLER ' + (result.tumbler + 1) + ' SET // WINDOW TIGHTENING');
  return true;
}

function echoSnapshot() {
  return {
    x: player.position.x,
    y: state.jumpOffset,
    z: player.position.z,
    yaw: state.yaw,
    pitch: state.pitch,
    crouching: state.crouching,
    interacting: Boolean(keys.KeyE)
  };
}

function beginEchoReplay(rewind) {
  if (!rewind) return;
  player.position.set(rewind.x, 0, rewind.z);
  player.velocity.set(0, 0, 0);
  state.yaw = rewind.yaw;
  state.pitch = rewind.pitch;
  state.jumpOffset = rewind.y ?? 0;
  state.verticalVelocity = 0;
  echoFrame = { ...rewind, done: false };
  echoPrevious = { ...echoFrame };
  echoStepTimer = 0;
  // Player and Echo begin in exactly the same place. Keep the placeholder
  // hidden until they separate so the first-person camera is never inside it.
  echoAvatar.visible = false;
  echoAvatar.position.set(echoFrame.x, echoFrame.y ?? 0, echoFrame.z);
  echoAvatar.rotation.y = echoFrame.yaw;
  updateEchoUi();
  showToast('REWOUND TO START // ECHO IS NOW REPEATING YOUR PATH', 3.6);
}

function updateEchoUi() {
  if (!ui.echo) return;
  const snapshot = echo.snapshot();
  ui.echo.classList.toggle('recording', snapshot.mode === 'recording');
  ui.echo.classList.toggle('replaying', snapshot.mode === 'replaying');
  let progress = 0;
  if (snapshot.mode === 'recording') {
    progress = snapshot.elapsed / 20;
    ui.echoStep.textContent = 'STEP 1 · RECORDING PATH';
    ui.echoTime.textContent = snapshot.elapsed.toFixed(1) + ' / 20.0s';
    ui.echoAction.textContent = 'Q · FINISH & REWIND';
    ui.echoHelp.textContent = 'Finish on the first plate. You will return to your starting point.';
  } else if (snapshot.mode === 'replaying') {
    progress = snapshot.duration > 0 ? snapshot.playbackTime / snapshot.duration : 0;
    ui.echoStep.textContent = 'STEP 2 · ECHO REPLAYING';
    ui.echoTime.textContent = snapshot.playbackTime.toFixed(1) + ' / ' + snapshot.duration.toFixed(1) + 's';
    ui.echoAction.textContent = 'MOVE TO THE OTHER PLATE';
    ui.echoHelp.textContent = 'Echo repeats the recorded path while you move independently.';
  } else if (snapshot.mode === 'shattered') {
    ui.echoStep.textContent = 'ECHO · DISRUPTED';
    ui.echoTime.textContent = 'GUARD CONTACT';
    ui.echoAction.textContent = 'Q · RECORD AGAIN';
    ui.echoHelp.textContent = 'Keep the replay away from guards or use a shorter route.';
  } else if (snapshot.mode === 'complete') {
    progress = 1;
    ui.echoStep.textContent = 'ECHO · PATH COMPLETE';
    ui.echoTime.textContent = snapshot.duration.toFixed(1) + 's';
    ui.echoAction.textContent = 'Q · RECORD AGAIN';
    ui.echoHelp.textContent = 'The replay finished. Record another route if the plates are not active.';
  } else {
    ui.echoStep.textContent = 'ECHO · READY';
    ui.echoTime.textContent = '20.0s MAX';
    ui.echoAction.textContent = 'Q · START RECORDING';
    ui.echoHelp.textContent = 'Record a path to one plate. Press Q again to rewind and replay it.';
  }
  ui.echoFill.style.width = Math.max(0, Math.min(100, progress * 100)) + '%';
}

function toggleEcho() {
  if (!state.running || state.stage !== 3 || state.transitioning || state.ended) return;
  const snapshot = echo.snapshot();
  if (snapshot.mode === 'recording') {
    beginEchoReplay(echo.stop());
    return;
  }
  echo.reset();
  echoFrame = echoPrevious = null;
  echoAvatar.visible = false;
  echo.start(echoSnapshot());
  updateEchoUi();
  showToast('RECORDING STARTED // WALK TO A SYNC PLATE, THEN PRESS Q', 3.6);
}

function updateEcho(dt) {
  const before = echo.snapshot().mode;
  if (before === 'recording') {
    echo.record(dt, echoSnapshot());
    if (echo.snapshot().mode === 'replaying') beginEchoReplay(echo.rewindFrame);
  }
  if (echo.snapshot().mode !== 'replaying') return;
  const frame = echo.replay(dt);
  if (!frame) return;
  echoFrame = frame;
  echoAvatar.position.set(frame.x, frame.y ?? 0, frame.z);
  echoAvatar.rotation.y = frame.yaw;
  echoAvatar.visible = Math.hypot(frame.x - player.position.x, frame.z - player.position.z) > 0.8;
  echoAvatar.children.at(-1).rotation.z += dt * 2.2;
  const moved = echoPrevious && Math.hypot(frame.x - echoPrevious.x, frame.z - echoPrevious.z) > 0.025;
  echoStepTimer -= dt;
  if (moved && echoStepTimer <= 0 && !frame.done) {
    emitRing(new THREE.Vector3(frame.x, 0.12, frame.z), colours.player, frame.crouching ? 2.8 : 6.2, 'echo');
    echoStepTimer = frame.crouching ? 1.2 : 0.58;
  }
  echoPrevious = { ...frame };
  if (frame.done) {
    echoAvatar.visible = false;
    echoFrame = null;
    updateEchoUi();
    showToast('ECHO PATH COMPLETE // PRESS Q TO RECORD ANOTHER');
  }
}

function updateEchoPlates() {
  if (state.stage !== 3) return;
  const actors = [{ id: 'PLAYER', position: player.position }];
  if (echoFrame && echo.snapshot().mode === 'replaying' && !echoFrame.done) {
    actors.push({ id: 'ECHO', position: echoFrame });
  }
  echoPlates.update(actors);
  for (const plate of echoPlates.plates) {
    const visual = echoPlateMeshes.get(plate.id);
    if (!visual) continue;
    visual.ring.material.color.setHex(plate.active ? 0x76ffb2 : 0xff315a);
    visual.ring.material.opacity = plate.active ? 0.95 : 0.55;
    visual.ring.scale.setScalar(plate.active ? 1.08 : 1);
  }
  if (!echoPlates.allActive() || !escapeMission.openDoor(1)) return;
  events.emit('door:opened', { id: 1, source: 'echo-plates' });
  const navigator = createNavigator(colliders, 3);
  for (const guard of guards) {
    guard.navigator = navigator;
    guard.goalKey = null;
    guard.route = [];
    guard.routeIndex = guard.replanIn = 0;
  }
  ui.objective.textContent = 'Sync complete — cross Door 01 and override Door 02';
  showToast('ECHO SYNC CONFIRMED // DOOR 01 OPENED SILENTLY', 3.4);
  emitRing(new THREE.Vector3(0, 0.12, 8), colours.player, 9, 'echo-sync');
}

function canInteractWith(target) {
  return state.running && state.locked && !state.ended && !state.transitioning &&
    hasClearAccess(player.position, target, colliders, state.stage);
}

function interactionPrompt() {
  if (state.stage === TUTORIAL_STAGE) {
    if (!state.hasDampener && canInteractWith(DAMPENER_PICKUP)) return '[ E ] FIT THE DAMPENER';
    return '';
  }
  const optional = pickups.nearby(player.position, state.stage);
  if (optional) return '[ E ] ' + (optional.type === 'evidence' ? 'RECOVER ' : 'TAKE ') + optional.label;
  if (state.stage === 3) {
    const door = escapeMission.eligible(player.position, state.yaw, state.pitch);
    return door ? '[ HOLD E ] OVERRIDE DOOR 0' + door.id + ' — NOISE ATTRACTS GUARDS' : '';
  }
  if (state.stage === 1) {
    if (canInteractWith(galleriesMission.entrancePosition)) {
      return state.hasKey ? '[ E ] UNLOCK VAULT' : '[ E ] VAULT LOCKED — PICKPOCKET THE PATROL GUARD';
    }
  } else if (state.stage === 2 && !state.carrying) {
    const exhibit = nearbyVaultCase();
    if (exhibit) return '[ E ] TRY CASE ' + exhibit.id + ' // ' +
      (exhibit.scanned ? SIGNATURES[exhibit.signature].glyph + ' ' + SIGNATURES[exhibit.signature].name : 'UNSCANNED — USE SONAR');
  } else if (!state.carrying && canInteractWith(artifact.position)) {
    return '[ E ] TAKE H-1968-07';
  }
  return '';
}

function nearbyVaultCase() {
  return vaultMission.cases.find((exhibit) => canInteractWith(exhibit.access));
}

function updatePickpocket(dt) {
  if (state.stage !== 1 || state.hasKey || !state.running || state.transitioning) return;
  const target = guards.find((candidate) => candidate.active);
  if (!target) return;
  const clear = hasClearAccess(player.position, target.group.position, colliders, 1, 1.55);
  const result = pickpocket.update({
    dt,
    holding: Boolean(keys.KeyE),
    player: player.position,
    guard: { id: target.id, position: target.group.position, yaw: target.group.rotation.y, state: target.state },
    clear
  });
  if (result.eligible) {
    const percent = Math.round(result.progress / PICKPOCKET_SECONDS * 100);
    ui.interaction.textContent = keys.KeyE ? '[ HOLD E ] LIFT KEYCARD // ' + percent + '%' : '[ HOLD E ] LIFT KEYCARD';
    ui.interaction.classList.remove('is-hidden');
  }
  if (!result.completed) return;
  state.hasKey = true;
  target.keycard.visible = false;
  galleriesMission.setStage(1, true);
  events.emit('item:picked', { id: 'security-key', stage: state.stage, from: target.id });
  ui.objective.textContent = 'Use the stolen keycard at the north vault entrance';
  showToast('KEYCARD LIFTED // STORED SIGNATURE: ' + SIGNATURES[vaultMission.keySignature].name);
}

function interact() {
  if (state.stage === TUTORIAL_STAGE) {
    if (!state.hasDampener && canInteractWith(DAMPENER_PICKUP)) {
      state.hasDampener = true;
      state.cloak = CLOAK_MAX;
      tutorial.setDampenerTaken(true);
      showToast('DAMPENER FITTED // PRESS F TO RUN IT');
      events.emit('item:picked', { id: 'dampener', stage: state.stage });
      emitRing(DAMPENER_PICKUP.clone(), colours.player, 6, 'player');
    }
    return;
  }
  const optional = pickups.nearby(player.position, state.stage);
  if (optional) {
    const collected = pickups.collect(optional.id);
    pickupMeshes.get(optional.id).visible = false;
    const summary = pickups.snapshot();
    showToast(collected.type === 'evidence'
      ? collected.label + ' // EVIDENCE ' + summary.evidence.length + ' OF 3'
      : collected.label + ' // TAKE $' + summary.cash);
    return;
  }
  if (state.stage === 3) return;
  if (state.stage === 1) {
    if (canInteractWith(galleriesMission.entrancePosition)) {
      if (state.hasKey) completeStage();
      else showToast('VAULT LOCKED // LIFT THE KEYCARD FROM THE PATROL GUARD');
    }
    return;
  }
  if (state.stage === 2) {
    const exhibit = nearbyVaultCase();
    if (!exhibit) return;
    const result = vaultMission.inspect(exhibit, state.hasKey);
    if (result === 'scan-first') showToast('SCAN THIS CASE WITH SONAR BEFORE USING THE KEY');
    if (result === 'no-key') showToast('SECURITY KEY REQUIRED');
    if (result === 'wrong') {
      emitRing(exhibit.position, colours.alert, 12, 'decoy');
      showToast('SIGNATURE MISMATCH // LOCAL ALERT — TRY ANOTHER CASE');
    }
    if (result === 'safe-ready') beginSafecrack(exhibit);
    return;
  }
  if (!state.carrying && canInteractWith(artifact.position)) {
    state.carrying = true;
    ui.objective.textContent = 'Return to the extraction signal';
    showToast('H-1968-07 SECURED — CONTAINMENT TRIGGERED');
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
  // Later levels start with the key, including explicit practice jumps.
  // Only the two real levels after Galleries start holding the key. Stage 4
  // is training and must not inherit campaign inventory.
  state.hasKey = stage === 2 || stage === 3;
  state.hasDiamond = stage === 3;
  state.carrying = stage === 3;
  state.exposure = 0;
  state.jumpOffset = 0;
  state.verticalVelocity = 0;
  alarm.reset(stage === 3 ? 55 : 0, 'stage-start');
  if (stage === 3) alarm.setFloor(55, 'containment-floor');
  const initialAlarm = alarm.snapshot();
  ui.guard.textContent = initialAlarm.level.label + ' ' + Math.round(initialAlarm.value) + '%';
  ui.guard.style.setProperty('--alarm-level', initialAlarm.value + '%');
  ui.guard.classList.toggle('alert', initialAlarm.level.id === 'alert' || initialAlarm.level.id === 'lockdown');
  pickpocket.reset(state.hasKey);
  sprintStamina.reset();
  cctv.reset();
  state.cctvActive = false;
  state.cctvIndex = -1;
  document.body.classList.remove('cctv-mode');
  ui.cctvFilter.classList.add('is-hidden');
  state.safeActive = false;
  state.safeCase = null;
  state.safeNoiseCooldown = 0;
  safecrack.reset();
  ui.safe.classList.add('is-hidden');
  echo.reset();
  echoFrame = echoPrevious = null;
  echoPlates.reset();
  if (echoAvatar) echoAvatar.visible = false;
  // The dampener is always available in the real levels, so a marker who
  // skips training still has a complete game. Training is the only place you
  // have to earn it.
  const training = stage === TUTORIAL_STAGE;
  state.hasDampener = !training;
  if (training) resetTutorialRun();
  if (tutorial) {
    tutorial.setVisible(training);
    if (training) tutorial.reset();
  }
  gallery.visible = stage === 1;
  setDampener(false);
  state.cloak = CLOAK_MAX;
  state.cloakCooldown = 0;
  for (const key of Object.keys(keys)) keys[key] = false;
  state.ended = false;
  const config = stages.setStage(stage);
  document.body.dataset.stage = String(stage);
  gallery.visible = stage === 1;
  galleriesMission.setStage(stage, state.hasKey);
  if (stage === 2 && announce) vaultMission.newHeist();
  vaultMission.reset(stage);
  escapeMission.reset(stage);
  ui.override.classList.add('is-hidden');
  ui.exposure.classList.toggle('is-hidden', stage !== 3);
  ui.echo.classList.toggle('is-hidden', stage !== 3);
  updateEchoUi();
  ui.signature.textContent = vaultMission.readout();
  ui.signature.classList.toggle('is-hidden', stage !== 2);
  ui.sonar.textContent = 'SONAR READY  ' + (stage === 1 || stage === TUTORIAL_STAGE ? 'SPACE' : 'G');
  setAmbienceForStage(stage);
  const spawn = config.spawn ?? new THREE.Vector3(0, 0, 18);
  player.position.copy(spawn);
  player.velocity.set(0, 0, 0);
  camera.position.set(spawn.x, 1.68, spawn.z);
  checkpoints.save('stage-' + stage + '-entry', {
    stage,
    player: { x: spawn.x, y: spawn.y, z: spawn.z },
    inventory: { hasKey: state.hasKey, hasDiamond: state.hasDiamond, carrying: state.carrying }
  });
  state.yaw = 0;
  state.pitch = 0;
  artifact.position.copy(config.artifact);
  artifact.scale.setScalar(stage === 3 ? 0.2 : 1);
  artifact.visible = stage === 3;
  artifactPlinth.visible = false;
  artifactCase.visible = false;
  artifactGlow.visible = stage === 3;
  for (const item of pickups.items) {
    const mesh = pickupMeshes.get(item.id);
    if (mesh) mesh.visible = item.stage === stage && !item.collected;
  }
  for (const visual of echoPlateMeshes.values()) {
    visual.group.visible = stage === 3;
    visual.label.visible = stage === 3;
    visual.ring.material.color.setHex(0xff315a);
    visual.ring.material.opacity = 0.55;
    visual.ring.scale.setScalar(1);
  }
  extraction.visible = stage === 3;
  extractionPortal.visible = stage === 3;
  extractionMarker.visible = stage === 3;
  extraction.position.set(ESCAPE_EXIT.x, 0.035, ESCAPE_EXIT.z);
  extractionPortal.position.set(ESCAPE_EXIT.x, 0, ESCAPE_EXIT.z);
  extractionMarker.position.set(ESCAPE_EXIT.x, 0.11, ESCAPE_EXIT.z);
  artifactPlinth.position.set(config.artifact.x, 0.575, config.artifact.z);
  artifactCase.position.set(config.artifact.x, 1.7, config.artifact.z);
  artifactGlow.position.copy(artifact.position);
  artifactMarker.position.set(config.artifact.x, 0.14, config.artifact.z);
  const guardConfigs = config.guards ?? [{ position: config.guard, speed: config.guardSpeed, waypoints: config.waypoints }];
  // Level 1 now has real rooms, so its patrol needs the same pathfinding the
  // later levels use. Direct movement walked through the new walls.
  const navigator = createNavigator(colliders, stage);
  guards.forEach((guard, index) => {
    const settings = guardConfigs[index];
    guard.active = Boolean(settings);
    guard.group.visible = guard.marker.visible = guard.active;
    guard.keycard.visible = stage === 1 && !state.hasKey && index === 0;
    guard.state = 'patrol';
    guard.waypoint = 0;
    guard.soundTimer = 0.65 + index * 1.2;
    guard.suspicion = guard.searchTimer = guard.decoyFocus = 0;
    guard.target.set(0, 0, 0);
    guard.lastSeen.set(0, 0, 0);
    guard.navigator = navigator;
    guard.route = [];
    guard.routeIndex = 0;
    guard.goalKey = null;
    guard.replanIn = 0;
    if (!settings) return;
    guard.group.position.copy(settings.position);
    guard.marker.position.set(settings.position.x, 0.15, settings.position.z);
    guard.group.rotation.y = 0;
    guard.waypoints = settings.waypoints.map((point) => point.clone());
    guard.speed = settings.speed;
  });
  extraction.material.color.setHex(config.accent);
  rings.forEach(disposeRing);
  rings.length = 0;
  clearThrowables();
  ui.stageLabel.textContent = config.act ? config.act + ' / ' + config.name : config.name;
  ui.objective.textContent = stage === 3
    ? 'Record Echo on one sync plate, stand on the other, then breach Door 02'
    : config.objective;
  ui.progressSteps.forEach((step, index) => {
    step.classList.toggle('active', index === stage - 1);
    step.classList.toggle('complete', index < stage - 1);
  });
  ui.minimap.classList.remove('is-hidden');
  ui.minimap.classList.remove('is-jammed');
  ui.mapStatus.textContent = 'LOCAL';
  ui.transition.classList.add('is-hidden');
  state.transitioning = false;
  // Lockdown starts silently; the carried reel does not emit a spawn wave.
  if (stage !== 3) emitRing(new THREE.Vector3(spawn.x, 0.12, spawn.z), colours.player, 11, 'briefing');
  if (announce) showToast('PRACTICE JUMP // LEVEL 0' + stage + ' // ' + config.name);
}

function completeStage() {
  if (state.transitioning || state.ended || !state.running) return;
  if (state.stage === 1 && (!state.hasKey || !canInteractWith(galleriesMission.entrancePosition))) return;
  if (state.stage === 2 && (!vaultMission.acquired || !state.hasDiamond)) return;
  if (state.stage === 3) {
    if (!escapeMission.canEscape(player.position, state.hasDiamond)) return;
    if (campaign.stagesCleared === 2) campaign.stagesCleared = 3;
    events.emit('level:complete', { stage: 3, nextStage: null, campaign: { ...campaign } });
    finish(true);
    return;
  }

  const completed = state.stage;
  const nextStage = completed + 1;
  events.emit('level:complete', { stage: completed, nextStage, campaign: { ...campaign } });
  // Only an in-order clear advances the campaign.
  if (completed === campaign.stagesCleared + 1) campaign.stagesCleared = completed;
  const nextConfig = stages.configurations[nextStage];
  state.transitioning = true;
  player.velocity.set(0, 0, 0);
  ui.interaction.classList.add('is-hidden');
  ui.transitionKicker.textContent = stages.configurations[completed].clearKicker;
  ui.transitionTitle.textContent = nextConfig.name;
  ui.transitionCopy.textContent = nextConfig.intro;
  ui.transition.classList.remove('is-hidden');
  playTransitionCue(nextStage);
  emitRing(completed === 1 ? galleriesMission.entrancePosition : artifact.position, colours.artefact, 20, 'player');

  window.setTimeout(() => {
    if (state.ended) return;
    setStagePreview(nextStage, false);
    showToast('LEVEL 0' + nextStage + ' // ' + nextConfig.name);
  }, 2100);
}

function resetGame(startStage = 1, newHeist = false) {
  if (newHeist) {
    vaultMission.newHeist();
    checkpoints.clear();
    pickups.reset();
  }
  state.running = true;
  state.ended = false;
  state.won = false;
  state.transitioning = false;
  state.startTime = performance.now();
  state.elapsed = 0;
  state.playTime = 0;
  state.ringCount = 0;
  state.alerts = 0;
  state.footstepTimer = 0;
  state.throwCooldown = 0;
  state.decoyCharges = 3;
  state.decoyRecharge = 0;
  state.cloak = CLOAK_MAX;
  state.cloakCooldown = 0;
  setDampener(false);
  state.pingCooldown = 0;
  state.mapReveal = 0;
  state.hazardCooldown = 0;
  state.jumpOffset = 0;
  state.verticalVelocity = 0;
  for (const key of Object.keys(keys)) keys[key] = false;
  setStagePreview(startStage, false);
  ui.result.classList.add('is-hidden');
  ui.hud.classList.remove('is-hidden');
  ui.reticle.classList.remove('is-hidden');
  ui.minimap.classList.remove('is-hidden');
  ui.minimap.classList.remove('is-jammed');
  ui.sonar.classList.remove('is-hidden');
  ui.decoy.classList.remove('is-hidden');
  if (ui.dampener) ui.dampener.classList.remove('is-hidden');
  ui.transition.classList.add('is-hidden');
  ui.creditsButton.classList.add('is-hidden');
}
// Retry the level you lost. Campaign totals carry over, and the attempt is
// counted, so the run stays honest about how many tries it took.
function retryGame() {
  if (state.stage === TUTORIAL_STAGE) { startTraining(); return; }
  if (state.won) { restartHeist(); return; }
  campaign.retries += 1;
  resetGame(state.stage, false);
  canvas.requestPointerLock();
}

// Start the whole job again: level one, a fresh puzzle, totals cleared and a
// clean campaign record.
function restartHeist() {
  resetCampaign();
  resetGame(1, true);
  showToast(STORY.opening, 5.5);
  canvas.requestPointerLock();
}

// Practice jumps are deliberately allowed, but they permanently mark the run
// so it cannot be presented as a completed campaign.
function practiceJump(stage) {
  taintCampaign('PRACTICE JUMP // RUN NO LONGER COUNTS AS A CAMPAIGN');
  setStagePreview(stage);
}
function startTraining() {
  ui.start.classList.add('is-hidden');
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  startAmbience();
  resetCampaign();
  // Training is never a campaign run.
  campaign.valid = false;
  updatePracticeFlag();
  resetGame(TUTORIAL_STAGE, false);
  canvas.requestPointerLock();
}

function startGame() {
  ui.start.classList.add('is-hidden');
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  startAmbience();
  resetCampaign();
  resetGame(1, true);
  canvas.requestPointerLock();
}

function finish(won, reason = 'guard') {
  if (state.ended) return;
  state.ended = true;
  state.won = won;
  state.transitioning = false;
  state.running = false;
  document.body.classList.remove('cctv-mode');
  ui.transition.classList.add('is-hidden');
  if (ambience && audioContext) ambience.master.gain.setTargetAtTime(0.0025, audioContext.currentTime, 0.7);
  ui.signature.classList.add('is-hidden');
  ui.exposure.classList.add('is-hidden');
  ui.echo.classList.add('is-hidden');
  ui.override.classList.add('is-hidden');
  escapeMission.cancel();
  ui.interaction.classList.add('is-hidden');
  if (document.pointerLockElement) document.exitPointerLock();
  ui.hud.classList.add('is-hidden');
  ui.reticle.classList.add('is-hidden');
  ui.minimap.classList.add('is-hidden');
  ui.sonar.classList.add('is-hidden');
  ui.decoy.classList.add('is-hidden');
  if (ui.dampener) ui.dampener.classList.add('is-hidden');
  if (ui.surface) ui.surface.classList.add('is-hidden');
  state.aiming = false;
  hideThrowPreview();
  if (ui.lesson) ui.lesson.classList.add('is-hidden');
  const wasTraining = reason === 'training' || state.stage === TUTORIAL_STAGE;
  ui.resultKicker.textContent = wasTraining ? 'TRAINING COMPLETE'
    : won ? 'MISSION COMPLETE' : 'SIGNAL INTERCEPTED';
  ui.restartButton.querySelector('span').textContent = wasTraining ? 'TRAIN AGAIN'
    : won ? 'RUN AGAIN' : 'RETRY LEVEL ' + state.stage;
  ui.resultTitle.textContent = wasTraining ? 'RIG READY.' : won ? 'YOU WON!' : 'YOU WERE HEARD.';
  ui.resultCopy.textContent = wasTraining
    ? 'You can read a room by ear, throw a noise where you need it, and disappear from every rig in the building. Start the heist when you are ready.'
    : won
    ? STORY.outro
    : reason === 'lockdown'
      ? 'The alarm reached lockdown. Use cover to let suspicion fall before crossing another sensor.'
      : reason === 'laser'
        ? 'The moving laser grid crossed your body. Watch the emitters, wait for an opening, and crouch beneath high beams.'
        : reason === 'trap'
          ? 'A pressure plate armed beneath your feet. Read the floor markings and route around the glowing trap panels.'
          : 'The guard followed the wavefront back to its source. Move quieter—or send the sound somewhere else.';
  // Campaign totals, not per-attempt: active play time, how often the player
  // gave their position away with an active pulse, and how many times a guard
  // actually resolved them.
  ui.statTime.textContent = formatTime(campaign.time);
  ui.statRings.textContent = String(campaign.sonarUses);
  ui.statAlerts.textContent = String(campaign.detections);

  if (ui.resultCampaign) {
    const retried = campaign.retries === 1 ? '1 retry' : campaign.retries + ' retries';
    let verdict;
    if (wasTraining) {
      verdict = 'TRAINING // the campaign is the three levels, start it when ready';
    } else if (!campaign.valid) {
      verdict = 'PRACTICE RUN // does not count as a completed campaign';
    } else if (won && campaign.stagesCleared === 3) {
      verdict = campaign.retries === 0
        ? 'CLEAN CAMPAIGN // all three levels, first attempt'
        : 'CAMPAIGN COMPLETE // all three levels, ' + retried;
    } else {
      verdict = 'CAMPAIGN IN PROGRESS // ' + campaign.stagesCleared + ' of 3 cleared, ' + retried;
    }
    ui.resultCampaign.textContent = verdict;
    ui.resultCampaign.classList.toggle('clean', campaign.valid && won && campaign.stagesCleared === 3);
    ui.resultCampaign.classList.toggle('tainted', !campaign.valid);
  }
  if (ui.newHeistButton) {
    ui.newHeistButton.classList.toggle('is-hidden',
      !wasTraining && !state.won && state.stage === 1 && campaign.retries === 0);
    ui.newHeistButton.querySelector('span').textContent = wasTraining ? 'START THE HEIST' : 'RESTART HEIST';
  }
  ui.result.classList.remove('is-hidden');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}

function showToast(message, duration = 2.2) {
  ui.toast.textContent = message;
  ui.toast.classList.remove('is-hidden');
  state.toastTimer = duration;
}

function updateToast(dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.add('is-hidden');
  }
}

events.on('alarm:level', ({ level, previous }) => {
  if (!state.running || level.id === previous.id) return;
  showToast('ALARM // ' + level.label);
});

events.on('alarm:lockdown', () => {
  if (state.running && !state.ended && !state.transitioning) finish(false, 'lockdown');
});

events.on('safe:noise', ({ noise }) => {
  if (!state.safeActive || state.safeNoiseCooldown > 0) return;
  state.safeNoiseCooldown = 0.45;
  alarm.raise(2 + noise * 4, 'safe-noise');
  if (state.safeCase) emitRing(state.safeCase.position, colours.alert, 5 + noise * 4, 'safe');
});

function handleHazardTrip(reason) {
  if (state.hazardCooldown > 0 || state.ended || state.transitioning) return;
  state.hazardCooldown = 1.25;
  state.alerts += 1;
  const amount = reason === 'laser' ? ALARM_RAISE.laser : ALARM_RAISE.trap;
  alarm.raise(amount, reason);
  events.emit('hazard:trip', { reason, stage: state.stage, position: player.position.clone() });
  if (!state.ended) showToast((reason === 'laser' ? 'LASER TRIPPED' : 'PRESSURE PLATE TRIPPED') + ' // ALARM RISING');
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
  const reveal = THREE.MathUtils.clamp(state.mapReveal, 0, 1);
  const fullMap = reveal > 0.08;
  const playerX = mapX(player.position.x);
  const playerY = mapY(player.position.z);
  context.save();
  if (!fullMap) {
    context.beginPath();
    context.arc(playerX, playerY, 62, 0, Math.PI * 2);
    context.clip();
  }
  context.globalAlpha = fullMap ? 0.35 + reveal * 0.65 : 0.86;

  for (const box of colliders) {
    if (box.stage && box.stage !== state.stage) continue;
    if (box.disabled) continue;
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

  context.font = '700 14px Consolas, monospace';
  context.textAlign = 'center';
  if (state.stage !== 2) {
    const exitX = mapX(state.stage === 1 ? galleriesMission.entrancePosition.x : 0);
    const exitY = mapY(state.stage === 1 ? galleriesMission.entrancePosition.z : ESCAPE_EXIT.z);
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
    context.fillText(state.stage === 1 ? 'VAULT' : 'EXIT', exitX, exitY - 18);
  }

  const targetPosition = state.stage === 1
    ? (state.hasKey ? galleriesMission.entrancePosition : galleriesMission.keyPosition)
    : (state.carrying ? player.position : artifact.position);
  const targets = state.stage === 2 && !state.carrying ? vaultMission.cases.map((exhibit) => ({ position: exhibit.position, id: exhibit.id })) : [{ position: targetPosition }];
  for (const target of targets) {
    const targetX = mapX(target.position.x);
    const targetY = mapY(target.position.z);
    context.save();
    context.translate(targetX, targetY);
    context.rotate(Math.PI / 4);
    context.fillStyle = '#ffd76a';
    context.shadowColor = '#ffd76a';
    context.shadowBlur = 14;
    context.fillRect(-8, -8, 16, 16);
    context.restore();
    if (state.stage === 1 && !state.hasKey) {
      context.fillStyle = '#ffd76a';
      context.fillText('KEY', targetX, targetY + 24);
    }
    if (target.id) {
      context.fillStyle = '#ffd76a';
      context.fillText(target.id, targetX, targetY + 23);
    }
  }

  for (const guard of guards.filter((guard) => guard.active)) {
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
  }
  context.restore();

  const playerAngle = Math.atan2(-Math.cos(state.yaw), -Math.sin(state.yaw));
  if (!fullMap) {
    context.beginPath();
    context.arc(playerX, playerY, 62, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(114, 239, 255, .28)';
    context.lineWidth = 2;
    context.stroke();
  }
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
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  renderer.setViewport(0, 0, width, height);
  renderer.setScissor(0, 0, width, height);
  renderer.clear();
  if (state.cctvActive) {
    const feedWidth = Math.floor(width / 2);
    const feedHeight = Math.floor(height / 2);
    renderer.setScissorTest(true);
    cctv.cameras.forEach((securityCamera, index) => {
      const column = index % 2;
      const rowFromTop = Math.floor(index / 2);
      const x = column * feedWidth;
      const y = rowFromTop === 0 ? feedHeight : 0;
      const viewportWidth = column === 0 ? feedWidth : width - feedWidth;
      const viewportHeight = rowFromTop === 0 ? height - feedHeight : feedHeight;
      cctvCamera.position.set(
        securityCamera.x + Math.sin(securityCamera.yaw) * 0.58,
        3.25,
        securityCamera.z + Math.cos(securityCamera.yaw) * 0.58
      );
      cctvCamera.rotation.set(-0.18, securityCamera.yaw + Math.PI, 0);
      cctvCamera.aspect = viewportWidth / viewportHeight;
      cctvCamera.updateProjectionMatrix();
      renderer.setViewport(x, y, viewportWidth, viewportHeight);
      renderer.setScissor(x, y, viewportWidth, viewportHeight);
      renderer.render(scene, cctvCamera);
    });
    renderer.setScissorTest(false);
    return;
  }
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
  drawMinimap();
}

function animate() {
  requestAnimationFrame(animate);
  const frameDt = Math.min(clock.getDelta(), 0.05);
  if (!state.running) return;
  const dt = state.locked && !state.transitioning ? frameDt : 0;
  state.playTime += dt;
  campaign.time += dt;
  const elapsed = state.playTime;
  sharedUniforms.uTime.value = elapsed;
  if (state.stage === 1) galleriesMission.update(elapsed);
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
  for (const item of pickups.items) {
    const mesh = pickupMeshes.get(item.id);
    if (mesh?.visible && item.type === 'loot') mesh.rotation.y += dt * 1.25;
  }
  state.mapReveal = Math.max(0, state.mapReveal - dt * 0.3);
  ui.mapStatus.textContent = state.mapReveal > 0.08 ? 'FULL / SONAR' : 'LOCAL';
  ui.minimap.classList.toggle('revealed', state.mapReveal > 0.08);
  // Feed presentation remains live while pointer-lock is paused; camera
  // detection itself only advances with a positive gameplay timestep.
  updateCctv(dt);

  if (dt > 0) {
    state.elapsed += dt;
    state.throwCooldown = Math.max(0, state.throwCooldown - dt);
    state.pingCooldown = Math.max(0, state.pingCooldown - dt);
    state.hazardCooldown = Math.max(0, state.hazardCooldown - dt);
    state.safeNoiseCooldown = Math.max(0, state.safeNoiseCooldown - dt);
    updateDecoyCooldown(dt);
    const sonarKey = state.stage === 1 || state.stage === TUTORIAL_STAGE ? 'SPACE' : 'G';
    ui.sonar.textContent = state.pingCooldown > 0 ? 'SONAR RECHARGING ' + state.pingCooldown.toFixed(1) + 's' : 'SONAR READY  ' + sonarKey;
    ui.sonar.classList.toggle('cooldown', state.pingCooldown > 0);
    if (!state.cctvActive && !state.safeActive) {
      updatePlayer(dt);
      updatePickpocket(dt);
    }
    updateEcho(dt);
    if (state.stage === 3) updateEchoUi();
    updateEchoPlates();
    stages.update(state.stage, player.position, state.crouching, elapsed, handleHazardTrip, {
      crawling: state.crawling,
      jumpOffset: state.jumpOffset
    });
    if (state.running && !state.transitioning) updateThrowables(dt);
    updateThrowPreview();
  }
  if (state.stage === 3) {
    const playerHolding = Boolean(keys.KeyE) && Boolean(escapeMission.eligible(player.position, state.yaw, state.pitch));
    const echoHolding = echoFrame?.interacting && echo.snapshot().mode === 'replaying' &&
      Boolean(escapeMission.eligible(echoFrame, echoFrame.yaw, echoFrame.pitch));
    const overrideActor = playerHolding
      ? { position: player.position, yaw: state.yaw, pitch: state.pitch }
      : echoHolding
        ? { position: echoFrame, yaw: echoFrame.yaw, pitch: echoFrame.pitch }
        : { position: player.position, yaw: state.yaw, pitch: state.pitch };
    const result = escapeMission.update({ dt, player: overrideActor.position, yaw: overrideActor.yaw, pitch: overrideActor.pitch,
      holding: playerHolding || echoHolding, active: dt > 0 && state.running && !state.transitioning,
      hasDiamond: state.hasDiamond, escapePlayer: player.position });
    for (const noise of result.noises) emitRing(noise.position, colours.alert, noise.radius, noise.source);
    if (result.opened.length) {
      const navigator = createNavigator(colliders, 3);
      for (const guard of guards) {
        guard.navigator = navigator;
        guard.goalKey = null;
        guard.route = [];
        guard.routeIndex = guard.replanIn = 0;
      }
      ui.objective.textContent = escapeMission.doors.every((door) => door.opened)
        ? 'Both doors open — reach the emergency lift with H-1968-07'
        : 'Door 01 open — find Door 02 to the northeast';
      showToast('DOOR 0' + result.opened[0] + ' OPEN // SECURITY CAN FOLLOW');
    }
    const door = escapeMission.eligible(player.position, state.yaw, state.pitch);
    ui.override.classList.toggle('is-hidden', !door || dt === 0 || !state.running);
    if (door) {
      ui.overrideText.textContent = 'HOLD E // DOOR 0' + door.id + ' // ' + Math.round(door.progress / OVERRIDE_SECONDS * 100) + '%';
      ui.overrideFill.style.width = door.progress / OVERRIDE_SECONDS * 100 + '%';
    }
    if (result.finished) completeStage();
  }
  const soundDt = state.running && state.locked && !state.transitioning ? dt : 0;
  updateRingUniforms(soundDt, elapsed);
  if (state.stage === 2) vaultMission.update(soundDt);
  if (soundDt > 0) {
    // The dampener is the whole of the cloak rule: no resolvable return means
    // no exposure, however lit up the player looks on their own rig.
    if (state.stage !== 2) state.exposure = !state.cloakActive && playerIlluminated(rings, player.position)
      ? 0.65 : Math.max(0, state.exposure - soundDt);
    if (state.stage === 3) {
      ui.exposure.textContent = state.exposure > 0 ? 'REEL SECURED // EXPOSED BY ECHO' : 'REEL SECURED // LOW EXPOSURE';
      ui.exposure.classList.toggle('cooldown', state.exposure > 0);
    }
    const active = guards.filter((guard) => guard.active);
    const pursued = active.some((guard) => guard.state === 'pursue');
    const alarmState = alarm.update(soundDt, { canDecay: !pursued && state.exposure === 0 });
    for (const guard of active) if (state.running) updateGuard(guard, soundDt);
    const status = active.find((guard) => guard.state === 'pursue') ?? active.find((guard) => guard.suspicion > 0) ?? active.find((guard) => guard.state !== 'patrol');
    const guardDetail = status ? ' // ' + (status.suspicion > 0 && status.state !== 'pursue' ? 'SEEN ' + Math.round(status.suspicion * 100) + '%' : status.state.toUpperCase()) : '';
    ui.guard.textContent = alarmState.level.label + ' ' + Math.round(alarmState.value) + '%' + guardDetail;
    ui.guard.style.setProperty('--alarm-level', alarmState.value + '%');
    ui.guard.classList.toggle('alert', alarmState.level.id === 'alert' || alarmState.level.id === 'lockdown' || Boolean(status));
  }
  updateToast(dt);
  render();
}

const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (state.safeActive) {
    event.preventDefault();
    if (event.code === 'Escape') cancelSafecrack();
    if (event.code === 'KeyE' && !event.repeat) setSafeTumbler();
    return;
  }
  if (state.cctvActive && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(event.code)) {
    event.preventDefault();
    selectCctvFeed(Number(event.code.slice(-1)) - 1);
    return;
  }
  if (SCROLL_KEYS.includes(event.code) && state.running) event.preventDefault();
  if (event.code === 'Tab' && state.running) {
    event.preventDefault();
    if (!event.repeat) cycleCctvFeed();
  }
  if (event.code === 'Escape' && state.cctvActive) exitCctvFeed();
  if (event.code === 'Enter' && !state.running && !state.ended && !ui.start.classList.contains('is-hidden')) startGame();
  if (event.code === 'KeyT' && !state.running && !state.ended && !ui.start.classList.contains('is-hidden')) startTraining();
  if (event.code === 'KeyE' && !event.repeat && !loopCctvFeed()) interact();
  if (event.code === 'KeyF' && !event.repeat) toggleDampener();
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    if (state.stage === 1 || state.stage === TUTORIAL_STAGE) activePulse();
    else tryJump();
  }
  if (event.code === 'KeyG' && !event.repeat) activePulse();
  if (event.code === 'KeyQ' && !event.repeat) toggleEcho();
  if (state.running && !state.transitioning && ['Digit1','Digit2','Digit3'].includes(event.code)) practiceJump(Number(event.code.slice(-1)));
  if (event.code === 'KeyR' && state.ended) retryGame();
  if (event.code === 'KeyN' && state.ended) restartHeist();
});
document.addEventListener('keyup', (event) => { keys[event.code] = false; });
document.addEventListener('mousemove', (event) => {
  if (!state.locked || !state.running) return;
  if (state.cctvActive) return;
  if (state.safeActive) {
    const result = safecrack.turn(event.movementX * 0.12, 1 / 60);
    updateSafeUi(result.noise);
    return;
  }
  state.yaw -= event.movementX * 0.0022;
  state.pitch -= event.movementY * 0.0019;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -1.38, 1.38);
});
document.addEventListener('pointerlockchange', () => {
  state.locked = document.pointerLockElement === canvas;
  if (!state.locked) {
    ui.interaction.classList.add('is-hidden');
    ui.override.classList.add('is-hidden');
    escapeMission.cancel();
    for (const key of Object.keys(keys)) keys[key] = false;
  }
  if (!state.locked && state.running && !state.ended) showToast('PAUSED — CLICK TO RESUME');
});
canvas.addEventListener('click', () => {
  if (state.running && !state.locked) canvas.requestPointerLock();
});
window.addEventListener('blur', () => {
  for (const key of Object.keys(keys)) keys[key] = false;
  escapeMission.cancel();
  if (document.pointerLockElement) document.exitPointerLock();
});
canvas.addEventListener('mousedown', (event) => {
  if (state.cctvActive || state.safeActive) {
    event.preventDefault();
    return;
  }
  if (event.button === 0) throwDecoy();
  // Right mouse sharpens the arc. The faint version is always on, so the
  // throw is never a guess even if the player never finds this.
  if (event.button === 2) { state.aiming = true; event.preventDefault(); }
});
canvas.addEventListener('mouseup', (event) => { if (event.button === 2) state.aiming = false; });
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('blur', () => { state.aiming = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap()));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
ui.startButton.addEventListener('click', startGame);
if (ui.trainingButton) ui.trainingButton.addEventListener('click', startTraining);
ui.restartButton.addEventListener('click', retryGame);
if (ui.newHeistButton) ui.newHeistButton.addEventListener('click', restartHeist);
ui.creditsButton.addEventListener('click', () => ui.credits.showModal());
ui.closeCredits.addEventListener('click', () => ui.credits.close());

const qaParams = new URLSearchParams(window.location.search);
if (qaParams.has('qa')) {
  window.__signalQa = {
    completeStage: () => { taintCampaign(); completeStage(); },
    takeArtifact: interact,
    toggleEcho,
    movePlayer: (x, z) => { taintCampaign(); player.position.set(x, 0, z); },
    setView: (yaw, pitch = 0) => { state.yaw = yaw; state.pitch = pitch; },
    openSafe: () => {
      const correct = vaultMission.cases.find((exhibit) => exhibit.signature === vaultMission.keySignature);
      correct.scanned = true;
      beginSafecrack(correct);
    },
    turnSafe: (delta, dt) => { const result = safecrack.turn(delta, dt); updateSafeUi(result.noise); return result; },
    setSafe: setSafeTumbler,
    isBlockedAt: (x, z) => isBlocked(new THREE.Vector3(x, 0, z)),
    finish: (won) => finish(Boolean(won)),
    getState: () => ({ stage: state.stage, running: state.running, ended: state.ended, transitioning: state.transitioning, carrying: state.carrying, hasKey: state.hasKey, hasDiamond: state.hasDiamond, keySignature: vaultMission.keySignature, player: { x: player.position.x, z: player.position.z, jump: state.jumpOffset, stamina: sprintStamina.snapshot() }, yaw: state.yaw, pitch: state.pitch, exposure: state.exposure, elapsed: state.elapsed, guards: guards.filter((guard) => guard.active).map((guard) => ({ x: guard.group.position.x, z: guard.group.position.z, state: guard.state, waypoint: guard.waypoint, suspicion: guard.suspicion })), doors: escapeMission.doors.map(({ id, opened, progress }) => ({ id, opened, progress })), vaultCases: vaultMission.cases.map(({ id, signature, scanned, unlocked }) => ({ id, signature, scanned, unlocked })), rings: state.ringCount, alerts: state.alerts, alarm: alarm.snapshot(), checkpoint: checkpoints.latestId, echo: echo.snapshot(), plates: echoPlates.plates.map(({ id, active, occupants }) => ({ id, active, occupants: [...occupants] })), pickups: pickups.snapshot(), cctv: cctv.snapshot(), safe: safecrack.snapshot(), decoys: state.decoyCharges, mapReveal: state.mapReveal, campaign: { ...campaign } })
  };
}

createWorld();
camera.position.set(0, 1.68, 18);
camera.rotation.set(0, 0, 0);
if (qaParams.get('qa') === 'safe') {
  ui.start.classList.add('is-hidden');
  resetGame(2, false);
  const correct = vaultMission.cases.find((exhibit) => exhibit.signature === vaultMission.keySignature);
  correct.scanned = true;
  ui.signature.textContent = vaultMission.readout();
  beginSafecrack(correct);
}
animate();
