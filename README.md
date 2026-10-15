# SIGNAL

A Three.js heist game for COMS3006A / COMS3025A. Wren, a safecracker who works by ear, hits the Varga Museum over three visits: the closing-night gala, a return at night, and a lockdown escape. Sound shows up as rings of light on the floor, and the same rings are how guards notice you.

## Run it

```bash
npm ci
npm run dev
```

Open http://localhost:5173/ and click the screen to look around.

| Key | Action |
| --- | --- |
| W A S D | Move (running is the default) |
| Shift | Walk quietly |
| C / Z | Crouch / crawl |
| X | Sprint (uses stamina) |
| Space | Jump |
| Mouse or arrow keys | Look |
| G | Sonar pulse |
| E | Interact: take loot, swipe the vault, set a tumbler, loop a CCTV feed |
| Hold E | Pickpocket from behind a guard |
| Q | Record your Echo, press again to rewind and replay it |
| Tab, Shift+Tab | Cycle CCTV cameras, Q to leave |
| F | Dampener (your rings stop being heard while it lasts) |
| 1 / 2 / 3 | Gala / night / lockdown lighting |
| P / M | Toggle picture-in-picture / minimap |
| K | Cycle quality (low, medium, high) |
| R / N | After a capture or win: restart from checkpoint / new heist |

## The heist so far

1. Lift Okafor's keycard by holding E behind him while he patrols the west wall.
2. Optional: take the three valuables on the cocktail tables and the evidence file on the security desk.
3. The shutter to the vault wing opens only while both pressure plates are held. Stand on one, record an Echo with Q, rewind, then walk to the other plate while your Echo holds the first.
4. Cross the laser corridor: jump the low beam, crawl or time the moving ones.
5. Swipe the keycard at the vault and crack the three tumblers by ear. Turning fast is loud.

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
| `src/world/hall.js`, `src/world/objects.js` | The Grand Hall, laser corridor, vault, loot, plates and shutter |
| `src/render/` | The rendering layer (Huzaifa) |
| `src/gameplay/`, `src/core/` | Gameplay systems and the event bus (teammate 2) |
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
