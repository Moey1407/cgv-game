// src/audio.js: all game sound. Owner: Teammate 3.
// Every sound is synthesised with Web Audio, so there are no files to download,
// license or credit. Nothing plays until unlock() runs from a user gesture.
//
//   music     four layers (pad, bass, drums, tension) that fade in as the alarm
//             rises and back out as it decays
//   footsteps guards are placed in 3D around the listener (HRTF panning);
//             Wren's steps change with the floor surface
//   effects   one sound per gameplay event, wired by bind(events)

const BPM = 92;
const SIXTEENTH = 60 / BPM / 4;
const LOOKAHEAD = 0.25;

// Am, Am, F, E: four bars, then repeat.
const BARS = [
  { bass: 110, chord: [220, 261.63, 329.63] },
  { bass: 110, chord: [220, 261.63, 329.63] },
  { bass: 87.31, chord: [174.61, 220, 261.63] },
  { bass: 82.41, chord: [164.81, 207.65, 246.94] },
];
const BASS_PATTERN = [1, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 1, 2, 0]; // 1 root, 2 octave

// Target gain of each music layer at each alarm level.
export const MUSIC_MIX = {
  quiet: { pad: 0.35, bass: 0, drums: 0, tension: 0 },
  suspicious: { pad: 0.35, bass: 0.5, drums: 0, tension: 0 },
  alert: { pad: 0.28, bass: 0.6, drums: 0.55, tension: 0 },
  lockdown: { pad: 0.22, bass: 0.7, drums: 0.7, tension: 0.35 },
};

const STRIDE = { patrol: 0.85, investigate: 0.85, search: 0.7, pursue: 1.25 };

export function createAudio({ surfaceAt = () => 'marble' } = {}) {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noise = null;
  const layers = {};
  const volumes = { master: 0.7, music: 0.6, sfx: 0.9 };
  let mix = MUSIC_MIX.quiet;
  let nextNote = 0;
  let step = 0;
  let ducked = false;
  let playerTimer = 0;
  const guardSteps = new Map();

  function unlock() {
    try {
      if (!ctx) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        sfxBus = ctx.createGain();
        musicBus.connect(master);
        sfxBus.connect(master);
        for (const name of Object.keys(MUSIC_MIX.quiet)) {
          layers[name] = ctx.createGain();
          layers[name].gain.value = 0;
          layers[name].connect(musicBus);
        }
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
        applyVolumes();
        setMix(mix, 0.01);
        nextNote = ctx.currentTime + 0.1;
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      ctx = null;
    }
  }

  const ready = () => ctx && ctx.state === 'running';

  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = volumes.master;
    musicBus.gain.setTargetAtTime(volumes.music * (ducked ? 0.35 : 1), ctx.currentTime, 0.2);
    sfxBus.gain.value = volumes.sfx;
  }

  function setMix(target, seconds = 1.5) {
    mix = target;
    if (!ctx) return;
    for (const [name, gain] of Object.entries(target)) layers[name].gain.setTargetAtTime(gain, ctx.currentTime, seconds / 3);
  }

  // Building blocks. `out` is where the sound goes (a bus, a layer or a panner).
  function envelope(out, start, attack, hold, release, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + attack);
    g.gain.setValueAtTime(peak, start + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    g.connect(out);
    return g;
  }

  function hiss(out, start, seconds, peak, freq, { q = 1.2, type = 'bandpass' } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    src.connect(filter).connect(envelope(out, start, 0.004, seconds * 0.3, seconds * 0.7, peak));
    src.start(start, Math.random() * 0.5, seconds + 0.1);
    return filter;
  }

  function tone(out, start, freq, seconds, peak, { type = 'sine', to, attack = 0.004, cutoff } = {}) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, start + seconds);
    let node = osc;
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      osc.connect(lp);
      node = lp;
    }
    node.connect(envelope(out, start, attack, seconds * 0.3, seconds * 0.7, peak));
    osc.start(start);
    osc.stop(start + attack + seconds + 0.1);
    return osc;
  }

  // Music: a small lookahead scheduler, run from update().
  function scheduleMusic() {
    // After a stall (tab in the background, a long frame) skip ahead instead of
    // scheduling every missed note at once.
    if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.02;
    while (nextNote < ctx.currentTime + LOOKAHEAD) {
      const t = nextNote;
      const bar = BARS[Math.floor(step / 16) % BARS.length];
      const s = step % 16;
      if (s === 0 && mix.pad > 0.01) {
        for (const f of bar.chord) {
          tone(layers.pad, t, f, SIXTEENTH * 15, 0.06, { type: 'triangle', attack: 0.5, cutoff: 1200 });
          tone(layers.pad, t, f * 1.004, SIXTEENTH * 15, 0.04, { type: 'sawtooth', attack: 0.6, cutoff: 700 });
        }
      }
      if (mix.bass > 0.01 && BASS_PATTERN[s]) {
        tone(layers.bass, t, bar.bass * BASS_PATTERN[s], SIXTEENTH * 1.6, 0.22, { type: 'square', cutoff: 420 });
      }
      if (mix.drums > 0.01) {
        if (s === 0 || s === 8 || (mix.tension > 0 && s === 14)) tone(layers.drums, t, 120, 0.18, 0.9, { to: 40 });
        if (s === 4 || s === 12) hiss(layers.drums, t, 0.14, 0.35, 1800, { q: 0.8 });
        if (s % 2 === 0 || mix.tension > 0) hiss(layers.drums, t, 0.04, s % 4 === 2 ? 0.16 : 0.09, 7500, { type: 'highpass', q: 0.5 });
      }
      if (mix.tension > 0.01) {
        tone(layers.tension, t, bar.chord[s % 3] * 2, SIXTEENTH * 0.8, 0.07, { type: 'sine' });
      }
      nextNote += SIXTEENTH;
      step += 1;
    }
  }

  // Footsteps.
  function setListener(x, z, yaw) {
    const l = ctx.listener;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    if (l.positionX) {
      l.positionX.value = x; l.positionY.value = 1.6; l.positionZ.value = z;
      l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(x, 1.6, z);
      l.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  }

  function guardStep(x, z, loud) {
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2;
    p.rolloffFactor = 1.3;
    p.maxDistance = 40;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = 0.1; p.positionZ.value = z; } else p.setPosition(x, 0.1, z);
    p.connect(sfxBus);
    const t = ctx.currentTime;
    tone(p, t, 95, 0.09, loud ? 0.7 : 0.45, { to: 55 });
    hiss(p, t, 0.05, loud ? 0.35 : 0.22, 2600, { q: 0.9 });
  }

  const SURFACE_STEP = {
    carpet: (t, v) => { tone(sfxBus, t, 80, 0.08, 0.25 * v, { to: 50 }); hiss(sfxBus, t, 0.05, 0.05 * v, 500, { type: 'lowpass' }); },
    marble: (t, v) => { tone(sfxBus, t, 110, 0.07, 0.3 * v, { to: 60 }); hiss(sfxBus, t, 0.04, 0.3 * v, 3200, { q: 1.5 }); },
    tile: (t, v) => { tone(sfxBus, t, 105, 0.07, 0.3 * v, { to: 60 }); hiss(sfxBus, t, 0.04, 0.25 * v, 2600, { q: 1.2 }); },
    stone: (t, v) => { tone(sfxBus, t, 90, 0.08, 0.3 * v, { to: 55 }); hiss(sfxBus, t, 0.04, 0.15 * v, 1800); },
    steel: (t, v) => { tone(sfxBus, t, 100, 0.07, 0.3 * v, { to: 60 }); hiss(sfxBus, t, 0.12, 0.18 * v, 1300, { q: 9 }); },
    concrete: (t, v) => { tone(sfxBus, t, 90, 0.08, 0.3 * v, { to: 55 }); hiss(sfxBus, t, 0.04, 0.12 * v, 1500); },
  };

  function playerStep(surface, profile, damped) {
    const v = (0.35 + (profile.noise ?? 0.5) * 0.65) * (damped ? 0.4 : 1);
    (SURFACE_STEP[surface] ?? SURFACE_STEP.marble)(ctx.currentTime, v);
  }

  // Effects, one per event.
  const now = () => ctx.currentTime;
  const FX = {
    'item:picked': (p) => {
      const t = now();
      if (p.type === 'evidence') { tone(sfxBus, t, 392, 0.4, 0.12, { type: 'triangle' }); tone(sfxBus, t + 0.12, 311, 0.6, 0.1, { type: 'triangle' }); }
      else { tone(sfxBus, t, 1318, 0.25, 0.1, { type: 'triangle' }); tone(sfxBus, t + 0.07, 1975, 0.35, 0.08, { type: 'triangle' }); }
    },
    'pickpocket:complete': () => { const t = now(); hiss(sfxBus, t, 0.18, 0.12, 1200, { q: 0.6 }); tone(sfxBus, t + 0.1, 880, 0.3, 0.08, { type: 'triangle' }); },
    'camera:loop': () => { const t = now(); hiss(sfxBus, t, 0.06, 0.25, 4000); tone(sfxBus, t + 0.05, 300, 0.5, 0.06, { type: 'sawtooth', to: 900, cutoff: 2000 }); },
    'camera:detected': () => { const t = now(); for (const d of [0, 0.16]) tone(sfxBus, t + d, 1480, 0.1, 0.12, { type: 'square', cutoff: 3000 }); },
    'player:detected': () => { const t = now(); tone(sfxBus, t, 233, 0.5, 0.18, { type: 'sawtooth', cutoff: 1500 }); tone(sfxBus, t, 247, 0.5, 0.18, { type: 'sawtooth', cutoff: 1500 }); },
    'player:caught': () => { const t = now(); tone(sfxBus, t, 70, 1.2, 0.8, { to: 30 }); hiss(sfxBus, t, 0.6, 0.3, 400, { type: 'lowpass' }); },
    'hazard:trip': () => { const t = now(); tone(sfxBus, t, 1800, 0.25, 0.15, { type: 'sawtooth', to: 200, cutoff: 4000 }); hiss(sfxBus, t, 0.2, 0.2, 5000); },
    'safe:tumbler-set': () => { const t = now(); hiss(sfxBus, t, 0.03, 0.5, 3500, { q: 4 }); tone(sfxBus, t + 0.02, 160, 0.12, 0.4, { to: 90 }); },
    'safe:noise': () => { const t = now(); for (const d of [0, 0.05, 0.11]) hiss(sfxBus, t + d, 0.03, 0.25, 3000, { q: 3 }); },
    'safe:miss': () => { const t = now(); tone(sfxBus, t, 140, 0.25, 0.4, { type: 'square', to: 70, cutoff: 600 }); },
    'safe:contact': () => { const t = now(); hiss(sfxBus, t, 0.025, 0.3, 4200, { q: 5 }); hiss(sfxBus, t + 0.065, 0.02, 0.22, 3500, { q: 5 }); },
    'safe:opened': () => {
      const t = now();
      tone(sfxBus, t, 60, 1.5, 0.9, { to: 35 });
      hiss(sfxBus, t, 1.2, 0.25, 300, { type: 'lowpass' });
      [220, 277.18, 329.63, 440].forEach((f, i) => tone(sfxBus, t + 0.4 + i * 0.08, f, 1.8, 0.07, { type: 'triangle', attack: 0.05 }));
    },
    'door:opened': () => { const t = now(); tone(sfxBus, t, 90, 1.1, 0.25, { type: 'sawtooth', to: 140, cutoff: 500 }); hiss(sfxBus, t, 1, 0.08, 800); },
    'echo:start': () => { const t = now(); tone(sfxBus, t, 300, 0.6, 0.1, { to: 1200, type: 'sine' }); tone(sfxBus, t, 303, 0.6, 0.08, { to: 1210, type: 'triangle' }); },
    'echo:replay': () => { const t = now(); tone(sfxBus, t, 1400, 0.7, 0.1, { to: 200, type: 'sawtooth', cutoff: 3000 }); hiss(sfxBus, t, 0.6, 0.1, 2500, { q: 0.5 }); },
    'echo:shattered': () => { const t = now(); for (let i = 0; i < 6; i += 1) hiss(sfxBus, t + i * 0.04, 0.08, 0.2, 5000 + i * 700, { q: 6 }); },
    'checkpoint:restore': () => { const t = now(); hiss(sfxBus, t, 0.5, 0.15, 1200, { q: 0.4 }); tone(sfxBus, t, 600, 0.5, 0.05, { to: 150 }); },
    'zipline:mount': () => { const t = now(); hiss(sfxBus, t, 0.09, 0.25, 2800, { q: 4 }); tone(sfxBus, t + 0.1, 480, 0.25, 0.12, { to: 220 }); hiss(sfxBus, t + 0.6, 7.2, 0.2, 950, { q: 0.4 }); },
    'zipline:complete': () => { const t = now(); hiss(sfxBus, t, 0.3, 0.2, 400, { type: 'lowpass' }); tone(sfxBus, t, 130, 0.15, 0.3, { to: 60 }); },
  };

  function alarmStinger(level) {
    const t = now();
    const base = { suspicious: 330, alert: 392, lockdown: 466 }[level];
    if (!base) return;
    tone(sfxBus, t, base, 0.35, 0.12, { type: 'sawtooth', cutoff: 2000 });
    tone(sfxBus, t + 0.12, base * 1.06, 0.5, 0.12, { type: 'sawtooth', cutoff: 2000 });
  }

  function bind(events) {
    const offs = Object.entries(FX).map(([type, play]) => events.on(type, (p = {}) => { if (ready()) play(p); }));
    const ORDER = ['quiet', 'suspicious', 'alert', 'lockdown'];
    const id = (l) => (typeof l === 'string' ? l : l?.id);
    offs.push(events.on('alarm:level', (p = {}) => {
      const level = id(p.level);
      if (MUSIC_MIX[level]) setMix(MUSIC_MIX[level]);
      if (ready() && ORDER.indexOf(level) > ORDER.indexOf(id(p.previous))) alarmStinger(level);
    }));
    offs.push(events.on('checkpoint:save', ({ id: cp } = {}) => { if (cp === 'start') setMix(MUSIC_MIX.quiet, 0.5); }));
    return () => offs.forEach((off) => off());
  }

  // Once per frame. dt is 0 while paused, so nothing steps.
  function update(dt, player, guards = []) {
    if (!ready()) return;
    scheduleMusic();
    if (!(dt > 0) || !player) return;
    setListener(player.position.x, player.position.z, player.yaw ?? 0);
    if (player.moving && !(player.y > 0)) {
      playerTimer -= dt;
      if (playerTimer <= 0) {
        playerTimer = (player.profile?.step ?? 0.5) * 0.6;
        playerStep(surfaceAt(player.position.x, player.position.z), player.profile ?? {}, player.damped);
      }
    } else {
      playerTimer = 0;
    }
    for (const g of guards) {
      let s = guardSteps.get(g.id);
      if (!s) { s = { x: g.position.x, z: g.position.z, acc: 0 }; guardSteps.set(g.id, s); }
      const moved = Math.hypot(g.position.x - s.x, g.position.z - s.z);
      s.x = g.position.x;
      s.z = g.position.z;
      if (moved > 2) { s.acc = 0; continue; } // teleported (checkpoint)
      s.acc += moved;
      const stride = STRIDE[g.state] ?? 0.85;
      if (s.acc >= stride) {
        s.acc = 0;
        guardStep(g.position.x, g.position.z, g.state === 'pursue');
      }
    }
  }

  return {
    unlock,
    connectVoice(element, { radio = false } = {}) {
      unlock();
      if (!ready()) return null;
      const nodes = [];
      try {
        const source = ctx.createMediaElementSource(element); nodes.push(source);
        let tail = source;
        if (radio) {
          const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 180;
          const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 3900;
          const compressor = ctx.createDynamicsCompressor(); compressor.threshold.value = -20; compressor.ratio.value = 2.5;
          source.connect(high); high.connect(low); low.connect(compressor);
          nodes.push(high, low, compressor); tail = compressor;
        }
        tail.connect(master);
        return () => nodes.forEach((node) => node.disconnect());
      } catch { nodes.forEach((node) => node.disconnect()); return null; }
    },
    bind,
    update,
    get volume() { return volumes.master; },
    get volumes() { return { ...volumes }; },
    setVolume(v) { volumes.master = clamp01(v); applyVolumes(); },
    setMusicVolume(v) { volumes.music = clamp01(v); applyVolumes(); },
    setSfxVolume(v) { volumes.sfx = clamp01(v); applyVolumes(); },
    duck(on) { ducked = Boolean(on); applyVolumes(); },
    get mix() { return mix; },
    // Radio key-up: static and a short tone, like a handset opening.
    squelch() {
      if (!ready()) return;
      const t = now();
      hiss(sfxBus, t, 0.08, 0.18, 2200);
      tone(sfxBus, t + 0.06, 1250, 0.05, 0.05, { type: 'square' });
    },
    // Guard chatter: a lower, shorter crackle so it reads as another channel.
    bark() {
      if (!ready()) return;
      hiss(sfxBus, now(), 0.06, 0.12, 900, { q: 2 });
    },
    // Comms cut: static falling away under a dropping tone.
    cut() {
      if (!ready()) return;
      const t = now();
      const band = hiss(sfxBus, t, 1.1, 0.3, 3000, { q: 0.7 });
      band.frequency.exponentialRampToValueAtTime(300, t + 1.1);
      tone(sfxBus, t, 880, 0.9, 0.06, { type: 'sawtooth', to: 110 });
    },
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
