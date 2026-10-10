# SIGNAL - Remaining 40% Team Handoff

The playable technical foundation and the complete three-level route are implemented. The remaining work should focus on polish, evidence, and submission quality rather than replacing the core architecture.

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

- Capture a 60-90 second trailer in this order: title, sound reveal, guard investigation, decoy, Vault laser crouch, Blackout sonar, extraction, end card.
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
