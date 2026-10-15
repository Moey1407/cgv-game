// Small authored strolls between social spots, not random full-room wandering.
export function createGuestMotion(guest, order, { canStand = () => true } = {}) {
  const home = { x: guest.x, z: guest.z };
  const sign = order % 2 ? -1 : 1;
  const stop = { x: Math.max(-7, Math.min(7, home.x + sign * 1.6)), z: Math.max(-26, Math.min(-3, home.z - sign * 3.6)) };
  const route = [home, stop];
  let position = { ...home }, target = 1, waiting = 2 + order * .47, yaw = guest.rotation ?? 0, moving = false;
  function update(dt, occupied = () => false) {
    dt = Math.min(.2, Math.max(0, dt)); moving = false;
    if (guest.stroll === false || order % 3 === 2 || dt === 0) return { ...position, yaw, moving };
    if (waiting > 0) { waiting -= dt; return { ...position, yaw, moving }; }
    const to = route[target], dx = to.x - position.x, dz = to.z - position.z, distance = Math.hypot(dx, dz);
    if (distance < .06) { target = 1 - target; waiting = 4 + order % 4; return { ...position, yaw, moving }; }
    const step = Math.min(distance, .65 * dt), x = position.x + dx / distance * step, z = position.z + dz / distance * step;
    if (!canStand(x, z)) { target = 1 - target; waiting = 1.5; return { ...position, yaw, moving }; }
    if (occupied(x, z)) { waiting = .6; return { ...position, yaw, moving }; }
    position = { x, z }; yaw = Math.atan2(dx, dz); moving = true;
    return { ...position, yaw, moving };
  }
  return { update, get position() { return { ...position }; } };
}
