import { voiceLines, CINEMATICS, BARKS, DEX, WREN } from './story.js';
import { barkClipId } from './voiceIds.js';

export function voiceJobs() {
  const jobs = voiceLines().filter((job) => job.who === DEX || job.who === WREN);
  for (const [key, frames] of Object.entries(CINEMATICS)) frames.forEach((frame, index) => {
    if (frame.dialogue) jobs.push({ id: `cinematic-${key}-${index + 1}`, who: frame.speaker, text: frame.dialogue, key: `cinematic:${key}` });
  });
  for (const [state, lines] of Object.entries(BARKS)) {
    const actors = state === 'camera' ? [['control', 'CONTROL']] : [['okafor', 'OKAFOR'], ['briggs', 'BRIGGS'], ['sweep', 'SWEEP TEAM']];
    for (const [actor, who] of actors) lines.forEach((text, index) => jobs.push({ id: barkClipId(actor, state, index), who, text, key: state }));
  }
  jobs.push({ id: 'voice-test', who: DEX, text: 'Comms check. If you can hear me, the radio is working.', key: 'audio-test' });
  return jobs;
}
