export const CCTV_LOOP_SECONDS = 8;

export function cameraSees(camera, player, clear = true) {
  if (!camera.enabled || !clear || camera.loopRemaining > 0) return false;
  const dx = player.x - camera.x;
  const dz = player.z - camera.z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0 || distance > camera.range) return false;
  const forwardX = Math.sin(camera.yaw);
  const forwardZ = Math.cos(camera.yaw);
  const dot = (forwardX * dx + forwardZ * dz) / distance;
  return dot >= Math.cos(camera.fov / 2);
}

export function createCctvSystem(definitions = [], { events, loopSeconds = CCTV_LOOP_SECONDS } = {}) {
  const cameras = definitions.map((camera) => ({
    range: 12,
    fov: Math.PI / 3,
    yaw: 0,
    enabled: true,
    loopRemaining: 0,
    seeing: false,
    ...camera
  }));

  return {
    cameras,
    loop(id) {
      const camera = cameras.find((entry) => entry.id === id);
      if (!camera || !camera.enabled) return false;
      camera.loopRemaining = loopSeconds;
      camera.seeing = false;
      events?.emit('camera:loop', { id, seconds: loopSeconds });
      return true;
    },
    update(dt, player, { clear = () => true } = {}) {
      const detections = [];
      for (const camera of cameras) {
        camera.loopRemaining = Math.max(0, camera.loopRemaining - Math.max(0, dt));
        const seeing = cameraSees(camera, player, clear(camera, player));
        if (seeing && !camera.seeing) {
          detections.push(camera.id);
          events?.emit('camera:detected', { id: camera.id, player: { x: player.x, z: player.z } });
        }
        camera.seeing = seeing;
      }
      return detections;
    },
    reset() {
      for (const camera of cameras) {
        camera.loopRemaining = 0;
        camera.seeing = false;
      }
    },
    snapshot() {
      return cameras.map(({ id, loopRemaining, seeing }) => ({ id, loopRemaining, seeing }));
    }
  };
}
