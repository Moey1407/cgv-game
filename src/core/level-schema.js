export const LEVEL_DATA_VERSION = 1;

const point = (value) => value && Number.isFinite(value.x) && Number.isFinite(value.z);

export function validateLevelData(level) {
  const errors = [];
  if (!level || typeof level !== 'object') return ['level must be an object'];
  if (!Number.isInteger(level.id) || level.id < 1) errors.push('id must be a positive integer');
  if (typeof level.name !== 'string' || !level.name.trim()) errors.push('name is required');
  if (!point(level.spawn)) errors.push('spawn requires finite x and z');
  for (const field of ['walls', 'guards', 'lasers', 'cameras', 'pickups', 'checkpoints', 'echoRooms', 'ziplines']) {
    if (level[field] !== undefined && !Array.isArray(level[field])) errors.push(field + ' must be an array');
  }
  for (const camera of Array.isArray(level.cameras) ? level.cameras : []) {
    if (!camera.id || !point(camera) || !Number.isFinite(camera.yaw)) errors.push('each camera requires id, x, z and yaw');
  }
  for (const pickup of Array.isArray(level.pickups) ? level.pickups : []) {
    if (!pickup.id || !pickup.type || !point(pickup)) errors.push('each pickup requires id, type, x and z');
  }
  for (const checkpoint of Array.isArray(level.checkpoints) ? level.checkpoints : []) {
    if (!checkpoint.id || !point(checkpoint)) errors.push('each checkpoint requires id, x and z');
  }
  for (const zipline of Array.isArray(level.ziplines) ? level.ziplines : []) {
    if (!zipline.id || !point(zipline.start) || !point(zipline.end)) errors.push('each zipline requires id, start and end points');
  }
  return errors;
}

export function assertLevelData(level) {
  const errors = validateLevelData(level);
  if (errors.length) throw new Error('Invalid level data: ' + errors.join('; '));
  return level;
}
