// A small local compositor for a previously rendered avatar image.
(function () {
  'use strict';
  var $=function(id){return document.getElementById(id)},canvas=$('studio-pfp-canvas'),ctx=canvas.getContext('2d');
  var layer=document.createElement('canvas');layer.width=layer.height=512;var lc=layer.getContext('2d');
  var avatar=null,version=0;
  function draw(){
    ctx.clearRect(0,0,512,512);ctx.save();
    if($('studio-pfp-shape').value==='circle'){ctx.beginPath();ctx.arc(256,256,256,0,Math.PI*2);ctx.clip();}
    if(!$('studio-pfp-transparent').checked){var bg=ctx.createLinearGradient(0,0,512,512);bg.addColorStop(0,$('studio-pfp-bg1').value);bg.addColorStop(1,$('studio-pfp-bg2').value);ctx.fillStyle=bg;ctx.fillRect(0,0,512,512);}
    if(avatar){
      lc.clearRect(0,0,512,512);lc.save();
      var w=avatar.naturalWidth||avatar.width,h=avatar.naturalHeight||avatar.height,size=+$('studio-pfp-size').value*4.2,scale=Math.min(size/w,size/h);
      lc.drawImage(avatar,(512-w*scale)/2,(512-h*scale)/2,w*scale,h*scale);
      var opacity=+$('studio-pfp-overlay-opacity').value/100;
      if(opacity){lc.globalCompositeOperation='source-atop';lc.globalAlpha=opacity;var tint=lc.createLinearGradient(0,0,512,512);tint.addColorStop(0,$('studio-pfp-overlay').value);tint.addColorStop(1,'#000000');lc.fillStyle=tint;lc.fillRect(0,0,512,512);}
      lc.restore();ctx.save();
      if($('studio-pfp-shadow').checked){ctx.shadowColor=$('studio-pfp-shadow-color').value;ctx.shadowBlur=20;ctx.shadowOffsetX=12;ctx.shadowOffsetY=14;}
      ctx.drawImage(layer,0,0);ctx.restore();
    }
    ctx.restore();
  }
  $('studio-pfp-file').addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;var current=++version,status=$('studio-pfp-status');
    if(!/^(image\/png|image\/jpeg|image\/webp)$/.test(f.type)||f.size>10*1024*1024){status.textContent='Choose a PNG, JPEG or WebP image under 10 MB.';this.value='';return;}
    var url=URL.createObjectURL(f),img=new Image();img.onload=function(){URL.revokeObjectURL(url);if(current!==version)return;if(!img.width||!img.height){status.textContent='Could not read that image.';return;}avatar=img;status.textContent='Image loaded locally. Transparent PNGs work best.';draw();};img.onerror=function(){URL.revokeObjectURL(url);if(current===version)status.textContent='Could not read that image.';};img.src=url;this.value='';
  });
  ['studio-pfp-bg1','studio-pfp-bg2','studio-pfp-transparent','studio-pfp-shape','studio-pfp-size','studio-pfp-overlay','studio-pfp-overlay-opacity','studio-pfp-shadow','studio-pfp-shadow-color'].forEach(function(id){$(id).addEventListener('input',draw);$(id).addEventListener('change',draw);});
  $('studio-pfp-remove').addEventListener('click',function(){++version;avatar=null;$('studio-pfp-status').textContent='Image removed.';draw();});
  $('studio-pfp-download').addEventListener('click',function(){var a=document.createElement('a');a.download='minecraft-pfp-edit.png';a.href=canvas.toDataURL('image/png');a.click();});
  draw();
})();
