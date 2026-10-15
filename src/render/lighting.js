import * as THREE from 'three';

export const MODES = ['gala', 'night', 'lockdown'];

const PRESETS = {
  gala: { exposure: 0.85, env: 0.35, fog: 0x1a120a, fogDensity: 0.012, background: 0x0b0806, crystal: 1.6 },
  night: { exposure: 0.9, env: 0.05, fog: 0x050a14, fogDensity: 0.022, background: 0x02040a, crystal: 0.05 },
  lockdown: { exposure: 0.95, env: 0.04, fog: 0x1a0306, fogDensity: 0.03, background: 0x070102, crystal: 0.02 }
};

export function createLighting(scene, renderer, layout, materials) {
  const group = new THREE.Group();
  group.name = 'lighting';
  scene.add(group);

  const hemi = new THREE.HemisphereLight(0x5a4632, 0x120c08, 0.35);
  group.add(hemi);

  const key = new THREE.SpotLight(0xffd7a0, 260, 40, 0.95, 0.7, 1.5);
  key.position.copy(layout.key.position);
  key.target.position.copy(layout.key.target);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  group.add(key, key.target);

  const chandeliers = layout.chandeliers.map((position) => {
    const light = new THREE.PointLight(0xffc98a, 55, 24, 1.8);
    light.position.copy(position);
    group.add(light);
    return light;
  });

  const pictures = layout.pictures.map(({ position, target }) => {
    const light = new THREE.SpotLight(0xffe2b0, 28, 7, 0.75, 0.6, 1.6);
    light.position.copy(position);
    light.target.position.copy(target);
    group.add(light, light.target);
    return light;
  });

  const moon = new THREE.DirectionalLight(0x9cc4ff, 0.9);
  moon.position.copy(layout.moon.position);
  moon.target.position.copy(layout.moon.target);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25 });
  moon.shadow.bias = -0.0005;
  group.add(moon, moon.target);

  const exits = layout.exits.map((position) => {
    const light = new THREE.PointLight(0x23ff7a, 2, 3, 2);
    light.position.copy(position);
    group.add(light);
    return light;
  });

  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff2238 });
  const beacons = layout.beacons.map((position, index) => {
    const pivot = new THREE.Group();
    pivot.position.copy(position);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 16), beaconMaterial);
    pivot.add(lamp);
    const spot = new THREE.SpotLight(0xff2238, 140, 26, 0.38, 0.5, 1.4);
    const aim = new THREE.Object3D();
    aim.position.set(8, -4, 0);
    pivot.add(spot, aim);
    spot.target = aim;
    group.add(pivot);
    return { pivot, spot, phase: index * 1.7 };
  });

  let mode = 'gala';

  function setMode(next) {
    mode = next;
    const p = PRESETS[mode];
    renderer.toneMappingExposure = p.exposure;
    scene.environmentIntensity = p.env;
    scene.background = new THREE.Color(p.background);
    if (scene.fog) {
      scene.fog.color.setHex(p.fog);
      scene.fog.density = p.fogDensity;
    } else {
      scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);
    }
    const gala = mode === 'gala';
    hemi.intensity = gala ? 0.35 : mode === 'night' ? 0.25 : 0.12;
    hemi.color.setHex(gala ? 0x5a4632 : mode === 'night' ? 0x22324a : 0x3a0a10);
    key.visible = gala;
    for (const light of chandeliers) light.visible = gala;
    for (const light of pictures) light.visible = gala;
    moon.visible = !gala;
    moon.intensity = mode === 'night' ? 0.9 : 0.25;
    for (const light of exits) light.visible = !gala;
    for (const beacon of beacons) beacon.pivot.visible = mode === 'lockdown';
    if (materials?.crystal) materials.crystal.emissiveIntensity = p.crystal;
  }

  function update(dt, time) {
    if (mode !== 'lockdown') return;
    for (const beacon of beacons) {
      beacon.pivot.rotation.y = time * 2.6 + beacon.phase;
      beacon.spot.intensity = 110 + Math.sin(time * 9 + beacon.phase) * 30;
    }
  }

  setMode(mode);
  return { group, setMode, update, get mode() { return mode; }, lights: { hemi, key, chandeliers, pictures, moon, exits, beacons } };
}
