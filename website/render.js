(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('render-canvas'), ctx = canvas.getContext('2d');
  var source = document.createElement('canvas'); source.width = 64; source.height = 64;
  var skin = source.getContext('2d'), loaded = false, legacy = false, loadVersion = 0;
  var status = $('render-status');
  function part(x,y,w,h,sx,sy,layerX,layerY,angle) {
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle || 0); ctx.imageSmoothingEnabled=false;
    ctx.drawImage(source,sx,sy,w,h,0,0,w*12,h*12);
    if(layerX !== null) ctx.drawImage(source,layerX,layerY,w,h,-3,-3,w*12+6,h*12+6);
    ctx.restore();
  }
  // Software-rendered textured boxes: no WebGL, animation loop or external assets.
  function draw3d() {
    var pixels=skin.getImageData(0,0,64,64).data, slim=$('render-model').value==='slim', aw=slim?3:4, ax=slim?5.5:6;
    var yaw=+$('render-yaw').value*Math.PI/180, pitch=+$('render-pitch').value*Math.PI/180;
    var cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch), quads=[];
    var piv={head:[0,24],body:[0,24],ra:[-5,22],la:[5,22],rl:[-2,12],ll:[2,12]};
    var parts=[['head',0,0,8,8,8,0,28,0],['body',16,16,8,12,4,0,18,0],['ra',40,16,aw,12,4,-ax,18,0],['la',32,48,aw,12,4,ax,18,0],['rl',0,16,4,12,4,-2,6,0],['ll',16,48,4,12,4,2,6,0]];
    var layers=[[32,0],[16,32],[40,32],[48,48],[0,32],[0,48]];
    function point(name,x,y,z){
      var pv=piv[name], control=$('render-'+name), a=control? +control.value*Math.PI/180:0, c=Math.cos(a), t=Math.sin(a), X=x-pv[0], Y=y-pv[1];
      x=X*c-Y*t+pv[0];y=X*t+Y*c+pv[1]-16;
      var xx=x*cy+z*sy, zz=-x*sy+z*cy, yy=y*cp-zz*sp, depth=y*sp+zz*cp;
      return [332+xx*12,360-yy*12,depth];
    }
    parts.forEach(function(p,pi){
      [0,1].forEach(function(layer){
        if(layer && (!$('render-outer').checked || (legacy && (pi===3||pi===5))))return;
        var name=p[0],u=layer?layers[pi][0]:p[1],v=layer?layers[pi][1]:p[2],w=p[3],h=p[4],d=p[5],x=p[6],y=p[7],inf=layer?(pi===0?0.5:0.25):0;
        var sx=(w+2*inf)/w,sy2=(h+2*inf)/h,sz=(d+2*inf)/d,top=y+h/2*sy2;
        var rects=[[u+d,v+d,w,h],[u+2*d+w,v+d,w,h],[u,v+d,d,h],[u+d+w,v+d,d,h],[u+d,v,w,d],[u+d+w,v,w,d]];
        var faces=[function(i,j){return [x+(-w/2+i)*sx,top-j*sy2,d/2*sz]},function(i,j){return [x+(w/2-i)*sx,top-j*sy2,-d/2*sz]},function(i,j){return [x-w/2*sx,top-j*sy2,(-d/2+i)*sz]},function(i,j){return [x+w/2*sx,top-j*sy2,(d/2-i)*sz]},function(i,j){return [x+(-w/2+i)*sx,top,(-d/2+j)*sz]},function(i,j){return [x+(-w/2+i)*sx,top-h*sy2,(-d/2+j)*sz]}];
        faces.forEach(function(fn,fi){
          var r=rects[fi], a=point(name,...fn(0,0)),b=point(name,...fn(r[2],0)),c=point(name,...fn(0,r[3]));
          var cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(fi===5)cross=-cross;
          if(cross<=0 && !layer)return;
          var shade=cross<=0?0.7:fi<2?1:fi<4?0.82:fi===4?1:0.6;
          for(var j=0;j<r[3];j++)for(var i=0;i<r[2];i++){
            var o=((r[1]+j)*64+r[0]+i)*4;if(!pixels[o+3])continue;
            var q=[point(name,...fn(i,j)),point(name,...fn(i+1,j)),point(name,...fn(i+1,j+1)),point(name,...fn(i,j+1))];
            quads.push({z:(q[0][2]+q[1][2]+q[2][2]+q[3][2])/4,q:q,color:'rgba('+Math.round(pixels[o]*shade)+','+Math.round(pixels[o+1]*shade)+','+Math.round(pixels[o+2]*shade)+','+(pixels[o+3]/255)+')'});
          }
        });
      });
    });
    quads.sort(function(a,b){return a.z-b.z});ctx.lineJoin='round';ctx.lineWidth=0.5;
    quads.forEach(function(item){ctx.fillStyle=ctx.strokeStyle=item.color;ctx.beginPath();ctx.moveTo(item.q[0][0],item.q[0][1]);for(var i=1;i<4;i++)ctx.lineTo(item.q[i][0],item.q[i][1]);ctx.closePath();ctx.fill();ctx.stroke();});
  }
  function setPose() {
    var pose=$('render-pose').value, values=pose==='wave'?[135,0,0,0,0]:pose==='running'?[-35,35,25,-25,-8]:[0,0,0,0,0];
    if(pose!=='custom') ['ra','la','rl','ll','head'].forEach(function(n,i){$('render-'+n).value=values[i];});
    render();
  }
  function render() {
    ctx.clearRect(0,0,1280,720); ctx.fillStyle=$('render-color').value; ctx.fillRect(0,0,1280,720);
    ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,570,1280,150);
    if (loaded && $('render-view').value==='3d') draw3d();
    else if (loaded) {
      var slim=$('render-model').value==='slim', aw=slim?3:4, pose=$('render-pose').value;
      var ra=pose==='wave'?2.35:pose==='running'?-0.55:0, la=pose==='running'?0.55:0;
      var rl=pose==='running'?0.3:0, ll=pose==='running'?-0.3:0;
      part(284,357,4,12,4,20,4,36,rl); part(332,357,4,12,20,52,legacy?null:4,52,ll);
      part(284-aw*12,213,aw,12,44,20,44,36,ra);
      part(380,213,aw,12,36,52,legacy?null:52,52,la);
      part(284,213,8,12,20,20,20,36,0); part(284,117,8,8,8,8,40,8,0);
    }
    var title=$('render-title').value.trim();
    if(title){ ctx.save();ctx.font='bold 76px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=10;ctx.lineJoin='round';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.fillStyle='white';ctx.strokeText(title,850,360,760);ctx.fillText(title,850,360,760);ctx.restore(); }
  }
  function load(url, isDefault) {
    var version=++loadVersion, image=new Image();
    image.onload=function(){
      if(version!==loadVersion){ if(!isDefault) URL.revokeObjectURL(url); return; }
      if(image.width!==64 || (image.height!==64 && image.height!==32)) { status.textContent='Please choose a 64×64 or 64×32 PNG skin.'; if(!isDefault) URL.revokeObjectURL(url); return; }
      skin.clearRect(0,0,64,64);skin.drawImage(image,0,0);
      if(image.height===32){ skin.drawImage(source,0,16,16,16,16,48,16,16);skin.drawImage(source,40,16,16,16,32,48,16,16); }
      legacy=image.height===32; loaded=true; status.textContent=isDefault?'Using the default skin.':'Skin loaded. It stays in this browser.'; render(); if(!isDefault) URL.revokeObjectURL(url);
    };
    image.onerror=function(){ if(version===loadVersion) status.textContent='Could not read that PNG. Please choose a valid skin.'; if(!isDefault) URL.revokeObjectURL(url); };
    image.src=url;
  }
  $('render-skin').addEventListener('change',function(){var file=this.files && this.files[0];if(!file)return;if(!/\.png$/i.test(file.name) || (file.type && file.type!=='image/png')) { ++loadVersion;status.textContent='Please choose a PNG skin.';return; }load(URL.createObjectURL(file),false);});
  $('render-pose').addEventListener('change',setPose);
  ['ra','la','rl','ll','head'].forEach(function(n){$('render-'+n).addEventListener('input',function(){$('render-pose').value='custom';render();});});
  ['render-model','render-view','render-yaw','render-pitch','render-outer','render-title','render-color'].forEach(function(id){$(id).addEventListener('input',render);$(id).addEventListener('change',render);});
  $('render-download').addEventListener('click',function(){var a=document.createElement('a');a.download='minecraft-render.png';a.href=canvas.toDataURL('image/png');a.click();});
  render(); load('../render-dummy.png',true);
})();
