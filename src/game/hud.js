const ALARM_CLASSES = ['quiet', 'suspicious', 'alert', 'lockdown'];

export function createHud(doc = document) {
  const $ = (id) => doc.getElementById(id);
  const el = {
    alarmLabel: $('alarm-label'),
    alarmFill: $('alarm-fill'),
    alarm: $('alarm'),
    guard: $('guard-state'),
    movement: $('movement'),
    stamina: $('stamina-fill'),
    keycard: $('item-keycard'),
    take: $('item-take'),
    evidence: $('item-evidence'),
    echo: $('echo-state'),
    prompt: $('prompt'),
    promptText: $('prompt-text'),
    promptFill: $('prompt-fill'),
    toast: $('toast'),
    safe: $('safe'),
    safeNumber: $('safe-number'),
    safeDial: $('safe-dial'),
    safeTumbler: $('safe-tumbler'),
    safeSignal: $('safe-signal'),
    end: $('end'),
    endKicker: $('end-kicker'),
    endTitle: $('end-title'),
    endCopy: $('end-copy'),
    endStats: $('end-stats'),
    objective: $('objective')
  };
  let toastTimer = 0;
  const cache = {};

  function text(node, key, value) {
    if (cache[key] === value) return;
    cache[key] = value;
    node.textContent = value;
  }

  function alarm(snapshot) {
    text(el.alarmLabel, 'alarm', snapshot.level.label);
    el.alarmFill.style.width = Math.round(snapshot.value) + '%';
    const cls = snapshot.level.id;
    if (cache.alarmClass !== cls) {
      for (const c of ALARM_CLASSES) el.alarm.classList.toggle(c, c === cls);
      cache.alarmClass = cls;
    }
  }

  function guard(value) { text(el.guard, 'guard', value); }
  function movement(label, ratio) {
    text(el.movement, 'movement', label);
    el.stamina.style.width = Math.round(ratio * 100) + '%';
  }
  function items({ keycard, cash, evidence, evidenceTotal }) {
    text(el.keycard, 'keycard', keycard ? 'KEYCARD ✓' : 'KEYCARD —');
    el.keycard.classList.toggle('have', keycard);
    text(el.take, 'take', 'TAKE $' + cash.toLocaleString('en-US'));
    text(el.evidence, 'evidence', 'EVIDENCE ' + evidence + '/' + evidenceTotal);
  }
  function echo(value) { text(el.echo, 'echo', value); }
  function objective(value) { text(el.objective, 'objective', value); }

  function prompt(value, progress = null) {
    el.prompt.classList.toggle('is-hidden', !value);
    if (!value) return;
    text(el.promptText, 'prompt', value);
    el.promptFill.parentElement.classList.toggle('is-hidden', progress === null);
    if (progress !== null) el.promptFill.style.width = Math.round(progress * 100) + '%';
  }

  function toast(message, seconds = 2.6) {
    el.toast.textContent = message;
    el.toast.classList.remove('is-hidden');
    toastTimer = seconds;
  }

  function safe(open, state) {
    el.safe.classList.toggle('is-hidden', !open);
    if (!open) return;
    const n = Math.round(state.dial) % 100;
    text(el.safeNumber, 'safeNumber', String(n).padStart(2, '0'));
    el.safeDial.style.transform = 'rotate(' + (-state.dial * 3.6) + 'deg)';
    text(el.safeTumbler, 'safeTumbler', 'TUMBLER ' + Math.min(state.tumbler + 1, state.total) + ' / ' + state.total);
    el.safeSignal.style.width = Math.round(state.strength * 100) + '%';
  }

  function end(kind, stats) {
    el.end.classList.toggle('is-hidden', !kind);
    if (!kind) return;
    const won = kind === 'won';
    el.end.classList.toggle('won', won);
    el.endKicker.textContent = won ? 'VAULT OPEN' : 'CAUGHT';
    el.endTitle.textContent = won ? 'The Kestrel Star is yours.' : 'Okafor has you.';
    el.endCopy.textContent = won ? 'Now get out before Dex makes his move.' : 'Back to the last checkpoint. Press R.';
    el.endStats.textContent = stats;
  }

  function update(dt) {
    if (toastTimer <= 0) return;
    toastTimer -= dt;
    if (toastTimer <= 0) el.toast.classList.add('is-hidden');
  }

  return { alarm, guard, movement, items, echo, objective, prompt, toast, safe, end, update };
}
