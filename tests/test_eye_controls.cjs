const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
const dom=new JSDOM(fs.readFileSync('website/public/editor/index.html','utf8'),{url:'https://example.com/editor/',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.HTMLCanvasElement.prototype.getContext=()=>({});w.FMFPlayer={EMOTES:{},MOVES:{},moveOf(){},LOOP:{},buildGltf(){},SoftViewer:function(){}};w.fmfCleanup=()=>{};w.Image=class{set src(v){}};w.eval(fs.readFileSync('website/editor.js','utf8'));
for(const id of ['type','pos','brow']){const s=d.getElementById(id);assert(!s.closest('[hidden]'));assert.equal(s.nextElementSibling.querySelector('.dd-btn').getAttribute('aria-label'),({type:'Eye shape',pos:'Position on the face',brow:'Eyebrows'})[id]);}
assert.equal(d.getElementById('eyes3d').checked,false,'eye simulation starts off so eyes remain visible');assert.equal(d.getElementById('zoom').value,'0.75');d.getElementById('zoom').value='2';d.getElementById('fit3d').click();assert.equal(d.getElementById('zoom').value,'0.75');
const browOptions=[...d.getElementById('brow').nextElementSibling.querySelectorAll('.dd-opt')];assert.equal(browOptions.length,d.getElementById('brow').options.length);assert(browOptions.every(opt=>opt.querySelector('canvas.eye-option-thumb[aria-hidden=true]')), 'each eyebrow choice has a decorative thumbnail');
const clickOption=(id,text)=>{const wrapper=d.getElementById(id).nextElementSibling;wrapper.querySelector('.dd-btn').click();const opt=[...wrapper.querySelectorAll('.dd-opt')].find(x=>x.textContent===text);assert(opt);opt.click()};
clickOption('type','2 wide, 2 tall');assert.equal(d.getElementById('type').value,'2x2');clickOption('pos','Bottom');assert.equal(d.getElementById('pos').value,'bottom');assert(!d.getElementById('lash').disabled);clickOption('brow','Top (row 3 of the face, above the eyes)');assert.equal(d.getElementById('brow').value,'f2');
d.getElementById('eyeboy').click();assert.equal(d.getElementById('type').value,'2x1');assert.equal(d.getElementById('pos').value,'upper');assert(d.getElementById('lash').disabled);assert.equal(d.getElementById('brow').value,'f3');assert.equal(d.getElementById('pupil').value,'#3b82c4');d.getElementById('eyegirl').click();assert.equal(d.getElementById('type').value,'2x2');assert.equal(d.getElementById('pos').value,'bottom');assert(!d.getElementById('lash').disabled);assert(d.getElementById('lash').checked);assert(d.getElementById('custom').checked);assert.equal(d.getElementById('pupil').value,'#7653a6');assert.equal(d.getElementById('white').value,'#ffffff');assert.equal(d.getElementById('lashcol').value,'#32242f');
// The eyebrow marker represents a fixed face row. Do not allow a row that
// coincides with the current eyes, on either face or hat layer.
const eyeType=d.getElementById('type'),pos=d.getElementById('pos'),brow=d.getElementById('brow');
for(const [shape,places] of Object.entries({'2x1':{top:3,upper:4,lower:5,bottom:6},'2x2':{top:2,upper:3,lower:4,bottom:5}})){
 eyeType.value=shape;eyeType.dispatchEvent(new w.Event('change'));
 for(const [place,firstRow] of Object.entries(places)){
  pos.value=place;pos.dispatchEvent(new w.Event('change'));
  for(const layer of ['f','h'])for(let row=2;row<=5;row++){
   const opt=[...brow.options].find(o=>o.value===layer+row);assert.equal(opt.disabled,row>=firstRow,`${shape} ${place}: ${opt.value}`);
   const button=[...brow.nextElementSibling.querySelectorAll('.dd-opt')].find(b=>b.textContent===opt.textContent);assert.equal(button.disabled,opt.disabled);
  }
  assert.equal([...brow.options].find(o=>o.value==='villager').disabled,3>=firstRow);
 }
}
eyeType.value='2x1';eyeType.dispatchEvent(new w.Event('change'));pos.value='bottom';pos.dispatchEvent(new w.Event('change'));brow.value='f5';brow.dispatchEvent(new w.Event('change'));pos.value='upper';pos.dispatchEvent(new w.Event('change'));assert.equal(brow.value,'keep');assert.match(d.getElementById('brow-fit-note').textContent,/overlaps/);
dom.window.close();console.log('Eye editor dropdowns, dependent positions and presets passed');
