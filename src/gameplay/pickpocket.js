export const PICKPOCKET_SECONDS = 1.5;

export function pickpocketAccess(player, guard, { range = 1.45, behindDot = -0.42, clear = true } = {}) {
  if (!player || !guard || !clear || guard.state === 'pursue') return false;
  const dx = player.x - guard.position.x;
  const dz = player.z - guard.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0 || distance > range) return false;
  const forwardX = Math.sin(guard.yaw);
  const forwardZ = Math.cos(guard.yaw);
  return (forwardX * dx + forwardZ * dz) / distance < behindDot;
}

export function createPickpocketSystem({ duration = PICKPOCKET_SECONDS, events } = {}) {
  let progress = 0;
  let completed = false;

  return {
    update({ dt, holding, player, guard, clear = true }) {
      const eligible = !completed && pickpocketAccess(player, guard, { clear });
      if (!eligible || !holding || !(dt > 0)) {
        if (!completed) progress = 0;
        return { eligible, progress, completed: false };
      }
      progress = Math.min(duration, progress + dt);
      if (progress < duration) return { eligible, progress, completed: false };
      completed = true;
      events?.emit('pickpocket:complete', { target: guard.id ?? 'guard' });
      return { eligible: false, progress, completed: true };
    },
    reset(done = false) {
      progress = done ? duration : 0;
      completed = done;
    },
    snapshot() {
      return { progress, duration, completed };
    }
  };
}
