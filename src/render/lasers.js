import * as THREE from 'three';

const vertexShader = `
varying vec3 vNormalV;
varying vec3 vViewDir;
varying float vAlong;
void main() {
  vAlong = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = `
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
uniform float uCore;
uniform float uLength;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying float vAlong;

float hash(float p) { return fract(sin(p * 91.345) * 47453.21); }

void main() {
  float facing = abs(dot(normalize(vNormalV), normalize(vViewDir)));
  float profile = uCore > 0.5 ? pow(facing, 1.5) : pow(facing, 3.0) * 0.55;
  float x = vAlong * uLength * 6.0 - uTime * 9.0;
  float shimmer = 0.8 + 0.2 * mix(hash(floor(x)), hash(floor(x) + 1.0), fract(x));
  float flicker = 0.92 + 0.08 * sin(uTime * 63.0);
  vec3 col = mix(uColor, vec3(1.0, 0.9, 0.92), uCore * facing * 0.8);
  gl_FragColor = vec4(col * profile * shimmer * flicker * uIntensity, profile * uIntensity);
}
`;

function beamMaterial(colour, core) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colour) },
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uCore: { value: core ? 1 : 0 },
      uLength: { value: 1 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((point.x - a.x) * dx + (point.y - a.y) * dy + (point.z - a.z) * dz) / Math.max(dx * dx + dy * dy + dz * dz, 1e-6), 0, 1);
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t, point.z - a.z - dz * t);
}

export function createLaserSystem(scene, { colour = 0xff2a4d } = {}) {
  const group = new THREE.Group();
  group.name = 'lasers';
  scene.add(group);
  const lasers = [];
  const emitterMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1016, emissive: 0xff2a4d, emissiveIntensity: 0.6, roughness: 0.4 });
  const up = new THREE.Vector3(0, 1, 0);
  const probe = new THREE.Vector3();
  const mounts = [];
  const casing = new THREE.MeshStandardMaterial({ color: 0x87939f, metalness: 0.65, roughness: 0.5 });

  function add({ start, end, pattern = 'static', amplitude = 0.6, speed = 1, phase = 0, period = 4 }) {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8, 1, true), beamMaterial(colour, true));
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 16, 1, true), beamMaterial(colour, false));
    const emitters = [start, end].map(() => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), emitterMaterial);
      group.add(m);
      return m;
    });
    for (const point of [start, end]) {
      const vertical = pattern === 'rise' || pattern === 'sweep';
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, vertical ? amplitude * 2 + 0.35 : 0.36, 0.26), casing);
      rail.position.copy(point); group.add(rail); mounts.push(rail);
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.3), casing);
      bracket.position.copy(point); group.add(bracket); mounts.push(bracket);
    }
    group.add(core, glow);
    const laser = {
      base: { start: start.clone(), end: end.clone() },
      a: start.clone(),
      b: end.clone(),
      pattern, amplitude, speed, phase, period,
      active: true,
      core, glow, emitters
    };
    lasers.push(laser);
    place(laser);
    return laser;
  }

  function place(laser) {
    const mid = laser.a.clone().add(laser.b).multiplyScalar(0.5);
    const dir = laser.b.clone().sub(laser.a);
    const length = dir.length();
    dir.normalize();
    for (const mesh of [laser.core, laser.glow]) {
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(up, dir);
      mesh.scale.set(1, length, 1);
      mesh.material.uniforms.uLength.value = length;
      mesh.visible = laser.active;
    }
    laser.emitters[0].position.copy(laser.a);
    laser.emitters[1].position.copy(laser.b);
  }

  function update(time) {
    for (const laser of lasers) {
      const t = time * laser.speed + laser.phase;
      laser.a.copy(laser.base.start);
      laser.b.copy(laser.base.end);
      if (laser.pattern === 'rise') {
        const dy = Math.sin(t) * laser.amplitude;
        laser.a.y += dy;
        laser.b.y += dy;
      } else if (laser.pattern === 'sweep') {
        const tilt = Math.sin(t) * laser.amplitude;
        laser.a.y += tilt;
        laser.b.y -= tilt;
      } else if (laser.pattern === 'blink') {
        laser.active = (t % laser.period) < laser.period * 0.6;
      }
      for (const mesh of [laser.core, laser.glow]) mesh.material.uniforms.uTime.value = time;
      place(laser);
      laser.emitters.forEach((emitter) => { emitter.visible = laser.active; });
    }
  }

  function segments() {
    return lasers.map(({ a, b, active }) => ({ a, b, active }));
  }

  function hits(point, radius = 0.25) {
    return lasers.some((laser) => laser.active && distanceToSegment(point, laser.a, laser.b) <= radius);
  }

  function hitsBody(position, { height = 1.68, jump = 0, base = 0, radius = 0.15 } = {}) {
    const low = base + jump + radius;
    const high = Math.max(low, base + jump + height - radius + 0.05);
    const steps = Math.max(1, Math.ceil((high - low) / (radius * 1.5)));
    for (let i = 0; i <= steps; i++) if (hits(probe.set(position.x, low + (high - low) * i / steps, position.z), radius)) return true;
    return false;
  }

  function setVisible(visible) {
    group.visible = visible;
  }

  function dispose() {
    for (const laser of lasers) {
      for (const mesh of [laser.core, laser.glow, ...laser.emitters]) {
        mesh.geometry.dispose();
        if (mesh.material !== emitterMaterial) mesh.material.dispose();
      }
    }
    emitterMaterial.dispose();
    casing.dispose(); mounts.forEach((mesh) => mesh.geometry.dispose());
    scene.remove(group);
    lasers.length = 0;
  }

  return { group, lasers, add, update, segments, hits, hitsBody, setVisible, dispose };
}
