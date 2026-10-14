import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/core/events.js';

test('event bus publishes in subscription order and supports unsubscribe', () => {
  const bus = createEventBus();
  const calls = [];
  const unsubscribe = bus.on('alarm:change', ({ value }) => calls.push('a' + value));
  bus.on('alarm:change', ({ value }) => calls.push('b' + value));
  assert.equal(bus.emit('alarm:change', { value: 25 }), 2);
  unsubscribe();
  assert.equal(bus.emit('alarm:change', { value: 40 }), 1);
  assert.deepEqual(calls, ['a25', 'b25', 'b40']);
});

test('once listeners survive nested event mutation but only fire once', () => {
  const bus = createEventBus();
  let calls = 0;
  bus.once('echo:start', () => { calls += 1; });
  bus.emit('echo:start');
  bus.emit('echo:start');
  assert.equal(calls, 1);
});
