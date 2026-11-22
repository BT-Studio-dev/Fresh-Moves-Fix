const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{}};vm.runInNewContext(fs.readFileSync('website/pfp-3d.js','utf8'),c);
const pixels=new Uint8ClampedArray(64*64*4).fill(255);let paths=[],cur=[];
const ctx={beginPath(){cur=[]},moveTo(x,y){cur.push([x,y])},lineTo(x,y){cur.push([x,y])},closePath(){},fill(){paths.push(cur)},stroke(){}};
for(const angle of [-80,-45,45,80])for(const yaw of [-70,0,70]){paths=[];c.window.drawPfp3d(ctx,{getImageData(){return{data:pixels}}},{slim:false,outer:true,legacy:false,headOnly:false,yaw,pitch:10,angles:{},bends:{ra:angle,la:-angle,rl:angle,ll:-angle},scale:12,centerY:0});assert(paths.length>50);for(const q of paths){assert.equal(q.length,4);for(const p of q)assert(p.every(Number.isFinite));for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];assert(Math.hypot(a[0]-b[0],a[1]-b[1])<65,'no stretched triangular spikes');}}}
console.log('Bent limb geometry remains bounded across camera angles');
