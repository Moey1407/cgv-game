# Voice production

The current local build has 62 pre-rendered MP3 dialogue clips in `public/audio/voice/`. Dex uses `en-GB-RyanNeural`; Wren uses `en-GB-SoniaNeural`. The clips are generated from the game's original script by `scripts/render-voices.mjs` using `edge-tts`. No actor's or public figure's voice was cloned.

The game plays these files locally. Players do not need a voice account or an internet connection, and missing clips remain captioned without falling back to browser speech. `src/voiceManifest.js` is generated alongside the audio and must match the files. The Options screen has a TEST VOICE button.

For final submission, replace the temporary performances with the approved final cast. The recording pack is in `docs/voice-cast/README.md`. Use `npm run voice:script` after script edits and `npm run voice:import -- <approved-folder>` to import named MP3s. The importer makes local backups. Text matching prevents an old recording from contradicting a rewritten caption; changed lines remain captioned until the replacement is imported. The temporary generator also checks the recorded text before deciding to reuse a file.

Dex and Control use an in-game earpiece filter. Wren and the floor officers remain clearer and more direct. All voice respects master volume; individual audio connections are released after playback. Clip metadata extends radio-caption and opening-shot timing for longer performances.

The runtime treats voice as an optional layer: captions carry every story beat, and the game works when audio is muted.

## Replacing Dex with a performed voice

The current synthesis is a temporary performance, not an imitation of an actor. An expressive reference must come from someone who explicitly agrees to have their voice used in the game. Do not use audio of a film/TV actor or another person without their permission.

Ask the performer for a clean, unprocessed 10–20 second recording with a little urgency and a little restraint. WAV is ideal; MP3 also works. Record in a quiet room, close to the microphone, with no music. Keep that private recording under `work/`, which is ignored by Git. The opening line to test is `cinematic-opening-2`: “I'm sorry, Wren. I can't lose the whole crew.”

`node scripts/export-voice-jobs.mjs` creates `work/voice-jobs.json` from the live story script. `scripts/render-consented-voice.py` is an optional offline candidate renderer using [Chatterbox Nano](https://github.com/resemble-ai/chatterbox). It requires `chatterbox-tts` and `imageio-ffmpeg` in a separate Python environment. Example: `python scripts/render-consented-voice.py --reference work/dex-reference.wav --clip cinematic-opening-2`. It downloads model weights once, renders on the CPU, and writes MP3/WAV previews only to `work/voice-candidates/`; it never overwrites the playable game. Review the preview for likeness to the **consenting performer**, emotion, word accuracy, and pacing before running `--all` and deliberately replacing the approved clips in `public/audio/voice/`.

These model dependencies and weights are **production tools**, not game dependencies. The game still loads only compact MP3s. For the most natural result, direct human recordings of the final lines will outperform a clone made from a short sample.
