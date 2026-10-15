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
| W A S D | Move |
| Mouse or arrow keys | Look |
| Shift | Run |
| C | Crouch |
| 1 / 2 / 3 | Gala / night / lockdown lighting |
| Space | Sonar pulse |
| Tab, Shift+Tab | Cycle CCTV cameras |
| L | Loop the current camera for 8 seconds |
| Q or Backspace | Leave CCTV |
| F | Dampener effect |
| G | Glitch burst |
| H | Dissolve or restore the Echo |
| P / M | Toggle picture-in-picture / minimap |
| K | Cycle quality (low, medium, high) |

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
| `src/world/hall.js` | The Grand Hall and the laser corridor to the vault |
| `src/render/` | The rendering layer (Huzaifa) |
| `public/models/`, `public/textures/` | Character models and paintings |
| `tests/render.test.js` | Checks for the sound rings and lasers |

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
