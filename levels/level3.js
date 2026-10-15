// levels/level3.js: The Double-Cross. GREY-BOX: every number is a placeholder to tune in the test room.
// Beats: Dex betrays Wren and comms cut, Q is taught, then The Hold, The Lure and
// The Two Plates, optional evidence 3, then the roof, rain and the zipline.
//
// Ground floor (y 0)                       Top floor (y 20)
//   z=0   +---------+  HOLD ROOM, spawn      z=-53 +---------+  PLATES LANDING (stairs arrive)
//         |         |                              | [] [] o |  two plates, hatch override
//   z=-20 +--[==]---+  shutter (held only)   z=-67 +--[==]---+  roof hatch
//   z=-25 +--+    +-----+                          |  ROOF   |  rain, searchlight
//         | LURE GALLERY |  sweep team            z=-80 +----Z----+  zipline
//   z=-45 +-------S-----+  S = only stairwell
const wall = (name, pos, size) => ({ name, kind: 'wall', pos, size });
const parapet = (name, pos, size) => ({ name, kind: 'wall', pos, size, surface: 'concrete' });

export default {
  id: 3,
  name: 'The Double-Cross',
  objective: 'Reach the roof before the building seals',
  objectives: [
    { id: 'hold', text: 'Record your Echo holding the shutter, then walk through' },
    { id: 'lure', text: 'Lure the sweep team away from the stairwell' },
    { id: 'plates', text: 'You and your Echo on both plates, then open the hatch' },
    { id: 'zipline', text: 'Get to the zipline', marker: [0, 20, -78] },
  ],
  spawn: [0, 0, -3],
  checkpoint: [0, 0, -3],
  goal: [0, 20, -78],
  lockdownSeconds: 240,
  alarmFloor: 'Alert', // the alarm is stuck at Alert for the whole level

  floors: [
    { pos: [0, -0.1, -10], size: [10, 0.2, 20], surface: 'steel' }, // hold room z -20..0
    { pos: [0, -0.1, -22.5], size: [4, 0.2, 5], surface: 'steel' }, // shutter passage z -25..-20
    { pos: [0, -0.1, -35], size: [20, 0.2, 20], surface: 'marble' }, // lure gallery z -45..-25
    { pos: [0, 19.9, -60], size: [14, 0.2, 14], surface: 'concrete' }, // plates landing z -67..-53
    { pos: [0, 19.9, -73.5], size: [14, 0.2, 13], surface: 'concrete' }, // roof z -80..-67
  ],
  zones: [
    { id: 'hold-room', min: [-5, 0, -20], max: [5, 4, 0] },
    { id: 'gallery', min: [-10, 0, -45], max: [10, 4, -25] },
    { id: 'landing', min: [-7, 20, -67], max: [7, 24, -53] },
    { id: 'roof', min: [-7, 20, -80], max: [7, 26, -67] },
  ],
  walls: [
    // Hold room
    wall('hold-west', [-5.1, 2, -10], [0.2, 4, 20.4]),
    wall('hold-east', [5.1, 2, -10], [0.2, 4, 20.4]),
    wall('hold-back', [0, 2, 0.1], [10.4, 4, 0.2]),
    wall('hold-front-west', [-3.5, 2, -20.1], [3, 4, 0.2]),
    wall('hold-front-east', [3.5, 2, -20.1], [3, 4, 0.2]),
    wall('passage-west', [-2.1, 2, -22.5], [0.2, 4, 5]),
    wall('passage-east', [2.1, 2, -22.5], [0.2, 4, 5]),
    // Lure gallery
    wall('gallery-front-west', [-6, 2, -24.9], [8, 4, 0.2]),
    wall('gallery-front-east', [6, 2, -24.9], [8, 4, 0.2]),
    wall('gallery-west', [-10.1, 2, -35], [0.2, 4, 20.4]),
    wall('gallery-east', [10.1, 2, -35], [0.2, 4, 20.4]),
    wall('gallery-back', [0, 2, -45.1], [20.4, 4, 0.2]),
    { name: 'security-desk', kind: 'prop', pos: [8.2, 0.5, -27.4], size: [2, 1, 0.8] },
    // Plates landing (y 20)
    wall('landing-west', [-7.1, 22, -60], [0.2, 4, 14.2]),
    wall('landing-east', [7.1, 22, -60], [0.2, 4, 14.2]),
    wall('landing-back', [0, 22, -52.9], [14.4, 4, 0.2]),
    wall('landing-front-west', [-4.3, 22, -67], [5.6, 4, 0.2]),
    wall('landing-front-east', [4.3, 22, -67], [5.6, 4, 0.2]),
    wall('landing-lintel', [0, 23.2, -67], [3, 1.6, 0.2]),
    // Roof parapet
    parapet('roof-west', [-7.1, 20.6, -73.5], [0.2, 1.2, 13]),
    parapet('roof-east', [7.1, 20.6, -73.5], [0.2, 1.2, 13]),
  ],

  echoRooms: [
    { id: 'hold', min: [-5, 0, -20], max: [5, 4, 0], hint: 'Record yourself holding the override.' },
    { id: 'lure', min: [-10, 0, -45], max: [10, 4, -25], hint: 'Make noise far away, then take the quiet route.' },
    { id: 'plates', min: [-7, 20, -67], max: [7, 24, -53], hint: 'Two plates. Two of you.' },
  ],

  interactables: [
    { id: 'shutter_hold', type: 'override', pos: [-3.6, 1.2, -18.6], usePos: [-3.6, 0, -18.6], holdSeconds: 3.5, heldOnly: true, opens: ['shutter_door'] },
    { id: 'shutter_door', type: 'door', pos: [0, 2, -20.1], size: [4, 4, 0.2] },
    { id: 'stairs', type: 'stairs', pos: [8, 0, -43.5], usePos: [8, 0, -43.5], to: [5.5, 20, -54.5] },
    { id: 'plate_a', type: 'plate', pos: [-3, 20, -60], group: 'roof_plates' },
    { id: 'plate_b', type: 'plate', pos: [3, 20, -60], group: 'roof_plates' },
    { id: 'roof_override', type: 'override', pos: [0, 21.2, -65.8], usePos: [0, 20, -65.8], holdSeconds: 3.5, opens: ['roof_hatch'] },
    { id: 'roof_hatch', type: 'hatch', pos: [0, 21.2, -67], size: [3, 2.4, 0.2] },
    { id: 'zip', type: 'zipline', pos: [0, 21, -79.6], usePos: [0, 20, -78] },
  ],

  guards: [
    // The sweep team guards the only stairwell (north-east corner of the gallery).
    { name: 'Sweep Team', route: [[-8, 0, -30], [8, 0, -30], [8, 0, -41.5], [-8, 0, -41.5]], speed: 1.6 },
  ],
  cameras: [],
  lasers: [],

  pickups: [
    { id: 'evidence_3', kind: 'evidence', evidenceIndex: 3, pos: [8.2, 1.1, -28.2], label: "Security chief's desk" }, // slightly off the route
  ],

  lights: [
    { type: 'ambient', color: '#401010', intensity: 0.35 },
    { type: 'point', pos: [0, 3.5, -10], color: '#ff2a2a', intensity: 1.5, shadow: true }, // lockdown strobe, Huzaifa animates
  ],

  dex: [
    { trigger: 'start', text: 'Sorry, Wren. Same as Marlowe.' }, // story.js owns the full sequence
    { trigger: 'zone:hold', text: '[comms dead]' },
  ],

  look: { skybox: 'roof_rain', fog: { color: '#200808', density: 0.04 }, music: 'lockdown_l3' },
};
