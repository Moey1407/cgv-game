// Small static four-neighbour grid. Cardinal edges avoid diagonal corner
// cutting.
//
// Two inflations, which is the point of this module. Routes are planned on a
// grid inflated by radius + clearance, so a planned path keeps a margin from
// every wall and the walker never ends up pressed against a corner. Movement
// is validated against radius alone, so anything the planner produced is
// comfortably walkable. Where a gap is too tight for the margin - some of the
// Level 2 and 3 geometry - planning falls back to the bare-radius grid so the
// route still exists, it just hugs the wall.
export function createNavigator(colliders, stage, radius = 0.48, clearance = 0.22) {
  const boxes = colliders.filter((box) => !box.disabled && (!box.stage || box.stage === stage));
  const width = 65, height = 89, count = width * height;
  const position = (id) => ({ x: (id % width - 32) * 0.5, z: (Math.floor(id / width) - 44) * 0.5 });
  const blockedBy = (margin) => ({ x, z }) => boxes.some((box) =>
    x + margin > box.minX && x - margin < box.maxX &&
    z + margin > box.minZ && z - margin < box.maxZ);
  const blocked = blockedBy(radius);
  const blockedWithClearance = blockedBy(radius + clearance);
  function canTravel(from, to) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.15));
    for (let i = 1; i <= steps; i++) {
      if (blocked({ x: from.x + (to.x - from.x) * i / steps, z: from.z + (to.z - from.z) * i / steps })) return false;
    }
    return true;
  }
  const openTight = Uint8Array.from({ length: count }, (_, id) => !blocked(position(id)));
  const openSafe = Uint8Array.from({ length: count }, (_, id) => !blockedWithClearance(position(id)));
  const parents = new Int32Array(count);
  const queue = new Int32Array(count);

  function search(open, from, target) {
    let start = -1, nearest = Infinity;
    for (let id = 0; id < count; id++) {
      if (!open[id]) continue;
      const point = position(id);
      const distance = Math.hypot(point.x - from.x, point.z - from.z);
      if (distance < nearest && canTravel(from, point)) { start = id; nearest = distance; }
    }
    if (start < 0) return [];
    parents.fill(-2);
    parents[start] = -1;
    queue[0] = start;
    let tail = 1, best = start, bestDistance = Infinity;
    for (let head = 0; head < tail; head++) {
      const id = queue[head];
      const point = position(id);
      const distance = Math.hypot(point.x - target.x, point.z - target.z);
      if (distance < bestDistance) { best = id; bestDistance = distance; }
      if (distance < 0.26) break;
      const x = id % width, z = Math.floor(id / width);
      for (const next of [x > 0 ? id - 1 : -1, x < width - 1 ? id + 1 : -1,
        z > 0 ? id - width : -1, z < height - 1 ? id + width : -1]) {
        if (next < 0 || !open[next] || parents[next] !== -2) continue;
        parents[next] = id;
        queue[tail++] = next;
      }
    }
    const result = [];
    for (let id = best; id >= 0; id = parents[id]) result.push(position(id));
    return { path: result.reverse(), reached: bestDistance < 1.2 };
  }

  // A four-neighbour grid produces a staircase. Pull the string tight: keep
  // only the nodes that are actually needed, so the walker takes long straight
  // legs and real diagonals instead of stepping around every half metre.
  function smooth(path, from) {
    if (path.length < 2) return path;
    const result = [];
    let anchor = from;
    let i = 0;
    while (i < path.length) {
      let furthest = i;
      const limit = Math.min(path.length - 1, i + 40);
      for (let j = limit; j > i; j--) {
        if (canTravel(anchor, path[j])) { furthest = j; break; }
      }
      result.push(path[furthest]);
      anchor = path[furthest];
      i = furthest + 1;
    }
    return result;
  }

  function route(from, target) {
    let found = search(openSafe, from, target);
    // Only fall back to the wall-hugging grid when the roomy one genuinely
    // cannot get there, not merely because it stopped a little short.
    if (!found.path.length || !found.reached) {
      const tight = search(openTight, from, target);
      if (tight.path.length && (tight.reached || !found.path.length)) found = tight;
    }
    return smooth(found.path, from);
  }

  return { route, blocked, canTravel };
}

// Move `from` toward `target` by at most `maxStep`. The direct line is tried
// first; if it clips a corner, the move is retried one axis at a time so the
// walker slides along the wall instead of stopping dead against it. Returns
// null only when all three are blocked, which means a replan is needed.
export function stepToward(navigator, from, target, maxStep) {
  const dx = target.x - from.x, dz = target.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-5) return null;
  const step = Math.min(distance, maxStep);
  const offsetX = dx / distance * step, offsetZ = dz / distance * step;
  const candidates = [{ x: from.x + offsetX, z: from.z + offsetZ }];
  // Prefer sliding along whichever axis has the most distance left to cover.
  if (Math.abs(dx) >= Math.abs(dz)) {
    candidates.push({ x: from.x + offsetX, z: from.z }, { x: from.x, z: from.z + offsetZ });
  } else {
    candidates.push({ x: from.x, z: from.z + offsetZ }, { x: from.x + offsetX, z: from.z });
  }
  for (const candidate of candidates) {
    if (Math.hypot(candidate.x - from.x, candidate.z - from.z) < 1e-6) continue;
    if (navigator.canTravel(from, candidate)) return candidate;
  }
  return null;
}

// A walker that ends up inside an inflated obstacle can never step anywhere,
// because every candidate segment starts in solid geometry. Spiral outwards
// for the closest free spot and put it there. Returns null if already clear.
export function unstick(navigator, position, maxRadius = 2.5) {
  if (!navigator.blocked(position)) return null;
  for (let radius = 0.25; radius <= maxRadius; radius += 0.25) {
    for (let i = 0; i < 16; i += 1) {
      const angle = i / 16 * Math.PI * 2;
      const candidate = {
        x: position.x + Math.cos(angle) * radius,
        z: position.z + Math.sin(angle) * radius
      };
      if (!navigator.blocked(candidate)) return candidate;
    }
  }
  return null;
}
