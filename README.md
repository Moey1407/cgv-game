# SIGNAL

A Three.js heist game for COMS3006A / COMS3025A. Wren, a safecracker who works by ear, prepares access during the Varga Museum gala, returns after closing, and survives a double-cross. Three stages follow one heist night. Sound shows up as rings of light on the floor, and guards hear the noise you make.

Current integration notes: [story and mission flow](docs/HEIST_FLOW.md), [continuation handoff](docs/REZEFA_HANDOFF.md), [all six voice scripts](docs/voice-cast/README.md).

## Run it

```bash
npm ci
npm run dev
```

Open http://localhost:5173/. Press Play for the opening and click Enter the Gala to lock the mouse. Nearby prompts teach the relevant controls. Full controls are optional at entry or from Pause → Controls. Normal level changes use a short fade and retain the mouse lock.

| Key | Action |
| --- | --- |
| W A S D | Move (running is the default) |
| Shift | Walk quietly |
| C / Z | Crouch / crawl |
| X | Sprint (uses stamina) |
| Space | Jump |
| Mouse or arrow keys | Look |
| G | Sonar pulse; briefly reveals the complete tactical map |
| Left click | Throw a decoy (three charges, one restored every six seconds) |
| E | Take evidence/the Star, authorise night entry, use a vent or the stairs, set a tumbler, loop the selected CCTV feed |
| Hold E | Copy a stationary guard's badge (0.75 seconds), isolate a circuit, hold an override |
| W / S inside a duct | Crawl forward / backward through the visible tunnel |
| A / D on the zipline | Lean during the escape ride |
| R | Level 3 only: record your Echo, press again to rewind and replay it |
| Tab | Open/close the CCTV wall; all feeds remain visible |
| 1–4 | Select a CCTV feed; E loops the selected feed for eight seconds |
| F | Dampener (your rings stop being heard while it lasts) |
| P / M | Toggle picture-in-picture / minimap. The map is local until sonar resolves the full floor |
| T | Hold behind a guard to sedate him for about 40 seconds (2 doses on Levels 1 and 2) |
| V | Switch between first-person and third-person view |
| Esc | Close the camera feeds or step back from the safe |
| Q | Pause menu (resume, restart from checkpoint, options, quit to title) |
| R / N | After a capture: restart from checkpoint / back to title |

## Getting around

A marker on screen always points at the next objective with its distance, and the object you need glows when you get close. If you stay stuck on one step for about 40 seconds, Dex (or Wren on Level 3) radios a hint. Levels are joined by short service passages: walk in, the door shuts behind you, and the next level loads while you walk to the far door.

For testing, `npm run dev` and open `/?level=2` or `/?level=3`, press Play, and the briefing starts on that level. This only works in the dev server.

## The three levels

Each stage has a clear objective chain. The Star and evidence carry across the run; the final grade and ending follow the escape. The optional files expose Dex, while unrelated theft pickups have been removed.

1. **The Gala.** Dex has added Wren to the guest list. First slip through the staff door on the east wall into the security office, get past the officer, and hold E at the desk to plant the rig. That unlocks the cameras (Tab) and the office monitors, and the first evidence file is on the records cabinet. Then loop the hall camera and copy Okafor's badge during a quiet inspection stop. Nearby witnesses and an extended close tail can spoil the attempt. Authorise the night entry at the staff reader, then return to the lobby and leave.
2. **The Vault.** Return at 01:30 on the same heist night. Crawl, jump and time the beams, then choose the inner checkpoint or the duct. Isolate the safe's tamper circuit, crack three tumblers while Briggs patrols, explicitly take the Star and return to the service fire door.
3. **The Double-Cross.** Dex seals Wren into the service wing. Record the shutter override and cross with the Echo's help. Get past two patrols using cover, a distraction or the duct. Reach the roof landing, satisfy the two-operator sensors, release the hatch and ride Wren's pre-rigged line to the service roof. All three evidence files trigger an upload and the exposed-Dex ending. The current escape budget is six minutes, pending first-time playtests.

Footsteps, sonar, lasers, cameras and the safe all raise the alarm. It climbs from Quiet to Suspicious, Alert and Lockdown, and guards get faster as it rises. Guards hear rings, see you when you are lit and inside their view cone, then investigate, pursue and search. Getting caught sends you back to the last checkpoint.

Auto quality starts on medium and drops if actual frame rate falls below 48 FPS. Low disables expensive post-processing and reduces auxiliary rendering. The FPS/call counter is in the bottom-left corner. Validate performance on the target laptop and lab PC before shipping.

## Build for the LAMP server

```bash
npm run build
```

Zip the contents of `dist/` so `index.html` sits at the top of the archive. All paths are relative, so it works from a subfolder.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `src/main.js`, `src/styles.css` | The game page, the game loop and controls |
| `src/world/hall.js` | The Grand Hall and vault corridor (Level 1) |
| `src/world/levelBuilder.js` | Builds Levels 2 and 3 from their data files: floors, walls, ceilings, lights, rain, collision and line of sight |
| `src/world/levelProps.js` | Per-level props: loot, keycard reader, safe and dial, vents, shutter, plates, hatch, zipline |
| `levels/` | Level data (teammate 3), with `levels/index.js` gathering all three |
| `src/screens.js`, `src/story.js`, `src/audio.js` | Title page, briefings, pause, results, Dex's radio and sound (teammate 3) |
| `src/render/` | The rendering layer (Huzaifa) |
| `src/gameplay/`, `src/core/` | Gameplay systems and the event bus (teammate 2), including the reserved map-independent zipline controller |
| `src/game/guardAI.js`, `src/game/hud.js` | Guard behaviour and the HUD that connect the two |
| `public/models/`, `public/textures/` | Character models and paintings |
| `tests/` | Unit tests, run with `npm test` |

### Rendering layer

| File | Provides |
| --- | --- |
| `soundField.js` | Sound rings on lit materials, injected with `onBeforeCompile`. `emit(position, colour, radius)`, `update(dt)`, `patch(material)`, `reached(point, ring)` |
| `materials.js` | Marble, damask and steel textures with generated normal maps |
| `lighting.js` | Gala, night and lockdown lighting, rotating beacons |
| `skybox.js` | Night sky shader with stars, moon, clouds and a city skyline |
| `postfx.js` | Bloom plus a grading shader: vignette, grain, alarm pulse, glitch, dampener, damage. Quality presets |
| `cctv.js` | Security cameras, CRT shader, camera looping, picture-in-picture, `canSee(index, point)` |
| `minimap.js` | Orthographic top-down map rendered from a real camera |
| `lasers.js` | Laser beam shader, rise / sweep / blink patterns, `hits(point, radius)` |
| `hologram.js` | Echo hologram shader with scanlines, rim glow and dissolve |
| `props.js` | Chandelier, framed painting, cocktail table, velvet rope, column, banner |
| `characters.js` | Model loading, animation, facing offsets, blob shadows |
| `dispose.js` | Frees geometry, materials and textures when a level unloads |

## Credits

- Three.js and Vite, MIT Licence.
- Soldier, Xbot and Michelle models and animations from the Three.js examples (Mixamo, Adobe).
- Public-domain paintings: The Starry Night (van Gogh), The Scream (Munch), The Great Wave off Kanagawa (Hokusai), The Shipwreck (Turner).
- Everything else was made by the SIGNAL team.
