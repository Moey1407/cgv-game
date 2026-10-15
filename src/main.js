import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createSoundField, createMaterials, createLighting, createSkybox, createPostFX, createCCTV, createMinimap,
  createLaserSystem, applyHologram, loadCharacter, spawnCharacter, blobShadow, suit, FORWARD, QUALITY,
  RING_COLOURS, LAYER_WORLD_ONLY, rendererStats
} from './render/index.js';
import { buildHall, HALL } from './world/hall.js';
import { buildObjects, LOOT, PLATES, SAFE_POINT } from './world/objects.js';
import { createEventBus } from './core/events.js';
import { createAlarmSystem, ALARM_RAISE } from './gameplay/alarm.js';
import { createCctvSystem } from './gameplay/cctv.js';
import { createCheckpointStore } from './gameplay/checkpoints.js';
import { createEchoSystem } from './gameplay/echo.js';
import { createPickpocketSystem, PICKPOCKET_SECONDS } from './gameplay/pickpocket.js';
import { createPickupSystem } from './gameplay/pickups.js';
import { createPlateSystem } from './gameplay/plates.js';
import { movementProfile, MOVEMENT } from './gameplay/player.js';
import { createSafecrackSystem } from './gameplay/safecrack.js';
import { createStaminaSystem } from './gameplay/stamina.js';
import { createGuardAI } from './game/guardAI.js';
import { createHud } from './game/hud.js';

const QUALITIES = ['low', 'medium', 'high'];
const MODE_LABELS = {
  gala: 'LEVEL 1 · THE GALA · 19:40',
  night: 'LEVEL 2 · NIGHT RETURN · 01:30',
  lockdown: 'LEVEL 3 · LOCKDOWN · 02:10'
};
const HEARING = { gala: 0.45, night: 1, lockdown: 1.15 };
const RING_SCALE = 0.6;
const SPAWN = { x: -4.2, z: 5, yaw: Math.atan2(-6, 21) };

const GUESTS = [
  [-2.9, -2.6, 2.2, 'idle', 0.4, 0x15171c], [-1.9, -1.9, -2.6, 'agree', 0.8, 0x0e1b2e], [-2.2, -3.5, 0.3, 'idle', 1.6, 0x23201c],
  [2.9, -5.6, -1.2, 'idle', 0.1, 0x101010], [2.0, -6.4, 0.9, 'headShake', 0.5, 0x2a1418],
  [-6.6, -7.4, -1.6, 'idle', 1.1, 0x17191f],
  [5.4, -13.2, 0.4, 'idle', 0.7, 0x111317], [6.3, -12.4, -2.4, 'agree', 1.4, 0x1d1b17],
  [-3.8, -17.5, 1.0, 'idle', 1.8, 0x141414], [-4.6, -16.6, 2.6, 'headShake', 1.0, 0x231812],
  [1.2, -26, 0.2, 'idle', 0.9, 0x101216]
];
const DANCERS = [[-1.2, -6.2, 0.6, 3.4], [3.6, -13.6, -2.4, 7.9], [-5.6, -21.5, 1.4, 12.2]];

function randomCombination() {
  return [0, 0, 0].map(() => 5 + Math.floor(Math.random() * 90));
}

async function start() {
  const qa = new URLSearchParams(location.search).has('qa');
  const $ = (id) => document.getElementById(id);
  const ui = {
    mode: $('mode'), feed: $('feed'), feedName: $('feed-name'), feedState: $('feed-state'),
    pip: $('pip-frame'), map: $('map-frame'), stats: $('stats'), hint: $('hint'), loading: $('loading'),
    credits: $('credits'), creditsButton: $('credits-button'), closeCredits: $('close-credits')
  };
  const hud = createHud();
  const events = createEventBus();

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
  const objects = buildObjects(scene, materials, field);
  const minimap = createMinimap(renderer, scene, { width: 24, height: 16 });
  const mapBounds = { minX: -HALL.halfWidth, maxX: HALL.halfWidth, minZ: -62, maxZ: HALL.front };
  minimap.hideFromMap(hall.ceilingGroup);
  const lighting = createLighting(scene, renderer, hall.layout, materials);
  const skybox = createSkybox();
  scene.add(skybox.mesh);
  minimap.hideFromMap(skybox.mesh);

  const lasers = createLaserSystem(scene);
  lasers.add({ start: new THREE.Vector3(-2.3, 0.35, -45), end: new THREE.Vector3(2.3, 0.35, -45) });
  lasers.add({ start: new THREE.Vector3(-2.3, 1.0, -49), end: new THREE.Vector3(2.3, 1.0, -49), pattern: 'rise', amplitude: 0.6, speed: 1.6 });
  lasers.add({ start: new THREE.Vector3(-2.3, 1.1, -53), end: new THREE.Vector3(2.3, 1.1, -53), pattern: 'sweep', amplitude: 0.7, speed: 1.2 });
  lasers.add({ start: new THREE.Vector3(-2.3, 0.9, -57), end: new THREE.Vector3(2.3, 0.9, -57), pattern: 'blink', period: 2.4 });

  const cameraDefs = [
    { name: 'CAM 01 · ATRIUM', position: new THREE.Vector3(-11.5, 8.5, 7), target: new THREE.Vector3(2, 0, -8), sweep: 0.35 },
    { name: 'CAM 02 · GRAND HALL', position: new THREE.Vector3(11.5, 8.5, -20), target: new THREE.Vector3(-2, 0, -8), sweep: 0.3 },
    { name: 'CAM 03 · VAULT WING', position: new THREE.Vector3(-11.5, 8.5, -38.5), target: new THREE.Vector3(0, 0, -30) },
    { name: 'CAM 04 · LASER CORRIDOR', position: new THREE.Vector3(1.8, 3.9, -41), target: new THREE.Vector3(0, 0.4, -58) }
  ];
  const cctv = createCCTV(renderer, scene, cameraDefs, { aspect: window.innerWidth / window.innerHeight });
  for (const feed of cctv.feeds) feed.camera.layers.enable(LAYER_WORLD_ONLY);
  const cctvSystem = createCctvSystem(cameraDefs.map((c, i) => ({
    id: i,
    x: c.position.x,
    z: c.position.z,
    yaw: Math.atan2(c.target.x - c.position.x, c.target.z - c.position.z),
    range: Math.hypot(c.target.x - c.position.x, c.target.z - c.position.z) * 1.6,
    fov: 1.05
  })), { events });

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
  const pickups = createPickupSystem(LOOT, { events });
  const plates = createPlateSystem(PLATES, { events });
  const echo = createEchoSystem({ events, maxSeconds: 20 });
  const checkpoints = createCheckpointStore({ events });
  let safe = createSafecrackSystem({ combination: randomCombination(), events });

  const shutterBlocks = (x, z) => objects.shutterBlocking && z < -39.5 && z > -40.6 && Math.abs(x) < 2.9;
  const probe = new THREE.Vector3();
  const canStand = (x, z, r = 0.35) => hall.inside(probe.set(x, 0, z), r) && !shutterBlocks(x, z);

  function makeGuard(id, waypoints, speed) {
    const actor = spawnCharacter(soldier, { clip: 'Walk', position: waypoints[0], forward: FORWARD.soldier, recolor: suit(0x0b0f14), field });
    scene.add(actor.root);
    const torch = new THREE.SpotLight(0xe8f2ff, 260, 18, 0.3, 0.45, 1.3);
    torch.position.set(0.2, 1.35, 0.35);
    const aim = new THREE.Object3D();
    aim.position.set(0.2, 0.1, 6);
    actor.root.add(torch, aim);
    torch.target = aim;
    minimap.addMarker(actor.root, RING_COLOURS.guard, 1.7);
    const guard = createGuardAI({ id, actor, torch, waypoints, speed, events });
    guard.reset();
    return guard;
  }
  const guards = [
    makeGuard('briggs', [new THREE.Vector3(9, 0, -24), new THREE.Vector3(9, 0, -4), new THREE.Vector3(-8, 0, -4), new THREE.Vector3(-8, 0, -24)], 1.35),
    makeGuard('okafor', [new THREE.Vector3(-9.6, 0, -12.6), new THREE.Vector3(-9.6, 0, -30)], 1.1)
  ];
  const okafor = guards[1];
  objects.keycard.position.set(0.24, 0.98, -0.12);
  objects.keycard.rotation.y = Math.PI / 2;

  const echoActor = spawnCharacter(xbot, { clip: 'idle', forward: FORWARD.xbot, castShadow: false });
  const hologram = applyHologram(echoActor.root);
  echoActor.root.visible = false;
  scene.add(echoActor.root);
  const echoMarker = minimap.addMarker(echoActor.root, RING_COLOURS.echo, 1.3);
  echoMarker.mesh.visible = false;

  const player = { position: new THREE.Vector3(SPAWN.x, 0, SPAWN.z), y: 0, vy: 0, yaw: SPAWN.yaw, pitch: -0.04, step: 0, height: 1.68, profile: MOVEMENT.run, moving: false };
  const playerMarker = new THREE.Object3D();
  scene.add(playerMarker);
  minimap.addMarker(playerMarker, RING_COLOURS.player, 1.9, Math.PI);

  const keys = {};
  const state = {
    mode: 'gala', dampen: false, cell: 6, pip: true, map: true, quality: 'medium', auto: !qa,
    damage: 0, locked: false, sonarCooldown: 0, laserCooldown: 0, exposure: 0,
    hasKeycard: false, inSafe: false, ended: null, vaultOpen: 0, detections: 0, time: 0,
    echoStep: 0, echoLast: new THREE.Vector3(), fadeEcho: 0, lastDt: 1 / 60, safeGlow: 0, safeNoise: 0
  };
  const tmp = { dir: new THREE.Vector3(), next: new THREE.Vector3(), probe: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) };

  function emitNoise(position, colour, radius, { source, damped = false, speed, strength = 0.85, cause } = {}) {
    field.emit(tmp.next.set(position.x, 0.02, position.z), colour, radius, { speed: speed ?? Math.max(5, radius * 0.9), strength, source });
    if (damped) return;
    const reach = radius * (HEARING[state.mode] ?? 1);
    let heard = false;
    for (const g of guards) {
      if (g.position.distanceTo(tmp.next.set(position.x, 0, position.z)) <= reach) heard = g.hear(position, strength) || heard;
    }
    if (heard && cause) alarm.raise(ALARM_RAISE[cause] ?? 4, cause);
  }

  function applyQuality(name) {
    state.quality = name;
    const q = QUALITY[name];
    fx.setQuality(name);
    hall.setReflection(q.reflection, window.innerWidth, window.innerHeight);
    cctv.setRate(q.feedRate);
    minimap.setRate(q.mapRate);
  }

  function setMode(mode) {
    state.mode = mode;
    lighting.setMode(mode);
    skybox.setMode(mode);
    hall.setMode(mode);
    guests.visible = mode === 'gala';
    for (const g of guards) {
      g.torch.visible = mode !== 'gala';
      g.torch.castShadow = mode !== 'gala' && state.quality === 'high';
    }
    fx.setBloom({ threshold: mode === 'gala' ? 0.9 : 0.6, strength: mode === 'gala' ? 0.32 : 0.5 });
    ui.mode.textContent = MODE_LABELS[mode];
    ui.mode.dataset.mode = mode;
  }

  function objectiveText() {
    if (state.ended === 'won') return 'Vault open. The Kestrel Star is yours';
    if (!state.hasKeycard) return 'Lift Okafor’s keycard. He patrols the west wall';
    if (!objects.shutterOpen) return 'Open the vault wing: you and your Echo on both plates (Q)';
    return 'Cross the laser corridor and crack the vault';
  }

  function snapshotCheckpoint() {
    return {
      player: { x: player.position.x, z: player.position.z, yaw: player.yaw },
      hasKeycard: state.hasKeycard,
      shutterOpen: objects.shutterOpen,
      collected: pickups.items.filter((i) => i.collected).map((i) => i.id),
      alarm: Math.min(alarm.snapshot().value, 50)
    };
  }

  function attachKeycard(on) {
    if (on) okafor.root.add(objects.keycard);
    else objects.keycard.removeFromParent();
  }

  function resetEcho() {
    echo.reset();
    echoActor.root.visible = false;
    echoMarker.mesh.visible = false;
    hologram.setDissolve(0);
    state.fadeEcho = 0;
  }

  function restore(payload) {
    player.position.set(payload.player.x, 0, payload.player.z);
    player.yaw = payload.player.yaw;
    player.pitch = -0.04;
    player.y = 0;
    player.vy = 0;
    state.hasKeycard = payload.hasKeycard;
    attachKeycard(!payload.hasKeycard);
    pickpocket.reset(payload.hasKeycard);
    for (const item of pickups.items) item.collected = payload.collected.includes(item.id);
    objects.reset({ shutterOpened: payload.shutterOpen, collected: payload.collected });
    plates.reset();
    alarm.reset(payload.alarm, 'checkpoint');
    for (const g of guards) g.reset();
    cctvSystem.reset();
    resetEcho();
    stamina.reset();
    field.clear();
    state.inSafe = false;
    state.ended = null;
    state.damage = 0;
    state.exposure = 0;
    hud.end(null);
    hud.safe(false);
    if (state.mode === 'lockdown' && payload.alarm < 90) setMode('night');
  }

  function newHeist() {
    safe = createSafecrackSystem({ combination: randomCombination(), events });
    hall.vaultHinge.rotation.y = 0;
    hall.dial.rotation.z = 0;
    state.vaultOpen = 0;
    state.detections = 0;
    state.time = 0;
    checkpoints.clear();
    restore({ player: { ...SPAWN }, hasKeycard: false, shutterOpen: false, collected: [], alarm: 0 });
    checkpoints.save('start', snapshotCheckpoint());
    setMode('gala');
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
    hud.toast(cameraDefs[id].name + ' SAW YOU');
    for (const g of guards) g.hear(player.position, 0.6);
  });
  events.on('alarm:lockdown', () => {
    alarm.setFloor(90, 'lockdown');
    setMode('lockdown');
    hud.toast('LOCKDOWN · THE BUILDING IS SEALING', 3.5);
  });
  events.on('pickpocket:complete', () => {
    state.hasKeycard = true;
    attachKeycard(false);
    hud.toast('KEYCARD LIFTED');
    checkpoints.save('keycard', snapshotCheckpoint());
  });
  events.on('item:picked', (item) => {
    objects.loot.get(item.id).visible = false;
    hud.toast(item.type === 'evidence' ? 'EVIDENCE · ' + item.label.toUpperCase() : item.label.toUpperCase() + ' · $' + item.value.toLocaleString('en-US'));
  });
  events.on('plate:change', ({ id, active }) => objects.setPlate(PLATES.findIndex((p) => p.id === id), active));
  events.on('safe:noise', ({ noise }) => {
    if (state.safeNoise > 0) return;
    state.safeNoise = 0.6;
    emitNoise(SAFE_POINT, RING_COLOURS.alert, 3 + noise * 9, { source: 'safe', strength: noise, cause: 'override' });
  });
  events.on('safe:miss', () => { alarm.raise(4, 'safe'); hud.toast('MISSED · THE TUMBLER SLIPPED'); });
  events.on('safe:tumbler-set', ({ tumbler, opened }) => {
    if (!opened) hud.toast('TUMBLER ' + (tumbler + 1) + ' SET');
    emitNoise(SAFE_POINT, RING_COLOURS.player, 2.5, { source: 'safe', damped: true, strength: 0.6 });
  });
  events.on('safe:opened', () => {
    state.inSafe = false;
    hud.safe(false);
    state.vaultOpen = 0.0001;
    objects.gem.visible = true;
    objects.gemLight.intensity = 6;
    hud.toast('VAULT OPEN', 3);
    events.emit('level:complete', { level: 1 });
    setTimeout(() => {
      state.ended = 'won';
      hud.end('won', summary());
    }, 2600);
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
    const t = Math.floor(state.time);
    return [
      'TIME ' + String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'),
      'TAKE $' + s.cash.toLocaleString('en-US'),
      'EVIDENCE ' + s.evidence.length + '/' + LOOT.filter((i) => i.type === 'evidence').length,
      'SPOTTED ' + state.detections
    ].join(' · ');
  }

  function toggleEcho() {
    const mode = echo.snapshot().mode;
    if (mode === 'recording') {
      const rewind = echo.stop();
      if (!rewind) return;
      echoActor.root.visible = true;
      echoMarker.mesh.visible = true;
      hologram.setDissolve(0);
      echoActor.root.position.set(rewind.x, 0, rewind.z);
      state.echoLast.copy(echoActor.root.position);
      player.position.set(rewind.x, 0, rewind.z);
      player.yaw = rewind.yaw;
      hud.toast('REWIND · YOUR ECHO IS REPLAYING');
      emitNoise(player.position, RING_COLOURS.echo, 4, { source: 'echo', damped: true });
    } else if (mode !== 'replaying') {
      resetEcho();
      echo.start(echoFrame());
      hud.toast('RECORDING ECHO · Q TO REWIND');
    }
  }

  function echoFrame() {
    return { x: player.position.x, z: player.position.z, yaw: player.yaw, pitch: player.pitch, crouching: player.profile.id === 'crouch' || player.profile.id === 'crawl', interacting: Boolean(keys.KeyE), mode: player.profile.id };
  }

  function updateEcho(dt, time) {
    const snap = echo.snapshot();
    if (snap.mode === 'recording') echo.record(dt, echoFrame());
    if (snap.mode === 'replaying') {
      const frame = echo.replay(dt);
      if (frame) {
        echoActor.root.position.set(frame.x, 0, frame.z);
        echoActor.root.rotation.y = frame.yaw + Math.PI;
        const moved = state.echoLast.distanceTo(echoActor.root.position);
        echoActor.play(moved / Math.max(dt, 1e-3) > 0.4 ? 'walk' : 'idle', 0.2);
        state.echoStep += moved;
        state.echoLast.copy(echoActor.root.position);
        if (state.echoStep > 1.4) {
          state.echoStep = 0;
          emitNoise(echoActor.root.position, RING_COLOURS.echo, frame.mode === 'run' || frame.mode === 'sprint' ? 5 : 2.6, { source: 'echo', strength: 0.7, cause: 'echo' });
        }
        for (const g of guards) if (g.position.distanceTo(echoActor.root.position) < 1.1) echo.shatter('guard');
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
    hud.echo(m.mode === 'recording' ? 'REC ' + m.elapsed.toFixed(1) + 's / 20s · Q TO REWIND'
      : m.mode === 'replaying' ? 'ECHO REPLAYING ' + m.playbackTime.toFixed(1) + 's / ' + m.duration.toFixed(1) + 's'
      : 'ECHO READY · Q');
  }

  function updatePlayer(dt, time) {
    if (state.inSafe || state.ended) return;
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
    camera.position.set(player.position.x, player.y + player.height + bob, player.position.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;

    state.laserCooldown = Math.max(0, state.laserCooldown - dt);
    const low = profile.id === 'crawl' ? 0.25 : profile.id === 'crouch' ? 0.45 : 0.4;
    const high = profile.height - 0.55;
    const hit = lasers.hits(tmp.probe.set(player.position.x, player.y + low, player.position.z), 0.16)
      || lasers.hits(tmp.probe.set(player.position.x, player.y + Math.max(low, high), player.position.z), 0.16);
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
        if (field.reached(player.position, ring)) { lit = true; break; }
      }
    }
    state.exposure = lit ? 0.65 : Math.max(0, state.exposure - dt);
  }

  function updateInteractions(dt) {
    if (state.ended) { hud.prompt(null); return; }
    if (state.inSafe) { hud.prompt(null); return; }
    if (!state.hasKeycard) {
      const r = pickpocket.update({
        dt,
        holding: Boolean(keys.KeyE) && state.locked,
        player: player.position,
        guard: { position: okafor.position, yaw: okafor.yaw, state: okafor.state, id: 'okafor' }
      });
      if (r.eligible) { hud.prompt('HOLD E · LIFT THE KEYCARD', r.progress / PICKPOCKET_SECONDS); return; }
    }
    const item = pickups.nearby(player.position, 1, 1.7);
    if (item) { hud.prompt('E · TAKE ' + item.label.toUpperCase() + (item.value ? ' · $' + item.value.toLocaleString('en-US') : '')); return; }
    if (player.position.distanceTo(SAFE_POINT) < 1.8 && state.vaultOpen === 0) {
      hud.prompt(state.hasKeycard ? 'E · SWIPE THE KEYCARD AND CRACK THE VAULT' : 'VAULT · NEEDS OKAFOR’S KEYCARD');
      return;
    }
    hud.prompt(null);
  }

  function interact() {
    if (state.ended) return;
    if (state.inSafe) {
      safe.setTumbler();
      return;
    }
    if (cctv.active >= 0) {
      if (cctv.loop()) cctvSystem.loop(cctv.active);
      return;
    }
    const item = pickups.nearby(player.position, 1, 1.7);
    if (item) { pickups.collect(item.id); return; }
    if (player.position.distanceTo(SAFE_POINT) < 1.8 && state.hasKeycard && state.vaultOpen === 0) {
      state.inSafe = true;
      player.position.copy(SAFE_POINT);
      player.yaw = 0;
      player.pitch = -0.05;
      camera.position.set(SAFE_POINT.x, 1.68, SAFE_POINT.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
      hud.toast('LISTEN FOR THE CLICK');
    }
  }

  function updateSafe(dt) {
    const snap = safe.snapshot();
    hall.dial.rotation.z = -snap.dial / 100 * Math.PI * 2;
    if (state.vaultOpen > 0 && state.vaultOpen < 1) {
      state.vaultOpen = Math.min(1, state.vaultOpen + dt * 0.7);
      hall.vaultHinge.rotation.y = -state.vaultOpen * Math.PI * 0.55;
    }
    state.safeGlow = 0;
    state.safeNoise = Math.max(0, state.safeNoise - dt);
    if (!state.inSafe) return;
    const fb = safe.feedback();
    hud.safe(true, { ...snap, strength: fb.strength });
    state.safeGlow = fb.strength > 0.9 ? 0.35 : 0;
  }

  function guardSummary() {
    const order = ['pursue', 'search', 'investigate', 'patrol'];
    let worst = guards[0];
    for (const g of guards) if (order.indexOf(g.state) < order.indexOf(worst.state)) worst = g;
    const sus = Math.max(...guards.map((g) => g.suspicion));
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

  function layoutOverlays() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pipW = Math.round(w * 0.2);
    const mapW = Math.round(w * 0.17);
    const pip = { x: w - pipW - 24, y: 24, w: pipW, h: Math.round(pipW * 9 / 16) };
    const map = { x: w - mapW - 24, y: h - Math.round(mapW * 2 / 3) - 24, w: mapW, h: Math.round(mapW * 2 / 3) };
    for (const [el, r, show] of [[ui.pip, pip, state.pip], [ui.map, map, state.map]]) {
      Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      el.classList.toggle('is-hidden', !show || cctv.active >= 0);
    }
    return { pip, map };
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
    const dt = Math.min(clock.getDelta(), qa ? 1 : 0.05);
    state.lastDt = dt;
    elapsed += dt;
    const playing = !state.ended;
    if (playing) state.time += dt;
    updatePlayer(dt, elapsed);
    updateExposure(dt);
    const alarmSnap = alarm.update(playing ? dt : 0, { canDecay: guards.every((g) => g.state !== 'pursue') });
    const ctx = {
      mode: state.mode,
      time: elapsed,
      alarm: alarmSnap,
      canStand: (x, z) => canStand(x, z, 0.4),
      player: { position: player.position, crouching: player.profile.id === 'crouch' || player.profile.id === 'crawl', visible: state.exposure > 0 && !state.ended },
      onPulse: (g) => field.emit(tmp.next.set(g.position.x, 0.02, g.position.z), RING_COLOURS.guard, 6, { speed: 4.5, strength: 0.9, source: 'guard' })
    };
    if (playing) for (const g of guards) g.update(dt, ctx);
    if (playing) cctvSystem.update(dt, player.position, { clear: (cam) => state.mode !== 'gala' || cam.id >= 2 });
    updateEcho(playing ? dt : 0, elapsed);
    if (playing) plates.update([{ id: 'player', position: player.position }, { id: 'echo', position: echoActor.root.position, active: echo.snapshot().mode === 'replaying' }]);
    if (playing && !objects.shutterOpen && plates.allActive() && plates.plates.every((p) => p.occupants.length > 0) && new Set(plates.plates.flatMap((p) => p.occupants)).size >= 2) {
      objects.openShutter();
      events.emit('door:opened', { id: 'vault-wing' });
      hud.toast('VAULT WING OPEN', 3);
      checkpoints.save('vault-wing', snapshotCheckpoint());
    }
    updateInteractions(dt);
    updateSafe(dt);
    updateCrowd(dt);
    objects.update(dt, elapsed);
    field.update(dt);
    lighting.update(dt, elapsed);
    skybox.update(dt, elapsed, cctv.active >= 0 ? cctv.feeds[cctv.active].camera : camera);
    lasers.update(elapsed);
    cctv.update(dt);
    minimap.update(player.position, mapBounds, dt);
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
    hud.items({ keycard: state.hasKeycard, cash: ps.cash, evidence: ps.evidence.length, evidenceTotal: LOOT.filter((i) => i.type === 'evidence').length });
    hud.objective(objectiveText());
    hud.update(dt);
    if (cctv.active >= 0) {
      cctv.render();
      const feed = cctv.feeds[cctv.active];
      ui.feedName.textContent = feed.name;
      ui.feedState.textContent = feed.loopTimer > 0 ? 'LOOPED · ' + feed.loopTimer.toFixed(1) + 's' : 'LIVE · E TO LOOP 8s';
      ui.feedState.classList.toggle('looped', feed.loopTimer > 0);
    } else {
      fx.render(dt, elapsed, camera);
      if (state.pip) cctv.renderPip(rects.pip);
      if (state.map) minimap.render(rects.map);
    }
    ui.feed.classList.toggle('is-hidden', cctv.active < 0);
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
    keys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (state.ended) {
      if (e.code === 'KeyR') restore(checkpoints.restore() ?? snapshotCheckpoint());
      if (e.code === 'KeyN') newHeist();
      return;
    }
    if (e.code === 'Digit1') setMode('gala');
    if (e.code === 'Digit2') setMode('night');
    if (e.code === 'Digit3') setMode('lockdown');
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyQ' || e.code === 'Backspace') {
      if (state.inSafe) { state.inSafe = false; hud.safe(false); }
      else if (cctv.active >= 0) { cctv.exit(); rects = layoutOverlays(); }
      else if (e.code === 'KeyQ') toggleEcho();
    }
    if (state.inSafe) return;
    if (e.code === 'Space' && player.y === 0 && player.profile.id !== 'crawl') { player.vy = 4.6; events.emit('player:jump', {}); }
    if (e.code === 'KeyG' && state.sonarCooldown <= 0) {
      state.sonarCooldown = 2.6;
      emitNoise(player.position, RING_COLOURS.player, 16, { source: 'player', damped: state.dampen, speed: 14, strength: 1, cause: 'sonar' });
    }
    if (e.code === 'Tab') { cctv.next(e.shiftKey ? -1 : 1); rects = layoutOverlays(); }
    if (e.code === 'KeyL' && cctv.active >= 0 && cctv.loop()) cctvSystem.loop(cctv.active);
    if (e.code === 'KeyF' && (state.dampen || state.cell > 0.7)) state.dampen = !state.dampen;
    if (e.code === 'KeyP') { state.pip = !state.pip; rects = layoutOverlays(); }
    if (e.code === 'KeyM') { state.map = !state.map; rects = layoutOverlays(); }
    if (e.code === 'KeyK') {
      state.auto = false;
      applyQuality(QUALITIES[(QUALITIES.indexOf(state.quality) + 1) % QUALITIES.length]);
      setMode(state.mode);
    }
  });
  document.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  canvas.addEventListener('click', () => { if (!state.locked) canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    ui.hint.classList.toggle('is-hidden', state.locked);
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked || cctv.active >= 0) return;
    if (state.inSafe) {
      safe.turn(e.movementX * 0.035, Math.max(state.lastDt, 1 / 240));
      return;
    }
    player.yaw -= e.movementX * 0.0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0019, -1.3, 1.3);
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    fx.setSize(window.innerWidth, window.innerHeight);
    hall.setReflection(QUALITY[state.quality].reflection, window.innerWidth, window.innerHeight);
    for (const feed of cctv.feeds) {
      feed.camera.aspect = camera.aspect;
      feed.camera.updateProjectionMatrix();
    }
    rects = layoutOverlays();
  });
  ui.creditsButton.addEventListener('click', (e) => { e.stopPropagation(); ui.credits.showModal(); });
  ui.closeCredits.addEventListener('click', () => ui.credits.close());

  applyQuality('medium');
  newHeist();
  ui.loading.classList.add('is-hidden');
  clock.getDelta();

  if (qa) {
    window.__game = {
      events,
      setMode,
      step(seconds = 1, fps = 30) {
        const n = Math.max(1, Math.round(seconds * fps));
        clock.getDelta = () => 1 / fps;
        for (let i = 0; i < n; i += 1) frame();
      },
      view(x, z, yaw, pitch = 0) {
        player.position.set(x, 0, z);
        player.yaw = yaw;
        player.pitch = pitch;
      },
      press(code) { document.dispatchEvent(new KeyboardEvent('keydown', { code })); document.dispatchEvent(new KeyboardEvent('keyup', { code })); },
      hold(code, on) { keys[code] = on; },
      lock(on = true) { state.locked = on; },
      turnDial(delta, dt = 0.5) { return safe.turn(delta, dt); },
      combination: () => safe,
      cctv: (i) => { if (i < 0) cctv.exit(); else cctv.enter(i); rects = layoutOverlays(); },
      fx: (v) => { Object.assign(state, v); rects = layoutOverlays(); },
      quality: (q) => { applyQuality(q); setMode(state.mode); },
      okafor: () => ({ x: okafor.position.x, z: okafor.position.z, yaw: okafor.yaw, state: okafor.state }),
      guards: () => guards.map((g) => ({ id: g.id, state: g.state, suspicion: g.suspicion, x: g.position.x, z: g.position.z, heading: g.yaw })),
      state: () => ({
        player: { x: player.position.x, z: player.position.z, y: player.y, profile: player.profile.id },
        alarm: alarm.snapshot().value, level: alarm.snapshot().level.id, hasKeycard: state.hasKeycard, shutterOpen: objects.shutterOpen,
        inSafe: state.inSafe, ended: state.ended, echo: echo.snapshot().mode, take: pickups.snapshot().cash, safe: safe.snapshot(), mode: state.mode
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
