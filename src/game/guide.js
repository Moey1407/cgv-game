import * as THREE from 'three';

function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.18, 'rgba(160,250,255,0.55)');
  grad.addColorStop(0.55, 'rgba(114,239,255,0.12)');
  grad.addColorStop(1, 'rgba(114,239,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGuide({ scene, camera, doc = document }) {
  const el = doc.createElement('div');
  el.className = 'guide-marker is-hidden';
  el.innerHTML = '<i class="guide-diamond"></i><span class="guide-label"></span><b class="guide-distance"></b>';
  doc.body.appendChild(el);
  const label = el.querySelector('.guide-label');
  const distance = el.querySelector('.guide-distance');
  const diamond = el.querySelector('.guide-diamond');

  const texture = haloTexture();
  const makeHalo = (colour) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: colour, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sprite.visible = false;
    sprite.renderOrder = 5;
    scene.add(sprite);
    return sprite;
  };
  const halo = makeHalo(0x9ff8ff);
  const extra = makeHalo(0xffe2a0);

  const projected = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  const forward = new THREE.Vector3();
  let target = null;
  let side = null;
  let time = 0;
  const cache = {};
  const setText = (node, key, value) => { if (cache[key] !== value) { cache[key] = value; node.textContent = value; } };

  function set(next) {
    target = next;
  }

  function setExtra(next) {
    side = next;
  }

  function placeHalo(sprite, spec, player, range, size) {
    if (!spec?.glow) { sprite.visible = false; return; }
    const d = spec.pos.distanceTo(player);
    sprite.visible = d < range;
    if (!sprite.visible) return;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    sprite.position.copy(spec.pos);
    sprite.scale.setScalar(size * pulse);
    sprite.material.opacity = Math.min(1, (range - d) / 2) * 0.9;
  }

  function update(dt, player, { hidden = false, width = innerWidth, height = innerHeight } = {}) {
    time += dt;
    placeHalo(halo, hidden ? null : target, player, 9, 0.9);
    placeHalo(extra, hidden ? null : side, player, 6, 0.65);
    if (hidden || !target) { el.classList.add('is-hidden'); return; }
    el.classList.remove('is-hidden');
    const meters = target.pos.distanceTo(player);
    setText(label, 'label', target.label);
    const level = target.pos.y - player.y;
    setText(distance, 'distance', (level > 5 ? '▲ ' : level < -5 ? '▼ ' : '') + Math.round(meters) + ' m');
    el.classList.toggle('near', meters < 3);
    projected.copy(target.pos).project(camera);
    camera.getWorldDirection(forward);
    toTarget.copy(target.pos).sub(camera.position);
    const behind = toTarget.dot(forward) < 0;
    let x = projected.x;
    let y = projected.y;
    if (behind) { x = -x; y = -y; }
    const margin = 0.88;
    const off = behind || Math.abs(x) > margin || Math.abs(y) > margin;
    if (off) {
      const k = margin / Math.max(Math.abs(x), Math.abs(y), 1e-3);
      x *= k;
      y *= k;
    }
    el.classList.toggle('edge', off);
    diamond.style.transform = off ? 'rotate(' + (Math.atan2(-y, x) * 180 / Math.PI - 45) + 'deg)' : 'rotate(45deg)';
    el.style.transform = 'translate(' + Math.round((x * 0.5 + 0.5) * width) + 'px,' + Math.round((-y * 0.5 + 0.5) * height) + 'px)';
  }

  function dispose() {
    el.remove();
    for (const s of [halo, extra]) { scene.remove(s); s.material.dispose(); }
    texture.dispose();
  }

  return { set, setExtra, update, dispose, get target() { return target; } };
}
