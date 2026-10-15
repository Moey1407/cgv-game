# SIGNAL: shipping guide (Teammate 3)

Everything needed to get the game onto the LAMP server, test it with strangers, make the trailer and devlog, and tick off the brief's final checklist.

## 1. Deploy to the LAMP server (Moodle upload)

There is no ssh or scp. The server only serves the files you upload through Moodle.

1. `npm test` and `npm run build` must both pass.
2. `npm run preview`, open http://localhost:4173/ in Chrome and play the whole thing. Keep DevTools open on the Console and Network tabs: no red errors, no 404s.
3. Zip the **contents** of `dist/`, so `index.html` is at the top of the zip and not inside a `dist` folder.
   - Windows PowerShell: `Compress-Archive -Path dist\* -DestinationPath signal.zip -Force`
   - macOS or Linux: `cd dist && zip -r ../signal.zip . && cd ..`
4. Upload `signal.zip` to the Moodle submission, using the group naming convention given there.
5. Open the published URL in Chrome on a lab machine and play it through. Check the console again.

If the hosted page is blank, it is almost always one of these:
- a path starting with `/` (every path must be relative: `./models/...`)
- a filename whose case differs from the code (Linux is case-sensitive; keep names lowercase and hyphenated)
- `index.html` nested inside a folder in the zip

**Deploy after every merge into `main`.** The first upload usually exposes a problem that never shows on your own machine.

## 2. Before every merge

- `npm test` passes (all suites).
- `npm run build` passes.
- You only changed your own files. Anything else goes through its owner:
  - Teammate 2: `src/gameplay/`, `src/game/`, `src/core/`, `main.js`
  - Huzaifa: `src/render/`, `src/world/`
  - Teammate 3: `levels/`, `src/story.js`, `src/audio.js`, `src/screens.js`, `index.html`, `src/styles.css`, `docs/`

## 3. Final submission checklist (brief section 12)

| Check | Where it is covered | Owner | Status |
| --- | --- | --- | --- |
| Three levels, playable start to finish | Level data in `levels/`; a level loader still needs to load them | Teammate 2 + 3 | Open |
| Each level introduces something new, in one sentence | L1: CCTV, pickpocketing, alarm. L2: crawl, jump, lasers, safecracking by ear. L3: the Echo and a timed escape | All | Ready |
| Keyboard and mouse both work | Controls on the briefing screen; sensitivity in Options | Teammate 2 | Ready |
| At least one custom shader every member can explain | Ring, CRT, laser, hologram, alarm post-processing | Huzaifa | Ready: each member must rehearse one |
| Restart without refreshing | Pause menu: Restart from checkpoint, New heist; caught screen R and N | Teammate 3 | Done |
| Credits list everything not made by us, with source and licence | `index.html` credits dialog | Teammate 3 | Done for current assets: update when anything new is added |
| Production build, not the source tree | Section 1 | Teammate 3 | Every deploy |
| Built game tested locally over HTTP | `npm run preview` | Teammate 3 | Every deploy |
| No absolute paths starting with `/` | Vite `base: './'`; assets loaded as `./...` | All | Ready: re-check new code |
| Asset filenames match the code exactly | All lowercase and hyphenated | All | Ready: re-check new assets |
| Zip uploaded via Moodle with `index.html` at the top | Section 1 | Teammate 3 | Open |
| Published URL played through, console checked for 404s | Section 1 | Teammate 3 | Open |
| Frame rate fine on lab hardware; memory does not climb across levels | Auto quality drops to Low under 40 FPS; `render/dispose.js` on level unload | Huzaifa | Check on a lab machine with DevTools Performance and Memory |
| Trailer (max 2 min) on YouTube, link submitted | Section 5. **Also due at beta** | Teammate 3 | Open |
| Devlog video submitted (final only) | Section 6 | Teammate 3 | Open |
| Every member submitted a contribution report | Section 7 | Everyone | Open |

Before the final build, ask the owner of `main.js` to remove the debug keys (`1`, `2`, `3` lighting modes and `K` quality, which Options now covers). The `?qa` test hooks only exist with `?qa` in the URL, so they can stay.

## 4. Playtests (end of every phase)

Get 3 to 5 people from **outside the team**. Do not help them. Watch and write things down.

**Before:** set Options to defaults, start at the briefing screen, have a notebook or this sheet open.

**Say only this:** "Play it however you like. Think out loud. I can't help you, but I'll answer questions at the end."

**Record for each player:**

| | Player 1 | Player 2 | Player 3 |
| --- | --- | --- | --- |
| Read the briefing? (yes / skipped) | | | |
| Time to first camera hack | | | |
| Time to lift the keycard | | | |
| Times caught | | | |
| Where they got stuck (place and what they tried) | | | |
| Where they looked bored or confused | | | |
| Did they notice the rings on the floor? | | | |
| Did they hear or read Dex? | | | |
| Did they find the evidence or loot? | | | |
| Total time | | | |

**Ask afterwards:**
1. What were you trying to do?
2. What was the most fun moment? The most annoying one?
3. Did anything feel unfair?
4. Would you keep playing? (The Phase 1 gate is a "yes" from all three.)

Turn the notes into at most three fixes per phase, each with one owner.

## 5. Trailer (max 2 minutes, due at beta and final)

Built from the three big moments plus the Echo. Capture as you go; do not leave it to the last day.

**Capture:** OBS Studio, 1920×1080 at 60 FPS, game set to High quality, desktop audio on (all our sound is in-game, so it records cleanly). Hide the FPS counter if the owner adds a toggle; otherwise crop it.

**Shot list (about 90 seconds):**

| Time | Shot | Notes |
| --- | --- | --- |
| 0:00 to 0:08 | Black, Dex's first radio line as text, radio click | "Evening, Wren..." |
| 0:08 to 0:20 | Slow push down the Grand Hall at the gala | chandeliers, reflections, guests |
| 0:20 to 0:30 | Footsteps making rings: carpet vs marble | show sound as visible intel |
| 0:30 to 0:40 | Tab through the CCTV feeds, loop one | CRT shader |
| 0:40 to 0:50 | Pickpocket Okafor: the hold bar filling, "KEYCARD LIFTED" | big moment 1 |
| 0:50 to 1:00 | Laser corridor: crawl, jump, timing | beam shader |
| 1:00 to 1:10 | Safe dial close-up, last tumbler clicks, vault swings open | big moment 2 |
| 1:10 to 1:18 | Red lights. "Sorry, Wren. Same as Marlowe." SIGNAL LOST | big moment 3 |
| 1:18 to 1:30 | Record the Echo, rewind, both of you on the plates | the innovation |
| 1:30 to 1:35 | Title card: SIGNAL, team names, the URL | |

Edit in DaVinci Resolve or CapCut (both free). Upload to YouTube as Unlisted and submit the link. Any music added in the edit that we did not make must go in the credits.

## 6. Devlog (final submission only)

A behind-the-scenes video, about 5 to 8 minutes, with each member presenting their own part.

1. **The pitch** (30 s): Wren, Dex, three nights, the Echo.
2. **Lighting and effects** (Huzaifa): moonlight and chandelier shadows, marble and steel normal maps, reflections, skyboxes, the ring shader on lit materials, CRT, laser, hologram dissolve, alarm post-processing.
3. **Gameplay** (Teammate 2): the alarm meter, guard hearing and sight, pickpocketing, safecracking by sound, the Echo at 20 Hz.
4. **World, story and sound** (Teammate 3): the level layouts and why the routes differ, Dex's radio and how it reacts to the event bus, the synthesised music that follows the alarm, positional footsteps, the screens and grades.
5. **What we learned and what we would change** (1 min).

## 7. Contribution report log (Teammate 3)

Keep one line per piece of work, so the Moodle report writes itself.

| Date | What | Files |
| --- | --- | --- |
| 15 Oct | Level data format, Level 1 port, Level 2 and 3 grey boxes, walkability tests | `levels/`, `tests/level-data.test.js` |
| 15 Oct | Dex radio, full script, guard barks, evidence, briefing, endings | `src/story.js`, `tests/story.test.js` |
| 15 Oct | Synthesised music layers, positional footsteps, action sounds | `src/audio.js` |
| 15 Oct | Loading, briefing, level cards, pause, options, results and grades | `src/screens.js`, `index.html`, `src/styles.css`, `tests/screens.test.js` |
| 15 Oct | Shipping guide, playtest sheet, trailer plan | `docs/SHIPPING.md` |

## 8. Recording Dex and Wren

Every line has an id. Record each as `public/audio/voice/<id>.ogg` (mono, 44.1 kHz, short silence trimmed), then add the id to `RECORDED_CLIPS` in `src/story.js`. Only listed clips are loaded, so a missing recording never causes a 404. Record in a quiet room, phone about 20 cm away. Dex: warm in Level 1, impatient in Level 2, flat and final in Level 3.

| Clip id | Who | Level | Line |
| --- | --- | --- | --- |
| `dex-1-level-start-1` | DEX | 1 | Evening, Wren. You clean up nicely. Nobody at this party knows your face. |
| `dex-1-level-start-2` | DEX | 1 | Quick refresher, since it's been two years. Shift walks soft, C crouches, Z puts you on the floor. |
| `dex-1-level-start-3` | DEX | 1 | Your rig turns sound into rings. Carpet swallows them, marble shouts. Guards hear the same rings you see. |
| `dex-1-level-start-4` | DEX | 1 | Tab puts you on the cameras. Find Okafor. The keycard is on his belt. |
| `dex-1-pickpocket-complete-1` | DEX | 1 | Smooth. Two years and you've still got the hands. Vault wing is at the back of the hall. |
| `wren-1-evidence-1` | WREN | 1 | A security roster. Dex is on it. Why would Dex be on it? |
| `dex-1-evidence-2` | DEX | 1 | Wren? You've gone quiet. Keep moving. |
| `dex-1-level-complete-1` | DEX | 1 | Lovely work. Get some sleep. The vault won't open itself tomorrow. |
| `dex-2-level-start-1` | DEX | 2 | Lasers are on a cycle. Watch, then move. |
| `dex-2-level-start-2` | DEX | 2 | And quicker than last night, please. We're on a clock. |
| `dex-2-hazard-trip-1` | DEX | 2 | Are you trying to set them off? Watch the pattern! |
| `dex-2-hazard-trip-2` | DEX | 2 | Again? Crawl, jump or wait. It's not complicated. |
| `dex-2-player-detected-1` | DEX | 2 | Briggs has you! Move! |
| `dex-2-player-detected-2` | DEX | 2 | Seen. Of course. Hide, then hurry. |
| `dex-2-safe-tumbler-1-1` | DEX | 2 | One. Faster. |
| `dex-2-safe-tumbler-2-1` | DEX | 2 | Two. Come on, come on. |
| `dex-2-safe-miss-1` | DEX | 2 | You're turning it like a radio dial. Slow. Down. |
| `dex-2-safe-noise-1` | DEX | 2 | That's loud. Briggs will hear that. |
| `wren-2-evidence-1` | WREN | 2 | A radio intercept on the guard channel. That's Dex's voice. |
| `dex-2-evidence-2` | DEX | 2 | Leave the paperwork. We didn't come for paperwork. |
| `dex-2-safe-opened-1` | DEX | 2 | There she is. The Kestrel Star. Hold her up for me. Beautiful. |
| `dex-3-level-start-1` | DEX | 3 | Sorry, Wren. Same as Marlowe. |
| `wren-3-level-start-3` | WREN | 3 | Fine. I'll be my own crew. |
| `system-3-level-start-4` | SYSTEM | 3 | Press Q to record your Echo. Press Q again to rewind and work alongside it. |
| `wren-3-player-detected-1` | WREN | 3 | Seen. Move! |
| `wren-3-player-detected-2` | WREN | 3 | Not now. Not now. |
| `wren-3-alarm-alert-1` | WREN | 3 | Keep breathing. Find the quiet route. |
| `wren-3-echo-start-1` | WREN | 3 | Recording. Show me how it's done. |
| `wren-3-echo-replay-1` | WREN | 3 | There I am. Still better company than Dex. |
| `wren-3-echo-shattered-1` | WREN | 3 | They broke my Echo. Again, then. |
| `wren-3-evidence-1` | WREN | 3 | "Leave the safecracker inside." Got you, Dex. |
| `wren-3-level-complete-1` | WREN | 3 | One stone, one safecracker, no handler. Time to go. |
| `dex-any-camera-loop-1` | DEX | Any | That feed's on a loop for eight seconds. Security is watching a very boring rerun. |
| `dex-any-camera-detected-1` | DEX | Any | Camera's got you. Loop it or get out of its view. |
| `dex-any-camera-detected-2` | DEX | Any | You're on camera, Wren. Smile, then move. |
| `dex-any-player-detected-1` | DEX | Any | He's seen you. Break line of sight! |
| `dex-any-player-detected-2` | DEX | Any | Spotted! Get behind something solid. |
| `dex-any-player-caught-1` | DEX | Any | Wren? Wren. Okay. Back to the checkpoint. Deep breath. |
| `dex-any-checkpoint-restore-1` | DEX | Any | Again. Slower this time. |
| `dex-any-alarm-suspicious-1` | DEX | Any | Easy. Somebody's twitchy. Find a quiet corner and let it settle. |
| `dex-any-alarm-alert-1` | DEX | Any | They're actively looking for you now. Get out of sight. |
| `dex-any-alarm-lockdown-1` | DEX | Any | That's lockdown. Well. That's the noisy version of the plan. |
| `dex-any-pickpocket-complete-1` | DEX | Any | Smooth. Two years and you've still got the hands. |
| `dex-any-loot-1` | DEX | Any | Ooh, shiny. Pockets are free real estate. |
| `dex-any-loot-2` | DEX | Any | Bonus. Just don't get greedy. |
| `dex-any-loot-3` | DEX | Any | I'll pretend I didn't see that. Half is mine. |
| `wren-any-evidence-1` | WREN | Any | Why is Dex's name on this? |
| `dex-any-hazard-trip-1` | DEX | Any | That beam was not a suggestion. |
| `dex-any-hazard-trip-2` | DEX | Any | Under, over or wait. Pick one. |
| `dex-any-safe-noise-1` | DEX | Any | Too fast. The clicks are carrying. |
| `dex-any-safe-miss-1` | DEX | Any | Missed it. Slow the dial right down. |
| `dex-any-safe-tumbler-1-1` | DEX | Any | One down. |
| `dex-any-safe-tumbler-2-1` | DEX | Any | Two. One more. |
| `dex-any-safe-opened-1` | DEX | Any | There she is. The Kestrel Star. |
| `dex-any-door-vault-wing-1` | DEX | Any | Vault wing's open. Corridor's next. Mind the lasers. |
| `wren-any-echo-start-1` | WREN | Any | Recording. Remember this, rig. |
| `wren-any-echo-replay-1` | WREN | Any | There I am. |
| `wren-any-echo-shattered-1` | WREN | Any | They got my Echo. Again, then. |
