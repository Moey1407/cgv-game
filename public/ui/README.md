# Chapter presentation artwork

These three WebP images are captures of SIGNAL's own game scenes, used for the
title, briefings and lightweight animated story panels. They are not downloaded
reference-game art. Their existing in-scene painting credits remain in the game.

The teaching diagrams are original inline SVG in `src/game/chapters.js`.
The title and transition treatment takes pacing/layout inspiration from the
team's supplied references, but does not reuse their images, logos or code.

To replace a still, capture the corresponding in-game view into
`work/chapter-gala.png`, `work/chapter-vault.png` or `work/chapter-roof.png`, then
run `python scripts/prepare-menu-stills.py`. The script compresses to 1280 x 720
maximum; the original captures are intentionally not required at runtime.
