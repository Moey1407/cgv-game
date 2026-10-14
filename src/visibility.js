import * as THREE from 'three';
import { WAVE_BAND, ECHO_BAND, ECHO_OFFSET } from './shaders.js';
import { hasClearAccess } from './interactions.js';
export const DECOY_COMMIT_SECONDS = 5;

export function hearSound(guard, position, radius, source, colliders = [], stage = 3) {
  if (!guard.active || guard.state === 'pursue' ||
      Math.hypot(guard.group.position.x - position.x, guard.group.position.z - position.z) >= radius + 3) return false;
  // Overrides are local mechanical noise: separating geometry blocks the
  // alert, so the guard beyond a locked door cannot camp the other side.
  if (source === 'override' && !hasClearAccess(guard.group.position, position, colliders, stage, radius + 3)) return false;
  // Brief commitment to a decoy gives the player time to begin an override.
  // Visual detection still overrides it in updateGuardAwareness.
  if (guard.decoyFocus > 0 && source !== 'decoy') return false;
  guard.state = 'investigate';
  guard.target.set(position.x, 0, position.z);
  if (source === 'decoy') guard.decoyFocus = DECOY_COMMIT_SECONDS;
  return true;
}

// A damped ring still renders for the player - the rig is still showing them
// the room - but it carries no resolvable return, so it cannot light them up
// for anyone else.
export function playerIlluminated(rings, player) {
  return rings.some((ring) => {
    const t = ring.age / ring.duration;
    const radius = t * ring.maxRadius;
    // Measured on the ground plane, matching the shader: the band the player
    // can see sweeping past their feet is exactly the one that exposes them.
    const distance = Math.hypot(ring.position.x - player.x, ring.position.z - player.z);
    return ring.source !== 'briefing' && !ring.damped && t < 0.9 &&
      (Math.abs(distance - radius) < WAVE_BAND ||
        Math.abs(distance - Math.max(0, radius - ECHO_OFFSET)) < ECHO_BAND);
  });
}

export function updateGuardAwareness(guard, player, exposed, colliders, dt, stage = 3) {
  const dx = player.x - guard.group.position.x, dz = player.z - guard.group.position.z;
  const distance = Math.hypot(dx, dz);
  const inView = distance > 0 && (Math.sin(guard.group.rotation.y) * dx + Math.cos(guard.group.rotation.y) * dz) / distance > 0.35;
  const visible = exposed && inView && hasClearAccess(guard.group.position, player, colliders, stage, 12);
  guard.suspicion = THREE.MathUtils.clamp(guard.suspicion + (visible ? dt * 2 : -dt), 0, 1);
  if (visible) {
    guard.lastSeen.copy(player);
    if (guard.suspicion >= 1) guard.state = 'pursue';
  }
  if (guard.state === 'pursue') {
    guard.target.copy(guard.lastSeen);
    if (!visible) { guard.state = 'search'; guard.searchTimer = 4; }
  }
  if (guard.state === 'search') {
    guard.searchTimer = Math.max(0, guard.searchTimer - dt);
    if (guard.searchTimer === 0) guard.state = 'patrol';
  }
  return visible;
}
