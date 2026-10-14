export const STORY = {
  protagonist: 'Imani Sulé',
  archive: 'Halvard Archive',
  target: 'Accession H-1968-07',
  targetShort: 'H-1968-07',
  opening: 'Eighteen months after Halvard erased her from the archive, conservator Imani Sulé returns for the recording reel they plan to destroy at dawn.',
  outro: 'H-1968-07 is safe. Halvard can erase an accession number, but not what the reel remembers.',
  stages: {
    1: {
      act: 'ACT I',
      name: 'UPPER GALLERIES',
      objective: 'Recover a staff key from security, then descend to the deep store',
      intro: 'The public galleries still hold a low emergency glow. Use the quiet conservation wing, take the staff key, and descend before the patrol resolves your echo.',
      clearKicker: 'STAFF KEY ACQUIRED // DESCENDING'
    },
    2: {
      act: 'ACT II',
      name: 'DEEP STORE',
      objective: 'Match the key’s resonance and recover Accession H-1968-07',
      intro: 'The deep store catalogues sealed material by resonance, not labels. Scan all three cases and match the single, double, or triple echo stored on the key.',
      clearKicker: 'ACCESSION H-1968-07 RECOVERED'
    },
    3: {
      act: 'ACT III',
      name: 'CONTAINMENT',
      objective: 'Carry H-1968-07 through both overrides and reach the emergency lift',
      intro: 'Removing the reel trips containment. Halvard cuts every licensed rig and sends a sweep team down. Open both noisy overrides before they close the route.',
      clearKicker: 'EVIDENCE EXTRACTED'
    }
  }
};
