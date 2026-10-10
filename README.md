# SIGNAL - Alpha

SIGNAL is a browser-based Three.js stealth game for COMS3006A / COMS3025A. Sound is both the player's map and their greatest risk: every footstep, decoy, guard pulse, and active sonar wave reveals the museum through a custom shader.

## Play the hosted build

https://signal-alpha-museum.freegrape4.chatgpt.site/

The deployed build is public and requires no sign-in.

## Three-level mission

1. **Galleries** - learn the echo system, misdirect the patrol, steal the first artefact, and return to extraction.
2. **The Vault** - remain crouched beneath three red laser gates while evading a faster patrol.
3. **Blackout** - the acoustic map is disabled and lighting collapses; navigate through sound wavefronts alone.

Clearing extraction automatically advances to the next security zone. Escaping Blackout completes the full run. Number keys 1-3 remain available as practice jumps for demonstrations.

## Controls

- **WASD** - move
- **Mouse** - look
- **Shift** - hold to walk quietly (Valorant-style); normal movement runs
- **C** or **Ctrl** - crouch / quiet movement
- **Space** - active sonar pulse; reveals a large area but can attract the guard
- **Left click** - throw a sound decoy
- **E** - take the artefact
- **1 / 2 / 3** - practice-select a level
- **R** - restart after success or failure
- **Esc** - release the mouse and pause

## Technical evidence

- Three.js realtime 3D scene with procedural museum geometry
- Original GLSL vertex and fragment shader for expanding acoustic wavefronts
- High-performance static Vite deployment with relative asset paths
- Cacheable Three.js vendor chunk with a 9.7 KB gzip game entry
- Adaptive render resolution and suspended idle rendering to reduce GPU work
- Keyboard, mouse, pointer-lock, audio, collision, interaction, and state-transition systems
- Guard patrol/investigate state machine with level-specific routes and speed
- Speed-driven player noise, throwable decoys, sonar cooldown, lasers, extraction, and scoring
- Level-specific procedural Web Audio ambience and transition cues with no external sound files
- Orthographic acoustic minimap, disabled for the Blackout level
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
- `src/shaders.js` - custom acoustic wavefront shader
- `src/styles.css` and `src/screens.css` - HUD and screen presentation

## Credits

- Three.js - MIT Licence
- Vite - MIT Licence
- All geometry, shaders, interface graphics, game logic, and sound synthesis in this Alpha are original procedural work created for SIGNAL.
