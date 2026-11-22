// Original banner compositor. Artwork is decoded locally and exported as PNG.
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)},canvas=$('banner-canvas'),ctx=canvas.getContext('2d');
  var photos={background:null,art:null},versions={background:0,art:0};
  function draw(){
    var grad=ctx.createLinearGradient(0,0,2560,1440);grad.addColorStop(0,$('banner-color1').value);grad.addColorStop(1,$('banner-color2').value);ctx.fillStyle=grad;ctx.fillRect(0,0,2560,1440);
    var bg=photos.background;
    if(bg){var w=bg.naturalWidth||bg.width,h=bg.naturalHeight||bg.height,scale=Math.max(2560/w,1440/h);ctx.drawImage(bg,(2560-w*scale)/2,(1440-h*scale)/2,w*scale,h*scale);}
    var art=photos.art;
    if(art){var aw=art.naturalWidth||art.width,ah=art.naturalHeight||art.height,sz=+$('banner-art-size').value,as=Math.min(sz/aw,sz/ah),x=+$('banner-art-x').value,y=+$('banner-art-y').value;ctx.save();if($('banner-glow').checked){ctx.shadowColor=$('banner-glow-color').value;ctx.shadowBlur=55;}ctx.drawImage(art,x-aw*as/2,y-ah*as/2,aw*as,ah*as);ctx.restore();}
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=$('banner-text-color').value;var tx=+$('banner-text-x').value;
    ctx.font='bold '+$('banner-text-size').value+'px sans-serif';ctx.fillText($('banner-title').value,tx,680,1450);
    ctx.font='48px sans-serif';ctx.fillText($('banner-subtitle').value,tx,780,1450);ctx.restore();
  }
  function setupUpload(kind){var input=$('banner-'+kind),status=$('banner-'+kind+'-status');
    input.addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;var current=++versions[kind];
      if(!/^(image\/png|image\/jpeg|image\/webp)$/.test(f.type)||f.size>10*1024*1024){status.textContent='Choose a PNG, JPEG or WebP image under 10 MB.';this.value='';return;}
      var url=URL.createObjectURL(f),img=new Image();img.onload=function(){URL.revokeObjectURL(url);if(current!==versions[kind])return;if(!img.width||!img.height){status.textContent='Could not read that image.';return;}photos[kind]=img;status.textContent='Image loaded locally.';draw();};img.onerror=function(){URL.revokeObjectURL(url);if(current===versions[kind])status.textContent='Could not read that image.';};img.src=url;this.value='';});
    $('banner-'+kind+'-remove').addEventListener('click',function(){++versions[kind];photos[kind]=null;status.textContent='Image removed.';draw();});
  }
  setupUpload('background');setupUpload('art');
  ['banner-color1','banner-color2','banner-title','banner-subtitle','banner-text-color','banner-text-x','banner-text-size','banner-art-x','banner-art-y','banner-art-size','banner-glow','banner-glow-color'].forEach(function(id){$(id).addEventListener('input',draw);$(id).addEventListener('change',draw)});
  $('banner-guide').addEventListener('change',function(){$('banner-safe').hidden=!this.checked;});
  $('banner-download').addEventListener('click',function(){var a=document.createElement('a');a.download='youtube-banner.png';a.href=canvas.toDataURL('image/png');a.click();});draw();
})();
