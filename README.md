# SIGNAL - Alpha

SIGNAL is a browser-based Three.js stealth game for COMS3006A / COMS3025A. Sound is both the player's map and their greatest risk: every footstep, decoy, guard pulse, and active sonar wave reveals the museum through a custom shader.

## Three-level mission

1. **Galleries** - learn sonar, quiet movement and decoys; steal the keycard from the east security room, then press E at the north vault entrance to unlock it. The key carries into the Vault.
2. **The Vault** - explore from a central spawn, scan three diamond cases using Space, compare their acoustic patterns with the key's signature, and press E at the matching case. The key and case signatures randomize on each new run; retry preserves the current puzzle. The guard patrols across the vault using wall-safe routes. Wrong guesses generate recoverable local alerts; laser grids and pressure plates remain armed. Vault sonar reaches 10 metres, so scanning requires leaving the spawn.
3. **Lockdown** - carry the stolen diamond through an emergency route with two independent guards. Carrying the diamond is silent; automatic pulses were removed after difficulty feedback. The carrying footstep multiplier and Level 3 spawn wave were also removed; normal movement, guard and override echoes remain. Hold E for 3.5 seconds at each of two locked doors; the override generates revealing noise. Releasing E, moving away, looking away or pausing resets its progress. Override alerts are local and blocked by closed doors/cover; Door 01 has protective cover, and the patrols stay left of the main approach and exit routes. Open both doors and reach the north emergency exit.

Unlocking the Galleries vault advances to Level 2. Unlocking the real Echo Diamond triggers lockdown and advances directly to Level 3 with the diamond already carried. Escaping Lockdown completes the current run. Number keys 1-3 remain available as practice jumps for demonstrations; later-level practice starts include the security key and Level 3 includes the diamond. Failure retries the current level with its starting inventory and closed doors.

## Controls

- **WASD** - move
- **Mouse** - look
- **Shift** - hold to walk quietly (Valorant-style); normal movement runs
- **C** or **Ctrl** - crouch / quiet movement
- **Space** - active sonar pulse; reveals a large area but can attract the guard
- **Left click** - throw a sound decoy (3 charges; one charge returns every 6 seconds)
- **E** - take the security key / unlock the vault in Level 1; try a scanned case in Level 2; hold to override doors in Level 3. Interactions require range, clear access and unpaused gameplay. Case readers and door overrides are accessed from their front faces; overrides also require facing the door.
- **1 / 2 / 3** - practice-select a level
- **R** - retry the current level after failure; restart the run after success
- **Esc** - release the mouse and pause

## Technical evidence

- Three.js realtime 3D scene with procedural museum geometry
- Original GLSL vertex and fragment shader for expanding acoustic wavefronts
- High-performance static Vite deployment with relative asset paths
- Cacheable Three.js vendor chunk with a compact game entry (approximately 20 KB gzip)
- Adaptive render resolution and suspended idle rendering to reduce GPU work
- Keyboard, mouse, pointer-lock, audio, collision, interaction, and state-transition systems
- Independent guard routes and hearing targets; Level 3 adds exposure/FOV/line-of-sight suspicion, pursuit and bounded last-seen search
- Speed-driven player noise, three-charge throwable decoys, sonar cooldown, moving lasers, floor traps, extraction, and scoring
- Level-specific procedural Web Audio ambience and transition cues with no external sound files
- Dedicated 2D tactical map that illuminates during sound pulses; Lockdown jams the feed between pulses and briefly reveals both guards with each echo
- Responsive cinematic UI, level transitions, progress indicators, success, failure, and restart screens
- No external runtime assets, database, or backend services

## Local development

1. Install dependencies with `npm install`.
2. Start development with `npm run dev`.
3. Build production files with `npm run build`.
4. Test the production build with `npm run preview`.

The production output is in `dist/`. Upload the contents of `dist/` to the department LAMP web directory.

## Main source files

- `src/main.js` - renderer, controls, state, guard AI, interaction, progression, and audio
- `src/stages.js` - Vault and Blackout geometry, hazards, objectives, patrol routes, and level settings
- `src/galleries.js` - Level 1 security room, keycard, vault entrance and fixed mission signs
- `src/vault.js` - Level 2 cases, signature comparison, sonar arrival and puzzle/reset state
- `src/navigation.js` - Levels 2–3 guard grid routing, obstacle clearance and swept movement checks
- `src/escape.js` - carried-diamond escape, cancellable door overrides, collision updates and final exit
- `src/visibility.js` - acoustic exposure, independent hearing/decoy commitment and Level 3 visual detection
- `src/interactions.js` - stage-filtered range and wall-access checks
- `src/shaders.js` - custom acoustic wavefront shader
- `src/styles.css` and `src/screens.css` - HUD and screen presentation

Focused checks: `node tests/galleries.test.js`, `node tests/vault.test.js` and `node tests/escape.test.js` (23 checks total). Zidan confirmed Level 1 and Level 2's revised spawn/patrol/randomization in the browser. Level 3 browser acceptance and difficulty tuning remain pending. Scored time, AI, hazards, projectiles, cooldowns and wave aging freeze while paused. Focus loss clears held input and cancels overrides.

Sonar responses animate for 10 seconds; scanned patterns remain in the comparison HUD until retry. Only player sonar scans cases; footsteps, guard waves and decoys do not. Case locations stay fixed; their echo assignments and the key target change. Reload for a new campaign or press 2 for a fresh practice puzzle; consecutive rolls can repeat by chance.

Level 3 exposure uses the same spherical wave bands as the shader (`WAVE_BAND`, `ECHO_OFFSET`, `ECHO_BAND` in `src/shaders.js`) with a 0.65-second visibility grace period. Seeing an exposed player for 0.5 seconds starts pursuit. Cover blocks vision; search uses the last seen position and ends after four seconds. Decoys give a 5-second investigation commitment while visual detection can still interrupt it.

## Credits

- Three.js - MIT Licence
- Vite - MIT Licence
- All geometry, shaders, interface graphics, game logic, and sound synthesis in this Alpha are original procedural work created for SIGNAL.
