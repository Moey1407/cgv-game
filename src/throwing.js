// Decoy physics. One integrator, used both by the live object and by the arc
// preview, so what the player is shown is exactly what happens.
//
// The decoy behaves like a small hard ball: it bounces, loses energy on each
// impact, rolls once it is low enough, and comes to rest. Every impact is
// reported so the caller can turn it into a sound - which means a single throw
// produces a decaying series of noises rather than one, and drags a guard
// along the bounce path instead of to a single point.

export const THROW = {
  speed: 9,
  lift: 2.4,
  gravity: 11.5,
  radius: 0.16,
  restY: 0.18,
  bounce: 0.46,         // vertical energy kept per floor impact
  wallBounce: 0.42,     // horizontal energy kept per wall impact
  groundFriction: 0.78, // horizontal damping applied on each floor impact
  rollFriction: 2.4,    // per-second damping while rolling
  bounceMin: 1.15,      // below this downward speed it stops bouncing
  restSpeed: 0.45,      // below this horizontal speed it stops rolling
  maxFlightTime: 6
};

// Advances one step. Mutates `position` and `velocity`, and returns an impact
// descriptor when the step produced one.
export function advanceThrow(position, velocity, dt, blocked) {
  if (velocity.resting) return null;

  const onGround = position.y <= THROW.restY + 1e-4 && Math.abs(velocity.y) < 1e-4;
  if (onGround) {
    // Rolling: friction only, no gravity integration needed.
    const damping = Math.exp(-THROW.rollFriction * dt);
    velocity.x *= damping;
    velocity.z *= damping;
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed < THROW.restSpeed) {
      velocity.x = velocity.z = 0;
      velocity.resting = true;
      return null;
    }
    const next = { x: position.x + velocity.x * dt, y: position.y, z: position.z + velocity.z * dt };
    if (blocked(next.x, next.y, next.z)) {
      const hit = reflect(position, velocity, next, blocked);
      return { x: position.x, y: position.y, z: position.z, speed, type: 'wall', axis: hit };
    }
    position.x = next.x;
    position.z = next.z;
    return null;
  }

  velocity.y -= THROW.gravity * dt;
  const next = {
    x: position.x + velocity.x * dt,
    y: position.y + velocity.y * dt,
    z: position.z + velocity.z * dt
  };

  if (blocked(next.x, next.y, next.z)) {
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    const axis = reflect(position, velocity, next, blocked);
    return { x: position.x, y: position.y, z: position.z, speed, type: 'wall', axis };
  }

  if (next.y <= THROW.restY) {
    const impactSpeed = Math.abs(velocity.y);
    position.x = next.x;
    position.z = next.z;
    position.y = THROW.restY;
    velocity.x *= THROW.groundFriction;
    velocity.z *= THROW.groundFriction;
    if (impactSpeed > THROW.bounceMin) {
      velocity.y = impactSpeed * THROW.bounce;
      return { x: position.x, y: position.y, z: position.z, speed: impactSpeed, type: 'bounce' };
    }
    // Too slow to bounce: settle onto the floor and start rolling.
    velocity.y = 0;
    const rolling = Math.hypot(velocity.x, velocity.z);
    if (rolling < THROW.restSpeed) {
      velocity.x = velocity.z = 0;
      velocity.resting = true;
    }
    return { x: position.x, y: position.y, z: position.z, speed: impactSpeed, type: 'settle' };
  }

  position.x = next.x;
  position.y = next.y;
  position.z = next.z;
  return null;
}

// Works out which axis was hit by testing each separately, then mirrors the
// velocity on that axis so the ball deflects off the wall instead of stopping.
function reflect(position, velocity, next, blocked) {
  const hitX = blocked(next.x, next.y, position.z);
  const hitZ = blocked(position.x, next.y, next.z);
  if (hitX || (!hitX && !hitZ)) velocity.x = -velocity.x * THROW.wallBounce;
  if (hitZ || (!hitX && !hitZ)) velocity.z = -velocity.z * THROW.wallBounce;
  velocity.y *= 0.82;
  return hitX && hitZ ? 'both' : hitX ? 'x' : 'z';
}

// Runs the whole flight ahead of time. Returns the path, every impact along it
// and where it finally stops.
export function simulateThrow(origin, initialVelocity, blocked, step = 1 / 60) {
  const position = { x: origin.x, y: origin.y, z: origin.z };
  const velocity = { x: initialVelocity.x, y: initialVelocity.y, z: initialVelocity.z, resting: false };
  const points = [{ x: position.x, y: position.y, z: position.z }];
  const impacts = [];
  const maxSteps = Math.ceil(THROW.maxFlightTime / step);

  for (let i = 0; i < maxSteps; i += 1) {
    const impact = advanceThrow(position, velocity, step, blocked);
    points.push({ x: position.x, y: position.y, z: position.z });
    if (impact) impacts.push(impact);
    if (velocity.resting) break;
  }
  return { points, impacts, rest: { x: position.x, y: position.y, z: position.z } };
}

// Impact loudness. The first contact is the loud one; later bounces trail off,
// which is what gives a thrown object its characteristic decaying rattle.
export function impactRadius(speed) {
  return Math.max(3.5, Math.min(15, speed * 1.75));
}
