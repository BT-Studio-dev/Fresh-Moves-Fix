const assert=require('assert'),fs=require('fs'),vm=require('vm');const s=fs.readFileSync('website/editor.js','utf8');const fn=s.slice(s.indexOf('  function paintThumbnail('),s.indexOf('  function refreshThumbnails('));
const idx=(x,y)=>(y*64+x)*4,data=new Uint8ClampedArray(64*64*4);data.set([72,32,17,255],idx(8,8));data.set([21,111,225,255],idx(10,12));let options,drawn;
const controls={type:{value:'2x1'},pos:{value:'upper'}};
const ctx={TYPES:{'2x1':{def:'upper',variants:{upper:{face:[]}}}},$:(id)=>controls[id],loaded:true,idx,build:o=>{options=o;return {out:{data}}},previewSkin:x=>x,faceComposite:x=>x};
vm.runInNewContext(fn+';this.paint=paintThumbnail;',ctx);const canvas={getContext:()=>({fillRect(){},createImageData:()=>({data:new Uint8ClampedArray(256)}),putImageData(im){drawn=im}})};
ctx.paint(canvas,{id:'brow'},'h3');assert.equal(options.brow,'h3');assert.equal(options.type,'2x1');assert.deepEqual(Array.from(drawn.data.slice(0,4)),[72,32,17,255]);assert.deepEqual(Array.from(drawn.data.slice((4*8+2)*4,(4*8+2)*4+4)),[21,111,225,255]);
ctx.paint(canvas,{id:'type'},'2x1');assert.equal(options.custom,true);assert.equal(options.pos,'upper');console.log('Dropdown thumbnails use the candidate skin face without changing controls');
