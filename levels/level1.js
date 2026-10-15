// levels/level1.js: The Gala.
// Ported from the current build: src/world/hall.js (Grand Hall and vault corridor),
// plus the guard routes and CCTV positions in src/main.js. Geometry matches what
// hall.inside() lets the player walk on today.
//
//   z=8    +-------------------------------+  front wall, service entrance, spawn (-4.2, 5)
//          |  carpet runner down the middle |  marble either side
//          |          GRAND HALL            |  x -13..13, columns and trim keep you inside x +-11.3
//   z=-40  +--------------+   +-------------+  back wall, doorway x +-2.4
//                         |   |
//                         |   |  vault corridor, steel, x +-2.4
//   z=-62                 +---+  vault wing door (0, -61.7)
//
// What is new compared with the build, because the plan changes the mission:
//   * Okafor's inspection pauses allow a 0.75-second badge copy; the original remains on him.
//   * The corridor lasers are gone: they belong to Level 2 in the plan.
//   * The vault door is a keycard_door interactable, not scenery.
//   * Loot, the evidence file and the Dex lines are new. Anything marked
//     placeholder is a proposal to tune in the test room.
// Lighting belongs to Huzaifa. The lights below mirror hall.layout, which
// lighting.js reads today, so change them there first.

const box = (kind, name, pos, size, extra = {}) => ({ name, kind, pos, size, ...extra });
const wall = (name, pos, size) => box('wall', name, pos, size);
const floor = (surface, pos, size) => ({ surface, pos, size });

export default {
  id: 1,
  name: 'The Gala',
  objective: 'Copy a staff badge, authorise the night entry, and leave through the lobby',
  objectives: [
    { id: 'rig', text: 'Slip into the staff wing and link the camera tap at the security desk', marker: [24.1, 1, -19.5] },
    { id: 'cctv', text: "Hack a camera and watch Okafor's patrol" },
    { id: 'keycard', text: 'Copy Okafor’s badge during an inspection stop', follow: 'Okafor' },
    { id: 'vault_door', text: 'Register the copied badge at the staff reader', marker: [0, 2, -61.7] },
    { id: 'exit', text: 'Leave through the lobby before closing', marker: [-4.2, 0, 5] },
  ],
  // The build starts the player at (-4.2, 0, 5) with yaw atan2(-6, 21), about -16 degrees.
  spawn: [-4.2, 0, 5],
  spawnYawDeg: -16,
  checkpoint: [-4.2, 0, 5],
  goal: [-4.2, 0, 5],

  // The carpet runner is listed after the marble so it wins where they overlap.
  floors: [
    floor('marble', [0, -0.1, -16], [26, 0.2, 48]),
    floor('carpet', [0, -0.1, -15], [3.2, 0.2, 42]),
    floor('steel', [0, -0.1, -51], [4.8, 0.2, 22]),
    floor('concrete', [14.15, -0.1, -19.5], [5.7, 0.2, 2]),
    floor('carpet', [21, -0.1, -19.5], [8, 0.2, 11]),
  ],

  zones: [
    { id: 'entrance', min: [-13, 0, -2], max: [13, 10, 8] },
    { id: 'grand-hall', min: [-13, 0, -30], max: [13, 10, -2] },
    { id: 'vault-approach', min: [-13, 0, -40], max: [13, 10, -30] },
    { id: 'vault-corridor', min: [-2.4, 0, -62], max: [2.4, 4.2, -40] },
    { id: 'staff-wing', min: [11.3, 0, -25], max: [25, 3.2, -14] },
  ],

  // Solid boxes. The two side boxes are 2.1 m thick on purpose: columns and trim
  // push the walkable area in to x +-11.3, exactly as hall.inside() does.
  walls: [
    box('shell', 'west-wall', [-12.35, 5, -16], [2.1, 10, 48]),
    box('shell', 'east-wall-front', [12.35, 5, -5.25], [2.1, 10, 26.5]),
    box('shell', 'east-wall-back', [12.35, 5, -30.25], [2.1, 10, 19.5]),
    box('shell', 'front-wall-west', [-9.35, 5, 8.2], [8.1, 10, 0.4]),
    box('shell', 'front-wall-east', [5.15, 5, 8.2], [16.5, 10, 0.4]),
    box('shell', 'front-wall-lintel', [-4.2, 6.65, 8.2], [2.2, 6.7, 0.4]),
    box('prop', 'vault-door', [0, 2, -61.7], [3.6, 3.6, 0.5]),
    wall('wing-passage-north', [15.2, 1.6, -18.4], [3.6, 3.2, 0.2]),
    wall('wing-passage-south', [15.2, 1.6, -20.6], [3.6, 3.2, 0.2]),
    wall('office-west-north', [17, 1.6, -16.25], [0.2, 3.2, 4.5]),
    wall('office-west-south', [17, 1.6, -22.75], [0.2, 3.2, 4.5]),
    wall('office-east', [25.1, 1.6, -19.5], [0.2, 3.2, 11.2]),
    wall('office-north', [21, 1.6, -13.9], [8.4, 3.2, 0.2]),
    wall('office-south', [21, 1.6, -25.1], [8.4, 3.2, 0.2]),
    box('prop', 'security-desk', [24.25, 0.45, -19.5], [1.3, 0.9, 4.2]),
    box('prop', 'records-cabinet', [23.8, 0.55, -14.4], [1.8, 1.1, 0.7]),
    box('prop', 'staff-lockers', [18.1, 1, -24.4], [1.8, 2, 0.7]),
    box('prop', 'office-sofa', [20.6, 0.4, -14.5], [2.4, 0.8, 0.9]),
    box('shell', 'back-wall-left', [-7.9, 5, -40.2], [11, 10, 0.4]),
    box('shell', 'back-wall-right', [7.9, 5, -40.2], [11, 10, 0.4]),
    wall('corridor-west', [-2.6, 2.1, -51], [0.4, 4.2, 22]),
    wall('corridor-east', [2.6, 2.1, -51], [0.4, 4.2, 22]),
    wall('corridor-back', [0, 2.1, -62.2], [5.6, 4.2, 0.4]),
  ],

  // Cocktail tables are props in the build and the player walks through them today.
  // Keep it that way: Briggs' loop passes within a metre of the table at (1.4, -3.2).
  decor: [
    { type: 'frame', pos: [-12.95, 3.3, -6.5], rotYDeg: 90, width: 3.4, texture: 'paintings/starry-night.jpg' },
    { type: 'frame', pos: [-12.95, 3.3, -13.5], rotYDeg: 90, width: 1.7, texture: 'paintings/the-scream.jpg' },
    { type: 'frame', pos: [12.95, 3.3, -6.5], rotYDeg: -90, width: 3.4, texture: 'paintings/wave.jpg' },
    { type: 'frame', pos: [12.95, 3.3, -13.5], rotYDeg: -90, width: 3.2, texture: 'paintings/shipwreck.jpg' },
    { type: 'table', pos: [1.4, 0, -3.2] },
    { type: 'table', pos: [-2.4, 0, -11] },
    { type: 'table', pos: [4.2, 0, -16] },
    { type: 'table', pos: [-1.6, 0, -22] },
    { type: 'table', pos: [6.5, 0, -8] },
  ],

  guards: [
    {
      name: 'Okafor', // patrols the west wall and carries the keycard (matches main.js)
      route: [[-9.6, 0, -12.6], [-9.6, 0, -20], [-9.6, 0, -28], [-9.6, 0, -20]],
      speed: 1.1,
      pauseSeconds: 3.6,
      hasKeycard: true,
      pickpocketSeconds: 0.75,
    },
    {
      name: 'Briggs', // the central loop in main.js
      route: [[9, 0, -24], [9, 0, -4], [-8, 0, -4], [-8, 0, -24]],
      speed: 1.35,
    },
    {
      name: 'Hale',
      route: [[21, 0, -16.5], [21, 0, -22.5], [15.2, 0, -19.5], [21, 0, -22.5]],
      speed: 0.9,
      pauseSeconds: 4.5,
    },
  ],

  // The four cameras already in main.js, as yaw and sweep. Camera 4 used to watch
  // the laser corridor and now watches the approach to the vault door.
  cameras: [
    { id: 'cam_atrium', label: 'CAM 01 · ATRIUM', pos: [-11.5, 8.5, 7], yawDeg: -42, sweepDeg: 20 },
    { id: 'cam_hall', label: 'CAM 02 · GRAND HALL', pos: [11.5, 8.5, -20], yawDeg: 132, sweepDeg: 17 },
    { id: 'cam_vault_wing', label: 'CAM 03 · VAULT WING', pos: [-11.5, 8.5, -38.5], yawDeg: -148, sweepDeg: 0 },
    { id: 'cam_corridor', label: 'CAM 04 · VAULT CORRIDOR', pos: [1.8, 3.9, -41], yawDeg: 6, sweepDeg: 0 },
  ],
  lasers: [],

  // Placeholder positions and cash values. Items sit on table tops and beside
  // walls, never inside a wall box, so the XZ access check does not block pickup.
  pickups: [
    { id: 'evidence_1', kind: 'evidence', evidenceIndex: 1, pos: [23.8, 1.12, -14.4], usePos: [23.8, 0, -15.4], label: 'Security log' },
  ],

  interactables: [
    { id: 'vault_door', type: 'keycard_door', pos: [0, 2, -61.7], size: [3.6, 3.6, 0.5], usePos: [0, 0, -60.6], requires: 'keycard' },
    { id: 'gala_exit', type: 'door', pos: [-4.2, 1.2, 7.8], usePos: [-4.2, 0, 6.6], requires: 'night_entry' },
    { id: 'security_desk', type: 'override', pos: [24.1, 1.1, -19.5], usePos: [23.0, 0, -19.5], holdSeconds: 2.5 },
  ],

  airlockOut: { pos: [-4.2, 0, 8], yawDeg: 180 },

  // From the old main.js (3 charges, one back every 6 s). throwing.js is not in the
  // current tree, so Teammate 2 has to restore it from commit b797c86.
  decoys: { charges: 3, rechargeSeconds: 6 },

  lights: [
    { type: 'ambient', color: '#5a4632', intensity: 0.35 },
    { type: 'spot', pos: [1, 9.6, -7], target: [0, 0, -10], color: '#ffd7a0', intensity: 260, shadow: true },
    { type: 'point', pos: [0, 7.1, -3], color: '#ffc98a', intensity: 55 },
    { type: 'point', pos: [0, 7.1, -15], color: '#ffc98a', intensity: 55 },
    { type: 'point', pos: [0, 7.1, -27], color: '#ffc98a', intensity: 55 },
    { type: 'directional', pos: [-30, 26, -6], target: [4, 0, -12], color: '#9cc4ff', intensity: 0.9, shadow: true },
  ],

  // Draft lines so the radio system has something to play; story.js owns the final script.
  dex: [
    { trigger: 'start', text: 'Evening, Wren. The service door worked and nobody is looking at you. Stay with me and I will talk you through the room.' },
    { trigger: 'objective:cctv', text: "Tab puts you on the cameras. Watch Okafor's loop, and loop a feed if you need a gap." },
    { trigger: 'zone:grand-hall', text: 'Stick to the carpet runner. Marble carries every step.' },
    { trigger: 'objective:keycard', text: 'Wait for an inspection stop. Copy his badge from behind, clear of guests and cameras.' },
    { trigger: 'objective:vault_door', text: 'Register night entry at the rear reader, then leave through the lobby.' },
  ],

  look: { skybox: 'night_city', fog: { color: '#1a120a', density: 0.012 }, music: 'gala_l1' },
};
