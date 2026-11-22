// Original local skin poser; no network requests or WebGL.
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)}, canvas=$('pose-canvas'), ctx=canvas.getContext('2d');
  var texture=document.createElement('canvas');texture.width=texture.height=64;
  var skin=texture.getContext('2d',{willReadFrequently:true}), image=null, legacy=false, version=0;
  function draw(){
    ctx.clearRect(0,0,512,512); if(!image)return;
    window.drawPfp3d(ctx,skin,{slim:$('pose-model').value==='slim',outer:$('pose-outer').checked,legacy:legacy,headOnly:false,
      yaw:+$('pose-yaw').value,pitch:+$('pose-pitch').value,headYaw:+$('pose-head').value,headPitch:0,scale:12,centerY:0,
      angles:{ra:+$('pose-ra').value,la:+$('pose-la').value,rl:+$('pose-rl').value,ll:+$('pose-ll').value},
      bends:{ra:+$('pose-ra-bend').value,la:+$('pose-la-bend').value,rl:+$('pose-rl-bend').value,ll:+$('pose-ll-bend').value}});
  }
  function load(url, example){
    var current=++version, img=new Image();
    function release(){if(!example)URL.revokeObjectURL(url)}
    img.onload=function(){release();if(current!==version)return;if(img.width!==64 || (img.height!==64 && img.height!==32)){ $('pose-status').textContent='Choose a 64×64 or 64×32 skin PNG.';return; }
      skin.clearRect(0,0,64,64);skin.drawImage(img,0,0);legacy=img.height===32;
      if(legacy){skin.drawImage(texture,0,16,16,16,16,48,16,16);skin.drawImage(texture,40,16,16,16,32,48,16,16);}
      image=img;$('pose-download').disabled=false;$('pose-status').textContent=example?'Using the example skin.':'Skin loaded locally.';draw();};
    img.onerror=function(){release();if(current===version)$('pose-status').textContent='Could not read the PNG.';};img.src=url;
  }
  $('pose-file').addEventListener('change',function(){var file=this.files&&this.files[0];if(!file)return;
    if(!/\.png$/i.test(file.name)||(file.type&&file.type!=='image/png')){++version;$('pose-status').textContent='Choose a PNG skin.';this.value='';return;}
    load(URL.createObjectURL(file),false);this.value='';});
  ['pose-model','pose-outer','pose-yaw','pose-pitch','pose-head','pose-ra','pose-la','pose-rl','pose-ll','pose-ra-bend','pose-la-bend','pose-rl-bend','pose-ll-bend'].forEach(function(id){$(id).addEventListener('input',draw);$(id).addEventListener('change',draw);});
  $('pose-reset').addEventListener('click',function(){['pose-ra','pose-la','pose-rl','pose-ll','pose-ra-bend','pose-la-bend','pose-rl-bend','pose-ll-bend','pose-head'].forEach(function(id){$(id).value=0});$('pose-yaw').value=25;$('pose-pitch').value=10;draw();});
  $('pose-download').addEventListener('click',function(){if(!image)return;var a=document.createElement('a');a.download='minecraft-pose.png';a.href=canvas.toDataURL('image/png');a.click();});
  draw();load('../owner-skin.png',true);
})();
