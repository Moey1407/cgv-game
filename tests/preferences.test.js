import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAPHICS_DEFAULTS, GRAPHICS_PRESETS, normaliseGraphics } from '../src/render/preferences.js';
import { DEFAULT_OPTIONS, loadOptions } from '../src/screens.js';
import { createCredits } from '../src/credits.js';
import { wovenCarpet } from '../src/render/materials.js';
import { createPostFX } from '../src/render/postfx.js';
import * as THREE from 'three';

test('legacy saved options acquire the new graphics defaults', () => {
  const options = loadOptions({ getItem: () => '{"quality":"high","music":0.2,"grain":false}' });
  assert.equal(options.quality, 'high'); assert.equal(options.music, 0.2); assert.equal(options.grain, false);
  for (const key of ['reflections', 'vignette', 'fov', 'brightness']) assert.equal(options[key], GRAPHICS_DEFAULTS[key]);
});

test('stored graphics values are finite and bounded; unknown keys are discarded', () => {
  assert.deepEqual(normaliseGraphics(null), { ...GRAPHICS_DEFAULTS });
  const options = loadOptions({ getItem: () => JSON.stringify({ renderScale: 90, brightness: -10, fov: 999, quality: 'ultra', shadows: 'false', master: 12, sensitivity: 'invalid', bogus: 'ignored' }) });
  assert.equal(options.renderScale, '1'); assert.equal(options.brightness, 0.7); assert.equal(options.fov, 90);
  assert.equal(options.quality, 'auto'); assert.equal(options.shadows, true);
  assert.equal(options.master, 1); assert.equal(options.sensitivity, DEFAULT_OPTIONS.sensitivity);
  assert.equal(options.bogus, undefined);
  assert.equal(normaliseGraphics({ renderScale: 0.5 }).renderScale, '0.5');
});

test('performance preset actually disables expensive graphics', () => {
  const p = normaliseGraphics(GRAPHICS_PRESETS.performance);
  assert.equal(p.quality, 'low'); assert.equal(p.renderScale, '0.75');
  for (const key of ['shadows', 'reflections', 'bloom', 'grain']) assert.equal(p[key], false);
});

test('brightness and effect toggles do not resize targets; a preset changes resolution once', () => {
  const old = globalThis.window; globalThis.window = { devicePixelRatio: 1 };
  let ratio = 1, resizes = 0;
  const renderer = {
    getSize: (v) => v.set(800, 600), getPixelRatio: () => ratio,
    setPixelRatio: (n) => { ratio = n; resizes++; }, shadowMap: {},
  };
  let fx;
  try {
    fx = createPostFX(renderer, new THREE.Scene(), new THREE.PerspectiveCamera());
    fx.setPreferences(GRAPHICS_DEFAULTS, 'medium'); resizes = 0;
    fx.setPreferences({ brightness: 1.2, grain: false, reflections: false });
    assert.equal(resizes, 0); assert.equal(renderer.toneMappingExposure, 1.2);
    fx.setPreferences({ ...GRAPHICS_PRESETS.performance }, 'low');
    assert.equal(resizes, 1); assert.equal(ratio, 0.65 * 0.75);
    fx.setPreferences({ brightness: 1.1 }); assert.equal(resizes, 1);
    assert.equal(renderer.shadowMap.enabled, false);
  } finally { fx?.dispose(); globalThis.window = old; }
});

function creditsFixture(reduced = false) {
  class Element {
    constructor() { this.handlers = {}; this.dataset = {}; this.tagName = 'DIV'; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    setAttribute(name, value) { this[name] = value; }
  }
  const view = Object.assign(new Element(), { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 });
  const toggle = new Element(), speed = Object.assign(new Element(), { value: '1' }), close = new Element();
  const dialog = Object.assign(new Element(), {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; this.handlers.close(); },
    querySelector(selector) { return ({ '.credits-viewport': view, '[data-credits="toggle"]': toggle, '[data-credits="speed"]': speed, '#close-credits': close })[selector]; },
  });
  let next = 0; const frames = new Map();
  const win = { requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); }, matchMedia: () => ({ matches: reduced }) };
  const controller = createCredits({ dialog, doc: { defaultView: win } });
  return { dialog, view, toggle, frames, controller,
    tick(now) { const list = [...frames.values()]; frames.clear(); for (const fn of list) fn(now); },
    click(action) { dialog.handlers.click({ target: { closest: () => ({ dataset: { credits: action } }) } }); },
  };
}

test('credits can pause, replay, stop at the end, and reopen without duplicate timers', () => {
  const f = creditsFixture(); f.controller.open(); f.tick(0); f.tick(40);
  assert.ok(f.view.scrollTop > 0);
  f.click('toggle'); assert.equal(f.frames.size, 0); assert.equal(f.toggle['aria-pressed'], 'false');
  f.click('restart'); assert.equal(f.view.scrollTop, 0); assert.equal(f.frames.size, 1);
  f.controller.open(); assert.equal(f.frames.size, 1);
  f.view.scrollTop = 1500; f.tick(100); assert.equal(f.frames.size, 0);
  f.dialog.close(); f.controller.open(); assert.equal(f.view.scrollTop, 0); assert.equal(f.frames.size, 1);
  f.dialog.close(); assert.equal(f.frames.size, 0);
});

test('reduced-motion credits start stationary and manual scrolling pauses playback', () => {
  const f = creditsFixture(true); f.controller.open(); assert.equal(f.frames.size, 0);
  f.click('toggle'); assert.equal(f.frames.size, 1);
  f.view.handlers.wheel(); assert.equal(f.frames.size, 0);
});

test('credits accumulate fractional movement on high-refresh screens', () => {
  const f = creditsFixture(); let rounded = 0;
  Object.defineProperty(f.view, 'scrollTop', { get: () => rounded, set: (v) => { rounded = Math.round(v); } });
  f.controller.open(); f.tick(0);
  for (let i = 1; i <= 144; i++) f.tick(i * 1000 / 144);
  assert.ok(rounded >= 35 && rounded <= 37);
  f.dialog.close();
});

test('carpet builds seeded colour and non-flat normal maps without external assets', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement() {
    const canvas = { width: 0, height: 0 }; let data;
    canvas.getContext = () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (img) => { data = img; }, getImageData: () => data,
    });
    return canvas;
  } };
  try {
    const a = wovenCarpet({ size: 32 }), b = wovenCarpet({ size: 32 });
    const colour = a.colour.getContext('2d').getImageData().data;
    const normal = a.normal.getContext('2d').getImageData().data;
    assert.deepEqual(colour, b.colour.getContext('2d').getImageData().data);
    assert.equal(colour.length, 32 * 32 * 4);
    assert.ok(colour.some((n, i) => i % 4 === 0 && n !== colour[0]));
    assert.ok(normal.some((n, i) => i % 4 === 0 && Math.abs(n - 128) > 2));
    assert.equal(normal[3], 255);
  } finally { globalThis.document = previous; }
});
