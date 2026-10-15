# Teammate 2 - Gameplay Systems

This branch owns behaviour, not final art, dialogue, level dressing or deployment.

## Integrated now

- Event bus for cross-team hooks.
- Four-stage alarm: Quiet, Suspicious, Alert and Lockdown.
- Alarm decay while hidden, plus guard speed and pulse-rate scaling.
- Level-entry checkpoint snapshots.
- Recoverable laser and pressure-plate mistakes before Lockdown.
- Hold-to-pickpocket keycard on the Level 1 patrol guard.
- Extracted movement profiles: walk, run, crouch, crawl and sprint.
- Real vertical jump clearance for lasers and floor traps.
- CCTV feeds, cone detection and eight-second camera loops in Level 1.
- Four-feed CCTV console: movement and decoy throwing are disabled while viewing; `1–4` selects a feed and `E` loops it.
- Unique optional loot plus one evidence pickup per level.
- Three-tumbler mouse-driven safecracking on the correct Level 2 case.
- Level 3 Echo recording at 20 Hz, rewind and interpolated replay.
- Echo footsteps, guard investigation/capture and recorded override input.
- Two live Echo sync plates that silently open Door 01 when player and replay occupy them together.
- Local-only tactical map while moving; only sonar reveals the complete floor.

## Shared integration contracts

- `src/core/level-schema.js`: shared contract for level-owned cameras, pickups and checkpoints.
- `src/gameplay/zipline.js`: map-independent mount, ride, lean, drop and completion logic ready for teammate-owned anchors.

## Ownership boundary

Teammate 2 owns gameplay state, input rules, collision, readable interaction feedback and performant placeholder geometry. Teammate 3 owns final environments, models, textures, lighting art, camera housings, Echo appearance, safe appearance, animation and the final HUD skin. The temporary interface exists to prove each mechanic and can be reskinned without changing gameplay modules.

Visual guardrails for the final pass: every visible element must communicate a gameplay state; avoid gratuitous gradients, glass cards, excessive glow, repeated rounded panels and permanent branding during play. Keep the game title on the title screen, not in the moment-to-moment HUD.

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

## Current controls

- `Shift`: quiet walk
- `C`: crouch
- `Z`: crawl
- `X`: sprint
- `Space`: sonar in Level 1; jump in Levels 2 and 3
- `G`: sonar in Levels 2 and 3
- `E`: interact, pickpocket or hold an override
- `Q`: start/stop Echo recording in Level 3
- `Tab`: open/close the Level 1 CCTV console
- `1–4` in CCTV: select one of the four visible feeds
- `E` in CCTV: loop the selected feed for eight seconds
- Mouse + `E` at the correct Level 2 case: turn and set safe tumblers

Reserved zipline controls when a future level supplies anchors:

- `E`: mount the nearest anchor
- `A / D`: lean left or right while riding
- `Space`: emergency drop

Run `npm test` and `npm run build` before every merge.
