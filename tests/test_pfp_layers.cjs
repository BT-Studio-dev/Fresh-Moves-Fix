const assert = require('assert'), fs = require('fs'), vm = require('vm');
const context = {window:{}}; vm.runInNewContext(fs.readFileSync('website/pfp-3d.js','utf8'),context);
const pixels=new Uint8ClampedArray(64*64*4);
function pixel(x,y,r,g,b,a){let i=(y*64+x)*4;pixels.set([r,g,b,a],i);}
// Head overlay front and back, deliberately different colors and partially transparent.
pixel(40,8,255,0,0,128);pixel(56,8,0,0,255,255);
const painted=[];let strokes=0;const ctx={beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){painted.push(this.fillStyle)},stroke(){strokes++}};
const opt={slim:false,outer:true,legacy:false,yaw:0,pitch:0,angles:{},headOnly:true,scale:20,centerY:12};
context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);
assert.deepEqual(painted,['rgba(255,0,0,0.5019607843137255)'],'front glass visible; far-side overlay culled');assert.equal(strokes,0,'translucent pixels are not double painted');
painted.length=0;opt.yaw=180;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);
assert(strokes>0 && ctx.lineWidth===1.5,'opaque pixel edges seal seams');assert(painted.some(c=>c==='rgba(0,0,255,1)'),'back side visible when camera turns around');assert(!painted.some(c=>c.includes('255,0,0')));
painted.length=0;opt.outer=false;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);assert.equal(painted.length,0);
// Directional light changes face colours when enabled, without changing alpha.
opt.outer=true;opt.yaw=0;opt.lightStrength=1;opt.lightHeight=0;opt.lightDirection=0;painted.length=0;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);assert(painted.some(c=>c==='rgba(255,0,0,0.5019607843137255)'));opt.lightDirection=180;painted.length=0;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);assert(painted.some(c=>c==='rgba(153,0,0,0.5019607843137255)'));
opt.lightDirection=0;opt.lightColor='#00ffff';painted.length=0;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);assert(painted.some(c=>c==='rgba(161,0,0,0.5019607843137255)'),'light colour tints the skin');
// Adjacent identical translucent pixels share one fill, so their seam is not
// composited twice or stroked (which would make glass darker).
pixel(41,8,255,0,0,128); opt.lightStrength=0; opt.yaw=0; painted.length=0;strokes=0;context.window.drawPfp3d(ctx,{getImageData(){return {data:pixels}}},opt);assert.equal(painted.length,1);assert.equal(strokes,0);
console.log('Outer-layer front, back and alpha rendering passed');
