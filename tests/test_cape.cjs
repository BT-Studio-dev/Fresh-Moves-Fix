// Run with: node tests/test_cape.cjs (after npm install in website/).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const JSZip = require('../website/node_modules/jszip');
const elements = {}, downloads = [], objects = [];
function element(id) {
  return elements[id] ||= { id, events: {}, value: '', checked: false, disabled: false,
    classList: { toggle() {} }, addEventListener(type, fn) { this.events[type] = fn; },
    style: {}, setAttribute() {}, appendChild() {}, setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 320 }; } };
}
let fills = 0, clears = [], filledRects = [];
const context = { clearRect(...args){clears.push(args)}, drawImage(){}, fillRect(...r){fills++; filledRects.push(r)}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, strokeRect(){}, getImageData(){return {data:new Uint8ClampedArray(64*32*4)}}, putImageData(){} };
element('cape-canvas').getContext = () => context;
element('cape-grid').checked = true; element('cape-template').checked = true; element('cape-size').value = '1';
element('cape-name').value = 'My Cape'; element('cape-description').value = 'A starry design';
element('cape-color').value = '#35c980'; element('cape-tool').value = 'pen';
element('cape-version').value = '97'; element('cape-version').selectedIndex = 0;
element('cape-version').options = [{ getAttribute: () => '26.3' }];
const png = new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], {type:'image/png'});
const document = { getElementById: element, querySelectorAll: () => [], body: { appendChild(){} }, cookie: '',
  createElement(tag) { if (tag === 'canvas') return {getContext:()=>context, toBlob: fn=>fn(png), toDataURL: ()=>'data:image/png;base64,iVBORw=='};
    if (tag === 'button') return element('recent-button'); if (tag === 'option') return {}; if (tag === 'a') return {click(){downloads.push({name:this.download, url:this.href});},remove(){}}; throw Error(tag); } };
let previewUpdates = 0, sourceCanvas, disposed = false;
const window = { FMFCapePreview: { create(source) { sourceCanvas = source; return { update() { previewUpdates++; }, dispose() { disposed = true; } }; } } };
const storage = {};
function Image() { this.width=64; this.height=32; Object.defineProperty(this, 'src', {set:()=>this.onload()}); }
const sandbox = {window, document, JSZip, Blob, Image, localStorage: {getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}, URL: {createObjectURL(o){objects.push(o);return 'blob:'+(objects.length-1);},revokeObjectURL(){}}, setTimeout(){} };
vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'), sandbox);
(async()=>{
  assert(sourceCanvas && sourceCanvas !== element('cape-canvas'), 'preview receives the original texture canvas');
  assert(fills > 0, 'starter painted when no projects exist');
  assert(filledRects.some(r => r.join(',') === '24,2,10,20'), 'starter includes the elytra UV area');
  const initial = previewUpdates;
  element('cape-canvas').events.pointerdown({button:0, pointerId:1, clientX:20, clientY:20});
  element('cape-canvas').events.pointerup();
  element('cape-undo').events.click(); element('cape-redo').events.click();
  element('cape-tool').value = 'erase'; element('cape-canvas').events.pointerdown({button:0, pointerId:1, clientX:30, clientY:20}); element('cape-canvas').events.pointerup();
  element('cape-clear').events.click();
  assert(clears.some(r => r.join(',') === '0,0,64,32'), 'clear removes the whole texture');
  assert(previewUpdates >= initial + 5, 'paint, erase, undo, redo and clear refresh preview');
  element('cape-grid').events.change(); element('cape-template').events.change();
  await element('cape-png').events.click();
  assert.equal(downloads[0].name, 'cape.png');
  await element('cape-zip').events.click.call(element('cape-zip'));
  assert.equal(downloads[1].name, 'My-Cape-mc26.3.zip');
  let data = await objects[1].arrayBuffer(); const zip = await JSZip.loadAsync(data);
  const meta = JSON.parse(await zip.file('pack.mcmeta').async('string'));
  assert.equal(meta.pack.pack_format,97); assert.equal(meta.pack.min_format,97); assert.equal(meta.pack.description,'A starry design');
  for (const path of ['assets/minecraft/textures/entity/elytra.png','assets/minecraft/textures/entity/equipment/wings/elytra.png'])
    assert.deepEqual(Array.from(await zip.file(path).async('uint8array')),Array.from(new Uint8Array(await png.arrayBuffer())));
  assert(!element('cape-zip').disabled);
  assert(element('cape-status').textContent.includes('does not add a wearable cape'));
  element('cape-save-project').events.click();
  let projects = JSON.parse(storage['fmf-cape-projects-v1']);
  assert.equal(projects.length,1); assert.equal(projects[0].name,'My Cape'); assert.equal(projects[0].mc,'26.3');
  element('cape-description').value='Changed'; element('cape-save-project').events.click();
  assert.equal(JSON.parse(storage['fmf-cape-projects-v1']).length,1);
  element('cape-name').value='Other'; element('cape-description').value='';
  element('cape-projects').value='My Cape'; element('cape-load-project').events.click();
  assert.equal(element('cape-name').value,'My Cape'); assert.equal(element('cape-description').value,'Changed');
  const beforeImport = previewUpdates;
  element('cape-file').files = [{ type: 'image/png' }]; element('cape-file').events.change.call(element('cape-file'));
  assert(previewUpdates > beforeImport, 'PNG import refreshes preview');
  element('cape-delete-project').events.click(); assert.equal(JSON.parse(storage['fmf-cape-projects-v1']).length,0);
  window.fmfCleanup(); assert(disposed, 'preview disposed on SPA navigation');
  let before = fills; vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'), sandbox);
  assert(fills > before, 'starter appears when there are still no saved projects');
  storage['fmf-cape-projects-v1'] = JSON.stringify([{name:'Existing', image:'data:image/png;base64,iVBORw=='}]);
  before = fills; vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'), sandbox);
  assert.equal(fills, before, 'starter does not replace existing projects');
  storage['fmf-cape-projects-v1'] = '{broken';
  before = fills; vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'), sandbox);
  assert.equal(fills, before, 'starter is not applied when project storage is unreadable');
  console.log('Cape PNG, elytra ZIP and saved-project create/update/load/delete passed');
})().catch(e=>{console.error(e);process.exitCode=1});
