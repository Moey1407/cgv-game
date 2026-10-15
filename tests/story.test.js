import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { createStoryDirector, voiceLines, SCRIPT, BARKS, EVIDENCE, endingFor, ENDINGS, DEX } from '../src/story.js';

function setup() {
  const events = createEventBus();
  const log = { radio: [], barks: [], cards: [], cuts: 0 };
  const story = createStoryDirector({
    events,
    onRadio: (l) => l && log.radio.push(l.text),
    onBark: (b) => b && log.barks.push(b.who + ': ' + b.text),
    onEvidence: (c) => c && log.cards.push(c.title),
    onCut: () => { log.cuts += 1; },
  });
  // Plays everything queued, one radio line at a time.
  const drain = (seconds = 60) => { for (let t = 0; t < seconds; t += 0.25) story.update(0.25); };
  return { events, story, log, drain };
}

test('a new heist plays the Level 1 briefing in order, once', () => {
  const { events, log, drain } = setup();
  events.emit('checkpoint:save', { id: 'start' });
  drain();
  assert.deepEqual(log.radio, SCRIPT[1]['level:start'].say.map((l) => l[1]));
  events.emit('checkpoint:save', { id: 'keycard' });
  drain();
  assert.equal(log.radio.length, 4, 'a mid-level checkpoint must not replay the briefing');
});

test('nothing plays while the game is paused (dt of 0)', () => {
  const { events, story, log } = setup();
  events.emit('checkpoint:save', { id: 'start' });
  for (let i = 0; i < 100; i += 1) story.update(0);
  assert.equal(log.radio.length, 0);
  story.update(0.1);
  assert.equal(log.radio.length, 1);
});

test('starting a new heist resets once-only lines', () => {
  const { events, log, drain } = setup();
  events.emit('checkpoint:save', { id: 'start' });
  events.emit('pickpocket:complete', {});
  drain();
  events.emit('checkpoint:save', { id: 'start' });
  events.emit('pickpocket:complete', {});
  drain();
  assert.equal(log.radio.filter((t) => t.startsWith('Smooth')).length, 2);
});

test('urgent lines interrupt the briefing, which then carries on', () => {
  const { events, story, log, drain } = setup();
  events.emit('checkpoint:save', { id: 'start' });
  story.update(0.1);
  events.emit('player:detected', { id: 'okafor' });
  drain();
  assert.match(log.radio[1], /seen you|Spotted/);
  assert.equal(log.radio.length, 5);
});

test('alarm lines play only when the alarm rises, with a cooldown', () => {
  const { events, log, drain } = setup();
  events.emit('alarm:level', { level: { id: 'suspicious' }, previous: { id: 'quiet' } });
  events.emit('alarm:level', { level: { id: 'quiet' }, previous: { id: 'suspicious' } });
  events.emit('alarm:level', { level: { id: 'suspicious' }, previous: { id: 'quiet' } });
  drain(5);
  assert.equal(log.radio.length, 1);
  drain(30);
  events.emit('alarm:level', { level: { id: 'suspicious' }, previous: { id: 'quiet' } });
  drain(5);
  assert.equal(log.radio.length, 2);
});

test('guards bark on state changes, at most once every five seconds each', () => {
  const { events, log, drain } = setup();
  events.emit('guard:state', { id: 'okafor', state: 'investigate', previous: 'patrol' });
  events.emit('guard:state', { id: 'okafor', state: 'pursue', previous: 'investigate' });
  events.emit('guard:state', { id: 'briggs', state: 'investigate', previous: 'patrol' });
  assert.deepEqual(log.barks, ['OKAFOR: ' + BARKS.investigate[0], 'BRIGGS: ' + BARKS.investigate[1]]);
  drain(6);
  events.emit('guard:state', { id: 'okafor', state: 'patrol', previous: 'search' });
  assert.equal(log.barks.length, 3);
  drain(6);
  events.emit('guard:state', { id: 'okafor', state: 'patrol', previous: 'patrol' });
  assert.equal(log.barks.length, 3, 'a plain patrol loop is not worth a bark');
});

test('evidence shows its card and a line', () => {
  const { events, log, drain } = setup();
  events.emit('item:picked', { id: 'evidence-1', type: 'evidence', label: 'Security roster with Dex on it' });
  drain();
  assert.deepEqual(log.cards, [EVIDENCE[1].title]);
  assert.ok(log.radio.length >= 1);
});

test('Level 3 cuts comms after the betrayal, and Dex stays silent after that', () => {
  const { events, story, log, drain } = setup();
  story.setLevel(3);
  drain();
  assert.equal(log.radio[0], 'Sorry, Wren. Same as Marlowe.');
  assert.equal(log.cuts, 1);
  assert.ok(log.radio.includes('SIGNAL LOST'));
  assert.ok(story.snapshot().cut);
  const before = log.radio.length;
  events.emit('pickpocket:complete', {}); // only Dex has a line for this
  events.emit('camera:loop', {});
  drain();
  assert.equal(log.radio.length, before);
  events.emit('echo:start', {});
  drain();
  assert.equal(log.radio.at(-1), SCRIPT[3]['echo:start'].say[0][1]);
});

test('Level 2 uses its own tone and falls back to shared lines', () => {
  const { events, story, log, drain } = setup();
  story.setLevel(2);
  events.emit('safe:tumbler-set', { tumbler: 0, opened: false });
  events.emit('safe:tumbler-set', { tumbler: 2, opened: true });
  events.emit('door:opened', { id: 'vault-wing' });
  drain();
  assert.ok(log.radio.includes('One. Faster.'));
  assert.ok(log.radio.includes(SCRIPT.any['door:vault-wing'].say[0][1]));
});

test('every line has a unique, filename-safe clip id and fits on screen', () => {
  const lines = voiceLines();
  const ids = lines.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of lines) {
    assert.match(l.id, /^[a-z0-9-]+$/);
    assert.ok(l.text.length <= 130, `line too long for the radio panel: ${l.text}`);
  }
  assert.ok(lines.some((l) => l.who === DEX));
});

test('the ending depends on finding all three evidence files', () => {
  assert.equal(endingFor(3), ENDINGS.exposed);
  assert.equal(endingFor(2), ENDINGS.alone);
});
