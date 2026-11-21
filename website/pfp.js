// Original face-based profile picture maker; all image processing stays local.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('pfp-canvas'), ctx = canvas.getContext('2d');
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
      if (night) {
        ctx.fillStyle = '#e4ecff';
        [[42,56],[119,97],[182,40],[304,64],[469,140],[67,205],[449,252],[323,171],[162,191],[90,310],[474,55]].forEach(function (star) {ctx.fillRect(star[0],star[1],3,3);});
      }
      // Pixel-style celestial body; intentionally static, not weather or real-time astronomy.
      ctx.fillStyle = night ? '#e4e9f6' : '#fff2cb'; ctx.fillRect(385, 58, 62, 62);
      if (night) {ctx.fillStyle='#bec8df';ctx.fillRect(396,69,10,10);ctx.fillRect(422,92,13,13);}
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
      draw();
    };
    candidate.onerror = function () { release(); if (current === version) status.textContent = 'Could not read that PNG. Please choose a valid skin.'; };
    candidate.src = url;
  }
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
      Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-target]'), function (item) {
        if (item.getAttribute('data-pfp-target') === target) item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      draw();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pfp-color]'), function (button) {
    button.addEventListener('click', function () {
      $('pfp-color').value = button.getAttribute('data-pfp-color');
      $('pfp-background').value = 'color';
      draw();
    });
  });
  $('pfp-quick-3d').addEventListener('click', function () {
    $('pfp-preset').value = $('pfp-preset').value === 'flat' ? last3d : 'flat';
    draw();
  });
  ['pfp-background', 'pfp-color', 'pfp-shape', 'pfp-size', 'pfp-outer', 'pfp-preset', 'pfp-model', 'pfp-yaw', 'pfp-pitch', 'pfp-head-yaw', 'pfp-head-pitch'].forEach(function (id) {
    $(id).addEventListener('input', draw); $(id).addEventListener('change', draw);
  });
  download.addEventListener('click', function () {
    if (!image) return;
    var a = document.createElement('a'); a.download = 'minecraft-pfp.png'; a.href = canvas.toDataURL('image/png'); a.click();
  });
  draw(); load('../owner-skin.png', true);
})();
