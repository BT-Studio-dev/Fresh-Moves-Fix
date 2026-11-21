const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
const html=fs.readFileSync('website/public/pfp/index.html','utf8');
assert(fs.readFileSync('website/public/creations/index.html','utf8').includes('href="../pfp/"'));
const dom=new JSDOM(html,{url:'https://example.com/pfp/',runScripts:'outside-only'}), w=dom.window;
const layout=w.document.querySelector('.pfp-page .render-layout');assert(layout.firstElementChild.classList.contains('pfp-workspace'));assert.equal(layout.querySelectorAll('.pfp-control-group').length,6);assert(layout.querySelector('.pfp-control-grid').contains(w.document.getElementById('pfp-download')));
let draws=[],fills=0,clips=0,polygons=0,downloads=0,images=[],revoked=[], fillFilters=[], state=[];
const ctx={filter:'none',createLinearGradient(){return {addColorStop(){}}},getImageData(){return {data:new Uint8ClampedArray(64*64*4).fill(255)}},moveTo(){},lineTo(){},closePath(){},fill(){polygons++},stroke(){},clearRect(){},save(){state.push(this.filter)},restore(){this.filter=state.pop()},beginPath(){},arc(){},clip(){clips++},fillRect(){fills++;fillFilters.push(this.filter)},drawImage(...args){draws.push(args);this.lastImageFilter=this.filter}};
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
assert($('pfp-download').disabled); assert.equal(images[0].url,'../owner-skin.png'); images[0].width=64;images[0].height=64;images[0].onload();assert(!$('pfp-download').disabled);
assert(polygons>0,'3D headshot draws skin polygons'); let first=polygons; const draw3d=w.drawPfp3d; let opts; w.drawPfp3d=(ctx,skin,o)=>{opts=o;draw3d(ctx,skin,o)}; w.document.querySelector('[data-pfp-preset=wave]').click();assert.equal($('pfp-preset').value,'wave');assert.equal(opts.angles.ra,-135,'wave arm raises outward');assert.equal(w.document.querySelector('[data-pfp-preset=wave]').getAttribute('aria-pressed'),'true');assert(polygons>first); $('pfp-model').value='slim';change('pfp-model');$('pfp-yaw').value='-45';change('pfp-yaw');$('pfp-preset').value='flat';draws=[];change('pfp-preset');assert.deepEqual(draws.map(x=>x.slice(1,5)),[[8,8,8,8],[40,8,8,8]]);
$('pfp-background').value='transparent';$('pfp-shape').value='circle';$('pfp-outer').checked=false;draws=[];let f=fills,c=clips;change('pfp-shape');assert.equal(fills,f);assert.equal(clips,c+1);assert.equal(draws.length,1);
$('pfp-size').value='50';change('pfp-size');assert.equal(draws.at(-1)[7],256);
// Sky presets paint a background and celestial body; flat transparency still works.
let startFills=fills;w.document.querySelector('[data-pfp-target="pfp-background"][data-value="day"]').click();assert.equal($('pfp-background').value,'day');assert(fills>=startFills+2);
assert(!$('pfp-blur').checked);$('pfp-blur').checked=true;fillFilters=[];change('pfp-blur');assert(fillFilters.includes('blur(8px)'),'sky details are blurred');assert.equal(ctx.filter,'none','avatar is not blurred');$('pfp-blur').checked=false;change('pfp-blur');
startFills=fills;w.document.querySelector('[data-pfp-target="pfp-background"][data-value="night"]').click();assert.equal($('pfp-background').value,'night');assert(fills>=startFills+4);
w.document.querySelector('[data-pfp-preset="headshot"]').click();$('pfp-head-yaw').value='30';change('pfp-head-yaw');$('pfp-head-pitch').value='-25';change('pfp-head-pitch');assert.equal(opts.headYaw,30);assert.equal(opts.headPitch,-25);
// Pointer interaction updates camera/head sliders; wheel adjusts zoom.
const canvas=$('pfp-canvas'); function pointer(type,button,x,y,id=9){const e=new w.MouseEvent(type,{button,clientX:x,clientY:y,bubbles:true,cancelable:true});Object.defineProperty(e,'pointerId',{value:id});canvas.dispatchEvent(e);return e;}
let oldYaw=+$('pfp-yaw').value;pointer('pointerdown',0,10,10);pointer('pointermove',0,50,30);pointer('pointerup',0,50,30);assert.equal(+$('pfp-yaw').value,oldYaw+20);assert.equal(opts.yaw,oldYaw+20);
let oldHead=+$('pfp-head-yaw').value;pointer('pointerdown',2,10,10);pointer('pointermove',2,30,20);pointer('pointerup',2,30,20);assert.equal(+$('pfp-head-yaw').value,oldHead+10);assert.equal(opts.headYaw,oldHead+10);
const wheel=new w.WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true});let oldZoom=+$('pfp-size').value;canvas.dispatchEvent(wheel);assert(wheel.defaultPrevented);assert.equal(+$('pfp-size').value,oldZoom+5);
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
// Background upload is local, center-cropped, selectable again, and rejects invalid files.
const bgInput=$('pfp-bg-upload');function bgUpload(file){Object.defineProperty(bgInput,'files',{value:[file],configurable:true});change('pfp-bg-upload');}
assert(!$('pfp-bg-image-button'));bgUpload({name:'bg.jpg',type:'image/jpeg',size:100});const bg=images.at(-1);bg.width=800;bg.height=400;draws=[];bg.onload();assert.equal($('pfp-background').value,'image');assert(draws.some(x=>x[0]===bg && x.slice(1).join(',')==='200,0,400,400,0,0,512,512'));assert.equal(revoked.length,5);
$('pfp-blur').checked=true;draws=[];change('pfp-blur');assert(draws.some(x=>x[0]===bg && x.slice(5).join(',')==='-24,-24,560,560'),'blurred background extends beyond edge');assert.equal(ctx.lastImageFilter,'blur(8px)');assert.equal(ctx.filter,'none','background blur does not affect the avatar');$('pfp-blur').checked=false;change('pfp-blur');
w.document.querySelector('[data-pfp-target="pfp-background"][data-value="color"]').click();bgUpload({name:'bg.jpg',type:'image/jpeg',size:100});const bg2=images.at(-1);bg2.width=400;bg2.height=400;bg2.onload();assert.equal($('pfp-background').value,'image');
bgUpload({name:'bad.txt',type:'text/plain',size:10});assert.match($('pfp-bg-status').textContent,/Choose a PNG/);assert.equal($('pfp-background').value,'image');
console.log('PFP face, layer, transparency, circle, download, background upload and validation passed');
