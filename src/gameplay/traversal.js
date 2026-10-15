export function makeTraversalPath(points) {
  const segments = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const size = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (size > 0) { segments.push({ a, b, start: length, size }); length += size; }
  }
  if (!segments.length) throw new Error('A traversal needs two distinct points');
  return { length, sample(distance) {
    const d = Math.max(0, Math.min(length, distance));
    const segment = segments.find((s) => d <= s.start + s.size) ?? segments.at(-1);
    const t = (d - segment.start) / segment.size;
    return { x: segment.a[0] + (segment.b[0] - segment.a[0]) * t,
      y: segment.a[1] + (segment.b[1] - segment.a[1]) * t,
      z: segment.a[2] + (segment.b[2] - segment.a[2]) * t,
      yaw: Math.atan2(segment.a[0] - segment.b[0], segment.a[2] - segment.b[2]) };
  } };
}
