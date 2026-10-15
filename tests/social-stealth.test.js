import test from 'node:test';
import assert from 'node:assert/strict';
import { galaCover, galaWitnessNearby } from '../src/gameplay/socialStealth.js';

test('an unknown, normally moving gala guest does not expose herself to Okafor', () => {
  assert.deepEqual(galaCover({ z: -12, movement: 'run' }), { safe: true, reason: 'BLENDING IN' });
  assert.deepEqual(galaCover({ z: -12, movement: 'walk' }), { safe: true, reason: 'BLENDING IN' });
});

test('copying a badge breaks cover, and guests only witness within a readable viewing area', () => {
  assert.equal(galaCover({ lifting: true }).safe, false);
  assert.equal(galaCover({ movement: 'walk', gadgetHeat: 0, compromised: true }).safe, false, 'identified guests cannot regain cover just by waiting');
  assert.equal(galaWitnessNearby({ x: 0, z: 4 }, [{ x: 0, z: 0, rotation: 0 }]), true);
  assert.equal(galaWitnessNearby({ x: 0, z: -4 }, [{ x: 0, z: 0, rotation: 0 }]), false);
  assert.equal(galaWitnessNearby({ x: 0, z: 8 }, [{ x: 0, z: 0, rotation: 0 }]), false);
});

test('obvious stealth behaviour, gadgets and staff-only areas break the disguise', () => {
  assert.equal(galaCover({ z: -12, movement: 'crouch' }).safe, false);
  assert.equal(galaCover({ z: -12, movement: 'crawl' }).safe, false);
  assert.equal(galaCover({ z: -12, movement: 'sprint' }).safe, false);
  assert.equal(galaCover({ z: -12, movement: 'walk', gadgetHeat: 1 }).safe, false);
  assert.deepEqual(galaCover({ z: -31, movement: 'walk' }), { safe: false, reason: 'STAFF ONLY' });
});
