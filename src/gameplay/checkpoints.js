const defaultClone = (value) => typeof structuredClone === 'function'
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

export function createCheckpointStore({ events, clone = defaultClone } = {}) {
  const checkpoints = new Map();
  let latestId = null;

  return {
    save(id, payload) {
      if (!id) throw new Error('Checkpoint id is required');
      checkpoints.set(id, clone(payload));
      latestId = id;
      events?.emit('checkpoint:save', { id });
      return id;
    },
    restore(id = latestId) {
      if (!id || !checkpoints.has(id)) return null;
      const payload = clone(checkpoints.get(id));
      events?.emit('checkpoint:restore', { id, payload: clone(payload) });
      return payload;
    },
    has(id) {
      return checkpoints.has(id);
    },
    clear() {
      checkpoints.clear();
      latestId = null;
    },
    get latestId() {
      return latestId;
    }
  };
}
