# Beta polish - 28 October 2026

Base: `beta-changes`, `c1394f0` (Beta v2). Existing voices, artwork, story and gameplay are retained. No hosting changes.

## Carpet

The gala runner now has a seeded 256px woven colour texture, matching tangent-space normal map, double gold borders and a restrained diamond motif. The pair is generated once, reused by the existing runner material and mipmapped by Three.js. There is no external texture download, displacement geometry or extra carpet draw call. Sound-ring patching remains intact.

## Pause > Graphics, audio & accessibility

- Faster / Balanced / Detailed shortcuts, plus Auto or manual quality.
- Resolution scale: 50 / 75 / 100 / 125% of the chosen preset's pixel ratio.
- Independent shadows, floor reflections, bloom, film grain and vignette preferences.
- Brightness / exposure and field of view (55-90 degrees).
- Reduced motion: suppresses head bob, post-process glitch, the zipline external camera cut, camera roll and FOV surge; CSS motion is reduced too. Scripted path travel and landing still happen.
- Optional FPS / render-stat display, alongside existing audio, sensitivity and guidance controls.
- Reset graphics; Escape from Options returns to the originating menu.

Values migrate from the existing storage key and are validated. Presets do not overwrite audio or guidance settings. Low quality deliberately skips reflections/shadows/post-processing even if their preference is checked. Brightness/FOV changes do not rebuild render targets: the post-processing size changes only when the effective pixel ratio changes. High quality and changing shadow variants can still need GPU work; do not claim all shader stalls are eliminated.

## Credits

Expanded team, systems, world, animation, story, technology, asset/voice/art and thanks sections. Known full names are retained; Ahmed's full name still needs team confirmation. Credits now use readable native scrolling with automatic playback, pause, replay and 1x/2x speed. Wheel/touch reading pauses auto-scroll. Reduced-motion preferences start the roll paused. Closing cancels playback and reopening starts at the beginning. Entry from title/results and the campaign ending remains supported.

## Verification

136 Node tests pass and the production build succeeds. New regression coverage includes legacy settings, invalid values, presets, target-resize avoidance, credits pause/replay/end/reopen/reduced motion/high-refresh scrolling and deterministic non-flat carpet maps. Browser smoke checks covered menu/preset operation and the gala material. These are not a full human campaign playthrough or an FPS benchmark.

Video tooling/output is isolated from the game bundle and ignored by Git. The Brag video is a 20-second beta-polish showcase using an actual gala still, recreated settings/credits and the existing rooftop still, not a narrated development-history video. Music/SFX licences are recorded beside the MP4. No video or game is published by this change.
