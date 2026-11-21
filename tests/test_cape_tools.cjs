// Pixel-level tests for the cape editor tools, independent of a browser renderer.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const cells = new Uint8ClampedArray(64 * 32 * 4);
let updates = 0;
const ctx = {
  fillStyle: '#000000',
  clearRect(x,y,w,h) { for(let yy=Math.max(y,0);yy<Math.min(y+h,32);yy++) for(let xx=Math.max(x,0);xx<Math.min(x+w,64);xx++) cells.fill(0,(yy*64+xx)*4,(yy*64+xx)*4+4); },
  fillRect(x,y,w,h) { let c=this.fillStyle; if(!/^#[0-9a-f]{6}$/i.test(c))return; let rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)); for(let yy=Math.max(y,0);yy<Math.min(y+h,32);yy++)for(let xx=Math.max(x,0);xx<Math.min(x+w,64);xx++) cells.set([...rgb,255],(yy*64+xx)*4); },
  getImageData(x,y,w,h) { let out=new Uint8ClampedArray(w*h*4); for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)out.set(cells.slice(((y+yy)*64+x+xx)*4,((y+yy)*64+x+xx)*4+4),(yy*w+xx)*4); return {data:out,width:w,height:h}; },
  createImageData(w,h) {return {data:new Uint8ClampedArray(w*h*4),width:w,height:h}},
  putImageData(im,x,y) {for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)cells.set(im.data.slice((yy*im.width+xx)*4,(yy*im.width+xx)*4+4),((y+yy)*64+x+xx)*4)},
  drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}
};
let guideRects = [];
const view={clearRect(){},fillRect(...args){guideRects.push(args)},drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}};
const styleValues = {};
const nodes={}; function el(id) {return nodes[id] ||= {events:{},value:'',checked:false,files:[],style:{setProperty(k,v){styleValues[k]=v}},classList:{toggle(){}}, addEventListener(k,f){this.events[k]=f},setAttribute(){},appendChild(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:640,height:320}}};}
el('cape-canvas').getContext=()=>view; el('cape-template').checked=true; el('cape-color').value='#ff0000'; el('cape-gradient-color').value='#0000ff'; el('cape-size').value='1'; el('cape-tool').value='pen';
const doc={getElementById:el,querySelectorAll(){return []},createElement(tag){if(tag==='canvas')return {getContext:()=>ctx,toDataURL:()=>'',toBlob(){}};return {style:{},setAttribute(){},addEventListener(){}}},body:{appendChild(){}}};
const storage={'fmf-cape-projects-v1':JSON.stringify([{name:'Existing',image:'data:image/png;base64,AA=='}])};
const sandbox={document:doc,window:{FMFCapePreview:{create(){return {update(){updates++},dispose(){}}}}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Uint8Array,Uint8ClampedArray,console};
vm.runInNewContext(fs.readFileSync('website/cape.js','utf8'),sandbox);
assert(guideRects.some(r=>r.join(',')==='240,20,100,200'), 'elytra guide drawn on display');
assert(cells.every(v=>v===0), 'guides do not alter texture pixels');
el('cape-template').checked=false; el('cape-template').events.change.call(el('cape-template')); assert.equal(el('cape-legend').hidden, true);
const ev=(name,x,y)=>el('cape-canvas').events[name]({button:0,pointerId:1,clientX:x*10+1,clientY:y*10+1});
const at=(x,y)=>Array.from(cells.slice((y*64+x)*4,(y*64+x)*4+4));
el('cape-mirror').checked=true; ev('pointerdown',2,2); ev('pointerup',2,2); assert.deepEqual(at(2,2),[255,0,0,255]); assert.deepEqual(at(9,2),[255,0,0,255]);
el('cape-undo').events.click(); assert.deepEqual(at(2,2),[0,0,0,0]); el('cape-redo').events.click(); assert.deepEqual(at(9,2),[255,0,0,255]);
el('cape-tool').value='pick'; el('cape-color').value='#00ff00'; ev('pointerdown',2,2); assert.equal(el('cape-color').value,'#ff0000');
el('cape-mirror').checked=false; el('cape-tool').value='line'; ev('pointerdown',1,4); ev('pointermove',5,4); ev('pointerup',5,4); for(let x=1;x<=5;x++) assert.deepEqual(at(x,4),[255,0,0,255]);
el('cape-clear').events.click(); assert.deepEqual(at(2,2),[0,0,0,0]);
el('cape-tool').value='fill'; el('cape-color').value='#00ff00'; ev('pointerdown',0,0); assert.deepEqual(at(63,31),[0,255,0,255]);
el('cape-tool').value='gradient'; el('cape-color').value='#ff0000'; ev('pointerdown',0,0); ev('pointermove',10,0); ev('pointerup',10,0); assert.deepEqual(at(0,0),[255,0,0,255]); assert.deepEqual(at(10,0),[0,0,255,255]);
el('cape-grid-zoom').value='200'; el('cape-grid-zoom').events.input(); assert.equal(styleValues['--cape-grid-zoom'],'200%');
el('cape-tool').value='pan'; el('cape-grid-viewport').scrollLeft=50; el('cape-grid-viewport').scrollTop=20; ev('pointerdown',2,2); ev('pointermove',1,1); ev('pointerup',1,1); assert.equal(el('cape-grid-viewport').scrollLeft,60); assert.equal(el('cape-grid-viewport').scrollTop,30);
assert(updates>=8); console.log('Fill, eyedropper, symmetry, line, gradient and undo/redo passed');
