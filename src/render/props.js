import * as THREE from 'three';

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function chandelier(materials, { scale = 1 } = {}) {
  const group = new THREE.Group();
  const chain = mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), materials.gold, { cast: false });
  chain.position.y = 1.4;
  group.add(chain);
  const matrix = new THREE.Matrix4();
  for (const [r, y] of [[1.25, 0], [0.85, 0.42], [0.45, 0.8]]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.035, 8, 48), materials.gold, { cast: false });
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
    const n = Math.round(r * 18);
    const crystals = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.06), materials.crystal, n);
    const drops = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.035), materials.crystal, n * 2);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      crystals.setMatrixAt(i, matrix.makeTranslation(Math.cos(a) * r, y - 0.12, Math.sin(a) * r));
    }
    for (let i = 0; i < n * 2; i += 1) {
      const a = (i / (n * 2)) * Math.PI * 2;
      drops.setMatrixAt(i, matrix.makeTranslation(Math.cos(a) * r * 0.9, y - 0.35 - (i % 3) * 0.1, Math.sin(a) * r * 0.9));
    }
    group.add(crystals, drops);
  }
  group.scale.setScalar(scale);
  return group;
}

export function framedPainting(materials, texture, width, { frame = 0.22 } = {}) {
  const group = new THREE.Group();
  const height = width * texture.image.height / texture.image.width;
  const art = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.65 }), { cast: false });
  art.position.z = 0.07;
  group.add(art);
  const bar = (w, h, x, y) => {
    const m = mesh(new THREE.BoxGeometry(w, h, 0.16), materials.gold);
    m.position.set(x, y, 0.06);
    group.add(m);
  };
  bar(width + frame * 2, frame, 0, height / 2 + frame / 2);
  bar(width + frame * 2, frame, 0, -height / 2 - frame / 2);
  bar(frame, height, -width / 2 - frame / 2, 0);
  bar(frame, height, width / 2 + frame / 2, 0);
  const lamp = mesh(new THREE.CylinderGeometry(0.04, 0.04, width * 0.6, 12), materials.gold, { cast: false });
  lamp.rotation.z = Math.PI / 2;
  lamp.position.set(0, height / 2 + 0.45, 0.35);
  group.add(lamp);
  group.userData.height = height;
  return group;
}

const fluteGeometry = new THREE.LatheGeometry(
  [[0, 0], [0.035, 0], [0.004, 0.01], [0.004, 0.11], [0.022, 0.14], [0.028, 0.24], [0.026, 0.25]].map(([x, y]) => new THREE.Vector2(x, y)), 20
);

export function cocktailTable(materials, { glasses = 3, seed = 0 } = {}) {
  const group = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.42, 0.62, 1.08, 32, 1, true), materials.cloth);
  body.position.y = 0.54;
  const top = mesh(new THREE.CircleGeometry(0.42, 32), materials.cloth, { cast: false });
  top.rotation.x = -Math.PI / 2;
  top.position.y = 1.08;
  group.add(body, top);
  for (let i = 0; i < glasses; i += 1) {
    const a = (i / glasses) * Math.PI * 2 + seed;
    const flute = new THREE.Mesh(fluteGeometry, materials.glass);
    flute.position.set(Math.cos(a) * 0.22, 1.081, Math.sin(a) * 0.22);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.08, 12), materials.champagne);
    liquid.position.set(flute.position.x, 1.261, flute.position.z);
    group.add(flute, liquid);
  }
  return group;
}

export function velvetRope(materials, points) {
  const group = new THREE.Group();
  for (const p of points) {
    const post = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 12), materials.brass);
    post.position.set(p.x, 0.475, p.z);
    const base = mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 20), materials.brass, { cast: false });
    base.position.set(p.x, 0.02, p.z);
    const knob = mesh(new THREE.SphereGeometry(0.06, 16, 12), materials.brass, { cast: false });
    knob.position.set(p.x, 0.97, p.z);
    group.add(post, base, knob);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(a.x, 0.9, a.z),
      new THREE.Vector3((a.x + b.x) / 2, 0.62, (a.z + b.z) / 2),
      new THREE.Vector3(b.x, 0.9, b.z)
    );
    group.add(mesh(new THREE.TubeGeometry(curve, 24, 0.025, 8), materials.velvet, { cast: false }));
  }
  return group;
}

export function column(materials, height) {
  const group = new THREE.Group();
  const shaft = mesh(new THREE.CylinderGeometry(0.42, 0.46, height - 1.1, 24), materials.column);
  shaft.position.y = (height - 1.1) / 2 + 0.5;
  const base = mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), materials.cream);
  base.position.y = 0.25;
  const capital = mesh(new THREE.BoxGeometry(1.1, 0.4, 1.1), materials.gold, { cast: false });
  capital.position.y = height - 0.6;
  group.add(shaft, base, capital);
  return group;
}

export function bannerTexture(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#14100b';
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#c9a14a';
  g.lineWidth = 6;
  g.strokeRect(14, 14, 996, 228);
  g.fillStyle = '#e6c779';
  g.textAlign = 'center';
  g.font = '600 46px Georgia, serif';
  g.fillText(title, 512, 110);
  g.font = 'italic 34px Georgia, serif';
  g.fillText(subtitle, 512, 170);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function soundRingMarker(colour, radius, width = 0.08) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(radius - width, radius, 96),
    new THREE.MeshBasicMaterial({ color: colour, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}
