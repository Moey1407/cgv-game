// North is -Z. Keep metre scale uniform and separate the roof from the ground.
export const sameMapFloor = (y, base) => Math.abs(y - base) < 5;

export function mapWindow(floors, follow, full, aspect = 1) {
  const visible = floors.filter((f) => sameMapFloor(f.pos[1], follow.y));
  if (!full || !visible.length) return { x: follow.x, z: follow.z, width: 14 * aspect, height: 14 };
  const minX = Math.min(...visible.map((f) => f.pos[0] - f.size[0] / 2)) - 2;
  const maxX = Math.max(...visible.map((f) => f.pos[0] + f.size[0] / 2)) + 2;
  const minZ = Math.min(...visible.map((f) => f.pos[2] - f.size[2] / 2)) - 2;
  const maxZ = Math.max(...visible.map((f) => f.pos[2] + f.size[2] / 2)) + 2;
  const height = Math.max(maxZ - minZ, (maxX - minX) / aspect);
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: height * aspect, height };
}

export function mapPoint(pos, view, width, height, inset = 12) {
  const rawX = width / 2 + (pos.x - view.x) * width / view.width;
  const rawY = height / 2 + (pos.z - view.z) * height / view.height;
  const dx = rawX - width / 2, dy = rawY - height / 2;
  const k = Math.min(1, (width / 2 - inset) / Math.max(0.001, Math.abs(dx)), (height / 2 - inset) / Math.max(0.001, Math.abs(dy)));
  return { x: width / 2 + dx * k, y: height / 2 + dy * k, edge: k < 1, angle: Math.atan2(dy, dx) };
}
