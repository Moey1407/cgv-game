// Shared by the menu and renderer so saved values cannot create invalid GPU sizes.
export const GRAPHICS_DEFAULTS = Object.freeze({
  quality: 'auto', renderScale: '1', shadows: true, bloom: true, grain: true,
  reflections: true, vignette: true, brightness: 1, fov: 68, reducedMotion: false, showFps: false,
});

export const GRAPHICS_KEYS = Object.freeze(Object.keys(GRAPHICS_DEFAULTS));
export const GRAPHICS_PRESETS = Object.freeze({
  performance: { ...GRAPHICS_DEFAULTS, quality: 'low', renderScale: '0.75', shadows: false, reflections: false, bloom: false, grain: false },
  balanced: { ...GRAPHICS_DEFAULTS, quality: 'medium' },
  cinematic: { ...GRAPHICS_DEFAULTS, quality: 'high' },
});

export function normaliseGraphics(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const result = { ...GRAPHICS_DEFAULTS };
  for (const [name, fallback] of Object.entries(result)) {
    if (typeof fallback === 'boolean' && typeof source[name] === 'boolean') result[name] = source[name];
  }
  if (['auto', 'low', 'medium', 'high'].includes(source.quality)) result.quality = source.quality;
  if (['0.5', '0.75', '1', '1.25'].includes(String(source.renderScale))) result.renderScale = String(source.renderScale);
  for (const [key, min, max] of [['brightness', 0.7, 1.5], ['fov', 55, 90]]) {
    const n = Number(source[key]);
    if (source[key] != null && Number.isFinite(n)) result[key] = Math.min(max, Math.max(min, n));
  }
  return result;
}
