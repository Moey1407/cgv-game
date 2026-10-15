export function createPickupSystem(definitions = [], { events } = {}) {
  const items = definitions.map((item) => ({ value: 0, collected: false, ...item }));

  function collect(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item || item.collected) return null;
    item.collected = true;
    events?.emit('item:picked', { ...item });
    return { ...item };
  }

  return {
    items,
    nearby(position, stage, range = 1.6, available = () => true) {
      return items.find((item) => !item.collected && item.stage === stage &&
        Math.hypot(item.x - position.x, item.z - position.z) <= range && available(item));
    },
    collect,
    reset() {
      for (const item of items) item.collected = false;
    },
    snapshot() {
      const collected = items.filter((item) => item.collected);
      return {
        cash: collected.reduce((total, item) => total + item.value, 0),
        evidence: collected.filter((item) => item.type === 'evidence').map((item) => item.id),
        collected: collected.map((item) => item.id)
      };
    }
  };
}
