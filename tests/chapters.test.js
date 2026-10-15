import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, chapterFor, lessonDiagram } from '../src/game/chapters.js';
import { createChapterConversation } from '../src/gameplay/chapterConversation.js';
import { CINEMATICS, SCRIPT } from '../src/story.js';
import { voiceJobs } from '../src/voiceScript.js';

test('each briefing has three clear goals, four essential controls and a distinct teaching diagram', () => {
  for (const n of [1, 2, 3]) {
    const c = chapterFor(n); assert.equal(c.goals.length, 3); assert.equal(c.keys.length, 4);
    assert.ok(c.watch && c.story && c.image && c.result);
    assert.match(lessonDiagram(n), /<svg/); assert.match(lessonDiagram(n), /aria-label/);
  }
  assert.equal(chapterFor(0), CHAPTERS[1]);
  assert.notEqual(lessonDiagram(1), lessonDiagram(3));
});
test('completion dialogue connects both time jumps and is included in the recording export', () => {
  const jobs = voiceJobs();
  for (const key of ['after1', 'after2']) {
    assert.equal(CINEMATICS[key].length, 3);
    CINEMATICS[key].forEach((f, i) => assert.ok(jobs.some((j) => j.id === `cinematic-${key}-${i + 1}` && j.text === f.dialogue)));
  }
  assert.match(CINEMATICS.after1[1].dialogue, /one-thirty/);
  assert.match(CINEMATICS.after2[1].dialogue, /Marlowe/);
  assert.ok(!SCRIPT[3]['level:start'].say.some((line) => Array.isArray(line) && line[0] === 'DEX'), 'do not replay the betrayal after the completion conversation');
});
test('conversation waits for input, reveals unfinished text, and finishes only once', () => {
  const c = createChapterConversation([{ dialogue: 'First line.' }, { dialogue: 'Second line.' }]);
  c.tick(100); assert.equal(c.index, 0, 'time alone does not skip dialogue');
  assert.equal(c.next(), 'line'); assert.equal(c.index, 1); assert.equal(c.text, '');
  assert.equal(c.next(), 'reveal'); assert.equal(c.text, 'Second line.');
  assert.equal(c.next(), 'complete'); assert.equal(c.next(), 'waiting');
});
