import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createSoundField, createMaterials, createLighting, createSkybox, createPostFX, createCCTV, createMinimap,
  createLaserSystem, applyHologram, loadCharacter, spawnCharacter, blobShadow, suit, FORWARD, QUALITY,
  RING_COLOURS, LAYER_WORLD_ONLY, rendererStats
} from './render/index.js';
import { buildHall, HALL } from './world/hall.js';

const QUALITIES = ['low', 'medium', 'high'];
const MODE_LABELS = {
  gala: 'LEVEL 1 · THE GALA · 19:40',
  night: 'LEVEL 2 · NIGHT RETURN · 01:30',
  lockdown: 'LEVEL 3 · LOCKDOWN · 02:10'
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

async function start() {
  const qa = new URLSearchParams(location.search).has('qa');
  const $ = (id) => document.getElementById(id);
  const ui = {
    mode: $('mode'), feed: $('feed'), feedName: $('feed-name'), feedState: $('feed-state'),
    pip: $('pip-frame'), map: $('map-frame'), stats: $('stats'), hint: $('hint'), loading: $('loading'),
    credits: $('credits'), creditsButton: $('credits-button'), closeCredits: $('close-credits')
  };

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

  const cctv = createCCTV(renderer, scene, [
    { name: 'CAM 01 · ATRIUM', position: new THREE.Vector3(-11.5, 8.5, 7), target: new THREE.Vector3(2, 0, -8), sweep: 0.35 },
    { name: 'CAM 02 · GRAND HALL', position: new THREE.Vector3(11.5, 8.5, -20), target: new THREE.Vector3(-2, 0, -8), sweep: 0.3 },
    { name: 'CAM 03 · VAULT WING', position: new THREE.Vector3(-11.5, 8.5, -38.5), target: new THREE.Vector3(0, 0, -20) },
    { name: 'CAM 04 · LASER CORRIDOR', position: new THREE.Vector3(1.8, 3.9, -41), target: new THREE.Vector3(0, 0.4, -58) }
  ], { aspect: window.innerWidth / window.innerHeight });
  for (const feed of cctv.feeds) feed.camera.layers.enable(LAYER_WORLD_ONLY);

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

  function makeGuard(waypoints, speed) {
    const a = spawnCharacter(soldier, { clip: 'Walk', position: waypoints[0], forward: FORWARD.soldier, recolor: suit(0x0b0f14), field });
    scene.add(a.root);
    const torch = new THREE.SpotLight(0xe8f2ff, 260, 18, 0.3, 0.45, 1.3);
    torch.position.set(0.2, 1.35, 0.35);
    const aim = new THREE.Object3D();
    aim.position.set(0.2, 0.1, 6);
    a.root.add(torch, aim);
    torch.target = aim;
    minimap.addMarker(a.root, RING_COLOURS.guard, 1.7);
    return { actor: a, torch, waypoints, index: 1 % waypoints.length, speed, pulse: Math.random() * 2 };
  }
  const guards = [
    makeGuard([new THREE.Vector3(9, 0, -24), new THREE.Vector3(9, 0, -4), new THREE.Vector3(-8, 0, -4), new THREE.Vector3(-8, 0, -24)], 1.35),
    makeGuard([new THREE.Vector3(-9.6, 0, -12.6), new THREE.Vector3(-9.6, 0, -30)], 1.1)
  ];
  for (const g of guards) {
    const first = g.waypoints[g.index].clone().sub(g.actor.root.position);
    g.actor.root.rotation.y = Math.atan2(first.x, first.z);
  }

  const echoActor = spawnCharacter(xbot, { clip: 'walk', position: new THREE.Vector3(-1.5, 0, -36), forward: FORWARD.xbot, castShadow: false });
  const echo = applyHologram(echoActor.root);
  scene.add(echoActor.root);
  const echoPath = { from: new THREE.Vector3(-3.5, 0, -36), to: new THREE.Vector3(3.5, 0, -36), t: 0 };

  const player = { position: new THREE.Vector3(-4.2, 0, 5), yaw: Math.atan2(-6, 21), pitch: -0.04, step: 0, height: 1.68 };
  const playerMarker = new THREE.Object3D();
  scene.add(playerMarker);
  minimap.addMarker(playerMarker, RING_COLOURS.player, 1.9, Math.PI);

  const keys = {};
  const state = { mode: 'gala', dampen: false, pip: true, map: true, quality: 'medium', auto: !qa, glitchBurst: 0, damage: 0, locked: false };
  const tmp = { dir: new THREE.Vector3(), next: new THREE.Vector3(), probe: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), to: new THREE.Vector3() };

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

  function ping(position = player.position, colour = RING_COLOURS.player, radius = 16, speed = 14) {
    field.emit(tmp.next.set(position.x, 0.02, position.z), colour, radius, { speed });
  }

  function updatePlayer(dt, time) {
    const crouch = keys.KeyC || keys.ControlLeft;
    const run = keys.ShiftLeft && !crouch;
    const speed = crouch ? 1.4 : run ? 5.5 : 3.2;
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    player.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * 2.1 * dt;
    player.pitch = THREE.MathUtils.clamp(player.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * 1.5 * dt, -1.3, 1.3);
    const moving = f !== 0 || s !== 0;
    if (moving) {
      tmp.dir.set(s, 0, -f).normalize().applyAxisAngle(tmp.up, player.yaw).multiplyScalar(speed * dt);
      tmp.next.set(player.position.x + tmp.dir.x, 0, player.position.z);
      if (hall.inside(tmp.next)) player.position.x = tmp.next.x;
      tmp.next.set(player.position.x, 0, player.position.z + tmp.dir.z);
      if (hall.inside(tmp.next)) player.position.z = tmp.next.z;
      player.step -= dt;
      if (player.step <= 0) {
        player.step = crouch ? 0.75 : run ? 0.34 : 0.52;
        if (!state.dampen) field.emit(tmp.next.set(player.position.x, 0.02, player.position.z), RING_COLOURS.player, crouch ? 1.7 : run ? 7.4 : 3.1, { speed: 6, strength: 0.8 });
      }
    }
    player.height += ((crouch ? 1.05 : 1.68) - player.height) * Math.min(1, dt * 10);
    camera.position.set(player.position.x, player.height + (moving ? Math.sin(time * 8.5) * 0.025 : 0), player.position.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    playerMarker.position.copy(player.position);
    playerMarker.rotation.y = player.yaw;
    const hit = lasers.hits(tmp.probe.set(player.position.x, crouch ? 0.6 : 1.0, player.position.z), 0.18)
      || (!crouch && lasers.hits(tmp.probe.set(player.position.x, 0.4, player.position.z), 0.18));
    if (hit && state.damage <= 0.2) {
      state.damage = 1;
      ping(player.position, RING_COLOURS.alert, 12, 12);
    }
  }

  function updateGuard(guard, dt) {
    const root = guard.actor.root;
    const to = tmp.to.copy(guard.waypoints[guard.index]).sub(root.position);
    to.y = 0;
    const d = to.length();
    if (d < 0.2) {
      guard.index = (guard.index + 1) % guard.waypoints.length;
    } else {
      to.multiplyScalar(1 / d);
      const want = Math.atan2(to.x, to.z);
      const delta = Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y));
      root.rotation.y += delta * Math.min(1, dt * 6);
      const facing = Math.max(0, Math.cos(delta));
      root.position.addScaledVector(to, Math.min(d, guard.speed * dt * facing));
    }
    guard.actor.update(dt);
    guard.pulse -= dt;
    if (guard.pulse <= 0) {
      guard.pulse = 2.8;
      field.emit(tmp.next.set(root.position.x, 0.02, root.position.z), RING_COLOURS.guard, 6, { speed: 4.5, strength: 0.9 });
    }
  }

  function updateEcho(dt, time) {
    echoPath.t += dt * 0.18;
    const k = 0.5 - 0.5 * Math.cos(echoPath.t * Math.PI);
    echoActor.root.position.lerpVectors(echoPath.from, echoPath.to, k);
    echoActor.root.rotation.y = Math.sin(echoPath.t * Math.PI) >= 0 ? Math.PI / 2 : -Math.PI / 2;
    echoActor.update(dt);
    echo.update(dt, time);
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
    if (fps < 40 && i > 0) applyQuality(QUALITIES[i - 1]);
    else state.auto = false;
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), qa ? 1 : 0.05);
    elapsed += dt;
    updatePlayer(dt, elapsed);
    for (const g of guards) updateGuard(g, dt);
    updateEcho(dt, elapsed);
    updateCrowd(dt);
    field.update(dt);
    lighting.update(dt, elapsed);
    skybox.update(dt, elapsed, cctv.active >= 0 ? cctv.feeds[cctv.active].camera : camera);
    lasers.update(elapsed);
    cctv.update(dt);
    minimap.update(player.position, mapBounds, dt);
    state.glitchBurst = Math.max(0, state.glitchBurst - dt * 1.5);
    state.damage = Math.max(0, state.damage - dt * 1.2);
    fx.set({
      alarm: state.mode === 'lockdown' ? 1 : 0,
      glitch: Math.max(state.mode === 'lockdown' ? 0.22 : 0, state.glitchBurst),
      dampen: state.dampen ? 1 : 0,
      damage: state.damage
    });
    if (cctv.active >= 0) {
      cctv.render();
      const feed = cctv.feeds[cctv.active];
      ui.feedName.textContent = feed.name;
      ui.feedState.textContent = feed.loopTimer > 0 ? 'LOOPED · ' + feed.loopTimer.toFixed(1) + 's' : 'LIVE · L TO LOOP 8s';
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
    if (e.code === 'Digit1') setMode('gala');
    if (e.code === 'Digit2') setMode('night');
    if (e.code === 'Digit3') setMode('lockdown');
    if (e.code === 'Space') ping();
    if (e.code === 'Tab') { cctv.next(e.shiftKey ? -1 : 1); rects = layoutOverlays(); }
    if (e.code === 'Backspace' || e.code === 'KeyQ') { cctv.exit(); rects = layoutOverlays(); }
    if (e.code === 'KeyL' && cctv.active >= 0) cctv.loop();
    if (e.code === 'KeyF') state.dampen = !state.dampen;
    if (e.code === 'KeyG') state.glitchBurst = 1;
    if (e.code === 'KeyH') echo.dissolve(echo.uniforms.uHoloDissolve.value < 0.5);
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
  setMode('gala');
  ui.loading.classList.add('is-hidden');
  clock.getDelta();

  if (qa) {
    window.__game = {
      setMode,
      ping,
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
      cctv: (i) => { if (i < 0) cctv.exit(); else cctv.enter(i); rects = layoutOverlays(); },
      loop: () => cctv.loop(),
      fx: (v) => { Object.assign(state, v); rects = layoutOverlays(); },
      quality: (q) => { applyQuality(q); setMode(state.mode); },
      guards: () => guards.map((g) => {
        const r = g.actor.root;
        const next = g.waypoints[g.index];
        return { heading: r.rotation.y, toward: Math.atan2(next.x - r.position.x, next.z - r.position.z) };
      }),
      info: () => ({ ...renderer.info.render, quality: state.quality })
    };
    window.__ready = true;
  } else {
    requestAnimationFrame(frame);
  }
}

start().catch((error) => {
  const el = document.getElementById('loading');
  el.textContent = 'COULD NOT LOAD THE MUSEUM · ' + error.message;
  console.error(error);
});
