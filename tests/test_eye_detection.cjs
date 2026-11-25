const assert=require('assert');const vm=require('vm'),fs=require('fs');const context={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('website/eye-detect.js','utf8'),context);const detect=context.module.exports;
const data=new Uint8ClampedArray(64*64*4);function p(x,y,c){data.set([...c,255],(y*64+x)*4)}
for(let y=8;y<16;y++)for(let x=8;x<16;x++)p(x,y,[190,140,110]);
assert.equal(detect(data),null,'plain face should not invent eyes');
for(const [x,c] of [[9,[255,255,255]],[10,[30,50,70]],[13,[30,50,70]],[14,[255,255,255]]])p(x,12,c);
for(const x of [9,10,13,14])p(x,11,[50,30,20]);
let found=detect(data);assert.equal(found.type,'2x1');assert.equal(found.pos,'upper');assert.equal(found.brow,'f3');
for(const [x,c] of [[9,[255,255,255]],[10,[30,50,70]],[13,[30,50,70]],[14,[255,255,255]]])p(x,13,c);
found=detect(data);assert.equal(found.type,'2x2');assert.equal(found.pos,'lower');
console.log('Conservative ordinary-eye and eyebrow detection passed');
