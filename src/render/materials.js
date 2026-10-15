import * as THREE from 'three';

function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function makeCanvas(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

function toTexture(canvas, repeat, colour = true) {
  const texture = new THREE.CanvasTexture(canvas);
  if (colour) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  return texture;
}

export function heightToNormal(source, strength = 2) {
  const w = source.width;
  const h = source.height;
  const src = source.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const lum = (x, y) => {
    const i = (((y + h) % h) * w + ((x + w) % w)) * 4;
    return (src[i] + src[i + 1] + src[i + 2]) / 765;
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = (-dx / len * 0.5 + 0.5) * 255;
      img.data[i + 1] = (-dy / len * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function drawVeins(ctx, x0, y0, size, rand, colour, count) {
  ctx.strokeStyle = colour;
  for (let v = 0; v < count; v += 1) {
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    let x = x0 + rand() * size;
    let y = y0;
    ctx.moveTo(x, y);
    for (let k = 0; k < 12; k += 1) {
      x += (rand() - 0.5) * size * 0.2;
      y += size / 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function marbleTiles({ light = '#d8cdb9', dark = '#6e5a48', tiles = 4, seed = 7 } = {}) {
  const size = 1024;
  const step = size / tiles;
  const rand = seeded(seed);
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const c = colour.getContext('2d');
  const hctx = height.getContext('2d');
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);
  for (let i = 0; i < tiles; i += 1) {
    for (let j = 0; j < tiles; j += 1) {
      const isDark = (i + j) % 2 === 1;
      c.fillStyle = isDark ? dark : light;
      c.fillRect(i * step, j * step, step, step);
      drawVeins(c, i * step, j * step, step, rand, isDark ? 'rgba(200,170,120,0.35)' : 'rgba(110,95,80,0.35)', 6);
    }
  }
  for (const ctx of [c, hctx]) {
    ctx.strokeStyle = ctx === c ? 'rgba(40,30,20,0.6)' : '#202020';
    ctx.lineWidth = ctx === c ? 3 : 6;
    for (let i = 0; i <= tiles; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }
  }
  return { colour, normal: heightToNormal(height, 3) };
}

export function damask({ base = '#3a0f14', motif = 'rgba(120,40,40,0.35)' } = {}) {
  const size = 512;
  const colour = makeCanvas(size);
  const height = makeCanvas(size);
  const c = colour.getContext('2d');
  const hctx = height.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, size, size);
  hctx.fillStyle = '#404040'; hctx.fillRect(0, 0, size, size);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const cx = x * 128 + (y % 2) * 64 + 32;
      const cy = y * 128 + 64;
      for (const [ctx, fill] of [[c, motif], [hctx, '#a0a0a0']]) {
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.ellipse(cx, cy, 22, 40, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy, 40, 14, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  return { colour, normal: heightToNormal(height, 1.5) };
}

export function brushedSteel({ seed = 3 } = {}) {
  const size = 512;
  const rand = seeded(seed);
  const colour = makeCanvas(size);
  const c = colour.getContext('2d');
  c.fillStyle = '#5b6672'; c.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i += 1) {
    const y = rand() * size;
    c.strokeStyle = `rgba(${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 255 : 0},255,${0.03 + rand() * 0.05})`;
    c.lineWidth = 0.5 + rand();
    c.beginPath(); c.moveTo(0, y); c.lineTo(size, y + (rand() - 0.5) * 4); c.stroke();
  }
  c.strokeStyle = 'rgba(10,14,18,0.8)'; c.lineWidth = 4;
  c.strokeRect(2, 2, size - 4, size - 4);
  return { colour, normal: heightToNormal(colour, 1.2) };
}

export function createMaterials(field, { maxAnisotropy = 8 } = {}) {
  const tex = (canvas, repeat, colour = true) => {
    const t = toTexture(canvas, repeat, colour);
    t.anisotropy = maxAnisotropy;
    return t;
  };
  const marble = marbleTiles();
  const wall = damask();
  const steel = brushedSteel();
  const set = {
    marbleFloor: new THREE.MeshPhysicalMaterial({
      map: tex(marble.colour, [6, 11]), normalMap: tex(marble.normal, [6, 11], false), normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12
    }),
    damaskWall: new THREE.MeshStandardMaterial({
      map: tex(wall.colour, [10, 3]), normalMap: tex(wall.normal, [10, 3], false), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.85
    }),
    cream: new THREE.MeshStandardMaterial({ color: 0xd9ccb4, roughness: 0.55 }),
    column: new THREE.MeshPhysicalMaterial({ color: 0xe8e0d2, roughness: 0.3, clearcoat: 0.6 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.28 }),
    darkGold: new THREE.MeshStandardMaterial({ color: 0x6e5526, metalness: 0.8, roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.22 }),
    velvet: new THREE.MeshStandardMaterial({ color: 0x7a0c18, roughness: 0.8 }),
    carpet: new THREE.MeshStandardMaterial({ color: 0x5a0d14, roughness: 0.95 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0xf2ece1, roughness: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({
      map: tex(steel.colour, [4, 2]), normalMap: tex(steel.normal, [4, 2], false), metalness: 0.85, roughness: 0.38
    }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false }),
    champagne: new THREE.MeshStandardMaterial({ color: 0xf3d27a, emissive: 0x3a2a08, roughness: 0.2, transparent: true, opacity: 0.85 }),
    crystal: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd28a, emissiveIntensity: 1.6, roughness: 0.2 })
  };
  if (field) for (const key of Object.keys(set)) if (!set[key].transparent) field.patch(set[key]);
  return set;
}

export function suit(hex) {
  return (material) => {
    material.color = new THREE.Color(hex);
    material.roughness = 0.55;
    material.metalness = 0.05;
    if (material.emissive) material.emissive.setHex(0x000000);
  };
}
