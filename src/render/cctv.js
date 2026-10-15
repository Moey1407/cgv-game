import * as THREE from 'three';

const crtVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const crtFragment = `
uniform sampler2D tFeed;
uniform float uTime;
uniform float uLooped;
uniform float uSwitch;
uniform float uTint;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 c = vUv - 0.5;
  vec2 uv = 0.5 + c * (1.0 + dot(c, c) * 0.18);
  float roll = step(0.985, hash(vec2(floor(uTime * 3.0), 1.0))) * 0.02;
  uv.y = fract(uv.y + roll + uSwitch * hash(vec2(uTime, 4.0)) * 0.3);
  float line = floor(uv.y * 240.0);
  uv.x += (hash(vec2(line, floor(uTime * 24.0))) - 0.5) * 0.004 * (1.0 + uLooped * 4.0);
  vec3 col = texture2D(tFeed, uv).rgb;
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  vec3 mono = vec3(0.55, 1.0, 0.82) * pow(lum, 0.8) * 1.35;
  col = mix(col, mono, uTint);
  col *= 0.82 + 0.18 * sin(vUv.y * 900.0);
  col += (hash(vUv * 700.0 + uTime) - 0.5) * (0.035 + uSwitch * 0.8);
  col = mix(col, vec3(hash(vUv * 300.0 + uTime)), uSwitch * 0.7);
  col *= smoothstep(0.75, 0.25, length(c));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  col = mix(col, col * vec3(1.15, 0.85, 0.5), uLooped * 0.5);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createCCTV(renderer, scene, cameras, { feedWidth = 480, feedHeight = 270, aspect = 16 / 9, rate = 10 } = {}) {
  const feeds = cameras.map((config, index) => {
    const camera = new THREE.PerspectiveCamera(config.fov ?? 70, aspect, 0.1, 80);
    camera.position.copy(config.position);
    camera.lookAt(config.target);
    // CCTV is deliberately stylised and does not need an HDR target. Eight-bit
    // targets halve its memory bandwidth on integrated laptop GPUs.
    const target = new THREE.WebGLRenderTarget(feedWidth, feedHeight, { type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    return {
      index,
      name: config.name,
      camera,
      target,
      base: camera.quaternion.clone(),
      sweep: config.sweep ?? 0,
      loopTimer: 0,
      age: Infinity,
      fresh: false
    };
  });

  const uniforms = {
    tFeed: { value: null },
    uTime: { value: 0 },
    uLooped: { value: 0 },
    uSwitch: { value: 0 },
    uTint: { value: 1 }
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader: crtVertex, fragmentShader: crtFragment, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  const screen = new THREE.Scene();
  screen.add(quad);
  const screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let feedRate = rate;
  const yaw = new THREE.Quaternion();
  const worldUp = new THREE.Vector3(0, 1, 0);
  let active = -1;
  let lastViewed = 0;
  let switching = 0;
  let time = 0;

  function enter(index = lastViewed) {
    active = ((index % feeds.length) + feeds.length) % feeds.length;
    lastViewed = active;
    switching = 1;
  }

  function exit() {
    active = -1;
  }

  function next(step = 1) {
    enter((active < 0 ? lastViewed : active) + step);
  }

  function loop(index = active, seconds = 8) {
    const feed = feeds[index];
    if (!feed || feed.loopTimer > 0) return false;
    feed.loopTimer = seconds;
    return true;
  }

  function refresh(interval = 0.25) {
    for (const feed of feeds) renderFeed(feed, interval);
  }

  function isLooped(index) {
    return (feeds[index]?.loopTimer ?? 0) > 0;
  }

  function renderFeed(feed, interval = 0) {
    if (feed.loopTimer > 0 && feed.fresh) return;
    if (feed.age < interval) return;
    feed.age = 0;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(feed.target);
    renderer.render(scene, feed.camera);
    renderer.setRenderTarget(prev);
    feed.fresh = true;
  }

  function update(dt) {
    time += dt;
    switching = Math.max(0, switching - dt * 3.5);
    for (const feed of feeds) {
      feed.loopTimer = Math.max(0, feed.loopTimer - dt);
      feed.age += dt;
      if (feed.sweep && feed.loopTimer <= 0) {
        yaw.setFromAxisAngle(worldUp, Math.sin(time * 0.35 + feed.index) * feed.sweep);
        feed.camera.quaternion.multiplyQuaternions(yaw, feed.base);
      }
    }
  }

  function drawFeed(feed, viewport) {
    uniforms.tFeed.value = feed.target.texture;
    uniforms.uTime.value = time;
    uniforms.uLooped.value = feed.loopTimer > 0 ? 1 : 0;
    uniforms.uSwitch.value = viewport ? 0 : switching;
    const size = renderer.getSize(new THREE.Vector2());
    renderer.setRenderTarget(null);
    if (viewport) {
      renderer.setScissorTest(true);
      renderer.setViewport(viewport.x, size.y - viewport.y - viewport.h, viewport.w, viewport.h);
      renderer.setScissor(viewport.x, size.y - viewport.y - viewport.h, viewport.w, viewport.h);
    }
    const auto = renderer.autoClear;
    renderer.autoClear = !viewport;
    renderer.render(screen, screenCamera);
    renderer.autoClear = auto;
    if (viewport) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, size.x, size.y);
    }
  }

  function render() {
    if (active < 0) return false;
    const feed = feeds[active];
    renderFeed(feed);
    drawFeed(feed);
    return true;
  }

  function renderGrid(viewports) {
    if (active < 0) return false;
    const size = renderer.getSize(new THREE.Vector2());
    renderer.setRenderTarget(null);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.clear(true, true, true);
    for (let index = 0; index < feeds.length; index += 1) {
      const viewport = viewports[index];
      if (!viewport) continue;
      const feed = feeds[index];
      const aspect = viewport.w / Math.max(1, viewport.h);
      if (Math.abs(feed.camera.aspect - aspect) > 0.001) {
        feed.camera.aspect = aspect;
        feed.camera.updateProjectionMatrix();
      }
      renderFeed(feed, 1 / feedRate);
      drawFeed(feed, viewport);
    }
    return true;
  }

  function renderPip(viewport) {
    const feed = feeds[lastViewed];
    if (!feed || active >= 0) return;
    renderFeed(feed, 1 / feedRate);
    drawFeed(feed, viewport);
  }

  function canSee(index, point, maxDistance = 18) {
    const feed = feeds[index];
    if (!feed || feed.loopTimer > 0) return false;
    const cam = feed.camera;
    const projected = point.clone().project(cam);
    if (projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return false;
    return cam.position.distanceTo(point) <= maxDistance;
  }

  function dispose() {
    for (const feed of feeds) feed.target.dispose();
    quad.geometry.dispose();
    quad.material.dispose();
  }

  return {
    feeds,
    enter,
    exit,
    next,
    loop,
    isLooped,
    update,
    render,
    renderGrid,
    renderPip,
    canSee,
    dispose,
    refresh,
    setRate(value) { feedRate = value; },
    setQuality({ rate = feedRate, width = feedWidth, height = feedHeight } = {}) {
      feedRate = rate;
      for (const feed of feeds) {
        feed.target.setSize(width, height);
        feed.age = Infinity;
        feed.fresh = false;
      }
    },
    get active() { return active; },
    get lastViewed() { return lastViewed; }
  };
}
