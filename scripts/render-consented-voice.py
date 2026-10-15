"""Stage original Dex voice candidates from a consenting performer's sample.

Run export-voice-jobs.mjs first. This script never overwrites game audio.
Install chatterbox-tts and imageio-ffmpeg in a separate environment before use.
"""

import argparse
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
JOBS = ROOT / "work" / "voice-jobs.json"
OUTPUT = ROOT / "work" / "voice-candidates"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", required=True, type=Path, help="Consenting performer's 10–20 second WAV/MP3 sample")
    parser.add_argument("--clip", default="cinematic-opening-2", help="Clip ID to preview; ignored with --all")
    parser.add_argument("--all", action="store_true", help="Render all Dex lines into staging")
    args = parser.parse_args()

    if not args.reference.is_file():
        parser.error(f"Reference recording not found: {args.reference}")
    if not JOBS.is_file():
        parser.error("Run `node scripts/export-voice-jobs.mjs` first")

    jobs = [job for job in json.loads(JOBS.read_text(encoding="utf-8")) if job["who"] == "DEX"]
    jobs = jobs if args.all else [job for job in jobs if job["id"] == args.clip]
    if not jobs:
        parser.error(f"No Dex line found for {args.clip}")

    import imageio_ffmpeg
    import torch
    import torchaudio
    from chatterbox.tts_turbo import ChatterboxTurboTTS

    OUTPUT.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(min(8, torch.get_num_threads()))
    model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)
    model.prepare_conditionals(str(args.reference))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    for job in jobs:
        text = job["text"]
        # The source text stays identical to the on-screen subtitle. Direction
        # belongs in the reference performance, not in spoken stage notes.
        with torch.inference_mode():
            audio = model.generate(text)
        wav = OUTPUT / f"{job['id']}.wav"
        mp3 = OUTPUT / f"{job['id']}.mp3"
        torchaudio.save(str(wav), audio, model.sr)
        subprocess.run([
            ffmpeg, "-y", "-loglevel", "error", "-i", str(wav), "-codec:a", "libmp3lame",
            "-qscale:a", "5", str(mp3),
        ], check=True)
        print(f"Staged {job['id']}: {mp3}")

    print("Candidates are in work/voice-candidates. Review them before replacing game clips.")


if __name__ == "__main__":
    main()
