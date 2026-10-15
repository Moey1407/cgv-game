// src/screens.js: loading, briefing, level cards, pause, options and results.
// Owner: Teammate 3. Reads gameplay only through the event bus; main.js hands
// it a few actions (start, restart, new heist, quality) to call back into.
import * as THREE from 'three';
import { NIGHTS, TRANSITIONS, cinematicFor, endingFor } from './story.js';
import { LEVELS, ALL_LOOT } from '../levels/index.js';

const OPTIONS_KEY = 'signal.options.v1';
export const DEFAULT_OPTIONS = Object.freeze({ sensitivity: 1, master: 0.7, music: 0.6, voice: true, quality: 'auto' });
const ALARM_ORDER = ['quiet', 'suspicious', 'alert', 'lockdown'];
const ALARM_PENALTY = { quiet: 0, suspicious: 5, alert: 12, lockdown: 25 };
const TIPS = [
  'Carpet swallows footsteps. Marble shouts them.',
  'Guards hear the same rings you see.',
  'A looped camera buys you eight seconds.',
  'Wait for Okafor to stop, then copy his badge from behind.',
  'The alarm cools down if you stay out of sight.',
];

// Grade out of 100: stealth 50, greed 30, speed 20. S 90+, A 75+, B 60+, C 40+, else D.
export function gradeRun({ time = 0, par = 300, take = 0, takeTotal = 0, detections = 0, cameras = 0, maxAlarm = 'quiet' } = {}) {
  const stealth = Math.max(0, 50 - detections * 10 - cameras * 5 - (ALARM_PENALTY[maxAlarm] ?? 0));
  const greed = takeTotal > 0 ? Math.round(30 * Math.min(1, take / takeTotal)) : 0;
  const speed = time <= par ? 20 : Math.max(0, Math.round(20 * (1 - (time - par) / par)));
  const score = stealth + greed + speed;
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  return { grade, score, stealth, greed, speed };
}

// Run statistics, collected from events only.
export function createRunTracker({ events, loot = ALL_LOOT } = {}) {
  const takeTotal = loot.filter((i) => i.type !== 'evidence').reduce((sum, i) => sum + (i.value || 0), 0);
  const evidenceTotal = loot.filter((i) => i.type === 'evidence').length;
  let run;
  const collected = new Map();
  const reset = () => { collected.clear(); run = { time: 0, take: 0, evidence: 0, detections: 0, cameras: 0, maxAlarm: 'quiet', running: true }; };
  const recount = () => { run.take = [...collected.values()].reduce((total, item) => total + (item.type === 'evidence' ? 0 : item.value || 0), 0); run.evidence = [...collected.values()].filter((item) => item.type === 'evidence').length; };
  reset();
  const id = (l) => (typeof l === 'string' ? l : l?.id);
  const offs = events ? [
    events.on('checkpoint:save', ({ id: cp } = {}) => { if (cp === 'start') reset(); else if (String(cp).startsWith('level-')) run.running = true; }),
    events.on('checkpoint:restore', ({ payload } = {}) => {
      run.running = true;
      if (payload?.collected) { collected.clear(); for (const id of payload.collected) { const item = loot.find((entry) => entry.id === id); if (item) collected.set(id, item); } recount(); }
    }),
    events.on('item:picked', (item = {}) => { collected.set(item.id, item); recount(); }),
    events.on('player:detected', () => { run.detections += 1; }),
    events.on('camera:detected', () => { run.cameras += 1; }),
    events.on('alarm:level', (p = {}) => {
      const level = id(p.level);
      if (ALARM_ORDER.indexOf(level) > ALARM_ORDER.indexOf(run.maxAlarm)) run.maxAlarm = level;
    }),
    events.on('player:caught', () => { run.running = false; }),
    events.on('level:complete', () => { run.running = false; }),
  ] : [];
  return {
    update(dt) { if (run.running && dt > 0) run.time += dt; },
    snapshot: () => ({ ...run, takeTotal, evidenceTotal }),
    reset,
    dispose: () => offs.forEach((off) => off()),
  };
}

export function loadOptions(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(OPTIONS_KEY) || '{}');
    return { ...DEFAULT_OPTIONS, ...saved };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

function saveOptions(storage, options) {
  try { storage?.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch { /* private mode: keep in memory */ }
}

function safeStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

const clock = (seconds) => {
  const t = Math.floor(seconds);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
};
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');


const CONTROLS = {
  1: [['WASD', 'move'], ['Mouse', 'look'], ['Shift', 'walk quietly'], ['C', 'crouch'], ['Z', 'crawl'], ['X', 'sprint'], ['Click', 'throw a decoy'], ['G', 'sonar pulse'], ['Tab', 'open all camera feeds'], ['1–4', 'select a camera, E loops it'], ['E', 'interact, hold to pickpocket'], ['F', 'dampener'], ['Esc', 'close a camera or the safe'], ['Q', 'pause menu']],
  2: [['WASD', 'move'], ['Z', 'crawl under a beam'], ['Space', 'jump a beam'], ['C', 'crouch, fits the vent'], ['Shift', 'walk quietly'], ['Click', 'throw a decoy'], ['G', 'sonar pulse'], ['E', 'vent, safe, loot'], ['Mouse', 'turn the dial slowly'], ['Tab', 'open all camera feeds'], ['Esc', 'step back from the safe'], ['Q', 'pause menu']],
  3: [['WASD', 'move'], ['R', 'record your Echo, R again to rewind'], ['E', 'hold an override'], ['Click', 'throw a decoy'], ['G', 'sonar, lures the sweep team'], ['Shift', 'walk quietly'], ['C', 'crouch'], ['Z', 'crawl'], ['X', 'sprint'], ['Q', 'pause menu']],
};

export const LEVEL_MECHANICS = Object.freeze({
  1: 'SOCIAL STEALTH · CCTV · PICKPOCKETING',
  2: 'MOVING LASERS · VENTS · SAFECRACKING BY EAR',
  3: 'ECHO CO-OP · LOCKDOWN · ROOFTOP ZIPLINE',
});

export function briefingFor(n) {
  const level = LEVELS[n];
  const night = NIGHTS[n];
  return {
    kicker: 'LEVEL ' + n + ' OF 3 · ' + night.time,
    title: level.name,
    place: night.place,
    lines: night.lines,
    objectives: level.objectives.map((o) => o.text),
    controls: CONTROLS[n],
    mechanic: LEVEL_MECHANICS[n],
  };
}

export function createScreens({ events, audio, actions = {}, doc = document, storage = safeStorage(), qa = false } = {}) {
  const $ = (id) => doc.getElementById(id);
  const el = {
    loading: $('loading'), loadingFill: $('loading-fill'), loadingTip: $('loading-tip'),
    home: $('home'), relock: $('relock'), briefing: $('briefing'), pause: $('pause'), options: $('options'), results: $('results'), card: $('card'), cinematic: $('cinematic'),
    hint: $('hint'), credits: $('credits'), lockNote: doc.querySelectorAll('.lock-note'), fade: $('fade'),
  };
  const tracker = createRunTracker({ events });
  const options = loadOptions(storage);
  const MENUS = ['loading', 'home', 'briefing', 'cinematic', 'results'];
  let state = 'loading';
  let optionsFrom = 'pause';
  let cardLeft = 0;
  let resultsTimer = null;
  let level = 1;
  let started = false;
  let cinematicFrames = [];
  let cinematicIndex = 0;
  let cinematicDone = null;
  let cinematicKey = '';
  let cinematicTimer = null;
  let typeTimer = null;
  let frameStarted = 0;

  el.hint?.classList.add('is-hidden');

  let tip = 0;
  const tipTimer = setInterval(() => {
    tip = (tip + 1) % TIPS.length;
    if (el.loadingTip) el.loadingTip.textContent = TIPS[tip];
  }, 2600);
  if (el.loadingTip) el.loadingTip.textContent = TIPS[0];
  THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
    if (el.loadingFill) el.loadingFill.style.width = Math.round((loaded / Math.max(1, total)) * 100) + '%';
  };

  const make = (tag, props = {}, children = []) => {
    const node = Object.assign(doc.createElement(tag), props);
    node.append(...children);
    return node;
  };

  function fillBriefing(n) {
    const b = briefingFor(n);
    const root = el.briefing;
    if (!root) return;
    root.dataset.level = String(n);
    root.querySelector('.briefing-kicker').textContent = b.kicker;
    root.querySelector('.briefing-title').textContent = b.title;
    root.querySelector('.briefing-place').textContent = b.place;
    const mechanic = root.querySelector('.briefing-mechanic');
    if (mechanic) mechanic.textContent = b.mechanic;
    root.querySelector('.briefing-body').replaceChildren(...b.lines.map((line) => make('p', { textContent: line })));
    root.querySelector('.briefing-objectives').replaceChildren(...b.objectives.map((text) => make('li', { textContent: text })));
    root.querySelector('.controls').replaceChildren(...b.controls.map(([key, text]) => make('li', {}, [make('b', { textContent: key }), ' ' + text])));
    const button = root.querySelector('[data-action="enter"]');
    if (button) button.textContent = n === 1 ? 'ENTER THE GALA' : 'CONTINUE';
    const steps = root.querySelector('.briefing-steps');
    if (steps) steps.replaceChildren(...[1, 2, 3].map((i) => make('i', { className: i < n ? 'done' : i === n ? 'now' : '' })));
  }

  function show(name) {
    for (const key of ['home', 'briefing', 'pause', 'relock', 'options', 'results', 'cinematic']) el[key]?.classList.toggle('is-hidden', key !== name);
    doc.body?.classList.toggle('in-menu', inMenu());
    audio?.duck(name !== null && name !== 'home' && name !== 'briefing');
  }

  const PANEL = { home: 'home', briefing: 'briefing', paused: 'pause', relock: 'relock', options: 'options', cinematic: 'cinematic', results: 'results' };
  function setState(next) {
    state = next;
    show(PANEL[next] ?? null);
    const EventType = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (EventType) doc.dispatchEvent(new EventType('signal:voice-scene', { detail: {
      stop: ['home', 'transition', 'results'].includes(next), paused: ['paused', 'relock', 'options', 'briefing'].includes(next),
    } }));
  }

  function inMenu() {
    return MENUS.includes(state) || (state === 'options' && MENUS.includes(optionsFrom));
  }

  function showCard(n) {
    const t = TRANSITIONS[n];
    if (!t || !el.card) return;
    el.card.querySelector('.card-title').textContent = t.title;
    el.card.querySelector('.card-text').textContent = t.text;
    el.card.classList.remove('is-hidden');
    cardLeft = 3.4;
  }

  function paintCinematic() {
    frameStarted = Date.now();
    const root = el.cinematic;
    const frame = cinematicFrames[cinematicIndex];
    if (!root || !frame) return;
    root.dataset.visual = frame.visual || 'signal';
    root.querySelector('.cinematic-scene').textContent = frame.scene;
    root.querySelector('.cinematic-title').textContent = frame.title;
    root.querySelector('.cinematic-copy').textContent = frame.text;
    const speaker = root.querySelector('.cinematic-speaker');
    const dialogue = root.querySelector('.cinematic-dialogue');
    if (speaker) speaker.textContent = frame.speaker ?? '';
    clearInterval(typeTimer);
    if (dialogue) {
      dialogue.textContent = '';
      const text = frame.dialogue ?? '';
      let index = 0;
      typeTimer = setInterval(() => {
        index += 1;
        dialogue.textContent = text.slice(0, index);
        if (index >= text.length) clearInterval(typeTimer);
      }, 24);
    }
    root.querySelector('.cinematic-count').textContent = `${cinematicIndex + 1} / ${cinematicFrames.length}`;
    root.querySelector('.cinematic-next').textContent = cinematicIndex === cinematicFrames.length - 1 ? 'CONTINUE' : 'NEXT';
    const panel = root.querySelector('.cinematic-panel');
    panel?.classList.remove('is-entering');
    // Re-run the page animation without forcing any asset or scene reload.
    void panel?.offsetWidth;
    panel?.classList.add('is-entering');
    const EventType = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (frame.dialogue && EventType) doc.dispatchEvent(new EventType('signal:cinematic-line', { detail: { who: frame.speaker, text: frame.dialogue, clip: `cinematic-${cinematicKey}-${cinematicIndex + 1}` } }));
    clearTimeout(cinematicTimer);
    if (cinematicKey === 'opening' && !qa) cinematicTimer = setTimeout(nextCinematic, (frame.duration ?? 5) * 1000);
  }

  doc.addEventListener('signal:voice-duration', (event) => {
    if (state !== 'cinematic' || qa || cinematicKey !== 'opening') return;
    if (event.detail?.clip !== `cinematic-${cinematicKey}-${cinematicIndex + 1}`) return;
    clearTimeout(cinematicTimer);
    const duration = Math.max(cinematicFrames[cinematicIndex]?.duration ?? 5, event.detail.duration + 0.35);
    cinematicTimer = setTimeout(nextCinematic, Math.max(0, duration * 1000 - (Date.now() - frameStarted)));
  });

  function finishCinematic() {
    clearTimeout(cinematicTimer);
    clearInterval(typeTimer);
    const EventType = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (EventType) doc.dispatchEvent(new EventType('signal:cinematic-stop'));
    const done = cinematicDone;
    cinematicFrames = [];
    cinematicDone = null;
    done?.();
  }

  function nextCinematic() {
    clearTimeout(cinematicTimer);
    if (cinematicIndex < cinematicFrames.length - 1) {
      cinematicIndex += 1;
      paintCinematic();
    } else finishCinematic();
  }

  function showCinematic(key, done) {
    cinematicFrames = cinematicFor(key, tracker.snapshot().evidence);
    if (!cinematicFrames.length) { done?.(); return; }
    cinematicIndex = 0;
    cinematicKey = key;
    cinematicDone = done;
    setState('cinematic');
    unlock();
    paintCinematic();
  }

  function lock() {
    for (const n of el.lockNote) n.textContent = '';
    try {
      const p = actions.lock?.();
      p?.catch?.(() => { for (const n of el.lockNote) n.textContent = 'The browser needs a moment. Click again.'; });
    } catch { /* older browsers throw instead of rejecting */ }
  }

  function unlock() {
    try { doc.exitPointerLock?.(); } catch { /* not locked */ }
  }

  function fade(on) {
    el.fade?.classList.toggle('is-on', on);
  }

  function applyOptions() {
    audio?.setVolume(options.master);
    audio?.setMusicVolume(options.music);
    saveOptions(storage, options);
    const EventType = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
    if (EventType) doc.dispatchEvent(new EventType('signal:voice', { detail: { enabled: options.voice, volume: options.master } }));
  }

  const form = el.options;
  const field = (name) => form?.querySelector(`[name="${name}"]`);
  function syncForm() {
    for (const name of ['sensitivity', 'master', 'music']) {
      const input = field(name);
      if (!input) continue;
      input.value = options[name];
      const out = form.querySelector(`[data-out="${name}"]`);
      if (out) out.textContent = name === 'sensitivity' ? options[name].toFixed(2) + '×' : Math.round(options[name] * 100) + '%';
    }
    const q = field('quality');
    if (q) q.value = options.quality;
    const voice = field('voice');
    if (voice) voice.checked = options.voice;
  }
  form?.addEventListener('input', (e) => {
    const { name, value } = e.target;
    if (!(name in options)) return;
    options[name] = name === 'quality' ? value : name === 'voice' ? e.target.checked : Number(value);
    if (name === 'quality') actions.quality?.(value);
    applyOptions();
    syncForm();
  });

  function goHome() {
    clearTimeout(resultsTimer);
    actions.newHeist?.();
    level = 1;
    started = false;
    fillBriefing(1);
    setState('home');
    unlock();
  }

  const ACTIONS = {
    play: () => showCinematic('opening', () => { fillBriefing(level); setState('briefing'); }),
    enter: () => lock(),
    start: () => lock(),
    resume: () => lock(),
    restart: () => { actions.restart?.(); lock(); },
    'new-heist': () => goHome(),
    home: () => goHome(),
    options: () => { optionsFrom = state; syncForm(); setState('options'); },
    help: () => {
      fillBriefing(level);
      const reference = el.briefing?.querySelector('.controls-reference');
      if (reference) reference.open = true;
      setState('briefing'); unlock();
    },
    back: () => setState(optionsFrom),
    credits: () => { try { el.credits?.showModal(); } catch { /* dialog already open */ } },
    'cinematic-next': () => nextCinematic(),
    'cinematic-skip': () => finishCinematic(),
    'voice-test': () => {
      const EventType = doc.defaultView?.CustomEvent ?? globalThis.CustomEvent;
      if (EventType) doc.dispatchEvent(new EventType('signal:voice-test', { detail: { who: 'DEX', text: 'Comms check. If you can hear me, the radio is working.' } }));
    },
  };
  doc.addEventListener('click', (e) => {
    const button = e.target.closest?.('[data-action]');
    if (!button) return;
    e.stopPropagation();
    ACTIONS[button.dataset.action]?.();
  });
  doc.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && !e.repeat && (state === 'paused' || state === 'relock')) {
      e.preventDefault();
      if (state === 'relock') setState('paused'); else lock();
      return;
    }
    if (state === 'relock' && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      lock();
      return;
    }
    if (state !== 'cinematic') return;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      e.stopImmediatePropagation();
      nextCinematic();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      finishCinematic();
    }
  }, true);

  function showResults() {
    const run = tracker.snapshot();
    const g = gradeRun({ time: run.time, par: 600, take: run.take, takeTotal: run.takeTotal, detections: run.detections, cameras: run.cameras, maxAlarm: run.maxAlarm });
    const r = el.results;
    if (!r) return;
    r.querySelector('.results-grade').textContent = g.grade;
    r.querySelector('.results-grade').dataset.grade = g.grade;
    r.querySelector('.results-score').textContent = g.score + ' / 100 · stealth ' + g.stealth + ' · take ' + g.greed + ' · speed ' + g.speed;
    const rows = [
      ['Time', clock(run.time)],
      ['Take', money(run.take) + ' of ' + money(run.takeTotal)],
      ['Evidence', run.evidence + ' / ' + run.evidenceTotal],
      ['Spotted by guards', String(run.detections)],
      ['Seen on camera', String(run.cameras)],
      ['Highest alarm', run.maxAlarm.toUpperCase()],
    ];
    r.querySelector('.results-stats').replaceChildren(...rows.flatMap(([k, v]) => [
      make('dt', { textContent: k }),
      make('dd', { textContent: v }),
    ]));
    const ending = r.querySelector('.results-ending');
    const e = endingFor(run.evidence);
    ending.textContent = e.title + '. ' + e.text;
    ending.classList.remove('is-hidden');
    setState('results');
    unlock();
  }

  function advance(next) {
    setState('transition');
    fade(true);
    setTimeout(async () => {
      await actions.loadLevel?.(next);
      level = next;
      started = true;
      fillBriefing(next);
      // Keep the existing mouse lock across a scene cut. If the player has
      // released it, one small arrival prompt supplies the required click.
      setState(doc.pointerLockElement ? 'playing' : 'briefing');
      showCard(next);
      fade(false);
    }, 700);
  }

  events?.on('level:complete', (p = {}) => {
    const done = p.level ?? level;
    clearTimeout(resultsTimer);
    resultsTimer = setTimeout(() => {
      if (qa) return;
      if (done >= 3) showCinematic('ending', () => { showResults(); try { el.credits?.showModal(); } catch { /* already open */ } });
      else advance(done + 1);
    }, done >= 3 ? 2200 : 1200);
  });

  fillBriefing(1);
  applyOptions();

  return {
    get blocking() { return state !== 'playing'; },
    get inMenu() { return inMenu(); },
    get state() { return state; },
    get level() { return level; },
    get options() { return options; },
    tracker,
    ready() {
      clearInterval(tipTimer);
      el.loading?.classList.add('is-hidden');
      if (options.quality !== 'auto') actions.quality?.(options.quality);
      if (qa) { state = 'playing'; show(null); return; }
      setState('home');
    },
    lockChanged(locked, { soft = false } = {}) {
      if (locked && (state === 'briefing' || state === 'paused' || state === 'relock')) {
        setState('playing');
        if (!started) started = true;
      } else if (!locked && state === 'playing') {
        setState(soft ? 'relock' : 'paused');
      }
    },
    pause() { if (state === 'playing' || state === 'relock') setState('paused'); },
    setLevel(n) { level = n; fillBriefing(n); },
    show: (name) => { if (name === 'briefing') fillBriefing(level); setState(name); },
    showResults,
    showCard,
    home: () => goHome(),
    update(dt) {
      tracker.update(dt);
      if (cardLeft > 0) {
        cardLeft -= Math.max(dt, 1 / 60);
        if (cardLeft <= 0) el.card?.classList.add('is-hidden');
      }
    },
  };
}
