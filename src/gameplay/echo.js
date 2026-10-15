const cloneFrame = (frame) => ({
  x: frame.x,
  y: frame.y ?? 0,
  z: frame.z,
  yaw: frame.yaw ?? 0,
  pitch: frame.pitch ?? 0,
  crouching: Boolean(frame.crouching),
  interacting: Boolean(frame.interacting),
  mode: frame.mode ?? 'walk'
});

const lerp = (a, b, t) => a + (b - a) * t;

export function lerpAngle(a, b, t) {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

export function createEchoSystem({ events, sampleHz = 20, maxSeconds = 20 } = {}) {
  const sampleStep = 1 / sampleHz;
  const maxFrames = Math.round(sampleHz * maxSeconds) + 1;
  let mode = 'idle';
  let frames = [];
  let elapsed = 0;
  let sampleAccumulator = 0;
  let startFrame = null;
  let playbackTime = 0;

  function start(frame) {
    if (mode === 'recording') return false;
    mode = 'recording';
    elapsed = 0;
    sampleAccumulator = 0;
    playbackTime = 0;
    startFrame = cloneFrame(frame);
    frames = [{ t: 0, ...startFrame }];
    events?.emit('echo:start', { frame: { ...startFrame } });
    return true;
  }

  function record(dt, frame) {
    if (mode !== 'recording' || !(dt > 0)) return false;
    elapsed = Math.min(maxSeconds, elapsed + dt);
    sampleAccumulator += dt;
    while (sampleAccumulator >= sampleStep && frames.length < maxFrames) {
      sampleAccumulator -= sampleStep;
      frames.push({ t: Math.min(elapsed - sampleAccumulator, maxSeconds), ...cloneFrame(frame) });
    }
    if (elapsed >= maxSeconds) stop();
    return true;
  }

  function stop() {
    if (mode !== 'recording') return null;
    mode = 'replaying';
    playbackTime = 0;
    events?.emit('echo:replay', { duration: frames.at(-1)?.t ?? 0, frames: frames.length });
    return { ...startFrame };
  }

  function replay(dt) {
    if (mode !== 'replaying' || frames.length === 0) return null;
    playbackTime += Math.max(0, dt);
    const duration = frames.at(-1).t;
    if (playbackTime >= duration) {
      mode = 'complete';
      events?.emit('echo:complete', { duration });
      return { ...frames.at(-1), done: true };
    }
    let right = frames.findIndex((frame) => frame.t >= playbackTime);
    if (right <= 0) right = 1;
    const a = frames[right - 1];
    const b = frames[right];
    const mix = b.t === a.t ? 1 : (playbackTime - a.t) / (b.t - a.t);
    return {
      t: playbackTime,
      x: lerp(a.x, b.x, mix),
      y: lerp(a.y, b.y, mix),
      z: lerp(a.z, b.z, mix),
      yaw: lerpAngle(a.yaw, b.yaw, mix),
      pitch: lerp(a.pitch, b.pitch, mix),
      crouching: mix < 0.5 ? a.crouching : b.crouching,
      interacting: mix < 0.5 ? a.interacting : b.interacting,
      mode: mix < 0.5 ? a.mode : b.mode,
      done: false
    };
  }

  function shatter(reason = 'guard') {
    if (mode !== 'replaying') return false;
    mode = 'shattered';
    events?.emit('echo:shattered', { reason, playbackTime });
    return true;
  }

  function reset() {
    mode = 'idle';
    frames = [];
    elapsed = sampleAccumulator = playbackTime = 0;
    startFrame = null;
  }

  return {
    start,
    record,
    stop,
    replay,
    shatter,
    reset,
    snapshot: () => ({ mode, elapsed, playbackTime, frameCount: frames.length, duration: frames.at(-1)?.t ?? 0 }),
    get rewindFrame() { return startFrame ? { ...startFrame } : null; },
    get frames() { return frames.map((frame) => ({ ...frame })); }
  };
}
