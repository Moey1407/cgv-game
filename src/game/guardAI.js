import * as THREE from 'three';

export const GUARD_STATES = ['patrol', 'investigate', 'pursue', 'search'];
// Backstop only: a long but walkable route (archive to laser corridor is ~31 m) must
// finish. Pushing at a wall is caught much sooner by INVESTIGATE_NO_PROGRESS.
export const INVESTIGATE_GIVE_UP = 40; // seconds of walking toward a noise before giving up
export const URGENT_PACE = 2; // hurrying to a tripped alarm
export const URGENT_LOOK = 6; // seconds spent looking around where it went off
export const INVESTIGATE_NO_PROGRESS = 3; // seconds without moving before giving up

const SIGHT = {
  gala: { range: 6, fov: Math.PI * 0.4 },
  night: { range: 4.5, fov: Math.PI * 0.34 },
  lockdown: { range: 5.5, fov: Math.PI * 0.4 }
};
const TORCH = { range: 8, fov: 0.42 };

export function angleTo(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function inCone(origin, yaw, point, range, fov) {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 0.6) return true;
  return Math.abs(wrapAngle(Math.atan2(dx, dz) - yaw)) <= fov / 2;
}

export function createGuardAI({ id, actor, torch, waypoints, speed, pauseSeconds = 0, events }) {
  const root = actor.root;
  const home = waypoints[0].clone();
  const target = new THREE.Vector3();
  const lastSeen = new THREE.Vector3();
  const step = new THREE.Vector3();
  const navGoal = new THREE.Vector3(Infinity, 0, Infinity);
  let route = [], stuck = 0;
  const guard = {
    id,
    actor,
    torch,
    root,
    waypoints,
    index: 1 % waypoints.length,
    speed,
    state: 'patrol',
    suspicion: 0,
    timer: 0,
    pulse: Math.random() * 2,
    lostSight: 0,
    pauseTimer: 0,
    proximityTime: 0,
    checkingGuest: 0,
    get position() { return root.position; },
    get yaw() { return root.rotation.y; },
    // Where an investigating guard is heading (read by the dial countdown).
    get target() { return target; }
  };

  function setState(next) {
    if (guard.state === next) return;
    const previous = guard.state;
    guard.state = next;
    actor.play(next === 'pursue' ? 'Run' : next === 'search' || (next === 'investigate' && guard.timer > 0) ? 'Idle' : 'Walk');
    events?.emit('guard:state', { id, state: next, previous });
  }

  function sedate(seconds = 40) {
    if (guard.sleep > 0) return false;
    guard.sleep = seconds;
    guard.suspicion = 0;
    guard.pauseTimer = 0;
    route = []; stuck = 0;
    setState('sedated');
    actor.play('Idle');
    if (torch) torch.visible = false;
    return true;
  }

  // urgent: an alarm with a location (a tripped laser). He hurries there and looks
  // around for longer. A quieter noise heard on the way does not slow him down.
  function hear(position, strength = 1, { urgent = false } = {}) {
    if (guard.sleep > 0) return false;
    if (guard.state === 'pursue') return false;
    guard.urgent = urgent || (guard.urgent && guard.state === 'investigate');
    target.set(position.x, 0, position.z);
    guard.timer = 0;
    guard.seeking = 0;
    guard.freshNoise = true;
    guard.suspicion = Math.min(0.6, guard.suspicion + 0.15 * strength);
    setState('investigate');
    actor.play(guard.urgent ? 'Run' : 'Walk');
    return true;
  }

  // Move a point to the closest spot within 4 m where a guard can stand (spiral search).
  function nearestStandable(point, canStand) {
    for (let r = 0.5; r <= 4; r += 0.5) {
      for (let a = 0; a < 16; a += 1) {
        const x = point.x + Math.cos((a / 16) * Math.PI * 2) * r;
        const z = point.z + Math.sin((a / 16) * Math.PI * 2) * r;
        if (canStand(x, z)) { point.x = x; point.z = z; return true; }
      }
    }
    return false;
  }

  function moveToward(point, pace, dt, canStand, findPath) {
    if (point.distanceTo(navGoal) > 1.5) route = [];
    if (route.length && Math.hypot(route[0].x - root.position.x, route[0].z - root.position.z) < 0.3) route.shift();
    const aim = route.length ? route[0] : point;
    step.set(aim.x, 0, aim.z).sub(root.position);
    step.y = 0;
    const d = step.length();
    if (d < 0.25) return !route.length && root.position.distanceTo(point) < 0.3;
    step.multiplyScalar(1 / d);
    const want = Math.atan2(step.x, step.z);
    const delta = wrapAngle(want - root.rotation.y);
    root.rotation.y += delta * Math.min(1, dt * 6);
    const advance = Math.min(d, pace * dt * Math.max(0, Math.cos(delta)));
    const nx = root.position.x + step.x * advance;
    const nz = root.position.z + step.z * advance;
    const beforeX = root.position.x, beforeZ = root.position.z;
    // A guard already wedged into geometry may step anywhere, so he can work free.
    if (!canStand || canStand(nx, nz) || !canStand(beforeX, beforeZ)) {
      root.position.x = nx;
      root.position.z = nz;
    } else if (canStand(nx, root.position.z)) {
      root.position.x = nx;
    } else if (canStand(root.position.x, nz)) {
      root.position.z = nz;
    }
    const moved = Math.hypot(root.position.x - beforeX, root.position.z - beforeZ);
    stuck = advance > 0.005 && moved < advance * 0.2 ? stuck + dt : 0;
    if (stuck > 0.25 && findPath) { route = findPath(root.position, point); navGoal.copy(point); stuck = 0; }
    return !route.length && root.position.distanceTo(point) < 0.3;
  }

  function update(dt, ctx) {
    if (guard.sleep > 0) {
      guard.sleep = Math.max(0, guard.sleep - dt);
      root.rotation.z += (1.45 - root.rotation.z) * Math.min(1, dt * 4);
      if (guard.sleep > 0) return;
      root.rotation.z = 0;
      if (torch) torch.visible = true;
      target.copy(root.position);
      lastSeen.copy(root.position);
      guard.suspicion = 0.55;
      guard.timer = 7;
      setState('search');
      return;
    }
    const pace = guard.speed * ctx.alarm.guardSpeed;
    const sight = SIGHT[ctx.mode] ?? SIGHT.night;
    const crouchFactor = ctx.player.crouching ? 0.6 : 1;
    let sees = false;
    if (!ctx.player.blending) {
      const range = (ctx.player.visible ? sight.range : 1.8) * crouchFactor;
      sees = inCone(root.position, root.rotation.y, ctx.player.position, range, sight.fov);
      if (!sees && torch?.visible && torch.userData.on !== false && inCone(root.position, root.rotation.y, ctx.player.position, TORCH.range, TORCH.fov)) sees = true;
      if (sees && ctx.clearView && !ctx.clearView(root.position, ctx.player.position)) sees = false;
    }
    if (sees) {
      guard.suspicion = Math.min(1, guard.suspicion + dt * (guard.state === 'investigate' ? 3 : 2.2));
      lastSeen.copy(ctx.player.position);
      guard.lostSight = 0;
      if (guard.suspicion >= 1 && guard.state !== 'pursue') {
        setState('pursue');
        events?.emit('player:detected', { id });
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - dt * 0.35);
      guard.lostSight += dt;
    }

    if (guard.state === 'patrol') {
      // A guest brushing past is ordinary; someone shadowing an officer at arm's
      // length is not. Turn to check them before allowing an endless tail.
      const close = ctx.mode === 'gala' && root.position.distanceTo(ctx.player.position) < 1.7;
      guard.proximityTime = close ? guard.proximityTime + dt : Math.max(0, guard.proximityTime - dt * 2);
      if (guard.proximityTime > 2.5 && guard.checkingGuest <= 0) {
        guard.checkingGuest = 2.2;
        guard.proximityTime = 0;
        events?.emit('guard:warning', { id });
      }
      if (guard.checkingGuest > 0) {
        guard.checkingGuest -= dt;
        const want = angleTo(root.position, ctx.player.position);
        root.rotation.y += wrapAngle(want - root.rotation.y) * Math.min(1, dt * 7);
        actor.play('Idle');
      } else if (guard.pauseTimer > 0) {
        guard.pauseTimer = Math.max(0, guard.pauseTimer - dt);
        actor.play('Idle');
      } else {
        actor.play('Walk');
        if (moveToward(guard.waypoints[guard.index], pace, dt, ctx.canStand, ctx.findPath)) {
          guard.index = (guard.index + 1) % guard.waypoints.length;
          guard.pauseTimer = pauseSeconds;
        }
      }
    } else if (guard.state === 'investigate') {
      if (guard.timer > 0) {
        guard.timer -= dt;
        root.rotation.y += Math.sin(ctx.time * 1.4) * dt * 0.9;
        if (guard.timer <= 0) { setState('patrol'); actor.play('Walk'); }
      } else {
        // A noise behind a wall (the vent duct, a corridor he cannot reach) or on top
        // of a crate has no walkable spot. Aim at the nearest spot he can stand on, and
        // if he stops getting closer, stop and look around instead of pushing at a wall.
        if (guard.freshNoise) {
          guard.freshNoise = false;
          if (ctx.canStand && !ctx.canStand(target.x, target.z)) nearestStandable(target, ctx.canStand);
          guard.anchor = { x: root.position.x, z: root.position.z };
          guard.noProgress = 0;
        }
        guard.seeking = (guard.seeking ?? 0) + dt;
        // Progress means actually moving. A route around a wall can lead away from the
        // noise for a while, so distance to the target is not used here.
        if (Math.hypot(root.position.x - guard.anchor.x, root.position.z - guard.anchor.z) > 0.3) {
          guard.anchor.x = root.position.x; guard.anchor.z = root.position.z; guard.noProgress = 0;
        } else guard.noProgress += dt;
        if (moveToward(target, pace * (guard.urgent ? URGENT_PACE : 1), dt, ctx.canStand, ctx.findPath) || guard.seeking > INVESTIGATE_GIVE_UP || guard.noProgress > INVESTIGATE_NO_PROGRESS) {
          guard.timer = guard.urgent ? URGENT_LOOK : 3;
          guard.urgent = false;
          actor.play('Idle');
        }
      }
    } else if (guard.state === 'pursue') {
      moveToward(lastSeen, pace * 1.75, dt, ctx.canStand, ctx.findPath);
      if (guard.lostSight > 2.5) {
        guard.timer = 4;
        setState('search');
      }
      if (sees && root.position.distanceTo(ctx.player.position) < 0.95) events?.emit('player:caught', { id });
    } else if (guard.state === 'search') {
      guard.timer -= dt;
      root.rotation.y += dt * 1.6;
      if (guard.timer <= 0) { guard.suspicion = 0; setState('patrol'); }
    }

    actor.update(dt);
    guard.pulse -= dt;
    if (guard.pulse <= 0) {
      guard.pulse = 2.8 * ctx.alarm.pulseInterval * (guard.state === 'patrol' ? 1 : 0.55);
      ctx.onPulse?.(guard);
    }
  }

  function reset() {
    root.position.copy(home);
    guard.index = 1 % waypoints.length;
    const first = waypoints[guard.index];
    root.rotation.y = Math.atan2(first.x - home.x, first.z - home.z);
    guard.suspicion = 0;
    guard.timer = 0;
    guard.lostSight = 0;
    guard.pauseTimer = pauseSeconds;
    guard.proximityTime = 0;
    guard.checkingGuest = 0;
    guard.sleep = 0;
    root.rotation.z = 0;
    if (torch) torch.visible = true;
    route = []; stuck = 0; navGoal.set(Infinity, 0, Infinity);
    guard.state = 'investigate';
    setState('patrol');
    actor.play('Walk');
  }

  guard.hear = hear;
  guard.sedate = sedate;
  guard.update = update;
  guard.reset = reset;
  return guard;
}
