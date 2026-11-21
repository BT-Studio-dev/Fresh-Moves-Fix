// Locally bundled three.js preview. The editor owns the source canvas and calls update on changes.
import * as THREE from 'three';
import { SkinObject, ElytraObject } from 'skinview3d/libs/model.js';
import { loadSkinToCanvas } from 'skinview-utils';

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

// The back of the dummy is at z=-0.6, just in front of the cape's inner face.
export function createDummy() {
  const dummy = new THREE.Group();
  const shades = [0x929995, 0x777f7b, 0x6c7470];
  const materials = shades.map(color => new THREE.MeshBasicMaterial({ color }));
  const geometries = [];
  function part(w, h, d, x, y, z, shade) {
    const geometry = new THREE.BoxGeometry(w, h, d); geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials[shade]); mesh.position.set(x, y, z); dummy.add(mesh);
  }
  part(8, 8, 8, 0, 12, -4.6, 0); // head, top at 16
  part(8, 12, 4, 0, 2, -2.6, 1); // shoulders at cape top, y=8
  part(4, 12, 4, -6, 2, -2.6, 1); part(4, 12, 4, 6, 2, -2.6, 1);
  part(4, 12, 4, -2, -10, -2.6, 2); part(4, 12, 4, 2, -10, -2.6, 2);
  return { group: dummy, dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); } };
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
    return { update() {}, setMode() {}, dispose() {} };
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  const root = new THREE.Group(); scene.add(root);
  const texture = new THREE.CanvasTexture(source);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.FrontSide, alphaTest: 0.01 });
  const geometries = [];
  const capeGroup = new THREE.Group(); root.add(capeGroup);
  function face(name, w, h, position, rotation) {
    const g = new THREE.PlaneGeometry(w, h); mapUV(g, CAPE_UVS[name]); geometries.push(g);
    const mesh = new THREE.Mesh(g, material); mesh.position.set(...position); mesh.rotation.set(...rotation); capeGroup.add(mesh);
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
  capeGroup.add(new THREE.Mesh(backingGeometry, backingMaterial));
  // skinview3d's MIT-licensed geometry implements the Java elytra 64x32 UV layout.
  const elytra = new ElytraObject(); elytra.map = texture;
  elytra.position.set(0, 8, .6); elytra.rotation.y = Math.PI; elytra.visible = false; root.add(elytra);
  host.appendChild(renderer.domElement);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const dummy = createDummy(); root.add(dummy.group);
  const playerSkin = new SkinObject(); playerSkin.position.set(0, 8, -2.6); playerSkin.rotation.y = Math.PI; playerSkin.visible = false; root.add(playerSkin);
  let skinTexture = null, usingSkin = false, mode = 'cape';
  const skinStatus = document.getElementById('cape-skin-status');
  const skinFile = document.getElementById('cape-skin-file');
  const username = document.getElementById('cape-username');
  const loadSkin = document.getElementById('cape-skin-load');
  const resetSkin = document.getElementById('cape-skin-reset');
  const pose = document.getElementById('cape-pose');
  let request = 0;
  function updatePlayer() {
    dummy.group.visible = dummyToggle.checked && !usingSkin;
    playerSkin.visible = dummyToggle.checked && usingSkin;
  }
  function setPose() {
    const flying = mode === 'elytra' && pose.value === 'flying';
    elytra.leftWing.rotation.z = flying ? 1.05 : .2617994;
    elytra.leftWing.rotation.x = flying ? .35 : .2617994;
    elytra.leftWing.rotation.y = flying ? .25 : .01;
    elytra.updateRightWing(); schedule();
  }
  function setMode(nextMode) {
    mode = nextMode; lastTime = 0;
    document.getElementById('cape-preview-title').textContent = mode === 'elytra' ? '3D elytra preview' : '3D cape preview';
    capeGroup.visible = mode !== 'elytra'; elytra.visible = mode === 'elytra';
    document.getElementById('cape-pose-wrap').hidden = mode !== 'elytra';
    document.getElementById('cape-preview-side').parentElement.hidden = mode === 'elytra';
    setPose(); schedule();
  }
  function applySkin(url, revoke) {
    const id = ++request, image = new Image();
    if (!revoke) image.crossOrigin = 'anonymous';
    image.onload = function () {
      if (revoke) URL.revokeObjectURL(url);
      if (disposed || id !== request) return;
      if (image.width !== 64 || (image.height !== 64 && image.height !== 32)) { skinStatus.textContent = 'Use a 64 × 64 or 64 × 32 Minecraft skin PNG.'; return; }
      try {
        const skinCanvas = document.createElement('canvas'); loadSkinToCanvas(skinCanvas, image);
        const next = new THREE.CanvasTexture(skinCanvas); next.magFilter = THREE.NearestFilter; next.minFilter = THREE.NearestFilter; next.generateMipmaps = false; next.colorSpace = THREE.SRGBColorSpace;
        playerSkin.map = next; if (skinTexture) skinTexture.dispose(); skinTexture = next; usingSkin = true; updatePlayer();
        skinStatus.textContent = 'Skin loaded for this preview.'; schedule();
      } catch (e) { skinStatus.textContent = 'Could not read that skin.'; }
    };
    image.onerror = function () { if (revoke) URL.revokeObjectURL(url); if (!disposed && id === request) skinStatus.textContent = 'Could not load the skin. Check the username or try a PNG.'; };
    image.src = url;
  }
  function onSkinFile() { const file = skinFile.files[0]; if (!file) return; if (file.type !== 'image/png') { skinStatus.textContent = 'Choose a PNG skin.'; return; } applySkin(URL.createObjectURL(file), true); skinFile.value = ''; }
  function onSkinLoad() { const name = username.value.trim(); if (!/^[A-Za-z0-9_]{1,16}$/.test(name)) { skinStatus.textContent = 'Enter a valid Minecraft username.'; return; } skinStatus.textContent = 'Loading skin from mc-heads.net…'; applySkin('https://mc-heads.net/skin/' + encodeURIComponent(name), false); }
  function onSkinReset() { ++request; usingSkin = false; updatePlayer(); skinStatus.textContent = 'Using grey dummy.'; schedule(); }
  skinFile.addEventListener('change', onSkinFile); loadSkin.addEventListener('click', onSkinLoad); resetSkin.addEventListener('click', onSkinReset); pose.addEventListener('change', setPose);
  const dummyToggle = document.getElementById('cape-preview-dummy');
  dummy.group.visible = dummyToggle.checked;
  const side = document.getElementById('cape-preview-side');
  const auto = document.getElementById('cape-preview-auto');
  const reset = document.getElementById('cape-preview-reset');
  let yaw = -0.2, pitch = 0.1, distance = 58, frame = 0, lastTime = 0, disposed = false;
  const pointers = new Map(); let pinchDistance = 0;
  function render(time) {
    frame = 0;
    if (disposed) return;
    const width = host.clientWidth || 320, height = host.clientHeight || 280;
    if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) || renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    if (auto.checked && mode !== '2d' && lastTime) yaw += Math.min(time - lastTime, 50) * .0003;
    lastTime = auto.checked && mode !== '2d' ? time : 0;
    root.rotation.set(pitch, yaw + (mode === 'cape' && side.value === 'inside' ? Math.PI : 0), 0, 'YXZ');
    camera.position.set(0, 0, distance); camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    if (auto.checked && mode !== '2d' && !document.hidden) schedule();
  }
  function schedule() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function update() { texture.needsUpdate = true; schedule(); }
  function resetView() { yaw = -0.2; pitch = 0.1; distance = 58; schedule(); }
  function onSide() { resetView(); }
  function onDummy() { updatePlayer(); schedule(); }
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
  dummyToggle.addEventListener('change', onDummy); side.addEventListener('change', onSide); auto.addEventListener('change', onAuto); reset.addEventListener('click', resetView);
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('resize', schedule);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
  if (observer) observer.observe(host);
  schedule();
  return { update, setMode, dispose() {
    disposed = true; if (frame) cancelAnimationFrame(frame);
    if (observer) observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('resize', schedule);
    dummyToggle.removeEventListener('change', onDummy); side.removeEventListener('change', onSide); auto.removeEventListener('change', onAuto); reset.removeEventListener('click', resetView);
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel);
    ++request;
    skinFile.removeEventListener('change', onSkinFile); loadSkin.removeEventListener('click', onSkinLoad); resetSkin.removeEventListener('click', onSkinReset); pose.removeEventListener('change', setPose);
    [playerSkin, elytra].forEach(object => { const seen = new Set(); object.traverse(child => { if (child.geometry) child.geometry.dispose(); if (child.material) { const list = Array.isArray(child.material) ? child.material : [child.material]; list.forEach(m => { if (!seen.has(m)) { seen.add(m); m.dispose(); } }); } }); });
    if (skinTexture) skinTexture.dispose(); dummy.dispose(); geometries.forEach(g => g.dispose()); backingGeometry.dispose(); material.dispose(); backingMaterial.dispose(); texture.dispose(); renderer.dispose(); el.remove();
  }};
}
window.FMFCapePreview = { create: createCapePreview };
