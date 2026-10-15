import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearningGuide } from '../src/gameplay/learning.js';
import { createGuestMotion } from '../src/gameplay/guestMotion.js';
const start = { level: 1, x: -4, z: 5, yaw: 0, base: 0, flags: {}, camera: -1 };
test('first-time guidance waits for actual looking, movement and quiet walking', () => {
  const guide = createLearningGuide();
  assert.equal(guide.update(.1, start).id, 'look');
  assert.equal(guide.update(20, start).id, 'look', 'waiting alone must not advance a lesson');
  assert.equal(guide.update(.1, { ...start, yaw: .3 }).id, 'move');
  let state = { ...start, yaw: .3 };
  for (let i = 1; i <= 4; i++) state = { ...state, z: 5 - i * .6 };
  for (let i = 1; i <= 4; i++) guide.update(.1, { ...state, x: -4 + i * .6 });
  assert.equal(guide.update(.1, state).id, 'walk');
  assert.equal(guide.update(.8, { ...state, moving: true, movement: 'walk' }).id, 'staff-door');
  guide.reset(); assert.equal(guide.update(.1, start).id, 'look');
});
test('advanced mission progress bypasses earlier lessons and camera teaching follows real actions', () => {
  const g = createLearningGuide(), s = { ...start, flags: { rig: true } };
  assert.equal(g.update(.1, s).id, 'cctv-open');
  assert.equal(g.update(.1, { ...s, camera: 0 }).id, 'cctv-select');
  assert.equal(g.update(.1, { ...s, camera: 1 }).id, 'cctv-loop');
  assert.equal(g.update(.1, { ...s, camera: 1, hallLooped: true }).id, 'cctv-close');
  assert.equal(g.update(.1, s).id, 'badge');
  assert.equal(g.update(.1, { ...s, hasKeycard: true }).id, 'reader');
  assert.equal(g.update(.1, { ...s, hasKeycard: true, flags: { rig: true, nightEntry: true } }).id, 'lobby');
});
test('vault lessons teach one obstacle and then the safe in its actual interface', () => {
  const g = createLearningGuide(), s = { ...start, level: 2, x: 0, z: 0 };
  assert.equal(g.update(.1, s).id, 'crawl-beam');
  assert.equal(g.update(.1, { ...s, z: -9 }).id, 'jump-beam');
  assert.equal(g.update(.1, { ...s, z: -15 }).id, 'moving-beam');
  assert.equal(g.update(.1, { ...s, z: -30 }).id, 'panel');
  assert.equal(g.update(.1, { ...s, inSafe: true }).id, 'dial');
  assert.equal(g.update(.1, { ...s, flags: { sensorDisabled: true, safeOpened: true } }).id, 'star');
});
test('Echo instructions distinguish recording, replay and the roof interlock', () => {
  const g = createLearningGuide(), s = { ...start, level: 3 };
  assert.equal(g.update(.1, s).id, 'record-start');
  assert.equal(g.update(.1, { ...s, echo: 'recording' }).id, 'record-hold');
  assert.equal(g.update(.1, { ...s, echo: 'replaying' }).id, 'cross-shutter');
  assert.equal(g.update(.1, { ...s, flags: { pastShutter: true } }).id, 'stairs');
  assert.equal(g.update(.1, { ...s, base: 20, flags: { pastShutter: true } }).id, 'plate-start');
  assert.equal(g.update(.1, { ...s, base: 20, flags: { pastShutter: true, armed: true } }).id, 'hatch');
});
test('walking guests move between bounded spots and never step into blocked geometry', () => {
  const g = createGuestMotion({ x: 0, z: -10 }, 0, { canStand: (x) => x < .5 });
  let moved = false;
  for (let i = 0; i < 400; i++) { const p = g.update(.1); moved ||= p.moving; assert.ok(p.x < .5); assert.ok(p.z >= -14 && p.z <= -10); }
  assert.ok(moved);
  const social = createGuestMotion({ x: 2, z: -10, stroll: false }, 1);
  for (let i = 0; i < 100; i++) social.update(.1);
  assert.deepEqual(social.position, { x: 2, z: -10 });
});
