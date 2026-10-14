export function createEventBus() {
  const listeners = new Map();

  function on(type, listener) {
    if (typeof listener !== 'function') throw new TypeError('Event listener must be a function');
    const bucket = listeners.get(type) ?? new Set();
    bucket.add(listener);
    listeners.set(type, bucket);
    return () => off(type, listener);
  }

  function once(type, listener) {
    const unsubscribe = on(type, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  function off(type, listener) {
    const bucket = listeners.get(type);
    if (!bucket) return false;
    const removed = bucket.delete(listener);
    if (bucket.size === 0) listeners.delete(type);
    return removed;
  }

  function emit(type, payload = {}) {
    const bucket = listeners.get(type);
    if (!bucket) return 0;
    const snapshot = [...bucket];
    for (const listener of snapshot) listener(payload);
    return snapshot.length;
  }

  function clear(type) {
    if (type === undefined) listeners.clear();
    else listeners.delete(type);
  }

  return { on, once, off, emit, clear };
}
