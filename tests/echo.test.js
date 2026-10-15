import test from 'node:test';
import assert from 'node:assert/strict';
import { createEchoSystem } from '../src/gameplay/echo.js';

test('Echo records at 20 Hz, rewinds, and interpolates the replay', () => {
  const echo = createEchoSystem({ sampleHz: 20, maxSeconds: 20 });
  echo.start({ x: 0, z: 0, yaw: 0 });
  for (let tick = 1; tick <= 20; tick += 1) echo.record(0.05, { x: tick, z: 0, yaw: tick / 20 });
  const rewind = echo.stop();
  assert.deepEqual({ x: rewind.x, z: rewind.z }, { x: 0, z: 0 });
  assert.equal(echo.snapshot().frameCount, 21);
  const frame = echo.replay(0.525);
  assert.ok(frame.x > 10 && frame.x < 12);
  assert.equal(frame.done, false);
});

test('Echo caps recording duration and can be shattered once by a guard', () => {
  const echo = createEchoSystem({ sampleHz: 20, maxSeconds: 1 });
  echo.start({ x: 0, z: 0 });
  for (let tick = 0; tick < 40; tick += 1) echo.record(0.05, { x: tick, z: 0 });
  assert.equal(echo.snapshot().mode, 'replaying');
  assert.ok(echo.snapshot().frameCount <= 21);
  assert.equal(echo.shatter('guard'), true);
  assert.equal(echo.shatter('guard'), false);
});
