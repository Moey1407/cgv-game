# SIGNAL voice recording pack

The current script is generated from the game, including the opening, radio dialogue, betrayal and security reactions. Use an original or properly licensed/consented voice for each role. Generate one clean MP3 per line. Do not bake a radio effect into the files: the game supplies it for Dex and Control.

| Role | Script |
| --- | --- |
| Dex — handler, persuasion to betrayal | [dex.md](dex.md) |
| Wren — player, restrained but resourceful | [wren.md](wren.md) |
| Okafor — gala floor security | [okafor.md](okafor.md) |
| Briggs — night security | [briggs.md](briggs.md) |
| Sweep team — lockdown response | [sweep-team.md](sweep-team.md) |
| Control — radio dispatch | [control.md](control.md) |

Every heading is the required filename, for example `cinematic-opening-2.mp3`. Read only the dialogue below it. Context and acting directions are for the performer. Prefer mono MP3 at 96–128 kbps. Leave natural breaths and pauses, but trim long empty starts/ends. The game measures clip duration so emotional delivery is not cut short.

You can provide the performances in batches. Put named MP3s in one folder and run `npm run voice:import -- <folder> --check` to validate filenames. After listening and approving the batch, run the same command without `--check`. It backs up previous audio under ignored `work/voice-backups/` and refreshes the text manifest. Captions cover any missing line; the game will not play an outdated script under a new caption.

`all-lines.json` is the machine-readable pack. `npm run voice:script` refreshes all six sheets from the current game. Regenerate it whenever dialogue changes so filenames and words stay aligned.
