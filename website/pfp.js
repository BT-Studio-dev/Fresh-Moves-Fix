// Original face-based profile picture maker; all image processing stays local.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('pfp-canvas'), ctx = canvas.getContext('2d');
  var image = null, version = 0, status = $('pfp-status'), download = $('pfp-download');
  function draw() {
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    if ($('pfp-shape').value === 'circle') {
      ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.clip();
    }
    if ($('pfp-background').value === 'color') {
      ctx.fillStyle = $('pfp-color').value; ctx.fillRect(0, 0, 512, 512);
    }
    if (image) {
      var size = Math.round(512 * Number($('pfp-size').value) / 100), left = Math.round((512 - size) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 8, 8, 8, 8, left, left, size, size);
      if ($('pfp-outer').checked) ctx.drawImage(image, 40, 8, 8, 8, left, left, size, size);
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
      image = candidate; download.disabled = false;
      status.textContent = isDefault ? 'Using the default skin.' : 'Skin loaded. It stays in this browser.';
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
  ['pfp-background', 'pfp-color', 'pfp-shape', 'pfp-size', 'pfp-outer'].forEach(function (id) {
    $(id).addEventListener('input', draw); $(id).addEventListener('change', draw);
  });
  download.addEventListener('click', function () {
    if (!image) return;
    var a = document.createElement('a'); a.download = 'minecraft-pfp.png'; a.href = canvas.toDataURL('image/png'); a.click();
  });
  draw(); load('../render-dummy.png', true);
})();
