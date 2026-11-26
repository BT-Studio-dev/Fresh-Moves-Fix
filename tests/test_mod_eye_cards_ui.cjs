const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('../website/node_modules/jsdom');
(async () => {
 const dom = new JSDOM(fs.readFileSync('website/public/editor/index.html','utf8'),{url:'https://example.test/editor/',runScripts:'outside-only'});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);let reader;
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},createLinearGradient(){return {addColorStop(){}}},beginPath(){},arc(){},stroke(){}});
 w.FileReader=class {readAsText(){reader=this}};
 w.eval(fs.readFileSync('website/mod-eye-tools.js','utf8'));w.eval(fs.readFileSync('website/ui.js','utf8'));
 const skin=new Uint8ClampedArray(64*64*4);for(let i=0;i<skin.length;i+=4)skin.set([18,52,86,255],i); const original=Array.from(skin);w.ModEyeTools.setSkin(skin);
 function choose(id,label){const wrap=$(id).nextElementSibling;const button=wrap.querySelector('.dd-btn');assert(button);assert(!button.disabled);button.click();const option=[...wrap.querySelectorAll('.dd-opt')].find(o=>o.textContent===label);assert(option,label);option.click();}
 const existing=$('gl-existing').nextElementSibling.querySelector('.dd-btn');assert(existing.disabled,'empty imported presets list is disabled');
 choose('rx-layer','Outer (layer 2)');assert.equal($('rx-layer').value,'outer');$('rx-grid').children[0].click();assert.match($('rx-result').textContent,/8, 8 \(layer 2\)/);
 choose('gl-part','Fresh Moves texture 2');choose('gl-tool','Draw');
 const colour=$('gl-color'),picker=colour.nextElementSibling,sw=picker.querySelector('.sw');sw.click();assert(!picker.querySelector('.uipick').hidden);
 const hex=picker.querySelector('.pk-hex');hex.value='#abcdef';hex.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(colour.value,'#abcdef');
 $('gl-grid').children[0].click();assert.equal($('gl-grid').children[0].dataset.glow,'true');
 choose('gl-tool','Pick skin colour');$('gl-grid').children[1].click();assert.equal(colour.value,'#123456');assert.equal(sw.style.background,'rgb(18, 52, 86)','themed swatch tracks sampled colour');
 Object.defineProperty($('gl-import'),'files',{value:[{size:1}],configurable:true});$('gl-import').dispatchEvent(new w.Event('change'));
 reader.result=JSON.stringify({DataVersion:4,presets:[{name:'Existing A',content:{'9,12':-1}},{name:'Existing B',content:{'10,12':-2}}]});reader.onload();await Promise.resolve();
 assert(!existing.disabled,'import enables themed menu');choose('gl-existing','Existing B');$('gl-load-existing').click();assert.equal($('gl-name').value,'Existing B');
 $('gl-reset-import').click();await Promise.resolve();assert(existing.disabled,'removing import disables themed menu');
 assert.deepEqual(Array.from(skin),original,'styled UI does not alter the skin');dom.window.close();console.log('Themed mod-card controls, dynamic presets and colour picker passed (DOM simulation)');
})().catch(error => {console.error(error);process.exitCode=1});
