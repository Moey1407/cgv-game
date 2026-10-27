import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createSoundField, createMaterials, createLighting, createSkybox, createPostFX, createCCTV, createMinimap,
  createLaserSystem, applyHologram, loadCharacter, spawnCharacter, blobShadow, suit, FORWARD, QUALITY, createGalaCrowd,
  RING_COLOURS, LAYER_WORLD_ONLY, rendererStats
} from './render/index.js';
import { buildHall } from './world/hall.js';
import { buildLevel, createCollision } from './world/levelBuilder.js';
import { buildSecurityWing } from './world/securityWing.js';
import { createAirlock, AIRLOCK } from './world/airlock.js';
import { createGuide } from './game/guide.js';
import { buildProps } from './world/levelProps.js';
import { LEVELS, EVIDENCE_TOTAL } from '../levels/index.js';
import { surfaceAt } from '../levels/schema.js';
import { createEventBus } from './core/events.js';
import { createAlarmSystem, ALARM_RAISE } from './gameplay/alarm.js';
import { createCctvSystem } from './gameplay/cctv.js';
import { createCheckpointStore } from './gameplay/checkpoints.js';
import { createEchoSystem } from './gameplay/echo.js';
import { createPickpocketSystem, pickpocketAccess, PICKPOCKET_SECONDS } from './gameplay/pickpocket.js';
import { createPickupSystem } from './gameplay/pickups.js';
import { createPlateSystem } from './gameplay/plates.js';
import { canUseDecoy, movementProfile, MOVEMENT } from './gameplay/player.js';
import { createSafecrackSystem } from './gameplay/safecrack.js';
import { createStaminaSystem } from './gameplay/stamina.js';
import { galaCover, galaWitnessNearby } from './gameplay/socialStealth.js';
import { THROW, advanceThrow, impactRadius } from './throwing.js';
import { createGuardAI } from './game/guardAI.js';
import { createHud } from './game/hud.js';
import { createAudio } from './audio.js';
import { createStory } from './story.js';
import { createScreens } from './screens.js';
import { createPerson } from './render/people.js';
import { missionPhase } from './gameplay/mission.js';
import { makeTraversalPath } from './gameplay/traversal.js';
import { patrolEta, etaText } from './gameplay/patrolEta.js';
import { createZiplineRig } from './render/ziplineRig.js';
import { createNavigation } from './gameplay/navigation.js';
import { createLearningGuide } from './gameplay/learning.js';
import { createLearningView } from './game/learningView.js';

const QUALITIES = ['low', 'medium', 'high'];
const LEVEL_MODE = { 1: 'gala', 2: 'night', 3: 'lockdown' };
const LEVEL_LABEL = {
  1: 'LEVEL 1 · THE GALA · 19:40',
  2: 'LEVEL 2 · THE VAULT · 01:30',
  3: 'LEVEL 3 · THE DOUBLE-CROSS · 01:58'
};
const HEARING = { gala: 0.45, night: 1, lockdown: 1.15 };
const RING_SCALE = 0.6;
const USE_RANGE = 1.5;
const HALL_CAMERAS = [
  { name: 'CAM 01 · ATRIUM', position: [-11.5, 8.5, 7], target: [2, 0, -8], sweep: 0.35 },
  { name: 'CAM 02 · GRAND HALL', position: [11.5, 8.5, -20], target: [-2, 0, -8], sweep: 0.3 },
  { name: 'CAM 03 · VAULT WING', position: [-11.5, 8.5, -38.5], target: [0, 0, -30] },
  { name: 'CAM 04 · VAULT CORRIDOR', position: [1.8, 3.9, -41], target: [0, 0.4, -58] }
];
const ATTRACT = {
  1: [[[-8, 3.2, 6], [2, 1.5, -12]], [[5, 4.6, -3], [-4, 1.4, -20]], [[9.5, 2.6, -21], [-6, 1.6, -12]], [[-5, 5.6, -35], [4, 1.2, -14]], [[-9.5, 2.4, -14], [6, 2, -6]]],
  2: [[[2.2, 2.8, 1.6], [0, 0.6, -12]], [[-2, 1.1, -7.5], [1, 0.6, -17]], [[0.8, 2.6, -19], [0, 1, -36]], [[5.6, 3.1, -29], [-2, 0.8, -39]], [[-5.5, 2.4, -38], [2, 1, -30]]],
  3: [[[3.5, 3.2, -1], [-2, 1, -19]], [[-8.5, 3.4, -27], [6, 0.8, -42]], [[6.5, 3, -40], [-4, 1, -28]], [[-5, 23.2, -55], [2, 20.4, -64]], [[4.5, 22.6, -70], [0, 20.5, -79]], [[0, 24, -82], [0, 21, -62]]]
};
const GALA_GUESTS = [
  { x: -2.9, z: -2.6, rotation: 2.2, style: 'suit', colour: 0x15171c, accent: 0x7d1822, skin: 0xb98668 },
  { x: -1.9, z: -1.9, rotation: -2.6, style: 'dress', colour: 0x14345a, skin: 0x8c5f49, hair: 0x17100d },
  { x: 2.9, z: -5.6, rotation: -1.2, style: 'suit', colour: 0x111318, accent: 0xb79a55, skin: 0xd0a27f },
  { x: 2.0, z: -6.4, rotation: 0.9, style: 'dress', colour: 0x6b1729, skin: 0x6e4937, hair: 0x0e0b09 },
  { x: -6.6, z: -7.4, rotation: -1.6, style: 'suit', colour: 0x20242b, accent: 0x214b72, skin: 0x9c6d52 },
  { x: 5.4, z: -13.2, rotation: 0.4, style: 'dress', colour: 0x1c5548, skin: 0xc89570, hair: 0x3b2116 },
  { x: 6.3, z: -12.4, rotation: -2.4, style: 'suit', colour: 0x251e19, accent: 0x8d6b2f, skin: 0x744b38 },
  { x: -3.8, z: -17.5, rotation: 1.0, style: 'dress', colour: 0x3e224f, skin: 0xe0b08a, hair: 0x8b5a2b },
  { x: -4.6, z: -16.6, rotation: 2.6, style: 'suit', colour: 0x17243a, accent: 0x8b2430, skin: 0x9f6a4f },
  { x: 1.2, z: -26, rotation: 0.2, style: 'suit', colour: 0x121418, accent: 0x355a7a, skin: 0xc28f6b },
  { x: -1.2, z: -6.2, rotation: 0.6, style: 'dress', colour: 0x7a4b18, skin: 0x8b5d46, hair: 0x15100d },
  { x: 3.6, z: -13.6, rotation: -2.4, style: 'dress', colour: 0x711d43, skin: 0xd3a17a, hair: 0x2c1912 },
  { x: -5.6, z: -21.5, rotation: 1.4, style: 'suit', colour: 0x191b20, accent: 0x5e2030, skin: 0x6b4635 },
  { x: 4.7, z: -22.4, rotation: -0.8, style: 'dress', colour: 0x173c57, skin: 0xb98062, hair: 0x1c130e },
  { x: -5.8, z: -11.8, rotation: 1.1, style: 'dress', skin: 0xc18f70, hair: 0x352016 },
  { x: 4.6, z: -18.6, rotation: -1.5, style: 'suit', accent: 0x9e7749, skin: 0x754a35 },
  { x: -2.8, z: -24.4, rotation: .4, style: 'suit', accent: 0x386c78, skin: 0xd8ad88 },
  { x: 5.6, z: -27.5, rotation: -.6, style: 'dress', skin: 0x8c6048, hair: 0x17110e },
];

// Deliberate formalwear palette: cream, steel blue, emerald, plum and rose.
const GALA_COLOURS = [0x42658c, 0x3778b8, 0xb3aa94, 0xbc4261, 0x68717a, 0x278f73, 0x8b6b50, 0x9b5fbc, 0x455d7a, 0x657177, 0xd3a956, 0xba507e, 0x6c4851, 0x388a9f];
GALA_GUESTS.forEach((guest, i) => {
  guest.colour = GALA_COLOURS[i % GALA_COLOURS.length];
  guest.height = [.97, 1.01, 1.035, .94, 1][i % 5];
  guest.build = [1, .94, 1.07, .98][i % 4];
  guest.hairStyle = i % 3 === 0 ? 'bob' : 'bun';
});

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const near = (p, a, r = USE_RANGE) => Math.hypot(p.x - a[0], p.z - a[2]) <= r && Math.abs((p.y ?? 0) - (a[1] ?? 0)) < 2;
const facing = (dx, dz) => Math.atan2(-dx, -dz);
const guardId = (name) => name.toLowerCase().split(' ')[0];
const clockText = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function randomCombination() {
  return [0, 0, 0].map(() => 5 + Math.floor(Math.random() * 90));
}

function cameraFromData(c) {
  const yaw = THREE.MathUtils.degToRad(c.yawDeg);
  const reach = c.pos[1] < 5 ? 14 : c.pos[1] * 2.4;
  return {
    name: c.label,
    position: v3(c.pos),
    target: new THREE.Vector3(c.pos[0] - Math.sin(yaw) * reach, 0, c.pos[2] - Math.cos(yaw) * reach),
    sweep: THREE.MathUtils.degToRad(c.sweepDeg ?? 0)
  };
}

const CHECKPOINT_MIN_SLEEP = 10; // seconds a sedated guard stays down after a respawn
const LASER_TRIP_ALARM = 20; // ALARM_RAISE.laser is 34; with knock-back, trips are retries

function laserFromData(l) {
  const rise = l.pattern === 'rise_fall';
  return {
    start: v3(l.a),
    end: v3(l.b),
    pattern: rise ? 'rise' : l.pattern === 'blink' ? 'blink' : l.pattern === 'sweep' ? 'sweep' : 'static',
    amplitude: l.amplitude ?? 0.6,
    speed: rise ? (Math.PI * 2) / (l.period ?? 4) : 1,
    period: l.period ?? 4
  };
}

function pickupItems() {
  return Object.values(LEVELS).flatMap((level) => level.pickups.map((p) => ({
    id: p.id, type: p.kind, label: p.label, value: p.value ?? 0, evidenceIndex: p.evidenceIndex,
    stage: level.id, x: (p.usePos ?? p.pos)[0], y: p.pos[1], z: (p.usePos ?? p.pos)[2]
  })));
}

async function start() {
  const qa = new URLSearchParams(location.search).has('qa');
  document.body.classList.toggle('qa-mode', qa);
  const $ = (id) => document.getElementById(id);
  const ui = {
    mode: $('mode'), timer: $('timer'), fade: $('fade'), feed: $('feed'), feedName: $('feed-name'), feedState: $('feed-state'),
    pip: $('pip-frame'), map: $('map-frame'), stats: $('stats'), loading: $('loading'),
    credits: $('credits'), closeCredits: $('close-credits'), guardEta: $('guard-eta')
  };
  ui.feedCells = [...document.querySelectorAll('.cctv-cell')];
  ui.mapLabel = ui.map.querySelector('span');
  const hud = createHud();
  const events = createEventBus();
  let cur = null;
  const audio = createAudio({ surfaceAt: (x, z) => surfaceAt(cur?.data ?? LEVELS[1], x, z) });
  const story = createStory({ events, audio });
  const screens = createScreens({
    events,
    audio,
    qa: qa && !new URLSearchParams(location.search).has('menus'),
    actions: {
      lock: () => canvas.requestPointerLock(),
      unlockedResume: () => hud.toast('PLAYING · CLICK GAME TO RESTORE MOUSE LOOK', 2.6),
      restart: () => restore(checkpoints.restore() ?? snapshotCheckpoint()),
      newHeist: () => newHeist(),
      loadLevel: (n) => enterLevel(n),
      quality: (q) => {
        state.auto = q === 'auto';
        if (q !== 'auto') { applyQuality(q); setMode(state.mode); }
      },
      rendering: (options) => fx.setPreferences(options)
    }
  });

  const canvas = $('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: qa });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.layers.enable(LAYER_WORLD_ONLY);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const zipRig = createZiplineRig(camera);

  const field = createSoundField();
  const materials = createMaterials(field, { maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });
  const hall = await buildHall(scene, materials, renderer, { width: window.innerWidth, height: window.innerHeight });
  const minimap = createMinimap(renderer, scene, { width: 24, height: 16 });
  minimap.hideFromMap(hall.ceilingGroup);
  const lighting = createLighting(scene, renderer, hall.layout, materials);
  const skybox = createSkybox();
  scene.add(skybox.mesh, skybox.city);
  minimap.hideFromMap(skybox.mesh);
  minimap.hideFromMap(skybox.city);
  const fx = createPostFX(renderer, scene, camera, { quality: 'medium' });
  fx.setPreferences(screens.options);
  const inLock = createAirlock(materials);
  const outLock = createAirlock(materials);
  scene.add(inLock.group, outLock.group);
  minimap.hideFromMap(inLock.group);
  minimap.hideFromMap(outLock.group);
  const airScene = new THREE.Scene();
  airScene.background = new THREE.Color(0x050505);
  airScene.add(new THREE.HemisphereLight(0x9a948a, 0x161412, 0.6), outLock.twin);
  const airCamera = camera.clone();
  airCamera.rotation.order = 'YXZ';
  const guide = createGuide({ scene, camera });
  const learning = createLearningGuide();
  const learningView = createLearningView();
  const LAYER_AVATAR = 3;
  const avatar = new THREE.Group();
  const avatarBody = new THREE.Group();
  const outfits = {
    gala: createPerson({ style: 'dress', colour: 0x123f3a, accent: 0xd8b56a, hair: 0x1b1412, skin: 0xb07a5c, hairStyle: 'bun' }),
    night: createPerson({ style: 'suit', colour: 0x1d2129, trouser: 0x16181d, shirt: 0x2c313b, accent: 0x72efff, hair: 0x1b1412, skin: 0xb07a5c })
  };
  let wren = outfits.gala;
  avatarBody.add(outfits.gala.root, outfits.night.root);
  outfits.night.root.visible = false;
  function dressWren(n) {
    wren = n === 1 ? outfits.gala : outfits.night;
    outfits.gala.root.visible = wren === outfits.gala;
    outfits.night.root.visible = wren === outfits.night;
  }
  avatar.add(avatarBody);
  scene.add(avatar);
  avatar.traverse((o) => { o.layers.set(LAYER_AVATAR); if (o.isMesh) o.castShadow = false; });
  const view = { third: false, distance: 2.6, eye: new THREE.Vector3(), want: new THREE.Vector3(), step: new THREE.Vector3(), back: new THREE.Vector3(), right: new THREE.Vector3() };

  // Xbot is kept for the Echo; lightweight formalwear actors form the gala crowd.
  const xbot = await loadCharacter('./models/xbot.glb');
  const guests = createGalaCrowd(GALA_GUESTS, {
    canStand: (x, z) => Boolean(cur && cur.n === 1) && canStand(x, z, .45, 0),
    onStep: (position) => field.emit(position, 0xc1b998, 2.4, { source: 'guest', speed: 4, strength: .35 }),
  });
  scene.add(guests.root);
  guests.update(0);

  const alarm = createAlarmSystem({ events });
  const stamina = createStaminaSystem();
  const pickpocket = createPickpocketSystem({ events });
  const pickups = createPickupSystem(pickupItems(), { events });
  const echo = createEchoSystem({ events, maxSeconds: 20 });
  const checkpoints = createCheckpointStore({ events });
  let safe = createSafecrackSystem({ combination: randomCombination(), events });

  const echoActor = spawnCharacter(xbot, { clip: 'idle', forward: FORWARD.xbot, castShadow: false });
  const hologram = applyHologram(echoActor.root);
  echoActor.root.visible = false;
  scene.add(echoActor.root);
  const echoMarker = minimap.addMarker(echoActor.root, RING_COLOURS.echo, 1.3, 0, 'echo');
  echoMarker.mesh.visible = false;

  const player = { position: new THREE.Vector3(), base: 0, y: 0, vy: 0, yaw: 0, pitch: -0.04, step: 0, height: 1.68, profile: MOVEMENT.run, moving: false };
  const playerMarker = new THREE.Object3D();
  scene.add(playerMarker);
  minimap.addMarker(playerMarker, RING_COLOURS.player, 1.9, 0, 'player');

  const keys = {};
  const throwables = [];
  const decoyGeometry = new THREE.SphereGeometry(THROW.radius, 10, 7);
  const decoyMaterial = new THREE.MeshStandardMaterial({ color: 0xc18b43, metalness: 0.7, roughness: 0.35 });
  const state = {
    mode: 'gala', dampen: false, cell: 6, pip: false, map: true, quality: 'medium', auto: !qa,
    damage: 0, locked: false, sonarCooldown: 0, mapReveal: 0, laserCooldown: 0, exposure: 0, stun: 0, shake: 0, lastClear: new THREE.Vector3(),
    hasKeycard: false, hasStar: false, inSafe: false, ended: null, detections: 0, time: 0,
    echoStep: 0, echoLast: new THREE.Vector3(), fadeEcho: 0, lastDt: 1 / 60, safeGlow: 0, safeNoise: 0,
    zip: null, vent: null, searchCooldown: 0, attract: 0,
    decoyCharges: 3, decoyRecharge: 0, throwCooldown: 0, socialHeat: 0,
    lifting: false, witnessCooldown: 0, spawnGrace: 0
  };
  const tmp = { dir: new THREE.Vector3(), next: new THREE.Vector3(), probe: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3() };

  function emitNoise(position, colour, radius, { source, damped = false, speed, strength = 0.85, cause } = {}) {
    if (cause === 'sonar') state.mapReveal = 2.4;
    // Level 1 guest cover: on the public floor Wren's footsteps blend into the party, so
    // they make no ring and no guard hears them. Rings appear once the cover is gone
    // (past the velvet rope, sprinting, crouching), which is exactly when sound matters.
    if (cur?.n === 1 && source === 'player' && cause === 'footstep' && !damped
      && galaCover({ x: player.position.x, z: player.position.z, movement: player.profile.id, gadgetHeat: state.socialHeat, compromised: cur.flags.coverBlown }).safe) return;
    const y = position.y ?? 0;
    field.emit(tmp.next.set(position.x, y + 0.02, position.z), colour, radius, { speed: speed ?? Math.max(5, radius * 0.9), strength, source });
    if (damped || !cur) return;
    const reach = radius * (HEARING[state.mode] ?? 1);
    let heard = false;
    for (const g of cur.guards) {
      if (g.position.distanceTo(tmp.next.set(position.x, y, position.z)) <= reach) heard = g.hear(position, strength) || heard;
    }
    if (heard && cause) alarm.raise(ALARM_RAISE[cause] ?? 4, cause);
  }

  function canStand(x, z, r = 0.35, y = player.base) {
    if (!cur) return false;
    if (state.transit?.sealed) return state.transit.lock.inside(x, z, r, y);
    return cur.collision.inside(x, z, r, y) || inLock.inside(x, z, r, y) || outLock.inside(x, z, r, y);
  }

  function clearDecoys() {
    for (const item of throwables) scene.remove(item.mesh);
    throwables.length = 0;
  }

  function throwBlockedAt(x, y, z, base = player.base) {
    const ceiling = cur.n === 1 && x < 11.3 ? 9.6 : cur.n === 1 ? 3.1 : 3.9;
    return y > ceiling || !canStand(x, z, THROW.radius, base);
  }

  function throwDecoy() {
    if (!canUseDecoy({
      running: !screens.blocking,
      locked: state.locked,
      transitioning: false,
      ended: state.ended,
      throwCooldown: state.throwCooldown,
      cctvActive: cur.cctv.active >= 0,
      safeActive: state.inSafe
    }) || state.decoyCharges <= 0 || state.zip || state.vent || state.climb) return false;
    const forward = tmp.dir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const mesh = new THREE.Mesh(decoyGeometry, decoyMaterial);
    mesh.castShadow = true;
    mesh.position.set(player.position.x, player.base + player.y + Math.max(0.5, player.height - 0.25), player.position.z).addScaledVector(forward, 0.45);
    mesh.position.y -= 0.22;
    scene.add(mesh);
    minimap.hideFromMap(mesh);
    throwables.push({
      mesh,
      base: player.base,
      velocity: { x: forward.x * THROW.speed, y: THROW.lift - player.pitch * 1.8, z: forward.z * THROW.speed, resting: false },
      impacts: 0,
      life: 0
    });
    state.throwCooldown = 0.75;
    if (cur.n === 1) state.socialHeat = 5;
    state.decoyCharges -= 1;
    if (state.decoyRecharge <= 0) state.decoyRecharge = 6;
    return true;
  }

  function updateDecoys(dt) {
    state.throwCooldown = Math.max(0, state.throwCooldown - dt);
    if (state.decoyCharges < 3) {
      state.decoyRecharge -= dt;
      if (state.decoyRecharge <= 0) {
        state.decoyCharges += 1;
        state.decoyRecharge = state.decoyCharges < 3 ? 6 : 0;
        hud.toast('DECOY RESTORED · ×' + state.decoyCharges);
      }
    }
    for (let index = throwables.length - 1; index >= 0; index -= 1) {
      const item = throwables[index];
      item.life += dt;
      item.mesh.position.y -= item.base;
      const impact = advanceThrow(item.mesh.position, item.velocity, dt, (x, y, z) => throwBlockedAt(x, y, z, item.base));
      item.mesh.position.y += item.base;
      item.mesh.rotation.x += item.velocity.z * dt * 2;
      item.mesh.rotation.z -= item.velocity.x * dt * 2;
      if (impact && item.impacts < 3) {
        item.impacts += 1;
        emitNoise(item.mesh.position, RING_COLOURS.alert, impactRadius(impact.speed), { source: 'decoy', strength: 0.9, cause: 'footstep' });
      }
      if ((item.velocity.resting && item.life > 8) || item.life > THROW.maxFlightTime + 10) {
        scene.remove(item.mesh);
        throwables.splice(index, 1);
      }
    }
  }

  function makeGuard(def) {
    const waypoints = def.route.map(v3);
    const actor = createPerson({ style: 'guard', position: waypoints[0], skin: def.name === 'Okafor' ? 0x82543c : 0xc69979, field });
    scene.add(actor.root);
    const torch = new THREE.SpotLight(0xe8f2ff, 260, 18, 0.3, 0.45, 1.3);
    torch.position.set(0.2, 1.35, 0.35);
    const aim = new THREE.Object3D();
    aim.position.set(0.2, 0.1, 6);
    actor.root.add(torch, aim);
    torch.target = aim;
    // Keep the shadow shader variant stable between quality presets.
    torch.castShadow = true;
    torch.shadow.mapSize.set(256, 256);
    const marker = minimap.addMarker(actor.root, RING_COLOURS.guard, 1.7);
    const guard = createGuardAI({ id: guardId(def.name), actor, torch, waypoints, speed: def.speed, pauseSeconds: def.pauseSeconds ?? 0, events });
    guard.marker = marker;
    guard.def = def;
    guard.reset();
    return guard;
  }

  function teardown() {
    if (!cur) return;
    clearDecoys();
    for (const g of cur.guards) {
      g.actor.mixer?.stopAllAction();
      g.actor.dispose?.();
      scene.remove(g.root);
      minimap.removeMarker(g.marker);
      g.torch.shadow?.map?.dispose();
    }
    cur.cctv.dispose();
    cur.lasers?.dispose();
    cur.props.dispose();
    cur.built?.dispose();
    cur.wing?.dispose();
    cur = null;
  }

  function loadLevel(n) {
    teardown();
    const data = LEVELS[n];
    const isHall = n === 1;
    hall.world.visible = isHall;
    lighting.group.visible = isHall;
    guests.root.visible = isHall;
    hall.vaultHinge.rotation.y = 0;
    const built = isHall ? null : buildLevel(scene, materials, field, data, { roofRain: n === 3 });
    if (built) minimap.hideFromMap(built.ceilings);
    const props = buildProps(scene, materials, field, data, { hall });
    const wing = isHall ? buildSecurityWing(scene, materials, field, data) : null;
    if (wing) minimap.hideFromMap(wing.ceilings);
    inLock.place(data.airlockIn);
    outLock.place(data.airlockOut);
    hall.setLobbyDoors(0);
    const cameraDefs = isHall
      ? HALL_CAMERAS.map((c) => ({ ...c, position: v3(c.position), target: v3(c.target) }))
      : data.cameras.map(cameraFromData);
    const cctv = createCCTV(renderer, scene, cameraDefs, { aspect: window.innerWidth / window.innerHeight });
    for (const feed of cctv.feeds) { feed.camera.layers.enable(LAYER_WORLD_ONLY); feed.camera.layers.enable(LAYER_AVATAR); }
    cctv.setRate(QUALITY[state.quality].feedRate);
    const cctvSystem = createCctvSystem(cameraDefs.map((c, i) => ({
      id: i,
      x: c.position.x,
      z: c.position.z,
      yaw: Math.atan2(c.target.x - c.position.x, c.target.z - c.position.z),
      range: Math.hypot(c.target.x - c.position.x, c.target.z - c.position.z) * 1.6,
      fov: 1.05
    })), { events });
    let lasers = null;
    if (data.lasers.length) {
      lasers = createLaserSystem(scene);
      for (const l of data.lasers) lasers.add(laserFromData(l));
    }
    const plateDefs = data.interactables.filter((i) => i.type === 'plate').map((p) => ({ id: p.id, x: p.pos[0], z: p.pos[2], halfX: 0.8, halfZ: 0.8 }));
    cur = {
      n, data, built, props, wing, cctv, cctvSystem, cameraDefs, lasers,
      collision: built ? built.collision : createCollision(data),
      plates: createPlateSystem(plateDefs, { events }),
      guards: [],
      bounds: null,
      use: Object.fromEntries(data.interactables.map((i) => [i.id, i])),
      flags: {}
    };
    cur.bounds = cur.collision.bounds();
    minimap.setLevel(data);
    cur.elapsed = 0;
    cur.phase = { id: null, time: 0 };
    cur.navigation = createNavigation(cur.bounds, (x, z) => canStand(x, z, 0.4, 0));
    cur.guards = data.guards.map(makeGuard);
    state.mapReveal = 0;
    state.decoyCharges = data.decoys?.charges ?? 3;
    state.doses = n <= 2 ? 2 : 0;
    state.sedating = 0;
    state.decoyRecharge = 0;
    state.throwCooldown = 0;
    state.socialHeat = 0;
    cur.okafor = cur.guards.find((g) => g.def.hasKeycard) ?? null;
    if (props.keycard && cur.okafor) {
      props.keycard.position.set(0.24, 0.98, -0.12);
      props.keycard.rotation.y = Math.PI / 2;
    }
    if (n === 3) {
      built.collision.block('shutter', { pos: [0, 2, -20.1], size: [4.2, 4, 0.4] });
      built.collision.block('hatch', { pos: [0, 21.2, -67], size: [3.2, 2.4, 0.4] });
    }
    dressWren(n);
    ui.mode.textContent = LEVEL_LABEL[n];
    setMode(LEVEL_MODE[n]);
    const loaded = cur;
    loaded.warming = !qa;
    loaded.ready = qa ? (withHidden(() => renderer.compile(scene, camera)), primeViews(), Promise.resolve())
      : withHidden(() => renderer.compileAsync(scene, camera)).then(() => (cur === loaded ? primeViews() : null)).finally(() => { loaded.warming = false; });
    return cur;
  }

  function withHidden(run) {
    const skip = new Set([lighting.group, ...(cur.n === 1 ? [] : [hall.world, guests.root])]);
    const holdsLight = (o) => o.isLight || o.children.some(holdsLight);
    const shown = [];
    const visit = (o) => {
      if (skip.has(o)) return;
      if (!o.visible && !holdsLight(o)) { o.visible = true; shown.push(o); }
      if (o.visible) for (const c of o.children) visit(c);
    };
    visit(scene);
    try { return run(); } finally { for (const o of shown) o.visible = false; }
  }

  const primeTarget = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  function primeViews() {
    return withHidden(() => {
      const jobs = [];
      const fog = scene.fog;
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(primeTarget);
      scene.fog = null;
      scene.fog = fog;
      jobs.push(renderer.compileAsync(scene, camera));
      if (cur.cctv.feeds[0]) {
        renderer.setRenderTarget(cur.cctv.feeds[0].target);
        jobs.push(renderer.compileAsync(scene, cur.cctv.feeds[0].camera));
      }
      renderer.setRenderTarget(previous);
      fx.render(0, 0, camera);
      cur.cctv.update(10);
      if (cur.cctv.feeds.length) cur.cctv.renderPip(rects.pip);
      minimap.update(player.position, cur.bounds, 10);
      minimap.render(rects.map);
      return Promise.all(jobs);
    });
  }


  function applyQuality(name) {
    state.quality = name;
    const q = QUALITY[name];
    fx.setQuality(name);
    hall.setReflection(q.reflection, window.innerWidth, window.innerHeight);
    cur?.cctv.setQuality({ rate: q.feedRate, width: q.feedWidth, height: q.feedHeight });
    minimap.setRate(q.mapRate);
    guests.setLimit(q.crowdLimit);
    guests.update(elapsed);
  }

  function setMode(mode) {
    state.mode = mode;
    lighting.setMode(mode);
    skybox.setMode(mode);
    skybox.city.visible = cur?.n === 3;
    hall.setMode(mode);
    if (cur && cur.n !== 1) {
      const look = cur.data.look;
      scene.fog.color.set(look.fog.color);
      scene.fog.density = look.fog.density;
      skybox.mesh.visible = cur.n === 3;
    } else {
      skybox.mesh.visible = true;
      guests.root.visible = true;
    }
    for (const g of cur?.guards ?? []) {
      const on = mode !== 'gala';
      g.torch.userData.base ??= g.torch.intensity;
      g.torch.intensity = on ? g.torch.userData.base : 0;
      g.torch.userData.on = on;
      g.torch.shadow.autoUpdate = on && state.quality === 'high';
      if (on && state.quality === 'high') g.torch.shadow.needsUpdate = true;
    }
    fx.setBloom({ threshold: mode === 'gala' ? 0.9 : 0.6, strength: mode === 'gala' ? 0.32 : 0.5 });
    ui.mode.dataset.mode = mode;
  }

  function warmHall() {
    const mode = state.mode;
    for (const m of ['night', 'lockdown', 'gala']) {
      setMode(m);
      cur.cctv.update(10);
      minimap.update(player.position, cur.bounds, 10);
      fx.render(0, 0, camera);
      cur.cctv.renderPip(rects.pip);
      minimap.render(rects.map);
    }
    setMode(mode);
  }

  function objectiveText() {
    if (state.zip) return 'Ride it out';
    if (cur.n === 3 && cur.flags.pastShutter && player.base < 10) return 'Reach the north-east stairwell. Duct or distraction: choose your route';
    return missionPhase(cur.n, state, cur.flags).text;
  }

  function controlHint() {
    if (state.ended || state.inSafe || state.vent || state.climb || state.zip || cur.cctv.active >= 0) return '';
    if (cur.n === 1) {
      if (cur.flags.coverBlown) return 'Guest cover blown  ·  Stay out of sight and complete the exit route';
      if (cur.elapsed < 8) return 'WASD move  ·  Mouse look  ·  Shift quiet walk';
      if (!cur.flags.rig) return player.position.x > 11.4 ? 'Staff area  ·  Your guest cover does not work here  ·  Hold E at the desk  ·  Hold T behind Hale to sedate him' : 'Staff door on the east wall  ·  Wait for the officer to leave the passage';
      if (!state.hasKeycard) return 'Tab CCTV  ·  Select Grand Hall, E to loop  ·  Copy during an inspection stop';
      return cur.flags.nightEntry ? 'Return to the lobby  ·  E at the public exit' : 'Beyond the velvet rope, your guest cover no longer works';
    }
    if (cur.n === 2) {
      if (player.position.z > -7) return 'Z crawl under the high beam  ·  Hold Shift for quiet footsteps';
      if (player.position.z > -13) return 'Space jump the low beam  ·  Release Z before jumping';
      if (player.position.z > -23) return 'Watch the beam cycle  ·  The side duct is slower but avoids the inner checkpoint';
      return state.hasStar ? 'Back to the marked staff fire door' : 'Click throws a decoy into the archive  ·  Hold T behind Briggs to sedate him  ·  Crates hide you';
    }
    if (!cur.flags.pastShutter) return 'R record  →  hold E at the override for several seconds  →  R rewind  →  walk through';
    if (player.base < 10) return 'Click throw a decoy  ·  Z + E enter a duct  ·  The stairwell is north-east';
    if (!cur.flags.armed) return 'Record yourself waiting on one sensor; rewind and stand on the other';
    return cur.flags.hatch ? 'E clip onto the roof line  ·  A / D lean during the ride' : 'E hold the roof override';
  }

  function snapshotCheckpoint() {
    return {
      level: cur.n,
      player: { x: player.position.x, y: player.base, z: player.position.z, yaw: player.yaw },
      hasKeycard: state.hasKeycard,
      hasStar: state.hasStar,
      doses: state.doses,
      flags: { ...cur.flags },
      collected: pickups.items.filter((i) => i.collected).map((i) => i.id),
      alarm: Math.min(alarm.snapshot().value, 50),
      timeLeft: cur.timeLeft ?? 0,
      // Guards already put to sleep stay asleep where they fell: a respawn returns you to
      // the situation you had earned, and the dose spent on them is not refunded.
      sleeping: cur.guards.filter((g) => g.sleep > 0).map((g) => ({ id: g.id, x: g.position.x, z: g.position.z, yaw: g.actor?.root.rotation.y ?? 0, sleep: g.sleep }))
    };
  }

  function resetEcho() {
    echo.reset();
    echoActor.root.visible = false;
    echoMarker.mesh.visible = false;
    hologram.setDissolve(0);
    state.fadeEcho = 0;
  }

  function placePlayer(x, y, z, yaw) {
    state.lastClear.set(x, y, z);
    state.stun = 0; state.laserCooldown = 0;
    player.position.set(x, y, z);
    player.base = y;
    player.yaw = yaw;
    player.pitch = -0.04;
    player.y = 0;
    player.vy = 0;
  }

  function restore(payload) {
    state.transit = null;
    if (payload.level !== cur.n) loadLevel(payload.level);
    placePlayer(payload.player.x, payload.player.y ?? 0, payload.player.z, payload.player.yaw);
    state.hasKeycard = payload.hasKeycard;
    state.hasStar = Boolean(payload.hasStar);
    if (payload.doses !== undefined) state.doses = payload.doses;
    state.sedating = 0;
    if (cur.okafor && cur.props.keycard) {
      cur.okafor.root.add(cur.props.keycard);
    }
    pickpocket.reset(payload.hasKeycard);
    for (const item of pickups.items) item.collected = payload.collected.includes(item.id);
    cur.props.reset(payload.collected);
    cur.flags = { ...payload.flags };
    if (cur.flags.safeOpened && cur.props.safe) {
      cur.props.safe.open = state.hasStar ? 0 : 1;
      cur.props.safe.hinge.rotation.y = state.hasStar ? 0 : -Math.PI * 0.6;
      cur.props.safe.gem.visible = !state.hasStar;
    }
    if (cur.flags.sensorDisabled) cur.props.setPanel('tamper_panel', 0x23ff7a);
    if (cur.flags.nightEntry) cur.props.setPanel('reader', 0x23ff7a);
    cur.wing?.setLive(cur.flags.rig ? cur.cctv.feeds : null);
    cur.plates.reset();
    cur.cctvSystem.reset();
    for (const g of cur.guards) g.reset();
    for (const s of payload.sleeping ?? []) {
      const g = cur.guards.find((guard) => guard.id === s.id);
      if (!g) continue;
      g.position.set(s.x, g.position.y, s.z);
      if (g.actor?.root) { g.actor.root.rotation.y = s.yaw; g.actor.root.rotation.z = 1.45; }
      // At least a few seconds, so a checkpoint saved just before he woke is still usable.
      g.sedate(Math.max(s.sleep, CHECKPOINT_MIN_SLEEP));
    }
    alarm.reset(payload.alarm, 'checkpoint');
    resetEcho();
    stamina.reset();
    field.clear();
    state.inSafe = false;
    state.ended = null;
    state.damage = 0;
    state.exposure = 0;
    state.socialHeat = 0;
    state.lifting = false;
    state.witnessCooldown = 0;
    state.spawnGrace = 2.5;
    state.zip = null;
    endZip();
    camera.fov = 68; camera.updateProjectionMatrix();
    state.vent = null;
    state.climb = null;
    ui.fade.classList.remove('is-on');
    ui.fade.style.transition = '';
    state.dampen = false;
    hud.end(null);
    hud.safe(false);
    hud.clearTransient();
    // Same combination after a retry, so a caught player can find the tumblers again.
    if (cur.n === 2) safe = createSafecrackSystem({ combination: (state.safeCombo ??= randomCombination()), events });
    if (cur.n === 3) {
      cur.timeLeft = Math.max(payload.timeLeft || cur.data.lockdownSeconds, 90);
      alarm.setFloor(55, 'lockdown');
      if (cur.flags.armed) cur.props.plates.forEach((_, i) => cur.props.setPlate(i, false, true));
      if (cur.flags.hatch) openHatch(true);
      // The shutter seals behind the escape; its collision follows its visible lift.
    }
    setMode(LEVEL_MODE[cur.n]);
  }

  function enterLevel(n, arrival = null) {
    if (!arrival) for (const key of Object.keys(keys)) keys[key] = false;
    if (!arrival) state.transit = null;
    loadLevel(n);
    state.hasKeycard = n > 1 || state.hasKeycard;
    const s = cur.data.spawn;
    const spawn = { x: s[0], y: s[1], z: s[2], yaw: n === 1 ? Math.atan2(-6, 21) : 0 };
    let start = spawn;
    if (arrival) {
      const t = inLock.transform;
      const w = t.toWorld(arrival.x, arrival.z);
      start = { x: w.x, y: t.y, z: w.z, yaw: arrival.yaw + t.yaw };
    }
    const payload = {
      level: n,
      player: start,
      hasKeycard: state.hasKeycard,
      hasStar: state.hasStar,
      flags: {},
      collected: pickups.items.filter((i) => i.collected).map((i) => i.id),
      alarm: 0,
      timeLeft: cur.data.lockdownSeconds ?? 0
    };
    if (n === 2) state.safeCombo = randomCombination();
    restore(payload);
    if (arrival) player.pitch = arrival.pitch;
    const first = snapshotCheckpoint();
    first.player = spawn;
    checkpoints.save(n === 1 ? 'start' : 'level-' + n, first);
    story.setLevel(n);
    screens.setLevel(n);
    state.attract = 0;
    return cur.ready;
  }

  function newHeist() {
    learning.reset(); learningView.reset();
    safe = createSafecrackSystem({ combination: randomCombination(), events });
    state.detections = 0;
    state.time = 0;
    state.hasKeycard = false;
    state.hasStar = false;
    checkpoints.clear();
    for (const item of pickups.items) item.collected = false;
    return enterLevel(1);
  }

  function openHatch(instant = false) {
    cur.flags.hatch = true;
    cur.built.collision.unblock('hatch');
    if (instant) {
      cur.props.hatch.lift = 2.6;
      cur.props.hatch.mesh.position.y = cur.props.hatch.base + 2.6;
    }
    cur.props.setPanel('roof_override', 0x23ff7a);
    if (!instant && pickups.snapshot().evidence.length >= EVIDENCE_TOTAL && !cur.flags.uploaded) {
      cur.flags.uploaded = true;
      events.emit('evidence:uploaded', {});
      hud.toast('EVIDENCE SENT · DEX’S ORDERS AND PAYMENT', 4);
    }
  }

  function startPassage(level) {
    audio.siren(false);
    if (state.transit) return;
    state.transit = { stage: 'entering', lock: outLock, level, timer: 0, sealed: false };
    outLock.setDoor('near', 1);
    hud.prompt(null);
    hud.toast(level === 1 ? 'SERVICE PASSAGE · WALK THROUGH' : 'SERVICE PASSAGE · KEEP MOVING', 2.5);
  }

  function beginNextLevel() {
    const t = state.transit;
    const local = outLock.local(player.position.x, player.position.z);
    const arrival = { x: local.x, z: local.z, yaw: player.yaw - outLock.transform.yaw, pitch: player.pitch };
    t.lock = inLock;
    t.stage = 'loading';
    t.sealed = true;
    const next = t.level + 1;
    enterLevel(next, arrival);
    state.transit = t;
    inLock.setDoor('near', 0, true);
    inLock.setDoor('far', 0, true);
    const loaded = cur;
    return cur.ready.then(() => {
      if (state.transit !== t || cur !== loaded) return;
      t.stage = 'arriving';
      t.sealed = false;
      inLock.setDoor('far', 1);
    });
  }

  function updateTransit(dt) {
    inLock.update(dt);
    outLock.update(dt);
    const t = state.transit;
    if (!t) return false;
    t.timer += dt;
    if (t.stage === 'entering') {
      if (t.level === 1) hall.setLobbyDoors(Math.min(1, t.timer * 1.6));
      const p = outLock.local(player.position.x, player.position.z);
      if (outLock.contains(player.position.x, player.position.z, player.base) && p.z < -AIRLOCK.length * 0.45) {
        t.stage = 'sealing';
        t.timer = 0;
        t.sealed = true;
        outLock.setDoor('near', 0);
      }
      return false;
    }
    if (t.stage === 'sealing') {
      if (t.level === 1) hall.setLobbyDoors(Math.max(0, 1 - t.timer * 1.6));
      if (outLock.doors.near.open > 0) return false;
      t.stage = 'debrief';
      events.emit('level:complete', { level: t.level, seamless: true });
      screens.stageComplete(t.level, () => beginNextLevel());
      return true;
    }
    if (t.stage === 'arriving') {
      const p = inLock.local(player.position.x, player.position.z);
      const clear = p.z < -AIRLOCK.length - 0.7 || Math.abs(p.x) > AIRLOCK.half + 0.8;
      if (clear && !inLock.contains(player.position.x, player.position.z, player.base) && cur.collision.inside(player.position.x, player.position.z, 0.4, player.base)) {
        inLock.setDoor('far', 0);
        state.transit = null;
      }
    }
    return false;
  }

  function renderPassage(dt) {
    const lock = state.transit.lock;
    const local = lock.local(camera.position.x, camera.position.z);
    airCamera.aspect = camera.aspect;
    airCamera.fov = camera.fov;
    airCamera.updateProjectionMatrix();
    airCamera.position.set(local.x, camera.position.y - lock.transform.y, local.z);
    airCamera.rotation.set(camera.rotation.x, camera.rotation.y - lock.transform.yaw, 0);
    renderer.setRenderTarget(null);
    renderer.render(airScene, airCamera);
  }

  function passageFrame(dt) {
    const t = state.transit;
    if (!screens.blocking) {
      updatePlayer(dt, elapsed);
      inLock.update(dt);
      outLock.update(dt);
    }
    hud.objective('Walk through the service passage');
    hud.prompt(null);
    hud.hint('');
    guide.update(dt, player.position, { hidden: true });
    hud.update(dt);
    story.update(state.locked ? dt : 0, { ...player, damped: state.dampen }, []);
    screens.update(screens.blocking ? 0 : dt);
    if (!state.skipRender) renderPassage(dt);
    return t;
  }

  function guideTarget() {
    if (state.transit) {
      const lock = state.transit.lock;
      const w = lock.transform.toWorld(0, -AIRLOCK.length - 1);
      return { pos: new THREE.Vector3(w.x, lock.transform.y + 1.4, w.z), label: 'PASSAGE', glow: false };
    }
    const at = (p, label, glow = true) => ({ pos: new THREE.Vector3(p[0], p[1], p[2]), label, glow });
    const phase = missionPhase(cur.n, state, cur.flags).id;
    const u = cur.use;
    if (cur.n === 1) {
      if (phase === 'rig') {
        if (player.position.x < 11.3) return at([11.05, 1.3, -19.5], 'EAST STAFF DOOR');
        if (player.position.x < 17) return at([18, 1.3, -19.5], 'SECURITY OFFICE');
        return at(u.security_desk.pos, 'LINK CAMERA TAP');
      }
      if (phase === 'badge' && cur.okafor) return { pos: cur.okafor.position.clone().setY(2.1), label: 'OKAFOR', glow: false };
      if (phase === 'reader') return at([u.vault_door.usePos[0], 1.5, u.vault_door.usePos[2] - 0.4], 'STAFF READER');
      return at(u.gala_exit.pos, 'LOBBY EXIT');
    }
    if (cur.n === 2) {
      if (phase === 'circuit') return at(u.tamper_panel.pos, 'SERVICE PANEL');
      if (phase === 'safe' || phase === 'star') return at(u.safe.pos, phase === 'star' ? 'THE STAR' : 'SAFE');
      return at(u.service_exit.pos, 'FIRE DOOR');
    }
    if (phase === 'shutter') return echo.snapshot().mode === 'replaying' ? at([0, 1.4, -21.8], 'CROSS SHUTTER') : at(u.shutter_hold.pos, 'OVERRIDE');
    if (phase === 'sensors') {
      if (player.base < 10) return at([u.stairs.usePos[0], 1.4, u.stairs.usePos[2]], 'STAIRWELL');
      const free = cur.plates.plates.find((p) => !p.occupants.length) ?? cur.plates.plates[0];
      return at([free.x, 20.3, free.z], 'SENSOR PLATE');
    }
    if (phase === 'hatch') return at(u.roof_override.pos, 'ROOF OVERRIDE');
    return at(u.zip.pos, 'ZIPLINE');
  }

  function nearbyEvidence() {
    let best = null;
    for (const item of pickups.items) {
      if (item.collected || item.stage !== cur.n || item.type !== 'evidence') continue;
      const d = Math.hypot(item.x - player.position.x, item.z - player.position.z);
      if (Math.abs(item.y - player.base) < 3 && d < 6 && (!best || d < best.d)) best = { d, item };
    }
    return best ? { pos: new THREE.Vector3(best.item.x, best.item.y + 0.25, best.item.z), label: 'EVIDENCE', glow: true } : null;
  }

  function updateGuide(dt) {
    const busy = state.inSafe || state.vent || state.climb || state.zip || state.ended || cur.cctv.active >= 0;
    guide.set(guideTarget());
    minimap.setObjective(busy ? null : guideTarget());
    guide.setExtra(nearbyEvidence());
    guide.update(dt, player.position, { hidden: busy || screens.inMenu });
    const phase = state.transit ? 'passage' : missionPhase(cur.n, state, cur.flags).id;
    if (cur.phase.id !== phase) {
      cur.phase.id = phase; cur.phase.time = 0;
      if (!busy && !screens.blocking) guide.announce(objectiveText());
      return;
    }
    if (state.ended || state.transit || screens.blocking) return;
    cur.phase.time += dt;
    if (cur.phase.time > 40) {
      cur.phase.time = 0;
      story.trigger('hint:' + phase);
    }
  }

  function complete(level, message) {
    if (state.ended) return;
    state.ended = 'won';
    state.inSafe = false;
    hud.safe(false);
    hud.prompt(null);
    if (message) hud.toast(message, 3);
    events.emit('level:complete', { level });
  }

  events.on('player:detected', ({ id }) => {
    if (cur.n === 1) cur.flags.coverBlown = true;
    state.detections += 1;
    alarm.raise(ALARM_RAISE.detected, 'detected');
    hud.toast(id.toUpperCase() + ' SPOTTED YOU');
  });
  events.on('player:caught', () => {
    if (state.ended) return;
    state.ended = 'caught';
    state.inSafe = false;
    hud.safe(false);
    hud.end('caught', summary());
  });
  events.on('camera:detected', ({ id }) => {
    if (cur.n === 1) cur.flags.coverBlown = true;
    alarm.raise(ALARM_RAISE.camera, 'camera');
    hud.toast((cur.cameraDefs[id]?.name ?? 'A CAMERA') + ' SAW YOU · SECURITY IS ON THE WAY', 3);
    for (const g of cur.guards) g.hear(player.position, 1, { urgent: true });
  });
  events.on('alarm:lockdown', () => {
    alarm.setFloor(90, 'lockdown');
    setMode('lockdown');
    hud.toast(cur?.n === 3 ? 'FULL LOCKDOWN · THEY KNOW WHERE YOU ARE' : 'LOCKDOWN · THE BUILDING IS SEALING', 3.5);
  });
  events.on('pickpocket:complete', () => {
    state.hasKeycard = true;
    // The original remains on Okafor: Wren has skimmed its access code, not
    // stolen an obvious missing object that would end the operation at once.
    hud.toast('BADGE COPIED · ORIGINAL UNTOUCHED');
    checkpoints.save('keycard', snapshotCheckpoint());
  });
  events.on('item:picked', (item) => {
    const mesh = cur.props.loot.get(item.id);
    if (mesh) mesh.visible = false;
    if (item.id === 'kestrel_star') {
      state.hasStar = true;
      cur.props.safe.gemLight.intensity = 0;
      events.emit('diamond:taken', {});
      checkpoints.save('level-2-star', snapshotCheckpoint());
    }
    hud.toast(item.type === 'evidence' ? 'EVIDENCE · ' + item.label.toUpperCase() : item.label.toUpperCase() + ' · $' + item.value.toLocaleString('en-US'));
  });
  events.on('plate:change', ({ id, active }) => {
    if (cur.flags.armed) return;
    cur.props.setPlate(cur.props.plates.findIndex((p) => p.id === id), active);
  });
  events.on('safe:noise', ({ noise }) => {
    if (state.safeNoise > 0) return;
    state.safeNoise = 0.6;
    emitNoise(v3(cur.use.safe.usePos), RING_COLOURS.alert, 3 + noise * 9, { source: 'safe', strength: noise, cause: 'override' });
  });
  events.on('safe:miss', () => { alarm.raise(4, 'safe'); hud.toast('MISSED · THE TUMBLER SLIPPED'); });
  events.on('safe:tumbler-set', ({ tumbler, opened }) => {
    if (!opened) hud.toast('TUMBLER ' + (tumbler + 1) + ' SET');
    emitNoise(v3(cur.use.safe.usePos), RING_COLOURS.player, 2.5, { source: 'safe', damped: true, strength: 0.6 });
  });
  events.on('safe:opened', () => {
    state.inSafe = false;
    hud.safe(false);
    const s = cur.props.safe;
    s.open = 0.0001;
    s.gem.visible = true;
    s.gemLight.intensity = 6;
    cur.flags.safeOpened = true;
    hud.toast('SAFE OPEN · E TO TAKE THE STAR', 4);
  });
  events.on('echo:shattered', () => {
    hologram.dissolve(true);
    state.fadeEcho = 1.2;
    alarm.raise(ALARM_RAISE.echoCaught, 'echoCaught');
    hud.toast('YOUR ECHO WAS CAUGHT');
  });
  events.on('echo:complete', () => { hologram.dissolve(true); state.fadeEcho = 1.2; });

  function summary() {
    const s = pickups.snapshot();
    return [
      'TIME ' + clockText(state.time),
      'TAKE $' + s.cash.toLocaleString('en-US'),
      'EVIDENCE ' + s.evidence.length + '/' + EVIDENCE_TOTAL,
      'SPOTTED ' + state.detections
    ].join(' · ');
  }

  function toggleEcho() {
    if (cur.n < 3) { hud.toast('ECHO RIG OFFLINE UNTIL LEVEL 3'); return; }
    const mode = echo.snapshot().mode;
    if (mode === 'recording') {
      const rewind = echo.stop();
      if (!rewind) return;
      echoActor.root.visible = true;
      echoMarker.mesh.visible = true;
      hologram.setDissolve(0);
      if (state.climb) { state.climb = null; cur.props.setStairDoors(false); }
      echoActor.root.position.set(rewind.x, rewind.y ?? 0, rewind.z);
      state.echoLast.copy(echoActor.root.position);
      placePlayer(rewind.x, rewind.y ?? 0, rewind.z, rewind.yaw);
      hud.toast('REWIND · YOUR ECHO IS REPLAYING');
      emitNoise(player.position, RING_COLOURS.echo, 4, { source: 'echo', damped: true });
    } else if (mode !== 'replaying') {
      resetEcho();
      echo.start(echoFrame());
      hud.toast('RECORDING ECHO · R TO REWIND');
    }
  }

  function echoFrame() {
    return { x: player.position.x, y: player.base, z: player.position.z, yaw: player.yaw, pitch: player.pitch, crouching: player.profile.id === 'crouch' || player.profile.id === 'crawl', interacting: Boolean(keys.KeyE), mode: player.profile.id };
  }

  let echoNow = null;
  function updateEcho(dt, time) {
    echoNow = null;
    const snap = echo.snapshot();
    if (snap.mode === 'recording') echo.record(dt, echoFrame());
    if (snap.mode === 'replaying') {
      const frame = echo.replay(dt);
      if (frame) {
        echoNow = frame;
        echoActor.root.position.set(frame.x, frame.y ?? 0, frame.z);
        echoActor.root.rotation.y = frame.yaw + Math.PI;
        const moved = state.echoLast.distanceTo(echoActor.root.position);
        echoActor.play(moved / Math.max(dt, 1e-3) > 0.4 ? 'walk' : 'idle', 0.2);
        state.echoStep += moved;
        state.echoLast.copy(echoActor.root.position);
        if (state.echoStep > 1.4 && moved < 2) {
          state.echoStep = 0;
          emitNoise(echoActor.root.position, RING_COLOURS.echo, frame.mode === 'run' || frame.mode === 'sprint' ? 5 : 2.6, { source: 'echo', strength: 0.7, cause: 'echo' });
        }
        for (const g of cur.guards) if (!(g.sleep > 0) && g.position.distanceTo(echoActor.root.position) < 1.1) echo.shatter('guard');
      }
    }
    if (state.fadeEcho > 0) {
      state.fadeEcho -= dt;
      if (state.fadeEcho <= 0) {
        echoActor.root.visible = false;
        echoMarker.mesh.visible = false;
      }
    }
    if (echoActor.root.visible) echoActor.update(dt);
    hologram.update(dt, time);
    const m = echo.snapshot();
    hud.echo({ enabled: cur.n === 3, ...m });
  }

  const trolley = new THREE.Group();
  {
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3a6, metalness: 0.8, roughness: 0.35 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xd9822b, metalness: 0.3, roughness: 0.6 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.34), orange);
    plate.position.y = -0.06;
    trolley.add(plate);
    trolley.userData.wheels = [-0.1, 0.1].map((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), steel);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0.04, 0, z);
      trolley.add(wheel);
      return wheel;
    });
    const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), steel);
    hanger.position.y = -0.38;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), steel);
    grip.rotation.z = Math.PI / 2;
    grip.position.y = -0.6;
    trolley.add(hanger, grip);
    trolley.visible = false;
    scene.add(trolley);
    minimap.hideFromMap(trolley);
  }
  const zipPose = { cable: new THREE.Vector3(), dir: new THREE.Vector3(), side: new THREE.Vector3(), eye: new THREE.Vector3() };

  function hangPose() {
    const bones = wren.model.skeleton.bones;
    const bone = (name) => bones.find((b) => b.name === name);
    bone('arm--1')?.rotation.set(0, 0, -(Math.PI - 0.22));
    bone('arm-1')?.rotation.set(0, 0, Math.PI - 0.22);
    bone('elbow-0') && (bone('elbow-0').rotation.x = 0);
    bone('elbow-1') && (bone('elbow-1').rotation.x = 0);
    bone('leg--1') && (bone('leg--1').rotation.x = -0.35);
    bone('leg-1') && (bone('leg-1').rotation.x = -0.2);
    bone('knee-0') && (bone('knee-0').rotation.x = 0.5);
    bone('knee-1') && (bone('knee-1').rotation.x = 0.3);
  }

  function endZip() {
    trolley.visible = false;
    avatar.visible = true;
    zipRig.hide();
  }

  function updateZip(dt) {
    const z = state.zip;
    z.elapsed += dt;
    const mount = Math.min(1, z.elapsed / 0.9);
    z.t = THREE.MathUtils.clamp((z.elapsed - 0.9) / 7.6, 0, 1);
    const { start, end } = cur.props.zip;
    const e = Math.pow(z.t, 1.3);
    const sag = Math.sin(e * Math.PI) * 0.35;
    zipPose.cable.lerpVectors(start, end, e);
    zipPose.cable.y -= sag;
    zipPose.dir.copy(end).sub(start).normalize();
    zipPose.side.set(-zipPose.dir.z, 0, zipPose.dir.x).normalize();
    const wantLean = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    z.lean += (wantLean - z.lean) * Math.min(1, dt * 4);
    const swing = Math.sin(elapsed * 2.2) * 0.05 * Math.sin(e * Math.PI) + z.lean * 0.25 * Math.sin(e * Math.PI);
    const ride = facing(zipPose.dir.x, zipPose.dir.z);
    trolley.visible = true;
    trolley.position.copy(zipPose.cable);
    trolley.rotation.set(0, ride + Math.PI, swing * 0.4);
    for (const w of trolley.userData.wheels) w.rotation.x += dt * (z.t > 0 && z.t < 1 ? 40 : 0);
    zipPose.eye.copy(zipPose.cable).addScaledVector(zipPose.side, swing);
    zipPose.eye.y -= 1.1;
    const outside = z.t > 0.32 && z.t < 0.7;
    if (outside) {
      zipRig.hide();
      avatar.visible = true;
      avatar.position.copy(zipPose.eye).setY(zipPose.eye.y - 1.55);
      avatar.rotation.set(0, ride + Math.PI, swing * 0.5);
      avatarBody.rotation.set(0, 0, 0); avatarBody.position.set(0, 0, 0); avatarBody.scale.set(1, 1, 1);
      wren.play('idle');
      wren.update(dt);
      hangPose();
      const k = (z.t - 0.32) / 0.38;
      camera.position.copy(zipPose.eye)
        .addScaledVector(zipPose.side, 2.4 - k * 0.5)
        .addScaledVector(zipPose.dir, 1.6 - k * 3.4);
      camera.position.y += 0.1 - k * 0.3;
      camera.layers.enable(LAYER_AVATAR);
      camera.lookAt(zipPose.eye.x, zipPose.eye.y - 0.15, zipPose.eye.z);
      camera.fov = 66; camera.updateProjectionMatrix();
    } else {
      avatar.visible = false;
      camera.layers.enable(LAYER_AVATAR);
      camera.position.copy(zipPose.eye);
      camera.position.lerp(z.from, 1 - mount);
      let pitch = -0.12 + Math.sin(elapsed * 7) * 0.008 * e - (1 - mount) * 0.5;
      if (z.t >= 1) {
        z.land = (z.land ?? 0) + dt;
        const k = Math.min(1, z.land / 0.9);
        camera.position.addScaledVector(zipPose.dir, k * 1.2);
        camera.position.y -= Math.sin(k * Math.PI) * 0.7 + k * 0.25;
        pitch -= Math.sin(k * Math.PI) * 0.45;
      }
      camera.rotation.set(pitch, ride, -z.lean * 0.045);
      camera.fov = 68 + Math.sin(e * Math.PI) * 8; camera.updateProjectionMatrix();
      zipRig.update(z.t >= 1 ? Math.max(0, 1 - (z.land ?? 0) * 2) : mount, e, z.lean, elapsed);
    }
    if (z.t >= 1 && (z.land ?? 0) > 0.9 && !z.done) {
      z.done = true;
      endZip();
      events.emit('zipline:complete', { id: 'roof-line' });
      complete(3, 'OUT OVER THE RAIN');
    }
  }

  function updateVent(dt, time) {
    const v = state.vent;
    const movement = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    v.distance = THREE.MathUtils.clamp(v.distance + movement * dt * 1.65, 0, v.path.length);
    const pose = v.path.sample(v.distance);
    player.position.set(pose.x, pose.y, pose.z); player.base = pose.y;
    player.yaw += Math.atan2(Math.sin(pose.yaw - player.yaw), Math.cos(pose.yaw - player.yaw)) * Math.min(1, dt * 8);
    player.height += (0.44 - player.height) * Math.min(1, dt * 10);
    player.profile = MOVEMENT.crawl; player.moving = movement !== 0;
    camera.position.set(pose.x, pose.y + player.height + (movement ? Math.sin(time * 8) * 0.012 : 0), pose.z);
    camera.rotation.set(-0.04, player.yaw, movement ? Math.sin(time * 5) * 0.008 : 0);
    if (v.distance >= v.path.length || (v.distance <= 0 && movement < 0)) {
      cur.flags.vented = true; state.vent = null;
      emitNoise(player.position, RING_COLOURS.alert, 6, { source: 'vent', strength: 0.8, cause: 'footstep' });
      hud.toast('CLEAR OF THE DUCT', 2);
    } else hud.prompt('W / S · CRAWL THROUGH THE DUCT', v.distance / v.path.length);
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;
  }

  // The Level 3 stairwell: W climbs and S goes back down, along the path in the level data.
  const CLIMB_SPEED = 3.4;
  function updateClimb(dt, time) {
    const c = state.climb;
    const movement = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    c.distance = THREE.MathUtils.clamp(c.distance + movement * dt * CLIMB_SPEED, 0, c.path.length);
    const pose = c.path.sample(c.distance);
    player.position.set(pose.x, pose.y, pose.z); player.base = pose.y;
    player.yaw += Math.atan2(Math.sin(pose.yaw - player.yaw), Math.cos(pose.yaw - player.yaw)) * Math.min(1, dt * 6);
    player.height += (1.62 - player.height) * Math.min(1, dt * 10);
    player.profile = MOVEMENT.walk; player.moving = movement !== 0;
    const rising = c.path.sample(c.distance + 0.3).y - pose.y;
    camera.position.set(pose.x, pose.y + player.height + (movement ? Math.sin(time * 9) * 0.03 : 0), pose.z);
    camera.rotation.set(rising > 0.05 ? 0.18 : -0.04, player.yaw, 0);
    c.step += Math.abs(movement) * dt * CLIMB_SPEED;
    if (c.step > 0.8) { c.step = 0; emitNoise(player.position, RING_COLOURS.player, 2.4, { source: 'player', damped: state.dampen, strength: 0.5 }); }
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;
    if (c.distance >= c.path.length) {
      const to = cur.use.stairs.to;
      state.climb = null;
      cur.props.setStairDoors(false);
      placePlayer(to[0], to[1], to[2], facing(-to[0], -60 - to[2]));
      hud.toast('STAIRWELL · TOP FLOOR');
      checkpoints.save('level-3-roof', snapshotCheckpoint());
    } else if (c.distance <= 0 && movement < 0) {
      const from = cur.use.stairs.usePos;
      state.climb = null;
      cur.props.setStairDoors(false);
      placePlayer(from[0], from[1], from[2] + 0.6, Math.PI);
    } else hud.prompt('W CLIMB  ·  S BACK DOWN', c.distance / c.path.length);
  }

  function thirdAllowed() {
    return view.third && !state.inSafe && !state.vent && !state.climb && !state.zip && !state.transit?.sealed && cur.cctv.active < 0;
  }

  function poseAvatar(dt) {
    avatar.position.set(player.position.x, player.base + player.y, player.position.z);
    avatar.rotation.y = player.yaw + Math.PI;
    const id = player.profile.id;
    const crawl = id === 'crawl';
    const crouch = id === 'crouch';
    avatarBody.rotation.x += ((crawl ? 1.42 : 0) - avatarBody.rotation.x) * Math.min(1, dt * 8);
    avatarBody.position.y += ((crawl ? 0.14 : 0) - avatarBody.position.y) * Math.min(1, dt * 8);
    avatarBody.position.z += ((crawl ? -0.8 : 0) - avatarBody.position.z) * Math.min(1, dt * 8);
    const squash = crouch ? 0.64 : 1;
    avatarBody.scale.y += (squash - avatarBody.scale.y) * Math.min(1, dt * 8);
    wren.play(!player.moving ? 'idle' : id === 'run' || id === 'sprint' ? 'run' : 'walk');
    wren.update(dt * (crawl ? 0.6 : 1));
  }

  function applyView(dt) {
    poseAvatar(dt);
    const third = thirdAllowed();
    if (third) camera.layers.enable(LAYER_AVATAR); else camera.layers.disable(LAYER_AVATAR);
    if (!third) return;
    view.eye.set(player.position.x, player.base + player.y + Math.max(0.5, player.height * 0.92), player.position.z);
    const cp = Math.cos(player.pitch);
    const back = view.back.set(Math.sin(player.yaw) * cp, -Math.sin(player.pitch), Math.cos(player.yaw) * cp);
    const right = view.right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const wanted = player.profile.id === 'crawl' ? 1.9 : 2.6;
    let reach = 0.3;
    for (let d = 0.3; d <= wanted; d += 0.1) {
      view.step.copy(view.eye).addScaledVector(back, d).addScaledVector(right, 0.42 * (d / wanted));
      const ceiling = player.base + (cur.n === 1 && player.position.x < 11.3 ? 9.4 : 2.9);
      if (view.step.y > ceiling || view.step.y < player.base + 0.2 || !canStand(view.step.x, view.step.z, 0.18, player.base)) break;
      reach = d;
    }
    view.distance += (reach - view.distance) * Math.min(1, dt * (reach < view.distance ? 18 : 5));
    view.want.copy(view.eye).addScaledVector(back, view.distance).addScaledVector(right, 0.42 * (view.distance / wanted));
    camera.position.copy(view.want);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  function updatePlayer(dt, time) {
    if (!thirdAllowed()) camera.layers.disable(LAYER_AVATAR);
    if (state.zip) { updateZip(dt); return; }
    if (state.vent) { updateVent(dt, time); return; }
    if (state.climb) { updateClimb(dt, time); return; }
    if (state.inSafe || state.ended || cur.cctv.active >= 0) return;
    state.stun = Math.max(0, (state.stun ?? 0) - dt);
    const stam = stamina.snapshot();
    let profile = movementProfile(keys, { damped: state.dampen });
    if (profile.id === 'sprint' && !stam.canSprint) profile = movementProfile(keys, { damped: state.dampen, mode: MOVEMENT.run });
    player.profile = profile;
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.1 * dt;
    player.pitch = THREE.MathUtils.clamp(player.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.5 * dt, -1.3, 1.3);
    player.moving = (f !== 0 || s !== 0) && state.stun <= 0;
    if (!canStand(player.position.x, player.position.z)) unstick();
    stamina.update(dt, player.moving && profile.id === 'sprint');
    if (player.moving) {
      tmp.dir.set(s, 0, -f).normalize().applyAxisAngle(tmp.up, player.yaw).multiplyScalar(profile.speed * dt);
      if (canStand(player.position.x + tmp.dir.x, player.position.z)) player.position.x += tmp.dir.x;
      if (canStand(player.position.x, player.position.z + tmp.dir.z)) player.position.z += tmp.dir.z;
      player.step -= dt;
      if (player.step <= 0 && player.y <= 0) {
        player.step = profile.step * 0.6;
        emitNoise(player.position, RING_COLOURS.player, profile.radius * RING_SCALE, { source: 'player', damped: state.dampen, strength: 0.8, cause: 'footstep' });
      }
    }
    if (player.y > 0 || player.vy > 0) {
      player.vy -= 13 * dt;
      player.y = Math.max(0, player.y + player.vy * dt);
      if (player.y === 0) {
        player.vy = 0;
        emitNoise(player.position, RING_COLOURS.player, 4.5, { source: 'player', damped: state.dampen, cause: 'footstep' });
      }
    }
    player.height += (profile.height - player.height) * Math.min(1, dt * 10);
    const bob = player.moving && player.y === 0 ? Math.sin(time * (profile.id === 'run' || profile.id === 'sprint' ? 12 : 8.5)) * 0.025 : 0;
    camera.position.set(player.position.x, player.base + player.y + player.height + bob, player.position.z);
    if (state.shake > 0) {
      state.shake = Math.max(0, state.shake - dt);
      camera.position.x += (Math.random() - 0.5) * state.shake * 0.2;
      camera.position.y += (Math.random() - 0.5) * state.shake * 0.2;
    }
    camera.rotation.set(player.pitch, player.yaw, 0);
    applyView(dt);
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;

    if (!cur.lasers) return;
    state.laserCooldown = Math.max(0, state.laserCooldown - dt);
    // Crouching or crawling counts from the moment the key goes down, so pressing Z right
    // at the beam works (the camera still eases down over a few frames).
    const bodyHeight = Math.min(player.height, player.profile.height + 0.15);
    const hit = cur.lasers.hitsBody(player.position, { height: bodyHeight, jump: player.y, base: player.base });
    if (!hit) { state.lastClear.set(player.position.x, player.base, player.position.z); return; }
    // A beam is a barrier as well as an alarm: Wren is thrown back off it, stunned for a
    // moment, and has to crawl, jump or time it properly to get past.
    knockBack();
    // Bumping the same beam again while learning it only knocks Wren back; the alarm
    // rises once per 4 seconds of contact, not on every bump.
    if (state.laserCooldown > 0) return;
    state.laserCooldown = 4;
    state.damage = 1;
    state.shake = 0.45;
    // Less than the full laser raise: Wren can now fail a beam and retry, so a few
    // learning mistakes should not hand straight over to lockdown.
    alarm.raise(LASER_TRIP_ALARM, 'laser');
    events.emit('hazard:trip', { kind: 'laser' });
    emitNoise(player.position, RING_COLOURS.alert, 10, { source: 'laser', strength: 1 });
    // The trip reports a location: every guard on the floor comes to check it.
    // Urgent: they hurry over and look around longer than for a footstep.
    for (const g of cur.guards) g.hear(player.position, 1, { urgent: true });
    hud.toast(cur.guards.length ? 'LASER TRIPPED · SECURITY IS COMING TO CHECK' : 'LASER TRIPPED');
  }

  function knockBack() {
    // Throw Wren off the nearest beam, to the side she is already on. A rising or
    // blinking beam can come down on her after she has crossed it; she lands past it
    // then, never back through it.
    const px = player.position.x, pz = player.position.z;
    let best = null;
    for (const l of cur.lasers.lasers) {
      if (!l.active) continue;
      const ex = l.b.x - l.a.x, ez = l.b.z - l.a.z;
      const t = THREE.MathUtils.clamp(((px - l.a.x) * ex + (pz - l.a.z) * ez) / Math.max(ex * ex + ez * ez, 1e-6), 0, 1);
      const cx = l.a.x + ex * t, cz = l.a.z + ez * t;
      const d = Math.hypot(px - cx, pz - cz);
      if (!best || d < best.d) best = { cx, cz, d, nx: -ez, nz: ex };
    }
    let dx, dz, cx = px, cz = pz;
    if (best) {
      cx = best.cx; cz = best.cz;
      const n = Math.hypot(best.nx, best.nz) || 1;
      dx = best.nx / n; dz = best.nz / n;
      // Pick the normal pointing to Wren's side (or back where she came from if she is dead on it).
      const side = best.d > 0.02 ? (px - cx) * dx + (pz - cz) * dz : (state.lastClear.x - cx) * dx + (state.lastClear.z - cz) * dz || 1;
      if (side < 0) { dx = -dx; dz = -dz; }
    } else { dx = Math.sin(player.yaw); dz = Math.cos(player.yaw); }
    let x = px, z = pz;
    for (let push = 0.9; push > 0.25; push -= 0.15) {
      if (canStand(cx + dx * push, cz + dz * push)) { x = cx + dx * push; z = cz + dz * push; break; }
    }
    player.position.x = x;
    player.position.z = z;
    player.y = 0;
    player.vy = 0;
    state.stun = 0.5;
  }

  function unstick() {
    const { x, z } = player.position;
    const level = (nx, nz) => cur.collision.inside(nx, nz, 0.35, player.base);
    for (const ok of state.transit?.sealed ? [canStand] : [level, canStand]) {
      for (let r = 0.1; r <= 1.6; r += 0.1) {
        for (let a = 0; a < 24; a += 1) {
          const nx = x + Math.cos(a / 24 * Math.PI * 2) * r, nz = z + Math.sin(a / 24 * Math.PI * 2) * r;
          if (ok(nx, nz) && canStand(nx, nz)) { player.position.x = nx; player.position.z = nz; return true; }
        }
      }
    }
    return false;
  }

  function updateExposure(dt) {
    let lit = state.mode !== 'night';
    if (!lit && !state.dampen) {
      for (const ring of field.rings) {
        if (ring.source === 'echo') continue;
        if (Math.abs(ring.position.y - player.base) > 3) continue;
        if (field.reached(player.position, ring)) { lit = true; break; }
      }
    }
    state.exposure = lit ? 0.65 : Math.max(0, state.exposure - dt);
  }

  function stance() {
    return player.profile.id === 'crouch' || player.profile.id === 'crawl';
  }

  function interactionAt() {
    if (cur.n === 1) {
      if (!state.transit && near(player.position, cur.use.gala_exit.usePos, 2)) return { id: 'gala_exit', text: cur.flags.nightEntry ? 'E · LEAVE THE GALA' : 'NIGHT ENTRY NOT READY · COMPLETE THE RECON' };
      const desk = cur.use.security_desk;
      if (!cur.flags.rig && near(player.position, desk.usePos, 1.4)) return { id: 'security_desk', text: 'HOLD E · LINK CAMERA TAP', progress: (cur.flags.rigProgress ?? 0) / desk.holdSeconds };
      const door = cur.use.vault_door;
      if (near(player.position, door.usePos, 1.9)) return { id: 'vault_door', text: cur.flags.nightEntry ? 'NIGHT ENTRY BOOKED · RETURN TO THE LOBBY' : state.hasKeycard ? 'E · AUTHORISE 01:30 STAFF ENTRY' : 'STAFF READER · COPY OKAFOR’S BADGE FIRST' };
    }
    if (cur.n >= 2) {
      for (const id of ['vent_in', 'vent_out']) {
        if (near(player.position, cur.use[id].usePos, 1.3)) return { id, text: stance() ? 'E · CRAWL THROUGH THE VENT' : 'VENT · CROUCH OR CRAWL TO FIT' };
      }
    }
    if (cur.n === 2) {
      const panel = cur.use.tamper_panel;
      if (!cur.flags.sensorDisabled && near(player.position, panel.usePos, 1.4)) return { id: 'tamper_panel', text: 'HOLD E · ISOLATE TAMPER CIRCUIT', progress: (cur.flags.panelProgress ?? 0) / panel.holdSeconds };
      if (cur.props.safe.open === 0 && !cur.flags.safeOpened && near(player.position, cur.use.safe.usePos, 1.6)) return { id: 'safe', text: cur.flags.sensorDisabled ? 'E · CRACK THE SAFE' : 'TAMPER SENSOR LIVE · ISOLATE WEST SERVICE PANEL' };
      if (!state.transit && near(player.position, cur.use.service_exit.usePos, 1.25)) return { id: 'service_exit', text: state.hasStar ? 'E · TAKE THE SERVICE FIRE DOOR' : 'SERVICE FIRE DOOR · RECOVER THE STAR FIRST' };
    }
    if (cur.n === 3) {
      const f = cur.flags;
      if (near(player.position, cur.use.shutter_hold.usePos, 1.2)) return { id: 'shutter_hold', text: 'HOLD E · RAISE THE SHUTTER', hold: true };
      if (player.base < 10 && near(player.position, cur.use.stairs.usePos, 1.6)) return { id: 'stairs', text: 'E · TAKE THE STAIRWELL' };
      if (near(player.position, cur.use.roof_override.usePos, 1.3) && !f.hatch) {
        return f.armed ? { id: 'roof_override', text: 'HOLD E · OPEN THE ROOF HATCH', hold: true, progress: (f.override ?? 0) / cur.use.roof_override.holdSeconds } : { id: 'none', text: 'OVERRIDE LOCKED · BOTH PLATES FIRST' };
      }
      if (f.hatch && near(player.position, cur.use.zip.usePos, 1.6)) return { id: 'zip', text: 'E · CLIP ON AND JUMP' };
    }
    return null;
  }

  const SEDATE_SECONDS = 1.1;
  function sedationTarget() {
    if (cur.n > 2 || state.doses <= 0) return null;
    return cur.guards.find((g) => !(g.sleep > 0) && g.state !== 'pursue' && Math.abs(g.position.y - player.base) < 1.5
      && pickpocketAccess(player.position, { position: g.position, yaw: g.yaw, state: g.state, stationary: true }, { range: 1.35 })) ?? null;
  }

  function updateSedation(dt) {
    const g = sedationTarget();
    if (!g) { state.sedating = 0; return false; }
    const name = (g.def?.name ?? g.id).toUpperCase();
    if (!(keys.KeyT && state.locked)) {
      state.sedating = 0;
      if (g === cur.okafor && !state.hasKeycard) return false;
      hud.prompt('HOLD T · SEDATE ' + name + ' · ×' + state.doses, null);
      return true;
    }
    state.sedating += dt;
    hud.prompt('SEDATING ' + name, Math.min(1, state.sedating / SEDATE_SECONDS));
    if (state.sedating < SEDATE_SECONDS) return true;
    state.sedating = 0;
    state.doses -= 1;
    g.sedate(40);
    emitNoise(g.position, RING_COLOURS.player, 2.2, { source: 'player', damped: true, strength: 0.4 });
    hud.toast(name + ' IS OUT · ABOUT 40 SECONDS · ' + (state.doses > 0 ? state.doses + ' DOSE LEFT' : 'NO DOSES LEFT'), 3.5);
    if (cur.n === 1 && player.position.x < 11.3 && galaWitnessNearby(player.position, guests.witnesses)) {
      events.emit('player:detected', { id: 'guest' });
      hud.toast('A GUEST SAW YOU DO IT');
    }
    return true;
  }

  function updateInteractions(dt) {
    state.lifting = false;
    if (state.vent || state.climb) return;
    if (state.ended || state.inSafe || state.zip || cur.cctv.active >= 0) { hud.prompt(null); return; }
    if (updateSedation(dt)) return;
    if (!state.hasKeycard && cur.okafor) {
      const target = { position: cur.okafor.position, yaw: cur.okafor.yaw, state: cur.okafor.state, stationary: (cur.okafor.pauseTimer > 0.5 && cur.okafor.checkingGuest <= 0) || cur.okafor.sleep > 0, id: 'okafor' };
      const inPosition = pickpocketAccess(player.position, target);
      const witnessed = inPosition && galaWitnessNearby(player.position, guests.witnesses);
      state.lifting = inPosition && Boolean(keys.KeyE) && state.locked;
      if (state.lifting && witnessed && state.witnessCooldown <= 0) {
        events.emit('player:detected', { id: 'guest' });
        cur.guards.forEach((guard) => guard.hear(player.position, 1));
        state.socialHeat = 4;
        hud.toast('A GUEST SAW THE BADGE COPY');
        state.witnessCooldown = 5;
      }
      const r = pickpocket.update({
        dt,
        holding: Boolean(keys.KeyE) && state.locked,
        player: player.position,
        guard: target,
        clear: !witnessed
      });
      if (witnessed) { hud.prompt('WAIT · GUESTS CAN SEE OKAFOR'); return; }
      if (r.eligible) { hud.prompt('HOLD E · COPY BADGE CODE' + (state.doses > 0 ? '  ·  HOLD T · SEDATE' : ''), r.progress / PICKPOCKET_SECONDS); return; }
      if (pickpocketAccess(player.position, { ...target, stationary: true })) { hud.prompt('WAIT FOR HIS INSPECTION STOP · NO NEED TO FOLLOW'); return; }
    }
    const item = nearbyPickup();
    if (item && Math.abs(item.y - player.base) < 3) { hud.prompt('E · TAKE ' + item.label.toUpperCase() + (item.value ? ' · $' + item.value.toLocaleString('en-US') : '')); return; }
    const spot = interactionAt();
    if (spot) {
      if (spot.id === 'security_desk') {
        cur.flags.rigProgress = keys.KeyE && state.locked ? (cur.flags.rigProgress ?? 0) + dt : 0;
        if (cur.flags.rigProgress >= cur.use.security_desk.holdSeconds) {
          cur.flags.rig = true;
          cur.wing.setLive(cur.cctv.feeds);
          events.emit('door:opened', { id: 'security-desk' });
          hud.toast('CAMERAS ONLINE · TAB TO WATCH', 3.5);
          emitNoise(player.position, RING_COLOURS.player, 3, { source: 'panel', damped: true, strength: 0.4 });
          checkpoints.save('level-1-rig', snapshotCheckpoint());
        }
      }
      if (spot.id === 'tamper_panel') {
        cur.flags.panelProgress = keys.KeyE ? (cur.flags.panelProgress ?? 0) + dt : 0;
        if (cur.flags.panelProgress >= cur.use.tamper_panel.holdSeconds) {
          cur.flags.sensorDisabled = true;
          cur.props.setPanel('tamper_panel', 0x23ff7a);
          events.emit('door:opened', { id: 'tamper-circuit' });
          emitNoise(player.position, RING_COLOURS.alert, 5, { source: 'panel', strength: 0.7, cause: 'override' });
          checkpoints.save('level-2-circuit', snapshotCheckpoint());
        }
      }
      if (spot.id === 'roof_override' && keys.KeyE) {
        cur.flags.override = (cur.flags.override ?? 0) + dt;
        if (cur.flags.override >= cur.use.roof_override.holdSeconds) {
          openHatch();
          events.emit('door:opened', { id: 'roof-hatch' });
          hud.toast('ROOF HATCH OPEN', 3);
          emitNoise(v3(cur.use.roof_hatch.pos), RING_COLOURS.alert, 7, { source: 'door', strength: 0.8 });
          checkpoints.save('level-3-hatch', snapshotCheckpoint());
        }
      } else if (spot.id === 'roof_override') {
        cur.flags.override = Math.max(0, (cur.flags.override ?? 0) - dt * 2);
      }
      hud.prompt(spot.text, spot.progress ?? null);
      return;
    }
    hud.prompt(null);
    if (cur.n === 2) cur.flags.panelProgress = 0;
    if (cur.n === 1) cur.flags.rigProgress = 0;
  }

  function nearbyPickup() {
    return pickups.nearby(player.position, cur.n, 1.7, (item) => item.id !== 'kestrel_star' || cur.props.safe.open >= 0.85);
  }

  function interact() {
    if (state.ended || state.zip || state.vent || state.climb) return;
    if (state.inSafe) { safe.setTumbler(); return; }
    if (cur.cctv.active >= 0) {
      if (cur.cctv.loop()) cur.cctvSystem.loop(cur.cctv.active);
      return;
    }
    const item = nearbyPickup();
    if (item && Math.abs(item.y - player.base) < 3) { pickups.collect(item.id); return; }
    const spot = interactionAt();
    if (!spot) return;
    if (spot.id === 'vault_door' && state.hasKeycard && !cur.flags.nightEntry) {
      cur.flags.nightEntry = true;
      cur.props.setPanel('reader', 0x23ff7a);
      events.emit('door:opened', { id: 'vault-wing' });
      hud.toast('01:30 ENTRY AUTHORISED · LEAVE VIA THE LOBBY', 4);
      checkpoints.save('level-1-entry-ready', snapshotCheckpoint());
    }
    if (spot.id === 'gala_exit' && missionPhase(1, state, cur.flags).exitReady) startPassage(1);
    if (spot.id === 'service_exit' && missionPhase(2, state, cur.flags).exitReady) startPassage(2);
    if ((spot.id === 'vent_in' || spot.id === 'vent_out') && stance()) {
      const from = cur.use[spot.id];
      emitNoise(player.position, RING_COLOURS.alert, 6, { source: 'vent', strength: 0.7, cause: 'footstep' });
      const points = cur.use.vent_in.path;
      state.vent = { distance: 0, path: makeTraversalPath(spot.id === 'vent_in' ? points : [...points].reverse()) };
      cur.props.vents.forEach(({ mesh }) => { mesh.visible = false; });
      hud.prompt(null);
    }
    if (spot.id === 'safe' && cur.flags.sensorDisabled) {
      const p = cur.use.safe.usePos;
      state.inSafe = true;
      placePlayer(p[0], 0, p[2], 0);
      player.pitch = -0.12;
      camera.position.set(p[0], 1.3, p[2] + 0.4);
      camera.rotation.set(player.pitch, 0, 0);
      hud.toast('LISTEN FOR THE CLICK');
    }
    if (spot.id === 'stairs') {
      const def = cur.use.stairs;
      if (def.path) {
        state.climb = { distance: 0, step: 0, path: makeTraversalPath(def.path) };
        cur.props.setStairDoors(true);
        hud.prompt(null);
        hud.toast('STAIRWELL · W TO CLIMB');
      } else {
        const to = def.to;
        placePlayer(to[0], to[1], to[2], facing(-to[0], -60 - to[2]));
        hud.toast('STAIRWELL · TOP FLOOR');
        checkpoints.save('level-3-roof', snapshotCheckpoint());
      }
    }
    if (spot.id === 'zip') {
      state.zip = { t: 0, elapsed: 0, done: false, lean: 0, from: camera.position.clone() };
      hud.prompt(null);
      hud.toast('CLIPPED ON', 2);
      events.emit('zipline:mount', { id: 'roof-line' });
      events.emit('player:jump', {});
    }
  }

  function updateSafe(dt) {
    state.safeGlow = 0;
    state.safeNoise = Math.max(0, state.safeNoise - dt);
    const s = cur.props.safe;
    if (!s) return;
    const snap = safe.snapshot();
    s.dial.rotation.z = -snap.dial / 100 * Math.PI * 2;
    if (s.open > 0) {
      const want = state.hasStar ? 0 : 1;
      if (s.open !== want) {
        s.open = want ? Math.min(1, s.open + dt * 0.6) : Math.max(0, s.open - dt * 0.45);
        s.hinge.rotation.y = -s.open * Math.PI * 0.6;
        if (s.open === 0) {
          events.emit('door:opened', { id: 'safe', closing: true });
          emitNoise(v3(cur.use.safe.usePos), RING_COLOURS.player, 3, { source: 'safe', damped: true, strength: 0.7 });
          hud.toast('THE SAFE SWINGS SHUT BEHIND YOU');
        }
      }
    }
    if (!state.inSafe) return;
    const fb = safe.feedback();
    hud.safe(true, { ...snap, strength: fb.strength });
    state.safeGlow = fb.strength > 0.9 ? 0.35 : 0;
  }

  // At the Level 2 dial: how long until Briggs checks the safe, or how long a decoy holds him.
  function updateGuardEta() {
    const el = ui.guardEta;
    if (!el) return;
    const watcher = cur.n === 2 && !cur.flags.safeOpened && !state.ended ? cur.guards.find((g) => g.def.watchWaypoint !== undefined) : null;
    if (watcher?.sleep > 0) {
      const show = state.inSafe || near(player.position, cur.use.safe.usePos, 8);
      el.classList.toggle('is-hidden', !show);
      const text = watcher.def.name.toUpperCase() + ' SEDATED · WAKES IN ' + Math.ceil(watcher.sleep) + 's';
      if (el.textContent !== text) el.textContent = text;
      const level = watcher.sleep < 8 ? 'warn' : 'calm';
      if (el.dataset.level !== level) el.dataset.level = level;
      return;
    }
    // Shown at the dial and from the cover around it, so a hiding player can time the return.
    const show = Boolean(watcher) && (state.inSafe || near(player.position, cur.use.safe.usePos, 8));
    el.classList.toggle('is-hidden', !show);
    if (!show) return;
    const eta = patrolEta(watcher, { watchIndex: watcher.def.watchWaypoint, pace: watcher.speed * alarm.snapshot().guardSpeed });
    const { text, level } = etaText(watcher.def.name, eta);
    if (el.textContent !== text) el.textContent = text;
    if (el.dataset.level !== level) el.dataset.level = level;
  }

  function updateDoors(dt) {
    if (cur.n !== 3) return;
    const f = cur.flags;
    const sh = cur.props.shutter;
    const hold = cur.use.shutter_hold.usePos;
    const playerHolding = !state.ended && keys.KeyE && state.locked && near(player.position, hold, 1.2);
    const echoHolding = echoNow && echoNow.interacting && Math.hypot(echoNow.x - hold[0], echoNow.z - hold[2]) < 1.4 && Math.abs((echoNow.y ?? 0) - hold[1]) < 2;
    const held = f.pastShutter ? false : playerHolding || echoHolding;
    const before = sh.lift;
    sh.lift = held ? Math.min(3.4, sh.lift + dt * 2.4) : Math.max(0, sh.lift - dt * 1.5);
    sh.mesh.position.y = sh.lift;
    sh.light.material.color.setHex(sh.lift > 1.9 ? 0x23ff7a : held ? 0xffb020 : 0xff3f62);
    cur.props.setPanel('shutter_hold', held ? 0x23ff7a : 0xffb020);
    if (Math.abs(sh.lift - before) > 0) {
      state.shutterHum = (state.shutterHum ?? 0) - dt;
      if (state.shutterHum <= 0) {
        state.shutterHum = 1.1;
        emitNoise(v3(cur.use.shutter_door.pos).setY(0), RING_COLOURS.alert, 5, { source: 'door', strength: 0.5 });
      }
    }
    const col = cur.built.collision;
    if (sh.lift > 1.9) col.unblock('shutter');
    else {
      const inDoor = Math.abs(player.position.x) < 2.6 && player.position.z < -19.45 && player.position.z > -20.75 && player.base < 10;
      if (inDoor) player.position.z = player.position.z < -20.1 ? -20.8 : -19.4;
      col.block('shutter', { pos: [0, 2, -20.1], size: [4.2, 4, 0.4] });
    }
    if (!f.pastShutter && player.position.z < -21.5 && player.base < 10) {
      f.pastShutter = true;
      col.unblock('shutter');
      hud.toast('THROUGH THE SHUTTER');
      checkpoints.save('level-3-gallery', snapshotCheckpoint());
    }
    const hatch = cur.props.hatch;
    if (f.hatch && hatch.lift < 2.6) {
      hatch.lift = Math.min(2.6, hatch.lift + dt * 1.4);
      hatch.mesh.position.y = hatch.base + hatch.lift;
    }
    if (!f.armed && player.base > 10) {
      cur.plates.update([{ id: 'player', position: player.position }, { id: 'echo', position: echoActor.root.position, active: echo.snapshot().mode === 'replaying' && echoActor.root.position.y > 10 }]);
      const ids = new Set(cur.plates.plates.flatMap((p) => p.occupants));
      if (cur.plates.allActive() && ids.size >= 2) {
        f.armed = true;
        cur.props.plates.forEach((_, i) => cur.props.setPlate(i, false, true));
        cur.props.setPanel('roof_override', 0x72efff);
        hud.toast('PLATES LOCKED · OVERRIDE ARMED', 3);
        checkpoints.save('level-3-armed', snapshotCheckpoint());
      }
    }
  }

  function updateLevelClock(dt) {
    if (cur.n !== 3 || state.ended || state.zip) { ui.timer.classList.add('is-hidden'); return; }
    cur.timeLeft = Math.max(0, cur.timeLeft - dt);
    ui.timer.classList.remove('is-hidden');
    ui.timer.textContent = 'SEALING IN ' + clockText(cur.timeLeft);
    ui.timer.classList.toggle('low', cur.timeLeft < 30);
    if (cur.timeLeft <= 0) {
      hud.toast('THE BUILDING IS SEALED', 3);
      events.emit('player:caught', { id: 'control' });
    }
    if (player.base > 10 && cur.built) {
      state.searchCooldown = Math.max(0, state.searchCooldown - dt);
      const t = elapsed;
      const sx = Math.sin(t * 0.5) * 9;
      const sz = -72 + Math.cos(t * 0.37) * 6;
      if (Math.hypot(player.position.x - sx, player.position.z - sz) < 2.2 && state.searchCooldown <= 0) {
        state.searchCooldown = 2.5;
        alarm.raise(12, 'searchlight');
        state.damage = 0.5;
        hud.toast('SEARCHLIGHT · KEEP MOVING');
      }
    }
  }

  function guardSummary() {
    if (!cur.guards.length) return 'GUARDS · NONE NEARBY';
    const order = ['pursue', 'search', 'investigate', 'patrol', 'sedated'];
    let worst = cur.guards[0];
    for (const g of cur.guards) if (order.indexOf(g.state) < order.indexOf(worst.state)) worst = g;
    const sus = Math.max(...cur.guards.map((g) => g.suspicion));
    return 'GUARDS · ' + worst.state.toUpperCase() + (sus > 0.05 && worst.state !== 'pursue' ? ' · SUSPICION ' + Math.round(sus * 100) + '%' : '');
  }

  let crowdTick = 0;
  function updateCrowd(dt) {
    if (!guests.root.visible) return;
    crowdTick += dt;
    if (crowdTick < 1 / QUALITY[state.quality].crowdRate) return;
    guests.update(elapsed);
    crowdTick = 0;
  }

  const attractCurves = new Map();
  function attractCamera(dt) {
    let c = attractCurves.get(cur.n);
    if (!c) {
      const path = ATTRACT[cur.n];
      c = {
        pos: new THREE.CatmullRomCurve3(path.map((p) => v3(p[0])), true, 'centripetal'),
        look: new THREE.CatmullRomCurve3(path.map((p) => v3(p[1])), true, 'centripetal')
      };
      attractCurves.set(cur.n, c);
    }
    state.attract = (state.attract + dt / 70) % 1;
    c.pos.getPointAt(state.attract, camera.position);
    c.look.getPointAt(state.attract, tmp.look);
    camera.lookAt(tmp.look);
    const ctx = {
      mode: state.mode,
      time: elapsed,
      alarm: alarm.snapshot(),
      canStand: (x, z) => canStand(x, z, 0.4, 0),
      findPath: cur.navigation.findPath,
      clearView: null,
      player: { position: tmp.probe.set(9999, 0, 9999), crouching: false, visible: false },
      onPulse: null
    };
    for (const g of cur.guards) g.update(dt, ctx);
  }

  function layoutOverlays() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pipW = Math.round(w * 0.2);
    const mapW = Math.round(Math.min(250, Math.max(175, w * 0.2), h * 0.38));
    const pip = { x: w - pipW - 24, y: 24, w: pipW, h: Math.round(pipW * 9 / 16) };
    const map = { x: w - mapW - 24, y: h - mapW - 24, w: mapW, h: mapW };
    const hasFeeds = (cur?.cctv.feeds.length ?? 0) > 0;
    const watching = (cur?.cctv.active ?? -1) >= 0;
    const margin = 42;
    const gap = 12;
    const gridBottom = 104;
    const cellW = Math.max(1, Math.floor((w - margin * 2 - gap) / 2));
    const cellH = Math.max(1, Math.floor((h - margin - gridBottom - gap) / 2));
    const feeds = [
      { x: margin, y: margin, w: cellW, h: cellH },
      { x: margin + cellW + gap, y: margin, w: cellW, h: cellH },
      { x: margin, y: margin + cellH + gap, w: cellW, h: cellH },
      { x: margin + cellW + gap, y: margin + cellH + gap, w: cellW, h: cellH }
    ];
    for (const [el, r, show] of [[ui.pip, pip, state.pip && hasFeeds], [ui.map, map, state.map]]) {
      Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      el.classList.toggle('is-hidden', !show || watching);
    }
    document.body.classList.toggle('cctv-mode', watching);
    return { pip, map, feeds };
  }

  let rects = layoutOverlays();
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frames = 0;
  let fpsTime = 0;
  let autoTime = 0;
  let autoFrames = 0;
  let menuFrame = 0;

  let shadowTick = 0;
  function refreshStaticShadows(dt) {
    if (QUALITY[state.quality].shadows) return;
    shadowTick += dt;
    if (shadowTick < 0.5) return;
    shadowTick = 0;
    renderer.shadowMap.needsUpdate = true;
  }

  function autoQuality(dt) {
    if (!state.auto) return;
    autoTime += dt;
    autoFrames += 1;
    if (autoTime < 3) return;
    const fps = autoFrames / autoTime;
    autoTime = 0;
    autoFrames = 0;
    const i = QUALITIES.indexOf(state.quality);
    if (fps < 48 && i > 0) {
      applyQuality(QUALITIES[i - 1]);
      setMode(state.mode);
      hud.toast('PERFORMANCE MODE · ' + state.quality.toUpperCase(), 2.4);
    }
  }

  function frame() {
    const wallDt = Math.min(clock.getDelta(), 1);
    const raw = Math.min(wallDt, qa ? 1 : 0.05);
    if (document.hidden) {
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    if (cur.warming) {
      if (state.transit) passageFrame(raw);
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    renderer.info.reset();
    const menu = screens.inMenu;
    const dt = screens.blocking ? 0 : raw;
    const learningHidden = screens.blocking || state.ended || state.zip || state.vent || state.climb || state.transit || !screens.options.guided;
    const lesson = learningHidden ? null : learning.update(dt, {
      level: cur.n, flags: cur.flags, x: player.position.x, z: player.position.z, yaw: player.yaw, base: player.base,
      movement: player.profile.id, moving: player.moving, hasKeycard: state.hasKeycard, hasStar: state.hasStar, inSafe: state.inSafe,
      camera: cur.cctv.active, hallLooped: (cur.cctv.feeds[1]?.loopTimer ?? 0) > 0,
      echo: echo.snapshot().mode, echoElapsed: echo.snapshot().elapsed,
    });
    learningView.update(dt, lesson, Boolean(learningHidden));
    state.lastDt = dt;
    elapsed += menu ? raw : dt;
    if (menu) {
      // Menus do not need a 60 FPS 3D background. CSS story/credit animations
      // remain smooth while the expensive museum scene is capped at 30 FPS.
      menuFrame += raw;
      if (menuFrame < 1 / 30) {
        if (!qa) requestAnimationFrame(frame);
        return;
      }
      const menuDt = menuFrame;
      menuFrame = 0;
      audio.siren(false);
      camera.layers.disable(LAYER_AVATAR);
      attractCamera(menuDt);
      updateCrowd(menuDt);
      cur.props.update(menuDt, elapsed);
      cur.built?.update(menuDt, elapsed);
      field.update(menuDt);
      lighting.update(menuDt, elapsed);
      skybox.update(menuDt, elapsed, camera);
      cur.lasers?.update(elapsed);
      fx.set({ alarm: state.mode === 'lockdown' ? 0.6 : 0, glitch: 0, dampen: 0, damage: 0 });
      fx.render(menuDt, elapsed, camera);
      guide.update(0, player.position, { hidden: true });
      story.update(0, player, cur.guards);
      screens.update(0);
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    menuFrame = 0;
    const playing = !state.ended;
    if (playing) { state.time += dt; cur.elapsed += dt; }
    updatePlayer(dt, elapsed);
    if (updateTransit(dt)) { if (!qa) requestAnimationFrame(frame); return; }
    document.body.dataset.traversal = state.zip ? 'zipline' : state.vent ? 'vent' : state.climb ? 'stairs' : '';
    updateExposure(dt);
    state.socialHeat = Math.max(0, state.socialHeat - dt);
    state.witnessCooldown = Math.max(0, state.witnessCooldown - dt);
    state.spawnGrace = Math.max(0, state.spawnGrace - dt);
    const cover = cur.n === 1
      ? galaCover({ x: player.position.x, z: player.position.z, movement: player.profile.id, gadgetHeat: state.socialHeat, lifting: state.lifting, compromised: cur.flags.coverBlown })
      : { safe: false, reason: '' };
    document.body.dataset.cover = cover.safe ? 'safe' : 'broken';
    const alarmSnap = alarm.update(playing ? dt : 0, { canDecay: cur.guards.every((g) => g.state !== 'pursue') });
    const ctx = {
      mode: state.mode,
      time: elapsed,
      alarm: alarmSnap,
      canStand: (x, z) => canStand(x, z, 0.4, 0),
      findPath: cur.navigation.findPath,
      clearView: cur.collision.clearView,
      player: { position: player.position, crouching: stance(), blending: cover.safe || state.ended || Boolean(state.vent || state.climb || state.transit) || player.base > 10 || state.spawnGrace > 0, visible: state.exposure > 0 && !state.ended && !state.transit && player.base < 10 && !cover.safe },
      onPulse: (g) => field.emit(tmp.next.set(g.position.x, 0.02, g.position.z), RING_COLOURS.guard, 6, { speed: 4.5, strength: 0.9, source: 'guard' })
    };
    if (playing && dt > 0) for (const g of cur.guards) g.update(dt, ctx);
    const chased = cur.n === 2 && playing && dt > 0 && cur.guards.some((g) => g.state === 'pursue');
    audio.siren(chased);
    if (playing && cur.cctv.feeds.length) cur.cctvSystem.update(dt, player.position, {
      clear: () => state.spawnGrace <= 0 && (cur.n !== 1 || !cover.safe)
    });
    updateEcho(playing ? dt : 0, elapsed);
    updateDecoys(playing ? dt : 0);
    if (playing) updateDoors(dt);
    updateInteractions(dt);
    updateSafe(dt);
    updateGuardEta();
    if (playing) updateLevelClock(dt);
    updateCrowd(dt);
    cur.props.update(dt, elapsed);
    cur.built?.update(dt, elapsed);
    cur.wing?.update(elapsed);
    if (cur.wing?.live && player.position.x > 16 && !state.skipRender) cur.cctv.refresh(0.25);
    field.update(dt);
    lighting.update(dt, elapsed);
    skybox.update(dt, elapsed, cur.cctv.active >= 0 ? cur.cctv.feeds[cur.cctv.active].camera : camera);
    cur.lasers?.update(elapsed);
    cur.cctv.update(dt);
    state.mapReveal = Math.max(0, state.mapReveal - dt);
    const fullMap = state.mapReveal > 0;
    ui.map.classList.toggle('is-hidden', !state.map || Boolean(state.zip || state.vent || state.climb || state.transit) || cur.cctv.active >= 0);
    const boundsWidth = cur.bounds.maxX - cur.bounds.minX + 4;
    const boundsHeight = cur.bounds.maxZ - cur.bounds.minZ + 4;
    minimap.setView(fullMap ? Math.max(24, boundsWidth) : 10, fullMap ? Math.max(16, boundsHeight) : 7);
    ui.map.classList.toggle('full', fullMap);
    ui.mapLabel.textContent = fullMap ? 'FLOOR SCAN' : 'ACOUSTIC LENS · NEARBY';
    minimap.update(player.position, cur.bounds, dt);
    state.damage = Math.max(0, state.damage - dt * 1.2);
    if (state.dampen) {
      state.cell = Math.max(0, state.cell - dt * (player.moving ? 1 : 0.45));
      if (state.cell <= 0) { state.dampen = false; hud.toast('DAMPENER EMPTY'); }
    } else {
      state.cell = Math.min(6, state.cell + dt * 0.8);
    }
    state.sonarCooldown = Math.max(0, state.sonarCooldown - dt);
    const alarmGlow = Math.max(0, (alarmSnap.value - 25) / 75);
    fx.set({
      alarm: state.mode === 'lockdown' || chased ? 1 : alarmGlow * 0.6,
      glitch: state.mode === 'lockdown' ? 0.22 : 0,
      dampen: state.dampen ? 1 : state.safeGlow,
      damage: state.damage
    });
    hud.alarm(alarmSnap);
    hud.guard(guardSummary());
    hud.movement(player.profile.label + (state.dampen ? ' · DAMPENED ' + Math.round(state.cell / 6 * 100) + '%' : ''), stamina.snapshot().ratio);
    const ps = pickups.snapshot();
    hud.items({ keycard: state.hasKeycard, star: state.hasStar, cash: ps.cash, evidence: ps.evidence.length, evidenceTotal: EVIDENCE_TOTAL });
    hud.decoy(state.decoyCharges, Math.max(0, state.decoyRecharge));
    hud.doses(state.doses, cur.n <= 2);
    hud.objective(objectiveText());
    hud.hint(controlHint());
    updateGuide(dt);
    hud.update(dt);
    story.update(state.locked ? dt : 0, { ...player, damped: state.dampen }, cur.guards);
    screens.update(dt);
    if (state.skipRender) {
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    if (cur.cctv.active >= 0) {
      cur.cctv.renderGrid(rects.feeds);
      const feed = cur.cctv.feeds[cur.cctv.active];
      ui.feedName.textContent = feed.name;
      ui.feedState.textContent = feed.loopTimer > 0 ? 'LOOPED · ' + feed.loopTimer.toFixed(1) + 's' : 'LIVE · E TO LOOP 8s';
      ui.feedState.classList.toggle('looped', feed.loopTimer > 0);
      ui.feedCells.forEach((cell, index) => {
        const item = cur.cctv.feeds[index];
        cell.classList.toggle('offline', !item);
        cell.classList.toggle('selected', index === cur.cctv.active);
        cell.classList.toggle('looped', Boolean(item?.loopTimer > 0));
        cell.querySelector('b').textContent = item?.name ?? 'NO SIGNAL';
        cell.querySelector('small').textContent = item ? (item.loopTimer > 0 ? 'LOOP ' + item.loopTimer.toFixed(1) + 's' : 'CAM ' + (index + 1)) : 'OFFLINE';
      });
    } else {
      fx.render(dt, elapsed, camera);
      if (state.pip && !state.zip && !state.vent) cur.cctv.renderPip(rects.pip);
      if (state.map && !state.zip && !state.vent) minimap.render(rects.map);
    }
    ui.feed.classList.toggle('is-hidden', cur.cctv.active < 0);
    autoQuality(wallDt);
    refreshStaticShadows(wallDt);
    frames += 1;
    fpsTime += wallDt;
    if (fpsTime >= 0.5) {
      const s = rendererStats(renderer);
      ui.stats.textContent = Math.round(frames / fpsTime) + ' FPS · ' + s.calls + ' calls · ' + state.quality.toUpperCase();
      frames = 0;
      fpsTime = 0;
    }
    if (!qa) requestAnimationFrame(frame);
  }

  document.addEventListener('keydown', (e) => {
    if (screens.blocking) return;
    keys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (state.ended === 'caught') {
      if (e.code === 'KeyR') restore(checkpoints.restore() ?? snapshotCheckpoint());
      if (e.code === 'KeyN') screens.home();
      return;
    }
    if (state.ended) return;
    if (e.code === 'KeyQ') { openPause(); return; }
    if (e.code === 'Escape' && closeOverlay()) { e.preventDefault(); return; }
    if (cur.cctv.active >= 0) {
      if (e.code === 'Tab' || e.code === 'Backspace') {
        cur.cctv.exit();
        rects = layoutOverlays();
      } else if (/^Digit[1-4]$/.test(e.code)) {
        const index = Number(e.code.at(-1)) - 1;
        if (index < cur.cctv.feeds.length) cur.cctv.enter(index);
      } else if ((e.code === 'KeyE' || e.code === 'KeyL') && cur.cctv.loop()) {
        cur.cctvSystem.loop(cur.cctv.active);
      }
      return;
    }
    if (e.code === 'KeyE') interact();
    if (e.code === 'Backspace' && state.inSafe) { state.inSafe = false; hud.safe(false); }
    if (e.code === 'KeyR' && !state.inSafe) toggleEcho();
    if (state.inSafe || state.zip || state.vent || state.climb) return;
    if (e.code === 'Space' && player.y === 0 && player.profile.id !== 'crawl') { player.vy = 4.6; events.emit('player:jump', {}); }
    if (e.code === 'KeyG' && state.sonarCooldown <= 0) {
      state.sonarCooldown = 2.6;
      if (cur.n === 1) state.socialHeat = 4;
      emitNoise(player.position, RING_COLOURS.player, 16, { source: 'player', damped: state.dampen, speed: 14, strength: 1, cause: 'sonar' });
    }
    if (e.code === 'Tab' && cur.n === 1 && !cur.flags.rig) { hud.toast('NO CAMERA ACCESS · LINK THE TAP AT THE SECURITY DESK', 3); return; }
    if (e.code === 'Tab') {
      if (cur.cctv.feeds.length) { cur.cctv.enter(); rects = layoutOverlays(); } else hud.toast('NO CAMERAS ON THIS FLOOR');
    }
    if (e.code === 'KeyF' && (state.dampen || state.cell > 0.7)) state.dampen = !state.dampen;
    if (e.code === 'KeyP') { state.pip = !state.pip; rects = layoutOverlays(); }
    if (e.code === 'KeyM') { state.map = !state.map; rects = layoutOverlays(); }
    if (e.code === 'KeyV') {
      view.third = !view.third;
      view.distance = 0.3;
      hud.toast(view.third ? 'THIRD PERSON · V TO SWITCH BACK' : 'FIRST PERSON', 1.6);
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  let mouseRestoreAt = 0;
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && state.locked) throwDecoy(); });
  canvas.addEventListener('click', () => {
    if (!state.locked && !screens.blocking) {
      mouseRestoreAt = performance.now();
      canvas.requestPointerLock()?.catch?.(() => {
        hud.toast('MOUSE FREE · CLICK AGAIN WHEN READY', 2.4);
      });
    }
  });
  function closeOverlay() {
    if (cur.cctv.active >= 0) { cur.cctv.exit(); rects = layoutOverlays(); return true; }
    if (state.inSafe) { state.inSafe = false; hud.safe(false); return true; }
    return false;
  }
  function openPause() {
    state.pausing = true;
    if (document.pointerLockElement) document.exitPointerLock();
    else { state.pausing = false; screens.pause(); }
  }
  document.addEventListener('pointerlockchange', () => {
    const wasLocked = state.locked;
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked && !wasLocked) return;
    if (!state.locked && wasLocked && mouseRestoreAt > 0 && performance.now() - mouseRestoreAt < 1000 && screens.state === 'playing') {
      mouseRestoreAt = 0;
      for (const k of Object.keys(keys)) keys[k] = false;
      hud.toast('MOUSE FREE · CLICK GAME TO RESTORE LOOK', 2.4);
      return;
    }
    if (!state.locked) for (const k of Object.keys(keys)) keys[k] = false;
    const soft = !state.locked && !state.pausing && screens.state === 'playing' && closeOverlay();
    state.pausing = false;
    screens.lockChanged(state.locked, { soft });
    rects = layoutOverlays();
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked || cur.cctv.active >= 0 || state.zip || state.vent || state.climb) return;
    if (state.inSafe) {
      safe.turn(e.movementX * 0.035 * screens.options.sensitivity, Math.max(state.lastDt, 1 / 240));
      return;
    }
    player.yaw -= e.movementX * 0.0022 * screens.options.sensitivity;
    player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0019 * screens.options.sensitivity, -1.3, 1.3);
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    fx.setSize(window.innerWidth, window.innerHeight);
    hall.setReflection(QUALITY[state.quality].reflection, window.innerWidth, window.innerHeight);
    rects = layoutOverlays();
  });
  ui.closeCredits.addEventListener('click', () => ui.credits.close());

  applyQuality('medium');
  await newHeist();
  const devLevel = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('level')) : 0;
  if (devLevel === 2 || devLevel === 3) await enterLevel(devLevel);
  airCamera.position.set(0, 1.6, -2);
  renderer.render(airScene, airCamera);
  rects = layoutOverlays();
  ui.loading.classList.add('is-hidden');
  screens.ready();
  clock.getDelta();

  if (qa) {
    window.__game = {
      events,
      story,
      screens,
      setMode,
      level(n) { enterLevel(n); rects = layoutOverlays(); return cur.n; },
      step(seconds = 1, fps = 30) {
        const n = Math.max(1, Math.round(seconds * fps));
        clock.getDelta = () => 1 / fps;
        for (let i = 0; i < n; i += 1) frame();
      },
      view(x, z, yaw, pitch = 0, y = player.base) {
        placePlayer(x, y, z, yaw);
        player.pitch = pitch;
      },
      press(code) { document.dispatchEvent(new KeyboardEvent('keydown', { code })); document.dispatchEvent(new KeyboardEvent('keyup', { code })); },
      hold(code, on) { keys[code] = on; },
      lock(on = true) { state.locked = on; },
      turnDial(delta, dt = 0.5) { return safe.turn(delta, dt); },
      combination: () => safe,
      cctv: (i) => { if (i < 0) cur.cctv.exit(); else cur.cctv.enter(i); rects = layoutOverlays(); },
      fx: (v) => { Object.assign(state, v); rects = layoutOverlays(); },
      quality: (q) => { applyQuality(q); setMode(state.mode); },
      okafor: () => cur.okafor && ({ x: cur.okafor.position.x, z: cur.okafor.position.z, yaw: cur.okafor.yaw, state: cur.okafor.state }),
      guards: () => cur.guards.map((g) => ({ id: g.id, state: g.state, suspicion: g.suspicion, x: g.position.x, z: g.position.z, heading: g.yaw })),
      render(on = true) { state.skipRender = !on; },
      thirdPerson(on = true) { view.third = on; view.distance = 0.3; },
      passageView() { if (state.transit) renderPassage(0); return Boolean(state.transit); },
      freezeGuards(on = true) { for (const g of cur.guards) g.speed = on ? 0 : g.def.speed; },
      state: () => ({
        level: cur.n,
        player: { x: player.position.x, z: player.position.z, base: player.base, y: player.y, profile: player.profile.id },
        alarm: alarm.snapshot().value, alarmLevel: alarm.snapshot().level.id, hasKeycard: state.hasKeycard, hasStar: state.hasStar, flags: { ...cur.flags },
        inSafe: state.inSafe, ended: state.ended, echo: echo.snapshot().mode, take: pickups.snapshot().cash,
        evidence: pickups.snapshot().evidence.length, safe: safe.snapshot(), mode: state.mode, timeLeft: cur.timeLeft,
        shutter: cur.props.shutter?.lift, zip: state.zip?.t, screen: screens.state,
        decoys: throwables.map((t) => [t.mesh.position.x, t.mesh.position.y, t.mesh.position.z]), doses: state.doses,
        transit: state.transit?.stage ?? null, guide: guide.target?.label ?? null, ready: !cur.warming,
        guests: cur.n === 1 ? guests.witnesses : undefined
      })
    };
    window.__ready = true;
    if (import.meta.env.DEV) {
      const { installReviewTools } = await import('./dev/review.js');
      const game = window.__game;
      const simulate = (seconds) => { state.skipRender = true; game.step(seconds); state.skipRender = false; game.step(0.04); };
      const prepare = (n) => { if (cur.n !== n || state.ended || state.transit) enterLevel(n); screens.show('playing'); state.locked = true; game.freezeGuards(true); };
      const check = (condition, message) => { if (!condition) throw new Error(message); return 'PASS · ' + message; };
      const useAt = (x, z, yaw = 0, y = 0) => { game.view(x, z, yaw, 0, y); simulate(0.04); interact(); simulate(0.04); };
      installReviewTools({
        'Capture still (F9 restores UI)': () => { document.body.classList.add('capture-still'); },
        'Level 1 completed screen': () => { screens.stageComplete(1, () => enterLevel(2)); },
        'Level 2 completed screen': () => { screens.stageComplete(2, () => enterLevel(3)); },
        'Check gala passage': () => {
          prepare(1); state.hasKeycard = true; cur.flags.rig = true; cur.flags.nightEntry = true;
          const p = outLock.transform.toWorld(0, -AIRLOCK.length * .6); game.view(p.x, p.z, outLock.transform.yaw, 0, outLock.transform.y);
          startPassage(1); simulate(1.5); return check(screens.state === 'interlude' && state.transit?.stage === 'debrief', 'sealed passage opens the completion conversation');
        },
        'Check vault passage': () => {
          prepare(2); state.hasStar = true; cur.flags.sensorDisabled = cur.flags.safeOpened = true;
          const p = outLock.transform.toWorld(0, -AIRLOCK.length * .6); game.view(p.x, p.z, outLock.transform.yaw, 0, outLock.transform.y);
          startPassage(2); simulate(1.5); return check(screens.state === 'interlude' && state.transit?.stage === 'debrief', 'vault passage opens the betrayal conversation');
        },
        'Level 1 briefing': () => { screens.setLevel(1); screens.show('briefing'); },
        'Level 2 briefing': () => { screens.setLevel(2); screens.show('briefing'); },
        'Level 3 briefing': () => { screens.setLevel(3); screens.show('briefing'); },
        'Gala view': () => { newHeist(); prepare(1); game.view(-1.2, 1.1, 0); simulate(0.1); },
        'Officer view': () => { prepare(1); game.view(-9.6, -16, Math.PI); simulate(0.1); },
        'Guest portrait': () => {
          prepare(1); const guest = GALA_GUESTS[2];
          game.view(guest.x + Math.sin(guest.rotation) * 1.7, guest.z + Math.cos(guest.rotation) * 1.7, guest.rotation, -.06);
          simulate(.1);
        },
        'Local map': () => { state.mapReveal = 0; simulate(0.2); },
        'Observe crowd': async () => {
          // Yield real browser frames so the preview can present the movement,
          // rather than blocking the tab with hundreds of renders in one click.
          for (let i = 0; i < 240; i++) {
            await new Promise((resolve) => requestAnimationFrame(resolve)); game.step(1 / 30);
          }
          return 'guests stroll while the current lesson waits for your input';
        },
        'Sonar map': () => { state.mapReveal = 2.4; simulate(0.2); },
        'High graphics': () => { game.quality('high'); simulate(0.2); },
        'Low graphics': () => { game.quality('low'); simulate(0.2); },
        'Loop hall camera': () => { prepare(1); game.cctv(1); cur.cctv.loop(); cur.cctvSystem.loop(1); game.cctv(-1); simulate(0.1); return 'camera 02 looped for 8 seconds'; },
        'Copy badge': () => { prepare(1); cur.okafor.root.position.set(-9.6, 0, -20); cur.okafor.pauseTimer = 4; cur.okafor.checkingGuest = 0; cur.okafor.root.rotation.y = Math.PI;
          game.view(cur.okafor.position.x, cur.okafor.position.z + 1.1, 0); keys.KeyE = true; simulate(0.8); keys.KeyE = false;
          return check(state.hasKeycard, 'badge copied during a stationary inspection'); },
        'Staff reader': () => { prepare(1); useAt(0, -60.6); return check(cur.flags.nightEntry, 'night entry authorised'); },
        'Leave gala': () => { useAt(-4.2, 5, Math.PI); return check(state.ended === 'won', 'lobby exit completes the recon'); },
        'Vault view': () => { prepare(2); game.view(0, 0, 0); simulate(0.1); },
        'Isolate circuit': () => { prepare(2); game.view(-5.8, -31.5, Math.PI / 2); keys.KeyE = true; simulate(2.7); keys.KeyE = false;
          return check(cur.flags.sensorDisabled, 'tamper circuit isolated'); },
        'Open safe': () => { if (!cur.flags.sensorDisabled) throw new Error('Isolate the circuit first'); useAt(0, -38.4);
          for (let tumbler = 0; tumbler < 3; tumbler++) { for (let i = 0; i < 201 && safe.feedback().distance > 0.5; i++) safe.turn(0.5, 1); safe.setTumbler(); }
          simulate(1.9); return check(cur.flags.safeOpened && !state.hasStar && !state.ended, 'safe opened; Star still requires collection'); },
        'Take Star': () => { useAt(0, -38.4); return check(state.hasStar, 'Star is now in the inventory'); },
        'Service door': () => { useAt(0.1, -25.7, -Math.PI / 2); return check(state.ended === 'won', 'vault exit requires the Star'); },
        'Take evidence': () => { const file = cur.data.pickups.find((item) => item.kind === 'evidence'); const p = file.usePos ?? [file.pos[0], 0, file.pos[2]];
          useAt(p[0], p[2], 0, p[1]); return check(pickups.snapshot().evidence.includes(file.id), 'evidence collected from its reachable furniture position'); },
        'Escape view': () => { prepare(3); game.view(0, -3, 0); simulate(0.1); },
        'Roof map': () => { prepare(3); cur.flags.pastShutter = true; game.view(0, -60, 0, 0, 20); state.mapReveal = 2.4; simulate(0.2); },
        'Echo shutter': () => { prepare(3); game.view(-3.6, -18.6, 0); toggleEcho(); keys.KeyE = true; simulate(4); keys.KeyE = false; toggleEcho();
          game.view(0, -18.5, 0); keys.KeyW = true; simulate(2); keys.KeyW = false; return check(cur.flags.pastShutter, 'Echo holds the override while the player crosses'); },
        'Crawl duct': () => { prepare(3); game.view(-9, -32.5, Math.PI / 2); keys.KeyZ = true; simulate(0.1); interact(); keys.KeyW = true; simulate(10.5); keys.KeyW = false; keys.KeyZ = false;
          return check(cur.flags.vented && !state.vent, 'duct crossed along its visible bends'); },
        'Duct interior': () => { prepare(3); game.view(-9, -32.5, Math.PI / 2); keys.KeyZ = true; simulate(0.1); interact(); keys.KeyW = true; simulate(4); keys.KeyW = false; simulate(0.1); return check(Boolean(state.vent), 'view is inside the physical duct'); },
        'Stairwell': () => { useAt(6, -43.5); keys.KeyW = true; simulate(16); keys.KeyW = false; simulate(0.1); return check(player.base === 20 && !state.climb, 'climbed the stairwell to the roof landing'); },
        'Two sensors': () => { game.view(-3, -60, 0, 0, 20); resetEcho(); toggleEcho(); simulate(4); toggleEcho(); game.view(3, -60, 0, 0, 20); simulate(0.2);
          return check(cur.flags.armed, 'player and replay satisfy the two-operator interlock'); },
        'Open hatch': () => { game.view(0, -65.8, 0, 0, 20); keys.KeyE = true; simulate(3.7); keys.KeyE = false;
          return check(cur.flags.hatch, 'roof hatch released'); },
        'Zipline ride': () => { useAt(0, -78, 0, 20); simulate(4); return check(Boolean(state.zip), 'trolley mounted; ride is animated'); },
        'Finish ride': () => { simulate(6.5); return check(state.ended === 'won', 'line reaches the service roof'); },
        'CCTV view': () => { game.cctv(0); simulate(0.1); },
        'Close CCTV': () => { game.cctv(-1); simulate(0.1); },
      }, game.state);
      document.addEventListener('keydown', (event) => { if (event.code === 'F9') { document.body.classList.toggle('capture-still'); event.preventDefault(); } });
    }
  } else {
    requestAnimationFrame(frame);
  }
}

start().catch((error) => {
  const el = document.getElementById('loading');
  el.textContent = 'COULD NOT LOAD THE MUSEUM · ' + error.message;
  el.classList.remove('is-hidden');
  console.error(error);
});
