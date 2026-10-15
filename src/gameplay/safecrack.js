const circularDistance = (a, b) => {
  const delta = Math.abs(a - b) % 100;
  return Math.min(delta, 100 - delta);
};

export function createSafecrackSystem({ combination = [18, 63, 41], windows = [5, 3, 1.8], events } = {}) {
  let dial = 0;
  let tumbler = 0;
  let opened = false;
  let nearClick = false;

  const api = {
    turn(delta, dt = 1 / 60) {
      if (opened) return api.snapshot();
      dial = (dial + delta + 1000) % 100;
      const speed = Math.abs(delta) / Math.max(dt, 1 / 240);
      const noise = Math.min(1, speed / 120);
      const near = circularDistance(dial, combination[tumbler]) < windows[tumbler];
      if (near && !nearClick) events?.emit('safe:contact', { tumbler, dial });
      nearClick = near;
      if (noise > 0.35) events?.emit('safe:noise', { noise, dial, tumbler });
      return { ...api.snapshot(), noise };
    },
    setTumbler() {
      if (opened) return { success: false, opened: true };
      const distance = circularDistance(dial, combination[tumbler]);
      if (distance > windows[tumbler]) {
        events?.emit('safe:miss', { dial, tumbler, distance });
        return { success: false, opened: false, distance };
      }
      const set = tumbler;
      tumbler += 1;
      nearClick = false;
      opened = tumbler === combination.length;
      events?.emit('safe:tumbler-set', { tumbler: set, dial, opened });
      if (opened) events?.emit('safe:opened', { combination: [...combination] });
      return { success: true, opened, tumbler: set };
    },
    feedback() {
      if (opened) return { distance: 0, strength: 1 };
      const distance = circularDistance(dial, combination[tumbler]);
      return { distance, strength: Math.max(0, 1 - distance / 18) };
    },
    reset() {
      dial = 0;
      tumbler = 0;
      opened = false;
      nearClick = false;
    },
    snapshot() {
      return { dial, tumbler, total: combination.length, opened };
    }
  };

  return api;
}
