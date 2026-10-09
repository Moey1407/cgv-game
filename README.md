# SIGNAL — Alpha

A browser-based 3D stealth game for COMS3006A / COMS3025A. Sound is rendered as visible expanding wavefronts through a custom Three.js shader.

## Run

- Install dependencies with `npm install`
- Start locally with `npm run dev`
- Create the deployment build with `npm run build`
- Test the production build with `npm run preview`

The Vite base is `./`, so all production asset paths remain relative for the department LAMP server.

## Monday Alpha scope

- First-person keyboard and mouse controls
- Speed-driven footstep noise
- Custom sound-field vertex and fragment shader
- Guard patrol and investigate state
- Throwable sound decoys
- Artefact pickup, extraction, win/loss, and restart
- Orthographic acoustic minimap
- Procedural geometry and zero external runtime assets

## Credits

- Three.js — MIT Licence
- Vite — MIT Licence
