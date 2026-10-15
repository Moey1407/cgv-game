# SIGNAL controls and gameplay reference

This document describes the current data-driven museum build. The older prototype is no longer the lead version.

## Core controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse / arrow keys | Look |
| `Shift` | Walk quietly; running is the default |
| `C` / `Ctrl` | Crouch |
| `Z` | Crawl |
| `X` | Sprint while stamina lasts |
| `Space` | Jump |
| `G` | Sonar pulse |
| Left click | Throw a decoy |
| `E` | Interact or hold an override |
| `F` | Toggle the sound dampener |
| `R` | Start/finish Echo recording in Level 3 |
| `Tab` | Open/close the CCTV wall |
| `P` / `M` | Toggle the last-feed view / tactical map |
| `T` | Hold behind a guard for about a second to sedate him. He sleeps for about 40 seconds, then wakes and searches. Two doses on Levels 1 and 2, refilled at each level |
| `V` | Switch between first-person and third-person view (the safe, ducts, stairs, zipline and cameras stay first person) |
| `Esc` | Close the camera feeds or step back from the safe |
| `Q` | Pause menu (resume, controls, restart, options, quit). `Q` again resumes |

## CCTV wall

All available feeds are shown together using Huzaifa's CRT camera renderer. `1–4` selects a feed and `E` loops the selected feed for eight seconds. `Esc`, `Tab` or Backspace exits. Movement, jumping, sonar, dampener changes, Echo input and decoy throwing are blocked while the console is open.

## Tactical map and sonar

The normal map only shows the immediate area around Wren. A sonar pulse temporarily resolves the complete current floor, then the display returns to local range. Footsteps, guards and decoys never grant a full-map reveal.

## Decoys

Left click throws a bouncing metal decoy. It emits up to three weakening impact sounds. Wren carries three charges and regains one every six seconds. The throw action is disabled while using CCTV, the safe, the vent or the zipline.

## Level 3 Echo

Press `R` to begin recording. The HUD labels this as Step 1 and shows elapsed time. Press `R` again to rewind and begin replay; the HUD changes to Step 2 and tells the player to move independently while the Echo repeats the route.

## Reserved zipline controller

`src/gameplay/zipline.js` is deliberately separate from the current scripted Level 3 ending so a teammate can attach it to future anchor data without rewriting it. Its reserved controls are `E` to mount, `A/D` to lean and `Space` to drop. It emits `zipline:mount`, `zipline:move`, `zipline:dismount` and `zipline:complete` events.

## Verification

Run `npm test` and `npm run build` before merging or handing off the branch.
