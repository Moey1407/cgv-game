// src/story.js: Dex's radio, guard barks, evidence and the story text. Owner: Teammate 3.
//
// Everything here listens to Teammate 2's event bus and never touches gameplay
// state. main.js needs:
//   import { createStory } from './story.js';
//   const story = createStory({ events });                // right after createEventBus()
//   story.update(state.locked ? dt : 0, player, guards);  // once per frame (radio, music, footsteps)
// When a real level loader exists, call story.setLevel(n) as each level starts.
// Until then the whole build runs as Level 1, with the `any` lines covering the
// Echo, lasers and the safe.
//
// Voice clips: every line has a stable id. Record it as public/audio/voice/<id>.ogg
// and add the id to RECORDED_CLIPS. Lines not in that list play text only, so a
// missing recording never produces a 404 on the server.

import { createAudio } from './audio.js';
import level1 from '../levels/level1.js';
import { surfaceAt } from '../levels/schema.js';

export const DEX = 'DEX';
export const WREN = 'WREN';
export const SYSTEM = 'SYSTEM';
const CUT = { cut: true };

export const RECORDED_CLIPS = [];

export const GUARD_NAMES = { okafor: 'OKAFOR', briggs: 'BRIGGS', sweep: 'SWEEP TEAM', control: 'CONTROL' };

const ALARM_ORDER = ['quiet', 'suspicious', 'alert', 'lockdown'];

// Trigger keys. Most are event names; a few are refined by the director:
//   level:start, alarm:<level>, evidence, loot, safe:tumbler-<n>, door:<id>
// Entry fields: say (lines in order) or variants (one picked in rotation),
// once (default true unless cooldown or repeat is set), cooldown (seconds),
// urgent (jumps the queue).
export const SCRIPT = {
  any: {
    'camera:loop': { say: [[DEX, "That feed's on a loop for eight seconds. Security is watching a very boring rerun."]] },
    'camera:detected': { cooldown: 12, urgent: true, variants: [[DEX, "Camera's got you. Loop it or get out of its view."], [DEX, "You're on camera, Wren. Smile, then move."]] },
    'player:detected': { cooldown: 10, urgent: true, variants: [[DEX, "He's seen you. Break line of sight!"], [DEX, 'Spotted! Get behind something solid.']] },
    'player:caught': { repeat: true, urgent: true, say: [[DEX, 'Wren? Wren. Okay. Back to the checkpoint. Deep breath.']] },
    'checkpoint:restore': { repeat: true, say: [[DEX, 'Again. Slower this time.']] },
    'alarm:suspicious': { cooldown: 25, say: [[DEX, "Easy. Somebody's twitchy. Find a quiet corner and let it settle."]] },
    'alarm:alert': { cooldown: 25, urgent: true, say: [[DEX, "They're actively looking for you now. Get out of sight."]] },
    'alarm:lockdown': { urgent: true, say: [[DEX, "That's lockdown. Well. That's the noisy version of the plan."]] },
    'pickpocket:complete': { say: [[DEX, "Smooth. Two years and you've still got the hands."]] },
    loot: { cooldown: 15, variants: [[DEX, 'Ooh, shiny. Pockets are free real estate.'], [DEX, "Bonus. Just don't get greedy."], [DEX, "I'll pretend I didn't see that. Half is mine."]] },
    evidence: { repeat: true, say: [[WREN, "Why is Dex's name on this?"]] },
    'hazard:trip': { cooldown: 8, variants: [[DEX, 'That beam was not a suggestion.'], [DEX, 'Under, over or wait. Pick one.']] },
    'safe:noise': { cooldown: 12, say: [[DEX, 'Too fast. The clicks are carrying.']] },
    'safe:miss': { cooldown: 8, say: [[DEX, 'Missed it. Slow the dial right down.']] },
    'safe:tumbler-1': { say: [[DEX, 'One down.']] },
    'safe:tumbler-2': { say: [[DEX, 'Two. One more.']] },
    'safe:opened': { say: [[DEX, 'There she is. The Kestrel Star.']] },
    'door:vault-wing': { say: [[DEX, "Vault wing's open. Corridor's next. Mind the lasers."]] },
    'echo:start': { say: [[WREN, 'Recording. Remember this, rig.']] },
    'echo:replay': { say: [[WREN, 'There I am.']] },
    'echo:shattered': { cooldown: 6, say: [[WREN, 'They got my Echo. Again, then.']] },
  },

  // Level 1, The Gala: Dex is warm and funny, and teaches the controls.
  1: {
    'level:start': {
      say: [
        [DEX, 'Evening, Wren. You clean up nicely. Nobody at this party knows your face.'],
        [DEX, "Quick refresher, since it's been two years. Shift walks soft, C crouches, Z puts you on the floor."],
        [DEX, 'Your rig turns sound into rings. Carpet swallows them, marble shouts. Guards hear the same rings you see.'],
        [DEX, 'Tab puts you on the cameras. Find Okafor. The keycard is on his belt.'],
      ],
    },
    'pickpocket:complete': { say: [[DEX, "Smooth. Two years and you've still got the hands. Vault wing is at the back of the hall."]] },
    evidence: { repeat: true, say: [[WREN, 'A security roster. Dex is on it. Why would Dex be on it?'], [DEX, "Wren? You've gone quiet. Keep moving."]] },
    'level:complete': { say: [[DEX, "Lovely work. Get some sleep. The vault won't open itself tomorrow."]] },
  },

  // Level 2, The Vault: Dex is impatient.
  2: {
    'level:start': { say: [[DEX, 'Lasers are on a cycle. Watch, then move.'], [DEX, "And quicker than last night, please. We're on a clock."]] },
    'hazard:trip': { cooldown: 8, variants: [[DEX, 'Are you trying to set them off? Watch the pattern!'], [DEX, "Again? Crawl, jump or wait. It's not complicated."]] },
    'player:detected': { cooldown: 10, urgent: true, variants: [[DEX, 'Briggs has you! Move!'], [DEX, 'Seen. Of course. Hide, then hurry.']] },
    'safe:tumbler-1': { say: [[DEX, 'One. Faster.']] },
    'safe:tumbler-2': { say: [[DEX, 'Two. Come on, come on.']] },
    'safe:miss': { cooldown: 8, say: [[DEX, "You're turning it like a radio dial. Slow. Down."]] },
    'safe:noise': { cooldown: 12, say: [[DEX, "That's loud. Briggs will hear that."]] },
    evidence: { repeat: true, say: [[WREN, "A radio intercept on the guard channel. That's Dex's voice."], [DEX, "Leave the paperwork. We didn't come for paperwork."]] },
    'safe:opened': { say: [[DEX, 'There she is. The Kestrel Star. Hold her up for me. Beautiful.']] },
  },

  // Level 3, The Double-Cross: Dex betrays Wren, comms die, Wren talks to herself.
  3: {
    'level:start': {
      say: [
        [DEX, 'Sorry, Wren. Same as Marlowe.'],
        CUT,
        [WREN, "Fine. I'll be my own crew."],
        [SYSTEM, 'Press Q to record your Echo. Press Q again to rewind and work alongside it.'],
      ],
    },
    'player:detected': { cooldown: 10, urgent: true, variants: [[WREN, 'Seen. Move!'], [WREN, 'Not now. Not now.']] },
    'alarm:alert': { cooldown: 25, say: [[WREN, 'Keep breathing. Find the quiet route.']] },
    'echo:start': { say: [[WREN, "Recording. Show me how it's done."]] },
    'echo:replay': { say: [[WREN, 'There I am. Still better company than Dex.']] },
    'echo:shattered': { cooldown: 6, say: [[WREN, 'They broke my Echo. Again, then.']] },
    evidence: { repeat: true, say: [[WREN, '"Leave the safecracker inside." Got you, Dex.']] },
    'level:complete': { say: [[WREN, 'One stone, one safecracker, no handler. Time to go.']] },
  },
};

// Guard barks by guard state. A guard says one at most every five seconds.
export const BARKS = {
  investigate: ['Did you hear that?', 'Hello? Someone there?', 'Hang on. What was that?'],
  pursue: ['There! Stop right there!', 'Got movement! On me!', 'Hey! You!'],
  search: ["I know you're in here.", 'Come on out. Nobody needs to get hurt.', "Where'd you go?"],
  patrol: ['Must have been the pipes.', 'Probably nothing. Back to it.', 'Jumpy tonight.'],
  caught: ['Got you.', 'Hands where I can see them.'],
  camera: ['Control to floor. Movement on camera.', 'Control. Somebody on the feed. Check it.'],
  echo: ['What... was that a ghost?', 'It just came apart in my hands.'],
};

export const EVIDENCE = {
  1: { title: 'Security roster', body: 'Tonight\'s gala security roster, signed off at the bottom: "Consultant: D." Dex never mentioned working for the museum.' },
  2: { title: 'Radio intercept', body: 'Guard channel, 00:12: "Wren comes up through the vault. Seal the wing the moment the safe opens." The voice is Dex.' },
  3: { title: "Security chief's desk", body: 'A payment slip to D. for half the Kestrel Star\'s insurance value. Clipped to it: "Same as Marlowe. Leave the safecracker inside."' },
};

export const BRIEFING = {
  title: 'The Kestrel Star',
  lines: [
    'Two years ago the Marlowe job went wrong. The crew drove off with Wren still in the vault.',
    'Tonight Dex calls with one job: lift the Kestrel Star from the Varga Museum during its closing-night gala.',
    'The payout clears everything. Dex swears it will be different this time.',
  ],
};

export const TRANSITIONS = {
  1: { title: 'Level 1 · The Gala', text: 'Closing night at the Varga Museum. Get in, lift a keycard, reach the vault wing.' },
  2: { title: 'Level 2 · The Vault', text: 'The next night. Under the lasers, into the vault, and crack the safe by ear.' },
  3: { title: 'Level 3 · The Double-Cross', text: 'The safe is open. The wing is sealing. The only crew left is you.' },
};

export const ENDINGS = {
  exposed: { title: 'Signal received', text: 'Wren sends all three files to the police from the roof. When Dex pulls up in the getaway van, the sirens are already waiting.' },
  alone: { title: 'Gone', text: 'Wren ziplines into the rain with the Kestrel Star. Dex is never heard from again, and neither is the truth about Marlowe.' },
};

export const endingFor = (evidenceFound) => (evidenceFound >= 3 ? ENDINGS.exposed : ENDINGS.alone);

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Every spoken line with its clip id, for the recording session and for tests.
export function voiceLines(script = SCRIPT) {
  const out = [];
  for (const [level, entries] of Object.entries(script)) {
    for (const [key, entry] of Object.entries(entries)) {
      const lines = entry.say ?? entry.variants ?? [];
      lines.forEach((line, i) => {
        if (!Array.isArray(line)) return;
        out.push({ id: slug(`${line[0]}-${level}-${key}-${i + 1}`), who: line[0], text: line[1], level, key });
      });
    }
  }
  return out;
}

const CLIP_IDS = new Map(voiceLines().map((v) => [`${v.level}|${v.key}|${v.text}`, v.id]));
const readTime = (text) => Math.min(7, Math.max(2.4, 1.6 + text.split(/\s+/).length * 0.3));

const EVENT_TYPES = [
  'checkpoint:save', 'checkpoint:restore', 'alarm:level', 'item:picked', 'safe:tumbler-set', 'door:opened',
  'guard:state', 'player:caught', 'camera:detected', 'echo:shattered', 'camera:loop', 'player:detected',
  'pickpocket:complete', 'hazard:trip', 'safe:noise', 'safe:miss', 'safe:opened', 'echo:start', 'echo:replay',
  'level:complete',
];

// The logic, with no DOM: lines come out through the callbacks.
export function createStoryDirector({ events, script = SCRIPT, barks = BARKS, onRadio = () => {}, onBark = () => {}, onEvidence = () => {}, onCut = () => {}, onLine = () => {}, onBarkSound = () => {} } = {}) {
  let level = 1;
  let cut = false;
  let clock = 0;
  let queue = [];
  let current = null;
  let bark = null;
  let card = null;
  const played = new Set();
  const lastFired = new Map();
  const lastBark = new Map();
  const rotation = new Map();

  const rotate = (key, list) => {
    const i = rotation.get(key) ?? 0;
    rotation.set(key, i + 1);
    return list[i % list.length];
  };

  function resolve(key) {
    const own = script[level]?.[key];
    if (own) return { entry: own, from: level };
    const any = script.any?.[key];
    return any ? { entry: any, from: 'any' } : null;
  }

  function trigger(key, suffix = '') {
    const found = resolve(key);
    if (!found) return false;
    const { entry, from } = found;
    const once = entry.once ?? !(entry.cooldown || entry.repeat);
    const onceKey = `${level}|${key}${suffix}`;
    if (once && played.has(onceKey)) return false;
    if (entry.cooldown && clock - (lastFired.get(key) ?? -Infinity) < entry.cooldown) return false;
    const lines = (entry.say ?? [rotate(`${level}|${key}`, entry.variants)])
      .filter((l) => l.cut || !(cut && l[0] === DEX));
    if (!lines.length) return false;
    played.add(onceKey);
    lastFired.set(key, clock);
    const items = lines.map((l) => (l.cut ? { cut: true } : {
      who: l[0], text: l[1], clip: CLIP_IDS.get(`${from}|${key}|${l[1]}`), duration: readTime(l[1]),
    }));
    if (entry.urgent) {
      if (current && !current.urgent) current.left = 0;
      queue = [...items.map((i) => ({ ...i, urgent: true })), ...queue];
    } else {
      queue.push(...items);
    }
    if (queue.length > 8) queue = queue.slice(0, 8);
    return true;
  }

  function sayBark(guardId, state) {
    const lines = barks[state];
    if (!lines) return false;
    const key = String(guardId);
    if (clock - (lastBark.get(key) ?? -Infinity) < 5) return false;
    lastBark.set(key, clock);
    bark = { who: GUARD_NAMES[key] ?? key.toUpperCase(), text: rotate(`bark|${state}`, lines), left: 2.6 };
    onBark(bark);
    onBarkSound(bark);
    return true;
  }

  function showEvidence(item) {
    const index = item.evidenceIndex ?? (Number(String(item.id).match(/(\d+)$/)?.[1]) || level);
    const text = EVIDENCE[index] ?? { title: item.label ?? 'Evidence', body: '' };
    card = { index, total: 3, ...text, left: 7 };
    onEvidence(card);
  }

  function clearRadio() {
    queue = [];
    current = null;
    onRadio(null);
  }

  function reset() {
    played.clear();
    lastFired.clear();
    lastBark.clear();
    cut = false;
    level = 1;
    clearRadio();
    bark = null;
    card = null;
    onBark(null);
    onEvidence(null);
  }

  const levelId = (l) => (typeof l === 'string' ? l : l?.id);
  const handlers = {
    'checkpoint:save': ({ id } = {}) => { if (id === 'start') { reset(); trigger('level:start'); } },
    'checkpoint:restore': () => { clearRadio(); trigger('checkpoint:restore'); },
    'alarm:level': (p = {}) => {
      const now = levelId(p.level);
      if (ALARM_ORDER.indexOf(now) > ALARM_ORDER.indexOf(levelId(p.previous))) trigger('alarm:' + now);
    },
    'item:picked': (item = {}) => {
      if (item.type === 'evidence') { showEvidence(item); trigger('evidence', ':' + item.id); } else trigger('loot');
    },
    'safe:tumbler-set': (p = {}) => { if (!p.opened) trigger('safe:tumbler-' + (p.tumbler + 1)); },
    'door:opened': (p = {}) => trigger('door:' + p.id),
    'guard:state': (p = {}) => {
      if (p.state === 'patrol' && !['search', 'investigate'].includes(p.previous)) return;
      sayBark(p.id, p.state);
    },
    'player:caught': (p = {}) => { sayBark(p.id ?? 'guard', 'caught'); trigger('player:caught'); },
    'camera:detected': () => { sayBark('control', 'camera'); trigger('camera:detected'); },
    'echo:shattered': () => { sayBark('guard', 'echo'); trigger('echo:shattered'); },
  };
  for (const type of EVENT_TYPES) if (!handlers[type]) handlers[type] = () => trigger(type);
  const unsubscribe = events ? EVENT_TYPES.map((type) => events.on(type, handlers[type])) : [];

  function update(dt) {
    if (!(dt > 0)) return;
    clock += dt;
    if (current) {
      current.left -= dt;
      if (current.left <= 0) { current = null; onRadio(null); }
    }
    while (!current && queue.length) {
      const next = queue.shift();
      if (next.cut) {
        cut = true;
        onCut();
        current = { who: SYSTEM, text: 'SIGNAL LOST', kind: 'cut', left: 1.6 };
        onRadio(current);
        break;
      }
      if (cut && next.who === DEX) continue;
      current = { ...next, left: next.duration };
      onRadio(current);
      onLine(current);
    }
    if (bark) {
      bark.left -= dt;
      if (bark.left <= 0) { bark = null; onBark(null); }
    }
    if (card) {
      card.left -= dt;
      if (card.left <= 0) { card = null; onEvidence(null); }
    }
  }

  function setLevel(n) {
    if (n === level && played.has(`${n}|level:start`)) return;
    level = n;
    clearRadio();
    trigger('level:start');
  }

  return {
    update,
    setLevel,
    reset,
    trigger,
    bark: sayBark,
    dispose: () => unsubscribe.forEach((off) => off()),
    snapshot: () => ({ level, cut, current: current && { who: current.who, text: current.text }, queue: queue.map((q) => (q.cut ? 'CUT' : q.text)), bark: bark && { who: bark.who, text: bark.text }, card: card && card.title }),
  };
}

// DOM view. Uses the #radio, #bark and #evidence-card elements in index.html.
function createRadioView(doc) {
  const $ = (id) => doc.getElementById(id);
  const radio = $('radio');
  const bark = $('bark');
  const card = $('evidence-card');
  const set = (el, sel, text) => { const n = el?.querySelector(sel); if (n) n.textContent = text; };
  return {
    radio(line) {
      if (!radio) return;
      radio.classList.toggle('is-hidden', !line);
      if (!line) return;
      radio.dataset.who = line.kind === 'cut' ? 'cut' : line.who.toLowerCase();
      set(radio, '.radio-who', line.kind === 'cut' ? 'COMMS' : line.who === DEX ? 'DEX · RADIO' : line.who);
      set(radio, '.radio-text', line.text);
    },
    bark(line) {
      if (!bark) return;
      bark.classList.toggle('is-hidden', !line);
      if (!line) return;
      set(bark, '.bark-who', line.who);
      set(bark, '.bark-text', line.text);
    },
    evidence(c) {
      if (!card) return;
      card.classList.toggle('is-hidden', !c);
      if (!c) return;
      set(card, '.evidence-kicker', `EVIDENCE ${c.index} / ${c.total}`);
      set(card, '.evidence-title', c.title);
      set(card, '.evidence-body', c.body);
    },
  };
}

export function createStory({ events, doc = document, level = level1, audio = createAudio({ surfaceAt: (x, z) => surfaceAt(level, x, z) }) } = {}) {
  const view = createRadioView(doc);
  const recorded = new Set(RECORDED_CLIPS);
  const director = createStoryDirector({
    events,
    onRadio: view.radio,
    onBark: view.bark,
    onEvidence: view.evidence,
    onCut: () => audio.cut(),
    onBarkSound: () => audio.bark(),
    onLine: (line) => {
      audio.squelch();
      if (line.clip && recorded.has(line.clip)) {
        const clip = new Audio('./audio/voice/' + line.clip + '.ogg');
        clip.volume = audio.volume;
        clip.play().catch(() => {});
      }
    },
  });
  audio.bind(events);
  // Browsers only allow sound after a user gesture; the first click is it.
  doc.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  return {
    ...director,
    audio,
    // Radio timers, music and footsteps. Pass dt = 0 while paused.
    update(dt, player, guards) {
      director.update(dt);
      audio.update(dt, player, guards);
    },
  };
}
