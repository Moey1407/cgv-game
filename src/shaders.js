import * as THREE from 'three';

export const MAX_RINGS = 8;

export function createSoundUniforms() {
  return {
    uTime: { value: 0 },
    uAmbient: { value: 0.2 },
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
  '  for(int i=0;i<8;i++){',
  '    vec3 toRing = uRings[i].xyz - vWorldPos;',
  '    float d = length(toRing);',
  '    float band = abs(d - uRings[i].w);',
  '    float shell = 1.0 - smoothstep(0.06, 0.58, band);',
  '    float echoBand = abs(d - max(0.0, uRings[i].w - 1.15));',
  '    float echo = 1.0 - smoothstep(0.03, 0.22, echoBand);',
  '    float facing = 0.42 + 0.58 * abs(dot(n, normalize(toRing + vec3(0.0001))));',
  '    colour += uRingColors[i] * (shell + echo * 0.22) * uRingLife[i] * facing * 2.4;',
  '  }',
  '  float micro = (hash(floor(vWorldPos.xz * 4.0)) - 0.5) * 0.012;',
  '  colour += micro;',
  '  float fog = smoothstep(29.0, 54.0, distance(cameraPosition, vWorldPos));',
  '  colour = mix(colour, vec3(0.002,0.005,0.009), fog);',
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
