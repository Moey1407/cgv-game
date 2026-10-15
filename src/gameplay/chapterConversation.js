export function createChapterConversation(frames = []) {
  let index = 0, shown = 0, finished = false;
  const frame = () => frames[index] ?? { dialogue: '' };
  return {
    get frame() { return frame(); }, get index() { return index; }, get count() { return frames.length; },
    get text() { return (frame().dialogue ?? '').slice(0, Math.ceil(shown)); },
    tick(dt) { shown = Math.min((frame().dialogue ?? '').length, shown + Math.max(0, dt) * 55); },
    next() {
      if (finished) return 'waiting';
      const length = (frame().dialogue ?? '').length;
      if (shown < length) { shown = length; return 'reveal'; }
      if (index < frames.length - 1) { index++; shown = 0; return 'line'; }
      finished = true; return 'complete';
    },
  };
}
