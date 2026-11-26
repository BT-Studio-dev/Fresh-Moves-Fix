// Exercise real DOM events, FileReader, File and Blob, rather than simulating parsed JSON.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../website/node_modules/jsdom');
(async () => {
 const dom = new JSDOM(fs.readFileSync('website/public/editor/index.html','utf8'), {url:'https://example.test/editor/',runScripts:'outside-only'});
 const w = dom.window, d = w.document, $ = id => d.getElementById(id), downloads=[];
 w.URL.createObjectURL = blob => { downloads.push({blob}); return 'blob:example-' + downloads.length; };
 w.URL.revokeObjectURL = () => {};
 w.HTMLAnchorElement.prototype.click = function () { assert(this.isConnected, 'downloads must be attached to the document'); downloads.at(-1).name = this.download; };
 w.eval(fs.readFileSync('website/mod-eye-tools.js','utf8'));
 const getText = blob => new Promise((resolve,reject) => { const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror=reject; reader.readAsText(blob); });
 const upload = (id, data) => { const file = new w.File([JSON.stringify(data)], id+'.json', {type:'application/json'}); Object.defineProperty($(id),'files',{configurable:true,value:[file]}); $(id).dispatchEvent(new w.Event('change',{bubbles:true})); };
 const waitFor = (id, pattern) => new Promise((resolve,reject) => { const timeout = setTimeout(() => { observer.disconnect(); reject(Error($(id).textContent)); }, 2000); const observer = new w.MutationObserver(() => { if (pattern.test($(id).textContent)) { clearTimeout(timeout);observer.disconnect();resolve(); } }); observer.observe($(id),{childList:true,subtree:true,characterData:true}); });
 const set = (id,value) => { $(id).value=value; $(id).dispatchEvent(new w.Event('change',{bubbles:true})); };
 const skin = new Uint8ClampedArray(64*64*4); for(let i=0;i<skin.length;i+=4)skin.set([10,20,30,255],i); const before=Array.from(skin); w.ModEyeTools.setSkin(skin);
 // Reactions: import existing settings, select layer, position and download a merged configuration.
 const reaction={eyeWidth:2,eyeHeight:1,leftEyeX:9,leftEyeY:12,rightEyeX:13,rightEyeY:12,eyeSkinLayer:'BASE',showMouth:false,playerOverrides:{test:{eyeWidth:1}}};
 const rxWait=waitFor('rx-status',/Configuration loaded/); upload('rx-import',reaction); await rxWait;
 set('rx-layer','outer'); $('rx-grid').children[1].click(); $('rx-export').click();
 assert.equal(downloads.at(-1).name,'reactions.json'); const rx=JSON.parse(await getText(downloads.at(-1).blob));
 assert.equal(rx.leftEyeX,9);assert.equal(rx.leftEyeY,8);assert.equal(rx.leftEyeSkinLayer,'OUTER');assert.equal(rx.showMouth,false);assert.deepEqual(rx.playerOverrides,reaction.playerOverrides);
 // Glowing Eyes: import, load, draw, undo, then download an appended preset.
 const presets={DataVersion:4,presets:[{name:'Original',content:{'9,12':-1}}]};
 const glWait=waitFor('gl-status',/Loaded 1 presets/); upload('gl-import',presets); await glWait;
 $('gl-load-existing').click(); set('gl-tool','paint'); $('gl-color').value='#123456'; $('gl-grid').children[4*8+2].click();
 assert.match($('gl-count').textContent,/2 glowing/); $('gl-undo').click(); assert.match($('gl-count').textContent,/1 glowing/);
 $('gl-grid').children[4*8+2].click(); $('gl-export').click();
 assert.equal(downloads.at(-1).name,'presets.json'); const output=JSON.parse(await getText(downloads.at(-1).blob));
 assert.deepEqual(output.presets[0],presets.presets[0]); assert.equal(output.presets[1].content['10,12'],-15584170);
 assert.deepEqual(Array.from(skin),before,'card actions do not mutate the skin PNG');
 dom.window.close(); console.log('Mod cards real-file import and download workflows passed (DOM simulation)');
})().catch(error => { console.error(error); process.exitCode=1; });
