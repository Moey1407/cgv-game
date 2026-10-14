# SIGNAL - Remaining 40% Team Handoff

All three beta level mechanics are implemented: Level 1 security key/vault access, Level 2 randomized sonar identification, and Level 3 carried-diamond escape through two noisy override doors with two guards. Level 3 manual acceptance and difficulty tuning are pending; connected campaign/practice scoring and full-heist restart still need final integration.

Production build and 23 focused checks passed. Zidan confirmed Level 1 and Level 2's revised spawn/patrol/randomization in the browser. Level 3 still needs browser acceptance. Run `node tests/galleries.test.js`, `node tests/vault.test.js` and `node tests/escape.test.js`. For the latest production build, run `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` and open http://127.0.0.1:4173/.

Level 2: player spawn is (0, 3), guard spawn is (-8, 4). The guard uses a static grid with radius-inflated obstacles and swept movement checks to patrol the whole vault and investigate reachable sound positions. Space scans within 10 metres when the wave reaches a case. The key randomly requests single, double or triple echoes; cases contain a shuffled permutation of those patterns, giving exactly one solution. Fresh runs and practice selection reroll; retries preserve the puzzle. Case positions remain fixed. E tries a case's front reader. Wrong choices emit a local alert with a two-second repeat limit; the correct case alone triggers lockdown and Level 3. Response animations last 10 seconds and observations persist. Failure retries the current level, clearing input and puzzle state. Sonar wave aging and response timers freeze while paused.

Level 3: start with the diamond at (0, 18); guards start at (-12, 16) and (-11, -4), patrolling the left sides of the entrance and middle sections. Cover beside Door 01 protects its reader. Override wave radius is 7 metres; the hearing query requires clear access, so a guard across a closed door is not summoned to the opposite threshold. Door 01 is at (0, 8), Door 02 at (9, -8), and the exit at (0, -20.5). Hold E from a door's south/front side while facing it for 3.5 seconds. Noise repeats once per second; cancel resets progress. Opening disables its collider and rebuilds shared static navigation while clearing each guard's independent route. Carrying the diamond is silent; automatic pulses were removed after difficulty feedback. The carrying footstep multiplier and Level 3 spawn wave were also removed; normal movement, guard and override echoes remain. The jammed minimap briefly reveals both guards during echoes. Player exposure follows shader wave bands with a 0.65-second grace period; suspicion accumulates for 0.5 seconds before pursuit, and cover leads to a four-second search at the last seen position. Guards briefly commit to decoys for 5 seconds unless they visually detect the player. Pause freezes gameplay and scored time; blur/unlock clears input and cancels overrides.

Level 1 was rebuilt (see "Level 1 rebuild" below): it now has rooms, two routes, surface-dependent footstep noise, pathfound guard movement and the dampener ability.

Known limitations: sound-only guard behaviour is still specific to Level 2. Decoys retain the original floor-impact physics and can pass through walls. Full campaign vs practice completion, full-heist restart controls and meaningful detection statistics need Change 8. Production subfolder hosting and final performance/duration acceptance need Change 9. Keep these separate from visual polish and record them in playtest results.

## Level 1 rebuild

The old layout was one open box with four walls, mirrored across x = 0. It has been replaced with an asymmetric floor: entrance atrium, a long carpeted conservation wing to the west, a short bare transit corridor to the east, a marble central hall between them, and a north hall holding the archive stacks, the spine wall and the security office. The security office geometry and the key and door positions are unchanged, so `tests/galleries.test.js` still applies.

**Surfaces.** `FLOOR_ZONES` and `noiseScaleAt()` in `src/galleries.js` scale the radius of the player's footstep rings by what they are standing on: carpet 0.6x, stone 1x, tile 1.25x, marble 1.35x. Running makes a 7.4 m ring on carpet and a 16.7 m ring on marble. The floor colour is the only cue the player gets, so do not retint the floor patches without checking they still read apart. The HUD surface readout is `#surface-state`.

**Routes.** West is 47 m, quiet, unlit and full of cover. East is 35 m, loud, lit and almost bare. `tests/level1-map.test.js` asserts west stays at least 25% longer - if you move walls, run it.

**Guards.** Level 1 now builds a navigator like the later levels, so the patrol paths around the new walls instead of through them. `updateGuardAwareness` also runs in Level 1: a guard resolves the player only when a live return lights them up, they are inside the cone, and line of sight is clear. Level 2 is untouched.

**Dampener (F).** Suppresses the player's returns - rings still draw for the player, they just carry `damped: true`, so `hearSound` is skipped and `playerIlluminated` ignores them. Drains from a 6 s cell at 0.45/0.6/1.0/1.9 per second for still/crouch/walk/run, and an active pulse costs 1.1. Recharges at 0.82/s after a 1.6 s vent. The decision it creates is distance versus information, so keep both costs in play if you retune it.

**Guard navigation.** The old patrol jammed permanently against the north tip of the spine wall: 96% of frames produced no legal move. The fix is in the planning, not the movement.

`createNavigator` now builds two grids. Routes are planned against obstacles inflated by `radius + clearance` (0.48 + 0.22), so a planned path keeps a margin from every wall and the guard never creeps onto a collision boundary where no step is legal. Movement is still validated against `radius` alone, so anything the planner produced has slack and is comfortably walkable. Where a gap is genuinely too tight for the margin - some Level 2 and 3 geometry - planning falls back to the bare-radius grid, so no route is ever lost, it just hugs the wall there.

Routes are also string-pulled before they are handed over, so a four-neighbour staircase collapses into a few straight legs. Patrol routes average under three nodes instead of dozens, and the guard walks real diagonals rather than stepping around every half metre.

Result on the Level 1 patrol: 99.93% of steps are a straight line along the planned route, no dead ends, no rescues, 22 full laps in five minutes. `stepToward()` and `unstick()` remain as safety nets and now fire on 0.07% of frames.

This affects all three levels. Levels 2 and 3 were fragile the same way, just with fewer corners to catch on; both were re-checked in the browser after the change.

**Waypoints need room.** A patrol point two centimetres off a wall is what caused the original jam, so `tests/level1-map.test.js` now asserts every waypoint has at least 0.35 m of clearance. If you add one, run the test.

**Decoy arc.** `predictThrow()` integrates the same physics as `updateThrowables`, so the dashed arc and landing ring show exactly where the decoy will end up. The faint arc is always on while you have a charge; holding right mouse sharpens it. Thrown objects now also stop at walls instead of passing through them - colliders carry a `top` so a decoy can clear a bench but not a wall. If you add colliders by hand, set `top` or throws will pass straight over them.

**If you change the map**, run `node tests/level1-map.test.js`. It rebuilds the stage-1 collider set and checks every patrol waypoint is reachable, both routes work, and the mission path is walkable end to end. It caught two blocking bugs during this rebuild.

## Teammate A - Environment and audio polish

- Add original or correctly licensed museum props without changing collision-critical routes.
- Add ambient room tone, laser hum, guard footsteps, pickup feedback, and transition stingers.
- Balance lighting while preserving the cyan player / red threat visual language.
- Record every external asset and licence in the final credits.

**Definition of done:** all three zones feel visually distinct, audio levels are balanced, and no added asset breaks loading or performance.

## Teammate B - Level design and playtesting

- Play the complete Galleries -> Vault -> Blackout run with at least five testers.
- Record completion time, failures, unclear controls, and repeated collision problems.
- Tune guard speed, laser placement, sonar cooldown, and artefact positions from evidence.
- Verify keyboard and mouse input in Chrome and Firefox at 1920x1080 and 1366x768.
- Confirm the LAMP ZIP works when extracted and served from a subfolder.

**Definition of done:** every tester can explain the objective, finish each level, restart after failure, and report no blocker bugs.

## Teammate C - Trailer and submission package

- Capture a 60-90 second trailer in this order: title, sound reveal, security key, Vault signature comparison/laser crouch, decoy, Lockdown door override and pursuit, emergency escape, end card.
- Add concise captions explaining the custom shader and sound-as-vision mechanic.
- Prepare the final PDF/report with concept, controls, implementation, shader explanation, screenshots, testing evidence, credits, and team contributions.
- Check the exact LMS/LAMP naming and submission requirements against the latest lecturer instructions.

**Definition of done:** trailer, report, credits, source ZIP, and hosted link are ready for one final group review.

## Group integration checklist

- Do not commit directly over another member's active work.
- Keep `vite.config.js` base set to `./` for LAMP compatibility.
- Run `npm run build` after every merged change.
- Test the three-level transition sequence after every gameplay change.
- Do not replace the custom shader with a stock material.
- Preserve public hosted access until marking is complete.
- Freeze features at least 24 hours before submission and spend the final day only on testing, packaging, and evidence.
