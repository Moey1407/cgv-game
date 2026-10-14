# SIGNAL - Alpha

SIGNAL is a browser-based Three.js stealth game for COMS3006A / COMS3025A. Sound is both the player's map and their greatest risk: every footstep, decoy, guard pulse, and active sonar wave reveals the Halvard Archive through a custom shader.

You play Imani Sulé, a former Halvard Archive conservator. Eighteen months after the archive dismissed her, she returns to recover Accession H-1968-07, a sealed recording reel that was removed from the catalogue and scheduled for destruction. Her homemade echo rig is off-band, so her returns appear cyan while the guards' licensed rigs answer in red.

## Three-level mission

1. **Upper Galleries** - cross the archive's low-lit public floor, learn sonar, quiet movement and decoys, steal the staff key from the east security room, and descend to the deep store.
2. **Deep Store** - scan three sealed cases, compare their acoustic patterns with the signature stored on the key, and recover H-1968-07 from the matching case. The signatures randomize on each new run; retry preserves the current puzzle. A patrol, moving laser grids and pressure plates keep the search dangerous.
3. **Containment** - removing the reel cuts the licensed echo network and brings down a sweep team. Carry H-1968-07 through two noisy overrides with two independent guards, then reach the emergency lift. The reel itself is silent; footsteps, guards, sonar and overrides remain the sources of exposure.

Opening the Galleries descent advances to Level 2. Recovering H-1968-07 triggers containment and advances directly to Level 3 with the reel already carried. Reaching the emergency lift completes the current run. Number keys 1-3 remain available as practice jumps for demonstrations; later-level practice starts include the correct inventory. Failure retries the current level with its starting inventory and closed doors.

## Controls

- **WASD** - move
- **Mouse** - look
- **Shift** - hold to walk quietly (Valorant-style); normal movement runs
- **C** or **Ctrl** - crouch / quiet movement
- **Space** - active sonar pulse; reveals a large area but can attract the guard
- **Left click** - throw a sound decoy (3 charges; one charge returns every 6 seconds)
- **E** - take the staff key / open the descent in Level 1; try a scanned case in Level 2; hold to override doors in Level 3. Interactions require range, clear access and unpaused gameplay. Case readers and door overrides are accessed from their front faces; overrides also require facing the door.
- **1 / 2 / 3** - practice-select a level
- **R** - retry the current level after failure; restart the run after success
- **Esc** - release the mouse and pause

## Technical evidence

- Three.js realtime 3D scene with procedural archive geometry
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
- `src/stages.js` - Deep Store and Containment geometry, hazards, objectives, patrol routes, and level settings
- `src/galleries.js` - Level 1 security room, keycard, vault entrance and fixed mission signs
- `src/vault.js` - Level 2 cases, signature comparison, sonar arrival and puzzle/reset state
- `src/navigation.js` - Levels 2–3 guard grid routing, obstacle clearance and swept movement checks
- `src/escape.js` - carried-reel escape, cancellable door overrides, collision updates and final exit
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
