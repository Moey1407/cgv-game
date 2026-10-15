// levels/schema.js
// Level data contract for SIGNAL (heist rebuild). Owner: Teammate 3.
// Agree this with Teammate 2 in the day-1 meeting, then treat it as frozen.
//
// Coordinates are metres. X is east, Y is up, Z is south, so the player walks
// towards -Z ("north"). Positions are [x, y, z]. Boxes are centre + size.
// Yaw follows Three.js rotation.y: yawDeg 0 faces -Z, +90 faces -X, -90 faces +X,
// 180 faces +Z.
//
// Event names (shared with Teammate 2's event bus):
//   alarm:change  item:picked  echo:start  level:complete
// item:picked carries the pickup id; a guard's keycard uses KEYCARD_ID.

/**
 * @typedef {[number, number, number]} Vec3
 *
 * @typedef {Object} Box
 * @property {Vec3} pos        centre
 * @property {Vec3} size       width, height, depth
 * @property {string} [name]
 * @property {'shell'|'wall'|'prop'|'column'|'pedestal'} [kind]
 * @property {string} [surface] key of SURFACE_NOISE (drives footstep noise AND the material Huzaifa applies)
 * @property {boolean} [collide=true]
 *
 * @typedef {Object} Zone
 * @property {string} id        referenced by 'zone:<id>' Dex triggers
 * @property {Vec3} min
 * @property {Vec3} max
 *
 * @typedef {Object} Label
 * @property {string} text      wall signage; facing is chosen by whoever builds it
 * @property {Vec3} pos
 * @property {number} width
 *
 * @typedef {Object} Decor
 * @property {'frame'|'exhibit'|'table'|'desk'} type
 * @property {Vec3} pos
 * @property {number} [rotYDeg]
 * @property {number} [width]   frame width in metres
 * @property {string} [texture] file under public/textures, lowercase
 * @property {string} [colour]  placeholder colour until real textures land
 * @property {string} [shape]   exhibit silhouette
 *
 * @typedef {Object} Guard
 * @property {string} name          radio name, e.g. 'Okafor'
 * @property {Vec3[]} route         patrol waypoints (loop)
 * @property {number} [speed]       metres per second
 * @property {number} [coneDeg]     full view-cone angle in degrees
 * @property {number} [range]       view distance in metres
 * @property {boolean} [hasKeycard] pickpocket target (L1)
 * @property {number} [pickpocketSeconds] hold-E time (1.5 in the plan)
 *
 * @typedef {Object} Camera
 * @property {string} id
 * @property {string} [label]       text on the CCTV overlay
 * @property {Vec3} pos
 * @property {number} yawDeg
 * @property {number} [sweepDeg]    0 = fixed
 * @property {number} [range]
 *
 * @typedef {Object} Laser
 * @property {string} id
 * @property {Vec3} a               beam start
 * @property {Vec3} b               beam end
 * @property {'static'|'rise_fall'|'sweep'|'blink'} pattern
 * @property {number} [period]      seconds
 * @property {number} [amplitude]   metres (rise_fall / sweep)
 * @property {'crawl'|'jump'|'timing'} [teaches]
 *
 * @typedef {Object} Pickup
 * @property {string} id
 * @property {'loot'|'evidence'|'keycard'} kind
 * @property {Vec3} pos
 * @property {number} [value]       loot cash value
 * @property {number} [evidenceIndex] 1..3
 * @property {string} [label]
 *
 * @typedef {Object} Interactable
 * @property {string} id
 * @property {'door'|'override'|'plate'|'vent'|'safe'|'zipline'|'hatch'|'keycard_door'|'stairs'} type
 * @property {Vec3} pos
 * @property {Vec3} [size]
 * @property {Vec3} [usePos]         where the player stands to use it
 * @property {Vec3} [to]             vents and stairs: where using it puts the player
 * @property {'keycard'} [requires]
 * @property {number} [holdSeconds]  override hold time (3.5 in L3)
 * @property {string} [group]        e.g. two plates share a group
 * @property {boolean} [heldOnly]    stays open only while held (L3 Hold room)
 * @property {string[]} [opens]      ids this unlocks
 *
 * @typedef {Object} Light
 * @property {'point'|'spot'|'directional'|'ambient'} type
 * @property {Vec3} [pos]
 * @property {Vec3} [target]
 * @property {string} color
 * @property {number} intensity
 * @property {boolean} [shadow]
 *
 * @typedef {Object} EchoRoom
 * @property {string} id            'hold' | 'lure' | 'plates'
 * @property {Vec3} min             room bounds
 * @property {Vec3} max
 * @property {string} [hint]
 *
 * @typedef {Object} Objective
 * @property {string} id            referenced by 'objective:<id>' Dex triggers
 * @property {string} text          on-screen goal text
 * @property {Vec3} [marker]        waypoint marker
 * @property {string} [follow]      guard name the marker follows
 *
 * @typedef {Object} DexLine
 * @property {string} trigger       'start' | 'objective:<id>' | 'alarm:<level>' | 'pickup:<id>' | 'zone:<id>'
 * @property {string} text
 * @property {string} [clip]        audio file
 *
 * @typedef {Object} Level
 * @property {number} id            1..3
 * @property {string} name
 * @property {string} objective
 * @property {Objective[]} [objectives]  ordered goal chain
 * @property {Vec3} spawn
 * @property {number} [spawnYawDeg]
 * @property {Vec3} checkpoint      restart point (under 2 s)
 * @property {Vec3} goal            waypoint marker position
 * @property {Box[]} walls          every solid thing, shell and props included
 * @property {Box[]} floors
 * @property {Zone[]} [zones]
 * @property {Label[]} [labels]
 * @property {Decor[]} [decor]
 * @property {Guard[]} guards
 * @property {Camera[]} cameras
 * @property {Laser[]} lasers
 * @property {Pickup[]} pickups
 * @property {Interactable[]} interactables
 * @property {Light[]} lights
 * @property {{charges:number, rechargeSeconds:number}} [decoys]
 * @property {EchoRoom[]} [echoRooms]   L3 only
 * @property {number} [lockdownSeconds] L3 only (240)
 * @property {string} [alarmFloor]  'Quiet' | 'Alert' (L3 is stuck at Alert)
 * @property {DexLine[]} dex
 * @property {{skybox:string, fog?:{color:string, density:number}, music?:string}} look
 */

export const ALARM_LEVELS = ['Quiet', 'Suspicious', 'Alert', 'Lockdown'];
export const EVENTS = ['alarm:change', 'item:picked', 'echo:start', 'level:complete'];
export const KEYCARD_ID = 'keycard';

// Scales the radius of the player's footstep rings, so the floor the player
// picks decides how far their position travels.
// carpet, stone, tile and marble are the values from the old Level 1.
// steel and concrete are placeholders for Levels 2 and 3 until they are tuned.
export const SURFACE_NOISE = { carpet: 0.6, stone: 1, tile: 1.25, marble: 1.35, steel: 1.2, concrete: 1 };

/** Surface under (x, z): the last floor listed that contains the point wins. */
export function surfaceAt(level, x, z, fallback = 'marble') {
  let found = fallback;
  for (const f of level.floors || []) {
    if (Math.abs(x - f.pos[0]) <= f.size[0] / 2 && Math.abs(z - f.pos[2]) <= f.size[2] / 2) found = f.surface || found;
  }
  return found;
}

const REQUIRED = [
  'id', 'name', 'objective', 'spawn', 'checkpoint', 'goal',
  'walls', 'floors', 'guards', 'cameras', 'lasers',
  'pickups', 'interactables', 'lights', 'dex', 'look',
];

/** Returns a list of problems; empty array means the level is valid. */
export function validateLevel(level) {
  const errs = [];
  const isVec = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

  for (const k of REQUIRED) if (!(k in level)) errs.push(`missing field: ${k}`);
  for (const k of ['spawn', 'checkpoint', 'goal'])
    if (k in level && !isVec(level[k])) errs.push(`${k} must be [x,y,z]`);

  const checkBox = (b, where) => {
    if (!isVec(b.pos) || !isVec(b.size)) errs.push(`${where}: pos and size must be [x,y,z]`);
    if (b.surface && !(b.surface in SURFACE_NOISE)) errs.push(`${where}: unknown surface "${b.surface}"`);
  };
  (level.walls || []).forEach((b, i) => checkBox(b, `walls[${i}] ${b.name || ''}`));
  (level.floors || []).forEach((b, i) => checkBox(b, `floors[${i}]`));

  const ids = new Set();
  const claim = (id, where) => {
    if (!id) return errs.push(`${where}: missing id`);
    if (ids.has(id)) errs.push(`duplicate id: ${id}`);
    ids.add(id);
  };
  (level.cameras || []).forEach((c) => claim(c.id, 'camera'));
  (level.lasers || []).forEach((l) => claim(l.id, 'laser'));
  (level.pickups || []).forEach((p) => claim(p.id, 'pickup'));
  (level.interactables || []).forEach((i) => claim(i.id, 'interactable'));

  for (const i of level.interactables || [])
    for (const target of i.opens || [])
      if (!ids.has(target)) errs.push(`${i.id}.opens refers to unknown id: ${target}`);

  for (const i of level.interactables || []) {
    for (const k of ['pos', 'usePos', 'to']) if (k in i && !isVec(i[k])) errs.push(`${i.id}.${k} must be [x,y,z]`);
    if ((i.type === 'stairs' || i.to) && !(isVec(i.usePos) && isVec(i.to))) errs.push(`${i.id}: stairs and vents need usePos and to`);
  }

  for (const g of level.guards || [])
    if (!g.route || g.route.length < 2) errs.push(`guard ${g.name}: route needs 2+ waypoints`);

  const keycardGuards = (level.guards || []).filter((g) => g.hasKeycard);
  for (const i of level.interactables || [])
    if (i.requires === 'keycard' && !keycardGuards.length && !(level.pickups || []).some((p) => p.kind === 'keycard'))
      errs.push(`${i.id} requires a keycard but nothing in the level carries one`);

  const pickupIds = new Set((level.pickups || []).map((p) => p.id));
  if (keycardGuards.length) pickupIds.add(KEYCARD_ID);
  const zoneIds = new Set([
    ...(level.zones || []).map((z) => z.id),
    ...(level.echoRooms || []).map((r) => r.id),
    ...(level.interactables || []).map((i) => i.id),
    ...(level.cameras || []).map((c) => c.id),
  ]);
  const objectiveIds = new Set((level.objectives || []).map((o) => o.id));
  for (const d of level.dex || []) {
    const [kind, ref] = String(d.trigger).split(':');
    if (kind === 'start') continue;
    if (kind === 'pickup' && !pickupIds.has(ref)) errs.push(`dex trigger "${d.trigger}": no such pickup`);
    else if (kind === 'zone' && !zoneIds.has(ref)) errs.push(`dex trigger "${d.trigger}": no such zone`);
    else if (kind === 'alarm' && !ALARM_LEVELS.includes(ref)) errs.push(`dex trigger "${d.trigger}": unknown alarm level`);
    else if (kind === 'objective' && objectiveIds.size && !objectiveIds.has(ref)) errs.push(`dex trigger "${d.trigger}": no such objective`);
    else if (!['pickup', 'zone', 'alarm', 'objective'].includes(kind)) errs.push(`dex trigger "${d.trigger}": unknown kind`);
  }

  if (level.id === 3 && (level.echoRooms || []).length !== 3)
    errs.push('level 3 needs exactly 3 echoRooms');

  return errs;
}
