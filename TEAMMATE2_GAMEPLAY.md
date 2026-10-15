# Teammate 2 - Gameplay Systems

This branch began with Teammate 2 gameplay and now includes the requested cross-team continuity and presentation pass. See `docs/REZEFA_HANDOFF.md` for the current scope and remaining team-owned work.

## Integrated now

- Event bus for cross-team hooks.
- Four-stage alarm: Quiet, Suspicious, Alert and Lockdown.
- Alarm decay while hidden, plus guard speed and pulse-rate scaling.
- Level-entry checkpoint snapshots.
- Recoverable laser and pressure-plate mistakes before Lockdown.
- Stationary 0.75-second badge copy, witnesses and a close-tail warning in Level 1; the original badge stays on Okafor.
- Extracted movement profiles: walk, run, crouch, crawl and sprint.
- Real vertical jump clearance for lasers and floor traps.
- CCTV feeds, cone detection and eight-second camera loops in Level 1.
- Four-feed CCTV console: movement and decoy throwing are disabled while viewing; `1–4` selects a feed and `E` loops it.
- The Star is the only financial target; one optional evidence file per level changes the ending.
- Three-tumbler mouse-driven safecracking on the correct Level 2 case.
- Level 3 Echo recording at 20 Hz, rewind and interpolated replay.
- Echo footsteps, guard investigation/capture and recorded override input.
- Two live Echo sync plates that silently open Door 01 when player and replay occupy them together.
- Local-only tactical map while moving; only sonar reveals the complete floor.
- Runtime performance profiles: Auto now measures actual gameplay, Low bypasses post-processing, CCTV uses smaller eight-bit targets, menu rendering is capped, and crowd animation/visibility scales by quality.
- Pre-rendered local MP3 dialogue, six cast scripts, import/backup tools, earpiece processing and stale-script protection. Final performances are pending.

## Shared integration contracts

- `levels/schema.js`: the active data-driven museum contract used by all three playable levels.
- `src/core/level-schema.js`: the earlier gameplay hook contract retained for compatibility tests, not the lead level format.
- `src/gameplay/zipline.js`: map-independent mount, ride, lean, drop and completion logic ready for teammate-owned anchors or a later replacement of the current scripted finale.

## Ownership boundary

Teammate 2 owns gameplay state, input rules, collision, readable interaction feedback and performant placeholder geometry. Teammate 3 owns final environments, models, textures, lighting art, camera housings, Echo appearance, safe appearance, animation and the final HUD skin. The temporary interface exists to prove each mechanic and can be reskinned without changing gameplay modules.

Visual guardrails for the final pass: every visible element must communicate a gameplay state; avoid gratuitous gradients, glass cards, excessive glow, repeated rounded panels and permanent branding during play. Keep the game title on the title screen, not in the moment-to-moment HUD.

The current gala crowd uses original small humanoids with coloured suits/dresses, skin, hair and facial details. Guards have separate blue uniforms, caps and badges. `src/render/people.js` provides the replacement contract; preserve quality scaling and avoid loading a separate multi-megabyte GLB per guest.

## Event contract

- `alarm:change`, `alarm:level`, `alarm:lockdown`
- `player:noise`, `player:jump`
- `item:picked`, `pickpocket:complete`
- `camera:loop`, `camera:detected`
- `safe:noise`, `safe:tumbler-set`, `safe:opened`
- `echo:start`, `echo:replay`, `echo:complete`, `echo:shattered`
- `plate:change`, `door:opened`
- `zipline:mount`, `zipline:move`, `zipline:dismount`, `zipline:complete`
- `checkpoint:save`, `checkpoint:restore`
- `hazard:trip`, `level:complete`

Huzaifa can subscribe visual effects to these events. Teammate 3 can subscribe UI, radio and audio without importing or changing gameplay internals.

## Merged into the museum

Huzaifa's data-driven museum and renderer are now the branch baseline. These systems run in that version through `src/main.js`: alarm, stamina and movement profiles, rechargeable decoys, pickpocketing Okafor's keycard, pickups, four-feed CCTV viewing/detection/looping, local/full-sonar minimap states, the guided Echo flow, safecracking and checkpoints. Guard hearing, sight, pursuit and search live in `src/game/guardAI.js`. The Echo replay turns the short way round (`lerpAngle`) and records the movement mode.

## Original controls

- `Shift`: quiet walk
- `C`: crouch
- `Z`: crawl
- `X`: sprint
- `Space`: jump (disabled while crawling)
- `G`: sonar pulse and full-map reveal
- `E`: interact, pickpocket or hold an override
- `Q`: start/stop Echo recording in Level 3
- `Tab`: open/close the CCTV wall
- `1–4` in CCTV: select one of the simultaneously visible feeds
- `E` in CCTV: loop the selected feed for eight seconds
- Mouse + `E` at the correct Level 2 case: turn and set safe tumblers

Reserved controller API for the team (the current Level 3 finale is still scripted):

- `E`: mount the nearest anchor
- `A / D`: lean left or right while riding
- `Space`: emergency drop

Run `npm test` and `npm run build` before every merge.
