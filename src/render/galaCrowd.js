import * as THREE from 'three';
import { createPerson } from './people.js';

export function createGalaCrowd(definitions = []) {
  const root = new THREE.Group();
  root.name = 'formal-gala-crowd';
  const people = definitions.map((guest, order) => {
    const actor = createPerson({ ...guest, position: new THREE.Vector3(guest.x, 0, guest.z), rotationY: guest.rotation ?? 0, phase: order * 1.73 });
    root.add(actor.root); return actor;
  });
  let previous = 0;
  return { root, get count() { return people.length; },
    setLimit(limit) { people.forEach((actor, index) => { actor.root.visible = index < limit; }); },
    update(time) {
      const dt = Math.min(0.2, Math.max(0, time - previous)); previous = time;
      people.forEach((actor) => { if (actor.root.visible) actor.update(dt); });
    },
    dispose() { people.forEach((actor) => actor.dispose()); root.clear(); }
  };
}
