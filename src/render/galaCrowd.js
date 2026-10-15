import * as THREE from 'three';
import { createPerson } from './people.js';
import { createGuestMotion } from '../gameplay/guestMotion.js';

export function createGalaCrowd(definitions = [], { canStand = () => true, onStep = () => {} } = {}) {
  const root = new THREE.Group();
  root.name = 'formal-gala-crowd';
  const people = definitions.map((guest, order) => {
    const actor = createPerson({ ...guest, position: new THREE.Vector3(guest.x, 0, guest.z), rotationY: guest.rotation ?? 0, phase: order * 1.73 });
    root.add(actor.root); return actor;
  });
  const motion = definitions.map((guest, index) => createGuestMotion(guest, index, { canStand }));
  const distance = people.map(() => 0);
  let previous = 0;
  return { root, get count() { return people.length; },
    get witnesses() { return people.filter((a) => root.visible && a.root.visible).map((a) => ({ x: a.root.position.x, z: a.root.position.z, rotation: a.root.rotation.y })); },
    setLimit(limit) { people.forEach((actor, index) => { actor.root.visible = index < limit; }); },
    update(time) {
      const dt = Math.min(0.2, Math.max(0, time - previous)); previous = time;
      people.forEach((actor, index) => {
        if (!actor.root.visible) return;
        const pose = motion[index].update(dt, (x, z) => people.some((other) => other !== actor && other.root.visible && Math.hypot(other.root.position.x - x, other.root.position.z - z) < .6));
        distance[index] += Math.hypot(pose.x - actor.root.position.x, pose.z - actor.root.position.z);
        actor.root.position.set(pose.x, 0, pose.z); actor.root.rotation.y = pose.yaw;
        actor.play(pose.moving ? 'walk' : 'idle'); actor.update(dt);
        if (distance[index] > .65) { distance[index] = 0; onStep(actor.root.position); }
      });
    },
    dispose() { people.forEach((actor) => actor.dispose()); root.clear(); }
  };
}
