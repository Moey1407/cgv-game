// Segment vs stage-filtered collision bounds. Interaction access is checked in
// XZ because the current museum walls span the player's interaction height.
export function hasClearAccess(from, target, colliders, stage, range = 2.25) {
  if (Math.hypot(target.x - from.x, target.z - from.z) >= range) return false;
  return !colliders.some((box) => {
    if (box.disabled) return false;
    if (box.stage && box.stage !== stage) return false;
    let near = 0;
    let far = 1;
    for (const axis of ['x', 'z']) {
      const delta = target[axis] - from[axis];
      const min = box[axis === 'x' ? 'minX' : 'minZ'];
      const max = box[axis === 'x' ? 'maxX' : 'maxZ'];
      if (Math.abs(delta) < 1e-8) {
        if (from[axis] < min || from[axis] > max) return false;
      } else {
        const a = (min - from[axis]) / delta;
        const b = (max - from[axis]) / delta;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return false;
      }
    }
    return near <= far;
  });
}
