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
// Voice clips: every line has a stable id. Pre-rendered MP3s live at
// public/audio/voice/<id>.mp3 and are listed in voiceManifest.js. Missing
// clips stay as captions, so they never produce a 404 in the browser.

import { createAudio } from './audio.js';
import { RECORDED_CLIPS, RECORDED_TEXT } from './voiceManifest.js';
import level1 from '../levels/level1.js';
import { surfaceAt } from '../levels/schema.js';
import { barkClipId } from './voiceIds.js';

export const DEX = 'DEX';
export const WREN = 'WREN';
export const SYSTEM = 'SYSTEM';
const CUT = { cut: true };

export { RECORDED_CLIPS };
export function recordedLineAvailable(line) {
  return Boolean(line?.clip && RECORDED_CLIPS.includes(line.clip) && RECORDED_TEXT[line.clip] === line.text);
}

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
    evidence: { repeat: true, say: [[WREN, "Why is Dex's name on this?"]] },
    'hazard:trip': { cooldown: 8, variants: [[DEX, 'That beam was not a suggestion.'], [DEX, 'Under, over or wait. Pick one.']] },
    'safe:noise': { cooldown: 12, say: [[DEX, 'Too fast. The clicks are carrying.']] },
    'safe:miss': { cooldown: 8, say: [[DEX, 'Missed it. Slow the dial right down.']] },
    'safe:tumbler-1': { say: [[DEX, 'One down.']] },
    'safe:tumbler-2': { say: [[DEX, 'Two. One more.']] },
    'safe:opened': { say: [[DEX, 'There she is. The Kestrel Star.']] },
    'door:vault-wing': { say: [[DEX, 'Night entry authorised. Walk out through the lobby. We come back when the Star is in the safe.']] },
    'echo:start': { say: [[WREN, 'Recording. Remember this, rig.']] },
    'echo:replay': { say: [[WREN, 'There I am.']] },
    'echo:shattered': { cooldown: 6, say: [[WREN, 'They got my Echo. Again, then.']] },
  },

  // Level 1, The Gala: Dex is warm and funny, and teaches the controls.
  1: {
    'level:start': {
      say: [
        [DEX, 'Your name is on the guest list. Okafor sees a donor. Stay upright and keep the rig out of sight.'],
        [DEX, 'Loop the hall camera. Okafor stops along the west wall. Copy his badge from behind; leave the original on him.'],
        [DEX, 'Use the copy at the rear staff reader to book our night entry. Then leave through the lobby.'],
        [WREN, 'And I choose the way out this time. There is a line waiting on the roof.'],
      ],
    },
    'pickpocket:complete': { say: [[DEX, 'Smooth. Original stays on his belt. Get the copy authorised at the rear staff reader.']] },
    evidence: { repeat: true, say: [[WREN, 'A security roster. Dex is on it. Why would Dex be on it?'], [DEX, "Wren? You've gone quiet. Keep moving."]] },
  },

  // Level 2, The Vault: Dex is impatient.
  2: {
    'level:start': { say: [[DEX, 'One-thirty. Same night. The badge got you inside; your donor cover is finished.'], [DEX, 'Cross the security corridor. Isolate the safe’s tamper circuit at the west service panel before touching the dial.']] },
    'door:tamper-circuit': { say: [[DEX, 'Tamper circuit isolated. Now the dial. Briggs is still making rounds.']] },
    'hazard:trip': { cooldown: 8, variants: [[DEX, 'Are you trying to set them off? Watch the pattern!'], [DEX, "Again? Crawl, jump or wait. It's not complicated."]] },
    'player:detected': { cooldown: 10, urgent: true, variants: [[DEX, 'Briggs has you! Move!'], [DEX, 'Seen. Of course. Hide, then hurry.']] },
    'safe:tumbler-1': { say: [[DEX, 'One. Faster.']] },
    'safe:tumbler-2': { say: [[DEX, 'Two. Come on, come on.']] },
    'safe:miss': { cooldown: 8, say: [[DEX, "You're turning it like a radio dial. Slow. Down."]] },
    'safe:noise': { cooldown: 12, say: [[DEX, "That's loud. Briggs will hear that."]] },
    evidence: { repeat: true, say: [[WREN, "A radio intercept on the guard channel. That's Dex's voice."], [DEX, "Leave the paperwork. We didn't come for paperwork."]] },
    'safe:opened': { say: [[DEX, 'Open. Take the Star, then get back to the service fire door.']] },
    'diamond:taken': { urgent: true, say: [[WREN, 'I have it. Service door, then the roof.'], [DEX, 'Right. The service door. Keep moving.']] },
  },

  // Level 3, The Double-Cross: Dex betrays Wren, comms die, Wren talks to herself.
  3: {
    'level:start': {
      say: [
        [DEX, 'Insurance pays better with a culprit. Sorry, Wren. Same as Marlowe.'],
        CUT,
        [WREN, 'Two-person interlock. My rig can replay the second operator’s signal. I can still reach my roof line.'],
        [SYSTEM, 'R records your movement and E input. R again rewinds you; the Echo repeats the recording.'],
      ],
    },
    'player:detected': { cooldown: 10, urgent: true, variants: [[WREN, 'Seen. Move!'], [WREN, 'Not now. Not now.']] },
    'alarm:alert': { cooldown: 25, say: [[WREN, 'Keep breathing. Find the quiet route.']] },
    'echo:start': { say: [[WREN, "Recording. Show me how it's done."]] },
    'echo:replay': { say: [[WREN, 'There I am. Still better company than Dex.']] },
    'echo:shattered': { cooldown: 6, say: [[WREN, 'They broke my Echo. Again, then.']] },
    evidence: { repeat: true, say: [[WREN, '"Leave the safecracker inside." Got you, Dex.']] },
    'level:complete': { say: [[WREN, 'One stone, one safecracker, no handler. Time to go.']] },
    'evidence:uploaded': { urgent: true, say: [[WREN, 'Three files. Names, orders, payment. Sending it all. Your turn to wait for the police, Dex.']] },
  },
};

// Guard barks by guard state. A guard says one at most every five seconds.
export const BARKS = {
  warning: ['Can I help you?', 'Give me a little space, please.'],
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
    'Dex puts Wren on the gala guest list. She must copy staff access tonight, then return after the Star is locked away.',
    'The payout clears everything. Dex swears it will be different this time.',
  ],
};

export const NIGHTS = {
  1: { time: '19:40', place: 'Closing-night gala', lines: ['The Star is surrounded by guests. Copy staff access, authorise a night visit, then leave normally.'] },
  2: {
    time: '01:30',
    place: 'Same night, after closing',
    lines: ['The copied badge opens the staff entrance. Isolate the tamper circuit, crack the safe, take the Star and reach the service exit.'],
  },
  3: {
    time: '01:58',
    place: 'Same night, minutes later',
    lines: ['Dex has cut the radio and sealed the wing. Use your Echo to reach the roof and take the zipline out.'],
  },
};

export const TRANSITIONS = {
  1: { title: 'Varga Museum · 19:40', text: 'A name on the guest list. A way back in.' },
  2: { title: 'Staff entrance · 01:30', text: 'The same night. The Star is now in the safe.' },
  3: { title: 'Service wing · 01:58', text: 'Dex has sealed the way back. Reach your roof line.' },
};

// Lightweight illustrated story pages. These use only HTML/CSS so they add no
// texture downloads and still work on the lab machines if voice files are absent.
export const CINEMATICS = Object.freeze({
  opening: [
    {
      scene: 'MARLOWE JOB · TWO YEARS EARLIER · 02:13',
      title: 'Thirty seconds to the van.',
      text: 'Alarms tear through the corridor. Wren runs for the service door as steel shutters begin to fall.',
      speaker: WREN,
      dialogue: 'Dex, open the service door. I have the drive.',
      visual: 'vault',
      duration: 4.8,
    },
    {
      scene: 'MARLOWE JOB · 02:14',
      title: 'The tail-lights disappear.',
      text: 'The crew escapes. The vault door seals with Wren on the wrong side.',
      speaker: DEX,
      dialogue: "I'm sorry, Wren. I can't lose the whole crew.",
      visual: 'police',
      duration: 4.6,
    },
    {
      scene: 'TWO YEARS LATER · AN UNKNOWN NUMBER',
      title: 'One last job.',
      text: 'Dex has hacked the gala guest list. First copy the night-entry credentials. The Star goes into the safe after closing.',
      speaker: DEX,
      dialogue: 'You want out? One job. Your name is on the gala list. We go back after closing.',
      visual: 'signal',
      duration: 5.1,
    },
    {
      scene: 'VARGA MUSEUM · CLOSING-NIGHT GALA · 19:40',
      title: 'Walk in like you belong.',
      text: 'Okafor has never met Wren. Her disguise works until her behaviour gives security a reason to look twice.',
      speaker: DEX,
      dialogue: 'You are a donor tonight. Copy the badge. Authorise the night entry. Then walk out.',
      visual: 'diamond',
      duration: 5.2,
    },
  ],
  after1: [
    {
      scene: 'VARGA MUSEUM · 20:16',
      title: 'The first lock opens.',
      text: 'Wren leaves through the lobby. At 01:30 the authorised staff entrance opens again. The Star is now in the safe.',
      visual: 'keycard',
    },
  ],
  after2: [
    {
      scene: 'VAULT LEVEL · 01:57',
      title: '“Same as Marlowe.”',
      text: 'Dex cuts the signal. Four minutes remain. Wren’s Echo is her only partner.',
      visual: 'signal',
    },
  ],
});

export const ENDINGS = {
  exposed: { title: 'Signal received', text: 'Wren sends all three files to the police from the roof. When Dex pulls up in the getaway van, the sirens are already waiting.' },
  alone: { title: 'Gone', text: 'Wren ziplines into the rain with the Kestrel Star. Dex is never heard from again, and neither is the truth about Marlowe.' },
};

export const endingFor = (evidenceFound) => (evidenceFound >= 3 ? ENDINGS.exposed : ENDINGS.alone);

export function cinematicFor(key, evidenceFound = 0) {
  if (key !== 'ending') return CINEMATICS[key] ?? [];
  const ending = endingFor(evidenceFound);
  return [
    {
      scene: 'VARGA ROOF · BEFORE LOCKDOWN',
      title: 'No way back. Only across.',
      text: 'The roof team closes in. Wren takes the line.',
      visual: 'zipline',
    },
    {
      scene: evidenceFound >= 3 ? 'EVIDENCE TRANSMITTED' : 'SIGNAL LOST',
      title: ending.title,
      text: ending.text,
      visual: evidenceFound >= 3 ? 'police' : 'rain',
    },
  ];
}

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
  'level:complete', 'diamond:taken', 'evidence:uploaded', 'guard:warning',
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
    const text = rotate(`bark|${state}`, lines);
    bark = { who: GUARD_NAMES[key] ?? key.toUpperCase(), text, clip: barkClipId(key, state, lines.indexOf(text)), left: 2.6 };
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
    'guard:warning': (p = {}) => sayBark(p.id, 'warning'),
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
      current = { ...next, left: next.duration, startedAt: clock };
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
    bark = null; card = null; onBark(null); onEvidence(null);
    trigger('level:start');
  }

  return {
    update,
    setLevel,
    reset,
    trigger,
    extendLine(clip, seconds) {
      if (current?.clip === clip && Number.isFinite(seconds)) current.left = Math.max(current.left, seconds - (clock - current.startedAt) + 0.3);
    },
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
  const host = doc?.defaultView ?? globalThis;
  let typing = null;
  const set = (el, sel, text) => { const n = el?.querySelector(sel); if (n) n.textContent = text; };
  return {
    radio(line) {
      if (!radio) return;
      radio.classList.toggle('is-hidden', !line);
      host.clearInterval?.(typing);
      if (!line) return;
      radio.dataset.who = line.kind === 'cut' ? 'cut' : line.who.toLowerCase();
      set(radio, '.radio-who', line.kind === 'cut' ? 'COMMS' : line.who === DEX ? 'DEX · RADIO' : line.who);
      const text = radio.querySelector('.radio-text');
      radio.setAttribute('aria-label', `${line.who ?? 'Comms'}: ${line.text}`);
      if (!text || line.kind === 'cut' || !host.setInterval) { set(radio, '.radio-text', line.text); return; }
      text.textContent = '';
      radio.classList.add('typing');
      let index = 0;
      typing = host.setInterval(() => {
        index += 1;
        text.textContent = line.text.slice(0, index);
        if (index >= line.text.length) {
          host.clearInterval(typing);
          radio.classList.remove('typing');
        }
      }, 18);
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

function createVoiceNarration(doc, connectVoice = () => null, onDuration = () => {}) {
  const host = doc?.defaultView ?? globalThis;
  let current = null;
  let currentBark = null;
  let enabled = true;
  let masterVolume = 0.7;
  const connections = new WeakMap();
  try {
    const saved = JSON.parse(host?.localStorage?.getItem('signal.options.v1') || '{}');
    enabled = saved.voice !== false;
    masterVolume = saved.master ?? 0.7;
  } catch { /* storage is optional */ }

  const onSetting = (event) => {
    enabled = event.detail?.enabled !== false;
    masterVolume = event.detail?.volume ?? masterVolume;
    if (!enabled) stop();
  };
  doc?.addEventListener?.('signal:voice', onSetting);

  const report = (text, state = '') => {
    const node = doc?.getElementById?.('voice-status');
    if (node) { node.textContent = text; node.dataset.state = state; }
  };

  function stop() {
    if (currentBark) { release(currentBark); currentBark = null; }
    if (!current) return;
    release(current);
    current = null;
  }

  function release(clip) {
    clip.pause(); connections.get(clip)?.(); connections.delete(clip);
  }

  function speak(line, volume = 1, test = false, channel = 'radio') {
    if (channel === 'radio' && current) { release(current); current = null; }
    if (channel === 'bark' && currentBark) { release(currentBark); currentBark = null; }
    if (!enabled || !recordedLineAvailable(line) || !host?.Audio) return false;
    const clip = new host.Audio(`./audio/voice/${line.clip}.mp3`);
    const disconnect = connectVoice(clip, line);
    if (disconnect) connections.set(clip, disconnect);
    clip.volume = Math.max(0, Math.min(1, volume * (disconnect ? 1 : masterVolume)));
    clip.onplaying = () => { if (test) report('Playing Dex’s voice clip…', 'playing'); };
    clip.onloadedmetadata = () => {
      if (Number.isFinite(clip.duration)) {
        onDuration(line.clip, clip.duration);
        const EventType = host.CustomEvent ?? globalThis.CustomEvent;
        if (EventType) doc.dispatchEvent(new EventType('signal:voice-duration', { detail: { clip: line.clip, duration: clip.duration } }));
      }
    };
    clip.onended = () => { release(clip); if (current === clip) current = null; if (currentBark === clip) currentBark = null; if (test) report('Voice is working.', 'ready'); };
    clip.onerror = () => { release(clip); if (current === clip) current = null; if (currentBark === clip) currentBark = null; if (test) report('Audio could not load. Try refreshing the game.', 'error'); };
    if (channel === 'radio') current = clip; else currentBark = clip;
    clip.play().catch(() => { release(clip); if (current === clip) current = null; if (currentBark === clip) currentBark = null; if (test) report('Click TEST VOICE again to allow sound.', 'error'); });
    return true;
  }

  const onCinematic = (event) => speak(event.detail, 1);
  const onTest = (event) => {
    if (!enabled) { report('Turn on Voice narration first.', 'error'); return; }
    if (!speak({ ...event.detail, clip: 'voice-test' }, 1, true)) report('Recorded voice is not ready yet.', 'error');
  };
  const onCinematicStop = () => stop();
  const onScene = (event) => {
    if (event.detail?.stop) { stop(); return; }
    for (const clip of [current, currentBark]) {
      if (!clip) continue;
      if (event.detail?.paused) clip.pause(); else clip.play().catch(() => {});
    }
  };
  doc?.addEventListener?.('signal:cinematic-line', onCinematic);
  doc?.addEventListener?.('signal:voice-test', onTest);
  doc?.addEventListener?.('signal:cinematic-stop', onCinematicStop);
  doc?.addEventListener?.('signal:voice-scene', onScene);

  return {
    speak,
    stop,
    dispose() {
      stop();
      doc?.removeEventListener?.('signal:voice', onSetting);
      doc?.removeEventListener?.('signal:cinematic-line', onCinematic);
      doc?.removeEventListener?.('signal:voice-test', onTest);
      doc?.removeEventListener?.('signal:cinematic-stop', onCinematicStop);
      doc?.removeEventListener?.('signal:voice-scene', onScene);
    },
  };
}

export function createStory({ events, doc = document, level = level1, audio = createAudio({ surfaceAt: (x, z) => surfaceAt(level, x, z) }) } = {}) {
  const view = createRadioView(doc);
  const narration = createVoiceNarration(doc, (element, line) => audio.connectVoice(element, { radio: line.who === DEX || line.who === 'CONTROL' }),
    (clip, seconds) => director.extendLine(clip, seconds));
  const director = createStoryDirector({
    events,
    onRadio: view.radio,
    onBark: view.bark,
    onEvidence: view.evidence,
    onCut: () => { narration.stop(); audio.cut(); },
    onBarkSound: (line) => { if (!narration.speak(line, 0.75, false, 'bark')) audio.bark(); },
    onLine: (line) => {
      audio.squelch();
      narration.speak(line, 1);
    },
  });
  audio.bind(events);
  // Browsers only allow sound after a user gesture; the first click is it.
  doc.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  return {
    ...director,
    audio,
    dispose() { director.dispose(); narration.dispose(); },
    // Radio timers, music and footsteps. Pass dt = 0 while paused.
    update(dt, player, guards) {
      director.update(dt);
      audio.update(dt, player, guards);
    },
  };
}
