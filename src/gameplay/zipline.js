const distance3 = (a, b) => Math.hypot(a.x - b.x, (a.y ?? 0) - (b.y ?? 0), a.z - b.z);
const lerp = (a, b, t) => a + (b - a) * t;

function copyPoint(point) {
  return { x: point.x, y: point.y ?? 0, z: point.z };
}

export function createZiplineSystem(definitions = [], { events } = {}) {
  const lines = definitions.map((line) => ({
    speed: 8,
    mountRadius: 1.5,
    maxLean: 0.65,
    bidirectional: true,
    ...line,
    start: copyPoint(line.start),
    end: copyPoint(line.end)
  }));
  let ride = null;

  function mountCandidate(position) {
    let best = null;
    for (const line of lines) {
      const startDistance = distance3(position, line.start);
      const endDistance = line.bidirectional ? distance3(position, line.end) : Infinity;
      const distance = Math.min(startDistance, endDistance);
      if (distance > line.mountRadius || (best && distance >= best.distance)) continue;
      const reverse = endDistance < startDistance;
      best = { line, reverse, distance };
    }
    return best;
  }

  function dismount(reason, completed = false) {
    if (!ride) return null;
    const result = { ...api.snapshot(), reason, completed };
    events?.emit(completed ? 'zipline:complete' : 'zipline:dismount', result);
    ride = null;
    return result;
  }

  const api = {
    lines,
    nearest(position) {
      const candidate = mountCandidate(position);
      return candidate ? { id: candidate.line.id, reverse: candidate.reverse, distance: candidate.distance } : null;
    },
    mount(position) {
      if (ride) return false;
      const candidate = mountCandidate(position);
      if (!candidate) return false;
      const from = candidate.reverse ? candidate.line.end : candidate.line.start;
      const to = candidate.reverse ? candidate.line.start : candidate.line.end;
      ride = {
        id: candidate.line.id,
        line: candidate.line,
        from: copyPoint(from),
        to: copyPoint(to),
        distance: distance3(from, to),
        progress: 0,
        lean: 0,
        position: copyPoint(from)
      };
      events?.emit('zipline:mount', api.snapshot());
      return true;
    },
    update(dt, { lean = 0, drop = false } = {}) {
      if (!ride) return null;
      if (drop) return dismount('drop');
      ride.lean = Math.max(-1, Math.min(1, Number(lean) || 0));
      ride.progress = Math.min(1, ride.progress + Math.max(0, dt) * ride.line.speed / Math.max(ride.distance, 0.001));
      const dx = ride.to.x - ride.from.x;
      const dz = ride.to.z - ride.from.z;
      const horizontal = Math.max(0.001, Math.hypot(dx, dz));
      const sideX = -dz / horizontal;
      const sideZ = dx / horizontal;
      const offset = ride.lean * ride.line.maxLean;
      ride.position = {
        x: lerp(ride.from.x, ride.to.x, ride.progress) + sideX * offset,
        y: lerp(ride.from.y, ride.to.y, ride.progress),
        z: lerp(ride.from.z, ride.to.z, ride.progress) + sideZ * offset
      };
      const snapshot = api.snapshot();
      events?.emit('zipline:move', snapshot);
      if (ride.progress >= 1) dismount('arrival', true);
      return snapshot;
    },
    dismount: (reason = 'manual') => dismount(reason),
    reset() { ride = null; },
    snapshot() {
      if (!ride) return { riding: false };
      return {
        riding: true,
        id: ride.id,
        progress: ride.progress,
        lean: ride.lean,
        position: copyPoint(ride.position)
      };
    }
  };

  return api;
}
