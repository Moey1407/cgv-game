import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { gradeRun, createRunTracker, loadOptions, DEFAULT_OPTIONS, LEVEL_MECHANICS, briefingFor } from '../src/screens.js';
import { createAudio, MUSIC_MIX } from '../src/audio.js';
import { QUALITY } from '../src/render/postfx.js';

const LOOT = [
  { id: 'a', type: 'loot', value: 1000 },
  { id: 'b', type: 'loot', value: 3000 },
  { id: 'e', type: 'evidence', value: 0 },
];

test('a clean run under par with every file is an S; a messy one is a D', () => {
  assert.equal(gradeRun({ time: 900, evidence: 3, evidenceTotal: 3 }).grade, 'S');
  assert.equal(gradeRun({ time: 1900, evidence: 0, evidenceTotal: 3, detections: 4, cameras: 2, maxAlarm: 'lockdown' }).grade, 'D');
});

test('grade bands sit where the results screen says', () => {
  // stealth 50 + evidence 20 (2 of 3) + speed 20 = 90 -> S
  assert.equal(gradeRun({ time: 800, evidence: 2, evidenceTotal: 3 }).grade, 'S');
  // stealth 50 + evidence 10 + speed 20 = 80 -> A
  assert.equal(gradeRun({ time: 800, evidence: 1, evidenceTotal: 3 }).grade, 'A');
  // one detection and a suspicious alarm: 35 + 10 + 20 = 65 -> B
  assert.equal(gradeRun({ time: 800, evidence: 1, evidenceTotal: 3, detections: 1, maxAlarm: 'suspicious' }).grade, 'B');
  // speed falls to zero at twice par (16 minutes)
  assert.equal(gradeRun({ time: 1920 }).speed, 0);
  assert.equal(gradeRun({ time: 960 }).speed, 20);
});

test('the Star alone earns no points: it is required to finish', () => {
  const g = gradeRun({ time: 900, evidence: 0, evidenceTotal: 3 });
  assert.equal(g.files, 0);
  assert.equal(g.score, 70);
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

test('retrying a checkpoint cannot duplicate evidence or award a lost pickup', () => {
  const events = createEventBus(), tracker = createRunTracker({ events, loot: LOOT });
  events.emit('item:picked', { id: 'e', type: 'evidence' });
  events.emit('item:picked', { id: 'e', type: 'evidence' });
  assert.equal(tracker.snapshot().evidence, 1);
  events.emit('item:picked', { id: 'a', type: 'loot', value: 1000 });
  events.emit('checkpoint:restore', { payload: { collected: ['e'] } });
  assert.equal(tracker.snapshot().take, 0);
  assert.equal(tracker.snapshot().evidence, 1);
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

test('every level advertises a distinct headline mechanic', () => {
  assert.equal(new Set(Object.values(LEVEL_MECHANICS)).size, 3);
  assert.match(briefingFor(1).mechanic, /CCTV/);
  assert.match(briefingFor(2).mechanic, /VENTS/);
  assert.match(briefingFor(3).mechanic, /ECHO/);
  assert.match(briefingFor(3).mechanic, /ZIPLINE/);
});

test('low quality removes the expensive passes and lowers auxiliary render rates', () => {
  assert.equal(QUALITY.low.direct, true);
  assert.equal(QUALITY.low.bloom, false);
  assert.equal(QUALITY.low.shadows, false);
  assert.ok(QUALITY.low.feedRate < QUALITY.medium.feedRate);
  assert.ok(QUALITY.low.mapRate < QUALITY.medium.mapRate);
  assert.ok(QUALITY.low.crowdLimit < QUALITY.medium.crowdLimit);
});
