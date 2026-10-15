import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createSoundField, createMaterials, createLighting, createSkybox, createPostFX, createCCTV, createMinimap,
  createLaserSystem, applyHologram, loadCharacter, spawnCharacter, blobShadow, suit, FORWARD, QUALITY,
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
import { createPickpocketSystem, PICKPOCKET_SECONDS } from './gameplay/pickpocket.js';
import { createPickupSystem } from './gameplay/pickups.js';
import { createPlateSystem } from './gameplay/plates.js';
import { canUseDecoy, movementProfile, MOVEMENT } from './gameplay/player.js';
import { createSafecrackSystem } from './gameplay/safecrack.js';
import { createStaminaSystem } from './gameplay/stamina.js';
import { THROW, advanceThrow, impactRadius } from './throwing.js';
import { createGuardAI } from './game/guardAI.js';
import { createHud } from './game/hud.js';
import { createAudio } from './audio.js';
import { createStory } from './story.js';
import { createScreens } from './screens.js';

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
const GUESTS = [
  [-2.9, -2.6, 2.2, 'idle', 0.4, 0x15171c], [-1.9, -1.9, -2.6, 'agree', 0.8, 0x0e1b2e], [-2.2, -3.5, 0.3, 'idle', 1.6, 0x23201c],
  [2.9, -5.6, -1.2, 'idle', 0.1, 0x101010], [2.0, -6.4, 0.9, 'headShake', 0.5, 0x2a1418],
  [-6.6, -7.4, -1.6, 'idle', 1.1, 0x17191f],
  [5.4, -13.2, 0.4, 'idle', 0.7, 0x111317], [6.3, -12.4, -2.4, 'agree', 1.4, 0x1d1b17],
  [-3.8, -17.5, 1.0, 'idle', 1.8, 0x141414], [-4.6, -16.6, 2.6, 'headShake', 1.0, 0x231812],
  [1.2, -26, 0.2, 'idle', 0.9, 0x101216]
];
const DANCERS = [[-1.2, -6.2, 0.6, 3.4], [3.6, -13.6, -2.4, 7.9], [-5.6, -21.5, 1.4, 12.2]];

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
    stage: level.id, x: p.pos[0], y: p.pos[1], z: p.pos[2]
  })));
}

async function start() {
  const qa = new URLSearchParams(location.search).has('qa');
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 500);
  camera.layers.enable(LAYER_WORLD_ONLY);
  camera.rotation.order = 'YXZ';

  const field = createSoundField();
  const materials = createMaterials(field, { maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });
  const hall = await buildHall(scene, materials, renderer, { width: window.innerWidth, height: window.innerHeight });
  const minimap = createMinimap(renderer, scene, { width: 24, height: 16 });
  minimap.hideFromMap(hall.ceilingGroup);
  const lighting = createLighting(scene, renderer, hall.layout, materials);
  const skybox = createSkybox();
  scene.add(skybox.mesh);
  minimap.hideFromMap(skybox.mesh);
  const fx = createPostFX(renderer, scene, camera, { quality: 'medium' });

  const [xbot, michelle, soldier] = await Promise.all(['./models/xbot.glb', './models/michelle.glb', './models/soldier.glb'].map(loadCharacter));
  const guests = new THREE.Group();
  scene.add(guests);
  const crowd = [];
  for (const [x, z, r, clip, t, colour] of GUESTS) {
    const a = spawnCharacter(xbot, { clip, time: t, position: new THREE.Vector3(x, 0, z), rotationY: r, forward: FORWARD.xbot, recolor: suit(colour), castShadow: false, cull: true });
    a.root.add(blobShadow());
    guests.add(a.root);
    crowd.push(a);
  }
  for (const [x, z, r, t] of DANCERS) {
    const a = spawnCharacter(michelle, { clip: 'SambaDance', time: t, position: new THREE.Vector3(x, 0, z), rotationY: r, forward: FORWARD.michelle, castShadow: false, cull: true });
    a.root.add(blobShadow());
    guests.add(a.root);
    crowd.push(a);
  }

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
    mode: 'gala', dampen: false, cell: 6, pip: true, map: true, quality: 'medium', auto: !qa,
    damage: 0, locked: false, sonarCooldown: 0, mapReveal: 0, laserCooldown: 0, exposure: 0,
    hasKeycard: false, inSafe: false, ended: null, detections: 0, time: 0,
    echoStep: 0, echoLast: new THREE.Vector3(), fadeEcho: 0, lastDt: 1 / 60, safeGlow: 0, safeNoise: 0,
    zip: null, vent: null, searchCooldown: 0, attract: 0,
    decoyCharges: 3, decoyRecharge: 0, throwCooldown: 0
  };
  const tmp = { dir: new THREE.Vector3(), next: new THREE.Vector3(), probe: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3() };

  function emitNoise(position, colour, radius, { source, damped = false, speed, strength = 0.85, cause } = {}) {
    if (cause === 'sonar') state.mapReveal = 2.4;
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
    const actor = spawnCharacter(soldier, { clip: 'Walk', position: waypoints[0], forward: FORWARD.soldier, recolor: suit(0x0b0f14), field });
    scene.add(actor.root);
    const torch = new THREE.SpotLight(0xe8f2ff, 260, 18, 0.3, 0.45, 1.3);
    torch.position.set(0.2, 1.35, 0.35);
    const aim = new THREE.Object3D();
    aim.position.set(0.2, 0.1, 6);
    actor.root.add(torch, aim);
    torch.target = aim;
    const marker = minimap.addMarker(actor.root, RING_COLOURS.guard, 1.7);
    const guard = createGuardAI({ id: guardId(def.name), actor, torch, waypoints, speed: def.speed, events });
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
    guests.visible = isHall;
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
    cur.guards = data.guards.map(makeGuard);
    state.mapReveal = 0;
    state.decoyCharges = data.decoys?.charges ?? 3;
    state.decoyRecharge = 0;
    state.throwCooldown = 0;
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
    renderer.compile(scene, camera);
    return cur;
  }

  function applyQuality(name) {
    state.quality = name;
    const q = QUALITY[name];
    fx.setQuality(name);
    hall.setReflection(q.reflection, window.innerWidth, window.innerHeight);
    cur?.cctv.setRate(q.feedRate);
    minimap.setRate(q.mapRate);
  }

  function setMode(mode) {
    state.mode = mode;
    lighting.setMode(mode);
    skybox.setMode(mode);
    hall.setMode(mode);
    if (cur && cur.n !== 1) {
      const look = cur.data.look;
      scene.fog.color.set(look.fog.color);
      scene.fog.density = look.fog.density;
      skybox.mesh.visible = cur.n === 3;
    } else {
      skybox.mesh.visible = true;
      guests.visible = mode === 'gala';
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
    const f = cur.flags;
    if (cur.n === 1) {
      if (!state.hasKeycard) return 'Lift Okafor’s keycard. He patrols the west wall';
      return 'Swipe the keycard at the vault wing door, end of the corridor';
    }
    if (cur.n === 2) {
      if (cur.props.safe.open > 0) return 'Safe open. The wing is sealing';
      if (player.position.z > -22 && !f.vented) return 'Get through the lasers. Crawl, jump, or time it. The vent skips it';
      return 'Crack the safe. Listen for the click, mind Briggs';
    }
    if (!f.pastShutter) return 'Record your Echo holding the shutter override, then walk through';
    if (player.base < 10) return 'Lure the sweep team away, then take the stairwell (north-east)';
    if (!f.armed) return 'You and your Echo on both plates at once';
    if (!f.hatch) return 'Hold the roof override to open the hatch';
    return 'Get to the zipline';
  }

  function snapshotCheckpoint() {
    return {
      level: cur.n,
      player: { x: player.position.x, y: player.base, z: player.position.z, yaw: player.yaw },
      hasKeycard: state.hasKeycard,
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
    if (cur.okafor && cur.props.keycard) {
      if (payload.hasKeycard) cur.props.keycard.removeFromParent();
      else cur.okafor.root.add(cur.props.keycard);
    }
    pickpocket.reset(payload.hasKeycard);
    for (const item of pickups.items) item.collected = payload.collected.includes(item.id);
    cur.props.reset(payload.collected);
    cur.flags = { ...payload.flags };
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
    state.zip = null;
    state.vent = null;
    ui.fade.classList.remove('is-on');
    ui.fade.style.transition = '';
    state.dampen = false;
    hud.end(null);
    hud.safe(false);
    if (cur.n === 2) safe = createSafecrackSystem({ combination: randomCombination(), events });
    if (cur.n === 3) {
      cur.timeLeft = Math.max(payload.timeLeft || cur.data.lockdownSeconds, 90);
      alarm.setFloor(55, 'lockdown');
      if (cur.flags.armed) cur.props.plates.forEach((_, i) => cur.props.setPlate(i, false, true));
      if (cur.flags.hatch) openHatch(true);
      if (cur.flags.pastShutter) cur.built.collision.unblock('shutter');
    }
    setMode(LEVEL_MODE[cur.n]);
  }

  function enterLevel(n) {
    loadLevel(n);
    state.hasKeycard = n > 1 || state.hasKeycard;
    const s = cur.data.spawn;
    const payload = {
      level: n,
      player: { x: s[0], y: s[1], z: s[2], yaw: n === 1 ? Math.atan2(-6, 21) : 0 },
      hasKeycard: state.hasKeycard,
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
  }

  function newHeist() {
    safe = createSafecrackSystem({ combination: randomCombination(), events });
    state.detections = 0;
    state.time = 0;
    state.hasKeycard = false;
    checkpoints.clear();
    for (const item of pickups.items) item.collected = false;
    enterLevel(1);
  }

  function openHatch(instant = false) {
    cur.flags.hatch = true;
    cur.built.collision.unblock('hatch');
    if (instant) {
      cur.props.hatch.lift = 2.6;
      cur.props.hatch.mesh.position.y = cur.props.hatch.base + 2.6;
    }
    cur.props.setPanel('roof_override', 0x23ff7a);
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
    cur.props.keycard?.removeFromParent();
    hud.toast('KEYCARD LIFTED');
    checkpoints.save('keycard', snapshotCheckpoint());
  });
  events.on('item:picked', (item) => {
    const mesh = cur.props.loot.get(item.id);
    if (mesh) mesh.visible = false;
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
    setMode('lockdown');
    complete(2, 'SAFE OPEN · THE WING IS SEALING');
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
    z.t = Math.min(1, z.t + dt / 4.2);
    const { start, end } = cur.props.zip;
    const e = z.t * z.t * (3 - 2 * z.t);
    camera.position.lerpVectors(start, end, e);
    camera.position.y -= 1.1;
    tmp.look.copy(end).sub(start).normalize();
    camera.rotation.set(-0.18, facing(tmp.look.x, tmp.look.z), 0);
    state.damage = Math.max(state.damage, 0.25 * Math.sin(z.t * Math.PI));
    if (z.t >= 1 && !z.done) {
      z.done = true;
      complete(3, 'OUT OVER THE RAIN');
    }
  }

  function updateVent(dt, time) {
    const v = state.vent;
    v.t += dt;
    const ease = (x) => x * x * (3 - 2 * x);
    if (!v.moved) {
      const k = ease(Math.min(1, v.t / 0.7));
      player.yaw = v.startYaw + Math.atan2(Math.sin(v.enterYaw - v.startYaw), Math.cos(v.enterYaw - v.startYaw)) * k;
      player.pitch = v.startPitch + (-0.12 - v.startPitch) * k;
      player.height += (0.42 - player.height) * Math.min(1, dt * 8);
      const push = k * 0.45;
      camera.position.set(player.position.x - Math.sin(player.yaw) * push, player.base + player.height + Math.sin(time * 9) * 0.02 * k, player.position.z - Math.cos(player.yaw) * push);
      camera.rotation.set(player.pitch, player.yaw, 0);
      ui.fade.classList.toggle('is-on', v.t > 0.35);
      if (v.t >= 1.3) {
        v.moved = true;
        cur.flags.vented = true;
        placePlayer(v.to[0], 0, v.to[2], v.yaw);
        player.height = 0.42;
        player.pitch = -0.08;
        emitNoise(player.position, RING_COLOURS.alert, 7, { source: 'vent', strength: 0.8, cause: 'footstep' });
      }
    } else {
      ui.fade.classList.toggle('is-on', v.t < 1.75);
      player.height += (0.58 - player.height) * Math.min(1, dt * 3);
      camera.position.set(player.position.x, player.base + player.height + Math.sin(time * 9) * 0.015, player.position.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
      if (v.t >= 2.4) {
        state.vent = null;
        ui.fade.style.transition = '';
        hud.toast('THROUGH THE VENT · THE GRATE RATTLED');
      }
    }
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
    const low = profile.id === 'crawl' ? 0.25 : profile.id === 'crouch' ? 0.45 : 0.4;
    const high = profile.height - 0.55;
    const hit = cur.lasers.hits(tmp.probe.set(player.position.x, player.y + low, player.position.z), 0.16)
      || cur.lasers.hits(tmp.probe.set(player.position.x, player.y + Math.max(low, high), player.position.z), 0.16);
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
      const door = cur.use.vault_door;
      if (near(player.position, door.usePos, 1.9)) return { id: 'vault_door', text: state.hasKeycard ? 'E · SWIPE THE KEYCARD' : 'VAULT WING · NEEDS OKAFOR’S KEYCARD' };
    }
    if (cur.n === 2) {
      for (const id of ['vent_in', 'vent_out']) {
        if (near(player.position, cur.use[id].usePos, 1.3)) return { id, text: stance() ? 'E · CRAWL THROUGH THE VENT' : 'VENT · CROUCH OR CRAWL TO FIT' };
      }
      if (cur.props.safe.open === 0 && near(player.position, cur.use.safe.usePos, 1.6)) return { id: 'safe', text: 'E · CRACK THE SAFE' };
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
    if (state.ended || state.inSafe || state.zip || state.vent || cur.cctv.active >= 0) { hud.prompt(null); return; }
    if (!state.hasKeycard && cur.okafor) {
      const r = pickpocket.update({
        dt,
        holding: Boolean(keys.KeyE) && state.locked,
        player: player.position,
        guard: { position: cur.okafor.position, yaw: cur.okafor.yaw, state: cur.okafor.state, id: 'okafor' }
      });
      if (r.eligible) { hud.prompt('HOLD E · LIFT THE KEYCARD', r.progress / PICKPOCKET_SECONDS); return; }
    }
    const item = pickups.nearby(player.position, cur.n, 1.7);
    if (item && Math.abs(item.y - player.base) < 3) { hud.prompt('E · TAKE ' + item.label.toUpperCase() + (item.value ? ' · $' + item.value.toLocaleString('en-US') : '')); return; }
    const spot = interactionAt();
    if (spot) {
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
  }

  function interact() {
    if (state.ended || state.zip || state.vent) return;
    if (state.inSafe) { safe.setTumbler(); return; }
    if (cur.cctv.active >= 0) {
      if (cur.cctv.loop()) cur.cctvSystem.loop(cur.cctv.active);
      return;
    }
    const item = pickups.nearby(player.position, cur.n, 1.7);
    if (item && Math.abs(item.y - player.base) < 3) { pickups.collect(item.id); return; }
    const spot = interactionAt();
    if (!spot) return;
    if (spot.id === 'vault_door' && state.hasKeycard && !cur.flags.door) {
      cur.flags.door = true;
      cur.props.setPanel('reader', 0x23ff7a);
      events.emit('door:opened', { id: 'vault-wing' });
      complete(1, 'VAULT WING OPEN');
    }
    if ((spot.id === 'vent_in' || spot.id === 'vent_out') && stance()) {
      const from = cur.use[spot.id];
      const to = spot.id === 'vent_in' ? from.to : cur.use.vent_in.usePos;
      const aim = spot.id === 'vent_in' ? cur.use.safe.usePos : [0, 0, -15];
      emitNoise(player.position, RING_COLOURS.alert, 6, { source: 'vent', strength: 0.7, cause: 'footstep' });
      state.vent = {
        t: 0, moved: false, to,
        yaw: facing(aim[0] - to[0], aim[2] - to[2]),
        enterYaw: facing(from.pos[0] - player.position.x, from.pos[2] - player.position.z),
        startYaw: player.yaw, startPitch: player.pitch
      };
      hud.prompt(null);
      ui.fade.style.transition = 'opacity 0.45s ease';
    }
    if (spot.id === 'safe') {
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
      state.zip = { t: 0, done: false };
      hud.prompt(null);
      hud.toast('CLIPPED ON', 2);
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
    if (cur.n === 1 && cur.flags.door && hall.vaultHinge.rotation.y > -Math.PI * 0.55) {
      hall.vaultHinge.rotation.y = Math.max(-Math.PI * 0.55, hall.vaultHinge.rotation.y - dt * 0.9);
    }
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
    else if (!f.pastShutter) {
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
    if (f.pastShutter && sh.lift < 3.4) {
      sh.lift = Math.min(3.4, sh.lift + dt * 0.5);
      sh.mesh.position.y = sh.lift;
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
    if (!guests.visible) return;
    crowdTick += dt;
    if (crowdTick < 1 / 30) return;
    for (const a of crowd) a.update(crowdTick);
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
    const mapW = Math.round(w * 0.17);
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

  function autoQuality(dt) {
    if (!state.auto) return;
    autoTime += dt;
    autoFrames += 1;
    if (autoTime < 2.5) return;
    const fps = autoFrames / autoTime;
    autoTime = 0;
    autoFrames = 0;
    const i = QUALITIES.indexOf(state.quality);
    if (fps < 40 && i > 0) { applyQuality(QUALITIES[i - 1]); setMode(state.mode); } else state.auto = false;
  }

  function frame() {
    const raw = Math.min(clock.getDelta(), qa ? 1 : 0.05);
    const menu = screens.inMenu;
    const dt = screens.blocking ? 0 : raw;
    state.lastDt = dt;
    elapsed += menu ? raw : dt;
    if (menu) {
      attractCamera(raw);
      updateCrowd(raw);
      cur.props.update(raw, elapsed);
      cur.built?.update(raw, elapsed);
      field.update(raw);
      lighting.update(raw, elapsed);
      skybox.update(raw, elapsed, camera);
      cur.lasers?.update(elapsed);
      fx.set({ alarm: state.mode === 'lockdown' ? 0.6 : 0, glitch: 0, dampen: 0, damage: 0 });
      fx.render(raw, elapsed, camera);
      story.update(0, player, cur.guards);
      screens.update(0);
      autoQuality(raw);
      if (!qa) requestAnimationFrame(frame);
      return;
    }
    const playing = !state.ended;
    if (playing) state.time += dt;
    updatePlayer(dt, elapsed);
    updateExposure(dt);
    const alarmSnap = alarm.update(playing ? dt : 0, { canDecay: cur.guards.every((g) => g.state !== 'pursue') });
    const ctx = {
      mode: state.mode,
      time: elapsed,
      alarm: alarmSnap,
      canStand: (x, z) => canStand(x, z, 0.4, 0),
      clearView: cur.built ? cur.built.collision.clearView : null,
      player: { position: player.position, crouching: stance(), visible: state.exposure > 0 && !state.ended && player.base < 10 },
      onPulse: (g) => field.emit(tmp.next.set(g.position.x, 0.02, g.position.z), RING_COLOURS.guard, 6, { speed: 4.5, strength: 0.9, source: 'guard' })
    };
    if (playing && dt > 0) for (const g of cur.guards) g.update(dt, ctx);
    if (playing && cur.cctv.feeds.length) cur.cctvSystem.update(dt, player.position, { clear: (cam) => state.mode !== 'gala' || cam.id >= 2 });
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
    hud.items({ keycard: state.hasKeycard, cash: ps.cash, evidence: ps.evidence.length, evidenceTotal: EVIDENCE_TOTAL });
    hud.decoy(state.decoyCharges, Math.max(0, state.decoyRecharge));
    hud.objective(objectiveText());
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
      if (state.pip) cur.cctv.renderPip(rects.pip);
      if (state.map) minimap.render(rects.map);
    }
    ui.feed.classList.toggle('is-hidden', cur.cctv.active < 0);
    autoQuality(dt);
    frames += 1;
    fpsTime += dt;
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
  newHeist();
  rects = layoutOverlays();
  warmHall();
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
        alarm: alarm.snapshot().value, alarmLevel: alarm.snapshot().level.id, hasKeycard: state.hasKeycard, flags: { ...cur.flags },
        inSafe: state.inSafe, ended: state.ended, echo: echo.snapshot().mode, take: pickups.snapshot().cash,
        evidence: pickups.snapshot().evidence.length, safe: safe.snapshot(), mode: state.mode, timeLeft: cur.timeLeft,
        shutter: cur.props.shutter?.lift, zip: state.zip?.t, screen: screens.state
      })
    };
    window.__ready = true;
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
