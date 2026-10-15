export function barkClipId(guardId, state, index) {
  const actor = state === 'camera' ? 'control' : ['okafor', 'briggs', 'sweep'].includes(guardId) ? guardId : 'sweep';
  return `${actor}-${state}-${index + 1}`;
}
