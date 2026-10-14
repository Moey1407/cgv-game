import * as THREE from 'three';

// ---------------------------------------------------------------------------
// LEVEL 1 - THE UPPER GALLERIES
//
// Layout notes for the team. The shell stays 34 x 46 so the floor plane, the
// minimap camera and the navigation grid bounds are all unchanged.
//
//            x=-17        x=-6   x=6         x=17
//   z=23  +-----------------------------------+
//         |          ENTRANCE ATRIUM          |  carpet, quiet, spawn (0,18)
//   z=14  +------+     +------------+   +-----+  two doorways, no middle route
//         | CON- |     |            |   |     |
//         | SER- |     |  CENTRAL   |   | TRA |  hall is marble: loud but short
//         | VAT- |<-+  |    HALL    |+->| NS- |  west gap z 2..6, east gap z 4..8
//         | ION  |     |            |   | IT  |
//   z=-4  +------+-----+------------+---+-----+
//         |           CROSS GALLERY           |  full width connector
//   z=-8  +--------+              +-----------+  two openings
//         | STACKS |      | SPINE |  SECURITY |  key is behind the office door
//   z=-23 +-----------------------------------+
//
// Routes: west is long, carpeted and full of cover. East is short, hard-floored
// and almost empty. The central hall is the shortest line of all and the worst
// surface to run on, and it is where the patrol spends most of its loop.
// ---------------------------------------------------------------------------

// Surface types. The multiplier scales the radius of the player's footstep
// rings, so the floor the player picks decides how far their position travels.
export const SURFACES = {
  carpet: { noise: 0.6, colour: 0x1b2a2c, label: 'CARPET' },
  stone: { noise: 1, colour: 0x17232e, label: 'STONE' },
  tile: { noise: 1.25, colour: 0x1f2b36, label: 'TILE' },
  marble: { noise: 1.35, colour: 0x26343f, label: 'MARBLE' }
};

// Rectangles are [minX, minZ, maxX, maxZ]. Anything not covered is stone.
export const FLOOR_ZONES = [
  { name: 'atrium', surface: 'carpet', rect: [-17, 14, 17, 23] },
  { name: 'conservation', surface: 'carpet', rect: [-17, -4, -6, 14] },
  { name: 'central-hall', surface: 'marble', rect: [-6, -4, 6, 14] },
  { name: 'transit', surface: 'tile', rect: [6, -4, 17, 14] }
];

export function surfaceAt(x, z) {
  for (const zone of FLOOR_ZONES) {
    const [minX, minZ, maxX, maxZ] = zone.rect;
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) return zone.surface;
  }
  return 'stone';
}

export function noiseScaleAt(x, z) {
  return SURFACES[surfaceAt(x, z)].noise;
}

export function createGalleriesMission({ gallery, addBox, materials, createLabelPanel }) {
  let guardCarriesKey = false;
  const keyPosition = new THREE.Vector3(12.5, 1.55, -20.1);
  const entrancePosition = new THREE.Vector3(0, 0, -20.6);
  const label = (text, x, y, z, width) => {
    const panel = createLabelPanel(text, width);
    panel.position.set(x, y, z);
    gallery.add(panel);
  };
  const wall = (name, width, depth, x, z) => addBox(name,
    new THREE.Vector3(width, 4.2, depth), new THREE.Vector3(x, 2.1, z),
    materials.wall, true, gallery, 1);
  // Props are waist-to-shoulder height: they break line of sight and block
  // movement, which is what makes the west route worth its extra distance.
  const prop = (name, width, height, depth, x, z) => addBox(name,
    new THREE.Vector3(width, height, depth), new THREE.Vector3(x, height / 2, z),
    materials.stone, true, gallery, 1);

  // -- Atrium -> galleries. Two doorways, four metres each, and no central
  // opening, so the first decision the player makes is which route to take.
  wall('atrium-wall-corner', 1, 0.4, -16.5, 14);
  wall('atrium-wall-west', 6, 0.4, -9, 14);
  wall('atrium-wall-mid', 12, 0.4, 0, 14);
  wall('atrium-wall-east', 7, 0.4, 13.5, 14);
  label('CONSERVATION', -14, 3.2, 13.78, 3.4);
  label('TRANSIT', 8, 3.2, 13.78, 2.4);

  // -- West divider. The gap at z 2..6 lets a quiet player cut into the hall
  // late, after the worst of the marble is behind them.
  wall('west-divider-north', 0.4, 8, -6, 10);
  wall('west-divider-south', 0.4, 6, -6, -1);

  // -- East divider, offset from the west one so the two wings never mirror.
  wall('east-divider-north', 0.4, 6, 6, 11);
  wall('east-divider-south', 0.4, 8, 6, 0);

  // -- Conservation wing. Two staggered partitions force the route to cross
  // the wing twice, which is what buys the east corridor its speed advantage:
  // the gap at z = 8 is on the east side, the gap at z = 1 on the west.
  wall('conservation-partition-north', 6, 0.4, -14, 8);
  wall('conservation-partition-south', 6, 0.4, -9, 1);
  prop('bench-long', 5, 1.2, 1, -10.5, 11);
  prop('bench-return', 1, 1.2, 4, -9.5, 5.5);
  prop('crate-stack', 2.2, 1.8, 2.2, -15, 4);
  prop('crate-low', 2, 1.5, 2, -10.5, 3.5);
  prop('shelf-west', 2.5, 2.3, 4, -15.5, -2);
  label('CONSERVATION 02', -16.7, 2.6, 11, 3.2);

  // -- Transit corridor: deliberately bare. It is the fast way north and it
  // offers almost nothing to hide behind.
  wall('transit-pillar-north', 1.2, 1.2, 15.2, 10);
  wall('transit-pillar-south', 1.2, 1.2, 15.2, 2);
  label('TRANSIT 01', 16.7, 2.6, 6, 2.8);

  // -- Central hall. The display island is off-centre on purpose: it is the
  // only landmark that tells you which half of the hall you are standing in.
  prop('display-island', 3.5, 1.6, 3.5, -2, 6);
  label('HALL', 0, 3.3, 13.78, 1.8);

  // -- Cross wall at z = -8 with two openings, one per wing.
  wall('cross-wall-west', 9, 0.4, -12.5, -8);
  wall('cross-wall-mid', 5, 0.4, 0, -8);
  wall('cross-wall-east', 9, 0.4, 12.5, -8);

  // -- North hall. The spine splits the deep-store door from the office
  // approach, so the key and the exit are never visible from one spot.
  wall('north-spine', 0.4, 9, 4, -15.5);

  // -- Archive stacks fill the north-west with parallel aisles. Running one
  // aisle while the patrol walks the next is the level's best moment.
  for (const z of [-19, -16, -13]) {
    prop('stack-row', 7, 2.3, 0.5, -11, z);
  }
  label('STACKS 04-09', -16.7, 2.6, -15, 3.4);

  // -- Security office. Geometry here is unchanged: a wide south doorway
  // allows both a quiet approach and a retreat.
  wall('security-west', 0.38, 5, 8.5, -19.5);
  wall('security-north', 8, 0.38, 12.5, -22);
  wall('security-front-left', 2.5, 0.38, 9.75, -17);
  wall('security-front-right', 2.5, 0.38, 15.25, -17);
  // Fixed panels sit just outside their wall faces and fit within the solid
  // surface. They stay aligned to the museum instead of turning into walls.
  label('SECURITY', 9.75, 3.2, -16.79, 2.1);
  // The desk is below the interaction ray; keep its footprint out of the
  // key's access segment so the shared XZ query does not block valid pickup.
  addBox('security-desk', new THREE.Vector3(2.8, 1.05, 0.8),
    new THREE.Vector3(12.5, 0.525, -21), materials.stone, true, gallery, 1);

  // NOTE: the keycard must stay the only THREE.Group parented to `gallery`.
  // tests/galleries.test.js finds it with `children.find(child => child.isGroup)`.
  const keycard = new THREE.Group();
  const cardMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd76a, emissive: 0xffc04a, emissiveIntensity: 0.9,
    roughness: 0.35, metalness: 0.45
  });
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.46, 0.065), cardMaterial);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.075, 0.075),
    new THREE.MeshBasicMaterial({ color: 0x132330 }));
  stripe.position.y = 0.08;
  keycard.add(card, stripe);
  keycard.position.copy(keyPosition);
  gallery.add(keycard);
  label('STAFF KEY', 12.5, 2.35, -21.79, 2.8);

  wall('vault-door', 3.2, 0.4, 0, -21.7);
  const doorMaterial = new THREE.MeshBasicMaterial({ color: 0xffa43b });
  const reader = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.12), doorMaterial);
  reader.position.set(1.3, 1.5, -21.42);
  gallery.add(reader);
  label('DEEP STORE // E + KEY', 0, 3.2, -21.48, 3.6);

  return {
    keyPosition,
    entrancePosition,
    setStage(stage, hasKey) {
      keycard.visible = stage === 1 && !hasKey && !guardCarriesKey;
      doorMaterial.color.setHex(hasKey ? 0x72efff : 0xffa43b);
    },
    setGuardCarriesKey(enabled = true) {
      guardCarriesKey = enabled;
      if (enabled) keycard.visible = false;
    },
    update(elapsed) {
      keycard.rotation.y = Math.sin(elapsed * 0.9) * 0.3;
      keycard.position.y = keyPosition.y + Math.sin(elapsed * 1.4) * 0.06;
    }
  };
}
