// Level 1 is a social-stealth space: security is looking for suspicious
// behaviour, not an unknown face. Wren is dressed as a guest and Okafor has
// never met her, so normal movement in the public hall is legitimate.
export function galaCover({ x = 0, z = 0, movement = 'run', gadgetHeat = 0, lifting = false, compromised = false } = {}) {
  if (compromised) return { safe: false, reason: 'GUEST COVER BLOWN' };
  if (lifting) return { safe: false, reason: 'BADGE COPY EXPOSED' };
  if (gadgetHeat > 0) return { safe: false, reason: 'GADGET SEEN' };
  if (z < -30 || x > 11.4) return { safe: false, reason: 'STAFF ONLY' };
  if (movement === 'sprint') return { safe: false, reason: 'RUNNING' };
  if (movement === 'crouch' || movement === 'crawl') return { safe: false, reason: 'ACTING SUSPICIOUS' };
  return { safe: true, reason: 'BLENDING IN' };
}

// A guest close enough to see Wren handling Okafor's badge breaks the cover.
// This is deliberately positional rather than random: wait for his patrol to
// move clear, or draw attention elsewhere before attempting the copy.
export function galaWitnessNearby(player, guests, radius = 5.2) {
  return guests.some((guest) => {
    const dx = player.x - guest.x, dz = player.z - guest.z, distance = Math.hypot(dx, dz);
    if (distance > radius) return false;
    if (distance < 2) return true;
    return (Math.sin(guest.rotation ?? 0) * dx + Math.cos(guest.rotation ?? 0) * dz) / distance > 0.25;
  });
}
