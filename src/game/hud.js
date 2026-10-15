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
    decoy: $('item-decoy'),
    doses: $('item-doses'),
    echo: $('echo-state'),
    echoStep: $('echo-step'),
    echoTime: $('echo-time'),
    echoAction: $('echo-action'),
    echoHelp: $('echo-help'),
    echoFill: $('echo-fill'),
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
  function items({ keycard, star, cash, evidence, evidenceTotal }) {
    text(el.keycard, 'keycard', keycard ? 'BADGE COPIED' : 'BADGE —');
    el.keycard.classList.toggle('have', keycard);
    text(el.take, 'take', star ? 'KESTREL STAR ✓' : 'KESTREL STAR —');
    text(el.evidence, 'evidence', 'EVIDENCE ' + evidence + '/' + evidenceTotal);
  }
  function doses(count, enabled = true) {
    if (!el.doses) return;
    el.doses.classList.toggle('is-hidden', !enabled);
    text(el.doses, 'doses', count > 0 ? 'SEDATIVE ×' + count : 'SEDATIVE EMPTY');
  }
  function decoy(charges, recharge = 0) {
    text(el.decoy, 'decoy', charges > 0 ? 'DECOY ×' + charges + (charges < 3 ? ' · ' + recharge.toFixed(1) + 's' : '') : 'DECOY EMPTY · ' + recharge.toFixed(1) + 's');
  }
  function echo(state) {
    const enabled = Boolean(state?.enabled);
    el.echo.classList.toggle('is-hidden', !enabled);
    if (!enabled) return;
    const mode = state.mode ?? 'idle';
    el.echo.classList.toggle('recording', mode === 'recording');
    el.echo.classList.toggle('replaying', mode === 'replaying');
    let step = 'ECHO · READY';
    let time = '20.0s MAX';
    let action = 'R · START RECORDING';
    let help = 'Record a path to the first task, then press R again to rewind and replay it.';
    let progress = 0;
    if (mode === 'recording') {
      step = 'STEP 1 · RECORDING PATH';
      time = state.elapsed.toFixed(1) + ' / 20.0s';
      action = 'R · FINISH & REWIND';
      help = 'Finish at the override or plate. You will return to your starting point.';
      progress = state.elapsed / 20;
    } else if (mode === 'replaying') {
      step = 'STEP 2 · ECHO REPLAYING';
      time = state.playbackTime.toFixed(1) + ' / ' + state.duration.toFixed(1) + 's';
      action = 'MOVE INDEPENDENTLY';
      help = 'Your Echo repeats the recorded path while you take the other route.';
      progress = state.duration ? state.playbackTime / state.duration : 0;
    } else if (mode === 'shattered') {
      step = 'ECHO · DISRUPTED';
      time = 'GUARD CONTACT';
      action = 'R · RECORD AGAIN';
      help = 'Use a shorter route or keep the replay away from the sweep team.';
    } else if (mode === 'complete') {
      step = 'ECHO · PATH COMPLETE';
      time = state.duration.toFixed(1) + 's';
      action = 'R · RECORD AGAIN';
      help = 'The replay finished. Record another route if the mechanism is still locked.';
      progress = 1;
    }
    text(el.echoStep, 'echoStep', step);
    text(el.echoTime, 'echoTime', time);
    text(el.echoAction, 'echoAction', action);
    text(el.echoHelp, 'echoHelp', help);
    el.echoFill.style.width = Math.round(Math.max(0, Math.min(1, progress)) * 100) + '%';
  }
  function objective(value) { text(el.objective, 'objective', value); }
  function hint(value) {
    const node = $('control-hint');
    if (!node) return;
    node.classList.toggle('is-hidden', !value);
    if (value) text(node, 'controlHint', value);
  }

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
    el.endTitle.textContent = won ? 'The Kestrel Star is yours.' : 'Security has you.';
    el.endCopy.textContent = won ? 'Now get out before Dex makes his move.' : 'Back to the last checkpoint. Press R.';
    el.endStats.textContent = stats;
  }

  function update(dt) {
    if (toastTimer <= 0) return;
    toastTimer -= dt;
    if (toastTimer <= 0) el.toast.classList.add('is-hidden');
  }

  return { alarm, guard, movement, items, decoy, doses, echo, objective, hint, prompt, toast, safe, end, update,
    clearTransient() { toastTimer = 0; el.toast.classList.add('is-hidden'); prompt(null); } };
}
