// levels/level2.js: The Vault. GREY-BOX: every number is a placeholder to tune in the test room.
// Beats (from the plan): laser corridor (crawl, jump, timing), then the vent or the
// guarded corridor, then the three-tumbler safe while Briggs passes every 40 s,
// an optional deposit box with evidence 2, and the lights go red.
//
//   z=2    +-----+        laser corridor, x +-3 (spawn at z 0)
//          |     |  ===   crawl beam  z -4
//          |     |  ===   jump beam   z -10
//          |     |  ~~~   timing beam z -16
//   z=-22  +-+ +-+        guarded corridor, x +-1.5   (vent: corridor west wall z -6 -> vault)
//   z=-27 +--+ +--------+
//         |  VAULT ROOM |  x +-7, Briggs patrols, safe at the back
//   z=-41 +-------------+
const wall = (name, pos, size) => ({ name, kind: 'wall', pos, size });

export default {
  id: 2,
  name: 'The Vault',
  objective: 'Cross the lasers and crack the safe',
  objectives: [
    { id: 'lasers', text: 'Get through the laser corridor' },
    { id: 'safe', text: 'Crack the safe before Briggs comes back', marker: [0, 1, -39] },
  ],
  spawn: [0, 0, 0],
  checkpoint: [0, 0, 0],
  goal: [0, 0, -38.4],

  floors: [
    { pos: [0, -0.1, -10], size: [6, 0.2, 24], surface: 'steel' }, // laser corridor z -22..2
    { pos: [0, -0.1, -24.5], size: [3, 0.2, 5], surface: 'steel' }, // guarded corridor z -27..-22
    { pos: [0, -0.1, -34], size: [14, 0.2, 14], surface: 'steel' }, // vault room z -41..-27
  ],
  zones: [
    { id: 'laser-corridor', min: [-3, 0, -22], max: [3, 4, 2] },
    { id: 'guarded-corridor', min: [-1.5, 0, -27], max: [1.5, 4, -22] },
    { id: 'vault-room', min: [-7, 0, -41], max: [7, 4, -27] },
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
    wall('vault-east', [7.1, 2, -34], [0.2, 4, 14.2]),
    wall('vault-back', [0, 2, -41.1], [14.4, 4, 0.2]),
    { name: 'safe', kind: 'prop', pos: [0, 0.9, -40.4], size: [1.6, 1.8, 1.2] }, // hide behind it when Briggs passes
  ],

  lasers: [
    { id: 'laser_crawl', a: [-3, 0.55, -4], b: [3, 0.55, -4], pattern: 'static', teaches: 'crawl' },
    { id: 'laser_jump', a: [-3, 0.3, -10], b: [3, 0.3, -10], pattern: 'static', teaches: 'jump' },
    { id: 'laser_timing', a: [-3, 1.0, -16], b: [3, 1.0, -16], pattern: 'rise_fall', period: 4, amplitude: 0.9, teaches: 'timing' },
  ],

  guards: [
    // Passes the vault window every 40 s (plan). Tune speed so one loop takes 40 s.
    { name: 'Briggs', route: [[-6, 0, -30], [6, 0, -30], [6, 0, -38], [-6, 0, -38]], speed: 1.0 },
  ],
  cameras: [
    { id: 'cam_corridor', label: 'CAM 05 · LASER CORRIDOR', pos: [2.6, 3.6, 1.6], yawDeg: 8, sweepDeg: 0 },
  ],

  interactables: [
    // The vent skips the guarded corridor: slow (crawl only) and one noisy grate.
    { id: 'vent_in', type: 'vent', pos: [-3, 0.3, -6], usePos: [-2.4, 0, -6], to: [-6, 0, -28.5], opens: ['vent_out'] },
    { id: 'vent_out', type: 'vent', pos: [-6, 0.3, -27.6], usePos: [-6, 0, -28.5] },
    { id: 'safe', type: 'safe', pos: [0, 1, -39.7], usePos: [0, 0, -38.4] },
  ],
  pickups: [
    { id: 'loot_deposit', kind: 'loot', pos: [5.6, 1, -39.4], value: 12000, label: 'Deposit box' },
    { id: 'evidence_2', kind: 'evidence', evidenceIndex: 2, pos: [6.2, 1, -39.4], label: 'Radio intercept' },
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
