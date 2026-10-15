import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createSoundField, createMaterials, createLighting, createSkybox, createPostFX, createCCTV, createMinimap,
  createLaserSystem, applyHologram, loadCharacter, spawnCharacter, blobShadow, suit, FORWARD, QUALITY, createGalaCrowd,
  RING_COLOURS, LAYER_WORLD_ONLY, rendererStats
} from './render/index.js';
import { buildHall } from './world/hall.js';
import { buildLevel } from './world/levelBuilder.js';
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
import { createZiplineRig } from './render/ziplineRig.js';
import { createNavigation } from './gameplay/navigation.js';

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
const HALL_BOUNDS = { minX: -13, maxX: 13, minZ: -62, maxZ: 8 };
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
];

// Deliberate formalwear palette: cream, steel blue, emerald, plum and rose.
const GALA_COLOURS = [0x42658c, 0x3778b8, 0xb3aa94, 0xbc4261, 0x68717a, 0x278f73, 0x8b6b50, 0x9b5fbc, 0x455d7a, 0x657177, 0xd3a956, 0xba507e, 0x6c4851, 0x388a9f];
GALA_GUESTS.forEach((guest, i) => { guest.colour = GALA_COLOURS[i]; });

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
    credits: $('credits'), closeCredits: $('close-credits')
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
      restart: () => restore(checkpoints.restore() ?? snapshotCheckpoint()),
      newHeist: () => newHeist(),
      loadLevel: (n) => enterLevel(n),
      quality: (q) => {
        state.auto = q === 'auto';
        if (q !== 'auto') { applyQuality(q); setMode(state.mode); }
      }
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

  // Xbot is kept for the Echo; the gala uses a purpose-built instanced crowd
  // so suits and dresses read clearly without fourteen skinned models.
  const xbot = await loadCharacter('./models/xbot.glb');
  const guests = createGalaCrowd(GALA_GUESTS);
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
  const echoMarker = minimap.addMarker(echoActor.root, RING_COLOURS.echo, 1.3);
  echoMarker.mesh.visible = false;

  const player = { position: new THREE.Vector3(), base: 0, y: 0, vy: 0, yaw: 0, pitch: -0.04, step: 0, height: 1.68, profile: MOVEMENT.run, moving: false };
  const playerMarker = new THREE.Object3D();
  scene.add(playerMarker);
  minimap.addMarker(playerMarker, RING_COLOURS.player, 1.9, Math.PI);

  const keys = {};
  const throwables = [];
  const decoyGeometry = new THREE.SphereGeometry(THROW.radius, 10, 7);
  const decoyMaterial = new THREE.MeshStandardMaterial({ color: 0xc18b43, metalness: 0.7, roughness: 0.35 });
  const state = {
    mode: 'gala', dampen: false, cell: 6, pip: false, map: true, quality: 'medium', auto: !qa,
    damage: 0, locked: false, sonarCooldown: 0, mapReveal: 0, laserCooldown: 0, exposure: 0,
    hasKeycard: false, hasStar: false, inSafe: false, ended: null, detections: 0, time: 0,
    echoStep: 0, echoLast: new THREE.Vector3(), fadeEcho: 0, lastDt: 1 / 60, safeGlow: 0, safeNoise: 0,
    zip: null, vent: null, searchCooldown: 0, attract: 0,
    decoyCharges: 3, decoyRecharge: 0, throwCooldown: 0, socialHeat: 0,
    lifting: false, witnessCooldown: 0, spawnGrace: 0
  };
  const tmp = { dir: new THREE.Vector3(), next: new THREE.Vector3(), probe: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3() };

  function emitNoise(position, colour, radius, { source, damped = false, speed, strength = 0.85, cause } = {}) {
    if (cause === 'sonar') state.mapReveal = 2.4;
    const y = position.y ?? 0;
    field.emit(tmp.next.set(position.x, y + 0.02, position.z), colour, radius, { speed: speed ?? Math.max(5, radius * 0.9), strength, source });
    if (damped || !cur) return;
    if (cur.n === 1 && source === 'player' && cause === 'footstep'
      && galaCover({ z: player.position.z, movement: player.profile.id, gadgetHeat: state.socialHeat, compromised: cur.flags.coverBlown }).safe) return;
    const reach = radius * (HEARING[state.mode] ?? 1);
    let heard = false;
    for (const g of cur.guards) {
      if (g.position.distanceTo(tmp.next.set(position.x, y, position.z)) <= reach) heard = g.hear(position, strength) || heard;
    }
    if (heard && cause) alarm.raise(ALARM_RAISE[cause] ?? 4, cause);
  }

  function canStand(x, z, r = 0.35, y = player.base) {
    if (!cur) return false;
    if (cur.built) return cur.built.inside(x, z, r, y);
    return hall.inside(tmp.probe.set(x, 0, z), r);
  }

  function clearDecoys() {
    for (const item of throwables) scene.remove(item.mesh);
    throwables.length = 0;
  }

  function throwBlockedAt(x, y, z) {
    return !canStand(x, z, THROW.radius, Math.max(0, y - THROW.radius));
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
    }) || state.decoyCharges <= 0 || state.zip || state.vent) return false;
    const forward = tmp.dir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const mesh = new THREE.Mesh(decoyGeometry, decoyMaterial);
    mesh.castShadow = true;
    mesh.position.copy(camera.position).addScaledVector(forward, 0.45);
    mesh.position.y -= 0.22;
    scene.add(mesh);
    minimap.hideFromMap(mesh);
    throwables.push({
      mesh,
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
      const impact = advanceThrow(item.mesh.position, item.velocity, dt, throwBlockedAt);
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
    const cameraDefs = isHall
      ? HALL_CAMERAS.map((c) => ({ ...c, position: v3(c.position), target: v3(c.target) }))
      : data.cameras.map(cameraFromData);
    const cctv = createCCTV(renderer, scene, cameraDefs, { aspect: window.innerWidth / window.innerHeight });
    for (const feed of cctv.feeds) feed.camera.layers.enable(LAYER_WORLD_ONLY);
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
      n, data, built, props, cctv, cctvSystem, cameraDefs, lasers,
      plates: createPlateSystem(plateDefs, { events }),
      guards: [],
      bounds: built ? built.collision.bounds() : HALL_BOUNDS,
      use: Object.fromEntries(data.interactables.map((i) => [i.id, i])),
      flags: {}
    };
    cur.elapsed = 0;
    cur.navigation = createNavigation(cur.bounds, (x, z) => canStand(x, z, 0.4, 0));
    cur.guards = data.guards.map(makeGuard);
    state.mapReveal = 0;
    state.decoyCharges = data.decoys?.charges ?? 3;
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
    ui.mode.textContent = LEVEL_LABEL[n];
    setMode(LEVEL_MODE[n]);
    const loaded = cur;
    loaded.warming = !qa;
    loaded.ready = qa ? (renderer.compile(scene, camera), Promise.resolve())
      : renderer.compileAsync(scene, camera).finally(() => { loaded.warming = false; });
    return cur;
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
      g.torch.visible = mode !== 'gala';
      g.torch.castShadow = mode !== 'gala' && state.quality === 'high';
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
    if (state.ended || state.inSafe || state.vent || state.zip || cur.cctv.active >= 0) return '';
    if (cur.n === 1) {
      if (cur.flags.coverBlown) return 'Guest cover blown  ·  Stay out of sight and complete the exit route';
      if (cur.elapsed < 8) return 'WASD move  ·  Mouse look  ·  Shift quiet walk';
      if (!state.hasKeycard) return 'Tab CCTV  ·  Select Grand Hall, E to loop  ·  Copy during an inspection stop';
      return cur.flags.nightEntry ? 'Return to the lobby  ·  E at the public exit' : 'Beyond the velvet rope, your guest cover no longer works';
    }
    if (cur.n === 2) {
      if (player.position.z > -7) return 'Z crawl under the high beam  ·  Hold Shift for quiet footsteps';
      if (player.position.z > -13) return 'Space jump the low beam  ·  Release Z before jumping';
      if (player.position.z > -23) return 'Watch the beam cycle  ·  The side duct is slower but avoids the inner checkpoint';
      return state.hasStar ? 'Back to the marked staff fire door' : 'Stay behind the archive crates when Briggs passes  ·  G sonar reveals the room';
    }
    if (!cur.flags.pastShutter) return 'Q record  →  hold E at the override for several seconds  →  Q rewind  →  walk through';
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
      flags: { ...cur.flags },
      collected: pickups.items.filter((i) => i.collected).map((i) => i.id),
      alarm: Math.min(alarm.snapshot().value, 50),
      timeLeft: cur.timeLeft ?? 0
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
    player.position.set(x, y, z);
    player.base = y;
    player.yaw = yaw;
    player.pitch = -0.04;
    player.y = 0;
    player.vy = 0;
  }

  function restore(payload) {
    if (payload.level !== cur.n) loadLevel(payload.level);
    placePlayer(payload.player.x, payload.player.y ?? 0, payload.player.z, payload.player.yaw);
    state.hasKeycard = payload.hasKeycard;
    state.hasStar = Boolean(payload.hasStar);
    if (cur.okafor && cur.props.keycard) {
      cur.okafor.root.add(cur.props.keycard);
    }
    pickpocket.reset(payload.hasKeycard);
    for (const item of pickups.items) item.collected = payload.collected.includes(item.id);
    cur.props.reset(payload.collected);
    cur.flags = { ...payload.flags };
    if (cur.flags.safeOpened && cur.props.safe) {
      cur.props.safe.open = 1;
      cur.props.safe.hinge.rotation.y = -Math.PI * 0.6;
      cur.props.safe.gem.visible = !state.hasStar;
    }
    if (cur.flags.sensorDisabled) cur.props.setPanel('tamper_panel', 0x23ff7a);
    if (cur.flags.nightEntry) cur.props.setPanel('reader', 0x23ff7a);
    cur.plates.reset();
    cur.cctvSystem.reset();
    for (const g of cur.guards) g.reset();
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
    zipRig.hide();
    camera.fov = 68; camera.updateProjectionMatrix();
    state.vent = null;
    ui.fade.classList.remove('is-on');
    ui.fade.style.transition = '';
    state.dampen = false;
    hud.end(null);
    hud.safe(false);
    hud.clearTransient();
    if (cur.n === 2) safe = createSafecrackSystem({ combination: randomCombination(), events });
    if (cur.n === 3) {
      cur.timeLeft = Math.max(payload.timeLeft || cur.data.lockdownSeconds, 90);
      alarm.setFloor(55, 'lockdown');
      if (cur.flags.armed) cur.props.plates.forEach((_, i) => cur.props.setPlate(i, false, true));
      if (cur.flags.hatch) openHatch(true);
      // The shutter seals behind the escape; its collision follows its visible lift.
    }
    setMode(LEVEL_MODE[cur.n]);
  }

  function enterLevel(n) {
    for (const key of Object.keys(keys)) keys[key] = false;
    loadLevel(n);
    state.hasKeycard = n > 1 || state.hasKeycard;
    const s = cur.data.spawn;
    const payload = {
      level: n,
      player: { x: s[0], y: s[1], z: s[2], yaw: n === 1 ? Math.atan2(-6, 21) : 0 },
      hasKeycard: state.hasKeycard,
      hasStar: state.hasStar,
      flags: {},
      collected: pickups.items.filter((i) => i.collected).map((i) => i.id),
      alarm: 0,
      timeLeft: cur.data.lockdownSeconds ?? 0
    };
    restore(payload);
    checkpoints.save(n === 1 ? 'start' : 'level-' + n, snapshotCheckpoint());
    story.setLevel(n);
    screens.setLevel(n);
    state.attract = 0;
    return cur.ready;
  }

  function newHeist() {
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
    hud.toast((cur.cameraDefs[id]?.name ?? 'A CAMERA') + ' SAW YOU');
    for (const g of cur.guards) g.hear(player.position, 0.6);
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
      echoActor.root.position.set(rewind.x, rewind.y ?? 0, rewind.z);
      state.echoLast.copy(echoActor.root.position);
      placePlayer(rewind.x, rewind.y ?? 0, rewind.z, rewind.yaw);
      hud.toast('REWIND · YOUR ECHO IS REPLAYING');
      emitNoise(player.position, RING_COLOURS.echo, 4, { source: 'echo', damped: true });
    } else if (mode !== 'replaying') {
      resetEcho();
      echo.start(echoFrame());
      hud.toast('RECORDING ECHO · Q TO REWIND');
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
        for (const g of cur.guards) if (g.position.distanceTo(echoActor.root.position) < 1.1) echo.shatter('guard');
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

  function updateZip(dt) {
    const z = state.zip;
    z.elapsed += dt;
    const mount = Math.min(1, z.elapsed / 0.7);
    z.t = THREE.MathUtils.clamp((z.elapsed - 0.7) / 7.2, 0, 1);
    const { start, end } = cur.props.zip;
    const e = Math.pow(z.t, 1.3);
    camera.position.lerpVectors(start, end, e);
    camera.position.y -= 1.1 + Math.sin(e * Math.PI) * 0.35;
    camera.position.lerp(z.from, 1 - mount);
    const wantLean = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    z.lean += (wantLean - z.lean) * Math.min(1, dt * 4);
    camera.position.x += z.lean * 0.25 * Math.sin(e * Math.PI);
    tmp.look.copy(end).sub(start).normalize();
    camera.rotation.set(-0.12 + Math.sin(elapsed * 7) * 0.008 * e, facing(tmp.look.x, tmp.look.z), -z.lean * 0.045);
    camera.fov = 68 + Math.sin(e * Math.PI) * 8; camera.updateProjectionMatrix();
    zipRig.update(mount, e, z.lean, elapsed);
    if (z.t >= 1 && !z.done) {
      z.done = true;
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

  function updatePlayer(dt, time) {
    if (state.zip) { updateZip(dt); return; }
    if (state.vent) { updateVent(dt, time); return; }
    if (state.inSafe || state.ended || cur.cctv.active >= 0) return;
    const stam = stamina.snapshot();
    let profile = movementProfile(keys, { damped: state.dampen });
    if (profile.id === 'sprint' && !stam.canSprint) profile = movementProfile(keys, { damped: state.dampen, mode: MOVEMENT.run });
    player.profile = profile;
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.1 * dt;
    player.pitch = THREE.MathUtils.clamp(player.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.5 * dt, -1.3, 1.3);
    player.moving = f !== 0 || s !== 0;
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
    camera.rotation.set(player.pitch, player.yaw, 0);
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;

    if (!cur.lasers) return;
    state.laserCooldown = Math.max(0, state.laserCooldown - dt);
    const hit = cur.lasers.hitsBody(player.position, { height: player.height, jump: player.y, base: player.base });
    if (hit && state.laserCooldown <= 0) {
      state.laserCooldown = 1.5;
      state.damage = 1;
      alarm.raise(ALARM_RAISE.laser, 'laser');
      events.emit('hazard:trip', { kind: 'laser' });
      emitNoise(player.position, RING_COLOURS.alert, 10, { source: 'laser', strength: 1 });
      hud.toast('LASER TRIPPED');
    }
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
      if (near(player.position, cur.use.gala_exit.usePos, 2)) return { id: 'gala_exit', text: cur.flags.nightEntry ? 'E · LEAVE THE GALA' : 'NIGHT ENTRY NOT READY · COMPLETE THE RECON' };
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
      if (cur.props.safe.open === 0 && near(player.position, cur.use.safe.usePos, 1.6)) return { id: 'safe', text: cur.flags.sensorDisabled ? 'E · CRACK THE SAFE' : 'TAMPER SENSOR LIVE · ISOLATE WEST SERVICE PANEL' };
      if (near(player.position, cur.use.service_exit.usePos, 1.25)) return { id: 'service_exit', text: state.hasStar ? 'E · TAKE THE SERVICE FIRE DOOR' : 'SERVICE FIRE DOOR · RECOVER THE STAR FIRST' };
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

  function updateInteractions(dt) {
    state.lifting = false;
    if (state.vent) return;
    if (state.ended || state.inSafe || state.zip || cur.cctv.active >= 0) { hud.prompt(null); return; }
    if (!state.hasKeycard && cur.okafor) {
      const target = { position: cur.okafor.position, yaw: cur.okafor.yaw, state: cur.okafor.state, stationary: cur.okafor.pauseTimer > 0.5 && cur.okafor.checkingGuest <= 0, id: 'okafor' };
      const inPosition = pickpocketAccess(player.position, target);
      const witnessed = inPosition && galaWitnessNearby(player.position, GALA_GUESTS.slice(0, QUALITY[state.quality].crowdLimit));
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
      if (r.eligible) { hud.prompt('HOLD E · COPY BADGE CODE', r.progress / PICKPOCKET_SECONDS); return; }
      if (pickpocketAccess(player.position, { ...target, stationary: true })) { hud.prompt('WAIT FOR HIS INSPECTION STOP · NO NEED TO FOLLOW'); return; }
    }
    const item = nearbyPickup();
    if (item && Math.abs(item.y - player.base) < 3) { hud.prompt('E · TAKE ' + item.label.toUpperCase() + (item.value ? ' · $' + item.value.toLocaleString('en-US') : '')); return; }
    const spot = interactionAt();
    if (spot) {
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
  }

  function nearbyPickup() {
    return pickups.nearby(player.position, cur.n, 1.7, (item) => item.id !== 'kestrel_star' || cur.props.safe.open >= 0.85);
  }

  function interact() {
    if (state.ended || state.zip || state.vent) return;
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
    if (spot.id === 'gala_exit' && missionPhase(1, state, cur.flags).exitReady) complete(1, 'RECON COMPLETE · LEAVING THE GALA');
    if (spot.id === 'service_exit' && missionPhase(2, state, cur.flags).exitReady) complete(2, 'SERVICE DOOR · SOMETHING IS WRONG');
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
      const to = cur.use.stairs.to;
      placePlayer(to[0], to[1], to[2], facing(-to[0], -60 - to[2]));
      hud.toast('STAIRWELL · TOP FLOOR');
      checkpoints.save('level-3-roof', snapshotCheckpoint());
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
    if (s.open > 0 && s.open < 1) {
      s.open = Math.min(1, s.open + dt * 0.6);
      s.hinge.rotation.y = -s.open * Math.PI * 0.6;
    }
    if (!state.inSafe) return;
    const fb = safe.feedback();
    hud.safe(true, { ...snap, strength: fb.strength });
    state.safeGlow = fb.strength > 0.9 ? 0.35 : 0;
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
      const inDoor = Math.abs(player.position.x) < 2.4 && player.position.z < -19.7 && player.position.z > -20.5 && player.base < 10;
      if (inDoor) player.position.z = player.position.z < -20.1 ? -20.65 : -19.6;
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
    const order = ['pursue', 'search', 'investigate', 'patrol'];
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
    const mapW = Math.round(w * (state.quality === 'low' ? 0.13 : 0.17));
    const pip = { x: w - pipW - 24, y: 24, w: pipW, h: Math.round(pipW * 9 / 16) };
    const map = { x: w - mapW - 24, y: h - Math.round(mapW * 2 / 3) - 24, w: mapW, h: Math.round(mapW * 2 / 3) };
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
    if (cur.warming) { if (!qa) requestAnimationFrame(frame); return; }
    renderer.info.reset();
    const menu = screens.inMenu;
    const dt = screens.blocking ? 0 : raw;
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
      story.update(0, player, cur.guards);
      screens.update(0);
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    menuFrame = 0;
    const playing = !state.ended;
    if (playing) { state.time += dt; cur.elapsed += dt; }
    updatePlayer(dt, elapsed);
    document.body.dataset.traversal = state.zip ? 'zipline' : state.vent ? 'vent' : '';
    updateExposure(dt);
    state.socialHeat = Math.max(0, state.socialHeat - dt);
    state.witnessCooldown = Math.max(0, state.witnessCooldown - dt);
    state.spawnGrace = Math.max(0, state.spawnGrace - dt);
    const cover = cur.n === 1
      ? galaCover({ z: player.position.z, movement: player.profile.id, gadgetHeat: state.socialHeat, lifting: state.lifting, compromised: cur.flags.coverBlown })
      : { safe: false, reason: '' };
    document.body.dataset.cover = cover.safe ? 'safe' : 'broken';
    const alarmSnap = alarm.update(playing ? dt : 0, { canDecay: cur.guards.every((g) => g.state !== 'pursue') });
    const ctx = {
      mode: state.mode,
      time: elapsed,
      alarm: alarmSnap,
      canStand: (x, z) => canStand(x, z, 0.4, 0),
      clearView: cur.built ? cur.built.collision.clearView : null,
      player: { position: player.position, crouching: stance(), blending: cover.safe || state.ended || Boolean(state.vent) || player.base > 10 || state.spawnGrace > 0, visible: state.exposure > 0 && !state.ended && player.base < 10 && !cover.safe },
      onPulse: (g) => field.emit(tmp.next.set(g.position.x, 0.02, g.position.z), RING_COLOURS.guard, 6, { speed: 4.5, strength: 0.9, source: 'guard' })
    };
    if (playing && dt > 0) for (const g of cur.guards) g.update(dt, ctx);
    if (playing && cur.cctv.feeds.length) cur.cctvSystem.update(dt, player.position, {
      clear: () => state.spawnGrace <= 0 && (cur.n !== 1 || !cover.safe)
    });
    updateEcho(playing ? dt : 0, elapsed);
    updateDecoys(playing ? dt : 0);
    if (playing) updateDoors(dt);
    updateInteractions(dt);
    updateSafe(dt);
    if (playing) updateLevelClock(dt);
    updateCrowd(dt);
    cur.props.update(dt, elapsed);
    cur.built?.update(dt, elapsed);
    field.update(dt);
    lighting.update(dt, elapsed);
    skybox.update(dt, elapsed, cur.cctv.active >= 0 ? cur.cctv.feeds[cur.cctv.active].camera : camera);
    cur.lasers?.update(elapsed);
    cur.cctv.update(dt);
    state.mapReveal = Math.max(0, state.mapReveal - dt);
    const fullMap = state.mapReveal > 0;
    const boundsWidth = cur.bounds.maxX - cur.bounds.minX + 4;
    const boundsHeight = cur.bounds.maxZ - cur.bounds.minZ + 4;
    minimap.setView(fullMap ? Math.max(24, boundsWidth) : 10, fullMap ? Math.max(16, boundsHeight) : 7);
    ui.map.classList.toggle('full', fullMap);
    ui.mapLabel.textContent = fullMap ? 'TACTICAL MAP · FULL / SONAR' : 'TACTICAL MAP · LOCAL';
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
      alarm: state.mode === 'lockdown' ? 1 : alarmGlow * 0.6,
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
    hud.objective(objectiveText());
    hud.hint(controlHint());
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
    if (cur.cctv.active >= 0) {
      if (e.code === 'Tab' || e.code === 'KeyQ' || e.code === 'Backspace') {
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
    if (e.code === 'KeyQ' || e.code === 'Backspace') {
      if (state.inSafe) { state.inSafe = false; hud.safe(false); }
      else if (e.code === 'KeyQ') toggleEcho();
    }
    if (state.inSafe || state.zip || state.vent) return;
    if (e.code === 'Space' && player.y === 0 && player.profile.id !== 'crawl') { player.vy = 4.6; events.emit('player:jump', {}); }
    if (e.code === 'KeyG' && state.sonarCooldown <= 0) {
      state.sonarCooldown = 2.6;
      if (cur.n === 1) state.socialHeat = 4;
      emitNoise(player.position, RING_COLOURS.player, 16, { source: 'player', damped: state.dampen, speed: 14, strength: 1, cause: 'sonar' });
    }
    if (e.code === 'Tab') {
      if (cur.cctv.feeds.length) { cur.cctv.enter(); rects = layoutOverlays(); } else hud.toast('NO CAMERAS ON THIS FLOOR');
    }
    if (e.code === 'KeyF' && (state.dampen || state.cell > 0.7)) state.dampen = !state.dampen;
    if (e.code === 'KeyP') { state.pip = !state.pip; rects = layoutOverlays(); }
    if (e.code === 'KeyM') { state.map = !state.map; rects = layoutOverlays(); }
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) throwDecoy(); });
  canvas.addEventListener('click', () => { if (!state.locked && !screens.inMenu) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) for (const k of Object.keys(keys)) keys[k] = false;
    screens.lockChanged(state.locked);
    rects = layoutOverlays();
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked || cur.cctv.active >= 0 || state.zip || state.vent) return;
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
      freezeGuards(on = true) { for (const g of cur.guards) g.speed = on ? 0 : g.def.speed; },
      state: () => ({
        level: cur.n,
        player: { x: player.position.x, z: player.position.z, base: player.base, y: player.y, profile: player.profile.id },
        alarm: alarm.snapshot().value, alarmLevel: alarm.snapshot().level.id, hasKeycard: state.hasKeycard, hasStar: state.hasStar, flags: { ...cur.flags },
        inSafe: state.inSafe, ended: state.ended, echo: echo.snapshot().mode, take: pickups.snapshot().cash,
        evidence: pickups.snapshot().evidence.length, safe: safe.snapshot(), mode: state.mode, timeLeft: cur.timeLeft,
        shutter: cur.props.shutter?.lift, zip: state.zip?.t, screen: screens.state
      })
    };
    window.__ready = true;
    if (import.meta.env.DEV) {
      const { installReviewTools } = await import('./dev/review.js');
      const game = window.__game;
      const simulate = (seconds) => { state.skipRender = true; game.step(seconds); state.skipRender = false; game.step(0.04); };
      const prepare = (n) => { if (cur.n !== n || state.ended) enterLevel(n); screens.show('playing'); state.locked = true; game.freezeGuards(true); };
      const check = (condition, message) => { if (!condition) throw new Error(message); return 'PASS · ' + message; };
      const useAt = (x, z, yaw = 0, y = 0) => { game.view(x, z, yaw, 0, y); simulate(0.04); interact(); simulate(0.04); };
      installReviewTools({
        'Gala view': () => { newHeist(); prepare(1); game.view(-1.2, 1.1, 0); simulate(0.1); },
        'Officer view': () => { prepare(1); game.view(-9.6, -16, Math.PI); simulate(0.1); },
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
        'Echo shutter': () => { prepare(3); game.view(-3.6, -18.6, 0); toggleEcho(); keys.KeyE = true; simulate(4); keys.KeyE = false; toggleEcho();
          game.view(0, -18.5, 0); keys.KeyW = true; simulate(2); keys.KeyW = false; return check(cur.flags.pastShutter, 'Echo holds the override while the player crosses'); },
        'Crawl duct': () => { prepare(3); game.view(-9, -32.5, Math.PI / 2); keys.KeyZ = true; simulate(0.1); interact(); keys.KeyW = true; simulate(10.5); keys.KeyW = false; keys.KeyZ = false;
          return check(cur.flags.vented && !state.vent, 'duct crossed along its visible bends'); },
        'Duct interior': () => { prepare(3); game.view(-9, -32.5, Math.PI / 2); keys.KeyZ = true; simulate(0.1); interact(); keys.KeyW = true; simulate(4); keys.KeyW = false; simulate(0.1); return check(Boolean(state.vent), 'view is inside the physical duct'); },
        'Stairwell': () => { useAt(8, -43.5); return check(player.base === 20, 'stairwell leads to the roof landing'); },
        'Two sensors': () => { game.view(-3, -60, 0, 0, 20); resetEcho(); toggleEcho(); simulate(4); toggleEcho(); game.view(3, -60, 0, 0, 20); simulate(0.2);
          return check(cur.flags.armed, 'player and replay satisfy the two-operator interlock'); },
        'Open hatch': () => { game.view(0, -65.8, 0, 0, 20); keys.KeyE = true; simulate(3.7); keys.KeyE = false;
          return check(cur.flags.hatch, 'roof hatch released'); },
        'Zipline ride': () => { useAt(0, -78, 0, 20); simulate(4); return check(Boolean(state.zip), 'trolley mounted; ride is animated'); },
        'Finish ride': () => { simulate(5); return check(state.ended === 'won', 'line reaches the service roof'); },
        'CCTV view': () => { game.cctv(0); simulate(0.1); },
        'Close CCTV': () => { game.cctv(-1); simulate(0.1); },
      }, game.state);
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
