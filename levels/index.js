import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';

export const LEVELS = { 1: level1, 2: level2, 3: level3 };

export const ALL_LOOT = [level1, level2, level3].flatMap((level) =>
  level.pickups.map((p) => ({ id: p.id, type: p.kind, value: p.value ?? 0, label: p.label, level: level.id })));

export const EVIDENCE_TOTAL = ALL_LOOT.filter((p) => p.type === 'evidence').length;
