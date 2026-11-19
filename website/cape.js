/* Local-only 64x32 cape texture editor and Java elytra pack builder. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('cape-canvas'), view = canvas.getContext('2d');
  var texture = document.createElement('canvas'); texture.width = 64; texture.height = 32;
  var ctx = texture.getContext('2d'), status = $('cape-status'), drawing = false;
  function message(text, bad) { status.textContent = text; status.classList.toggle('bad', !!bad); }
  function draw() {
    view.clearRect(0, 0, 640, 320); view.imageSmoothingEnabled = false;
    view.drawImage(texture, 0, 0, 640, 320);
    if ($('cape-grid').checked) {
      view.strokeStyle = 'rgba(180,180,180,.45)'; view.lineWidth = 1; view.beginPath();
      for (var x = 0; x <= 64; x++) { view.moveTo(x * 10 + .5, 0); view.lineTo(x * 10 + .5, 320); }
      for (var y = 0; y <= 32; y++) { view.moveTo(0, y * 10 + .5); view.lineTo(640, y * 10 + .5); }
      view.stroke();
      view.strokeStyle = '#ffffff'; view.lineWidth = 2;
      view.strokeRect(10, 10, 100, 160); view.strokeRect(120, 10, 100, 160);
    }
  }
  function pixel(e) {
    var r = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) * 64 / r.width), y = Math.floor((e.clientY - r.top) * 32 / r.height);
    if (x < 0 || x >= 64 || y < 0 || y >= 32) return;
    if ($('cape-tool').value === 'erase') ctx.clearRect(x, y, 1, 1);
    else { ctx.fillStyle = $('cape-color').value; ctx.fillRect(x, y, 1, 1); }
    draw();
  }
  canvas.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; drawing = true; canvas.setPointerCapture(e.pointerId); pixel(e); });
  canvas.addEventListener('pointermove', function (e) { if (drawing) pixel(e); });
  canvas.addEventListener('pointerup', function () { drawing = false; });
  canvas.addEventListener('pointercancel', function () { drawing = false; });
  $('cape-grid').addEventListener('change', draw);
  $('cape-clear').addEventListener('click', function () { ctx.clearRect(0, 0, 64, 32); draw(); message('Texture cleared.'); });
  $('cape-file').addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    if (file.type !== 'image/png') { message('Please choose a PNG image.', true); this.value = ''; return; }
    var url = URL.createObjectURL(file), image = new Image();
    image.onload = function () {
      URL.revokeObjectURL(url);
      if (image.width !== 64 || image.height !== 32) { message('The PNG must be exactly 64 × 32 pixels.', true); return; }
      ctx.clearRect(0, 0, 64, 32); ctx.drawImage(image, 0, 0); draw(); message('Texture loaded.');
    };
    image.onerror = function () { URL.revokeObjectURL(url); message('Could not read that PNG.', true); };
    image.src = url; this.value = '';
  });
  function save(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function png() { return new Promise(function (resolve, reject) { texture.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('Could not create PNG')); }, 'image/png'); }); }
  $('cape-png').addEventListener('click', async function () {
    try { save(await png(), 'cape.png'); message('Cape PNG downloaded.'); } catch (e) { message('Could not create the PNG.', true); }
  });
  $('cape-zip').addEventListener('click', async function () {
    var button = this, select = $('cape-version'), fmt = Number(select.value), version = select.options[select.selectedIndex].getAttribute('data-mc');
    button.disabled = true;
    try {
      var image = await png(), zip = new JSZip(), pack = { pack_format: fmt, description: 'Custom elytra texture by Fresh Moves Fix' };
      if (fmt >= 65) { pack.min_format = fmt; pack.max_format = fmt; }
      zip.file('pack.mcmeta', JSON.stringify({pack: pack}, null, 2));
      var bytes = await image.arrayBuffer();
      zip.file('assets/minecraft/textures/entity/elytra.png', bytes);
      zip.file('assets/minecraft/textures/entity/equipment/wings/elytra.png', bytes);
      zip.file('README.txt', 'Java elytra texture pack for Minecraft ' + version + '. Put this ZIP in resourcepacks and enable it. This does not create a wearable custom cape. An equipped cape or higher-priority pack may override the elytra texture.');
      save(await zip.generateAsync({type: 'blob'}), 'elytra-pack-mc' + version + '.zip');
      message('Elytra pack downloaded. It does not add a wearable cape.');
    } catch (e) { message('Could not create the ZIP. Please try again.', true); }
    finally { button.disabled = false; }
  });
  draw();
})();
