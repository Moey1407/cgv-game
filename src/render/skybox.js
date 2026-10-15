import * as THREE from 'three';

const vertexShader = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uNight;
uniform float uAlarm;
uniform vec3 uMoonDir;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float skyline(float a) {
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    float s = 6.0 + float(i) * 9.0;
    float c = floor(a * s);
    h = max(h, (0.02 + hash(vec2(c, float(i))) * 0.09) * (1.0 - float(i) * 0.25));
  }
  return h;
}

void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 dusk = mix(vec3(0.42, 0.22, 0.16), vec3(0.05, 0.08, 0.18), smoothstep(0.0, 0.5, y));
  vec3 night = mix(vec3(0.05, 0.07, 0.12), vec3(0.005, 0.01, 0.03), smoothstep(0.0, 0.6, y));
  vec3 col = mix(dusk, night, uNight);
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(y, -1.0, 1.0))) * 120.0;
  float star = step(0.996, hash(floor(sp))) * smoothstep(0.05, 0.3, y);
  col += vec3(star) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(floor(sp)) * 20.0)) * uNight;
  float m = max(dot(d, normalize(uMoonDir)), 0.0);
  col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9994, 0.9997, m) + pow(m, 64.0) * 0.25) * uNight;
  float clouds = noise(d.xz / max(y, 0.05) * 1.4 + uTime * 0.01);
  col = mix(col, col * 1.6 + vec3(0.02), smoothstep(0.55, 0.8, clouds) * smoothstep(0.05, 0.4, y) * 0.5);
  float a = atan(d.z, d.x) / 6.28318 + 0.5;
  float city = step(y, skyline(a));
  vec2 win = vec2(a * 900.0, y * 400.0);
  float lit = step(0.72, hash(floor(win))) * step(0.3, fract(win.x)) * step(0.3, fract(win.y));
  vec3 cityCol = vec3(0.012, 0.016, 0.024) + vec3(1.0, 0.75, 0.4) * lit * 0.5;
  col = mix(col, cityCol, city);
  col += vec3(1.0, 0.55, 0.25) * exp(-abs(y) * 22.0) * 0.12 * (1.0 - city);
  col = mix(col, col * vec3(1.4, 0.4, 0.45), uAlarm * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSkybox({ radius = 400 } = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uAlarm: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(-0.6, 0.45, -0.4) }
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  function setMode(mode) {
    uniforms.uNight.value = mode === 'gala' ? 0 : 1;
    uniforms.uAlarm.value = mode === 'lockdown' ? 1 : 0;
  }
  function update(dt, time, camera) {
    uniforms.uTime.value = time;
    if (camera) mesh.position.copy(camera.position);
  }
  return { mesh, uniforms, setMode, update };
}
