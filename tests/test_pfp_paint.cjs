// The PFP keeps its background colour picker but no longer has skin-painting controls.
const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
const html=fs.readFileSync('website/public/pfp/index.html','utf8');
const dom=new JSDOM(html,{url:'https://example.com/pfp/',runScripts:'outside-only'}),w=dom.window,d=w.document;
const ctx={filter:'none',createLinearGradient(){return {addColorStop(){}}},getImageData(){return {data:new Uint8ClampedArray(64*64*4)}},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},clearRect(){},save(){},restore(){},beginPath(){},arc(){},clip(){},fillRect(){},drawImage(){}};
w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.Image=class{set src(v){}};
w.eval(fs.readFileSync('website/ui.js','utf8'));w.eval(fs.readFileSync('website/pfp-3d.js','utf8'));w.eval(fs.readFileSync('website/pfp.js','utf8'));
assert(!d.getElementById('pfp-paint-map'));assert(!d.querySelector('[data-pfp-layer]'));assert(!d.getElementById('pfp-paint-color'));
const bg=d.getElementById('pfp-color'),hex=d.getElementById('pfp-bg-hex');assert(d.querySelector('.pfp-colour-picker .pk-sv'));
hex.value='#ff5157';hex.dispatchEvent(new w.Event('input'));assert.equal(bg.value,'#ff5157');assert.equal(d.getElementById('pfp-code-swatch').style.backgroundColor,'rgb(255, 81, 87)');assert.equal(d.getElementById('pfp-background').value,'color');assert.equal(d.querySelector('[data-pfp-color="#ff5157"]').getAttribute('aria-pressed'),'true');
d.querySelector('[data-pfp-color="#27c96d"]').click();assert.equal(bg.value,'#27c96d');assert.equal(hex.value,'#27c96d');assert.equal(d.getElementById('pfp-code-swatch').style.backgroundColor,'rgb(39, 201, 109)');
// Scene colours use the site's picker rather than the native browser popup.
for(const id of ['pfp-gradient-edge','pfp-light-color','pfp-floor-color']){const input=d.getElementById(id),wrap=input.nextElementSibling;assert(input.classList.contains('vh'));const sw=wrap.querySelector('.sw'),box=wrap.querySelector('.uipick');assert(box.hidden);sw.click();assert(!box.hidden);assert(box.querySelector('.pk-sv'));box.querySelector('.pk-head button').click();assert(box.hidden);}
const floor=d.getElementById('pfp-floor-color'),wrapper=floor.nextElementSibling;wrapper.querySelector('.sw').click();const hexInput=wrapper.querySelector('.pk-hex');hexInput.value='#123456';hexInput.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(floor.value,'#123456');assert(d.getElementById('pfp-floor').checked);wrapper.querySelector('.pk-head button').click();
console.log('PFP painting removed; background picker and palette remain functional');dom.window.close();
