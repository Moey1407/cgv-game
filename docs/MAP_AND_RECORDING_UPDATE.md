# Map, guidance and recording update - 15 October 2026

## Integration

Fast-forwarded `feature/seamless-heist-flow` to the latest `rendering-layer` commit `f5476f5`, preserving the security office, stairs, passages, revised controls, third-person camera and sedative/decoy fixes. The earlier handoff's instant-stairwell task is now covered by that branch; do not replace its authored stairs with a teleport.

## Current changes

- A Canvas2D schematic replaces the extra 3D minimap render. Floor/wall footprints come from level data; the roof and ground are separate scans. Nearby vision is limited, and sonar briefly reveals the current floor.
- Gold objective markers share the in-world guide's active target, including the staff doorway before the security desk. An edge marker gives direction without exposing the whole floor. The footer gives the target and distance. Nearby guards/Echo appear locally; distant ones only during the scan.
- New mission phases show a short NEXT STEP notice. The interaction target has a stronger gold pulse nearby, with no added dynamic light or path through walls.
- Quality changes reuse the post-processing pipeline, preserve shadow shader variants and avoid reallocating unchanged reflections. High uses no multisample target and a 75% reflection target instead of a full-screen one. Its higher resolution/crowd/feed settings remain. A first-use GPU allocation may still hitch; measure on the target laptop before calling it stall-free.

## Fiction and voice continuity

Wren already wears an acoustic wrist rig linked to a private lens display. The sound rings are her visualisation, not visible light in the room. Normal sound still reaches guards. Sonar emits an audible ping and briefly resolves the floor plan. The desk task links a camera tap: it does not create Wren's passive hearing or remove the wearable rig. Dex only cuts the remote radio; the local lens and Echo keep working.

The opening now includes Wren's equipment check. The desk prompt/objective says camera tap instead of planting the entire rig. Updated dialogue retains stable clip IDs; mismatched old performances remain suppressed until replaced.

## Recording

`npm run voice:script` exports the current 135 clips into six role sheets and `all-lines.json`, including the new completion conversations. The PDF generator `scripts/export-voice-pdf.py` uses ReportLab and pypdf, plus the Windows Arial fonts, to create the local 18-page `output/pdf/SIGNAL-Dialogue-Recording-Script.pdf`. Re-export both after script changes.

## First-time player guidance

Step-by-step guidance is on by default and can be disabled in Options. It waits for actual looking, movement and quiet walking, then tracks the current mission and device interface. It teaches CCTV opening/selection/looping, the short stationary badge copy, each laser, the safe dial and both Echo interlocks in context. Instructions are non-blocking gameplay help, not extra voiced character lines. Full controls remain in the pause menu. The early radio no longer recites several future objectives at once.

The gala has 18 guests on High, 11 on Medium and 7 on Low. Two-thirds stroll between bounded social spots while others converse. They check collision and separation before moving; witness tests read the visible actors' current positions and facing. Their subtle footstep rings are lens visualisations, not alarms raised by ordinary guests. Original stylised human meshes now have shaped heads, smaller facial features, continuous fitted torsos, tailored lapels, coloured dresses, varied body sizes and distinct security uniforms. Each actor is still one skinned draw with no extra texture download.

Free microphone recorder: https://online-voice-recorder.com/ (checked 15 October 2026). It advertises free microphone recording, trimming and MP3 export. Use original or consented performances, one dry MP3 per printed filename, then import using `npm run voice:import -- <folder>` after reviewing.

## Verification

All 126 automated tests pass after the audio-and-music merge, covering projection fit, floor separation, edge objective clamping, story explanation, quality target format, action-led learning, guest movement, single-draw character budgets and urgent laser response alongside existing gameplay tests. Production build succeeds. Browser review before that follow-up checked local/full/roof scans, repeated Low/High changes through the actual Options menu, guidance display, character close-ups and guest position changes. Both real passage functions open the completion conversations, whose final buttons load the next briefing. Review presets are not a substitute for a complete manual campaign or laptop/lab-PC performance testing.

## Audio-and-music follow-up

Merged `audio-and-music` through `871dad4`. Player footstep rings now stay suppressed while gala guest cover holds (the local rig and explicit sonar explanation still apply). Laser contact knocks Wren back and briefly stuns her; alarm escalation is rate-limited and guards urgently investigate the trip. Live guards receive the navigation pathfinder. Checkpoints preserve already-sedated guards without refunding the dose. The voice-render script supports a `PYTHON` executable override and chooses python3 off Windows. This commit does not add new voice recordings or music tracks.

## Chapter presentation

The title, briefings, completion panels and gameplay interfaces share a cream/navy/gold physical-print style. Each briefing shows native game artwork, three ordered goals, four essential controls and an original teaching diagram. Level 1 and 2 completion panels confirm completed tasks and play a three-line exchange at the player's pace. The opening uses native stills with camera pushes, wipes and typewriter captions; these are animated illustrated scenes, not newly filmed 3D action sequences.

Museum corridor walls now use world-scaled masonry/metal textures. The distant skyline uses one instanced mesh with facade variation, framed windows and an emissive window map. No new dynamic lights or outside art downloads were introduced for these changes.
