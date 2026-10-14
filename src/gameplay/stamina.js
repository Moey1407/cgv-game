export function createStaminaSystem({ max = 4, drainPerSecond = 1, recoverPerSecond = 0.8, recoveryDelay = 0.7 } = {}) {
  let value = max;
  let delay = 0;

  const api = {
    update(dt, sprinting) {
      if (!(dt > 0)) return api.snapshot();
      if (sprinting && value > 0) {
        value = Math.max(0, value - drainPerSecond * dt);
        delay = recoveryDelay;
      } else {
        delay = Math.max(0, delay - dt);
        if (delay === 0) value = Math.min(max, value + recoverPerSecond * dt);
      }
      return api.snapshot();
    },
    reset() {
      value = max;
      delay = 0;
    },
    snapshot() {
      return { value, max, ratio: max === 0 ? 0 : value / max, canSprint: value > 0.05, recovering: delay > 0 };
    }
  };
  return api;
}
