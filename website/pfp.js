// Original face-based profile picture maker; all image processing stays local.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('pfp-canvas'), ctx = canvas.getContext('2d');
  var canBlur = 'filter' in ctx;
  if (!canBlur) { $('pfp-blur').disabled = true; $('pfp-blur-status').hidden = false; $('pfp-blur-status').textContent = 'Background blur is not supported in this browser.'; }
  var source = document.createElement('canvas'); source.width = source.height = 64;
  var skin = source.getContext('2d', { willReadFrequently: true }), legacy = false;
  var last3d = 'headshot';
  var backgroundImage = null, backgroundVersion = 0;
  var image = null, version = 0, status = $('pfp-status'), download = $('pfp-download');
  function syncControls() {
    $('pfp-code-swatch').style.backgroundColor = $('pfp-color').value;
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
  var extraPoseIds=['model-roll','head-roll','body-x','body-y','body-z','ra-x','ra-y','la-x','la-y','rl-x','rl-y','rl-z','ll-x','ll-y','ll-z'];
  function poseRotations() {
    function val(id){return +$('pfp-'+id).value;}
    return {head:{z:val('head-roll')},body:{x:val('body-x'),y:val('body-y'),z:val('body-z')},ra:{x:val('ra-x'),y:val('ra-y')},la:{x:val('la-x'),y:val('la-y')},rl:{x:val('rl-x'),y:val('rl-y'),z:val('rl-z')},ll:{x:val('ll-x'),y:val('ll-y'),z:val('ll-z')}};
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
    if (background === 'gradient') {
      var gradient=ctx.createRadialGradient(256,256,0,256,256,362);
      gradient.addColorStop(0,$('pfp-color').value);gradient.addColorStop(1,$('pfp-gradient-edge').value);
      ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    }
    if (background === 'image' && backgroundImage) {
      // Center-crop to fill the square, preserving the original aspect ratio.
      var bw = backgroundImage.naturalWidth || backgroundImage.width, bh = backgroundImage.naturalHeight || backgroundImage.height;
      var side = Math.min(bw, bh);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      var blurBackground = canBlur && $('pfp-blur').checked;
      if (blurBackground) ctx.filter = 'blur(8px)';
      // Extend the image beyond the canvas to avoid transparent blur fringes.
      var edge = blurBackground ? 24 : 0;
      ctx.drawImage(backgroundImage, (bw-side)/2, (bh-side)/2, side, side, -edge, -edge, 512+2*edge, 512+2*edge);
      ctx.restore();
    }
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
    if ($('pfp-floor').checked) { ctx.fillStyle=$('pfp-floor-color').value; ctx.fillRect(0,440,512,72); }
    if (image) {
      var preset = $('pfp-preset').value, zoom = Number($('pfp-size').value) / 80;
      if (preset === 'flat') {
        var size = Math.round(410 * zoom), left = Math.round((512 - size) / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 8, 8, 8, 8, left + +$('pfp-position-x').value, left + +$('pfp-position-y').value, size, size);
        if ($('pfp-outer').checked) ctx.drawImage(source, 40, 8, 8, 8, left + +$('pfp-position-x').value, left + +$('pfp-position-y').value, size, size);
      } else {
        var head = preset === 'head', full = preset === 'full' || preset === 'wave';
        window.drawPfp3d(ctx, skin, {slim: $('pfp-model').value === 'slim', outer: $('pfp-outer').checked, legacy: legacy,
          yaw: +$('pfp-yaw').value, pitch: +$('pfp-pitch').value, headYaw: +$('pfp-head-yaw').value, headPitch: +$('pfp-head-pitch').value, roll: +$('pfp-model-roll').value, rotations: poseRotations(), angles: {ra: (preset === 'wave' ? -135 : 0) + +$('pfp-arm-right').value, la: +$('pfp-arm-left').value}, brightness: +$('pfp-light').value / 100, shading: +$('pfp-shading').value / 100, lightDirection: +$('pfp-light-direction').value, lightHeight: +$('pfp-light-height').value, lightStrength: +$('pfp-light-strength').value / 100, lightColor:$('pfp-light-color').value,
          offsetX: +$('pfp-position-x').value, offsetY: +$('pfp-position-y').value, headOnly: head, scale: (head ? 36 : full ? 12 : 19) * zoom, centerY: head ? 12 : full ? 0 : 7});
      }
    }
    ctx.restore();
    // Apply optional finishing adjustments to the complete output, preserving alpha.
    var contrast = +$('pfp-contrast').value / 100, saturation = +$('pfp-saturation').value / 100;
    if (contrast !== 1 || saturation !== 1) {
      var frame = ctx.getImageData(0, 0, 512, 512), data = frame.data;
      for (var i = 0; i < data.length; i += 4) {
        var gray = data[i]*0.2126 + data[i+1]*0.7152 + data[i+2]*0.0722;
        for (var c = 0; c < 3; c++) data[i+c] = ((gray + (data[i+c]-gray)*saturation) - 128)*contrast + 128;
      }
      ctx.putImageData(frame, 0, 0);
    }
  }
  function load(url, isDefault, defaultMessage) {
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
      image = candidate; download.disabled = false; renderAvatarViews();
      status.textContent = isDefault ? (defaultMessage || 'Using the example skin.') : 'Skin loaded. It stays in this browser.';
      draw();
    };
    candidate.onerror = function () { release(); if (current === version) status.textContent = 'Could not read that PNG. Please choose a valid skin.'; };
    candidate.src = url;
  }
  $('pfp-use-dummy').addEventListener('click', function () { $('pfp-skin').value=''; load('../pfp-dummy.png', true, 'Using the Dummy skin.'); });
  if (window.FMFUI) window.FMFUI.colour($('pfp-color'));
  function backgroundColourChanged() { if($('pfp-background').value!=='gradient')$('pfp-background').value='color'; $('pfp-bg-hex').value=$('pfp-color').value; draw(); }
  $('pfp-color').addEventListener('input', backgroundColourChanged);
  $('pfp-color').addEventListener('change', backgroundColourChanged);
  $('pfp-bg-hex').addEventListener('input', function () { var value=this.value.trim(); if(value.charAt(0)!=='#') value='#'+value; if(/^#[0-9a-f]{6}$/i.test(value)){ $('pfp-color').value=value; if($('pfp-background').value!=='gradient')$('pfp-background').value='color'; draw(); } });
  $('pfp-bg-hex').addEventListener('change',function(){this.value=$('pfp-color').value;});
  // Remember the gallery visibility in this browser, including across page navigation.
  try { var savedAvatarVisibility = localStorage.getItem('fmf-pfp-avatar-views'); if (savedAvatarVisibility === 'off' || savedAvatarVisibility === 'on') $('avatar-show').checked = savedAvatarVisibility === 'on'; } catch (e) {}
  $('avatar-show').addEventListener('change', function () { try { localStorage.setItem('fmf-pfp-avatar-views', this.checked ? 'on' : 'off'); } catch (e) {} });
  // Generate the gallery only on request to avoid nine renders while dragging.
  var avatarViews=[
    {id:'head-angle',head:true,yaw:35,pitch:18},{id:'head-front',head:true,yaw:0,pitch:0},{id:'head-side',head:true,yaw:90,pitch:0},
    {id:'body-front',yaw:0,pitch:0},{id:'body-angle',yaw:35,pitch:12},{id:'body-side',yaw:90,pitch:0},
    {id:'body-wave',yaw:25,pitch:10,angles:{ra:-135}},{id:'body-step',yaw:25,pitch:10,angles:{ra:35,la:-35,rl:-20,ll:20}},{id:'body-tilt',yaw:-35,pitch:18,angles:{ra:-35,la:35}}
  ];
  function renderAvatarViews() {
    if(!$('avatar-show').checked){$('avatar-results').hidden=true;$('avatar-status').textContent='Avatar views hidden.';return;}
    if(!image){$('avatar-results').hidden=true;$('avatar-status').textContent='Loading skin…';return;}
    var size=+$('avatar-quality').value,work=document.createElement('canvas');work.width=work.height=512;var wc=work.getContext('2d');
    avatarViews.forEach(function(v){wc.clearRect(0,0,512,512);window.drawPfp3d(wc,skin,{slim:$('pfp-model').value==='slim',outer:$('pfp-outer').checked,legacy:legacy,headOnly:!!v.head,yaw:v.yaw,pitch:v.pitch,headYaw:0,headPitch:0,angles:v.angles||{},scale:v.head?36:12,centerY:v.head?12:0,shading:$('avatar-shading').checked?1:0});
      var out=$('avatar-'+v.id);out.width=out.height=size;var dest=out.getContext('2d');dest.clearRect(0,0,size,size);dest.imageSmoothingEnabled=false;dest.drawImage(work,0,0,size,size);
    });$('avatar-results').hidden=false;$('avatar-status').textContent='Views ready. Choose a picture to download.';
  }
  avatarViews.forEach(function(v){$('download-'+v.id).addEventListener('click',function(){if(!image||$('avatar-results').hidden)return;var a=document.createElement('a');a.download='minecraft-'+v.id+'.png';a.href=$('avatar-'+v.id).toDataURL('image/png');a.click();});});
  ['pfp-model','pfp-outer','avatar-quality','avatar-shading','avatar-show'].forEach(function(id){$(id).addEventListener('change',renderAvatarViews);});
  // The draggable light pad mirrors accessible direction and height sliders.
  var lightPad=$('pfp-light-pad'), lightMarker=$('pfp-light-marker'), lightPointer=null;
  function syncLightPad(){lightMarker.style.left=((+$('pfp-light-direction').value+180)/360*100)+'%';lightMarker.style.top=((90-+$('pfp-light-height').value)/90*100)+'%';}
  function updateLightPad(e){var r=lightPad.getBoundingClientRect();if(!r.width||!r.height)return;var x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));$('pfp-light-direction').value=Math.round(x*360-180);$('pfp-light-height').value=Math.round((1-y)*90);syncLightPad();draw();}
  lightPad.addEventListener('pointerdown',function(e){if(e.button!==0)return;e.preventDefault();lightPointer=e.pointerId;try{lightPad.setPointerCapture(e.pointerId)}catch(err){}updateLightPad(e);});
  lightPad.addEventListener('pointermove',function(e){if(e.pointerId===lightPointer)updateLightPad(e);});
  function stopLight(e){if(e.pointerId===lightPointer)lightPointer=null;}
  lightPad.addEventListener('pointerup',stopLight);lightPad.addEventListener('pointercancel',stopLight);lightPad.addEventListener('lostpointercapture',stopLight);
  ['pfp-light-direction','pfp-light-height'].forEach(function(id){$(id).addEventListener('input',syncLightPad);$(id).addEventListener('change',syncLightPad);});syncLightPad();
  // Mouse or touch controls update the same sliders as the accessible controls.
  var drag = null, dragMode = 'move';
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  ['move','rotate'].forEach(function(mode){$('pfp-mode-'+mode).addEventListener('click',function(){dragMode=mode;$('pfp-mode-move').setAttribute('aria-pressed',mode==='move'?'true':'false');$('pfp-mode-rotate').setAttribute('aria-pressed',mode==='rotate'?'true':'false');});});
  $('pfp-reset-view').addEventListener('click',function(){$('pfp-yaw').value=25;$('pfp-pitch').value=10;$('pfp-position-x').value=0;$('pfp-position-y').value=0;$('pfp-size').value=80;draw();});
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.button !== 2) return;
    var mode=e.button===2?'head':(e.shiftKey||dragMode==='rotate')?'camera':'move';
    if(mode!=='move' && $('pfp-preset').value==='flat')return;
    var rect=canvas.getBoundingClientRect(); if(!rect.width || !rect.height)return;
    e.preventDefault();
    var x=$(mode==='move'?'pfp-position-x':mode==='head'?'pfp-head-yaw':'pfp-yaw');
    var y=$(mode==='move'?'pfp-position-y':mode==='head'?'pfp-head-pitch':'pfp-pitch');
    drag={mode:mode,id:e.pointerId,x:e.clientX,y:e.clientY,startX:+x.value,startY:+y.value,xControl:x,yControl:y,scaleX:mode==='move'?512/rect.width:0.5,scaleY:mode==='move'?512/rect.height:0.5};
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    canvas.classList.add('pfp-dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var nextX=Math.round(drag.startX + (e.clientX - drag.x) * drag.scaleX);
    // Wrap camera yaw for continuous rotation; other controls stay bounded.
    if(drag.mode==='camera') nextX=((nextX+180)%360+360)%360-180;
    drag.xControl.value = clamp(nextX, +drag.xControl.min, +drag.xControl.max);
    drag.yControl.value = clamp(Math.round(drag.startY + (e.clientY - drag.y) * drag.scaleY), +drag.yControl.min, +drag.yControl.max);
    draw();
  });
  function endDrag(e) { if (drag && drag.id === e.pointerId) { drag = null; canvas.classList.remove('pfp-dragging'); } }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) {
    if (!e.deltaY) return; e.preventDefault();
    var zoom = $('pfp-size'); zoom.value = clamp(+zoom.value + (e.deltaY < 0 ? 5 : -5), +zoom.min, +zoom.max); draw();
  }, {passive:false});
  $('pfp-bg-upload').addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    var current = ++backgroundVersion, message = $('pfp-bg-status');
    if (!/^(image\/png|image\/jpeg|image\/webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      message.textContent = 'Choose a PNG, JPEG or WebP image under 10 MB.'; this.value = ''; return;
    }
    var url = URL.createObjectURL(file), candidate = new Image();
    candidate.onload = function () {
      URL.revokeObjectURL(url); if (current !== backgroundVersion) return;
      if (!candidate.width || !candidate.height) { message.textContent = 'Could not read that image.'; return; }
      backgroundImage = candidate;
      $('pfp-background').value = 'image'; message.textContent = 'Background loaded in this browser.'; draw();
    };
    candidate.onerror = function () { URL.revokeObjectURL(url); if (current === backgroundVersion) message.textContent = 'Could not read that image. Try another file.'; };
    candidate.src = url; this.value = '';
  });
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
      if(target==='pfp-model')renderAvatarViews();
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
  // Keep themed popups inside the viewport even in the multi-column controls.
  ['pfp-gradient-edge','pfp-light-color','pfp-floor-color'].forEach(function(id){
    if(!window.FMFUI)return;
    var input=$(id);window.FMFUI.colour(input);
    var wrap=input.nextElementSibling, trigger=wrap && wrap.querySelector('.sw'), popup=wrap && wrap.querySelector('.uipick');
    if(!trigger||!popup)return;
    trigger.addEventListener('click',function(){
      if(popup.hidden)return;var r=trigger.getBoundingClientRect(), width=popup.offsetWidth, height=popup.offsetHeight;
      var left=Math.max(4,Math.min(r.left,window.innerWidth-width-4)),top=r.bottom+6;
      if(top+height>window.innerHeight-4)top=Math.max(4,r.top-height-6);
      popup.style.left=left+'px';popup.style.top=top+'px';
    });
    window.addEventListener('scroll',function(){if(!popup.hidden)popup.hidden=true;},true);
  });
  function syncSceneSwatches(id){
    var value=$(id).value.toLowerCase();Array.prototype.forEach.call(document.querySelectorAll('[data-scene-target="'+id+'"]'),function(button){button.setAttribute('aria-pressed',button.getAttribute('data-scene-color')===value?'true':'false');});
  }
  ['pfp-gradient-edge','pfp-light-color','pfp-floor-color'].forEach(function(id){
    function activate(){if(id==='pfp-gradient-edge')$('pfp-background').value='gradient';if(id==='pfp-floor-color')$('pfp-floor').checked=true;if(id==='pfp-light-color' && +$('pfp-light-strength').value===0)$('pfp-light-strength').value=50;syncSceneSwatches(id);draw();}
    $(id).addEventListener('input',activate);$(id).addEventListener('change',activate);syncSceneSwatches(id);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-scene-target]'),function(button){button.addEventListener('click',function(){var input=$(button.getAttribute('data-scene-target'));input.value=button.getAttribute('data-scene-color');input.dispatchEvent(new Event('input',{bubbles:true}));});});
  ['pfp-background', 'pfp-color', 'pfp-shape', 'pfp-size', 'pfp-outer', 'pfp-preset', 'pfp-model', 'pfp-yaw', 'pfp-pitch', 'pfp-blur', 'pfp-head-yaw', 'pfp-head-pitch', 'pfp-position-x', 'pfp-position-y', 'pfp-arm-right', 'pfp-arm-left', 'pfp-light', 'pfp-shading', 'pfp-light-direction', 'pfp-light-height', 'pfp-light-strength', 'pfp-light-color', 'pfp-gradient-edge', 'pfp-floor', 'pfp-floor-color', 'pfp-contrast', 'pfp-saturation'].forEach(function (id) {
    $(id).addEventListener('input', draw); $(id).addEventListener('change', draw);
  });
  extraPoseIds.forEach(function(id){$('pfp-'+id).addEventListener('input',draw);$('pfp-'+id).addEventListener('change',draw);});
  $('pfp-reset-pose').addEventListener('click',function(){extraPoseIds.forEach(function(id){$('pfp-'+id).value=0;});['pfp-head-yaw','pfp-head-pitch','pfp-position-x','pfp-position-y','pfp-arm-right','pfp-arm-left'].forEach(function(id){$(id).value=0;});$('pfp-yaw').value=25;$('pfp-pitch').value=10;draw();});
  // A small versioned JSON format shares only pose values, never skin files.
  var sharePoseIds=['pfp-yaw','pfp-pitch','pfp-head-yaw','pfp-head-pitch','pfp-arm-right','pfp-arm-left'].concat(extraPoseIds.map(function(id){return 'pfp-'+id;}));
  $('pfp-pose-copy').addEventListener('click',function(){
    var values={};sharePoseIds.forEach(function(id){values[id]=Number($(id).value);});
    var text=JSON.stringify({format:'fmf-pfp-pose',version:1,preset:$('pfp-preset').value,values:values,position:{x:+$('pfp-position-x').value,y:+$('pfp-position-y').value}});
    var field=$('pfp-pose-data'),message=$('pfp-pose-share-status');field.value=text;
    if(navigator.clipboard && navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){message.textContent='Pose copied. Skin is not included.';},function(){field.focus();field.select();message.textContent='Copy failed; the settings are selected for you to copy manually.';});}
    else {field.focus();field.select();message.textContent='Settings selected. Copy them manually.';}
  });
  function importExternalPose(data) {
    if(!data || typeof data!=='object' || Array.isArray(data) || data.format !== undefined) return false;
    var maps={head:['pfp-head-pitch','pfp-head-yaw','pfp-head-roll'],rightarm:['pfp-ra-x','pfp-ra-y','pfp-arm-right'],leftarm:['pfp-la-x','pfp-la-y','pfp-arm-left'],rightleg:['pfp-rl-x','pfp-rl-y','pfp-rl-z'],leftleg:['pfp-ll-x','pfp-ll-y','pfp-ll-z'],body:['pfp-body-x','pfp-body-y','pfp-body-z']};
    var updates={}, found=false, invalid=false;
    Object.keys(maps).forEach(function(key){
      if(!Object.prototype.hasOwnProperty.call(data,key))return;
      var angles=data[key]; if(!Array.isArray(angles)||angles.length<3){invalid=true;return;}
      maps[key].forEach(function(id,index){var raw=angles[index];
        // Some external presets encode a neutral axis as an empty string.
        if(typeof raw==='string' && raw.trim()==='')raw=0;
        if(!((typeof raw==='number')||(typeof raw==='string' && /^-?\d+(?:\.\d+)?$/.test(raw.trim())))){invalid=true;return;}
        var value=Number(raw),input=$(id);if(!isFinite(value)||Math.abs(value)>3600){invalid=true;return;}updates[id]=clamp(value,+input.min,+input.max);
      });found=true;
    });
    var hasPose=found, camera=null;
    if(Object.prototype.hasOwnProperty.call(data,'cam')){
      var cam=data.cam;
      if(!Array.isArray(cam) || cam.length<3 || cam.length>7) invalid=true;
      else {
        var nums=cam.map(function(v){
          if(typeof v==='string' && v.trim()==='')return 0;
          if(typeof v!=='number' && !(typeof v==='string' && /^-?\d+(?:\.\d+)?$/.test(v.trim())))return NaN;
          return Number(v);
        });
        if(nums.some(function(v){return !isFinite(v)||Math.abs(v)>3600;}))invalid=true;
        else {
          var distance=Math.sqrt(nums[0]*nums[0]+nums[1]*nums[1]+nums[2]*nums[2]);
          if(distance<0.001)invalid=true;
          else camera={yaw:Math.atan2(nums[0],nums[2])*180/Math.PI,pitch:Math.atan2(nums[1],Math.sqrt(nums[0]*nums[0]+nums[2]*nums[2]))*180/Math.PI,zoom:80*4/distance};
        }
      }
      found=true;
    }
    if(!found||invalid)return false;
    // Only reset the pose when limb data was supplied, not for a camera-only code.
    if(hasPose){
      extraPoseIds.forEach(function(id){$('pfp-'+id).value=0;});
      ['pfp-head-yaw','pfp-head-pitch','pfp-arm-right','pfp-arm-left','pfp-position-x','pfp-position-y'].forEach(function(id){$(id).value=0;});
      Object.keys(updates).forEach(function(id){$(id).value=updates[id];});$('pfp-preset').value='full';
    }
    if(camera){$('pfp-yaw').value=Math.round(clamp(camera.yaw,-180,180));$('pfp-pitch').value=Math.round(clamp(camera.pitch,-180,180));$('pfp-size').value=Math.round(clamp(camera.zoom,+$('pfp-size').min,+$('pfp-size').max));}
    draw();
    return true;
  }
  $('pfp-pose-load').addEventListener('click',function(){
    var data, message=$('pfp-pose-share-status');
    try {data=JSON.parse($('pfp-pose-data').value);} catch(e){message.textContent='Invalid pose settings. Paste a supported pose JSON.';return;}
    if(importExternalPose(data)){message.textContent='External settings imported approximately. Camera, lighting and bends may differ; your skin was not changed.';return;}
    var presets=['headshot','head','full','wave','flat'];
    if(!data || data.format!=='fmf-pfp-pose' || data.version!==1 || presets.indexOf(data.preset)<0 || !data.values || typeof data.values!=='object') {message.textContent='Invalid pose settings. Paste a supported pose JSON.';return;}
    var valid=sharePoseIds.every(function(id){var control=$(id),v=data.values[id];return typeof v==='number' && isFinite(v) && v>=+control.min && v<=+control.max;});
    if(!valid){message.textContent='Pose values are missing or out of range. Nothing was changed.';return;}
    var pos=data.position;
    if(pos !== undefined && (!pos || typeof pos.x!=='number' || typeof pos.y!=='number' || !isFinite(pos.x) || !isFinite(pos.y) || Math.abs(pos.x)>256 || Math.abs(pos.y)>256)){message.textContent='Pose position is invalid. Nothing was changed.';return;}
    sharePoseIds.forEach(function(id){$(id).value=data.values[id];});$('pfp-position-x').value=pos?pos.x:0;$('pfp-position-y').value=pos?pos.y:0;$('pfp-preset').value=data.preset;draw();message.textContent='Pose loaded. Your skin was not changed.';
  });
  download.addEventListener('click', function () {
    if (!image) return;
    var a = document.createElement('a'); a.download = 'minecraft-pfp.png'; a.href = canvas.toDataURL('image/png'); a.click();
  });
  renderAvatarViews(); draw(); load('../owner-skin.png', true);
})();
