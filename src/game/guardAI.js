import * as THREE from 'three';

export const GUARD_STATES = ['patrol', 'investigate', 'pursue', 'search'];

const SIGHT = {
  gala: { range: 10, fov: Math.PI * 0.55 },
  night: { range: 6.5, fov: Math.PI * 0.5 },
  lockdown: { range: 9, fov: Math.PI * 0.6 }
};

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

export function createGuardAI({ id, actor, torch, waypoints, speed, events }) {
  const root = actor.root;
  const home = waypoints[0].clone();
  const target = new THREE.Vector3();
  const lastSeen = new THREE.Vector3();
  const step = new THREE.Vector3();
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
    get position() { return root.position; },
    get yaw() { return root.rotation.y; }
  };

  function setState(next) {
    if (guard.state === next) return;
    const previous = guard.state;
    guard.state = next;
    actor.play(next === 'pursue' ? 'Run' : next === 'search' || (next === 'investigate' && guard.timer > 0) ? 'Idle' : 'Walk');
    events?.emit('guard:state', { id, state: next, previous });
  }

  function hear(position, strength = 1) {
    if (guard.state === 'pursue') return false;
    target.set(position.x, 0, position.z);
    guard.timer = 0;
    guard.suspicion = Math.min(0.6, guard.suspicion + 0.15 * strength);
    setState('investigate');
    actor.play('Walk');
    return true;
  }

  function moveToward(point, pace, dt, canStand) {
    step.copy(point).sub(root.position);
    step.y = 0;
    const d = step.length();
    if (d < 0.25) return true;
    step.multiplyScalar(1 / d);
    const want = Math.atan2(step.x, step.z);
    const delta = wrapAngle(want - root.rotation.y);
    root.rotation.y += delta * Math.min(1, dt * 6);
    const advance = Math.min(d, pace * dt * Math.max(0, Math.cos(delta)));
    const nx = root.position.x + step.x * advance;
    const nz = root.position.z + step.z * advance;
    if (!canStand || canStand(nx, nz)) {
      root.position.x = nx;
      root.position.z = nz;
    } else if (canStand(nx, root.position.z)) {
      root.position.x = nx;
    } else if (canStand(root.position.x, nz)) {
      root.position.z = nz;
    }
    return d < 0.3;
  }

  function update(dt, ctx) {
    const pace = guard.speed * ctx.alarm.guardSpeed;
    const sight = SIGHT[ctx.mode] ?? SIGHT.night;
    const crouchFactor = ctx.player.crouching ? 0.6 : 1;
    let sees = false;
    if (ctx.player.visible) {
      const range = sight.range * crouchFactor;
      sees = inCone(root.position, root.rotation.y, ctx.player.position, range, sight.fov);
      if (!sees && torch?.visible && inCone(root.position, root.rotation.y, ctx.player.position, 14, 0.6)) sees = true;
    }
    if (sees) {
      guard.suspicion = Math.min(1, guard.suspicion + dt * (guard.state === 'investigate' ? 1.8 : 1.1));
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
      if (moveToward(guard.waypoints[guard.index], pace, dt, ctx.canStand)) guard.index = (guard.index + 1) % guard.waypoints.length;
    } else if (guard.state === 'investigate') {
      if (guard.timer > 0) {
        guard.timer -= dt;
        root.rotation.y += Math.sin(ctx.time * 1.4) * dt * 0.9;
        if (guard.timer <= 0) { setState('patrol'); actor.play('Walk'); }
      } else if (moveToward(target, pace, dt, ctx.canStand)) {
        guard.timer = 3;
        actor.play('Idle');
      }
    } else if (guard.state === 'pursue') {
      moveToward(lastSeen, pace * 1.75, dt, ctx.canStand);
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
    guard.state = 'investigate';
    setState('patrol');
    actor.play('Walk');
  }

  guard.hear = hear;
  guard.update = update;
  guard.reset = reset;
  return guard;
}
