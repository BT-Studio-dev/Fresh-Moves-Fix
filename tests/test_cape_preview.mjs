// Run with: node tests/test_cape_preview.mjs
import assert from 'node:assert/strict';
import * as THREE from '../website/node_modules/three/build/three.module.js';
globalThis.window = {};
const { CAPE_UVS, mapUV, createCapePreview, createDummy } = await import('../website/cape-preview.js');
assert.deepEqual(CAPE_UVS, {
  outside: [1,1,10,16], inside: [12,1,10,16], top: [1,0,10,1],
  bottom: [11,0,10,1], left: [0,1,1,16], right: [11,1,1,16],
});
for (const [name, [x,y,w,h]] of Object.entries(CAPE_UVS)) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  mapUV(geometry, [x,y,w,h]);
  const uv = geometry.attributes.uv;
  assert.deepEqual(Array.from(uv.array), [x/64,1-y/32,(x+w)/64,1-y/32,x/64,1-(y+h)/32,(x+w)/64,1-(y+h)/32], name);
  geometry.dispose();
}
const dummy = createDummy();
assert.equal(dummy.group.children.length, 6, 'dummy has head, body, arms and legs');
assert.equal(dummy.group.children[1].position.y + 6, 8, 'cape hangs from shoulders');
assert(dummy.group.children.every(mesh => mesh.position.z < 0), 'dummy is behind the cape');
dummy.dispose();
// WebGL failures must not prevent the rest of the editor from starting.
const error = { hidden: true, textContent: '' };
globalThis.document = { getElementById(id) { return id === 'cape-preview-error' ? error : {}; }, createElementNS() { throw Error('WebGL unavailable'); } };
const preview = createCapePreview({});
assert.equal(error.hidden, false); assert.match(error.textContent, /WebGL/);
preview.update(); preview.dispose();
console.log('Cape UV mapping and WebGL fallback passed');
