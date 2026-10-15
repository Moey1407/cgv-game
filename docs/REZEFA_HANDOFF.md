# Continue from feature/seamless-heist-flow

Read `docs/HEIST_FLOW.md` and the newer `docs/MAP_AND_RECORDING_UPDATE.md` before changing story or objectives. This branch includes `rendering-layer` through `f5476f5` and `audio-and-music` through `871dad4`, preserving their security office, stairs, passages, controls and gameplay fixes. Review the branch before merging; main has not been changed by this task.

## What is implemented

- Gala: guest-list cover, visible staff boundary, CCTV looping, stationary 0.75-second badge copy, witnesses, close-tail warning, night-entry authorisation, and a required lobby exit.
- Vault: crawl/jump/moving/blinking laser encounters with housings and full-body collision; a traversable duct; a guarded tamper-circuit panel; three-tumbler safe with near-contact audio; explicit Star collection; a required service exit.
- Escape: betrayal, recorded override input, two patrols and physical cover, a second traversable duct, a stairwell connection, two-operator roof sensors, hatch override, optional evidence upload, and a first-person zipline with a destination roof.
- Original small coloured humanoids with faces, hair, varied formalwear and distinct blue security uniforms. One small skinned draw per person. The old whole-model black recolour is no longer used for security officers.
- In-world input hints, optional controls, fewer blocking transitions, typewriter captions, a quieter UI and results skin, opening and ending story sequences, and scrolling credits accessible from the title and the finish.
- Local audio playback, a mild earpiece filter for Dex/Control, separate guard voice playback, caption timing from clip duration, six exportable cast scripts, safe MP3 import with local backups, and stale-recording protection.
- Auto graphics uses actual wall-clock frame timing. Rendering counters include the auxiliary passes. Small CCTV targets, lower auxiliary refresh rates, Low mode without post-processing, reduced crowds and menu rendering remain available.

## Next work in priority order

1. **Play the campaign without review tools.** Record first-time completion time and failures for each stage. Development checks exercise the gates, but scripted review presets freeze patrol movement and do not prove live difficulty, entertainment or first-time clarity. Start with three outside players. Tune the witness radius, inspection pauses, laser timing, safe windows and six-minute escape budget from observations.
2. **Finish authored spaces, not just corridor length.** Target roughly 3–5 minutes for gala recon, 4–6 for the vault and 4–6 for a first escape attempt, then validate. Add meaningful rooms/cover/opportunities while preserving every use position, checkpoint and mission gate. Avoid extra panels with no distinct decision just to increase time.
3. **Playtest the authored stairs and passages from rendering-layer.** Those are now integrated; do not replace the stairs with the older instant jump. Both service passages now end in a short completion conversation, then the next illustrated briefing. Confirm the far door, input capture and checkpoints in a real campaign run.
4. **Final character/art direction.** The new people are deliberate lightweight stylised models, not realistic scanned humans. If the final direction requires realistic people, replace `createPerson` through its `root`, `play`, `update`, `dispose` contract, keep +Z forward and metre scale, and retain readable skin, cloth, caps, badges and variation. Profile the replacement before filling the gala with it. Do not restore a black material over every body/face.
5. **Final cinematics.** The opening/ending remain lightweight animated story sequences, not a fully directed 3D movie. Capture or build the agreed shots and synchronise them to the final performances. The normal level transitions should stay short and retain control.
6. **Final voice import.** Use `docs/voice-cast/README.md`. Generate approved voices yourself, return individual named MP3s, listen for wording/emotion/consistency, then use the importer. Several existing temporary clips no longer match the new script and are intentionally not played. No final performance has been fabricated or claimed complete.
7. **Hardware QA and shipping.** On an actual lab PC and the laptop, check FPS, console/network errors, and memory across repeated new heists and level changes. Normal campaign transitions now compile the next scene asynchronously under the fade, and the redundant three-mode startup warm-up has been removed. Review presets still compile synchronously for deterministic testing. Validate cold-load timing on the target GPU. Build the Moodle zip after the live test.
8. **Credits/submission.** Confirm every full name and final asset/voice credits against the current credits, including the teammate additions from rendering-layer. Finish the trailer, final devlog, individual contribution reports and each member's shader explanation.

## Validation and integration

Latest status: 126 automated tests pass and the production build succeeds after merging audio-and-music. That merge suppresses public-floor player footstep rings while guest cover holds; adds laser knock-back/stun and urgent guard response; passes navigation into live guard updates; restores sleeping guards from checkpoint snapshots; and makes the voice-render script's Python executable configurable. Both passage-to-conversation-to-next-briefing handoffs were checked before the merge. The cast retains shaped human silhouettes, varied formalwear and eased strolls (18/11/7 guests on High/Medium/Low). The recording booklet is 18 pages / 135 clips. Muhammed previously did not reach level 3; a complete manual campaign run is still required. See `docs/VALIDATION.md` for checked scenarios and limitations.

- `npm test` — movement, mission gates, level reachability, guard logic, witnesses, lasers, Echo, safe, checkpoints and traversal tests.
- `npm run build` — portable static build; deploy the contents of `dist/` only when the team is ready.
- `npm run dev` then `http://127.0.0.1:5173/?qa=review` — explicit development review controls for the scenario gates and visuals. The review panel is removed from production builds. Do not use its convenience presets as a substitute for a manual run.
- `npm run voice:script` — regenerate cast sheets from the live script.
- `npm run voice:import -- <folder>` — import approved MP3s; `--check` validates filenames without importing.

The available Huz checklist specifically called out a recording sheet, radio filter and results styling; those are covered here. No separate Rezefa checklist was present in the supplied files for this turn, so do not assume any unlisted instruction from that person has been implemented.

Do not add a helicopter alongside the current finale without rewriting the escape setup. The roof line is planted in the story and has the implemented exit mechanics; a second extraction ending needs a clear choice, route and payoff.
