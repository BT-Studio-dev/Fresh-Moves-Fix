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
w.eval(fs.readFileSync('website/eye-detect.js', 'utf8'));
w.eval(fs.readFileSync('website/je-thumbnails.js', 'utf8'));
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
// Every mouth and brow preset paints the face, writes its marker, and re-enables a hidden mask in one undo step.
for (const [preset,row,cols,markerX,markerY] of [
 ['top-long',6,[2,3,4,5],16,50], ['top-short',6,[3,4],17,50],
 ['bottom-long',7,[2,3,4,5],16,51], ['bottom-short',7,[3,4],17,51]
]) {
 resetDefault();change('je-mask-mode','solid');change('je-mask-color','#102030','input');change('je-mouth-color','#cc4422','input');$('je-mask-toggle').click();assert(!$('je-mask-toggle').checked);
 const before=Array.from(save());change('je-mouth',preset);assert($('je-mask-toggle').checked,preset+' automatically enables hiding');
 for (const x of cols) {assert.deepEqual(px(save(),8+x,8+row),[204,68,34,255],preset+' visible face');assert.deepEqual(px(save(),56+x,row),[16,32,48,255],preset+' masked overlap');}
 for (let x=markerX;x<markerX+cols.length;x++) assert.deepEqual(px(save(),x,markerY),[204,68,34,255],preset+' marker');
 undo();assert.deepEqual(Array.from(save()),before,preset+' undo restores face, mask and markers');assert(!$('je-mask-toggle').checked);assert.equal($('je-mouth').value,'keep');
}
for (const [preset,row,cols,markerX,markerY,markerWidth,layer] of [
 ['regular-super',1,[0,1,2,5,6,7],14,48,6,false],['regular-top',2,[0,1,2,5,6,7],28,48,6,false],
 ['regular-upper',3,[0,1,2,5,6,7],28,49,6,false],['regular-lower',4,[0,1,2,5,6,7],28,50,6,false],['regular-bottom',5,[0,1,2,5,6,7],28,51,6,false],
 ['layer-top',2,[1,2,5,6],34,48,2,true],['layer-upper',3,[1,2,5,6],34,49,2,true],
 ['layer-lower',4,[1,2,5,6],34,50,2,true],['layer-bottom',5,[1,2,5,6],34,51,2,true]
]) {
 resetDefault();change('je-mask-mode','solid');change('je-mask-color','#102030','input');change('je-brow-color','#325476','input');$('je-mask-toggle').click();const before=Array.from(save());change('je-brow',preset);assert($('je-mask-toggle').checked,preset+' automatically enables hiding');
 for (const x of cols) {assert.deepEqual(px(save(),(layer?40:8)+x,8+row),[50,84,118,255],preset+' visible feature');assert.deepEqual(px(save(),56+x,row),[16,32,48,255],preset+' masked overlap');}
 for (let x=markerX;x<markerX+markerWidth;x++) assert.deepEqual(px(save(),x,markerY),[50,84,118,255],preset+' marker');
 undo();assert.deepEqual(Array.from(save()),before,preset+' undo restores face, mask and markers');assert(!$('je-mask-toggle').checked);assert.equal($('je-brow').value,'keep');
}
// Selecting a second feature re-hides both after the user temporarily shows the face on the mask.
resetDefault();change('je-mask-mode','solid');change('je-mask-color','#102030','input');change('je-mouth-color','#cc4422','input');change('je-brow-color','#325476','input');change('je-mouth','top-long');$('je-mask-toggle').click();assert(!$('je-mask-toggle').checked);const shown=Array.from(save());change('je-brow','regular-top');assert($('je-mask-toggle').checked);assert.deepEqual(px(save(),58,6),[16,32,48,255],'existing mouth is hidden again');assert.deepEqual(px(save(),56,2),[16,32,48,255],'new eyebrow is hidden');undo();assert.deepEqual(Array.from(save()),shown);assert(!$('je-mask-toggle').checked,'undo restores the explicit show setting');
// Returning to keep and changing a colour alone never enables a mask or changes a skin.
resetDefault();$('je-mask-toggle').click();let keepSkin=Array.from(save());change('je-mouth-color','#aabbcc','input');change('je-brow-color','#123456','input');assert.deepEqual(Array.from(save()),keepSkin);assert(!$('je-mask-toggle').checked);
// Every eye preset runs automatically; the previous generated target is restored on a position change.
for(const [shape,x,y] of [['standard',4,2],['derp',4,2],['far',0,2],['far-derp',0,2],['square',28,5],['square-far',48,48],['wide',32,2],['flat',32,2],['toon',36,5],['rectangle',36,32],['big',36,32],['curious',16,34],['cyclops',52,34],['lateral',40,34],['single-big',44,48],['single-small',45,49],['dots-close',61,47],['dots-far',60,47],['short-close',57,47],['short-far',56,47],['long-close',61,41],['long-far',60,41]]) {
 resetDefault();$('je-eye-position').value='upper';$('je-toon-position').value='bottom';$('je-curious-position').value='bottom';$('je-dot-position').value='6';const before=Array.from(save());change('je-eye-shape',shape);assert.equal(px(save(),x,y)[3],255,shape+' marker');assert(!$('je-undo').disabled,shape+' undo');undo();assert.deepEqual(Array.from(save()),before,shape+' undo restores full PNG');assert.equal($('je-eye-shape').value,'keep');
}
for (const [place,x,y] of [['top',28,2],['upper',28,5],['lower',24,2],['bottom',24,5]]){resetDefault();$('je-eye-position').value=place;change('je-eye-shape','square');assert.equal(px(save(),x,y)[3],255,`square ${place}`);}
for (const [shape,min] of [['dots-close',1],['dots-far',1],['short-close',2],['short-far',2],['long-close',3],['long-far',4]]) for(let row=min;row<=6;row++) {resetDefault();$('je-dot-position').value=String(row);change('je-eye-shape',shape);const [kind,spacing]=shape.split('-'),base=kind==='short'?56:60,x=spacing==='far'?base:base+1,y=(kind==='long'?35:41)+row;assert.equal(px(save(),x,y)[3],255,`${shape} row ${row}`);}
resetDefault();change('je-eye-shape','standard');let upper=Array.from(save());change('je-eye-position','bottom');assert.equal(px(save(),4,2)[3],0,'previous generated eye markers are removed');assert.equal(px(save(),4,6)[3],255);undo();assert.deepEqual(Array.from(save()),upper);assert.equal($('je-eye-position').value,'upper','undo restores dropdown');
// Realistic uploaded eyes are replaced, not left underneath the new shape.
function ordinaryEyesSkin() {
 resetDefault(); const data=save();
 for(let y=0;y<8;y++)for(let x=0;x<8;x++) data.set([150,100,75,255],((8+y)*64+8+x)*4);
 for(const [x,c] of [[1,[245,245,245,255]],[2,[60,55,140,255]],[5,[60,55,140,255]],[6,[245,245,245,255]]]) data.set(c,((8+5)*64+8+x)*4);
 return data;
}
const shapes=Array.from($('je-eye-shape').options).map(o=>o.value).filter(v=>v!=='keep');
for(const shape of shapes) {
 const original=ordinaryEyesSkin();w.JustExpressionsEditor.setSkin(original,'Ordinary eyes',true);
 const before=Array.from(save());change('je-eye-shape',shape);
 assert.equal($('je-eye-shape').value,shape,shape+' successfully selected');
 const state={shape,position:$('je-eye-position').value,toon:$('je-toon-position').value,curious:$('je-curious-position').value,dot:$('je-dot-position').value,white:'#112233',pupil:'#445566',oldCells:[]};
 const layout=w.FMFJEThumbnail.pixels(new Uint8ClampedArray(256),'je-eye-shape',shape,state);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++) {
  const i=(y*8+x)*4;
  if(layout[i+3]) assert.deepEqual(px(save(),8+x,8+y),layout[i]===17?[255,255,255,255]:[56,56,56,255],shape+' face '+x+','+y);
  else if(y===5 && [1,2,5,6].includes(x)) assert.deepEqual(px(save(),8+x,8+y),[150,100,75,255],shape+' removes old eyes');
 }
 if (/^(dots|short|long)-/.test(shape)) {assert($('je-mask-toggle').checked);assert($('je-mask-dots').checked);}
 const selected=Array.from(save());change('je-eye-shape','keep');assert.deepEqual(Array.from(save()),before,shape+' keep restores eyes, markers and mask');
 undo();assert.deepEqual(Array.from(save()),selected,shape+' undo keep');undo();assert.deepEqual(Array.from(save()),before,shape+' undo selection');
}
// Steve-like dark hair must not be used as the fill for removed eye pixels.
{
 const original=ordinaryEyesSkin();for(const [x,y] of [[0,2],[7,2],[3,1],[4,1]])original.set([43,30,13,255],((8+y)*64+8+x)*4);
 w.JustExpressionsEditor.setSkin(original,'Hairline',true);change('je-eye-shape','wide');
 assert.deepEqual(px(save(),9,13),[150,100,75,255],'same-row face colour, not dark hair, fills old eyes');
 change('je-eye-shape','keep');assert.deepEqual(Array.from(save()),Array.from(original));
}
// Exercise all available position choices with visible geometry and transactional restoration.
for(const [shape,control,positions] of [
 ...['standard','derp','far','far-derp','wide','flat'].map(s=>[s,'je-eye-position',['super','top','upper','lower','bottom']]),
 ['square','je-eye-position',['top','upper','lower','bottom']], ['toon','je-toon-position',['top','mid','bottom']],
 ...['curious','cyclops'].map(s=>[s,'je-curious-position',['top','bottom']]),
 ...[['dots-close',1],['dots-far',1],['short-close',2],['short-far',2],['long-close',3],['long-far',4]].map(([s,min])=>[s,'je-dot-position',Array.from({length:7-min},(_,i)=>String(i+min))])
]) for(const position of positions) {
 const original=ordinaryEyesSkin();w.JustExpressionsEditor.setSkin(original,'Positions',true);
 $(control).value=position;change('je-eye-shape',shape);assert.equal($(control).value,position,shape+' accepts '+position);
 const state={shape,position:$('je-eye-position').value,toon:$('je-toon-position').value,curious:$('je-curious-position').value,dot:$('je-dot-position').value,white:'#112233',pupil:'#445566',oldCells:[]};
 const layout=w.FMFJEThumbnail.pixels(new Uint8ClampedArray(256),'je-eye-shape',shape,state);
 for(let i=0;i<64;i++)if(layout[i*4+3])assert.deepEqual(px(save(),8+i%8,8+Math.floor(i/8)),layout[i*4]===17?[255,255,255,255]:[56,56,56,255],`${shape} ${position} face`);
 change('je-eye-shape','keep');assert.deepEqual(Array.from(save()),Array.from(original),`${shape} ${position} restores original`);
}
// Moving an eye removes the previous preset, restores the old mask when no longer needed,
// and keeps changes made manually to old-eye pixels.
{
 const original=ordinaryEyesSkin();w.JustExpressionsEditor.setSkin(original,'Ordinary eyes',true);
 change('je-eye-shape','wide');const wide=Array.from(save());change('je-eye-position','bottom');
 assert.deepEqual(px(save(),8,11),[150,100,75,255],'previous wide eye position restored');
 undo();assert.deepEqual(Array.from(save()),wide,'position undo');
 change('je-eye-shape','dots-close');assert($('je-mask-dots').checked);assert.notDeepEqual(px(save(),56,0),px(original,56,0));
 change('je-eye-shape','standard');assert.deepEqual(px(save(),56,0),px(original,56,0),'leaving dots restores unused mask');
 change('je-eye-shape','keep');assert.deepEqual(Array.from(save()),Array.from(original));
 w.JustExpressionsEditor.setSkin(original,'Ordinary eyes',true);$('je-view').value='full';$('je-view').dispatchEvent(new w.Event('change'));$('je-color').value='#aabbcc';pointer('pointerdown',95,135);pointer('pointerup',95,135);
 change('je-eye-shape','wide');assert.deepEqual(px(save(),9,13),[170,187,204,255],'manual edit at old eye is not replaced by detection');
 change('je-eye-shape','keep');assert.deepEqual(px(save(),9,13),[170,187,204,255],'keep preserves manual edit');
}
// Overlap replacement does not prompt; unknown non-target pixels survive, and undo restores the entire skin.
resetDefault();let data=save();data.set([90,80,70,255],(2*64+4)*4);data.set([3,4,5,255],(0*64+4)*4);w.JustExpressionsEditor.setSkin(data,'Existing',true);const occupied=Array.from(save());change('je-eye-shape','standard');assert.notDeepEqual(px(save(),4,2),[90,80,70,255]);assert.deepEqual(px(save(),4,0),[3,4,5,255]);assert.match($('je-status').textContent,/Other marker-area pixels were preserved/);undo();assert.deepEqual(Array.from(save()),occupied);
// Transparent source pixels reject a selection without changing the previous state.
resetDefault();data=save();data[(11*64+9)*4+3]=0;w.JustExpressionsEditor.setSkin(data,'Transparent',true);const transparent=Array.from(save());change('je-eye-shape','standard');assert.deepEqual(Array.from(save()),transparent);assert.equal($('je-eye-shape').value,'keep');assert.match($('je-status').textContent,/transparent/i);
// Make distinct facial features and a custom mask to check automatic masking and undo.
resetDefault();data=save();for(const x of [0,1,2,5,6,7])data.set([90,40,20,255],((8+3)*64+8+x)*4);for(const x of [3,4])data.set([140,30,40,255],((8+6)*64+8+x)*4);data.set([222,111,99,255],(0*64+56)*4);w.JustExpressionsEditor.setSkin(data,'Custom',true);const original=Array.from(save());
change('je-mask-mode','solid');change('je-mask-color','#102030','input');change('je-brow','regular-upper');assert.deepEqual(px(save(),28,49),[18,52,86,255]);assert.deepEqual(px(save(),56,3),[16,32,48,255]);assert.deepEqual(px(save(),8,11),[18,52,86,255],'brow is painted on the face');
const withBrow=Array.from(save());change('je-mouth','top-short');assert.deepEqual(px(save(),17,50),[170,187,204,255]);assert.deepEqual(px(save(),59,6),[16,32,48,255]);undo();assert.deepEqual(Array.from(save()),withBrow,'one undo restores both mouth and mask');assert.equal($('je-mouth').value,'keep');undo();assert.deepEqual(Array.from(save()),original,'undo restores overwritten custom mask');
change('je-brow','regular-upper');change('je-mouth','top-short');const both=Array.from(save());$('je-mask-toggle').click();assert.deepEqual(px(save(),56,3),[18,52,86,255]);assert.deepEqual(px(save(),59,6),[170,187,204,255]);undo();assert.deepEqual(Array.from(save()),both);assert($('je-mask-toggle').checked,'undo restores mask toggle');
change('je-brow-color','#fedcba','input');assert.deepEqual(px(save(),28,49),[254,220,186,255]);undo();assert.deepEqual(Array.from(save()),both,'colour change is undoable');
change('je-brow','keep');const unchanged=Array.from(save());change('je-brow-color','#000001','input');assert.deepEqual(Array.from(save()),unchanged,'keep never rewrites brow markers');
change('je-mouth','bottom-long');assert.equal(px(save(),17,50)[3],0,'previous generated mouth markers released');assert.deepEqual(px(save(),16,51),[170,187,204,255]);undo();assert.deepEqual(Array.from(save()),unchanged);
// Blank faces and opaque hats now show the chosen feature in both PNG layers and generated markers.
resetDefault();data=save();for(let y=8;y<16;y++)for(let x=40;x<48;x++)data.set([120,120,120,255],(y*64+x)*4);w.JustExpressionsEditor.setSkin(data,'Opaque hat',true);const beforeFeatures=Array.from(save());
change('je-eye-shape','standard');assert.deepEqual(px(save(),9,12),[255,255,255,255]);assert.deepEqual(px(save(),10,12),[56,56,56,255]);assert.deepEqual(px(save(),5,3),[56,56,56,255],'marker matches the painted face');assert.equal(px(save(),41,12)[3],0,'overlapping outer layer cleared');assert.deepEqual(px(save(),40,8),[120,120,120,255],'unrelated hat is preserved');
const eyeSkin=Array.from(save());assert(w.JustExpressionsEditor.hasEye());const closed=w.JustExpressionsEditor.eyeFrame(save(),'shut');assert.notDeepEqual(px(closed,9,12),px(save(),9,12));assert.deepEqual(Array.from(save()),eyeSkin,'eye animation is preview-only');
const look=w.JustExpressionsEditor.eyeFrame(save(),'left');assert.notDeepEqual(px(look,9,12),px(save(),9,12));assert.deepEqual(Array.from(save()),eyeSkin);
change('je-eye-pupil','#2277bb','input');assert.deepEqual(px(save(),10,12),[34,119,187,255]);assert.deepEqual(px(save(),5,3),[34,119,187,255]);undo();assert.deepEqual(Array.from(save()),eyeSkin);assert.equal($('je-eye-pupil').value,'#383838');
change('je-brow','regular-top');assert.deepEqual(px(save(),8,10),[0,0,1,255]);assert.equal(px(save(),40,10)[3],0);const withEyeAndBrow=Array.from(save());change('je-mouth','bottom-short');assert.deepEqual(px(save(),11,15),[170,187,204,255]);assert.equal(px(save(),43,15)[3],0);undo();assert.deepEqual(Array.from(save()),withEyeAndBrow);undo();assert.deepEqual(Array.from(save()),eyeSkin);undo();assert.deepEqual(Array.from(save()),beforeFeatures,'undo restores face, marker, and outer layer');assert(!w.JustExpressionsEditor.hasEye());
change('je-brow','layer-upper');assert.deepEqual(px(save(),41,11),[0,0,1,255],'second-layer brow is painted on hat');undo();assert.deepEqual(Array.from(save()),beforeFeatures);
// Returning to Do not change restores that feature's pre-selection pixels, including custom mask and hat.
resetDefault();data=save();data.set([67,68,69,255],(14*64+11)*4);data.set([11,12,13,255],(14*64+43)*4);data.set([21,22,23,255],(50*64+17)*4);data.set([31,32,33,255],(0*64+56)*4);w.JustExpressionsEditor.setSkin(data,'Existing mouth',true);const beforeMouth=Array.from(save());
change('je-mouth','top-short');const mouthActive=Array.from(save());assert.notDeepEqual(mouthActive,beforeMouth);change('je-mouth','bottom-long');change('je-mouth','keep');assert.deepEqual(Array.from(save()),beforeMouth,'mouth, markers, mask and hat restored after switching presets');assert.equal($('je-mouth').value,'keep');undo();assert.equal($('je-mouth').value,'bottom-long','undo restores previous selection');assert.deepEqual(px(save(),16,51),[170,187,204,255]);
// Restore one feature while retaining another and recalculating the mask.
resetDefault();data=save();data.set([33,44,55,255],(11*64+8)*4);data.set([66,77,88,255],(14*64+11)*4);data.set([99,100,101,255],(0*64+56)*4);w.JustExpressionsEditor.setSkin(data,'Existing features',true);const beforeBoth=Array.from(save());change('je-brow','regular-upper');change('je-mouth','top-short');const activeBoth=Array.from(save());change('je-mouth','keep');assert.deepEqual(px(save(),11,14),[66,77,88,255],'existing mouth restored');assert.deepEqual(px(save(),8,11),[0,0,1,255],'selected brow remains');assert.equal(px(save(),17,50)[3],0,'generated mouth marker removed');assert.deepEqual(px(save(),56,3),[16,32,48,255],'mask still hides brow');const browOnly=Array.from(save());undo();assert.deepEqual(Array.from(save()),activeBoth);assert.equal($('je-mouth').value,'top-short');change('je-mouth','keep');assert.deepEqual(Array.from(save()),browOnly);change('je-brow','keep');assert.deepEqual(Array.from(save()),beforeBoth,'last feature removal also restores pre-existing mask');undo();assert.deepEqual(Array.from(save()),browOnly);
// Eye Do not change removes its generated face and markers and stops preview animation.
resetDefault();const beforeEye=Array.from(save());change('je-eye-shape','standard');const activeEye=Array.from(save());change('je-eye-shape','keep');assert.deepEqual(Array.from(save()),beforeEye);assert(!w.JustExpressionsEditor.hasEye());undo();assert.deepEqual(Array.from(save()),activeEye);assert(w.JustExpressionsEditor.hasEye());
// Overlapping features must not resurrect a removed older feature when the newer one is removed.
resetDefault();const overlapBase=Array.from(save());change('je-eye-shape','standard');change('je-brow','regular-lower');const overlapBoth=Array.from(save());change('je-eye-shape','keep');assert.deepEqual(px(save(),9,12),[0,0,1,255],'newer brow survives eye removal');change('je-brow','keep');assert.deepEqual(Array.from(save()),overlapBase,'removing both restores original without ghost eyes');undo();undo();assert.deepEqual(Array.from(save()),overlapBoth,'undo restores overlapping layers');
// Equal-colour overlaps still belong to the newer feature. Removing the older
// feature must not erase it or resurrect it when the newer one is removed.
for (const older of ['eye','brow']) {
 resetDefault();const base=Array.from(save());change('je-eye-white','#234567','input');change('je-eye-pupil','#234567','input');change('je-brow-color','#234567','input');
 if (older==='eye') {change('je-eye-shape','standard');change('je-brow','regular-lower');}
 else {change('je-brow','regular-lower');change('je-eye-shape','standard');}
 const both=Array.from(save());change(older==='eye'?'je-eye-shape':'je-brow','keep');
 assert.deepEqual(px(save(),9,12),[35,69,103,255],older+' removal preserves identical-colour newer feature');
 change(older==='eye'?'je-brow':'je-eye-shape','keep');assert.deepEqual(Array.from(save()),base,'removing both restores original');
 undo();undo();assert.deepEqual(Array.from(save()),both,'undo restores both overlapping features');
}
// Removing a feature does not undo manual work performed afterwards on that pixel.
resetDefault();change('je-mouth','top-short');$('je-view').value='full';$('je-color').value='#55aa33';d.querySelector('[data-je-tool="brush"]').click();pointer('pointerdown',115,145);pointer('pointerup',115,145);assert.deepEqual(px(save(),11,14),[85,170,51,255]);change('je-mouth','keep');assert.deepEqual(px(save(),11,14),[85,170,51,255]);
// A manually regenerated mask before selection remains the baseline when a feature is removed.
resetDefault();$('je-copy-mask').click();const manualMask=Array.from(save());change('je-mouth','top-short');change('je-mouth','keep');assert.deepEqual(Array.from(save()),manualMask,'manual mask survives selection and restoration');
// Manually edited mask pixels after automatic generation are not overwritten by restoration.
resetDefault();change('je-mouth','top-short');$('je-view').value='full';$('je-color').value='#123abc';d.querySelector('[data-je-tool="brush"]').click();pointer('pointerdown',565,5);pointer('pointerup',565,5);change('je-mouth','keep');assert.deepEqual(px(save(),56,0),[18,58,188,255]);
// Manual painting, erase, reset, and advanced mask regeneration remain available.
resetDefault();$('je-color').value='#aabbcc';pointer('pointerdown',105,105);pointer('pointerup',105,105);assert.deepEqual(px(save(),10,10),[170,187,204,255]);undo();assert.deepEqual(px(save(),10,10),[10,20,30,255]);
d.querySelector('[data-je-tool="eraser"]').click();pointer('pointerdown',105,105);pointer('pointerup',105,105);assert.equal(px(save(),10,10)[3],0);$('je-reset').click();assert.deepEqual(px(save(),10,10),[10,20,30,255]);undo();assert.equal(px(save(),10,10)[3],0);
resetDefault();$('je-pixel-tools').open=false;$('je-copy-mask').click();assert($('je-pixel-tools').open);assert.equal($('je-view').value,'top-right');undo();assert.equal(px(save(),56,0)[3],0);
change('je-guide','cyclops-eye');assert.equal($('je-guide-link').href,'https://example.com/guides/just-expressions/cyclops-eye/');
const projects=new JSDOM(fs.readFileSync('website/public/creations/index.html','utf8'),{url:'https://example.com/creations/'}).window.document;assert(![...projects.querySelectorAll('.project-card')].some(a=>a.textContent.includes('Just Expressions skin eye editor')));
// Combined non-overlapping features are independent of selection order, including
// eye marker sources adjacent to an eyebrow and the Universal Mask.
{
 const permutations=[['eye','brow','mouth'],['eye','mouth','brow'],['brow','eye','mouth'],['brow','mouth','eye'],['mouth','eye','brow'],['mouth','brow','eye']];let expected;
 for(const order of permutations) {
  resetDefault();change('je-eye-white','#f0f1f2','input');change('je-eye-pupil','#123abc','input');change('je-brow-color','#a14725','input');change('je-mouth-color','#cc6688','input');
  change('je-mask-mode','solid');change('je-mask-color','#102030','input');
  for(const item of order)change({eye:'je-eye-shape',brow:'je-brow',mouth:'je-mouth'}[item],{eye:'standard',brow:'regular-upper',mouth:'top-short'}[item]);
  const result=Array.from(save());if(expected)assert.deepEqual(result,expected,'combined PNG must not depend on selection order');else expected=result;
  assert.deepEqual(px(save(),4,2),[10,20,30,255],'eye eyelid marker samples underneath brow');
  assert.deepEqual(px(save(),9,12),[240,241,242,255]);assert.deepEqual(px(save(),9,11),[161,71,37,255]);assert.deepEqual(px(save(),11,14),[204,102,136,255]);
  assert.deepEqual(px(save(),5,3),[18,58,188,255]);assert.deepEqual(px(save(),28,49),[161,71,37,255]);assert.deepEqual(px(save(),17,50),[204,102,136,255]);
  assert.deepEqual(px(save(),57,3),[16,32,48,255]);assert.deepEqual(px(save(),59,6),[16,32,48,255]);
 }
}
// Conflicting choices move other selected features in the same undoable action.
{
 resetDefault();change('je-eye-shape','standard');change('je-brow','regular-upper');change('je-mouth','top-short');const before=Array.from(save());
 change('je-brow','regular-lower');assert.equal($('je-brow').value,'regular-lower');assert.equal($('je-eye-position').value,'lower');assert.equal($('je-mouth').value,'top-short');
 assert.match($('je-status').textContent,/Adjusted eye position/);assert.deepEqual(px(save(),9,12),[161,71,37,255]);assert.deepEqual(px(save(),9,13),[240,241,242,255]);assert.deepEqual(px(save(),11,14),[204,102,136,255]);
 undo();assert.deepEqual(Array.from(save()),before,'one undo restores every adjusted feature, markers and mask');assert.equal($('je-brow').value,'regular-upper');assert.equal($('je-eye-position').value,'upper');assert.equal($('je-mouth').value,'top-short');
 $('je-mask-toggle').click();assert(!$('je-mask-toggle').checked);change('je-eye-pupil','#456789','input');assert($('je-mask-toggle').checked,'editing an eye re-enables mask for selected brow and mouth');
 undo();assert(!$('je-mask-toggle').checked,'undo restores mask visibility and colour');
}
function eyeMarker(shape) {
 const pos=$('je-eye-position').value;
 if(shape==='square')return {top:[28,2],upper:[28,5],lower:[24,2],bottom:[24,5]}[pos];
 if(['standard','derp','far','far-derp'].includes(shape)){const far=shape.startsWith('far');return [pos==='super'?(far?28:24):(far?0:4),{super:0,top:0,upper:2,lower:4,bottom:6}[pos]];}
 if(shape==='wide'||shape==='flat')return [pos==='super'?36:32,{super:0,top:0,upper:2,lower:4,bottom:6}[pos]];
 if(shape==='toon')return {top:[12,32],mid:[36,2],bottom:[36,5]}[$('je-toon-position').value];
 if(shape==='curious'||shape==='cyclops')return [shape==='curious'?16:52,$('je-curious-position').value==='top'?32:34];
 const fixed={'square-far':[48,48],rectangle:[36,32],big:[36,32],lateral:[40,34],'single-big':[44,48],'single-small':[45,49]};if(fixed[shape])return fixed[shape];
 const [kind,spacing]=shape.split('-'),base=kind==='short'?56:60;return [base+(spacing==='far'?0:1),(kind==='long'?35:41)+Number($('je-dot-position').value)];
}
// A representative range of 2.0 eyes, both brow layers and both mouth widths
// must all remain visible after the solver adjusts conflicting positions.
for(const shape of shapes)for(const brow of ['regular-super','regular-lower','layer-bottom'])for(const mouth of ['top-long','bottom-short']) {
 resetDefault();change('je-eye-white','#f0f1f2','input');change('je-eye-pupil','#123abc','input');change('je-brow-color','#a14725','input');change('je-mouth-color','#cc6688','input');change('je-mask-mode','solid');change('je-mask-color','#102030','input');
 const originalCombined=Array.from(save());change('je-eye-shape',shape);change('je-brow',brow);change('je-mouth',mouth);
 assert.equal($('je-eye-shape').value,shape,'preserve selected '+shape);assert.equal($('je-mouth').value,mouth,'preserve requested mouth');
 const state={shape,position:$('je-eye-position').value,toon:$('je-toon-position').value,curious:$('je-curious-position').value,dot:$('je-dot-position').value,white:'#112233',pupil:'#445566',brow:'#778899',mouth:'#aabbcc',oldCells:[]};
 const layout=(id,value)=>w.FMFJEThumbnail.pixels(new Uint8ClampedArray(256),id,value,state);
 for(const [id,value] of [['je-eye-shape',shape],['je-brow',$('je-brow').value],['je-mouth',mouth]]) {
  const cells=layout(id,value);for(let i=0;i<64;i++)if(cells[i*4+3]) {
   const x=i%8,y=Math.floor(i/8),layer=id==='je-brow' && value.startsWith('layer-');
   const want=id==='je-eye-shape'?(cells[i*4]===17?[240,241,242,255]:[18,58,188,255]):id==='je-brow'?[161,71,37,255]:[204,102,136,255];
   assert.deepEqual(px(save(),(layer?40:8)+x,8+y),want,`${shape}, ${brow}, ${mouth} visible ${id}`);
   if(id!=='je-eye-shape')assert.deepEqual(px(save(),56+x,y),[16,32,48,255],`${shape} mask hides ${id}`);
  }
 }
 const [eyeX,eyeY]=eyeMarker(shape);assert.equal(px(save(),eyeX,eyeY)[3],255,shape+' eye marker preserved beside brow and mouth');
 const [layer,pos]=$('je-brow').value.split('-'),browY={super:48,top:48,upper:49,lower:50,bottom:51}[pos],browX=pos==='super'?14:layer==='layer'?34:28;
 assert.deepEqual(px(save(),browX,browY),[161,71,37,255],shape+' '+brow+' '+mouth+' actual '+$('je-brow').value+' eyebrow marker');
 const [mp,mw]=mouth.split('-'),mouthY=mp==='top'?50:51,mouthX=mw==='short'?17:16;
 assert.deepEqual(px(save(),mouthX,mouthY),[204,102,136,255],shape+' mouth marker');
 const oldEyeMarker=px(save(),eyeX,eyeY), oldMouthMarker=px(save(),mouthX,mouthY);
 change('je-brow-color','#445566','input');assert.deepEqual(px(save(),eyeX,eyeY),oldEyeMarker,shape+' eye marker survives eyebrow colour');assert.deepEqual(px(save(),mouthX,mouthY),oldMouthMarker,shape+' mouth marker survives eyebrow colour');
 const newBrowMarker=px(save(),browX,browY);change('je-mouth-color','#ccbbaa','input');assert.deepEqual(px(save(),eyeX,eyeY),oldEyeMarker,shape+' eye marker survives mouth colour');assert.deepEqual(px(save(),browX,browY),newBrowMarker,shape+' brow marker survives mouth colour');
 assert($('je-mask-toggle').checked);change('je-eye-shape','keep');change('je-brow','keep');change('je-mouth','keep');assert.deepEqual(Array.from(save()),originalCombined,shape+' restoring all features restores original');
}
console.log('Automatic 2.0 presets, mask, undo, manual tools, geometry and guide passed');dom.window.close();
