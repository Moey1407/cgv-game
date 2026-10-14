# SIGNAL — teammate handoff TODO

Updated: 13 October 2026. Gameplay work is handed over to the team from this point.

This is the remaining-work checklist for the current local source. Use [README.md](README.md) for controls, [TEAM_HANDOFF.md](TEAM_HANDOFF.md) for implementation details and [PLAN.md](PLAN.md) for the original plan. Later user decisions below supersede the original diamond-pulse requirement.

## Current status

- Level 1: steal the east security-room key and unlock the north vault. Zidan confirmed the main path and corrected wall signs work in the browser.
- Level 2: central spawn, whole-vault guard patrol, randomized key/case signatures and sonar identification. Zidan confirmed the revised level works in the browser.
- Level 3: carry the diamond, override two doors and escape north; two independent guards, routed movement, exposure/suspicion/pursuit/search, and current-level retry are implemented.
- Latest recorded verification: production build and all **23 focused checks passed**. This is automated evidence, not full browser acceptance.
- **Level 3 remains unapproved after difficulty feedback.** The latest fix for guards sandwiching the player has not received browser confirmation.
- Campaign integration and final acceptance (original Changes 8–9) remain unfinished.

## Decisions to preserve

- Keep the Three.js/Vite architecture and sound-as-light shader.
- **The diamond must not emit automatic pulses.** Its carrying footstep amplification and Level 3 spawn wave were also removed. Normal footsteps, guard echoes, sonar and override noise remain.
- Do not restore the floating control signs at the entrance. Mission signs use fixed panels positioned on their surfaces.
- Case A/B/C locations stay fixed; the key target and case echo assignments shuffle for a new run or practice selection. Each puzzle has exactly one matching case. Retry preserves its solution and clears observations.
- Door overrides require holding E for 3.5 seconds with range, facing and clear front access. Release, movement away, looking away and pause reset progress.
- Opening doors disables their colliders and rebuilds guard navigation. Guards can follow through opened doors.
- Override wave radius is now 7 metres; override hearing requires clear access. Closed doors and cover block this alert. Decoys hold investigation attention for 5 seconds, unless visual detection takes priority.
- No multiplayer, rival thief, database, new engine or cinematic pipeline.
- **The training floor is stage 4, never stage 0.** Collider filtering everywhere reads `box.stage && box.stage !== stage`, so a falsy stage id leaks every training wall into all three real levels. `tests/tutorial.test.js` asserts the id stays truthy.
- **Training is not a graded level and never a campaign.** It is reached with `T` from the title screen, taints the campaign record on entry, and does not change the three-level structure.
- **The dampener is always available in Levels 1 to 3.** Training is the only place it has to be found, so a marker who skips it still has a complete game.
- **Campaign validity.** A run is a campaign only if it starts at Level 1 and clears 1 to 2 to 3 in order. A practice jump (`1`/`2`/`3`) or any `?qa` hook that skips content taints the run permanently; a `PRACTICE` badge then shows in the HUD and the result screen says the run does not count. Taint cannot be cleared by anything except a full restart.
- **Retry statistics accumulate.** Active play time, sonar uses and detections are campaign totals that carry across level transitions *and* across level retries, because a retry is part of how long the job took. `RESTART HEIST` is the only thing that clears them. Retries are counted and shown so a padded run is visible rather than hidden.
- **Two separate actions on the result screen.** `R` retries the level you lost, keeping campaign totals. `N` restarts the whole heist: Level 1, a fresh puzzle, totals cleared, campaign record clean. `RESTART HEIST` is hidden only on a first-attempt Level 1 loss, where it would be identical to retry.

## P0 — playable, fair and reliable beta

Suggested owner: gameplay developer, with a separate tester confirming browser results.

- [ ] **Validate the latest Level 3 balance first.** Start with practice key 3; quietly approach Door 01 using Shift/C, override behind its new cover, cross, then repeat at Door 02. Confirm both guards do not automatically converge on opposite sides of a closed door.
- [ ] Verify decoy distraction creates enough time to complete an override and pass through. Test a nearby guard with clear access still reacts; the fix must not make guards universally deaf.
- [ ] Confirm a complete escape is achievable without visual detection using observation, quiet movement and distraction. Record any unavoidable detection/capture situation and tune from that evidence.
- [ ] Test release/movement/facing/pause cancellation, then restart after capture. Expect two closed doors, the carried diamond, two reset guards and no stale input/progress.
- [ ] Check guards respect closed doors, use opened doors and cannot capture through separating geometry.
- [x] Fix **Level 1 direct guard movement**: it still bypasses navigation and can investigate through walls. Reuse the existing navigation module, validate all targets and test a complete patrol plus wall-separated sound investigations.
- [x] Fix **decoy wall/prop collision**: current throwables only handle floor impact and can pass through walls. Use height-aware bounds/sweeps so low props can be thrown over. Emit one impact sound and avoid inaccessible off-map destinations.
- [ ] Review detection across levels: visual exposure/suspicion/pursuit currently applies to Level 3; Levels 1–2 retain hearing/investigation. Extend fair line-of-sight detection consistently, or explicitly agree and document the beta's narrower behaviour.
- [ ] Confirm pause freezes movement, guards, lasers, projectiles, cooldowns, waves, overrides and scored time; test focus loss and resume while moving/holding E.

Current Level 3 layout: player (0, 18), guards (-12, 16) and (-11, -4), Door 01 (0, 8), Door 02 (9, -8), exit (0, -20.5). Patrols stay left of the main routes; cover protects Door 01's reader.

## P0 — campaign and retry integration

Suggested owner: gameplay/UI developer.

- [ ] Add the complete opening briefing: security key → compare acoustic signatures → steal the real Echo Diamond → escape lockdown.
- [ ] Review objective text, transitions and ending for the actual three-level story; remove remaining generic artefact/extraction instructions.
- [x] Keep current-level retry and add a separate **restart full heist** action, including from Level 3/failure. Make each action clearly labelled.
- [x] Verify retry inventories: Level 1 has no key, Level 2 has the key, Level 3 has the diamond. Full restart clears progression and generates a new puzzle. *(`setStagePreview` sets inventory from the stage; `restartHeist` calls `vaultMission.newHeist()`. Confirmed by automated browser checks, not yet by a human playthrough.)*
- [x] Make practice status persistent and visible. Practice/debug jumps must not qualify as completed campaigns; normal campaign completion must require all three levels in order.
- [x] Review QA hooks behind `?qa`; keep useful test access without allowing skipped runs to receive campaign completion credit.
- [x] Replace current statistics with **player sonar uses**, **visual detection incidents** and **active play time**. `ringCount` currently counts all sound sources; `alerts` counts heard events, not actual detections.
- [x] Decide and document retry statistics: which values reset for the current attempt and which accumulate across the campaign. Preserve campaign totals across ordinary level transitions.
- [ ] Stress-test repeated retries, practice jumps and transitions for stale timers, duplicated effects, extra guards/markers and delayed callbacks affecting a new run.

## P1 — environment, audio and interface

Suggested owner: environment/audio/UI teammates.

- [ ] Polish each level's materials, props and landmarks without changing collision-critical routes or blocking readers and signs.
- [ ] Improve guard animation and make guard direction/state readable, while retaining cyan player, red threat and amber warning colours.
- [ ] Add/balance original or licensed ambience and action feedback: key pickup, case responses, mismatch, override progress/opening, lockdown and escape. Inspect existing procedural audio before adding duplicate cues.
- [ ] Polish signature comparison, exposure feedback and door progress; check legibility at 1920×1080 and 1366×768.
- [ ] Test fixed signs from front/side views; avoid camera-facing signs clipping into walls.
- [ ] Add options/credits UI as needed and reconcile Alpha/Beta and Blackout/Lockdown labels with the actual build.
- [ ] Verify actual lighting/shadow behaviour. The custom environment shader does not sample standard Three.js lights/shadows; enabled shadow-map flags alone are not evidence of environment shadows.
- [ ] Record every external asset, author and licence in the credits/report.

## P1 — acceptance and testing evidence

Suggested owner: level-design/playtesting teammate.

- [ ] Play one uninterrupted campaign without practice/debug shortcuts.
- [ ] Fail/retry once per level, restart the full heist from Level 3, then complete another campaign.
- [ ] Try wrong and correct cases across several randomized puzzles; confirm retries preserve the solution and only the correct pickup triggers lockdown.
- [ ] Test with at least five unfamiliar players. Record duration, failures, confusing objectives/controls and any unavoidable guard encounters.
- [ ] Tune towards roughly 8–12 minutes total, prioritising fairness and completion. Do not add a countdown just to force duration.
- [ ] Check Console/Network for loading/runtime errors and inspect performance with both guards active and doors opening.
- [ ] Verify Ubuntu Chrome, Firefox if available, and lab hardware if accessible. Record browser/hardware/resolution and mark untested environments explicitly.
- [ ] Validate production output served from a subfolder using the commands below.
- [ ] Update README and TEAM_HANDOFF with final capabilities, actual manual results and remaining limitations. Never mark an unperformed browser check as passed.

## P2 — trailer and submission

Suggested owner: presentation/submission teammate.

- [ ] Capture a 60–90 second trailer: title → sound reveal → security key → signature comparison/laser timing → decoy → noisy override/pursuit → emergency exit → end card.
- [ ] Prepare the report/slides with concept, controls, implementation, shader explanation, screenshots, testing evidence, limitations, credits and contributions.
- [ ] Explain the shared wave-band constants (`WAVE_BAND`, `ECHO_OFFSET`, `ECHO_BAND`) and the Level 3 patrol/investigate/pursue/search states.
- [ ] Describe the minimap accurately as a Canvas 2D tactical view; do not present the unused orthographic camera as a demonstrated alternate view.
- [ ] Verify the lecturer's current submission names, required files and hosting requirements.
- [ ] Build fresh source and LAMP archives after acceptance. Existing `signal-source.zip`, `signal-lamp.zip` and `lamp-test/` predate these changes and must not be treated as current deliverables.
- [ ] Verify the source handoff includes new modules and tests; verify the LAMP ZIP contains `index.html` at its root and only the latest built output.
- [ ] Publish/upload only when explicitly requested. No deployment or archive refresh was performed for this handoff.
- [ ] Freeze features at least 24 hours before submission; use the remaining time for testing, packaging and evidence.

## Commands — from the project root

First setup on a fresh checkout with the npm lockfile:

```bash
npm ci
```

Focused checks and latest production preview:

```bash
node tests/galleries.test.js
node tests/vault.test.js
node tests/escape.test.js
node tests/level1-map.test.js
node tests/throwing.test.js
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/**. Stop an old preview with Ctrl+C before restarting. Hard-refresh with Ctrl+Shift+R after rebuilding. Do not test stale `dist/` output if the build failed.

Subfolder acceptance check:

```bash
npm run build
signal_preview_dir=$(mktemp -d)
mkdir -p "$signal_preview_dir/signal"
cp -R dist/. "$signal_preview_dir/signal/"
python3 -m http.server 8080 --bind 127.0.0.1 --directory "$signal_preview_dir"
```

Open **http://127.0.0.1:8080/signal/** and play through. Stop the server with Ctrl+C afterward.

## Source ownership and integration

| Area | Main files |
| --- | --- |
| Controls, state, guards, progression, rendering/audio | `src/main.js` |
| Stage layouts, patrol configuration and hazards | `src/stages.js` |
| Galleries room, key and signs | `src/galleries.js` |
| Randomized signature puzzle and reset | `src/vault.js` |
| Overrides, door colliders and final exit | `src/escape.js` |
| Navigation and access checks | `src/navigation.js`, `src/interactions.js` |
| Hearing, decoy commitment and visual detection | `src/visibility.js` |
| Wave shader and shared band constants | `src/shaders.js` |
| Interface | `index.html`, `src/styles.css`, `src/screens.css`, `src/gameplay.css` |
| Focused checks | `tests/galleries.test.js`, `tests/vault.test.js`, `tests/escape.test.js` |

- [ ] Assign named owners to the task groups above and agree on branches/file ownership before parallel edits; `src/main.js` is shared by most gameplay tasks.
- [ ] Review `git status` before handoff. Several changed/new modules, tests, documents and `package-lock.json` are not committed; preserve unrelated local changes and ensure the source transfer includes all needed files.
- [ ] Agree on the dependency/lockfile workflow; avoid upgrading dependencies during the beta freeze or handing over only the old source archive.
- [ ] After each merge, run the focused checks, build production and browser-test the affected mechanic plus campaign transitions.

Completion rule: tick tasks only when their result is recorded and verified. For browser work, record setup/actions, expected behaviour, actual result and unresolved issues.
