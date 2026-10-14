export const ALARM_LEVELS = Object.freeze([
  Object.freeze({ id: 'quiet', label: 'QUIET', min: 0, guardSpeed: 1, pulseInterval: 1 }),
  Object.freeze({ id: 'suspicious', label: 'SUSPICIOUS', min: 25, guardSpeed: 1.08, pulseInterval: 0.9 }),
  Object.freeze({ id: 'alert', label: 'ALERT', min: 55, guardSpeed: 1.22, pulseInterval: 0.72 }),
  Object.freeze({ id: 'lockdown', label: 'LOCKDOWN', min: 90, guardSpeed: 1.4, pulseInterval: 0.55 })
]);

export const ALARM_RAISE = Object.freeze({
  decoy: 3,
  footstep: 6,
  sonar: 12,
  override: 10,
  echo: 5,
  camera: 20,
  laser: 34,
  trap: 28,
  detected: 30,
  echoCaught: 25
});

function levelFor(value) {
  for (let index = ALARM_LEVELS.length - 1; index >= 0; index -= 1) {
    if (value >= ALARM_LEVELS[index].min) return ALARM_LEVELS[index];
  }
  return ALARM_LEVELS[0];
}

export function createAlarmSystem({ events, decayDelay = 4, decayPerSecond = 4 } = {}) {
  let value = 0;
  let floor = 0;
  let cooloff = 0;
  let current = levelFor(value);
  let lastCause = 'reset';

  function publish(previousValue, previousLevel, cause) {
    const snapshot = api.snapshot();
    if (previousValue !== value) events?.emit('alarm:change', { ...snapshot, previousValue, cause });
    if (previousLevel.id !== current.id) {
      events?.emit('alarm:level', { ...snapshot, previous: previousLevel, cause });
      if (current.id === 'lockdown') events?.emit('alarm:lockdown', { ...snapshot, cause });
    }
    return snapshot;
  }

  function setValue(nextValue, cause, resetCooloff = false) {
    const previousValue = value;
    const previousLevel = current;
    value = Math.max(floor, Math.min(100, Number(nextValue) || 0));
    current = levelFor(value);
    lastCause = cause;
    if (resetCooloff) cooloff = decayDelay;
    return publish(previousValue, previousLevel, cause);
  }

  const api = {
    raise(amount, cause = 'unknown') {
      if (amount <= 0) return api.snapshot();
      return setValue(value + amount, cause, true);
    },
    update(dt, { canDecay = true } = {}) {
      if (!(dt > 0)) return api.snapshot();
      cooloff = Math.max(0, cooloff - dt);
      if (canDecay && cooloff === 0 && value > floor) {
        return setValue(value - decayPerSecond * dt, 'decay');
      }
      return api.snapshot();
    },
    reset(nextValue = 0, cause = 'reset') {
      floor = 0;
      cooloff = 0;
      return setValue(nextValue, cause);
    },
    setFloor(nextFloor, cause = 'floor') {
      floor = Math.max(0, Math.min(100, Number(nextFloor) || 0));
      return setValue(Math.max(value, floor), cause);
    },
    snapshot() {
      return {
        value,
        floor,
        level: current,
        lastCause,
        guardSpeed: current.guardSpeed,
        pulseInterval: current.pulseInterval
      };
    }
  };

  return api;
}
