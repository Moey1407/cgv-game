# SIGNAL - Zidan's Beta Implementation Plan

## Implementation instructions

Read this entire plan before editing. Implement Zidan's gameplay and AI work in the order below. The beta is approximately five days away; aim to finish this work within three focused days so teammates have time for presentation, testing and the trailer.

The game is a Three.js/Vite browser game. Preserve its sound-as-light identity and existing working systems. Inspect the actual repository first: this plan was based on an uploaded snapshot, so local code may have changed.

### Required working rhythm

1. Read repository instructions, `README.md`, `TEAM_HANDOFF.md`, and relevant source files. Check `git status`; preserve unrelated local changes.
2. Work on ONE numbered change at a time. Do not implement the entire plan in one pass. Establish that a change works before building dependent features.
3. Make the change, run the production build and any relevant existing checks. Add focused tests for navigation/detection/state logic where they catch meaningful failures; do not introduce a large testing framework just for this beta.
4. Update the progress checklist and report exactly what changed, what was verified, and any limitations.
5. AFTER EVERY CHANGE, provide numbered browser tests with setup, controls/actions and expected results. Include the normal success path and a relevant failure/edge case.
6. AFTER EVERY CHANGE, provide the exact terminal commands and URL for running the LATEST production build locally. Do this even if the commands are unchanged. Explain when the user must stop an existing server and hard-refresh the browser.
7. Pause at the end of each numbered change for Zidan's browser test results. If a test fails, fix that change before continuing. This is a testing checkpoint, not a request for permission to do already-authorized work.
8. Never claim manual browser checks passed unless you actually performed them. Distinguish automated checks from tests Zidan still needs to perform.
9. Do not automatically commit, push, upload to Moodle, or deploy. Give packaging commands when useful; perform external publishing only if requested.

Use sensible defaults where this plan leaves implementation details open. Ask only when a missing fact blocks progress. Do not add multiplayer, a rival thief, a database, Blender dependency, or a new engine.

## Game identity and story

SIGNAL is a museum heist where sound produces expanding waves of light. The player uses those waves to navigate, but an illuminated player can be seen by guards.

Opening briefing: "The Echo Diamond is hidden among replicas in the museum vault. Its access key is in the security room. Get the key, identify the real diamond, and escape before security closes in."

Story progression:
- Level 1: enter the museum, steal the security key, reach the vault entrance.
- Level 2: use the key's stored acoustic signature to identify and unlock the real diamond. Removing it triggers lockdown.
- Level 3: escape silently with the diamond through locked emergency doors while two guards pursue. Automatic diamond pulses were removed at Zidan’s request after difficulty feedback.

Keep story delivery lightweight: opening briefing, objective updates, transition messages and ending text. No cinematic pipeline required.

## Three distinct levels

| Level | Objective | New mechanic | Challenge |
| --- | --- | --- | --- |
| 1 - Galleries | Steal the security-room key and reach the vault entrance | Sound-based stealth, sonar and decoy misdirection | Observe and plan around a predictable patrol |
| 2 - The Vault | Identify the real diamond among three exhibits and unlock it | Acoustic identification: compare sonar responses with the key's signature | Investigation plus existing laser timing |
| 3 - Lockdown | Reach the emergency exit with the diamond | Hold-to-override doors that generate revealing noise | Distract pursuit, choose when to commit, escape |

More guards and darker lighting alone are not the new Level 3 mechanic. The noisy, cancellable override is.

Initial duration target: 8-12 minutes total. Tune after playtesting; do not force a countdown. Retry the current level after failure, with an explicit option to restart the full heist.

## Source-review findings to verify locally

- `src/main.js` contains renderer, player, guard, interaction, state and audio logic.
- `src/stages.js` contains level configurations, Vault/Blackout layouts and hazards.
- `src/shaders.js` contains the acoustic wavefront shader.
- The snapshot's `updateGuard()` moves straight to targets without collision checks.
- Player collision uses stage-filtered XZ bounds; reuse this geometry as navigation input.
- Capture is distance-only and can occur across a separating wall.
- Decoys apply gravity/floor impact but have no wall collision.
- Interaction is distance-only, including across walls, and is insufficiently gated when paused.
- The run timer includes pause time.
- All three levels currently repeat artefact pickup and return-to-extraction.
- The snapshot ZIP lacks `package.json`, a lockfile and Vite configuration. Inspect the actual repository before assuming these are missing.

The custom environment shader does not currently sample standard Three.js lights/shadows. Do not claim working environment shadows just because shadow-map flags are enabled. The displayed minimap is Canvas 2D; an unused orthographic camera is not a demonstrated alternate view.

## Ordered implementation

### Change 0 - Establish a reproducible baseline

- Inspect the local repository and build scripts. Install using the existing lockfile (`npm ci` when valid); otherwise use `npm install`.
- Preserve dependency versions and existing architecture where possible. If configuration really is missing, add the smallest necessary setup rather than replacing the project.
- Ensure Vite uses `base: './'` and supports `dev`, `build`, and `preview` scripts.
- Build and record baseline issues. Use a feature branch if this is a git repository and the current branch is unsuitable; preserve all user changes.

Browser tests: start the game; verify WASD/mouse, crouch/walk, sonar, decoy, pickup, failure and restart. Visit all three stages using existing practice selection and note blockers. Check the browser console for loading errors.

### Change 1 - Guard collision and navigation

- Extract/reuse collision queries with entity-specific radii. Guards must use current-stage walls and solid props.
- Add an A* navigation grid, or an equally simple appropriate solution, for the static layouts. Inflate obstacles by guard radius, prevent diagonal corner cutting, and collision-check actual movement.
- Validate guard spawns and patrol points. Some existing patrol segments cross walls, so collision without routefinding is insufficient.
- Route to reachable investigation positions. If a sound lands inside a solid or inaccessible area, use a safe reachable approximation or abandon the target gracefully.
- Replan on meaningful target changes, not every frame. Avoid allocation-heavy work in the animation loop.
- Add wall-safe capture/contact checks. Use movement substeps or swept checks where needed to avoid tunnelling.

Browser tests: watch a full patrol in each stage; lure the guard to the opposite side of a wall using decoys/sonar; verify it uses a doorway rather than crossing or freezing; stand close across a thin wall and confirm no capture; restart and confirm routes reset.

### Change 2 - Sound/light-based detection

- Separate hearing from sight. Hearing selects an investigation destination, not perfect knowledge of the player.
- Support patrol -> investigate -> pursue -> search -> patrol, with last-heard/last-seen positions and bounded search time.
- A guard can see the player only when sufficiently exposed by a sound wave, within sight range/FOV, and with unobstructed line of sight.
- Share acoustic radius, age/fade and wave-thickness values between shader and exposure logic. Use a small exposure grace period and suspicion accumulation so detection is readable and fair.
- Sound waves may reveal geometry through walls as part of SIGNAL's stylised acoustic display; guard visual line of sight must still be blocked by walls. No complex acoustic simulation is required.
- Provide minimal exposure/suspicion feedback. The player visual/readout must agree with the detection rule; do not leave detection as an invisible timer unrelated to the waves.
- Guards must lose track when the player escapes visibility. No tracking the current player location through walls during search.

Browser tests: make noise behind a wall and confirm investigation without immediate visual pursuit; become illuminated in the guard's view and confirm suspicion then pursuit; move behind cover and confirm search at the last seen location; remain hidden while a decoy is investigated; check cyan/red/amber feedback stays understandable.

### Change 3 - Core interactions, projectiles and pause

- Give decoys wall/prop impact behaviour that respects height: use 3D collision bounds or mesh ray/sweep checks rather than treating every XZ footprint as infinitely tall. They may travel over a low pedestal but not through a full wall.
- Ensure one intended impact generates the decoy sound; no repeated impact spam or unreachable off-map targets.
- Require appropriate range and clear access for pickup/interactions. Gate actions by running, unpaused, non-transitioning gameplay state.
- Stop movement, AI, hazards, projectiles, ability cooldowns, sound-wave aging, interaction progress and scored run time while paused.
- Clear held input on blur/unlock to avoid stuck movement. Reset transient state correctly on retry and level changes.
- Check hazards cannot produce a second state transition after failure. Existing pressure plates are always dangerous; keep their warning language consistent unless deliberately changing that rule.

Browser tests: throw at a full wall and over a low object; attempt pickup through a wall; pause during a moving laser, decoy flight and cooldown, then resume; confirm run time excludes pause; switch focus while moving; fail/restart several times and check for stale input or duplicated effects.

### Change 4 - Multiple-guard foundation

- Refactor the single guard into a small collection with independent route, state, timers and last-known targets.
- Keep one guard in Levels 1 and 2; support two in Level 3.
- Update sound events, minimap markers, capture checks and resets for every active guard.
- Preserve performance and independent behaviour. Avoid adding a full crowd system.

Browser tests: confirm Levels 1/2 still work; in Level 3 lure one guard while observing the other; verify no shared position/state bugs; retry and switch stages without leaving extra guards or markers.

### Change 5 - Level 1: security-room key

- Make a clearly identifiable security room using existing geometry with small layout adjustments if necessary.
- Introduce sonar, quiet movement and decoys in a safe introductory section.
- Replace the first artefact objective with a visible key/keycard pickup using `E`.
- Add a locked vault entrance as the destination. The key unlocks progression; no return to the generic extraction portal.
- Design a useful distraction opportunity without requiring one exact solution.

Browser tests: follow the objective without practice shortcuts; attempt vault access before obtaining the key; steal it and unlock the entrance; verify the transition and carry-over key state; fail and retry Level 1.

### Change 6 - Level 2: acoustic identification

- Show the key's target signature as a clear visual pattern, such as two closely spaced echoes.
- Place three cases containing plausible replicas. Each responds distinctly when reached by a player sonar wave; only one matches the target.
- Make responses visible long enough to compare and add concise inspection feedback. Do not require pitch recognition or advanced audio hardware.
- Use `E` to try unlocking a nearby case with the key. Wrong choice: warning and a local alert, not instant failure. Correct choice: diamond pickup and lockdown.
- Teach scanning in relative safety before mixing it with the existing lasers/pressure plates.
- Keep the puzzle deterministic or consistently seeded on retry. Do not introduce multiplayer or an elaborate inventory.

Browser tests: scan each case and compare responses; try a wrong case and recover; unlock the correct case; verify target signature agrees with the actual solution; confirm walls block interaction; fail/retry without duplicating the key or diamond; confirm lockdown begins only on correct pickup.

### Change 7 - Level 3: pursuit and noisy door overrides

- Carry the stolen diamond into a blackout/emergency-lit escape route with two guards.
- Carrying the diamond is silent. Zidan explicitly requested removal of automatic pulses after difficulty feedback; do not reintroduce them.
- Add two locked escape doors. Hold `E` within range and facing/access conditions to override; show progress.
- Override emits sound/light that attracts guards. Release `E`, move away or pause to cancel/stop progress; start with reset-on-cancel unless playtests show it is frustrating.
- Opened doors must update collision and navigation. Guards must respect closed doors and be able to navigate through open ones.
- Place the final exit somewhere distinct from the entry. Use simple landmarks/emergency signage; do not rely on darkness alone.
- No timer, extra guards or new combat system required.

Browser tests: verify carrying the diamond emits no automatic pulses; throw a decoy before an override; cancel and retry; try from out of range/through a wall; pause halfway through; confirm doors physically open for player and guards; reach the exit and receive success once.

### Change 8 - Connected mission state and retry

- Integrate opening briefing, objective text, key acquisition, real-diamond pickup, lockdown transition and ending.
- Centralise level objectives/state sufficiently to avoid duplicated progression checks; make only proportionate refactors.
- Failure defaults to retrying the current level with its valid starting inventory: no key in Level 1, key in Level 2, diamond in Level 3.
- Offer restart-full-heist separately. Reset timers, guards, doors, puzzle, sound rings, throwables and input as appropriate.
- Keep practice jumps explicitly labelled as practice. Practice/debug shortcuts must not qualify a skipped run as a completed campaign; keep useful QA hooks gated.
- Track meaningful statistics: player sonar uses, detection incidents and active play time. Existing all-source ring counts are not a meaningful player sonar score.

Browser tests: complete the entire heist without skips; fail and retry each level; restart the full heist from Level 3; use practice and verify it is labelled correctly; repeat a complete run and inspect for stale/duplicated state.

### Change 9 - Gameplay acceptance and teammate handoff

- Playtest/tune for roughly 8-12 minutes total. Prioritise fairness, readability and completion over adding difficulty.
- Verify browser console, repeated retries, transition reliability and performance with two guards.
- Validate the production build under a subfolder with relative paths.
- Update `README.md` controls/story/current capabilities. Rewrite `TEAM_HANDOFF.md` around the actual remaining work, with build instructions, tests completed and known issues.
- Document shared wave constants and AI states so teammates can explain the shader/detection in the demonstration.
- Leave graphics/audio/UI polish and trailer work clearly scoped for teammates. Do not claim full top-band rubric coverage or guaranteed marks.

Browser tests: uninterrupted campaign; one failure/retry per level; repeated restart; subfolder build; agreed Ubuntu Chrome browser and, if available, lab hardware. Record actual results and any untested environments.

## Required response after EVERY numbered change

Use this structure:

1. **Changed:** concise description and affected files.
2. **Verified:** actual build/check results; state anything not run.
3. **Browser tests:** numbered actions and expected results specific to this change.
4. **Latest build commands:** exact commands below, adjusted only for the actual repository setup.
5. **Next:** next numbered change and any blocker. Wait for browser feedback before starting it.

### Standard commands - run from the project root

First setup only, use the command appropriate to the repository:

```bash
npm ci
```

If there is no valid lockfile, use `npm install` instead. Do not reinstall dependencies after every change unless they changed.

After EVERY change, provide:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open **http://127.0.0.1:4173/**. These commands assume the Vite preview script confirmed in Change 0. If port 4173 is occupied by an old preview terminal, stop that terminal with **Ctrl+C**, rebuild and rerun. If the build fails, do not test stale `dist/` output as though it contains the change. Keep the server running while testing. Hard-refresh with **Ctrl+Shift+R** after a new build. Check DevTools Console/Network for errors.

Optional quick development loop:

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/**. Explain that this is the development build and does not replace production-build checks.

### Final subfolder check

On Ubuntu, copy the built output into a temporary staging folder without modifying the project:

```bash
npm run build
signal_preview_dir=$(mktemp -d)
mkdir -p "$signal_preview_dir/signal"
cp -R dist/. "$signal_preview_dir/signal/"
python3 -m http.server 8080 --bind 127.0.0.1 --directory "$signal_preview_dir"
```

Open **http://127.0.0.1:8080/signal/** and play through. Stop with Ctrl+C when finished. If port 8080 is occupied, choose a free port and state the matching URL.

### Optional fresh LAMP archive

Only package a successfully built and tested `dist/`. Avoid stale archive entries by recreating the archive rather than updating an old ZIP:

```bash
npm run build
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('dist')
assert (root / 'index.html').is_file(), 'Missing dist/index.html'
with ZipFile('signal-lamp.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root).as_posix())
PY
unzip -l signal-lamp.zip
```

`index.html` must be at the ZIP root. This archive is for LAMP; it is not the source handoff. Do not upload it automatically.

## Progress

- [ ] Change 0 - baseline/build
- [ ] Change 1 - collision/navigation
- [ ] Change 2 - sound/light detection
- [ ] Change 3 - interactions/projectiles/pause
- [ ] Change 4 - independent guards (implemented with Change 7; browser regression pending)
  - One guard in Levels 1–2, two in Level 3, with independent hearing/last-seen targets, routes, timers and markers. Shared static navigation is rebuilt when doors open.
- [x] Change 5 - key mission (implemented; main path and sign correction browser-tested by Zidan)
  - Added the east security room/keycard, north locked vault and E-based progression. Key inventory carries into Level 2 and resets in Level 1. No generic extraction or carried artefact in Level 1.
  - Production build and focused access/layout/reset tests passed. Zidan confirmed stealing the key and unlocking the vault work, then confirmed the sign correction. Replaced camera-facing mission labels with fixed wall panels and removed entrance control labels/startup control toast following feedback. Other manual edge checks remain unconfirmed.
  - Level 1 still uses direct guard movement. Subsequent Levels 2–3 work added routed movement and wall-safe capture.
- [x] Change 6 - acoustic identification (implemented; Zidan confirmed revised Level 2 works)
  - Three fixed-position exhibits with randomized single/double/triple assignments and a randomized key target. Exactly one case matches. New runs/practice selection reroll; retries retain the puzzle. Player-sonar arrival detection, persistent comparison, front-reader access and recoverable wrong-choice alerts remain. Correct pickup triggers lockdown and transitions directly into Level 3; no Level 2 extraction loop.
  - Following map feedback: player and guard now spawn near the middle; Level 2 sonar range is 10 metres, outside every case's distance from spawn. Whole-vault patrol and investigation use grid routing with obstacle inflation and swept movement checks. Capture across separating colliders is blocked. Initial briefing pulse does not attract the guard.
  - Current-level failure retry clears inventory/puzzle/input; sound-wave aging and response timers pause. Level 3 diamond carry/escape behaviour remains for Change 7.
  - Eight vault tests and five Galleries regression checks passed, including all randomization outcomes, full patrol routes, spawn separation and reachable case access with pressure plates treated as obstacles. Production build passed. Zidan confirmed the revised Level 2 works; manual edge checks not explicitly reported remain unconfirmed.
- [ ] Change 7 - pursuit/overrides (implemented; browser verification pending)
  - Silent carried diamond (automatic pulses, carrying footstep amplification and Level 3 spawn wave removed at Zidan’s request after difficulty feedback); two independent routed guards; two 3.5-second hold-E noisy doors with range/facing/access gating and reset-on-cancel; north emergency exit gated on both doors and diamond. Opening updates collision and guard navigation. Retry restores doors, diamond, guards and transient state.
  - Level 3 visibility shares shader band constants; exposure feedback, suspicion, pursuit and bounded last-seen search. Echoes briefly restore the otherwise jammed map. Decoy commitment permits a distraction window. Global pause freezes active simulation and score time; blur/unlock clears input and cancels overrides.
  - Following sandwich/capture feedback: both patrols shifted left away from the door thresholds, cover added beside Door 01, override radius reduced from 13 to 7 metres with clear-access hearing, and decoy commitment increased to 5 seconds. Updated stealth/difficulty browser checks are pending.
  - Production build and all 23 focused checks passed: door eligibility/cancellation, bounded noise, staged navigation, silent carry/pause behaviour, single success/reset, independent hearing/visibility/search and previous-level regressions. Browser checks, difficulty balance and repeated campaign acceptance are pending.
- [ ] Change 8 - mission/retry integration
- [ ] Change 9 - acceptance/handoff

Mark implemented and browser-verified status separately if needed. Add brief results and remaining issues beneath each completed item; never mark unperformed manual checks as passed.

## Scope control

Must finish: guard wall fix, fair detection, three unique level mechanics, connected story, retry/restart, production build and clear handoff.

Defer: multiplayer, rival bot, Blender assets, advanced acoustic propagation, cinematic cutscenes, complex inventory, extra difficulty modes and a new rendering architecture.

Teammates own: environment/material polish, visible lighting/shadows, improved guard animation, richer audio, options/credits UI, unfamiliar-player testing, trailer and submission preparation. Provide only the minimal feedback UI needed to make your mechanics testable.

Start with Change 0. After reporting its browser tests and latest-build commands, wait for Zidan's results.
