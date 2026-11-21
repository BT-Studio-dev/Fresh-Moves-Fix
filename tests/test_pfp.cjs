const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
const html=fs.readFileSync('website/public/pfp/index.html','utf8');
assert(fs.readFileSync('website/public/creations/index.html','utf8').includes('href="../pfp/"'));
const dom=new JSDOM(html,{url:'https://example.com/pfp/',runScripts:'outside-only'}), w=dom.window;
let draws=[],fills=0,clips=0,polygons=0,downloads=0,images=[],revoked=[];
const ctx={getImageData(){return {data:new Uint8ClampedArray(64*64*4).fill(255)}},moveTo(){},lineTo(){},closePath(){},fill(){polygons++},stroke(){},clearRect(){},save(){},restore(){},beginPath(){},arc(){},clip(){clips++},fillRect(){fills++},drawImage(...args){draws.push(args)}};
w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLCanvasElement.prototype.toDataURL=()=>{downloads++;return 'data:image/png;base64,AA=='};
w.HTMLAnchorElement.prototype.click=function(){};w.Image=class{constructor(){images.push(this)}set src(v){this.url=v}};
w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=u=>revoked.push(u);
w.eval(fs.readFileSync('website/pfp-3d.js','utf8'));
w.eval(fs.readFileSync('website/pfp.js','utf8'));
const $=id=>w.document.getElementById(id),change=id=>$(id).dispatchEvent(new w.Event('change'));
const style=w.document.createElement('style');style.textContent=fs.readFileSync('website/refresh-2026.css','utf8');w.document.head.appendChild(style);
assert.equal(w.getComputedStyle($('pfp-preset')).display,'none','internal preset dropdown is hidden');
for (const id of ['pfp-model','pfp-background','pfp-shape']) assert.equal(w.getComputedStyle($(id)).display,'none');
for (const [id,value] of [['pfp-model','slim'],['pfp-background','transparent'],['pfp-shape','circle']]) {
 const button=w.document.querySelector('[data-pfp-target="'+id+'"][data-value="'+value+'"]');button.click();assert.equal($(id).value,value);assert.equal(button.getAttribute('aria-pressed'),'true');
 const other=w.document.querySelector('[data-pfp-target="'+id+'"]:not([data-value="'+value+'"])');assert.equal(other.getAttribute('aria-pressed'),'false');other.click();
}
assert($('pfp-download').disabled); images[0].width=64;images[0].height=64;images[0].onload();assert(!$('pfp-download').disabled);
assert(polygons>0,'3D headshot draws skin polygons'); let first=polygons; w.document.querySelector('[data-pfp-preset=wave]').click();assert.equal($('pfp-preset').value,'wave');assert.equal(w.document.querySelector('[data-pfp-preset=wave]').getAttribute('aria-pressed'),'true');assert(polygons>first); $('pfp-model').value='slim';change('pfp-model');$('pfp-yaw').value='-45';change('pfp-yaw');$('pfp-preset').value='flat';draws=[];change('pfp-preset');assert.deepEqual(draws.map(x=>x.slice(1,5)),[[8,8,8,8],[40,8,8,8]]);
$('pfp-background').value='transparent';$('pfp-shape').value='circle';$('pfp-outer').checked=false;draws=[];let f=fills,c=clips;change('pfp-shape');assert.equal(fills,f);assert.equal(clips,c+1);assert.equal(draws.length,1);
$('pfp-size').value='50';change('pfp-size');assert.equal(draws.at(-1)[7],256);
// Quick palette switches on solid color and stays in sync with custom/transparent controls.
const red=w.document.querySelector('[data-pfp-color="#ff5157"]');red.click();assert.equal($('pfp-color').value,'#ff5157');assert.equal($('pfp-background').value,'color');assert.equal(red.getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelector('[data-pfp-target="pfp-background"][data-value="color"]').getAttribute('aria-pressed'),'true');
$('pfp-color').value='#123456';change('pfp-color');assert.equal(red.getAttribute('aria-pressed'),'false');
w.document.querySelector('[data-pfp-target="pfp-background"][data-value="transparent"]').click();assert.equal(red.getAttribute('aria-pressed'),'false');
// 3D control toggles to flat and restores the last chosen 3D preset.
w.document.querySelector('[data-pfp-preset="wave"]').click();$('pfp-quick-3d').click();assert.equal($('pfp-preset').value,'flat');assert.equal($('pfp-quick-3d').getAttribute('aria-pressed'),'false');$('pfp-quick-3d').click();assert.equal($('pfp-preset').value,'wave');assert.equal(w.document.querySelector('[data-pfp-preset="wave"]').getAttribute('aria-pressed'),'true');
$('pfp-download').click();assert.equal(downloads,1);
const input=$('pfp-skin');function upload(name,type){Object.defineProperty(input,'files',{value:[{name,type}],configurable:true});change('pfp-skin');}
upload('skin.png','image/png');images[1].width=64;images[1].height=32;images[1].onload();assert.match($('pfp-status').textContent,/Skin loaded/);assert.equal(revoked.length,1);
upload('bad.png','image/png');images[2].width=50;images[2].height=50;images[2].onload();assert.match($('pfp-status').textContent,/64×64/);
upload('oops.jpg','image/jpeg');assert.match($('pfp-status').textContent,/PNG/);assert.equal(images.length,3);
upload('old.png','image/png');upload('new.png','image/png');images[4].width=64;images[4].height=64;images[4].onload();images[3].width=64;images[3].height=64;images[3].onload();assert.match($('pfp-status').textContent,/Skin loaded/);assert.equal(revoked.length,4);
console.log('PFP face, layer, transparency, circle, download and validation passed');
