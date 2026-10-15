// Import approved final MP3 performances by the filenames in docs/voice-cast.
// Existing clips are backed up locally before replacement.
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { voiceJobs } from '../src/voiceScript.js';
import { RECORDED_TEXT } from '../src/voiceManifest.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-voice-clips.mjs <approved-mp3-folder> [--check]');
const check = process.argv.includes('--check');
const root = resolve(import.meta.dirname, '..'), folder = resolve(source), target = resolve(root, 'public/audio/voice');
const jobs = new Map(voiceJobs().map((job) => [job.id, job]));
const files = (await readdir(folder)).filter((name) => name.endsWith('.mp3') && jobs.has(name.slice(0, -4)));
if (!files.length) throw new Error('No MP3 filenames match the recording script. Keep the clip IDs exactly as listed.');
for (const name of files) if ((await stat(resolve(folder, name))).size < 128) throw new Error(`Empty or invalid clip: ${name}`);
if (check) { process.stdout.write(`${files.length} recognised MP3 files. No files changed.\n`); process.exit(0); }
const backup = resolve(root, 'work/voice-backups', new Date().toISOString().replaceAll(':', '-'));
await mkdir(backup, { recursive: true }); await mkdir(target, { recursive: true });
const recorded = { ...RECORDED_TEXT };
for (const name of files) {
  const old = resolve(target, name);
  if (await stat(old).catch(() => null)) await copyFile(old, resolve(backup, name));
  await copyFile(resolve(folder, name), old);
  const id = name.slice(0, -4); recorded[id] = jobs.get(id).text;
}
const available = [];
for (const id of Object.keys(recorded)) if ((await stat(resolve(target, `${id}.mp3`)).catch(() => null))?.size > 0) available.push(id);
await writeFile(resolve(root, 'src/voiceManifest.js'), `// Generated voice index. Only exact script matches are played.\nexport const RECORDED_CLIPS = ${JSON.stringify(available, null, 2)};\nexport const RECORDED_TEXT = ${JSON.stringify(Object.fromEntries(available.map((id) => [id, recorded[id]])), null, 2)};\n`);
process.stdout.write(`Imported ${files.length} approved clips. Previous audio saved under work/voice-backups.\n`);
