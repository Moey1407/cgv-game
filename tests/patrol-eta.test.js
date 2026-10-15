import test from 'node:test';
import assert from 'node:assert/strict';
import { patrolEta, etaText, INVESTIGATE_HOLD } from '../src/gameplay/patrolEta.js';

const P = (x, z) => ({ x, z });
// A square loop: 0 (0,0) -> 1 (10,0) -> 2 (10,10) -> 3 (0,10). Watch waypoint 2.
const square = [P(0, 0), P(10, 0), P(10, 10), P(0, 10)];
const guard = (over = {}) => ({ waypoints: square, index: 1, position: P(5, 0), state: 'patrol', speed: 1, timer: 0, pauseTimer: 0, ...over });

test('patrol: counts the route to the watch waypoint', () => {
  // 5 m to waypoint 1, then 10 m to waypoint 2.
  assert.deepEqual(patrolEta(guard(), { watchIndex: 2, pace: 1 }), { state: 'patrol', seconds: 15 });
  assert.equal(patrolEta(guard(), { watchIndex: 2, pace: 2 }).seconds, 7.5);
  // Coming the long way round: from (0,5) heading to waypoint 0, then 1, then 2.
  assert.equal(patrolEta(guard({ index: 0, position: P(0, 5) }), { watchIndex: 2, pace: 1 }).seconds, 5 + 10 + 10);
  // A pause at a waypoint adds to the wait.
  assert.equal(patrolEta(guard({ pauseTimer: 2 }), { watchIndex: 2, pace: 1 }).seconds, 17);
});

test('checking: once past the watch waypoint he is looking now', () => {
  assert.deepEqual(patrolEta(guard({ index: 3, position: P(10, 10) }), { watchIndex: 2 }), { state: 'checking', seconds: 0 });
});

test('distracted: walk to the noise, look around, then walk back to the route', () => {
  const g = guard({ state: 'investigate', position: P(5, 0), target: P(5, -6), index: 1 });
  // 6 m there, 3 s looking, then (5,-6) -> waypoint 1 (10,0) is sqrt(61), then 10 m to waypoint 2.
  const eta = patrolEta(g, { watchIndex: 2, pace: 1 });
  assert.equal(eta.state, 'distracted');
  assert.ok(Math.abs(eta.seconds - (6 + INVESTIGATE_HOLD + Math.sqrt(61) + 10)) < 1e-9);
  // Already at the noise, 1.5 s of looking left.
  const looking = patrolEta({ ...g, timer: 1.5, position: P(5, -6) }, { watchIndex: 2, pace: 1 });
  assert.ok(Math.abs(looking.seconds - (1.5 + Math.sqrt(61) + 10)) < 1e-9);
});

test('alert and frozen guards', () => {
  assert.equal(patrolEta(guard({ state: 'pursue' }), { watchIndex: 2 }).state, 'alert');
  assert.equal(patrolEta(guard({ state: 'search' }), { watchIndex: 2 }).state, 'alert');
  assert.equal(patrolEta(guard({ speed: 0 }), { watchIndex: 2, pace: 0 }).seconds, Infinity);
  assert.equal(etaText('Briggs', { state: 'patrol', seconds: Infinity }).text, 'BRIGGS CHECKS THE SAFE IN --:--');
});

test('the countdown text warns under six seconds', () => {
  assert.deepEqual(etaText('Briggs', { state: 'patrol', seconds: 14.2 }), { text: 'BRIGGS CHECKS THE SAFE IN 0:15', level: 'calm' });
  assert.equal(etaText('Briggs', { state: 'patrol', seconds: 4 }).level, 'warn');
  assert.equal(etaText('Briggs', { state: 'distracted', seconds: 9 }).text, 'BRIGGS DISTRACTED · BACK IN 0:09');
  assert.equal(etaText('Briggs', { state: 'checking', seconds: 0 }).level, 'danger');
});
