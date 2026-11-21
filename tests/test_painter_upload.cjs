// Run after the website build. Simulates a file picker and drag-and-drop.
const assert = require('assert'), fs = require('fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const dom = new JSDOM(fs.readFileSync('website/public/paint/index.html','utf8'), {url:'https://example.com/paint/',runScripts:'outside-only'});
const w=dom.window; let selected=0, loaded=[];
const ctx = new Proxy({getImageData(){return {data:new Uint8ClampedArray(64*64*4)}},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},measureText(){return {width:0}}},{get(obj,k){return k in obj?obj[k]:(()=>{})}});
w.HTMLCanvasElement.prototype.getContext=()=>ctx; w.HTMLCanvasElement.prototype.toDataURL=()=>'';
w.requestAnimationFrame=()=>1; w.cancelAnimationFrame=()=>{};
w.Image=class {set src(v){this._src=v}};
w.FileReader=class {readAsDataURL(f){loaded.push(f.name); this.result='data:image/png;base64,AA=='; if(this.onload)this.onload()}};
w.eval(fs.readFileSync('website/paint.js','utf8'));
const button=w.document.getElementById('pfile-top'), input=w.document.getElementById('pfile'); input.click=()=>selected++; button.click(); assert.equal(selected,1,'opens picker');
function drag(type,files){let e=new w.Event(type,{bubbles:true,cancelable:true}); Object.defineProperty(e,'dataTransfer',{value:{files,dropEffect:'none'}}); button.dispatchEvent(e);return e;}
assert(drag('dragover',[]).defaultPrevented); assert(button.classList.contains('over'));
assert(drag('drop',[{name:'skin.png',type:'image/png'}]).defaultPrevented); assert.deepEqual(loaded,['skin.png']); assert(!button.classList.contains('over'));
drag('drop',[{name:'wrong.jpg',type:'image/jpeg'}]); assert.deepEqual(loaded,['skin.png']); assert.match(w.document.getElementById('pmsg').textContent,/PNG/);
drag('dragover',[]);drag('dragleave',[]);assert(!button.classList.contains('over'));
console.log('Painter upload button opens picker, accepts dropped PNG, rejects wrong files and clears highlight');
