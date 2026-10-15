import * as THREE from 'three';

const vertexHead = `
varying vec3 vHoloWorld;
`;

const vertexBody = `
vHoloWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const fragmentHead = `
uniform float uHoloTime;
uniform float uHoloDissolve;
uniform float uHoloFlicker;
uniform vec3 uHoloColor;
varying vec3 vHoloWorld;
float holoHash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 51.3))) * 43758.5453); }
float holoNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(holoHash(i), holoHash(i + vec3(1,0,0)), f.x), mix(holoHash(i + vec3(0,1,0)), holoHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(holoHash(i + vec3(0,0,1)), holoHash(i + vec3(1,0,1)), f.x), mix(holoHash(i + vec3(0,1,1)), holoHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

const fragmentBody = `
float holoN = holoNoise(vHoloWorld * 6.0 + vec3(0.0, uHoloTime * 0.6, 0.0));
float holoCut = holoN - uHoloDissolve * 1.1 + 0.05;
if (holoCut < 0.0) discard;
float holoEdge = 1.0 - smoothstep(0.0, 0.08, holoCut);
vec3 holoN3 = normalize(vNormal);
float holoFres = pow(1.0 - abs(dot(holoN3, normalize(vViewPosition))), 2.2);
float holoScan = 0.55 + 0.45 * step(0.5, fract(vHoloWorld.y * 28.0 - uHoloTime * 1.8));
float holoBand = smoothstep(0.0, 0.02, abs(fract(vHoloWorld.y * 0.6 - uHoloTime * 0.5) - 0.5)) * 0.4 + 0.6;
float holoFlick = 1.0 - uHoloFlicker * step(0.92, holoHash(vec3(floor(uHoloTime * 18.0))));
vec3 holoCol = uHoloColor * (0.18 + holoFres * 1.7) * holoScan * holoBand * holoFlick + vec3(1.0, 0.95, 0.9) * holoEdge * 2.5;
float holoAlpha = clamp((0.22 + holoFres * 0.75) * holoScan * holoFlick + holoEdge, 0.0, 1.0);
gl_FragColor = vec4(holoCol, holoAlpha);
`;

export function createHologramMaterial(colour = 0x72efff) {
  const uniforms = {
    uHoloTime: { value: 0 },
    uHoloDissolve: { value: 0 },
    uHoloFlicker: { value: 0.35 },
    uHoloColor: { value: new THREE.Color(colour) }
  };
  const material = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + vertexHead)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + vertexBody);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + fragmentHead)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + fragmentBody);
  };
  material.customProgramCacheKey = () => 'hologram';
  return { material, uniforms };
}

export function applyHologram(root, colour = 0x72efff) {
  const { material, uniforms } = createHologramMaterial(colour);
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.material = material;
    child.castShadow = false;
    child.receiveShadow = false;
    child.renderOrder = 5;
  });
  let dissolveTarget = 0;
  return {
    material,
    uniforms,
    dissolve(on = true) { dissolveTarget = on ? 1 : 0; },
    setDissolve(value) { dissolveTarget = value; uniforms.uHoloDissolve.value = value; },
    update(dt, time) {
      uniforms.uHoloTime.value = time;
      const d = uniforms.uHoloDissolve.value;
      uniforms.uHoloDissolve.value = d + (dissolveTarget - d) * Math.min(1, dt * 1.8);
    },
    get dissolved() { return uniforms.uHoloDissolve.value > 0.98; }
  };
}
