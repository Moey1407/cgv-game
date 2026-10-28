// Native scrolling remains available: automatic playback is only a convenience.
export function createCredits({ dialog, doc = document, reducedMotion = () => false } = {}) {
  if (!dialog) return { open() {} };
  const view = dialog.querySelector('.credits-viewport');
  const toggle = dialog.querySelector('[data-credits="toggle"]');
  const speed = dialog.querySelector('[data-credits="speed"]');
  const win = doc.defaultView;
  let running = false, frame = null, last = null, position = 0;
  const stop = () => { if (frame !== null) win.cancelAnimationFrame(frame); frame = null; last = null; };
  function label() {
    toggle.textContent = running ? 'PAUSE SCROLL' : 'PLAY SCROLL';
    toggle.setAttribute('aria-pressed', String(running));
  }
  function tick(now) {
    frame = null;
    if (!dialog.open || !running) return;
    if (view.scrollTop >= view.scrollHeight - view.clientHeight - 1) { play(false); return; }
    // Keep fractional travel ourselves: a rounded scrollTop must not stall at 144 Hz.
    if (last !== null) position += Math.min(0.05, (now - last) / 1000) * 36 * Number(speed.value);
    view.scrollTop = position;
    last = now;
    if (view.scrollTop >= view.scrollHeight - view.clientHeight - 1) { running = false; label(); stop(); return; }
    frame = win.requestAnimationFrame(tick);
  }
  function play(on) {
    running = on; stop(); position = view.scrollTop; label();
    if (on && dialog.open) frame = win.requestAnimationFrame(tick);
  }
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-credits]')?.dataset.credits;
    if (action === 'toggle') play(!running);
    if (action === 'restart') { view.scrollTop = 0; play(true); }
  });
  // Manual browsing must not fight the automatic scroll.
  for (const type of ['wheel', 'touchstart', 'pointerdown']) view.addEventListener(type, () => play(false), { passive: true });
  dialog.addEventListener('keydown', (event) => {
    // Don't let Q/Space or other gameplay shortcuts act behind a modal.
    event.stopPropagation();
    if (event.code === 'Space' && !/^(BUTTON|SELECT|A)$/.test(event.target.tagName)) { event.preventDefault(); play(!running); }
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.code)) play(false);
  });
  dialog.querySelector('#close-credits')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => play(false));
  return {
    open() {
      if (dialog.open) return;
      dialog.showModal(); view.scrollTop = 0;
      play(!reducedMotion() && !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    },
  };
}
