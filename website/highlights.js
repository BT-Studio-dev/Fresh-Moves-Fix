// Local highlight painting over an uploaded image; no remote processing.
(function(){
  'use strict';
  var $=function(id){return document.getElementById(id)},canvas=$('hl-canvas'),ctx=canvas.getContext('2d');
  var image=null,version=0,strokes=[],active=null;
  function draw(){
    ctx.clearRect(0,0,512,512);if(!image)return;
    var w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,scale=Math.min(512/w,512/h);
    ctx.drawImage(image,(512-w*scale)/2,(512-h*scale)/2,w*scale,h*scale);
    // Draw only over the image alpha; the surrounding area remains transparent.
    ctx.save();ctx.globalCompositeOperation='source-atop';
    strokes.forEach(function(stroke){ctx.save();ctx.globalAlpha=stroke.opacity;ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.size;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();var p=stroke.points;ctx.moveTo(p[0].x,p[0].y);if(p.length===1){ctx.arc(p[0].x,p[0].y,stroke.size/2,0,Math.PI*2);ctx.fill();}else{for(var i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.stroke();}ctx.restore();});ctx.restore();
    $('hl-undo').disabled=!strokes.length;$('hl-clear').disabled=!strokes.length;
  }
  function point(e){var r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(512,(e.clientX-r.left)*512/r.width)),y:Math.max(0,Math.min(512,(e.clientY-r.top)*512/r.height))};}
  $('hl-file').addEventListener('change',function(){var file=this.files&&this.files[0];if(!file)return;var current=++version,status=$('hl-status');
    if(!/^(image\/png|image\/jpeg|image\/webp)$/.test(file.type)||file.size>10*1024*1024){status.textContent='Choose a PNG, JPEG or WebP image under 10 MB.';this.value='';return;}
    var url=URL.createObjectURL(file),img=new Image();img.onload=function(){URL.revokeObjectURL(url);if(current!==version)return;if(!img.width||!img.height){status.textContent='Could not read that image.';return;}image=img;strokes=[];active=null;$('hl-download').disabled=false;status.textContent='Image loaded locally. Paint highlights on the image.';draw();};img.onerror=function(){URL.revokeObjectURL(url);if(current===version)status.textContent='Could not read that image.';};img.src=url;this.value='';});
  canvas.addEventListener('pointerdown',function(e){if(!image||e.button!==0||active)return;var rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;e.preventDefault();active={id:e.pointerId,stroke:{color:$('hl-color').value,size:+$('hl-size').value,opacity:+$('hl-opacity').value/100,points:[point(e)]}};strokes.push(active.stroke);try{canvas.setPointerCapture(e.pointerId)}catch(err){}draw();});
  canvas.addEventListener('pointermove',function(e){if(!active||e.pointerId!==active.id)return;e.preventDefault();active.stroke.points.push(point(e));draw();});
  function stop(e){if(active&&active.id===e.pointerId)active=null;}
  canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
  $('hl-undo').addEventListener('click',function(){if(active)return;strokes.pop();draw();});
  $('hl-clear').addEventListener('click',function(){if(active)return;strokes=[];draw();});
  $('hl-download').addEventListener('click',function(){if(!image)return;var a=document.createElement('a');a.download='minecraft-highlights.png';a.href=canvas.toDataURL('image/png');a.click();});
  draw();
})();
