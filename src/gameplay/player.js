export const MOVEMENT = Object.freeze({
  crawl: Object.freeze({ id: 'crawl', label: 'CRAWLING', speed: 0.95, noise: 0.05, radius: 1.8, step: 1.55, height: 0.58 }),
  crouch: Object.freeze({ id: 'crouch', label: 'CROUCH', speed: 1.55, noise: 0.1, radius: 2.9, step: 1.35, height: 1.08 }),
  walk: Object.freeze({ id: 'walk', label: 'WALKING', speed: 2.45, noise: 0.22, radius: 5.1, step: 0.88, height: 1.68 }),
  run: Object.freeze({ id: 'run', label: 'RUNNING', speed: 4.85, noise: 0.78, radius: 12.4, step: 0.4, height: 1.68 }),
  sprint: Object.freeze({ id: 'sprint', label: 'SPRINTING', speed: 7.1, noise: 1, radius: 16, step: 0.28, height: 1.68 })
});

export function movementMode(keys) {
  if (keys.KeyZ) return MOVEMENT.crawl;
  if (keys.KeyC || keys.ControlLeft) return MOVEMENT.crouch;
  if (keys.KeyX) return MOVEMENT.sprint;
  if (keys.ShiftLeft || keys.ShiftRight) return MOVEMENT.walk;
  return MOVEMENT.run;
}

export function movementProfile(keys, { carrying = false, surfaceNoise = 1, damped = false, mode = movementMode(keys) } = {}) {
  return {
    ...mode,
    speed: mode.speed * (carrying ? 0.88 : 1),
    noise: Math.min(1, mode.noise * surfaceNoise * (damped ? 0.25 : 1)),
    radius: mode.radius * surfaceNoise
  };
}
