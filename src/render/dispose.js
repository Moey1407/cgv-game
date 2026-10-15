const TEXTURE_KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'envMap', 'lightMap', 'clearcoatNormalMap'];

export function disposeMaterial(material, seen = new Set()) {
  if (!material || seen.has(material)) return;
  seen.add(material);
  for (const key of TEXTURE_KEYS) if (material[key]) material[key].dispose();
  if (material.uniforms) for (const u of Object.values(material.uniforms)) if (u.value?.isTexture) u.value.dispose();
  material.dispose();
}

export function disposeObject(root) {
  const seen = new Set();
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const list = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of list) disposeMaterial(m, seen);
    if (child.isInstancedMesh) child.dispose();
  });
  root.removeFromParent();
}

export function rendererStats(renderer) {
  const { memory, render } = renderer.info;
  return { geometries: memory.geometries, textures: memory.textures, calls: render.calls, triangles: render.triangles };
}
