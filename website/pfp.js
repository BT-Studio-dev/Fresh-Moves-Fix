// Original face-based profile picture maker; all image processing stays local.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('pfp-canvas'), ctx = canvas.getContext('2d');
  var canBlur = 'filter' in ctx;
  if (!canBlur) { $('pfp-blur').disabled = true; $('pfp-blur-status').hidden = false; $('pfp-blur-status').textContent = 'Sky blur is not supported in this browser.'; }
  var source = document.createElement('canvas'); source.width = source.height = 64;
  var skin = source.getContext('2d', { willReadFrequently: true }), legacy = false;
  var last3d = 'headshot';
  var image = null, version = 0, status = $('pfp-status'), download = $('pfp-download');
  function syncControls() {
    var preset = $('pfp-preset').value;
    if (preset !== 'flat') last3d = preset;
    $('pfp-quick-3d').setAttribute('aria-pressed', preset !== 'flat' ? 'true' : 'false');
    Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-preset]'), function (item) {
      item.setAttribute('aria-pressed', item.getAttribute('data-pfp-preset') === preset ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-target]'), function (item) {
      item.setAttribute('aria-pressed', $(item.getAttribute('data-pfp-target')).value === item.getAttribute('data-value') ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-color]'), function (item) {
      var selected = $('pfp-background').value === 'color' && $('pfp-color').value.toLowerCase() === item.getAttribute('data-pfp-color');
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }
  function draw() {
    syncControls();
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    if ($('pfp-shape').value === 'circle') {
      ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.clip();
    }
    if ($('pfp-background').value === 'color') {
      ctx.fillStyle = $('pfp-color').value; ctx.fillRect(0, 0, 512, 512);
    }
    var background = $('pfp-background').value;
    if (background === 'day' || background === 'night') {
      var night = background === 'night', sky = ctx.createLinearGradient(0, 0, 0, 512);
      sky.addColorStop(0, night ? '#111b3b' : '#4789c1');
      sky.addColorStop(1, night ? '#414b77' : '#c7dcf0');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 512, 512);
      ctx.save();
      if (canBlur && $('pfp-blur').checked) ctx.filter = 'blur(8px)';
      if (night) {
        ctx.fillStyle = '#e4ecff';
        [[42,56],[119,97],[182,40],[304,64],[469,140],[67,205],[449,252],[323,171],[162,191],[90,310],[474,55]].forEach(function (star) {ctx.fillRect(star[0],star[1],3,3);});
      }
      // Pixel-style celestial body; intentionally static, not weather or real-time astronomy.
      ctx.fillStyle = night ? '#e4e9f6' : '#fff2cb'; ctx.fillRect(385, 58, 62, 62);
      if (night) {ctx.fillStyle='#bec8df';ctx.fillRect(396,69,10,10);ctx.fillRect(422,92,13,13);}
      ctx.restore();
    }
    if (image) {
      var preset = $('pfp-preset').value, zoom = Number($('pfp-size').value) / 80;
      if (preset === 'flat') {
        var size = Math.round(410 * zoom), left = Math.round((512 - size) / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 8, 8, 8, 8, left, left, size, size);
        if ($('pfp-outer').checked) ctx.drawImage(source, 40, 8, 8, 8, left, left, size, size);
      } else {
        var head = preset === 'head', full = preset === 'full' || preset === 'wave';
        window.drawPfp3d(ctx, skin, {slim: $('pfp-model').value === 'slim', outer: $('pfp-outer').checked, legacy: legacy,
          yaw: +$('pfp-yaw').value, pitch: +$('pfp-pitch').value, headYaw: +$('pfp-head-yaw').value, headPitch: +$('pfp-head-pitch').value, angles: preset === 'wave' ? {ra: -135} : {},
          headOnly: head, scale: (head ? 36 : full ? 12 : 19) * zoom, centerY: head ? 12 : full ? 0 : 7});
      }
    }
    ctx.restore();
  }
  function load(url, isDefault) {
    var current = ++version, candidate = new Image();
    function release() { if (!isDefault) URL.revokeObjectURL(url); }
    candidate.onload = function () {
      release(); if (current !== version) return;
      if (candidate.width !== 64 || (candidate.height !== 64 && candidate.height !== 32)) {
        status.textContent = 'Please choose a 64×64 or 64×32 PNG skin.'; return;
      }
      skin.clearRect(0, 0, 64, 64); skin.drawImage(candidate, 0, 0);
      legacy = candidate.height === 32;
      if (legacy) { skin.drawImage(source, 0, 16, 16, 16, 16, 48, 16, 16); skin.drawImage(source, 40, 16, 16, 16, 32, 48, 16, 16); }
      image = candidate; download.disabled = false;
      status.textContent = isDefault ? 'Using the example skin.' : 'Skin loaded. It stays in this browser.';
      mapDraw(); draw();
    };
    candidate.onerror = function () { release(); if (current === version) status.textContent = 'Could not read that PNG. Please choose a valid skin.'; };
    candidate.src = url;
  }
  // A small 64×64 texture map keeps editing lightweight and works without WebGL.
  var map = $('pfp-paint-map'), mapCtx = map.getContext('2d'), paintLayer = 'base', paintDrag = null;
  var paintColour = $('pfp-paint-color'), paintHex = $('pfp-paint-hex');
  if (window.FMFUI) window.FMFUI.colour($('pfp-color'));
  function skinRects(layer) {
    var slim = $('pfp-model').value === 'slim', arm = slim ? 3 : 4;
    var boxes = layer === 'base' ? [[0,0,8,8,8],[16,16,8,12,4],[40,16,arm,12,4],[32,48,arm,12,4],[0,16,4,12,4],[16,48,4,12,4]] : [[32,0,8,8,8],[16,32,8,12,4],[40,32,arm,12,4],[48,48,arm,12,4],[0,32,4,12,4],[0,48,4,12,4]];
    var rects = [];
    boxes.forEach(function (p) { var u=p[0],v=p[1],w=p[2],h=p[3],d=p[4];
      rects.push([u+d,v+d,w,h],[u+2*d+w,v+d,w,h],[u,v+d,d,h],[u+d+w,v+d,d,h],[u+d,v,w,d],[u+d+w,v,w,d]);
    }); return rects;
  }
  function mapDraw() {
    mapCtx.clearRect(0,0,256,256); mapCtx.imageSmoothingEnabled=false;
    if (image) mapCtx.drawImage(source,0,0,256,256);
    mapCtx.fillStyle='rgba(0,0,0,.58)'; mapCtx.fillRect(0,0,256,256);
    if (image) skinRects(paintLayer).forEach(function(r) { mapCtx.drawImage(source,r[0],r[1],r[2],r[3],r[0]*4,r[1]*4,r[2]*4,r[3]*4); });
  }
  function isPaintable(x,y) { return skinRects(paintLayer).some(function(r) { return x>=r[0] && x<r[0]+r[2] && y>=r[1] && y<r[1]+r[3]; }); }
  function mapPoint(e) {
    var r=map.getBoundingClientRect(); if (!r.width || !r.height) return null;
    var x=Math.floor((e.clientX-r.left)*64/r.width), y=Math.floor((e.clientY-r.top)*64/r.height);
    return x>=0 && x<64 && y>=0 && y<64 ? [x,y] : null;
  }
  function paintTo(point) {
    if (!point || !image || !paintDrag) return;
    var a=paintDrag.last || point, dx=point[0]-a[0], dy=point[1]-a[1], steps=Math.max(Math.abs(dx),Math.abs(dy));
    skin.fillStyle=paintDrag.white?'#ffffff':paintColour.value;
    var painted=false;
    for (var n=0;n<=steps;n++) { var x=Math.round(a[0]+(steps?dx*n/steps:0)), y=Math.round(a[1]+(steps?dy*n/steps:0));
      if (isPaintable(x,y)) { skin.clearRect(x,y,1,1); skin.fillRect(x,y,1,1); painted=true; }
    }
    paintDrag.last=point;
    if (!painted) return;
    if (paintLayer==='overlay') { legacy=false; $('pfp-outer').checked=true; }
    $('pfp-paint-status').textContent='Skin edited in this browser. The preview is updated.';
    mapDraw(); draw();
  }
  map.addEventListener('pointerdown',function(e) { if (!image || (e.button!==0 && e.button!==2)) return; e.preventDefault(); paintDrag={id:e.pointerId,white:e.button===2,last:null};try{map.setPointerCapture(e.pointerId)}catch(err){} paintTo(mapPoint(e)); });
  map.addEventListener('pointermove',function(e) {if(paintDrag && e.pointerId===paintDrag.id)paintTo(mapPoint(e));});
  function stopPaint(e) {if(paintDrag && e.pointerId===paintDrag.id)paintDrag=null;}
  map.addEventListener('pointerup',stopPaint);map.addEventListener('pointercancel',stopPaint);map.addEventListener('lostpointercapture',stopPaint);map.addEventListener('contextmenu',function(e){e.preventDefault();});
  Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-layer]'),function(button){button.addEventListener('click',function(){paintLayer=button.getAttribute('data-pfp-layer');Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-layer]'),function(item){item.setAttribute('aria-pressed',item===button?'true':'false');});mapDraw();});});
  function backgroundColourChanged() { $('pfp-background').value='color'; $('pfp-bg-hex').value=$('pfp-color').value; draw(); }
  $('pfp-color').addEventListener('input', backgroundColourChanged);
  $('pfp-color').addEventListener('change', backgroundColourChanged);
  $('pfp-bg-hex').addEventListener('input', function () { var value=this.value.trim(); if(value.charAt(0)!=='#') value='#'+value; if(/^#[0-9a-f]{6}$/i.test(value)){ $('pfp-color').value=value; $('pfp-background').value='color'; draw(); } });
  $('pfp-bg-hex').addEventListener('change',function(){this.value=$('pfp-color').value;});
  paintColour.addEventListener('input',function(){paintHex.value=paintColour.value;});
  paintHex.addEventListener('input',function(){var value=paintHex.value.trim();if(value.charAt(0)!=='#')value='#'+value;if(/^#[0-9a-f]{6}$/i.test(value))paintColour.value=value;});
  paintHex.addEventListener('change',function(){paintHex.value=paintColour.value;});
  $('pfp-model').addEventListener('change',mapDraw);
  // Mouse or touch controls update the same sliders as the accessible controls.
  var drag = null;
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  canvas.addEventListener('pointerdown', function (e) {
    if ((e.button !== 0 && e.button !== 2) || $('pfp-preset').value === 'flat') return;
    e.preventDefault();
    var head = e.button === 2, x = $(head ? 'pfp-head-yaw' : 'pfp-yaw'), y = $(head ? 'pfp-head-pitch' : 'pfp-pitch');
    drag = {id:e.pointerId, x:e.clientX, y:e.clientY, startX:+x.value, startY:+y.value, xControl:x, yControl:y};
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    canvas.classList.add('pfp-dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    drag.xControl.value = clamp(Math.round(drag.startX + (e.clientX - drag.x) * 0.5), +drag.xControl.min, +drag.xControl.max);
    drag.yControl.value = clamp(Math.round(drag.startY + (e.clientY - drag.y) * 0.5), +drag.yControl.min, +drag.yControl.max);
    draw();
  });
  function endDrag(e) { if (drag && drag.id === e.pointerId) { drag = null; canvas.classList.remove('pfp-dragging'); } }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) {
    if (!e.deltaY) return; e.preventDefault();
    var zoom = $('pfp-size'); zoom.value = clamp(+zoom.value + (e.deltaY < 0 ? 5 : -5), +zoom.min, +zoom.max); draw();
  }, {passive:false});
  $('pfp-skin').addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    if (!/\.png$/i.test(file.name) || (file.type && file.type !== 'image/png')) { ++version; status.textContent = 'Please choose a PNG skin.'; return; }
    load(URL.createObjectURL(file), false);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-preset]'), function (button) {
    button.addEventListener('click', function () {
      $('pfp-preset').value = button.getAttribute('data-pfp-preset');
      Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-preset]'), function (item) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      draw();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-target]'), function (button) {
    button.addEventListener('click', function () {
      var target = button.getAttribute('data-pfp-target');
      $(target).value = button.getAttribute('data-value');
      if (target === 'pfp-model') mapDraw();
      Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-target]'), function (item) {
        if (item.getAttribute('data-pfp-target') === target) item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      draw();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-color]'), function (button) {
    button.addEventListener('click', function () {
      $('pfp-color').value = button.getAttribute('data-pfp-color');
      $('pfp-bg-hex').value = $('pfp-color').value;
      $('pfp-background').value = 'color';
      draw();
    });
  });
  $('pfp-quick-3d').addEventListener('click', function () {
    $('pfp-preset').value = $('pfp-preset').value === 'flat' ? last3d : 'flat';
    draw();
  });
  ['pfp-background', 'pfp-color', 'pfp-shape', 'pfp-size', 'pfp-outer', 'pfp-preset', 'pfp-model', 'pfp-yaw', 'pfp-pitch', 'pfp-blur', 'pfp-head-yaw', 'pfp-head-pitch'].forEach(function (id) {
    $(id).addEventListener('input', draw); $(id).addEventListener('change', draw);
  });
  download.addEventListener('click', function () {
    if (!image) return;
    var a = document.createElement('a'); a.download = 'minecraft-pfp.png'; a.href = canvas.toDataURL('image/png'); a.click();
  });
  mapDraw(); draw(); load('../owner-skin.png', true);
})();
