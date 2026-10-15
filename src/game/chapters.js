// Player-facing chapter cards. Full reference controls stay in the pause menu.
export const CHAPTERS = Object.freeze({
  1: {
    title: 'The Gala', role: 'Get invited. Leave with access.', time: '19:40', place: 'Varga Museum / public opening',
    image: './ui/chapter-gala.webp', accent: 'gold',
    story: 'Dex put you on the guest list. Tonight is preparation: connect the cameras, copy a badge and arrange your return after closing.',
    goals: ['Link the camera tap at the east security desk.', 'Copy Okafor’s badge during an inspection stop.', 'Authorise night access, then leave through the lobby.'],
    keys: [['W A S D', 'Move'], ['MOUSE', 'Look around'], ['SHIFT', 'Quiet walk'], ['E / HOLD E', 'Use / copy badge']],
    watch: 'You belong in the public hall. Staff-only areas, exposed gadgets and witnesses can break your cover.',
    caption: 'Look for the gold objective diamond. The guide teaches each new control when you need it.',
    result: 'Access secured', checks: ['Camera tap connected', 'Staff badge copied', 'Night entry authorised'],
  },
  2: {
    title: 'The Vault', role: 'Read the pattern. Take the Star.', time: '01:30', place: 'Same night / authorised staff entrance',
    image: './ui/chapter-vault.webp', accent: 'blue',
    story: 'The gala is over. Your copied badge gets you inside, but there is no guest cover now. The Kestrel Star is locked in the vault.',
    goals: ['Cross the lasers; use the side duct if you prefer.', 'Isolate the tamper circuit and crack the safe.', 'Take the Star, then return to the service fire door.'],
    keys: [['Z + W', 'Crawl under'], ['W + SPACE', 'Jump over'], ['MOUSE', 'Turn the safe dial'], ['E', 'Set a tumbler / take']],
    watch: 'Wait and observe moving beams. Turn the dial slowly: Briggs hears rushed attempts.',
    caption: 'UNDER / OVER / WAIT. Different beams call for different choices.',
    result: 'The Star is yours', checks: ['Tamper circuit isolated', 'Three tumblers set', 'Kestrel Star recovered'],
  },
  3: {
    title: 'The Double-Cross', role: 'One safecracker. Two operators.', time: '01:58', place: 'Service wing / lockdown',
    image: './ui/chapter-roof.webp', accent: 'red',
    story: 'Dex has sold you out and cut the radio. Your rig works locally. Record an Echo to help open the way to your own roof line.',
    goals: ['Record holding the override; let the Echo hold the shutter.', 'Avoid the sweep team and climb the stairwell.', 'Use both roof sensors, release the hatch and take the zipline.'],
    keys: [['R', 'Start recording'], ['HOLD E', 'Record the override'], ['R AGAIN', 'Rewind + replay'], ['W A S D', 'Move while Echo repeats']],
    watch: 'Record about six seconds at a switch or sensor. The replay only repeats what you actually did. You have six minutes.',
    caption: 'YOU + YOUR ECHO. Use the two operators together; neither can do both jobs alone.',
    result: 'Heist complete', checks: ['Lockdown escaped', 'Roof interlock bypassed', 'Service roof reached'],
  },
});

export function chapterFor(level) { return CHAPTERS[level] ?? CHAPTERS[1]; }

// Original vector teaching diagrams, not decorative stock icons.
export function lessonDiagram(level) {
  const figure = (x, y, colour = '#e6c277', pose = '') => `<g transform="translate(${x} ${y}) ${pose}" fill="${colour}" stroke="#131d27" stroke-width="3"><circle cy="-35" r="10"/><path d="M-10-22H10L15 11H-15Z"/><path d="M-9 10L-13 37M9 10L14 37M-10-15L-24 5M10-15L24 5" fill="none" stroke="${colour}" stroke-width="8" stroke-linecap="round"/></g>`;
  const art = level === 1
    ? `${figure(75, 90)}${figure(160, 90, '#83aab9')}<rect x="170" y="89" width="17" height="24" rx="2" fill="#efd99f"/><path d="M100 86Q130 55 160 80" fill="none" stroke="#e6c277" stroke-width="2" stroke-dasharray="5 5"/><text x="120" y="153">BEHIND + STOPPED → HOLD E</text>`
    : level === 2
    ? `<path d="M15 82H113M143 115H244" stroke="#f5756a" stroke-width="4"/>${figure(66, 105, '#e6c277', 'scale(.7 .42)')}${figure(193, 65, '#e6c277', 'scale(.7 .7)')}<path d="M151 97Q195 12 235 97" fill="none" stroke="#e6c277" stroke-width="2" stroke-dasharray="4 5"/><text x="65" y="153">Z · UNDER</text><text x="192" y="153">SPACE · OVER</text>`
    : `<rect x="22" y="119" width="83" height="10" rx="3" fill="#64cdb5"/><rect x="155" y="119" width="83" height="10" rx="3" fill="#64cdb5"/>${figure(63, 83, '#83c8d8', 'scale(.8 .8)')}${figure(196, 83, '#e6c277', 'scale(.8 .8)')}<path d="M105 88H154" stroke="#83c8d8" stroke-width="2" stroke-dasharray="5 5"/><text x="64" y="153">ECHO</text><text x="197" y="153">YOU</text>`;
  return `<svg viewBox="0 0 260 170" role="img" aria-label="${level === 1 ? 'Copy a stationary guard badge from behind' : level === 2 ? 'Crawl under high beams; jump over low beams' : 'Echo on one sensor and Wren on the other'}" xmlns="http://www.w3.org/2000/svg"><rect width="260" height="170" rx="4" fill="#182630"/><path d="M10 130H250" stroke="#3b505a"/>${art}<style>text{fill:#dedbcc;font:9px monospace;text-anchor:middle}</style></svg>`;
}
