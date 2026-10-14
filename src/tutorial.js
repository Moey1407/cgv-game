import * as THREE from 'three';

// ---------------------------------------------------------------------------
// TRAINING FLOOR  (stage 4)
//
// A disused service corridor under the archive where Imani tests her rig. It
// is not one of the three graded levels and never touches the campaign record:
// a marker can ignore it entirely and still play a complete game.
//
// Stage id 4, not 0, on purpose. Collider filtering throughout the codebase
// reads `box.stage && box.stage !== stage`, so a stage of 0 is falsy and every
// tutorial wall would leak into all three real levels.
//
// Five bays along one corridor, each sealed by a gate that opens when its
// lesson is done, so the player cannot wander past something they have not
// learned yet.
//
//   z=21 .. 12   bay 1   look, then move
//   z=12 ..  4   bay 2   surfaces, and moving quietly across marble
//   z= 4 .. -4   bay 3   active sonar in the dark
//   z=-4 ..-12   bay 4   throwing a decoy at a target
//   z=-12..-20   bay 5   take the dampener, then cross a live sensor
// ---------------------------------------------------------------------------

export const TUTORIAL_STAGE = 4;
// Marble runs from z=10 to z=5.5. Finishing is a short step past it onto the
// carpet landing; stepping back north of the strip clears a spoiled attempt.
export const MARBLE_START_Z = 10;
export const MARBLE_END_Z = 5.5;
export const MARBLE_CLEARED_Z = 5;
export const MARBLE_RESET_Z = 10.3;
// A beat to read the prompt after the gate opens, so holding W through the
// transition does not instantly fail the lesson.
export const MARBLE_GRACE = 1;
export const TUTORIAL_SPAWN = new THREE.Vector3(0, 0, 18);
// On the near lip of the bench, not on top of it. Interaction is a segment
// test in XZ, so a pickup centred over a solid bench is unreachable - the
// bench itself blocks the ray, the same trap the security desk documents.
export const DAMPENER_PICKUP = new THREE.Vector3(0, 1.25, -13.4);
export const DECOY_TARGET = new THREE.Vector3(4, 0, -9);
export const TUTORIAL_EXIT = new THREE.Vector3(0, 0, -19.4);
export const SENSOR_ORIGIN = new THREE.Vector3(0, 0.6, -20);

// Each step owns one lesson and one measurable completion condition. `gate`
// names the gate that opens when the step is done.
export const TUTORIAL_STEPS = [
  {
    id: 'look',
    title: 'LOOK AROUND',
    hint: 'Move the mouse, or hold the arrow keys.',
    detail: 'Your rig draws what the echoes come back to. Nothing here is lit.'
  },
  {
    id: 'move',
    title: 'MOVE',
    hint: 'W A S D to walk. Watch the rings your own footsteps make.',
    detail: 'Every step is a sound, and every sound shows the room — and you.',
    gate: 'gate-1'
  },
  {
    id: 'quiet',
    title: 'CROSS THE MARBLE QUIETLY',
    hint: 'Hold SHIFT to walk, or C to crouch. Running on marble carries twice as far.',
    detail: 'The floor decides how far you are heard. Carpet hides you; stone does not.',
    retryHint: 'Too loud. Go back onto the carpet and cross again at a walk.',
    gate: 'gate-2'
  },
  {
    id: 'sonar',
    title: 'PULSE THE DARK',
    hint: 'Press SPACE for an active pulse.',
    detail: 'One pulse lights a whole room — and tells everyone exactly where you are.',
    gate: 'gate-3'
  },
  {
    id: 'decoy',
    title: 'THROW A DECOY INTO THE MARKED RING',
    hint: 'Hold RIGHT MOUSE to aim, LEFT CLICK to throw.',
    detail: 'A noise over there is a guard walking over there.',
    gate: 'gate-4'
  },
  {
    id: 'dampener',
    title: 'TAKE THE DAMPENER, THEN CROSS THE SENSOR',
    hint: 'E to pick it up. F to run it. Cross while a sweep is passing.',
    detail: 'It scrambles your returns. You still see; nothing else resolves you.'
  }
];

// Pure completion test, so the whole sequence can be unit tested without a
// renderer. `ctx` is assembled by main.js each frame.
export function isStepComplete(step, ctx) {
  switch (step.id) {
    case 'look':
      return ctx.lookTravel > 1.6;
    case 'move':
      // The first bay runs from the spawn at z=18 to gate-1 at z=12, so only
      // about 5.3m is walkable in a straight line. Anything above that would
      // make the lesson impossible without pacing back and forth.
      return ctx.walkDistance > 4;
    case 'quiet':
      // Reached the carpet past the marble without ever running across it.
      return ctx.position.z < MARBLE_CLEARED_Z && !ctx.ranOnMarble;
    case 'sonar':
      return ctx.sonarUsed > 0;
    case 'decoy':
      return ctx.decoyLandedNearTarget;
    case 'dampener':
      return ctx.hasDampener && ctx.reachedExit;
    default:
      return false;
  }
}

// Advances at most one step per call and reports what changed, so the caller
// can open a gate, show a toast and play a cue.
export function advanceTutorial(run, ctx) {
  if (run.index >= TUTORIAL_STEPS.length) return null;
  const step = TUTORIAL_STEPS[run.index];
  if (!isStepComplete(step, ctx)) return null;
  run.index += 1;
  run.completed.push(step.id);
  return { step, finished: run.index >= TUTORIAL_STEPS.length };
}

export function createTutorialRun() {
  return { index: 0, completed: [] };
}

export function createTutorial({ level, materials, addBox, createLabelPanel }) {
  const group = new THREE.Group();
  level.add(group);

  const gates = new Map();
  const wall = (name, width, depth, x, z) => addBox(name,
    new THREE.Vector3(width, 4.2, depth), new THREE.Vector3(x, 2.1, z),
    materials.wall, true, group, TUTORIAL_STAGE);
  const label = (text, x, y, z, width, rotY = 0) => {
    const panel = createLabelPanel(text, width);
    panel.position.set(x, y, z);
    panel.rotation.y = rotY;
    group.add(panel);
  };

  // Corridor sides, running the whole length.
  wall('training-west', 0.4, 42, -6, 0);
  wall('training-east', 0.4, 42, 6, 0);
  wall('training-north', 12, 0.4, 0, -20.8);
  wall('training-south', 12, 0.4, 0, 21.2);

  // Gates. Each is a real collider that is disabled when its lesson is done.
  for (const [name, z] of [['gate-1', 12], ['gate-2', 4], ['gate-3', -4], ['gate-4', -12]]) {
    const mesh = addBox(name, new THREE.Vector3(11.6, 4.2, 0.45),
      new THREE.Vector3(0, 2.1, z), materials.dark, true, group, TUTORIAL_STAGE);
    // The collider just pushed is this gate's.
    gates.set(name, mesh);
  }

  // Bay 2: a marble strip to cross. The floor patch is drawn by main.js from
  // TUTORIAL_FLOOR so it uses the same surface colours as Level 1.
  label('MARBLE // LOUD', -5.78, 2.6, 8, 3.2, Math.PI / 2);

  // Bay 4: the decoy target.
  const target = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.95, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, depthWrite: false })
  );
  target.rotation.x = -Math.PI / 2;
  target.position.set(DECOY_TARGET.x, 0.035, DECOY_TARGET.z);
  group.add(target);
  label('TARGET', DECOY_TARGET.x, 2.4, DECOY_TARGET.z - 2.6, 2.2);

  // Bay 5: the dampener on a bench, and the sensor it teaches you to beat.
  addBox('dampener-bench', new THREE.Vector3(2.4, 1, 0.9),
    new THREE.Vector3(0, 0.5, -14.2), materials.stone, true, group, TUTORIAL_STAGE);
  const dampener = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.26, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x2a2140, emissive: 0x7b5cff,
      emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.5 })
  );
  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.045, 10, 26),
    new THREE.MeshBasicMaterial({ color: 0xc6b0ff })
  );
  coil.rotation.x = Math.PI / 2;
  coil.position.y = 0.2;
  dampener.add(shell, coil);
  dampener.position.copy(DAMPENER_PICKUP);
  group.add(dampener);
  label('DAMPENER // E', 0, 2.4, -15.9, 3);

  const sensorPost = addBox('sensor-post', new THREE.Vector3(0.6, 2.6, 0.6),
    new THREE.Vector3(0, 1.3, -20), materials.stone, true, group, TUTORIAL_STAGE);
  const sensorEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5871 })
  );
  sensorEye.position.set(0, 2.5, -20);
  group.add(sensorEye);

  const exit = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.7, 40),
    new THREE.MeshBasicMaterial({ color: 0x5deeff, transparent: true, opacity: 0.4,
      side: THREE.DoubleSide, depthWrite: false })
  );
  exit.rotation.x = -Math.PI / 2;
  exit.position.set(TUTORIAL_EXIT.x, 0.04, TUTORIAL_EXIT.z);
  group.add(exit);
  label('EXIT', 0, 2.3, -18, 1.8);

  function setGateOpen(name, open) {
    const mesh = gates.get(name);
    if (!mesh) return;
    mesh.visible = !open;
    if (mesh.userData.collider) mesh.userData.collider.disabled = open;
  }

  return {
    group,
    target,
    dampener,
    sensorEye,
    exit,
    setGateOpen,
    setVisible(visible) { group.visible = visible; },
    reset() {
      group.visible = true;
      dampener.visible = true;
      for (const name of gates.keys()) setGateOpen(name, false);
    },
    setDampenerTaken(taken) { dampener.visible = !taken; },
    update(elapsed, sensorCharge) {
      dampener.rotation.y = elapsed * 0.8;
      dampener.position.y = DAMPENER_PICKUP.y + Math.sin(elapsed * 1.5) * 0.05;
      target.material.opacity = 0.38 + Math.sin(elapsed * 2.4) * 0.12;
      const hot = 0.4 + sensorCharge * 0.6;
      sensorEye.material.color.setRGB(hot, 0.22 * (1 - sensorCharge), 0.3 * (1 - sensorCharge));
      sensorPost.visible = true;
    }
  };
}

// Surface patches for the training floor, in the same format Level 1 uses.
export const TUTORIAL_FLOOR = [
  { name: 'training-entry', surface: 'carpet', rect: [-6, 10, 6, 21] },
  // 4.5m of marble, not the full bay. The carpet either side gives the player
  // room to react after the gate opens and something to finish on.
  { name: 'training-marble', surface: 'marble', rect: [-6, 5.5, 6, 10] },
  { name: 'training-landing', surface: 'carpet', rect: [-6, 4, 6, 5.5] },
  { name: 'training-dark', surface: 'stone', rect: [-6, -4, 6, 4] },
  { name: 'training-range', surface: 'carpet', rect: [-6, -12, 6, -4] },
  { name: 'training-sensor', surface: 'tile', rect: [-6, -20, 6, -12] }
];
