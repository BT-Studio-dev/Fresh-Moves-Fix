// Local, lightweight banner compositor. Uploaded images never leave the browser.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('creator-canvas'), ctx = canvas.getContext('2d');
  var artwork = null, version = 0;
  function draw() {
    var gradient = ctx.createLinearGradient(0, 0, 2560, 1440);
    gradient.addColorStop(0, $('creator-color-a').value); gradient.addColorStop(1, $('creator-color-b').value);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2560, 1440);
    if (artwork) {
      var w = artwork.naturalWidth || artwork.width, h = artwork.naturalHeight || artwork.height;
      var scale = Math.min(700 / w, 700 / h), dw = w * scale, dh = h * scale;
      ctx.save();
      if ($('creator-highlight').checked) { ctx.shadowColor = $('creator-highlight-color').value; ctx.shadowBlur = 38; }
      ctx.drawImage(artwork, 1640 - dw / 2, 720 - dh / 2, dw, dh);
      ctx.restore();
    }
    ctx.save(); ctx.fillStyle = $('creator-text-color').value;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 108px sans-serif'; ctx.fillText($('creator-title').value, artwork ? 1050 : 1280, 675, artwork ? 850 : 1400);
    ctx.font = '46px sans-serif'; ctx.fillText($('creator-subtitle').value, artwork ? 1050 : 1280, 770, artwork ? 850 : 1400);
    ctx.restore();
  }
  ['creator-title','creator-subtitle','creator-color-a','creator-color-b','creator-text-color','creator-highlight','creator-highlight-color'].forEach(function(id){ $(id).addEventListener('input',draw); $(id).addEventListener('change',draw); });
  $('creator-image').addEventListener('change', function () {
    var file = this.files && this.files[0]; if (!file) return;
    var current = ++version, status = $('creator-status');
    if (!/^(image\/png|image\/jpeg|image\/webp)$/.test(file.type) || file.size > 10*1024*1024) { status.textContent = 'Choose a PNG, JPEG or WebP image under 10 MB.'; this.value=''; return; }
    var url = URL.createObjectURL(file), image = new Image();
    image.onload = function () { URL.revokeObjectURL(url); if (version !== current) return; if (!image.width || !image.height) { status.textContent='Could not read this image.'; return; } artwork=image; status.textContent='Image loaded locally. Transparent PNGs work best for highlights.'; draw(); };
    image.onerror = function () { URL.revokeObjectURL(url); if (version === current) status.textContent='Could not read this image.'; };
    image.src=url; this.value='';
  });
  $('creator-remove').addEventListener('click',function(){ ++version; artwork=null; $('creator-status').textContent='Image removed.'; draw(); });
  $('creator-download').addEventListener('click',function(){ var a=document.createElement('a'); a.download='minecraft-banner.png'; a.href=canvas.toDataURL('image/png'); a.click(); });
  draw();
})();
