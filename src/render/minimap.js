import * as THREE from 'three';
import { mapWindow, mapPoint, sameMapFloor } from '../gameplay/mapView.js';

export const LAYER_WORLD_ONLY = 1;
export const LAYER_MAP_ONLY = 2;

// Flat, unlit floor plan: no extra museum render, textures or shadow passes.
export function createMinimap(renderer, scene, { rate = 8 } = {}) {
  const host = document.getElementById('map-frame');
  const canvas = document.createElement('canvas'); canvas.className = 'map-plan';
  canvas.setAttribute('aria-label', 'Nearby floor plan; gold diamond marks the current objective');
  host.append(canvas);
  const caption = document.createElement('div'); caption.className = 'map-destination'; host.append(caption);
  const g = canvas.getContext('2d');
  const camera = new THREE.OrthographicCamera();
  const markers = [], position = new THREE.Vector3(), rotation = new THREE.Euler(), quaternion = new THREE.Quaternion();
  let data = { floors: [], walls: [], zones: [] }, follow = { x: 0, y: 0, z: 0 }, objective = null;
  let full = false, age = Infinity, interval = 1 / rate;
  const colours = { marble: '#27383d', carpet: '#344347', steel: '#26363e', concrete: '#2d3a40' };

  function hideFromMap(object) { object.traverse((child) => child.layers.set(LAYER_WORLD_ONLY)); }
  function addMarker(target, colour, scale = 1, offset = 0, kind = 'guard') {
    const marker = { target, colour: '#' + new THREE.Color(colour).getHexString(), offset, kind, mesh: new THREE.Object3D() };
    markers.push(marker); return marker;
  }
  function removeMarker(marker) { const i = markers.indexOf(marker); if (i >= 0) markers.splice(i, 1); }
  function setLevel(next) { data = next; age = Infinity; }
  function setObjective(next) { objective = next; }
  function setView(width, height) { const next = width > 20 || height > 20; if (next !== full) age = Infinity; full = next; }
  function update(next, bounds, dt = 0) { age += dt; if (next) follow = { x: next.x, y: next.y ?? 0, z: next.z }; }

  function render(viewport) {
    const w = Math.round(viewport.w), h = Math.max(40, Math.round(viewport.h) - 31);
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); age = Infinity;
    }
    if (age < interval) return;
    age = 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = '#0c141a'; g.fillRect(0, 0, w, h);
    const view = mapWindow(data.floors, follow, full, w / h);
    const point = (p) => ({ x: w / 2 + (p[0] - view.x) * w / view.width, y: h / 2 + (p[2] - view.z) * h / view.height });
    const rect = (box) => { const p = point(box.pos); g.fillRect(p.x - box.size[0] * w / view.width / 2, p.y - box.size[2] * h / view.height / 2, box.size[0] * w / view.width, box.size[2] * h / view.height); };
    g.save();
    if (!full) { g.beginPath(); g.ellipse(w / 2, h / 2, w * .49, h * .49, 0, 0, Math.PI * 2); g.clip(); }
    for (const f of data.floors) if (sameMapFloor(f.pos[1], follow.y)) {
      g.fillStyle = colours[f.surface] ?? '#2c3c43'; rect(f);
    }
    g.fillStyle = '#91a8ac';
    for (const wall of data.walls) {
      const bottom = wall.pos[1] - wall.size[1] / 2;
      if (bottom <= follow.y + 1.5 && bottom + wall.size[1] > follow.y + .2) rect(wall);
    }
    if (full) {
      g.font = '9px ui-monospace, monospace'; g.textAlign = 'center'; g.fillStyle = '#b2c4c7';
      for (const zone of data.zones ?? []) if (sameMapFloor(zone.min[1], follow.y)) {
        const p = point([(zone.min[0] + zone.max[0]) / 2, 0, (zone.min[2] + zone.max[2]) / 2]);
        const label = zone.id.replaceAll('-', ' ').toUpperCase();
        if ((zone.max[0] - zone.min[0]) * w / view.width > g.measureText(label).width + 4) g.fillText(label, p.x, p.y);
      }
    }
    for (const m of markers) {
      if (!m.mesh.visible || !m.target.visible) continue;
      m.target.getWorldPosition(position);
      if (!sameMapFloor(position.y, follow.y)) continue;
      if (!full && m.kind !== 'player' && Math.hypot(position.x - follow.x, position.z - follow.z) > 5) continue;
      const p = point([position.x, position.y, position.z]);
      m.target.getWorldQuaternion(quaternion); rotation.setFromQuaternion(quaternion, 'YXZ');
      g.save(); g.translate(p.x, p.y); g.rotate(-rotation.y - m.offset + (m.kind === 'player' ? 0 : Math.PI));
      if (m.kind === 'player') {
        g.strokeStyle = '#6fbfc65c'; g.fillStyle = '#6fbfc61f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-13, -24); g.lineTo(13, -24); g.closePath(); g.fill(); g.stroke();
      }
      g.fillStyle = m.colour; g.strokeStyle = '#081018'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(0, 3); g.lineTo(-4, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
    g.restore();
    if (objective) {
      const p = mapPoint(objective.pos, view, w, h, 24);
      g.save(); g.translate(p.x, p.y); g.rotate(Math.PI / 4);
      g.fillStyle = '#e8c46a'; g.strokeStyle = '#0c141a'; g.lineWidth = 2;
      g.fillRect(-4, -4, 8, 8); g.strokeRect(-4, -4, 8, 8); g.restore();
      const dy = objective.pos.y - follow.y;
      const distance = Math.round(Math.hypot(objective.pos.x - follow.x, objective.pos.z - follow.z));
      caption.textContent = `${objective.label} · ${distance} m${dy > 5 ? ' ↑' : dy < -5 ? ' ↓' : ''}`;
    } else caption.textContent = 'No active objective';
    g.fillStyle = '#b5c8cc'; g.font = '10px ui-monospace, monospace'; g.textAlign = 'left'; g.fillText('N ↑', 9, 16);
    g.fillStyle = '#819398'; g.textAlign = 'right'; g.fillText(full ? 'SONAR SCAN' : 'G · SCAN FLOOR', w - 9, 16);
  }

  function dispose() { canvas.remove(); caption.remove(); markers.length = 0; }
  return { camera, hideFromMap, addMarker, removeMarker, update, render, setLevel, setObjective, setView, setRate: (rate) => { interval = 1 / rate; }, dispose };
}
