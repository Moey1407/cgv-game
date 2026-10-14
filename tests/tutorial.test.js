import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_STEPS, TUTORIAL_STAGE, TUTORIAL_FLOOR, DECOY_TARGET, TUTORIAL_EXIT,
  DAMPENER_PICKUP, MARBLE_START_Z, MARBLE_END_Z, MARBLE_CLEARED_Z, MARBLE_RESET_Z,
  isStepComplete, advanceTutorial, createTutorialRun
} from '../src/tutorial.js';
import { hasClearAccess } from '../src/interactions.js';
import { SURFACES } from '../src/galleries.js';

const blank = {
  lookTravel: 0, walkDistance: 0, position: { x: 0, y: 0, z: 18 },
  ranOnMarble: false, sonarUsed: 0, decoyLandedNearTarget: false,
  hasDampener: false, reachedExit: false
};
const ctx = (over) => ({ ...blank, ...over });
const step = (id) => TUTORIAL_STEPS.find((s) => s.id === id);

test('the training stage id cannot be mistaken for "no stage"', () => {
  // Collider filtering everywhere reads `box.stage && box.stage !== stage`, so
  // a falsy id would leak every training wall into all three real levels.
  assert.ok(TUTORIAL_STAGE, 'the training stage id must be truthy');
  assert.ok(![1, 2, 3].includes(TUTORIAL_STAGE), 'it must not collide with a real level');
});

test('each step has a title, a hint and a unique id', () => {
  const ids = new Set();
  for (const s of TUTORIAL_STEPS) {
    assert.ok(s.title && s.hint, `step ${s.id} is missing copy`);
    assert.equal(ids.has(s.id), false, `duplicate step id ${s.id}`);
    ids.add(s.id);
  }
  assert.ok(TUTORIAL_STEPS.length >= 5, 'too few lessons to cover the controls');
});

test('looking needs real movement, not a twitch', () => {
  assert.equal(isStepComplete(step('look'), ctx({ lookTravel: 0.4 })), false);
  assert.equal(isStepComplete(step('look'), ctx({ lookTravel: 2.2 })), true);
});

test('moving needs distance covered', () => {
  assert.equal(isStepComplete(step('move'), ctx({ walkDistance: 2 })), false);
  assert.equal(isStepComplete(step('move'), ctx({ walkDistance: 9 })), true);
});

test('the move lesson is completable inside the first bay', () => {
  // Spawn sits at z=18 and gate-1 at z=12, so a straight walk offers about
  // 5.3m once wall thickness and the player radius are taken off. The
  // threshold has to fit inside that or the lesson can never be cleared.
  const walkable = (18 - 12) - 0.45 - 0.46;
  assert.equal(isStepComplete(step('move'), ctx({ walkDistance: walkable })), true,
    'the first bay is shorter than the distance the move lesson demands');
});

test('the marble lesson fails if you ran across it', () => {
  const across = { position: { x: 0, y: 0, z: 4.8 } };
  assert.equal(isStepComplete(step('quiet'), ctx({ ...across, ranOnMarble: true })), false);
  assert.equal(isStepComplete(step('quiet'), ctx({ ...across, ranOnMarble: false })), true);
  // Still on the near side, so not done however quietly you moved.
  assert.equal(isStepComplete(step('quiet'), ctx({ position: { x: 0, y: 0, z: 9 } })), false);
});

test('the marble strip has room to react, to cross, and to land on', () => {
  // Gate-1 sits at z=12 and the marble starts further south, so a player still
  // holding W after the gate opens has carpet to slow down on.
  assert.ok(12 - MARBLE_START_Z >= 1.5,
    'no approach carpet between the gate and the marble');
  // The crossing should be short enough that holding a walk key is not a chore.
  const crossing = MARBLE_START_Z - MARBLE_CLEARED_Z;
  assert.ok(crossing <= 5.5, `crossing is ${crossing}m, too far to hold a walk`);
  // Finishing happens on the carpet past the strip, not still on it.
  assert.ok(MARBLE_CLEARED_Z < MARBLE_END_Z,
    'the lesson completes before the player is off the marble');
  // Reset sits north of the strip so backing off always clears a spoiled run.
  assert.ok(MARBLE_RESET_Z > MARBLE_START_Z,
    'the reset point is on the marble, so a spoiled attempt cannot be cleared');
});

test('the step that can be spoiled offers a way to retry', () => {
  const quiet = step('quiet');
  assert.ok(quiet.retryHint, 'the marble lesson has no retry copy');
  assert.notEqual(quiet.retryHint, quiet.hint, 'the retry copy repeats the normal hint');
});

test('the dampener lesson needs both the pickup and the exit', () => {
  assert.equal(isStepComplete(step('dampener'), ctx({ hasDampener: true })), false);
  assert.equal(isStepComplete(step('dampener'), ctx({ reachedExit: true })), false);
  assert.equal(isStepComplete(step('dampener'), ctx({ hasDampener: true, reachedExit: true })), true);
});

test('steps advance one at a time and only when earned', () => {
  const run = createTutorialRun();
  assert.equal(advanceTutorial(run, ctx({})), null, 'advanced without doing anything');

  // Satisfying a later condition must not skip the ones before it.
  assert.equal(advanceTutorial(run, ctx({ sonarUsed: 3 })), null);
  assert.equal(run.index, 0);

  const look = advanceTutorial(run, ctx({ lookTravel: 2, walkDistance: 50 }));
  assert.equal(look.step.id, 'look');
  assert.equal(run.index, 1, 'advanced more than one step in a single call');
});

test('a full run completes every lesson in order and reports the end', () => {
  const run = createTutorialRun();
  const sequence = [
    [{ lookTravel: 2 }, 'look'],
    [{ walkDistance: 5 }, 'move'],
    [{ position: { x: 0, y: 0, z: 4.5 } }, 'quiet'],
    [{ sonarUsed: 1 }, 'sonar'],
    [{ decoyLandedNearTarget: true }, 'decoy'],
    [{ hasDampener: true, reachedExit: true }, 'dampener']
  ];
  let carried = {};
  let last = null;
  for (const [delta, id] of sequence) {
    carried = { ...carried, ...delta };
    const result = advanceTutorial(run, ctx(carried));
    assert.ok(result, `step ${id} never completed`);
    assert.equal(result.step.id, id);
    last = result;
  }
  assert.equal(last.finished, true, 'the last step did not report the run as finished');
  assert.deepEqual(run.completed, sequence.map(([, id]) => id));
  assert.equal(advanceTutorial(run, ctx(carried)), null, 'advanced past the end');
});

test('every gated step names a gate that the floor plan builds', () => {
  const built = new Set(['gate-1', 'gate-2', 'gate-3', 'gate-4']);
  for (const s of TUTORIAL_STEPS) {
    if (!s.gate) continue;
    assert.ok(built.has(s.gate), `step ${s.id} opens unknown gate ${s.gate}`);
  }
});

test('the floor plan covers the whole corridor without gaps or overlaps', () => {
  const sorted = [...TUTORIAL_FLOOR].sort((a, b) => b.rect[3] - a.rect[3]);
  for (let i = 1; i < sorted.length; i += 1) {
    assert.equal(sorted[i].rect[3], sorted[i - 1].rect[1],
      `${sorted[i].name} does not meet ${sorted[i - 1].name}`);
  }
  for (const zone of TUTORIAL_FLOOR) {
    assert.ok(SURFACES[zone.surface], `${zone.name} uses an unknown surface`);
  }
});

test('the decoy target and exit sit inside the corridor', () => {
  for (const point of [DECOY_TARGET, TUTORIAL_EXIT]) {
    assert.ok(Math.abs(point.x) < 6, `${point.x} is outside the corridor walls`);
    assert.ok(point.z > -20.8 && point.z < 21.2, `${point.z} is outside the corridor ends`);
  }
});


test('the dampener can actually be reached from in front of its bench', () => {
  // Interaction is an XZ segment test, so a pickup centred over a solid bench
  // is unreachable: the bench blocks the ray. Stand just south of the gate and
  // check the line to the pickup is clear.
  const bench = { stage: TUTORIAL_STAGE, minX: -1.2, maxX: 1.2, minZ: -14.65, maxZ: -13.75 };
  const standing = { x: 0, z: -12.6 };
  assert.ok(Math.hypot(DAMPENER_PICKUP.x - standing.x, DAMPENER_PICKUP.z - standing.z) < 2.25,
    'the pickup is out of interaction range from a sensible standing spot');
  assert.equal(hasClearAccess(standing, DAMPENER_PICKUP, [bench], TUTORIAL_STAGE), true,
    'the bench blocks the interaction ray to the dampener');
});
