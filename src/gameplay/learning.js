// Action-led guidance. Nothing here gates mission progress or requires a popup.
const lesson = (id, title, text, keys, goal) => ({ id, title, text, keys, goal });
export function createLearningGuide() {
  let looked = false, moved = 0, quiet = 0, previous = null;
  let openedCamera = false, selectedHall = false, loopedHall = false;
  function reset() { looked = false; moved = quiet = 0; previous = null; openedCamera = selectedHall = loopedHall = false; }
  function update(dt, s) {
    if (previous && dt > 0) {
      moved += Math.min(1, Math.hypot(s.x - previous.x, s.z - previous.z));
      if (Math.abs(Math.atan2(Math.sin(s.yaw - previous.yaw), Math.cos(s.yaw - previous.yaw))) > .08) looked = true;
    }
    if (dt > 0) previous = { x: s.x, z: s.z, yaw: s.yaw };
    if (s.moving && s.movement === 'walk') quiet += dt;
    const f = s.flags ?? {};
    if (s.level === 1) {
      if (!f.rig && !s.hasKeycard) {
        if (!looked) return lesson('look', 'Look around', 'Tonight is reconnaissance, not the theft. Find the gold marker for the staff door.', 'MOVE MOUSE', 'Look left or right to begin.');
        if (moved < 2) return lesson('move', 'Walk into the gala', 'You are on the guest list. Moving normally in the public hall is safe.', 'W A S D', 'Move a few steps. Mouse looks; WASD moves.');
        if (quiet < .7) return lesson('walk', 'Try a quiet walk', 'Shift slows your footsteps. You will need that in restricted areas.', 'HOLD SHIFT + W', 'Walk quietly for a moment.');
        if (s.x < 11.3) return lesson('staff-door', 'Find the staff door', 'Follow the gold diamond to the east wall. Beyond that door, your guest cover no longer protects you.', 'W A S D', 'Wait for the officer to move away, then enter.');
        return lesson('camera-tap', 'Link the camera tap', 'Reach the marked security desk. This connects your wrist rig to CCTV; your sound lens already works.', 'HOLD E AT DESK', 'Keep E held until the progress bar fills.');
      }
      if (!s.hasKeycard) {
        if (s.camera >= 0) openedCamera = true;
        if (s.camera === 1) selectedHall = true;
        if (s.hallLooped) loopedHall = true;
        if (!openedCamera) return lesson('cctv-open', 'Check the cameras', 'The desk tap is online. Open the CCTV wall before approaching Okafor.', 'TAB', 'Open all camera feeds. You cannot throw decoys while watching.');
        if (!selectedHall && s.camera >= 0) return lesson('cctv-select', 'Select the Grand Hall', 'All feeds stay visible. Choose camera 2 so you can interrupt its view of the badge copy.', '2', 'Select GRAND HALL.');
        if (!loopedHall && s.camera === 1) return lesson('cctv-loop', 'Give yourself a window', 'A loop shows security the last few seconds instead of your live position.', 'E', 'Loop camera 2. It lasts eight seconds.');
        if (s.camera >= 0) return lesson('cctv-close', 'Back to the floor', 'The loop timer is running. Return to Wren to move.', 'TAB', 'Close CCTV. You can reopen it and loop again later.');
        return lesson('badge', 'Copy, do not steal', 'Find Okafor at the gold marker. Wait for a stationary inspection and a gap in nearby guests.', 'HOLD E BEHIND OKAFOR', 'Get close behind him for 0.75 seconds. Do not follow at his heels.');
      }
      if (!f.nightEntry) return lesson('reader', 'Prepare the night visit', 'The original badge is still on Okafor. Take the copied code to the rear staff reader.', 'E AT STAFF READER', 'Follow the gold marker. The back corridor is restricted.');
      return lesson('lobby', 'Leave normally', 'Access is ready. The Star is moved into the safe after closing; that is when you return.', 'E AT LOBBY EXIT', 'Return to the entrance and leave through the marked doors.');
    }
    if (s.level === 2) {
      if (s.inSafe) return lesson('dial', 'Listen for the contact', 'Move the mouse slowly to turn the dial. Press E at the strongest click. Set all three tumblers.', 'MOUSE → E', 'Fast turning makes noise. Backspace closes the dial if Briggs returns.');
      if (!f.sensorDisabled) {
        if (s.z > -7) return lesson('crawl-beam', 'Go under the first beam', 'Tonight you are trespassing. The first beam is too low to walk under.', 'HOLD Z + W', 'Keep Z held to crawl until you are clear of the beam.');
        if (s.z > -13) return lesson('jump-beam', 'Go over the low beam', 'Release Z first. Move forward and jump over the next beam.', 'RELEASE Z · W + SPACE', 'Take a short run-up. Do not jump while crawling.');
        if (s.z > -20) return lesson('moving-beam', 'Watch one full cycle', 'This beam moves. Wait for a high gap and crawl under, or time a jump over a low gap.', 'Z / SPACE', 'Observe before moving. A laser strike raises the alarm.');
        return lesson('panel', 'Isolate the safe sensor', 'Follow the gold service-panel marker. Watch Briggs; crates hide you and a decoy draws him away.', 'HOLD E AT PANEL', 'The side vent is optional. Crouch or crawl, then E at its entrance.');
      }
      if (!f.safeOpened) return lesson('safe', 'Reach the safe', 'The tamper circuit is off. Approach the gold safe marker while Briggs is away.', 'E AT SAFE', 'Use the patrol countdown. Left click throws a decoy if you need time.');
      if (!s.hasStar) return lesson('star', 'Take the Kestrel Star', 'Opening the safe did not put the diamond in your pocket.', 'E AT OPEN SAFE', 'Step up to the open safe and collect the Star.');
      return lesson('fire-door', 'Get out of the vault', 'You have the Star. Return through the guarded passage to the service fire door.', 'E AT FIRE DOOR', 'Follow the gold marker; keep the Star and evidence on you.');
    }
    if (!f.pastShutter) {
      if (s.echo === 'recording') return lesson('record-hold', 'Record the override', 'Keep E held at the yellow override for about six seconds. Then press R again to rewind and replay.', 'HOLD E · THEN R', `Recorded: ${Math.floor(s.echoElapsed ?? 0)} seconds. Your Echo must hold long enough for you to cross.`);
      if (s.echo === 'replaying') return lesson('cross-shutter', 'Let your Echo hold it', 'The replay repeats your E input. Leave it at the override and cross the open shutter now.', 'W THROUGH SHUTTER', 'If it closes too soon, record a longer hold and retry.');
      return lesson('record-start', 'Make a second operator', 'Dex cut the radio, not your local rig. Go to the gold override marker and start recording.', 'R AT OVERRIDE', 'Next, hold E to open the shutter. Your Echo will repeat that input.');
    }
    if (s.base < 10) return lesson('stairs', 'Reach the stairs', 'Avoid the patrols and head for the gold stairwell marker. The duct is a quieter optional route.', 'E AT STAIRS · W TO CLIMB', 'Q pauses and opens the full controls. Escape closes a device first.');
    if (!f.armed) {
      if (s.echo === 'recording') return lesson('plate-record', 'Stay on this plate', 'Stand still on one sensor for about six seconds. Press R again, then walk onto the other sensor.', 'WAIT · R · OTHER PLATE', 'Your replay occupies the first plate while you occupy the second.');
      if (s.echo === 'replaying') return lesson('plate-replay', 'Take the other plate', 'Leave the first sensor to your Echo. Stand on the other until both lock green.', 'W A S D', 'Both plates need a different operator at the same time.');
      return lesson('plate-start', 'One person, two plates', 'Step onto either floor sensor, then record yourself standing there.', 'R ON A SENSOR PLATE', 'You need an Echo on one plate and Wren on the other.');
    }
    if (!f.hatch) return lesson('hatch', 'Release the roof hatch', 'Both plates are locked. Use the gold override marker. Three evidence files will upload here if collected.', 'HOLD E AT OVERRIDE', 'Wait for the progress bar to fill.');
    return lesson('zipline', 'Your way out', 'Reach the line you rigged before the job. Clip on to escape.', 'E · THEN A / D TO LEAN', 'The building timer stops once you are on the line.');
  }
  return { update, reset };
}
