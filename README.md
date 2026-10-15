# SIGNAL

A Three.js heist game for COMS3006A / COMS3025A. Wren, a safecracker who works by ear, hits the Varga Museum over three visits: the closing-night gala, a return at night, and a lockdown escape. Sound shows up as rings of light on the floor, and the same rings are how guards notice you.

## Run it

```bash
npm ci
npm run dev
```

Open http://localhost:5173/. The title page runs a slow camera through the museum. Press Play, read the briefing for the level, then press Enter the Museum to lock the mouse and start.

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
| E | Interact: take loot, swipe the keycard, use a vent or the stairs, set a tumbler, loop the selected CCTV feed |
| Hold E | Pickpocket from behind a guard, hold an override |
| Q | Level 3 only: record your Echo, press again to rewind and replay it |
| Tab | Open/close the CCTV wall; all feeds remain visible |
| 1–4 | Select a CCTV feed; E loops the selected feed for eight seconds |
| F | Dampener (your rings stop being heard while it lasts) |
| P / M | Toggle picture-in-picture / minimap. The map is local until sonar resolves the full floor |
| Esc | Pause (resume, restart from checkpoint, options, quit to title) |
| R / N | After a capture: restart from checkpoint / back to title |

## The three levels

Each level has its own briefing page. Finishing one loads the next and shows its briefing. Cash and evidence carry across the whole run, and the grade and ending come at the end of Level 3.

1. **The Gala.** The Grand Hall during the party. Use the cameras (Tab) to watch Okafor, lift his keycard by holding E behind him, grab what you can from the tables, then swipe the keycard at the vault wing door at the end of the corridor.
2. **The Vault.** The next night, in the dark. Crawl under the first laser, jump the second, time the third, or crouch into the vent on the west wall to skip most of it. Briggs loops the vault room. Crack the three tumblers by ear. Turning fast is loud.
3. **The Double-Cross.** Dex sells you out and the building starts sealing (four minutes). The Echo comes online: record yourself holding the shutter override, rewind, and walk through while your Echo holds it. Lure the sweep team away from the stairwell, then put you and your Echo on both plates on the top floor to arm the roof override. Hold it to open the hatch and take the zipline.

Footsteps, sonar, lasers, cameras and the safe all raise the alarm. It climbs from Quiet to Suspicious, Alert and Lockdown, and guards get faster as it rises. Guards hear rings, see you when you are lit and inside their view cone, then investigate, pursue and search. Getting caught sends you back to the last checkpoint.

The game starts on medium quality and drops to low by itself if it runs under 40 FPS. The FPS counter is in the bottom-left corner.

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
