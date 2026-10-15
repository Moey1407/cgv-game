import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceJobs } from '../src/voiceScript.js';
import { barkClipId } from '../src/voiceIds.js';

test('every cast role has stable unique filenames, including the intro and security reactions', () => {
  const jobs = voiceJobs();
  assert.equal(new Set(jobs.map((job) => job.id)).size, jobs.length);
  assert.deepEqual([...new Set(jobs.map((job) => job.who))].sort(), ['BRIGGS', 'CONTROL', 'DEX', 'OKAFOR', 'SWEEP TEAM', 'WREN']);
  for (const job of jobs) { assert.match(job.id, /^[a-z0-9-]+$/); assert.ok(job.text.trim()); }
  assert.ok(jobs.some((job) => job.id === 'cinematic-opening-2'));
  assert.ok(jobs.some((job) => job.id === barkClipId('control', 'camera', 0)));
  assert.ok(jobs.some((job) => job.id === barkClipId('okafor', 'warning', 0)));
});
