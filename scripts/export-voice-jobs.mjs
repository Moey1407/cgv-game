// Export the current script for an offline, consented voice session.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { voiceJobs } from '../src/voiceScript.js';

const root = resolve(import.meta.dirname, '..');
const jobs = voiceJobs();

const directions = {
  'cinematic-opening-1': 'Breathless, urgent. A steel shutter is falling behind you.',
  'cinematic-opening-2': 'Quiet guilt under pressure. Do not shout; the choice has already been made.',
  'cinematic-opening-3': 'Measured persuasion. He needs Wren to trust him, but he is hiding something.',
  'cinematic-opening-4': 'Low radio voice. Controlled, specific, almost too calm.',
  'cinematic-opening-5': 'Wren checking her own equipment. Matter-of-fact and quietly confident, not a tutorial announcer.',
  'cinematic-after1-1': 'Relieved, outside the gala. Wren wants a straight answer; no breathless chase.',
  'cinematic-after1-2': 'Dex explains the plan quietly and precisely. Persuasive, not a tutorial announcer.',
  'cinematic-after1-3': 'Professional agreement with an edge of distrust. Emphasise her own way out.',
  'cinematic-after2-1': 'Controlled urgency. The exit is not opening, but Wren still expects Dex to help.',
  'cinematic-after2-2': 'Cold reveal. No villain laughter. The apology is empty; Marlowe confirms the pattern.',
  'cinematic-after2-3': 'The betrayal lands, then Wren regains control. A short pause after purpose and dead.',
};

const cast = jobs.map((job) => ({ ...job, direction: directions[job.id] ?? '' }));
const directory = resolve(root, 'work');
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, 'voice-jobs.json'), `${JSON.stringify(cast, null, 2)}\n`);
const output = resolve(root, 'docs/voice-cast');
await mkdir(output, { recursive: true });
const castNotes = {
  DEX: 'A persuasive former handler. Warm and measured at the gala; clipped and impatient near the safe; cold at the betrayal. Speak to one person over an earpiece, not to an audience.',
  WREN: 'A capable safecracker who has learned not to trust Dex. Wry, restrained, then shaken but resourceful. The opening escape line should sound urgent and breathless.',
  OKAFOR: 'Museum floor security. Civil and attentive at the gala; firm if a guest crosses a boundary. Avoid military shouting for ordinary investigation.',
  BRIGGS: 'Night security officer. Tired, alert to small sounds; increasingly forceful during pursuit.',
  'SWEEP TEAM': 'A responding security officer during lockdown. Short, urgent commands. Human voices in a large concrete room.',
  CONTROL: 'A calm security radio dispatcher. Clear, concise instructions over a handset.',
};
for (const who of Object.keys(castNotes)) {
  const lines = cast.filter((job) => job.who === who);
  const markdown = [`# ${who} — recording script`, '', castNotes[who], '',
    'One MP3 per line, using the exact filename below. Dry voice only: no music, radio filter, reverb or effects. Use a voice you have permission to use. Keep natural pauses; do not read the direction or filename aloud.', '',
    ...lines.flatMap((job) => [`## ${job.id}.mp3`, '', `Context: ${job.key ?? 'dialogue'}${job.level ? ` · level ${job.level}` : ''}.`, ...(job.direction ? ['', `Direction: ${job.direction}`] : []), '', job.text, ''])].join('\n');
  await writeFile(resolve(output, `${who.toLowerCase().replaceAll(' ', '-')}.md`), markdown);
}
await writeFile(resolve(output, 'all-lines.json'), `${JSON.stringify(cast, null, 2)}\n`);
process.stdout.write(`Exported ${cast.length} lines for six cast roles to docs/voice-cast and work/voice-jobs.json\n`);
