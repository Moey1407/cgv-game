// A bounded ground-floor grid is only searched when a guard gets obstructed.
// Four-connected cells prevent diagonal corner clipping around archive crates.
export function createNavigation(bounds, canStand, cell = 0.5) {
  const width = Math.ceil((bounds.maxX - bounds.minX) / cell) + 1;
  const height = Math.ceil((bounds.maxZ - bounds.minZ) / cell) + 1;
  const point = (index) => ({ x: bounds.minX + (index % width) * cell, z: bounds.minZ + Math.floor(index / width) * cell });
  const valid = (i) => i >= 0 && i < width * height && canStand(point(i).x, point(i).z);
  function nearest(p) {
    const cx = Math.round((p.x - bounds.minX) / cell), cz = Math.round((p.z - bounds.minZ) / cell);
    for (let radius = 0; radius <= 3; radius++) {
      let best = null, distance = Infinity;
      for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx, z = cz + dz;
        if (x < 0 || x >= width || z < 0 || z >= height) continue;
        const i = z * width + x;
        if (!valid(i)) continue;
        const v = point(i), d = Math.hypot(v.x - p.x, v.z - p.z);
        if (d < distance) { best = i; distance = d; }
      }
      if (best !== null) return best;
    }
    return null;
  }
  function clear(a, b) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (cell / 2)));
    for (let i = 1; i <= steps; i++) if (!canStand(a.x + (b.x - a.x) * i / steps, a.z + (b.z - a.z) * i / steps)) return false;
    return true;
  }
  return { findPath(from, to) {
    if (clear(from, to)) return [{ x: to.x, z: to.z }];
    const start = nearest(from), goal = nearest(to);
    if (start === null || goal === null) return [];
    const parent = new Int32Array(width * height); parent.fill(-2); parent[start] = -1;
    const queue = new Int32Array(width * height); queue[0] = start;
    let head = 0, tail = 1;
    while (head < tail && parent[goal] === -2) {
      const here = queue[head++], x = here % width, z = Math.floor(here / width);
      for (const next of [x > 0 ? here - 1 : -1, x < width - 1 ? here + 1 : -1, z > 0 ? here - width : -1, z < height - 1 ? here + width : -1]) {
        if (next < 0 || parent[next] !== -2 || !valid(next)) continue;
        parent[next] = here; queue[tail++] = next;
      }
    }
    if (parent[goal] === -2) return [];
    const raw = [];
    for (let i = goal; i !== -1; i = parent[i]) raw.push(point(i));
    raw.reverse();
    const path = []; let origin = from;
    for (let i = 0; i < raw.length;) {
      let end = i;
      while (end + 1 < raw.length && clear(origin, raw[end + 1])) end++;
      path.push(raw[end]); origin = raw[end]; i = end + 1;
    }
    if (canStand(to.x, to.z) && clear(origin, to)) path.push({ x: to.x, z: to.z });
    return path;
  } };
}
