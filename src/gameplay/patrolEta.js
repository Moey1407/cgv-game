// How long until a patrolling guard reaches a "watch" waypoint, from where he is now.
// Used for the safe-dial countdown in Level 2: reaching the watch waypoint means the
// guard is about to look at the safe.
//
// Returns { state, seconds }:
//   'patrol'     on his route; seconds until he reaches the watch waypoint
//   'checking'   he has reached it and is walking the leg that faces the safe
//   'distracted' investigating a noise (a decoy); seconds until he is back at the check
//   'alert'      pursuing or searching; no countdown, get out of sight
// Estimates use straight lines between waypoints, so they run slightly early, never late.
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const INVESTIGATE_HOLD = 3; // guardAI looks around for 3 s once it reaches a noise

export function patrolEta(guard, { watchIndex = 0, pace = guard.speed } = {}) {
  if (guard.state === 'pursue' || guard.state === 'search') return { state: 'alert', seconds: 0 };
  const wp = guard.waypoints;
  const n = wp.length;
  const checkIndex = (watchIndex + 1) % n;
  const along = (from, index) => {
    // From a point, to waypoint `index`, then onward around the loop to the watch waypoint.
    let d = flat(from, wp[index]);
    for (let i = index, hops = 0; i !== watchIndex && hops < n; i = (i + 1) % n, hops += 1) d += flat(wp[i], wp[(i + 1) % n]);
    return d;
  };
  const speed = pace > 0 ? pace : 0;
  const time = (d) => (speed > 0 ? d / speed : Infinity);

  if (guard.state === 'investigate') {
    const target = guard.target ?? guard.position;
    const hold = guard.timer > 0 ? guard.timer : INVESTIGATE_HOLD;
    const there = guard.timer > 0 ? 0 : flat(guard.position, target);
    // After investigating he walks back to the waypoint he was heading for.
    const back = guard.index === checkIndex ? flat(target, wp[checkIndex]) : along(target, guard.index);
    return { state: 'distracted', seconds: time(there + back) + hold };
  }
  if (guard.index === checkIndex) return { state: 'checking', seconds: 0 };
  return { state: 'patrol', seconds: time(along(guard.position, guard.index)) + (guard.pauseTimer ?? 0) };
}

export function etaText(name, eta) {
  const who = String(name).toUpperCase();
  const clock = (s) => {
    if (!Number.isFinite(s)) return '--:--';
    const t = Math.max(0, Math.ceil(s));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  };
  if (eta.state === 'alert') return { text: who + ' IS HUNTING YOU · GET OUT OF SIGHT', level: 'danger' };
  if (eta.state === 'checking') return { text: who + ' IS CHECKING THE SAFE · STEP BACK', level: 'danger' };
  if (eta.state === 'distracted') return { text: who + ' DISTRACTED · BACK IN ' + clock(eta.seconds), level: eta.seconds < 6 ? 'warn' : 'calm' };
  return { text: who + ' CHECKS THE SAFE IN ' + clock(eta.seconds), level: eta.seconds < 6 ? 'warn' : 'calm' };
}