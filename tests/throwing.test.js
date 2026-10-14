import test from 'node:test';
import assert from 'node:assert/strict';
import { THROW, advanceThrow, simulateThrow, impactRadius } from '../src/throwing.js';

const openFloor = () => false;
// A wall running along x = 4, from the floor to 4 m up.
const wallAtX4 = (x, y, z) => y <= 4.2 && x + THROW.radius > 3.8 && x - THROW.radius < 4.2;
// A waist-high bench, the thing a decoy should be able to clear.
const bench = (x, y, z) => y <= 1.2 && x + THROW.radius > 2.6 && x - THROW.radius < 3.4;

const throwFrom = (origin, velocity, blocked) =>
  simulateThrow(origin, velocity, blocked);

test('a decoy bounces, loses energy each time, and comes to rest', () => {
  const { impacts, rest } = throwFrom({ x: 0, y: 1.5, z: 0 },
    { x: 0, y: 0, z: -THROW.speed }, openFloor);
  const bounces = impacts.filter((i) => i.type === 'bounce');
  assert.ok(bounces.length >= 2, `expected the ball to bounce, got ${bounces.length} bounces`);
  for (let i = 1; i < bounces.length; i += 1) {
    assert.ok(bounces[i].speed < bounces[i - 1].speed,
      'each bounce should be weaker than the last');
  }
  assert.ok(Math.abs(rest.y - THROW.restY) < 0.01, 'the ball should end up on the floor');
});

test('it travels forward over its bounces instead of landing dead', () => {
  const { impacts, rest } = throwFrom({ x: 0, y: 1.5, z: 0 },
    { x: 0, y: THROW.lift, z: -THROW.speed }, openFloor);
  assert.ok(impacts.length > 0, 'no impacts recorded');
  const first = impacts[0];
  assert.ok(first.z < -3, `first impact should be well ahead, was z=${first.z.toFixed(2)}`);
  assert.ok(rest.z < first.z, 'the ball should carry on past its first bounce');
});

test('it bounces off a wall rather than passing through or stopping dead', () => {
  const { impacts, rest } = throwFrom({ x: 0, y: 1.4, z: 0 },
    { x: THROW.speed, y: THROW.lift, z: 0 }, wallAtX4);
  const wallHit = impacts.find((i) => i.type === 'wall');
  assert.ok(wallHit, 'the ball never registered a wall impact');
  assert.ok(rest.x < 4, `the ball ended up past the wall at x=${rest.x.toFixed(2)}`);
});

test('it clears a waist-high bench but not a full wall', () => {
  const over = throwFrom({ x: 0, y: 1.6, z: 0 }, { x: THROW.speed, y: THROW.lift, z: 0 }, bench);
  assert.ok(over.rest.x > 3.4, `should have cleared the bench, stopped at x=${over.rest.x.toFixed(2)}`);
  const into = throwFrom({ x: 0, y: 1.6, z: 0 }, { x: THROW.speed, y: THROW.lift, z: 0 }, wallAtX4);
  assert.ok(into.rest.x < 4, 'should not have got past a full-height wall');
});

test('the preview and the live object follow the same path', () => {
  // The preview runs simulateThrow in one go; the game steps advanceThrow per
  // frame. If these ever diverge the landing marker becomes a lie.
  const origin = { x: 0, y: 1.5, z: 0 };
  const velocity = { x: 1.5, y: THROW.lift, z: -THROW.speed };
  const predicted = simulateThrow(origin, velocity, openFloor);

  const live = { x: origin.x, y: origin.y, z: origin.z };
  const liveVelocity = { ...velocity, resting: false };
  const liveImpacts = [];
  for (let i = 0; i < Math.ceil(THROW.maxFlightTime * 60); i += 1) {
    const impact = advanceThrow(live, liveVelocity, 1 / 60, openFloor);
    if (impact) liveImpacts.push(impact);
    if (liveVelocity.resting) break;
  }
  assert.equal(liveImpacts.length, predicted.impacts.length, 'impact counts differ');
  assert.ok(Math.hypot(live.x - predicted.rest.x, live.z - predicted.rest.z) < 1e-9,
    'resting positions differ');
  predicted.impacts.forEach((impact, index) => {
    assert.ok(Math.hypot(impact.x - liveImpacts[index].x, impact.z - liveImpacts[index].z) < 1e-9,
      `impact ${index} differs between preview and live`);
  });
});

test('loudness falls off with each weaker impact and stays inside sane bounds', () => {
  assert.ok(impactRadius(20) <= 15, 'a very hard impact should still be capped');
  assert.ok(impactRadius(0.1) >= 3.5, 'a feeble impact should still have a floor');
  assert.ok(impactRadius(6) > impactRadius(2), 'harder impacts should be louder');
});

test('a throw into a corner still settles instead of jittering forever', () => {
  const corner = (x, y, z) => y <= 4.2 && (x > 2 || z > 2);
  const { rest } = throwFrom({ x: 0, y: 1.2, z: 0 },
    { x: THROW.speed, y: 0.4, z: THROW.speed }, corner);
  assert.ok(Number.isFinite(rest.x) && Number.isFinite(rest.z), 'position went non-finite');
  assert.ok(rest.x <= 2.2 && rest.z <= 2.2, 'the ball escaped the corner geometry');
});
