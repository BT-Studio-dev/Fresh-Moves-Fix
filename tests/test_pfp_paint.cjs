const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
const html=fs.readFileSync('website/public/pfp/index.html','utf8');
const dom=new JSDOM(html,{url:'https://example.com/pfp/',runScripts:'outside-only'}),w=dom.window,d=w.document;
let images=[],painted=[];const contexts=new WeakMap();
w.HTMLCanvasElement.prototype.getContext=function(){if(!contexts.has(this)){let node=this;contexts.set(this,{filter:'none',createLinearGradient(){return {addColorStop(){}}},getImageData(){return {data:new Uint8ClampedArray(64*64*4)}},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},clearRect(){},save(){},restore(){},beginPath(){},arc(){},clip(){},fillRect(x,y,width,height){if(node.width===64 && width===1 && height===1) painted.push([x,y,this.fillStyle]);},drawImage(){}});}return contexts.get(this)};
w.Image=class {constructor(){images.push(this)}set src(v){}};w.URL.createObjectURL=()=> 'blob:a';w.URL.revokeObjectURL=()=>{};
w.eval(fs.readFileSync('website/pfp-3d.js','utf8'));w.eval(fs.readFileSync('website/pfp.js','utf8'));
images[0].width=64;images[0].height=64;images[0].onload();
const map=d.getElementById('pfp-paint-map');assert(map.closest('.pfp-map-panel'));assert(!map.closest('.render-controls'));map.getBoundingClientRect=()=>({left:0,top:0,width:512,height:512});
function p(type,x,y,button=0){let e=new w.MouseEvent(type,{clientX:x*8+1,clientY:y*8+1,button,bubbles:true,cancelable:true});Object.defineProperty(e,'pointerId',{value:1});map.dispatchEvent(e);}
p('pointerdown',8,8);p('pointermove',10,8);p('pointerup',10,8);assert.deepEqual(painted.map(a=>a.slice(0,2)),[[8,8],[8,8],[9,8],[10,8]]);assert.equal(painted[0][2],'#3b82c4');
let count=painted.length;p('pointerdown',40,8);p('pointerup',40,8);assert.equal(painted.length,count,'cannot paint overlay with base selected');
d.querySelector('[data-pfp-layer=overlay]').click();d.getElementById('pfp-outer').checked=false;p('pointerdown',40,8,2);p('pointerup',40,8,2);assert.deepEqual(painted.at(-1),[40,8,'#ffffff']);assert(d.getElementById('pfp-outer').checked);
let hex=d.getElementById('pfp-paint-hex');hex.value='#aabbcc';hex.dispatchEvent(new w.Event('input'));assert.equal(d.getElementById('pfp-paint-color').value,'#aabbcc');
assert.match(d.getElementById('pfp-paint-status').textContent,/preview is updated/i);console.log('PFP painting, layer masks, dragging, color and right-click passed');dom.window.close();
