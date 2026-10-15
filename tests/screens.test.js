import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { gradeRun, createRunTracker, loadOptions, DEFAULT_OPTIONS } from '../src/screens.js';
import { createAudio, MUSIC_MIX } from '../src/audio.js';

const LOOT = [
  { id: 'a', type: 'loot', value: 1000 },
  { id: 'b', type: 'loot', value: 3000 },
  { id: 'e', type: 'evidence', value: 0 },
];

test('a clean, fast, greedy run is an S; a messy one is a D', () => {
  assert.equal(gradeRun({ time: 240, take: 4000, takeTotal: 4000 }).grade, 'S');
  assert.equal(gradeRun({ time: 900, take: 0, takeTotal: 4000, detections: 4, cameras: 2, maxAlarm: 'lockdown' }).grade, 'D');
});

test('grade bands sit where the results screen says', () => {
  // stealth 50 + greed 15 + speed 20 = 85 -> A
  assert.equal(gradeRun({ time: 100, take: 2000, takeTotal: 4000 }).grade, 'A');
  // one detection and a suspicious alarm: 35 + 15 + 20 = 70 -> B
  assert.equal(gradeRun({ time: 100, take: 2000, takeTotal: 4000, detections: 1, maxAlarm: 'suspicious' }).grade, 'B');
  // speed falls to zero at twice par
  assert.equal(gradeRun({ time: 600 }).speed, 0);
});

test('the run tracker counts only what the events report', () => {
  const events = createEventBus();
  const run = createRunTracker({ events, loot: LOOT });
  events.emit('item:picked', { id: 'a', type: 'loot', value: 1000 });
  events.emit('item:picked', { id: 'e', type: 'evidence', value: 0 });
  events.emit('player:detected', { id: 'okafor' });
  events.emit('camera:detected', { id: 1 });
  events.emit('alarm:level', { level: { id: 'alert' }, previous: { id: 'suspicious' } });
  events.emit('alarm:level', { level: { id: 'quiet' }, previous: { id: 'alert' } });
  run.update(12);
  events.emit('player:caught', { id: 'okafor' });
  run.update(30); // not counted while caught
  events.emit('checkpoint:restore', {});
  run.update(3);
  const s = run.snapshot();
  assert.deepEqual(
    { time: s.time, take: s.take, takeTotal: s.takeTotal, evidence: s.evidence, evidenceTotal: s.evidenceTotal, detections: s.detections, cameras: s.cameras, maxAlarm: s.maxAlarm },
    { time: 15, take: 1000, takeTotal: 4000, evidence: 1, evidenceTotal: 1, detections: 1, cameras: 1, maxAlarm: 'alert' }
  );
  events.emit('checkpoint:save', { id: 'start' });
  assert.equal(run.snapshot().take, 0);
});

test('options fall back to defaults when storage is missing or broken', () => {
  assert.deepEqual(loadOptions(null), { ...DEFAULT_OPTIONS });
  assert.deepEqual(loadOptions({ getItem: () => '{not json' }), { ...DEFAULT_OPTIONS });
  assert.equal(loadOptions({ getItem: () => '{"sensitivity":1.5}' }).sensitivity, 1.5);
  assert.deepEqual(loadOptions({ getItem: () => { throw new Error('blocked'); } }), { ...DEFAULT_OPTIONS });
});

test('music gets busier as the alarm rises', () => {
  const total = (m) => m.bass + m.drums + m.tension;
  const order = ['quiet', 'suspicious', 'alert', 'lockdown'].map((k) => total(MUSIC_MIX[k]));
  for (let i = 1; i < order.length; i += 1) assert.ok(order[i] > order[i - 1]);
});

test('audio is silent and safe before the first click (and in Node)', () => {
  const events = createEventBus();
  const audio = createAudio();
  const off = audio.bind(events);
  for (const type of ['item:picked', 'alarm:level', 'safe:opened', 'echo:shattered']) events.emit(type, { level: { id: 'alert' }, previous: { id: 'quiet' } });
  audio.squelch();
  audio.update(0.016, { position: { x: 0, z: 0 }, moving: true, profile: { step: 0.5 } }, [{ id: 'g', position: { x: 1, z: 1 }, state: 'patrol' }]);
  audio.setVolume(2);
  assert.equal(audio.volume, 1);
  assert.equal(audio.mix, MUSIC_MIX.alert, 'the mix follows the alarm even before sound is unlocked');
  off();
});
