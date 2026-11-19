// Run with: node tests/test_cape.cjs (after npm install in website/).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const JSZip = require('../website/node_modules/jszip');
const elements = {}, downloads = [], objects = [];
function element(id) {
  return elements[id] ||= { id, events: {}, value: '', checked: false, disabled: false,
    classList: { toggle() {} }, addEventListener(type, fn) { this.events[type] = fn; },
    setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 320 }; } };
}
const context = { clearRect(){}, drawImage(){}, fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, strokeRect(){} };
element('cape-canvas').getContext = () => context;
element('cape-grid').checked = true;
element('cape-color').value = '#35c980'; element('cape-tool').value = 'pen';
element('cape-version').value = '97'; element('cape-version').selectedIndex = 0;
element('cape-version').options = [{ getAttribute: () => '26.3' }];
const png = new Blob([new Uint8Array([137,80,78,71,13,10,26,10])], {type:'image/png'});
const document = { getElementById: element, body: { appendChild(){} }, cookie: '',
  createElement(tag) { if (tag === 'canvas') return {getContext:()=>context, toBlob: fn=>fn(png)};
    if (tag === 'a') return {click(){downloads.push({name:this.download, url:this.href});},remove(){}}; throw Error(tag); } };
const sandbox = {document, JSZip, Blob, Image: function(){}, URL: {createObjectURL(o){objects.push(o);return 'blob:'+(objects.length-1);},revokeObjectURL(){}}, setTimeout(){} };
vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'), sandbox);
(async()=>{
  await element('cape-png').events.click();
  assert.equal(downloads[0].name, 'cape.png');
  await element('cape-zip').events.click.call(element('cape-zip'));
  assert.equal(downloads[1].name, 'elytra-pack-mc26.3.zip');
  let data = await objects[1].arrayBuffer(); const zip = await JSZip.loadAsync(data);
  const meta = JSON.parse(await zip.file('pack.mcmeta').async('string'));
  assert.equal(meta.pack.pack_format,97); assert.equal(meta.pack.min_format,97);
  for (const path of ['assets/minecraft/textures/entity/elytra.png','assets/minecraft/textures/entity/equipment/wings/elytra.png'])
    assert.deepEqual(Array.from(await zip.file(path).async('uint8array')),Array.from(new Uint8Array(await png.arrayBuffer())));
  assert(!element('cape-zip').disabled);
  assert(element('cape-status').textContent.includes('does not add a wearable cape'));
  console.log('Cape PNG and version-specific elytra ZIP downloads passed');
})().catch(e=>{console.error(e);process.exitCode=1});
