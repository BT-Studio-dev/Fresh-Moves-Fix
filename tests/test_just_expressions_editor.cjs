const assert = require('assert'), fs = require('fs'), {JSDOM} = require('../website/node_modules/jsdom');
const html = fs.readFileSync('website/public/editor/index.html', 'utf8');
const dom = new JSDOM(html, {url:'https://example.com/editor/', runScripts:'outside-only'}), w = dom.window, d = w.document;
const contexts = new WeakMap(); let saved, download;
w.HTMLCanvasElement.prototype.getContext = function () {
  if (!contexts.has(this)) { const canvas=this, state={data:new Uint8ClampedArray(64*64*4)}; contexts.set(this, {
    createImageData(width,height){ return {data:new Uint8ClampedArray(width*height*4),width,height}; },
    putImageData(image){ state.data = new Uint8ClampedArray(image.data); },
    getImageData(){ return {data:new Uint8ClampedArray(state.data)}; },
    clearRect(){}, drawImage(img){ if (img instanceof w.Image) {state.data=new Uint8ClampedArray(64*64*4);for(let i=0;i<state.data.length;i+=4)state.data.set([10,20,30,255],i);for(const [x0,y0,ww,hh] of [[0,0,8,8],[24,0,8,8],[32,0,8,8],[12,32,4,3],[16,32,4,4],[36,32,8,3],[40,35,4,1],[52,32,3,4],[56,43,4,5],[60,38,4,10],[44,48,8,4],[56,0,8,8],[14,48,6,4],[28,48,8,4]])for(let y=y0;y<y0+hh;y++)for(let x=x0;x<x0+ww;x++)state.data.fill(0,(y*64+x)*4,(y*64+x)*4+4);} }, state, canvas
  }); } return contexts.get(this);
};
w.HTMLCanvasElement.prototype.toDataURL = function(){saved=new Uint8ClampedArray(contexts.get(this).state.data);return 'data:image/png;base64,AA==';};
w.HTMLAnchorElement.prototype.click=function(){download=this.download;};
let badSize=false;w.Image=class {constructor(){this.width=badSize?32:64;this.height=64;}set src(value){this.onload();}};
w.FileReader=class {readAsDataURL(){this.result='data:image/png;base64,AA==';this.onload();}};
w.eval(fs.readFileSync('website/just-expressions-editor.js', 'utf8'));
const canvas=d.getElementById('je-canvas');canvas.getBoundingClientRect=()=>({left:0,top:0,right:640,bottom:640,width:640,height:640});
const pointer=(type,x,y)=>{let e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{button:{value:0},clientX:{value:x},clientY:{value:y},pointerId:{value:1}});canvas.dispatchEvent(e);};
function save(){return w.JustExpressionsEditor.getSkin();}
function resetDefault(){const c=d.createElement('canvas'),ctx=c.getContext('2d');ctx.drawImage(new w.Image(),0,0);w.JustExpressionsEditor.setSkin(ctx.getImageData(0,0,64,64).data,'Steve',true);}
const $=id=>d.getElementById(id), px=(data,x,y)=>Array.from(data.slice((y*64+x)*4,(y*64+x)*4+4));
const change=(id,value,type='change')=>{const el=$(id);el.value=value;el.dispatchEvent(new w.Event(type,{bubbles:true}));};
const undo=()=>$('je-undo').click();
w.confirm=()=>{throw Error('2.0 presets and mask must not show confirmation dialogs');};
resetDefault();
assert.equal($('je-eye-shape').value,'keep');assert.equal($('je-brow').value,'keep');assert.equal($('je-mouth').value,'keep');
for(const id of ['je-apply-eye','je-apply-brow','je-apply-mouth'])assert.equal($(id),null);
assert(!$('je-pixel-tools').open);assert.match($('je-pixel-tools').querySelector('summary').textContent,/Advanced \/ Manual pixel tools/);
const initial=Array.from(save());change('je-brow-color','#123456','input');change('je-mouth-color','#aabbcc','input');assert.deepEqual(Array.from(save()),initial,'colour with do-not-change never writes');
// Every eye preset runs automatically; the previous generated target is restored on a position change.
for(const [shape,x,y] of [['standard',4,2],['derp',4,2],['far',0,2],['far-derp',0,2],['square',28,5],['square-far',48,48],['wide',32,2],['flat',32,2],['toon',36,5],['rectangle',36,32],['big',36,32],['curious',16,34],['cyclops',52,34],['lateral',40,34],['single-big',44,48],['single-small',45,49],['dots-close',61,47],['dots-far',60,47],['short-close',57,47],['short-far',56,47],['long-close',61,41],['long-far',60,41]]) {
 resetDefault();$('je-eye-position').value='upper';$('je-toon-position').value='bottom';$('je-curious-position').value='bottom';$('je-dot-position').value='6';const before=Array.from(save());change('je-eye-shape',shape);assert.equal(px(save(),x,y)[3],255,shape+' marker');assert(!$('je-undo').disabled,shape+' undo');undo();assert.deepEqual(Array.from(save()),before,shape+' undo restores full PNG');assert.equal($('je-eye-shape').value,'keep');
}
for (const [place,x,y] of [['top',28,2],['upper',28,5],['lower',24,2],['bottom',24,5]]){resetDefault();$('je-eye-position').value=place;change('je-eye-shape','square');assert.equal(px(save(),x,y)[3],255,`square ${place}`);}
for (const [shape,min] of [['dots-close',1],['dots-far',1],['short-close',2],['short-far',2],['long-close',3],['long-far',4]]) for(let row=min;row<=6;row++) {resetDefault();$('je-dot-position').value=String(row);change('je-eye-shape',shape);const [kind,spacing]=shape.split('-'),base=kind==='short'?56:60,x=spacing==='far'?base:base+1,y=(kind==='long'?35:41)+row;assert.equal(px(save(),x,y)[3],255,`${shape} row ${row}`);}
resetDefault();change('je-eye-shape','standard');let upper=Array.from(save());change('je-eye-position','bottom');assert.equal(px(save(),4,2)[3],0,'previous generated eye markers are removed');assert.equal(px(save(),4,6)[3],255);undo();assert.deepEqual(Array.from(save()),upper);assert.equal($('je-eye-position').value,'upper','undo restores dropdown');
// Overlap replacement does not prompt; unknown non-target pixels survive, and undo restores the entire skin.
resetDefault();let data=save();data.set([90,80,70,255],(2*64+4)*4);data.set([3,4,5,255],(0*64+4)*4);w.JustExpressionsEditor.setSkin(data,'Existing',true);const occupied=Array.from(save());change('je-eye-shape','standard');assert.notDeepEqual(px(save(),4,2),[90,80,70,255]);assert.deepEqual(px(save(),4,0),[3,4,5,255]);assert.match($('je-status').textContent,/Other marker-area pixels were preserved/);undo();assert.deepEqual(Array.from(save()),occupied);
// Transparent source pixels reject a selection without changing the previous state.
resetDefault();data=save();data[(11*64+9)*4+3]=0;w.JustExpressionsEditor.setSkin(data,'Transparent',true);const transparent=Array.from(save());change('je-eye-shape','standard');assert.deepEqual(Array.from(save()),transparent);assert.equal($('je-eye-shape').value,'keep');assert.match($('je-status').textContent,/transparent/i);
// Make distinct facial features and a custom mask to check automatic masking and undo.
resetDefault();data=save();for(const x of [0,1,2,5,6,7])data.set([90,40,20,255],((8+3)*64+8+x)*4);for(const x of [3,4])data.set([140,30,40,255],((8+6)*64+8+x)*4);data.set([222,111,99,255],(0*64+56)*4);w.JustExpressionsEditor.setSkin(data,'Custom',true);const original=Array.from(save());
change('je-mask-mode','solid');change('je-mask-color','#102030','input');change('je-brow','regular-upper');assert.deepEqual(px(save(),28,49),[18,52,86,255]);assert.deepEqual(px(save(),56,3),[16,32,48,255]);assert.deepEqual(px(save(),8,11),[90,40,20,255],'original face stays intact');
const withBrow=Array.from(save());change('je-mouth','top-short');assert.deepEqual(px(save(),17,50),[170,187,204,255]);assert.deepEqual(px(save(),59,6),[16,32,48,255]);undo();assert.deepEqual(Array.from(save()),withBrow,'one undo restores both mouth and mask');assert.equal($('je-mouth').value,'keep');undo();assert.deepEqual(Array.from(save()),original,'undo restores overwritten custom mask');
change('je-brow','regular-upper');change('je-mouth','top-short');const both=Array.from(save());$('je-mask-toggle').click();assert.deepEqual(px(save(),56,3),[90,40,20,255]);assert.deepEqual(px(save(),59,6),[140,30,40,255]);undo();assert.deepEqual(Array.from(save()),both);assert($('je-mask-toggle').checked,'undo restores mask toggle');
change('je-brow-color','#fedcba','input');assert.deepEqual(px(save(),28,49),[254,220,186,255]);undo();assert.deepEqual(Array.from(save()),both,'colour change is undoable');
change('je-brow','keep');const unchanged=Array.from(save());change('je-brow-color','#000001','input');assert.deepEqual(Array.from(save()),unchanged,'keep never rewrites brow markers');
change('je-mouth','bottom-long');assert.equal(px(save(),17,50)[3],0,'previous generated mouth markers released');assert.deepEqual(px(save(),16,51),[170,187,204,255]);undo();assert.deepEqual(Array.from(save()),unchanged);
// Manual painting, erase, reset, and advanced mask regeneration remain available.
resetDefault();$('je-color').value='#aabbcc';pointer('pointerdown',105,105);pointer('pointerup',105,105);assert.deepEqual(px(save(),10,10),[170,187,204,255]);undo();assert.deepEqual(px(save(),10,10),[10,20,30,255]);
d.querySelector('[data-je-tool="eraser"]').click();pointer('pointerdown',105,105);pointer('pointerup',105,105);assert.equal(px(save(),10,10)[3],0);$('je-reset').click();assert.deepEqual(px(save(),10,10),[10,20,30,255]);undo();assert.equal(px(save(),10,10)[3],0);
resetDefault();$('je-pixel-tools').open=false;$('je-copy-mask').click();assert($('je-pixel-tools').open);assert.equal($('je-view').value,'top-right');undo();assert.equal(px(save(),56,0)[3],0);
change('je-guide','cyclops-eye');assert.equal($('je-guide-link').href,'https://example.com/guides/just-expressions/cyclops-eye/');
const projects=new JSDOM(fs.readFileSync('website/public/creations/index.html','utf8'),{url:'https://example.com/creations/'}).window.document;assert(![...projects.querySelectorAll('.project-card')].some(a=>a.textContent.includes('Just Expressions skin eye editor')));
console.log('Automatic 2.0 presets, mask, undo, manual tools, geometry and guide passed');dom.window.close();
