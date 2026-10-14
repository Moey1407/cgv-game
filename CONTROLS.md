# SIGNAL — controls and mechanics

Everything the game does, and how to use it. The short version is on the start screen; this is the full reference for the team, the report and the demo.

---

## Controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| Mouse | Look |
| `←` `↑` `↓` `→` | Look, without the mouse. Works alongside it |
| `Shift` | Walk — slower, much quieter |
| `C` or `Ctrl` | Crouch — slowest, almost silent, lowers the camera |
| `F` | Dampener on / off |
| Left click | Throw a decoy |
| Right click (hold) | Aim — shows the throw arc and where it lands |
| `Space` | Active sonar pulse |
| `E` | Interact — pick up, open, hold to override |
| `1` `2` `3` | Jump straight to a level (practice) |
| `R` | Retry the level you lost, on the results screen |
| `N` | Restart the whole heist, on the results screen |
| `Enter` | Start the heist, on the title screen |
| `T` | Training floor, on the title screen |
| `Esc` | Release the mouse and pause |

---

## Training floor

**Press `T` on the title screen.** Six lessons in a sealed service corridor, each gated by a door that opens when you have done it: look, move, cross a marble strip quietly (hold SHIFT or C — back onto the carpet to retry if you run it), pulse the dark, land a decoy in a marked ring, and fit the dampener then walk a live sensor sweep.

You start training with **no dampener** — you find it on a bench in the last bay and fit it with `E`. That is the only place you have to earn it: Levels 1 to 3 always give it to you, so skipping training never leaves you short a tool.

Training is never a campaign. It is marked as practice and the result screen offers to start the heist when you are done.

## The core idea

You cannot see. Your rig emits a pulse and draws what comes back, and so does everyone else's. **Cyan is yours, red is theirs, amber means a guard is investigating.**

Anything that makes noise emits a ring that spreads across the floor. The ring lights up whatever it touches, which is how you see the room — and it is also how you are seen. A guard resolves you only when a live ring is passing over you, you are inside their cone, and nothing is in the way. Stand still behind something solid and you are genuinely invisible.

---

## Movement and noise

Your footsteps are the main thing that gives you away. Three speeds:

| Speed | Ring on carpet | Ring on marble |
|---|---|---|
| Crouch | 1.7 m | 3.9 m |
| Walk | 3.1 m | 6.9 m |
| Run | 7.4 m | 16.7 m |

**The floor is half the equation.** Level 1 has four surfaces and the HUD tells you which one you are on:

- **Carpet** ×0.6 — the atrium and the conservation wing
- **Stone** ×1.0 — the north hall and the stacks
- **Tile** ×1.25 — the transit corridor
- **Marble** ×1.35 — the central hall

Running on carpet is quieter than walking on marble. That is the whole reason the long way round exists.

Standing still emits nothing at all.

---

## The dampener — `F`

Your rig keeps pinging, so you keep seeing the room, but the returns come back as unresolvable noise on every other rig in the building. While it is running you cannot be heard and you cannot be exposed.

It draws from a six-second cell, and **the harder you push the rig the faster it empties**:

| | Drain |
|---|---|
| Standing still | 0.45 /s |
| Crouching | 0.6 /s |
| Walking | 1.0 /s |
| Running | 1.9 /s |
| Active sonar | 1.1 per pulse |

So roughly three seconds of sprinting, or six of standing still, or two sprints and a pulse. Recharges at 0.82/s after a 1.6 second vent.

The decision is **distance or information**: burn it crossing open marble, or burn it standing still and pulsing to learn a room you cannot otherwise look at.

When it drops, every ring resolves cleanly again — so get behind something before it does.

---

## Decoys — left click

Throws an object that makes a 15 m ring where it lands and pulls guards to it. Three charges, one restored every six seconds.

**Hold right click to aim.** A line of beads traces the throw from your hand to the point of first contact, with a marker on the surface it strikes — flat on the floor for a landing, flat against the wall for a wall hit. It turns **amber** when the first thing it hits is a wall. Release right click and the arc disappears; it is never on screen when you are not lining up a throw. Left click throws.

A second, fainter ring shows where it finally stops rolling, when that is somewhere other than where it landed.

**It behaves like a small hard ball.** It bounces, loses energy on each impact, rolls once it is too slow to bounce, and comes to rest. It deflects off walls rather than stopping dead against them, and it clears a waist-high bench but not a full wall.

**Each impact makes a noise**, up to three per throw, and they get quieter as the ball loses energy. So a decoy does not make one sound at one point — it makes a decaying rattle that drags a guard along the whole bounce path. Guards commit to a decoy for five seconds unless they see you first.

---

## Active sonar — `Space`

A single large pulse: 16 m in Level 1, 10 m in Level 2, 22 m in Level 3. Lights a whole room at once.

It is the loudest thing you can do, and guards trace it straight back to you — unless the dampener is running, which is the only safe way to use it. 2.6 second cooldown.

---

## Guards

- **Patrol** — walking a fixed route, pulsing every 2.8 s
- **Investigate** — heard something, heading to where it came from, pulsing every 1.45 s
- **Search** — lost you, sweeping the last place you were seen for four seconds
- **Pursue** — has you

The HUD guard readout shows their state, your suspicion percentage while they are resolving you, `EXPOSED` when a ring is lighting you up, and `DAMPED` while the dampener is running.

They are not blind and they are not all-seeing. They need a ring on you, line of sight, and you inside their cone.

---

## Reading the HUD

| Element | Meaning |
|---|---|
| Movement | `RUNNING` / `WALKING` / `CROUCH` |
| Noise bar | How big your next footstep ring will be — turns red when it is loud |
| Surface | What you are standing on — green when quiet, red when loud |
| Guard state | `UNDETECTED` / `SUSPICION n%` / `INVESTIGATE` / `SEARCH` / `PURSUE` / `EXPOSED` / `DAMPED` |
| Sonar | Ready, or seconds remaining |
| Decoy | Charges left and time to the next one |
| Dampener | Cell percentage, `ACTIVE`, `CHARGING` or `VENTING` |
| Minimap | Live in Levels 1 and 2; jammed in Level 3, where it only flickers during echoes |

---

## The three levels

**1 — Galleries.** Take the staff key from the security office, open the deep store door. Teaches noise, surfaces and distraction. One patrol.

**2 — The Vault.** The cases are unlabelled; the archive catalogues by resonance. Scan with `Space` within 10 m and match the signature your key carries, then open it with `E`. Lasers, pressure plates, one patrol.

**3 — Lockdown.** Carry the artefact out through two doors that each need `E` held for 3.5 seconds, and each override makes noise. Two guards, no reliable map, no lights.

---

## Practice and restart

`1` `2` `3` jump straight to a level with whatever you need already in hand, so you can rehearse one section without replaying the run. A practice jump marks the run permanently: a `PRACTICE` badge appears in the HUD and the result screen says the run does not count as a completed campaign. Only a full restart clears that.

Two separate actions on the result screen:

- **`R` — retry the level.** Same level, same puzzle. Campaign totals carry over and the attempt is counted, so the run stays honest about how many tries it took.
- **`N` — restart the heist.** Level 1, a fresh puzzle, totals cleared, clean campaign record.

Neither reloads the page.

## What the end-of-run figures mean

- **Active time** — time with the game actually running. Pauses, menus and transitions are not counted.
- **Sonar used** — how many times you gave your position away with an active pulse.
- **Detected** — how many times a guard actually resolved you and gave chase. Sounds they merely investigated are not counted.

All three are campaign totals across the whole run, retries included.
