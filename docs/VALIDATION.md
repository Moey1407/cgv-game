# Validation for feature/seamless-heist-flow

## Completed on 15 October 2026

- `npm test`: 125 passed, 0 failed (latest integration and presentation pass).
- `npm run build`: successful. Vite reports the existing large Three.js chunk warning; it is not a build failure.
- Development review scenarios exercised the gala objective chain, the vault chain including explicit Star collection, and the escape interlocks, evidence upload and zipline finish.
- Visual checks covered coloured guests, uniformed guards, laser housings, a physical duct interior and the zipline rig/skyline. The title-menu voice test completed successfully.
- Latest checks covered the reshaped human models, both actual passage completion conversations, and their final buttons loading the next illustrated briefing. Essential controls and entry buttons fit a 1280 x 720 viewport.
- The 18-page / 135-clip recording PDF was regenerated and all pages visually reviewed. Its cast export includes the new transition dialogue.

## Scope and remaining checks

Development presets freeze patrols for repeatable scenario checks. They do not establish live difficulty, first-time clarity, performance on other machines or that a whole campaign is enjoyable.

Muhammed tried the current game but did not reach level 3. The cause has not yet been established. Do not mark the campaign as manually passed. Teammates should complete a fresh run without review tools, record where they fail and how long each level takes, and check checkpoint retries and both endings.

Test in a normal Chrome or Edge tab, starting at `http://127.0.0.1:5173/` without a QA query. Verify pointer lock, audio, console/network errors, laptop and lab-PC frame rate, cold loading and memory over repeated runs. Embedded-browser automation could not reliably acquire pointer lock; a normal-browser manual check is still required.

The embedded development review sometimes captured a black WebGL surface after time-stepping, despite a diagnostic framebuffer read returning valid colour with no GL error or context loss. The temporary diagnostics were removed. Treat embedded capture/playback as unverified, and explicitly check live movement and rendering in normal Chrome/Edge before merging or shipping.

Final voice performances, final art approval, fully directed cinematics and submission assets remain team tasks. The authored stairs from rendering-layer are now preserved and integrated. See `REZEFA_HANDOFF.md` for priorities. This branch is an integration candidate, not a declaration that the game is finished.
