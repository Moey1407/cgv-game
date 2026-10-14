import * as THREE from 'three';
import { hasClearAccess } from './interactions.js';

export const ESCAPE_EXIT = new THREE.Vector3(0, 0, -20.5);
export const OVERRIDE_SECONDS = 3.5;
export const ESCAPE_DOORS = [{ id: 1, x: 0, z: 8 }, { id: 2, x: 9, z: -8 }];

export function createEscapeMission({ level, colliders, createLabelPanel }) {
  const group = new THREE.Group();
  level.add(group);
  const doors = ESCAPE_DOORS.map((config) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.4, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x14222b, emissive: 0x21545b,
        emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.35 }));
    panel.position.set(config.x, 2.2, config.z);
    group.add(panel);
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x21545b });
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.4, 0.18), frameMaterial);
      post.position.set(config.x + side * 1.68, 2.2, config.z);
      group.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 0.18), frameMaterial);
    lintel.position.set(config.x, 4.4, config.z);
    group.add(lintel);
    const label = createLabelPanel('OVERRIDE 0' + config.id, 2.7);
    label.position.set(config.x, 4.0, config.z + 0.25);
    group.add(label);
    const reader = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffa43b }));
    reader.position.set(config.x + 1.1, 1.5, config.z + 0.29);
    group.add(reader);
    const collider = { stage: 3, minX: config.x - 1.6, maxX: config.x + 1.6,
      minZ: config.z - 0.225, maxZ: config.z + 0.225, disabled: false };
    colliders.push(collider);
    return { ...config, panel, label, reader, collider, opened: false,
      progress: 0, noiseTimer: 0, access: new THREE.Vector3(config.x, 1.5, config.z + 1.05) };
  });
  // Small emergency floor lamps form landmarks between the two barriers.
  for (const [x, z] of [[0, 14], [0, 4], [9, -3], [9, -13], [0, -19]]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.025, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x76ffb2 }));
    lamp.position.set(x, 0.04, z);
    group.add(lamp);
  }
  let finished = false;

  function eligible(player, yaw, pitch = 0) {
    return doors.find((door) => {
      if (door.opened || !hasClearAccess(player, door.access, colliders, 3, 2.1)) return false;
      const dx = door.x - player.x, dz = door.z - player.z;
      const distance = Math.hypot(dx, dz);
      return distance > 0 && (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / distance * Math.cos(pitch) >= 0.55;
    });
  }
  function cancel() {
    for (const door of doors) { door.progress = 0; door.noiseTimer = 0; }
  }
  function canEscape(player, hasDiamond) {
    return hasDiamond && doors.every((door) => door.opened) &&
      hasClearAccess(player, ESCAPE_EXIT, colliders, 3, 1.8);
  }
  function openDoor(id) {
    const door = doors.find((candidate) => candidate.id === id);
    if (!door || door.opened) return false;
    door.opened = door.collider.disabled = true;
    door.progress = door.noiseTimer = 0;
    door.panel.visible = false;
    door.reader.material.color.setHex(0x76ffb2);
    return true;
  }
  return {
    doors, eligible, cancel, canEscape, openDoor,
    reset(stage) {
      group.visible = stage === 3;
      finished = false;
      for (const door of doors) {
        door.opened = door.collider.disabled = false;
        door.progress = door.noiseTimer = 0;
        door.panel.visible = true;
        door.reader.material.color.setHex(0xffa43b);
      }
    },
    update({ dt, player, yaw, pitch = 0, holding, active, hasDiamond, escapePlayer = player }) {
      const result = { noises: [], opened: [], finished: false };
      if (!active || finished) { cancel(); return result; }
      const focused = holding ? eligible(player, yaw, pitch) : null;
      for (const door of doors) {
        if (door !== focused) { door.progress = door.noiseTimer = 0; continue; }
        if (dt <= 0) continue;
        door.progress = Math.min(OVERRIDE_SECONDS, door.progress + dt);
        door.noiseTimer -= dt;
        if (door.noiseTimer <= 0) {
          door.noiseTimer = 1;
          result.noises.push({ position: new THREE.Vector3(player.x, 0.6, player.z), radius: 7, source: 'override' });
        }
        if (door.progress >= OVERRIDE_SECONDS) {
          if (openDoor(door.id)) result.opened.push(door.id);
        }
      }
      if (canEscape(escapePlayer, hasDiamond)) {
        finished = result.finished = true;
      }
      return result;
    }
  };
}
