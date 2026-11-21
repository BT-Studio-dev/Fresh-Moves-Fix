// Locally bundled three.js preview. The editor owns the source canvas and calls update on changes.
import * as THREE from 'three';

export const CAPE_UVS = {
  outside: [1, 1, 10, 16], inside: [12, 1, 10, 16],
  top: [1, 0, 10, 1], bottom: [11, 0, 10, 1],
  left: [0, 1, 1, 16], right: [11, 1, 1, 16],
};

// PlaneGeometry has vertices in top-left, top-right, bottom-left, bottom-right order.
export function mapUV(geometry, rect) {
  const [x, y, w, h] = rect;
  const uv = geometry.attributes.uv;
  uv.setXY(0, x / 64, 1 - y / 32);
  uv.setXY(1, (x + w) / 64, 1 - y / 32);
  uv.setXY(2, x / 64, 1 - (y + h) / 32);
  uv.setXY(3, (x + w) / 64, 1 - (y + h) / 32);
  uv.needsUpdate = true;
}

export function createCapePreview(source) {
  const host = document.getElementById('cape-preview-view');
  const error = document.getElementById('cape-preview-error');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch (e) {
    error.hidden = false;
    error.textContent = '3D preview needs WebGL. The 2D editor and downloads still work.';
    return { update() {}, dispose() {} };
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const root = new THREE.Group(); scene.add(root);
  const texture = new THREE.CanvasTexture(source);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide, alphaTest: 0.01 });
  const geometries = [];
  function face(name, w, h, position, rotation) {
    const g = new THREE.PlaneGeometry(w, h); mapUV(g, CAPE_UVS[name]); geometries.push(g);
    const mesh = new THREE.Mesh(g, material); mesh.position.set(...position); mesh.rotation.set(...rotation); root.add(mesh);
  }
  face('outside', 10, 16, [0, 0, .5], [0, 0, 0]);
  face('inside', 10, 16, [0, 0, -.5], [0, Math.PI, 0]);
  face('top', 10, 1, [0, 8, 0], [-Math.PI / 2, 0, 0]);
  face('bottom', 10, 1, [0, -8, 0], [Math.PI / 2, 0, 0]);
  face('left', 1, 16, [-5, 0, 0], [0, -Math.PI / 2, 0]);
  face('right', 1, 16, [5, 0, 0], [0, Math.PI / 2, 0]);
  // A faint neutral backing makes fully transparent pixels and an empty cape visible.
  const backingGeometry = new THREE.BoxGeometry(10, 16, .95);
  const backingMaterial = new THREE.MeshBasicMaterial({ color: 0x43504b, transparent: true, opacity: .28, depthWrite: false });
  root.add(new THREE.Mesh(backingGeometry, backingMaterial));
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const side = document.getElementById('cape-preview-side');
  const auto = document.getElementById('cape-preview-auto');
  const reset = document.getElementById('cape-preview-reset');
  let yaw = -0.2, pitch = 0.1, distance = 36, frame = 0, lastTime = 0, disposed = false;
  const pointers = new Map(); let pinchDistance = 0;
  function render(time) {
    frame = 0;
    if (disposed) return;
    const width = host.clientWidth || 320, height = host.clientHeight || 280;
    if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    if (auto.checked && lastTime) yaw += Math.min(time - lastTime, 50) * .0003;
    lastTime = auto.checked ? time : 0;
    root.rotation.set(pitch, yaw + (side.value === 'inside' ? Math.PI : 0), 0, 'YXZ');
    camera.position.set(0, 0, distance); camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    if (auto.checked && !document.hidden) schedule();
  }
  function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function update() { texture.needsUpdate = true; schedule(); }
  function resetView() { yaw = -0.2; pitch = 0.1; distance = 36; schedule(); }
  function onSide() { resetView(); }
  function onAuto() { lastTime = 0; schedule(); }
  function onVisibility() { lastTime = 0; if (!document.hidden) schedule(); }
  function onWheel(e) { e.preventDefault(); distance = Math.max(20, Math.min(80, distance * Math.exp(e.deltaY * .001))); schedule(); }
  function onDown(e) { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); renderer.domElement.setPointerCapture(e.pointerId); pinchDistance = 0; }
  function onMove(e) {
    const old = pointers.get(e.pointerId); if (!old) return;
    const dx = e.clientX - old.x, dy = e.clientY - old.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { yaw += dx * .01; pitch = Math.max(-1.4, Math.min(1.4, pitch + dy * .01)); }
    else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values()), d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance && d) distance = Math.max(20, Math.min(80, distance * pinchDistance / d));
      pinchDistance = d;
    }
    schedule();
  }
  function onUp(e) { pointers.delete(e.pointerId); pinchDistance = 0; }
  const el = renderer.domElement;
  el.setAttribute('aria-label', '3D cape preview. Drag to rotate; scroll or pinch to zoom.');
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  side.addEventListener('change', onSide); auto.addEventListener('change', onAuto); reset.addEventListener('click', resetView);
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', schedule);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  if (observer) observer.observe(host);
  schedule();
  return { update, dispose() {
    disposed = true; if (frame) cancelAnimationFrame(frame);
    if (observer) observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', schedule);
    side.removeEventListener('change', onSide); auto.removeEventListener('change', onAuto); reset.removeEventListener('click', resetView);
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel);
    geometries.forEach(g => g.dispose()); backingGeometry.dispose(); material.dispose(); backingMaterial.dispose(); texture.dispose(); renderer.dispose(); el.remove();
  }};
}
window.FMFCapePreview = { create: createCapePreview };
