// Explicit cause-and-effect chain shared by objectives and exit checks.
export function missionPhase(level, inventory = {}, flags = {}) {
  if (level === 1) {
    if (!inventory.hasKeycard) return { id: 'badge', text: 'Copy Okafor’s badge during an inspection stop', exitReady: false };
    if (!flags.nightEntry) return { id: 'reader', text: 'Authorise night entry at the rear staff reader', exitReady: false };
    return { id: 'lobby', text: 'Plan set. Leave through the public lobby', exitReady: true };
  }
  if (level === 2) {
    if (!flags.sensorDisabled) return { id: 'circuit', text: 'Reach the vault. Isolate the tamper circuit at the west service panel', exitReady: false };
    if (!flags.safeOpened) return { id: 'safe', text: 'Crack the safe while Briggs is away', exitReady: false };
    if (!inventory.hasStar) return { id: 'star', text: 'Open safe. Take the Kestrel Star', exitReady: false };
    return { id: 'service-exit', text: 'Star secured. Return to the service fire door', exitReady: true };
  }
  if (!flags.pastShutter) return { id: 'shutter', text: 'Replay the override with your Echo, then pass the shutter', exitReady: false };
  if (!flags.armed) return { id: 'sensors', text: 'Reach the stairwell. Put yourself and your Echo on the two roof sensors', exitReady: false };
  if (!flags.hatch) return { id: 'hatch', text: 'Hold the roof override to release the hatch', exitReady: false };
  return { id: 'zipline', text: 'The line you rigged is ready. Clip on and escape', exitReady: true };
}
