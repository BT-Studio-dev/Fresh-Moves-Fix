const assert = require('assert'), fs = require('fs'), {JSDOM} = require('../website/node_modules/jsdom');
function setup(query = '', withViewer = false) {
 const dom = new JSDOM(fs.readFileSync('website/public/editor/index.html','utf8'), {url:'https://example.com/editor/'+query, runScripts:'outside-only'}), w=dom.window, d=w.document;
 const states = new WeakMap(); let imageQueue=[], download, exported, clock=1000, tickEye, frames=[];
 if (withViewer) { w.Date.now=()=>clock; w.setInterval=(fn)=>{tickEye=fn;return 1}; w.clearInterval=()=>{}; }
 const fixture = new Uint8ClampedArray(64*64*4); for(let y=8;y<16;y++)for(let x=8;x<16;x++)fixture.set([10,20,30,255],(y*64+x)*4); fixture.set([44,55,66,255],(30*64+50)*4);
 w.ImageData=class {constructor(data,width,height){this.data=data;this.width=width;this.height=height;}};
 w.HTMLCanvasElement.prototype.getContext=function(type){if(type!=='2d') return null;if(!states.has(this)){let state={data:new Uint8ClampedArray(64*64*4)};let ctx={state,clearRect(){},fillRect(){},strokeRect(){},drawImage(obj){if(obj instanceof w.Image) state.data=new Uint8ClampedArray(obj.data);else if(obj instanceof w.HTMLCanvasElement) state.data=new Uint8ClampedArray(obj.getContext('2d').state.data);},createImageData(x,y){return new w.ImageData(new Uint8ClampedArray(x*y*4),x,y)},getImageData(){return new w.ImageData(new Uint8ClampedArray(state.data),64,64)},putImageData(im){state.data=new Uint8ClampedArray(im.data)}};states.set(this,ctx);}return states.get(this)};
 w.HTMLCanvasElement.prototype.toBlob=function(cb){exported=new Uint8ClampedArray(this.getContext('2d').state.data);cb({})};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){download=this.download};
 w.Image=class {constructor(){this.width=64;this.height=64;this.data=fixture;}set src(v){imageQueue.push(this)}};
 w.FileReader=class {readAsDataURL(f){this.result=f.data;f.reader=this}};
 w.FMFPlayer={EMOTES:{},MOVES:{},moveOf(){},LOOP:{},buildGltf(){},SoftViewer:withViewer ? class{constructor(){this.soft=true;}loadSkin(canvas){frames.push(new Uint8ClampedArray(canvas.getContext('2d').state.data));}dispose(){}} : class{constructor(){throw Error('no preview')}}};
 w.confirm=()=>true;w.eval(fs.readFileSync('website/mod-eye-tools.js','utf8'));w.eval(fs.readFileSync('website/eye-detect.js','utf8'));w.eval(fs.readFileSync('website/je-thumbnails.js','utf8'));w.eval(fs.readFileSync('website/just-expressions-editor.js','utf8'));w.eval(fs.readFileSync('website/editor.js','utf8'));
 const finish=()=>{let img=imageQueue.shift();assert(img);img.onload()};
 const switchTo=(mode)=>{let e=d.getElementById('eye-editor-mode');e.value=mode;e.dispatchEvent(new w.Event('change'))};
 const upload=(file)=>{let input=d.getElementById('file');Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new w.Event('change'))};
 return {dom,w,d,fixture,finish,switchTo,upload,getExport:()=>exported,getDownload:()=>download, imageQueue, fireEye:(time)=>{clock=time;tickEye()}, frames};
}
{
 const {dom,w,d,fixture,finish,switchTo,upload,getExport,getDownload}=setup('?mode=mod-tools'); finish();
 assert(!d.getElementById('mod-mode-note').hidden); assert(d.getElementById('fmf-eye-options').hidden); assert(d.getElementById('je-editor').hidden);
 d.getElementById('gl-grid').children[0].click(); d.getElementById('rx-grid').children[0].click();
 d.getElementById('save').click(); assert.equal(getDownload(),'skin.png'); assert.deepEqual(Array.from(getExport()),Array.from(fixture),'mods-only starts with original pixels');
 switchTo('fresh-moves'); assert(!d.getElementById('fmf-unlock-notice').hidden); d.getElementById('save').click(); assert.deepEqual(Array.from(getExport()),Array.from(fixture),'1.x requires explicit unlock');
 switchTo('mod-tools'); const pending={name:'new.png',data:'test'}; upload(pending); pending.reader.onload(); switchTo('fresh-moves'); finish();
 assert(!d.getElementById('fmf-unlock-notice').hidden,'pending mods-only upload remains protected'); d.getElementById('save').click(); assert.deepEqual(Array.from(getExport()),Array.from(fixture));
 switchTo('just-expressions'); assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture));
 const shape=d.getElementById('je-eye-shape'); shape.value='standard'; shape.dispatchEvent(new w.Event('change')); const edited=Array.from(w.JustExpressionsEditor.getSkin());
 switchTo('mod-tools'); d.getElementById('save').click(); assert.deepEqual(Array.from(getExport()),edited,'JE edits survive transfer to mods-only');
 switchTo('fresh-moves'); d.getElementById('save').click(); assert.deepEqual(Array.from(getExport()),edited,'mods-only to 1.x keeps current skin');
 switchTo('just-expressions'); assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),edited,'round trip preserves JE edits');
 dom.window.close();
}
{
 const {dom,w,d,finish,getExport}=setup('?mode=just-expressions'); finish();
 const shape=d.getElementById('je-eye-shape'); shape.value='standard'; shape.dispatchEvent(new w.Event('change'));
 d.getElementById('save').click(); const before=Array.from(getExport());
 d.getElementById('rx-grid').children[0].click(); d.getElementById('gl-grid').children[0].click();
 d.getElementById('save').click(); assert.deepEqual(Array.from(getExport()),before,'mod tools do not modify JE PNG');
 assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),before,'mod tools do not modify JE state');
 dom.window.close();
}
{
 let {dom,w,d,fixture,finish,switchTo,upload,getExport,getDownload,imageQueue}=setup('?mode=just-expressions');finish();
 assert.equal(d.getElementById('je-editor').hidden,false);assert.equal(d.getElementById('top').width,384);assert.match(d.getElementById('eye-pixels-caption').textContent,/Changed pixels/);assert(!d.getElementById('je-pixel-tools').open,'pixel editor starts compact');assert(!d.getElementById('je-help').open,'extra guidance starts compact');for(const id of ['je-eye-shape','je-eye-position','je-brow','je-mouth','je-undo']) assert(!d.getElementById(id).closest('details'),'main control remains visible: '+id);assert(d.getElementById('je-guide').closest('#je-pixel-tools'));assert(d.getElementById('je-canvas').closest('#je-pixel-tools'));assert(d.getElementById('eye-editor-mode').closest('#fmf-eye-controls'));assert(d.getElementById('je-editor').closest('#fmf-eye-controls'));
 for (const id of ['je-eye-shape','je-eye-position','je-toon-position','je-curious-position','je-dot-position','je-brow','je-mouth']) {const el=d.getElementById(id), wrapper=el.nextElementSibling;assert.equal(wrapper.querySelectorAll('.dd-opt').length,el.options.length,id);assert.equal(wrapper.querySelectorAll('canvas.eye-option-thumb').length,el.options.length,id+' thumbnails');wrapper.querySelector('.dd-btn').click();for (const c of wrapper.querySelectorAll('canvas')) assert.equal(c.getContext('2d').state.data.length,256,'thumbnail is rendered');wrapper.querySelector('.dd-btn').click();}
 assert(d.getElementById('je-mask-toggle').checked);d.getElementById('je-mask-toggle').click();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'mask toggle without a preset leaves pixels unchanged');d.getElementById('je-mask-toggle').click();assert.equal(d.getElementById('fmf-eye-options').hidden,true);
 assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'2.0 deep link loads original without 1.x regeneration');
 const shape=d.getElementById('je-eye-shape'),position=d.getElementById('je-eye-position');position.value='super';shape.value='square';shape.dispatchEvent(new w.Event('change'));assert.equal(position.value,'top');assert(position.querySelector('[value=super]').disabled);shape.value='long-far';shape.dispatchEvent(new w.Event('change'));assert(d.getElementById('je-standard-options').hidden);assert(!d.getElementById('je-dot-options').hidden);assert(d.getElementById('je-dot-position').querySelector('[value="3"]').disabled);shape.value='standard';shape.dispatchEvent(new w.Event('change'));
 w.JustExpressionsEditor.setSkin(fixture,'Steve',true);position.value='upper'; const menu=shape.nextElementSibling;menu.querySelector('.dd-btn').click();[...menu.querySelectorAll('.dd-opt')].find(b=>b.textContent==='Far-set 2×1').click();assert.equal(shape.value,'far');assert.equal(w.JustExpressionsEditor.getSkin()[(2*64)*4+3],255,'the themed 2.0 dropdown controls the preset');d.getElementById('je-undo').click();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture));
 d.getElementById('je-pixel-tools').open=true;const cv=d.getElementById('je-canvas');cv.getBoundingClientRect=()=>({left:0,top:0,right:640,bottom:640,width:640,height:640});d.getElementById('je-color').value='#aabbcc';
 const ptr=(type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{button:{value:0},clientX:{value:x},clientY:{value:y},pointerId:{value:1}});cv.dispatchEvent(e)};
 ptr('pointerdown',105,105);ptr('pointerup',105,105);const edited=w.JustExpressionsEditor.getSkin();assert.deepEqual(Array.from(edited.slice((10*64+10)*4,(10*64+10)*4+4)),[170,187,204,255]);
 d.getElementById('save').click();assert.equal(getDownload(),'just-expressions-skin.png');assert.deepEqual(Array.from(getExport()),Array.from(edited));
 switchTo('fresh-moves');assert.equal(d.getElementById('top').width,480);assert.match(d.getElementById('eye-pixels-caption').textContent,/Top-left/);assert(!d.getElementById('fmf-unlock-notice').hidden);assert(d.getElementById('fmf-eye-options').hidden);d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(edited),'switch to 1.x must not rewrite data');
 w.confirm=()=>false;d.getElementById('fmf-unlock').click();assert(d.getElementById('fmf-eye-options').hidden);
 switchTo('just-expressions');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(edited));d.getElementById('je-undo').click();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'undo survives a no-change round trip');
 const a={name:'a.png',data:'a'}, b={name:'b.png',data:'b'};upload(a);upload(b);a.reader.onload();assert.equal(imageQueue.length,0,'older read is ignored');b.reader.onload();assert.equal(imageQueue.length,1);switchTo('fresh-moves');finish();assert(!d.getElementById('fmf-unlock-notice').hidden,'pending 2.0 load stays protected after mode switch');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(fixture));
 switchTo('just-expressions');const before=Array.from(w.JustExpressionsEditor.getSkin());let invalid={name:'bad.png',data:'bad'};upload(invalid);invalid.reader.onload();imageQueue[0].width=32;finish();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),before);assert.match(d.getElementById('status').textContent,/64x64/);
 w.confirm=()=>true;switchTo('fresh-moves');d.getElementById('fmf-unlock').click();assert(!d.getElementById('fmf-eye-options').hidden,'editing may be deliberately enabled');
 dom.window.close();
}
{
 let {dom,w,d,finish,switchTo,getExport}=setup();finish();d.getElementById('eyeboy').click();d.getElementById('save').click();const one=Array.from(getExport());switchTo('just-expressions');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),one,'1.x edits transfer to 2.0');switchTo('fresh-moves');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),one,'round trip preserves all pixels');dom.window.close();
}
{
 const {dom,w,d,fixture,finish,fireEye,frames,getExport}=setup('?mode=just-expressions',true);finish();
 const shape=d.getElementById('je-eye-shape');shape.value='standard';shape.dispatchEvent(new w.Event('change'));
 const skin=Array.from(w.JustExpressionsEditor.getSkin());const ix=(x,y)=>(y*64+x)*4;
 const diff=d.getElementById('top').getContext('2d').state.data;assert.equal(diff[ix(50,30)+3],0,'unchanged texture omitted from Added pixels');assert.deepEqual(Array.from(diff.slice(ix(9,12),ix(9,12)+4)),[255,255,255,255],'changed face pixels appear in Added pixels');
 assert.deepEqual(skin.slice(ix(9,12),ix(9,12)+4),[255,255,255,255],'actual eye white is painted');
 assert.deepEqual(skin.slice(ix(10,12),ix(10,12)+4),[56,56,56,255],'actual pupil is painted');
 d.getElementById('eyes3d').checked=true;fireEye(1050);const closed=frames[frames.length-1];assert.notDeepEqual(Array.from(closed.slice(ix(9,12),ix(9,12)+4)),[255,255,255,255],'2.0 simulation closes the eyes');
 assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),skin,'simulation never changes exported pixels');fireEye(1500);const open=frames[frames.length-1];assert.deepEqual(Array.from(open.slice(ix(9,12),ix(9,12)+4)),[255,255,255,255],'eyes reopen');
 d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),skin);dom.window.close();
}
{
 const {dom,w,d,fixture,finish}=setup('?mode=just-expressions');finish();
 const mouth=d.getElementById('je-mouth'), menu=mouth.nextElementSibling;
 const pick=(label)=>{menu.querySelector('.dd-btn').click();[...menu.querySelectorAll('.dd-opt')].find(b=>b.textContent===label).click();};
 pick('Top — short');assert.equal(mouth.value,'top-short');assert.notDeepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture));
 pick('Do not change');assert.equal(mouth.value,'keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'dropdown restores original face, markers and mask');
 d.getElementById('je-undo').click();assert.equal(mouth.value,'top-short');assert.match(menu.querySelector('.dd-btn').textContent,/Top — short/,'undo updates the visible menu');
 dom.window.close();
}
{
 const {dom,w,d,fixture,finish,getExport,frames}=setup('?mode=just-expressions',true);finish();const at=(x,y)=>(y*64+x)*4;
 const mouth=d.getElementById('je-mouth'), menu=mouth.nextElementSibling;
 const pick=label=>{menu.querySelector('.dd-btn').click();[...menu.querySelectorAll('.dd-opt')].find(b=>b.textContent===label).click();};
 d.getElementById('je-mask-toggle').click();pick('Top — long');let skin=w.JustExpressionsEditor.getSkin();assert(d.getElementById('je-mask-toggle').checked);
 assert.deepEqual(Array.from(skin.slice(at(10,14),at(10,14)+4)),[196,130,106,255],'dropdown paints face immediately');assert.deepEqual(Array.from(skin.slice(at(16,50),at(16,50)+4)),[196,130,106,255],'dropdown writes mouth marker');
 assert.notDeepEqual(Array.from(skin.slice(at(58,6),at(58,6)+4)),[196,130,106,255],'automatic mask hides the mouth');
 assert.deepEqual(Array.from(frames[frames.length-1].slice(at(10,14),at(10,14)+4)),[196,130,106,255],'3D preview updates');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(skin),'export includes face, marker and mask');
 d.getElementById('je-mask-toggle').click();assert(!d.getElementById('je-mask-toggle').checked);const shown=Array.from(w.JustExpressionsEditor.getSkin());pick('Top — long');assert(d.getElementById('je-mask-toggle').checked,'choosing the same preset re-enables hiding');d.getElementById('je-undo').click();assert(!d.getElementById('je-mask-toggle').checked);assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),shown,'undo restores prior show state');dom.window.close();
}
{
 const {dom,w,d,fixture,finish,frames,getExport}=setup('?mode=just-expressions',true);finish();const at=(x,y)=>(y*64+x)*4;
 const skin=new Uint8ClampedArray(fixture);for(let y=8;y<16;y++)for(let x=0;x<24;x++)skin.set([150,100,75,255],at(x,y));
 for(const [x,c] of [[1,[245,245,245,255]],[2,[60,55,140,255]],[5,[60,55,140,255]],[6,[245,245,245,255]]])skin.set(c,at(8+x,13));
 w.JustExpressionsEditor.setSkin(skin,'Eyes',true);
 const shape=d.getElementById('je-eye-shape'),menu=shape.nextElementSibling;
 const pick=value=>{menu.querySelector('.dd-btn').click();const opt=[...menu.querySelectorAll('.dd-opt')].find(b=>b.querySelector('canvas').dataset.value===value);const candidate=Array.from(opt.querySelector('canvas').getContext('2d').state.data);opt.click();return candidate;};
 for(const value of Array.from(shape.options).map(o=>o.value).filter(v=>v!=='keep')) {
  const candidate=pick(value),selected=w.JustExpressionsEditor.getSkin();assert.equal(shape.value,value);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.deepEqual(candidate.slice((y*8+x)*4,(y*8+x)*4+4),Array.from(selected.slice(at(8+x,8+y),at(8+x,8+y)+4)),value+' thumbnail matches painted face');
  assert.deepEqual(Array.from(frames[frames.length-1]),Array.from(selected),value+' 3D preview updates');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(selected),value+' exported');
 }
 pick('dots-close');d.getElementById('je-mask-toggle').click();assert(!d.getElementById('je-mask-toggle').checked);const hiddenOff=Array.from(w.JustExpressionsEditor.getSkin());pick('dots-close');assert(d.getElementById('je-mask-toggle').checked,'reselecting dots enables hiding');d.getElementById('je-undo').click();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),hiddenOff);
 pick('keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(skin),'keep restores uploaded eyes');dom.window.close();
}
{
 // Every eyebrow and mouth option previews the exact resulting composite,
 // including existing face details, the other feature and a translucent hat.
 const {dom,w,d,fixture,finish,frames,getExport}=setup('?mode=just-expressions',true);finish();const at=(x,y)=>(y*64+x)*4;
 const original=new Uint8ClampedArray(fixture);for(let y=8;y<16;y++)for(let x=8;x<16;x++)original.set([110+(x%4)*7,80+(y%3)*9,60,255],at(x,y));
 for(const [x,y,color] of [[41,10,[30,60,90,128]],[42,11,[200,10,90,255]],[43,14,[50,200,100,160]],[45,15,[100,20,30,255]]])original.set(color,at(x,y));
 original.set([11,22,33,255],at(56,0));original.set([77,88,99,255],at(28,51));original.set([20,30,40,255],at(17,50));
 w.JustExpressionsEditor.setSkin(original,'Layered skin',true);
 const select=(id,value)=>{const el=d.getElementById(id),menu=el.nextElementSibling, before=Array.from(w.JustExpressionsEditor.getSkin());menu.querySelector('.dd-btn').click();
  const option=[...menu.querySelectorAll('.dd-opt')].find(b=>b.querySelector('canvas').dataset.value===value),candidate=Array.from(option.querySelector('canvas').getContext('2d').state.data);
  assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),before,'opening '+id+' does not alter skin');option.click();assert.equal(el.value,value);
  const skin=w.JustExpressionsEditor.getSkin();for(let y=0;y<8;y++)for(let x=0;x<8;x++) {const face=at(8+x,8+y),hat=at(40+x,8+y),alpha=skin[hat+3]/255;
   const expected=alpha?[0,1,2].map(k=>Math.round(skin[hat+k]*alpha+skin[face+k]*(1-alpha))).concat(255):Array.from(skin.slice(face,face+4));
   assert.deepEqual(candidate.slice((y*8+x)*4,(y*8+x)*4+4),expected,id+' '+value+' thumbnail '+x+','+y);
  }
  assert.deepEqual(Array.from(frames[frames.length-1]),Array.from(skin),id+' '+value+' 3D preview');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(skin),id+' '+value+' download');return Array.from(skin);
 };
 select('je-mouth','top-short');const otherFeature=Array.from(w.JustExpressionsEditor.getSkin());
 for(const value of Array.from(d.getElementById('je-brow').options).map(o=>o.value).filter(v=>v!=='keep')) select('je-brow',value);
 select('je-brow','keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),otherFeature,'removing brows preserves mouth and its mask');
 select('je-brow','regular-top');const browFeature=Array.from(w.JustExpressionsEditor.getSkin());
 for(const value of Array.from(d.getElementById('je-mouth').options).map(o=>o.value).filter(v=>v!=='keep')) select('je-mouth',value);
 select('je-mouth','keep');assert.notDeepEqual(Array.from(w.JustExpressionsEditor.getSkin()),browFeature,'brow remains, not its formerly selected mouth');
 select('je-brow','keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(original),'removing both restores original face, layers, markers and mask');
 const set=(id,value,type='change')=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
 set('je-eye-white','#234567','input');set('je-eye-pupil','#234567','input');set('je-brow-color','#234567','input');set('je-eye-shape','standard');const eyes=Array.from(w.JustExpressionsEditor.getSkin());
 for(const value of Array.from(d.getElementById('je-brow').options).map(o=>o.value).filter(v=>v!=='keep')) select('je-brow',value);
 select('je-brow','keep');assert.equal(d.getElementById('je-eye-shape').value,'standard','removing brows preserves the adjusted eye selection');assert(w.JustExpressionsEditor.hasEye());
 set('je-eye-shape','keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(original));dom.window.close();
}
{
 // 2.0 colour controls in both locations drive the same undoable edits and export.
 const {dom,w,d,fixture,finish,frames,getExport,switchTo}=setup('?mode=just-expressions',true);finish();
 const at=(x,y)=>(y*64+x)*4, pixel=(x,y)=>Array.from(w.JustExpressionsEditor.getSkin().slice(at(x,y),at(x,y)+4));
 const edit=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const choose=(id,value)=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 const pairs=[['je-eye-white','je-advanced-eye-white','#eeddcc'],['je-eye-pupil','je-advanced-eye-pupil','#345678'],['je-brow-color','je-advanced-brow-color','#a14725'],['je-mouth-color','je-advanced-mouth-color','#cc6688']];
 for(const [main,copy,value] of pairs){assert(d.getElementById(copy).closest('#je-pixel-tools'));edit(copy,value);assert.equal(d.getElementById(main).value,value);}
 assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'colours alone do not edit Do not change skin');
 choose('je-eye-shape','standard');assert.deepEqual(pixel(9,12),[238,221,204,255],'advanced eye white paints chosen preset');assert.deepEqual(pixel(10,12),[52,86,120,255],'advanced pupil paints chosen preset');assert.deepEqual(pixel(5,3),[52,86,120,255],'pupil also reaches marker');
 const eyeBefore=Array.from(w.JustExpressionsEditor.getSkin());edit('je-eye-white','#abcdef');assert.equal(d.getElementById('je-advanced-eye-white').value,'#abcdef');assert.deepEqual(pixel(9,12),[171,205,239,255]);
 assert.deepEqual(Array.from(frames.at(-1)),Array.from(w.JustExpressionsEditor.getSkin()),'3D preview reflects colour');d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(w.JustExpressionsEditor.getSkin()),'download saves changed colour');
 d.getElementById('je-undo').click();assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),eyeBefore,'one undo reverts colour and pixels');assert.equal(d.getElementById('je-eye-white').value,'#eeddcc');assert.equal(d.getElementById('je-advanced-eye-white').value,'#eeddcc');
 choose('je-brow','regular-super');choose('je-mouth','top-short');assert.deepEqual(pixel(8,9),[161,71,37,255]);assert.deepEqual(pixel(11,14),[204,102,136,255]);
 edit('je-advanced-brow-color','#102030');assert.equal(d.getElementById('je-brow-color').value,'#102030');assert.deepEqual(pixel(8,9),[16,32,48,255]);assert.deepEqual(pixel(14,48),[16,32,48,255]);d.getElementById('je-undo').click();assert.equal(d.getElementById('je-advanced-brow-color').value,'#a14725');assert.deepEqual(pixel(8,9),[161,71,37,255]);
 edit('je-mouth-color','#112233');assert.equal(d.getElementById('je-advanced-mouth-color').value,'#112233');assert.deepEqual(pixel(11,14),[17,34,51,255]);d.getElementById('je-undo').click();assert.equal(d.getElementById('je-advanced-mouth-color').value,'#cc6688');
 switchTo('fresh-moves');switchTo('just-expressions');for(const [main,copy] of pairs)assert.equal(d.getElementById(copy).value,d.getElementById(main).value,'colours remain synchronised across mode changes');
 choose('je-eye-shape','keep');choose('je-brow','keep');choose('je-mouth','keep');assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(fixture),'Do not change restores uploaded skin');
 dom.window.close();
}
{
 const {dom,w,d,fixture,finish,frames,getExport}=setup('?mode=just-expressions',true);finish();const at=(x,y)=>(y*64+x)*4;
 const skin=new Uint8ClampedArray(fixture);for(let x=8;x<16;x++) {skin.set([5,5,5,255],at(x,12));skin.set([0,0,0,255],at(x+32,12));}
 w.JustExpressionsEditor.setSkin(skin,'Glasses',true);
 for(const [id,value] of [['je-advanced-eye-white','#f0f1f2'],['je-advanced-eye-pupil','#123abc']]) {const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
 assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(skin),'setting colours does not change glasses while Do not change is selected');
 const shape=d.getElementById('je-eye-shape');shape.value='standard';shape.dispatchEvent(new w.Event('change'));
 let result=w.JustExpressionsEditor.getSkin();assert.deepEqual(Array.from(result.slice(at(9,12),at(9,12)+4)),[240,241,242,255]);assert.deepEqual(Array.from(result.slice(at(10,12),at(10,12)+4)),[18,58,188,255]);assert.equal(result[at(41,12)+3],0,'overlapping opaque glasses cleared for visible eye');
 assert.deepEqual(Array.from(frames.at(-1)),Array.from(result));d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(result));
 shape.value='keep';shape.dispatchEvent(new w.Event('change'));assert.deepEqual(Array.from(w.JustExpressionsEditor.getSkin()),Array.from(skin),'keep restores original glasses');dom.window.close();
}
{
 const {dom,w,d,fixture,finish,frames,getExport}=setup('?mode=just-expressions',true);finish();w.confirm=()=>{throw Error('combined presets must not prompt');};
 const at=(x,y)=>(y*64+x)*4, skin=()=>w.JustExpressionsEditor.getSkin(), pixel=(x,y)=>Array.from(skin().slice(at(x,y),at(x,y)+4));
 const edit=(id,value,type='change')=>{const el=d.getElementById(id);el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
 const pick=(id,value)=>{const el=d.getElementById(id),menu=el.nextElementSibling,before=Array.from(skin()),previousStatus=d.getElementById('je-status').textContent;menu.querySelector('.dd-btn').click();
  const option=[...menu.querySelectorAll('.dd-opt')].find(b=>b.querySelector('canvas').dataset.value===value),thumb=Array.from(option.querySelector('canvas').getContext('2d').state.data);
  assert.deepEqual(Array.from(skin()),before,'thumbnails do not mutate combined skin');assert.equal(d.getElementById('je-status').textContent,previousStatus);
  option.click();const after=skin();for(let y=0;y<8;y++)for(let x=0;x<8;x++)assert.deepEqual(thumb.slice((y*8+x)*4,(y*8+x)*4+4),Array.from(after.slice(at(8+x,8+y),at(8+x,8+y)+4)),id+' candidate includes all adjusted features');
 };
 edit('je-eye-white','#f0f1f2','input');edit('je-eye-pupil','#123abc','input');edit('je-brow-color','#a14725','input');edit('je-mouth-color','#cc6688','input');
 pick('je-eye-shape','standard');pick('je-brow','regular-upper');pick('je-mouth','top-short');
 const withFeatures=Array.from(skin());
 edit('rx-layer','outer');d.getElementById('rx-grid').children[10].click();edit('gl-part','0,0');d.getElementById('gl-grid').children[2].click();edit('gl-part','8,8');d.getElementById('gl-grid').children[34].click();
 assert.deepEqual(Array.from(skin()),withFeatures,'Reactions and glow map do not change JE face, mask or markers');
 assert.match(d.getElementById('gl-count').textContent,/2 glowing/);assert.match(d.getElementById('rx-result').textContent,/layer 2/);
 d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),withFeatures,'mod tools do not enter skin PNG');
 const before=Array.from(skin());pick('je-brow','regular-lower');assert.match(d.getElementById('gl-count').textContent,/2 glowing/,'glow map survives live JE changes');assert.match(d.getElementById('rx-result').textContent,/layer 2/,'Reactions placements survive JE updates');assert.equal(d.getElementById('je-eye-position').value,'lower');assert.match(d.getElementById('je-eye-position').nextElementSibling.querySelector('.dd-btn').textContent,/Lower middle/);assert.match(d.getElementById('je-status').textContent,/Adjusted eye position to Lower middle/);
 assert.deepEqual(pixel(9,12),[161,71,37,255]);assert.deepEqual(pixel(9,13),[240,241,242,255]);assert.deepEqual(pixel(11,14),[204,102,136,255]);
 assert.deepEqual(pixel(4,4),[10,20,30,255],'eye marker samples skin beneath brow');assert.deepEqual(pixel(28,50),[161,71,37,255]);assert.deepEqual(pixel(17,50),[204,102,136,255]);
 assert.deepEqual(Array.from(frames.at(-1)),Array.from(skin()),'3D shows all three features');const face=d.getElementById('face').getContext('2d').state.data;assert.deepEqual(Array.from(face.slice(at(9,13),at(9,13)+4)),[240,241,242,255],'Face preview shows adjusted eye');
 d.getElementById('save').click();assert.deepEqual(Array.from(getExport()),Array.from(skin()),'download has combined face, markers and mask');
 d.getElementById('je-undo').click();assert.deepEqual(Array.from(skin()),before,'undo restores all automatic adjustments');assert.equal(d.getElementById('je-brow').value,'regular-upper');assert.equal(d.getElementById('je-eye-position').value,'upper');
 d.getElementById('je-mask-toggle').click();assert(!d.getElementById('je-mask-toggle').checked);pick('je-eye-shape','standard');assert(d.getElementById('je-mask-toggle').checked,'reselecting eyes re-enables hiding for selected brow and mouth');
 for(const [id,value,faceXY,markerXY,expected] of [['je-advanced-eye-pupil','#355677',[10,12],[5,3],[53,86,119,255]],['je-advanced-brow-color','#334455',[9,11],[28,49],[51,68,85,255]],['je-advanced-mouth-color','#ddeeaa',[11,14],[17,50],[221,238,170,255]]]) {
  const other=Array.from(skin());edit(id,value,'input');assert.deepEqual(pixel(...faceXY),expected,id+' paints face');assert.deepEqual(pixel(...markerXY),expected,id+' writes its marker');assert(d.getElementById('je-mask-toggle').checked);
  assert.deepEqual(Array.from(frames.at(-1)),Array.from(skin()),'live 3D after '+id);d.getElementById('je-undo').click();assert.deepEqual(Array.from(skin()),other,'undo colour leaves other features intact');
 }
 pick('je-mouth','keep');assert.equal(d.getElementById('je-brow').value,'regular-upper');assert.equal(d.getElementById('je-eye-shape').value,'standard');pick('je-brow','keep');pick('je-eye-shape','keep');assert.deepEqual(Array.from(skin()),Array.from(fixture),'all Do not change choices restore uploaded skin');dom.window.close();
}
console.log('Unified editor mode transfer, download, undo, overwrite safety, validation and async races passed');
