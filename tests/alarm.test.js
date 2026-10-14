import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';
import { ALARM_RAISE, createAlarmSystem } from '../src/gameplay/alarm.js';

test('alarm escalates through four readable states and scales guards', () => {
  const events = createEventBus();
  const levels = [];
  events.on('alarm:level', ({ level }) => levels.push(level.id));
  const alarm = createAlarmSystem({ events });
  alarm.raise(ALARM_RAISE.camera, 'camera');
  assert.equal(alarm.snapshot().level.id, 'quiet');
  alarm.raise(ALARM_RAISE.sonar, 'sonar');
  assert.equal(alarm.snapshot().level.id, 'suspicious');
  alarm.raise(ALARM_RAISE.detected, 'detected');
  assert.equal(alarm.snapshot().level.id, 'alert');
  alarm.raise(ALARM_RAISE.laser, 'laser');
  assert.equal(alarm.snapshot().level.id, 'lockdown');
  assert.ok(alarm.snapshot().guardSpeed > 1);
  assert.ok(alarm.snapshot().pulseInterval < 1);
  assert.deepEqual(levels, ['suspicious', 'alert', 'lockdown']);
});

test('alarm waits before decaying and never drops below a lockdown-floor', () => {
  const alarm = createAlarmSystem({ decayDelay: 2, decayPerSecond: 10 });
  alarm.raise(60, 'detected');
  alarm.update(1);
  assert.equal(alarm.snapshot().value, 60);
  alarm.update(1);
  assert.equal(alarm.snapshot().value, 50);
  alarm.setFloor(55);
  alarm.update(10);
  assert.equal(alarm.snapshot().value, 55);
  assert.equal(alarm.snapshot().level.id, 'alert');
});

test('paused or exposed play can suppress alarm decay', () => {
  const alarm = createAlarmSystem({ decayDelay: 0, decayPerSecond: 10 });
  alarm.raise(30, 'noise');
  alarm.update(1, { canDecay: false });
  assert.equal(alarm.snapshot().value, 30);
});
