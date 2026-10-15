// levels/level2.js: The Vault. GREY-BOX: every number is a placeholder to tune in the test room.
// Beats (from the plan): laser corridor (crawl, jump, timing), then the vent or the
// guarded corridor, then the three-tumbler safe while Briggs passes every 40 s,
// an optional deposit box with evidence 2, and the lights go red.
//
//   z=2    +-----+        laser corridor, x +-3 (spawn at z 0)
//          |     |  ===   crawl beam  z -4
//          |     |  ===   jump beam   z -10
//          |     |  ~~~   timing beam z -16
//   z=-22  +-+ +-+        guarded corridor, x +-1.5   (vent: corridor west wall -> vault)
//   z=-27 +--+ +--------+-------+
//         |  VAULT ROOM |       |  Briggs walks the front of the vault, checks the
//         |  panel  ::  ARCHIVE |  safe once per loop from the middle (0.5, -33.2),
//         |    [safe]   |  [ev] |  then loops through the archive. About 42 s a loop.
//   z=-41 +-------------+-------+  The west half (panel, vent exit) is off his route.
//   A decoy thrown into the archive pulls him furthest from the safe.
const wall = (name, pos, size) => ({ name, kind: 'wall', pos, size });

export default {
  id: 2,
  name: 'The Vault',
  objective: 'Isolate the safe sensor, crack the safe, recover the Star and reach the service exit',
  objectives: [
    { id: 'lasers', text: 'Get through the laser corridor' },
    { id: 'circuit', text: 'Isolate the tamper circuit at the west service panel' },
    { id: 'safe', text: 'Crack the safe between Briggs\u2019s checks, or decoy him into the archive', marker: [0, 1, -39] },
    { id: 'star', text: 'Take the Star and return to the service fire door' },
  ],
  spawn: [0, 0, 0],
  checkpoint: [0, 0, 0],
  goal: [0.1, 0, -25.7],

  floors: [
    { pos: [0, -0.1, -10], size: [6, 0.2, 24], surface: 'steel' }, // laser corridor z -22..2
    { pos: [0, -0.1, -24.5], size: [3, 0.2, 5], surface: 'steel' }, // guarded corridor z -27..-22
    { pos: [0, -0.1, -34], size: [14, 0.2, 14], surface: 'steel' }, // vault room z -41..-27
    { pos: [11, -0.1, -35], size: [8, 0.2, 10], surface: 'concrete' }, // archive x 7..15, z -40..-30
  ],
  zones: [
    { id: 'laser-corridor', min: [-3, 0, -22], max: [3, 4, 2] },
    { id: 'guarded-corridor', min: [-1.5, 0, -27], max: [1.5, 4, -22] },
    { id: 'vault-room', min: [-7, 0, -41], max: [7, 4, -27] },
    { id: 'archive', min: [7, 0, -40], max: [15, 4, -30] },
  ],
  walls: [
    wall('corridor-west', [-3.1, 2, -10], [0.2, 4, 24]),
    wall('corridor-east', [3.1, 2, -10], [0.2, 4, 24]),
    wall('corridor-back', [0, 2, 2.1], [6.4, 4, 0.2]),
    wall('corridor-end-west', [-2.3, 2, -22], [1.6, 4, 0.2]),
    wall('corridor-end-east', [2.3, 2, -22], [1.6, 4, 0.2]),
    wall('guarded-west', [-1.6, 2, -24.5], [0.2, 4, 5]),
    wall('guarded-east', [1.6, 2, -24.5], [0.2, 4, 5]),
    wall('vault-front-west', [-4.3, 2, -26.9], [5.6, 4, 0.2]),
    wall('vault-front-east', [4.3, 2, -26.9], [5.6, 4, 0.2]),
    wall('vault-west', [-7.1, 2, -34], [0.2, 4, 14.2]),
    // East wall with a 5 m doorway (z -37.5..-32.5) into the archive.
    wall('vault-east-north', [7.1, 2, -29.7], [0.2, 4, 5.6]),
    wall('vault-east-south', [7.1, 2, -39.3], [0.2, 4, 3.6]),
    wall('archive-north', [11.1, 2, -29.9], [8.4, 4, 0.2]),
    wall('archive-south', [11.1, 2, -40.1], [8.4, 4, 0.2]),
    wall('archive-east', [15.1, 2, -35], [0.2, 4, 10.4]),
    wall('vault-back', [0, 2, -41.1], [14.4, 4, 0.2]),
    { name: 'safe', kind: 'prop', pos: [0, 0.9, -40.4], size: [1.6, 1.8, 1.2] }, // hide behind it when Briggs passes
    { name: 'archive-cover-west', kind: 'prop', pos: [-3.5, 0.85, -33.8], size: [1.8, 1.7, 1.4] },
    { name: 'archive-cover-east', kind: 'prop', pos: [3.2, 0.85, -35.5], size: [1.8, 1.7, 1.4] },
    { name: 'archive-rack-north', kind: 'prop', pos: [9.5, 0.9, -31], size: [3, 1.8, 0.6] },
    { name: 'archive-rack-east', kind: 'prop', pos: [14.4, 0.9, -34], size: [0.8, 1.8, 3] },
    { name: 'security-file-cabinet', kind: 'prop', pos: [14.3, 0.51, -39.4], size: [1, 1.02, 0.65] },
  ],

  lasers: [
    { id: 'laser_crawl', a: [-3, 0.85, -4], b: [3, 0.85, -4], pattern: 'static', teaches: 'crawl' },
    { id: 'laser_jump', a: [-3, 0.3, -10], b: [3, 0.3, -10], pattern: 'static', teaches: 'jump' },
    { id: 'laser_timing', a: [-3, 1.0, -16], b: [3, 1.0, -16], pattern: 'rise_fall', period: 4, amplitude: 0.9, teaches: 'timing' },
    { id: 'laser_inner', a: [-1.5, 0.75, -24.5], b: [1.5, 0.75, -24.5], pattern: 'blink', period: 3.8, teaches: 'timing' },
  ],

  guards: [
    // Never walks past the dial: he checks the safe from the middle of the room once a
    // loop (waypoint 5 -> 6 faces the safe), then loops through the archive.
    // watchWaypoint is where the dial countdown counts to: reaching it means he is about
    // to look at the safe.
    {
      name: 'Briggs',
      // Starts in the archive, so a retry from a checkpoint never begins with him
      // already looking at the safe.
      route: [[12, 0, -32.3], [13.2, 0, -38.2], [9.5, 0, -38.5], [7.05, 0, -35], [4.5, 0, -31.5], [1.5, 0, -29.6], [0.5, 0, -33.2], [5, 0, -30.5], [7.05, 0, -35]],
      speed: 1.0,
      watchWaypoint: 5,
    },
  ],
  cameras: [
    { id: 'cam_corridor', label: 'CAM 05 · LASER CORRIDOR', pos: [2.6, 3.6, 1.6], yawDeg: 8, sweepDeg: 0 },
  ],

  interactables: [
    // The vent skips the guarded corridor: slow (crawl only) and one noisy grate.
    { id: 'vent_in', type: 'vent', pos: [-3, 0.42, -18.7], usePos: [-2.3, 0, -18.7], to: [-6, 0, -28.5], opens: ['vent_out'],
      path: [[-2.3, 0, -18.7], [-4.5, 0, -18.7], [-4.5, 0, -25.4], [-6, 0, -25.4], [-6, 0, -28.5]], rotYDeg: 90 },
    { id: 'vent_out', type: 'vent', pos: [-6, 0.42, -26.9], usePos: [-6, 0, -28.5] },
    { id: 'safe', type: 'safe', pos: [0, 1, -39.7], usePos: [0, 0, -38.4] },
    { id: 'tamper_panel', type: 'override', pos: [-6.85, 1.3, -31.5], usePos: [-5.8, 0, -31.5], holdSeconds: 2.5 },
    { id: 'service_exit', type: 'door', pos: [1.3, 1.2, -25.7], usePos: [0.1, 0, -25.7] },
  ],
  pickups: [
    { id: 'kestrel_star', kind: 'loot', pos: [0, 1.05, -38.4], value: 1000000, label: 'Kestrel Star' }, // interaction point; the rendered gem stays inside the safe
    // In the archive's far corner, right where Briggs turns: optional and risky.
    { id: 'evidence_2', kind: 'evidence', evidenceIndex: 2, pos: [14.3, 1, -39.4], usePos: [13.3, 0, -39], label: 'Radio intercept' },
  ],

  labels: [
    { text: 'VAULT SERVICES', pos: [-6.82, 2.1, -31.5], width: 1.4, rotYDeg: 90 },
    { text: 'STAFF EXIT', pos: [1.35, 2.5, -25.7], width: 1.2, rotYDeg: -90 },
    { text: 'ARCHIVE', pos: [6.98, 3.3, -35], width: 1.2, rotYDeg: -90 },
  ],

  lights: [
    { type: 'ambient', color: '#3a4a5c', intensity: 0.4 },
    { type: 'point', pos: [0, 3.5, -34], color: '#9fc4ff', intensity: 1.2, shadow: true },
    { type: 'point', pos: [0, 2.8, -38.2], color: '#ffd59a', intensity: 0.6 },
  ],

  dex: [
    { trigger: 'start', text: 'Lasers are on a cycle. Watch, then move.' },
    { trigger: 'zone:safe', text: 'Come on, Wren, faster. We are on a clock.' },
  ],

  look: { skybox: 'none', fog: { color: '#0b1118', density: 0.03 }, music: 'tension_l2' },
};
