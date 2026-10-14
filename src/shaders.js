import * as THREE from 'three';

export const MAX_RINGS = 8;
export const WAVE_BAND = 0.58;
export const ECHO_OFFSET = 1.15;
export const ECHO_BAND = 0.22;

export function createSoundUniforms() {
  return {
    uTime: { value: 0 },
    uAmbient: { value: 0.2 },
    uStageTint: { value: new THREE.Color(0x72efff) },
    uStageTintStrength: { value: 0.35 },
    uFogColour: { value: new THREE.Color(0x02050a) },
    uFogNear: { value: 29 },
    uFogFar: { value: 54 },
    uRings: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Vector4(0, -100, 0, -100)) },
    uRingColors: { value: Array.from({ length: MAX_RINGS }, () => new THREE.Color(0x000000)) },
    uRingLife: { value: Array.from({ length: MAX_RINGS }, () => 0) }
  };
}

const vertexShader = [
  'varying vec3 vWorldPos;',
  'varying vec3 vWorldNormal;',
  'void main(){',
  '  vec4 worldPos = modelMatrix * vec4(position, 1.0);',
  '  vWorldPos = worldPos.xyz;',
  '  vWorldNormal = normalize(mat3(modelMatrix) * normal);',
  '  gl_Position = projectionMatrix * viewMatrix * worldPos;',
  '}'
].join('\n');

const fragmentShader = [
  'precision highp float;',
  'uniform vec3 uBaseColor;',
  'uniform float uAmbient;',
  'uniform vec3 uStageTint;',
  'uniform float uStageTintStrength;',
  'uniform vec3 uFogColour;',
  'uniform float uFogNear;',
  'uniform float uFogFar;',
  'uniform float uTime;',
  'uniform vec4 uRings[8];',
  'uniform vec3 uRingColors[8];',
  'uniform float uRingLife[8];',
  'varying vec3 vWorldPos;',
  'varying vec3 vWorldNormal;',
  'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
  'void main(){',
  '  vec3 n = normalize(vWorldNormal);',
  '  vec3 moon = normalize(vec3(-0.35, 0.82, 0.25));',
  '  float diffuse = max(dot(n, moon), 0.0);',
  '  float edge = pow(1.0 - abs(dot(n, normalize(cameraPosition - vWorldPos))), 3.0);',
  '  float skyFill = 0.08 + max(n.y, 0.0) * 0.1;',
  '  vec3 colour = uBaseColor * (uAmbient + skyFill + diffuse * 0.52) + vec3(0.025,0.07,0.09) * edge;',
  // The ambient wash gives each floor its own visual identity even before a
  // sonar pulse arrives. It is intentionally weakest during containment.
  '  colour += uStageTint * uStageTintStrength * (0.035 + uAmbient * 0.016);',
  '  for(int i=0;i<8;i++){',
  '    vec3 toRing = uRings[i].xyz - vWorldPos;',
  // The wave travels across the floor, so distance is measured on the ground
  // plane only. A spherical wave climbed up walls as it expanded; a ground
  // wave sweeps past them, which is what a sound spreading through a room
  // actually looks like from inside it.
  '    float d = length(toRing.xz);',
  '    float band = abs(d - uRings[i].w);',
  `    float shell = 1.0 - smoothstep(0.06, ${WAVE_BAND}, band);`,
  `    float echoBand = abs(d - max(0.0, uRings[i].w - ${ECHO_OFFSET}));`,
  `    float echo = 1.0 - smoothstep(0.03, ${ECHO_BAND}, echoBand);`,
  // Floors and the tops of objects carry the ripple. Walls only catch a dim
  // vertical slice as it passes, which still reveals their shape without the
  // band appearing to crawl up them.
  // Floors and the tops of objects carry the ripple. A wall catches only the
  // spill where it meets the floor, fading out within about a metre, so the
  // wave reads as something travelling along the ground rather than a band
  // painted up the walls. Enough light survives at skirting height to still
  // read the shape of a room in the dark levels.
  '    float ground = abs(n.y);',
  '    float spill = exp(-max(vWorldPos.y, 0.0) * 1.9) * 0.22;',
  '    float response = ground + (1.0 - ground) * spill;',
  '    colour += uRingColors[i] * (shell + echo * 0.22) * uRingLife[i] * response * 2.6;',
  '  }',
  '  float micro = (hash(floor(vWorldPos.xz * 4.0)) - 0.5) * 0.012;',
  '  colour += micro;',
  '  float fog = smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorldPos));',
  '  colour = mix(colour, uFogColour, fog);',
  '  gl_FragColor = vec4(colour, 1.0);',
  '}'
].join('\n');

export function createSoundMaterial(shared, colour) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uBaseColor: { value: new THREE.Color(colour) }
    },
    vertexShader,
    fragmentShader
  });
}
