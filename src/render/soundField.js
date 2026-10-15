import * as THREE from 'three';

export const MAX_RINGS = 12;
export const RING_BAND = 0.55;

const vertexHead = `
varying vec3 vSfWorld;
varying vec3 vSfNormal;
`;

const vertexBody = `
vec4 sfPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
sfPosition = instanceMatrix * sfPosition;
#endif
vSfWorld = (modelMatrix * sfPosition).xyz;
vSfNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const fragmentHead = `
#define SF_MAX ${MAX_RINGS}
uniform vec4 uRingPos[SF_MAX];
uniform vec4 uRingColor[SF_MAX];
uniform float uRingBand;
uniform float uRingGain;
varying vec3 vSfWorld;
varying vec3 vSfNormal;
`;

const fragmentBody = `
vec3 sfAccum = vec3(0.0);
for (int i = 0; i < SF_MAX; i++) {
  vec4 rp = uRingPos[i];
  vec4 rc = uRingColor[i];
  if (rc.a <= 0.0) continue;
  float d = length(vSfWorld.xz - rp.xz);
  float shell = 1.0 - smoothstep(0.0, uRingBand, abs(d - rp.w));
  float inner = step(d, rp.w) * (1.0 - smoothstep(0.0, uRingBand * 5.0, rp.w - d)) * 0.22;
  float ground = clamp(vSfNormal.y, 0.0, 1.0);
  float spill = exp(-max(vSfWorld.y - rp.y, 0.0) * 1.6) * 0.35;
  sfAccum += rc.rgb * (shell + inner) * rc.a * max(ground, spill);
}
totalEmissiveRadiance += sfAccum * uRingGain;
`;

export function createSoundField({ band = RING_BAND, gain = 2.2 } = {}) {
  const uniforms = {
    uRingPos: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4(0, -999, 0, 0)) },
    uRingColor: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uRingBand: { value: band },
    uRingGain: { value: gain }
  };
  const rings = [];
  const patched = new WeakSet();

  function emit(position, color, maxRadius, { speed = 9, strength = 1, source = 'unknown' } = {}) {
    if (rings.length >= MAX_RINGS) rings.shift();
    const ring = {
      position: new THREE.Vector3().copy(position),
      color: new THREE.Color(color),
      radius: 0,
      maxRadius,
      speed,
      strength,
      source,
      life: 1
    };
    rings.push(ring);
    return ring;
  }

  function update(dt) {
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i];
      ring.radius += ring.speed * dt;
      ring.life = Math.max(0, 1 - ring.radius / ring.maxRadius);
      if (ring.life <= 0) rings.splice(i, 1);
    }
    for (let i = 0; i < MAX_RINGS; i += 1) {
      const ring = rings[i];
      const pos = uniforms.uRingPos.value[i];
      const col = uniforms.uRingColor.value[i];
      if (!ring) {
        col.w = 0;
        continue;
      }
      pos.set(ring.position.x, ring.position.y, ring.position.z, ring.radius);
      col.set(ring.color.r, ring.color.g, ring.color.b, ring.life * ring.strength);
    }
  }

  function patch(material) {
    if (patched.has(material)) return material;
    patched.add(material);
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      if (previous) previous(shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + vertexHead)
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + vertexBody);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + fragmentHead)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + fragmentBody);
    };
    const key = material.customProgramCacheKey?.bind(material);
    material.customProgramCacheKey = () => (key ? key() : '') + '|soundField';
    material.needsUpdate = true;
    return material;
  }

  function patchObject(root) {
    root.traverse((child) => {
      if (!child.isMesh) return;
      const list = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of list) if (material && 'emissive' in material) patch(material);
    });
    return root;
  }

  function reached(point, ring) {
    const d = Math.hypot(point.x - ring.position.x, point.z - ring.position.z);
    return Math.abs(d - ring.radius) <= band;
  }

  function clear() {
    rings.length = 0;
    update(0);
  }

  return { uniforms, rings, emit, update, patch, patchObject, reached, clear };
}
