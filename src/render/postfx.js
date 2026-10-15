import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.045 },
    uAlarm: { value: 0 },
    uGlitch: { value: 0 },
    uDampen: { value: 0 },
    uDamage: { value: 0 }
  },
  vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2 uResolution;
uniform float uVignette;
uniform float uGrain;
uniform float uAlarm;
uniform float uGlitch;
uniform float uDampen;
uniform float uDamage;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  float band = floor(uv.y * 48.0 + floor(uTime * 14.0) * 7.0);
  float tear = step(1.0 - uGlitch * 0.35, hash(vec2(band, floor(uTime * 20.0))));
  uv.x += (hash(vec2(band, uTime)) - 0.5) * 0.08 * tear * uGlitch;
  vec2 centre = uv - 0.5;
  float r = length(centre);
  uv += centre * sin(r * 18.0 - uTime * 4.0) * 0.004 * uDampen;
  float split = 0.0025 * uDampen + 0.006 * uGlitch * tear + 0.0015 * uDamage;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum) * vec3(0.7, 0.95, 1.05), uDampen * 0.45);
  float pulse = 0.5 + 0.5 * sin(uTime * 5.5);
  col = mix(col, col * vec3(1.08, 0.91, 0.91) + vec3(0.018, 0.0, 0.002) * pulse, uAlarm * smoothstep(0.25, 0.75, r) * 0.4);
  col += (hash(uv * uResolution + fract(uTime) * 100.0) - 0.5) * uGrain;
  col *= mix(1.0, smoothstep(0.85, 0.2, r), uVignette + uDamage * 0.4);
  col = mix(col, vec3(0.6, 0.0, 0.05), uDamage * smoothstep(0.3, 0.8, r) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`
};

export const QUALITY = {
  low: { pixelRatio: 0.65, bloom: false, direct: true, samples: 0, shadows: false, reflection: 0, feedRate: 4, feedWidth: 256, feedHeight: 144, mapRate: 3, crowdRate: 8, crowdLimit: 7 },
  medium: { pixelRatio: 1, bloom: true, direct: false, samples: 0, shadows: true, reflection: 0.5, feedRate: 8, feedWidth: 384, feedHeight: 216, mapRate: 6, crowdRate: 15, crowdLimit: 11 },
  high: { pixelRatio: 1.25, bloom: true, direct: false, samples: 4, shadows: true, reflection: 1, feedRate: 16, feedWidth: 480, feedHeight: 270, mapRate: 12, crowdRate: 30, crowdLimit: Infinity }
};

export function createPostFX(renderer, scene, camera, { quality = 'medium' } = {}) {
  let settings = QUALITY[quality];
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const target = () => new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: settings.samples });
  let composer = new EffectComposer(renderer, target());
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.5, 0.9);
  const output = new OutputPass();
  const grade = new ShaderPass(GradeShader);
  const state = { alarm: 0, glitch: 0, dampen: 0, damage: 0 };
  const shown = { alarm: 0, glitch: 0, dampen: 0, damage: 0 };

  function build() {
    composer.dispose();
    composer = new EffectComposer(renderer, target());
    composer.addPass(renderPass);
    if (settings.bloom) composer.addPass(bloom);
    composer.addPass(output);
    composer.addPass(grade);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
    composer.setSize(size.x, size.y);
  }

  function setQuality(name) {
    settings = QUALITY[name];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
    renderer.setSize(size.x, size.y, false);
    renderer.shadowMap.enabled = settings.shadows;
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    build();
  }

  function set(values) {
    Object.assign(state, values);
  }

  function setBloom({ strength, radius, threshold }) {
    if (strength !== undefined) bloom.strength = strength;
    if (radius !== undefined) bloom.radius = radius;
    if (threshold !== undefined) bloom.threshold = threshold;
  }

  function setSize(width, height) {
    size.set(width, height);
    composer.setSize(width, height);
    bloom.setSize(width, height);
    grade.uniforms.uResolution.value.set(width, height);
  }

  function render(dt, time, activeCamera = camera) {
    renderPass.camera = activeCamera;
    const k = Math.min(1, dt * 6);
    for (const key of Object.keys(state)) shown[key] += (state[key] - shown[key]) * k;
    const u = grade.uniforms;
    u.uTime.value = time;
    u.uAlarm.value = shown.alarm;
    u.uGlitch.value = shown.glitch;
    u.uDampen.value = shown.dampen;
    u.uDamage.value = shown.damage;
    if (settings.direct) renderer.render(scene, activeCamera);
    else composer.render(dt);
  }

  function dispose() {
    composer.dispose();
    bloom.dispose();
  }

  grade.uniforms.uResolution.value.copy(size);
  build();
  return { set, setQuality, setBloom, setSize, render, dispose, grade, bloom, get quality() { return settings; } };
}
