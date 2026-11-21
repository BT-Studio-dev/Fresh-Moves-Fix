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
  function render() {
    ctx.clearRect(0,0,1280,720); ctx.fillStyle=$('render-color').value; ctx.fillRect(0,0,1280,720);
    ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,570,1280,150);
    if (loaded) {
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
  ['render-model','render-pose','render-title','render-color'].forEach(function(id){$(id).addEventListener('input',render);$(id).addEventListener('change',render);});
  $('render-download').addEventListener('click',function(){var a=document.createElement('a');a.download='minecraft-render.png';a.href=canvas.toDataURL('image/png');a.click();});
  render(); load('../render-dummy.png',true);
})();
