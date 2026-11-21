/* Local-only 64x32 cape texture editor and Java elytra pack builder. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('cape-canvas'), view = canvas.getContext('2d');
  var texture = document.createElement('canvas'); texture.width = 64; texture.height = 32;
  var ctx = texture.getContext('2d'), status = $('cape-status'), drawing = false;
  var preview = window.FMFCapePreview ? window.FMFCapePreview.create(texture) : null;
  if (preview) { var previousCleanup = window.fmfCleanup; window.fmfCleanup = function () { preview.dispose(); if (previousCleanup) previousCleanup(); }; }
  document.querySelectorAll('[data-cape-view]').forEach(function (button) { button.addEventListener('click', function () {
    var mode = button.dataset.capeView; document.querySelectorAll('[data-cape-view]').forEach(function (b) { b.setAttribute('aria-selected', String(b === button)); });
    document.querySelector('.cape-preview').hidden = mode === '2d';
    if (preview && preview.setMode) preview.setMode(mode);
  }); });
  var undo = [], redo = [];
  function snapshot() { return ctx.getImageData(0, 0, 64, 32); }
  function saveUndo() { undo.push(snapshot()); if (undo.length > 30) undo.shift(); redo = []; }
  function restore(from, to) { if (!from.length) return; to.push(snapshot()); ctx.putImageData(from.pop(), 0, 0); draw(); }
  $('cape-undo').addEventListener('click', function () { restore(undo, redo); });
  $('cape-redo').addEventListener('click', function () { restore(redo, undo); });
  document.querySelectorAll('[data-cape-tool]').forEach(function (button) {
    button.addEventListener('click', function () {
      $('cape-tool').value = button.dataset.capeTool;
      document.querySelectorAll('[data-cape-tool]').forEach(function (b) { b.classList.toggle('active', b === button); });
    });
  });
  var recent = [];
  function remember() {
    var color = $('cape-color').value; recent = [color].concat(recent.filter(function (c) { return c !== color; })).slice(0, 8);
    var box = $('cape-recent'); box.textContent = '';
    recent.forEach(function (c) { var button = document.createElement('button'); button.type = 'button'; button.style.background = c; button.title = c; button.setAttribute('aria-label', 'Use recent colour ' + c); button.addEventListener('click', function () { $('cape-color').value = c; remember(); }); box.appendChild(button); });
  }
  $('cape-color').addEventListener('change', remember); remember();
  function message(text, bad) { status.textContent = text; status.classList.toggle('bad', !!bad); }
  function draw() {
    if (preview) preview.update();
    view.clearRect(0, 0, 640, 320); view.imageSmoothingEnabled = false;
    view.drawImage(texture, 0, 0, 640, 320);
    if ($('cape-grid').checked) {
      view.strokeStyle = 'rgba(180,180,180,.45)'; view.lineWidth = 1; view.beginPath();
      for (var x = 0; x <= 64; x++) { view.moveTo(x * 10 + .5, 0); view.lineTo(x * 10 + .5, 320); }
      for (var y = 0; y <= 32; y++) { view.moveTo(0, y * 10 + .5); view.lineTo(640, y * 10 + .5); }
      view.stroke();
    }
    if ($('cape-template').checked) {
      view.strokeStyle = '#ffffff'; view.lineWidth = 2;
      view.strokeRect(10, 10, 100, 160); view.strokeRect(120, 10, 100, 160);
    }
  }
  function point(e) {
    var r = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(63, Math.floor((e.clientX - r.left) * 64 / r.width))), y: Math.max(0, Math.min(31, Math.floor((e.clientY - r.top) * 32 / r.height))) };
  }
  function mirrorX(x) { if (x >= 1 && x <= 10) return 11 - x; if (x >= 12 && x <= 21) return 33 - x; return 63 - x; }
  function dab(x, y, erase) {
    var size = Number($('cape-size').value) || 1, sx = x - Math.floor((size - 1) / 2), sy = y - Math.floor((size - 1) / 2);
    function put(px, py) { if (px < 0 || px >= 64 || py < 0 || py >= 32) return; if (erase) ctx.clearRect(px, py, 1, 1); else { ctx.fillStyle = $('cape-color').value; ctx.fillRect(px, py, 1, 1); } }
    for (var j = 0; j < size; j++) for (var i = 0; i < size; i++) { var px = sx+i, py = sy+j; put(px, py); if ($('cape-mirror').checked && px >= 0 && px < 64) put(mirrorX(px), py); }
  }
  function line(a, b, erase) {
    var x = a.x, y = a.y, dx = Math.abs(b.x-x), dy = Math.abs(b.y-y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1, err = dx-dy;
    for (;;) { dab(x, y, erase); if (x === b.x && y === b.y) break; var e = 2*err; if (e > -dy) { err -= dy; x += sx; } if (e < dx) { err += dx; y += sy; } }
  }
  function rgb(hex) { return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]; }
  function fill(x, y) {
    var image = ctx.getImageData(0, 0, 64, 32), data = image.data, at = (y * 64 + x) * 4;
    var old = Array.from(data.slice(at, at+4)), c = rgb($('cape-color').value), colour = [c[0], c[1], c[2], 255];
    if (old.every(function (v, i) { return v === colour[i]; })) return;
    var queue = [y*64+x], seen = new Uint8Array(2048);
    while (queue.length) { var p = queue.pop(); if (seen[p]) continue; seen[p] = 1; var n = p*4;
      if (!old.every(function (v,i) { return data[n+i] === v; })) continue;
      for (var i=0; i<4; i++) data[n+i] = colour[i];
      var xx=p%64, yy=Math.floor(p/64); if (xx>0) queue.push(p-1); if (xx<63) queue.push(p+1); if (yy>0) queue.push(p-64); if (yy<31) queue.push(p+64);
    }
    ctx.putImageData(image, 0, 0);
  }
  function gradient(a, b) {
    var image = ctx.createImageData(64,32), data = image.data, from = rgb($('cape-color').value), to = rgb($('cape-gradient-color').value);
    var dx=b.x-a.x, dy=b.y-a.y, length=dx*dx+dy*dy || 1;
    for (var y=0; y<32; y++) for (var x=0; x<64; x++) {
      var sampleX = $('cape-mirror').checked && x > 31 ? 63-x : x;
      var t=Math.max(0,Math.min(1,((sampleX-a.x)*dx+(y-a.y)*dy)/length)), p=(y*64+x)*4;
      for (var c=0;c<3;c++) data[p+c]=Math.round(from[c]*(1-t)+to[c]*t); data[p+3]=255;
    }
    ctx.putImageData(image,0,0);
  }
  var start = null, last = null, base = null, panOrigin = null;
  var viewport = $('cape-grid-viewport'), zoom = $('cape-grid-zoom');
  zoom.addEventListener('input', function () { viewport.style.setProperty('--cape-grid-zoom', zoom.value + '%'); $('cape-grid-zoom-value').textContent = zoom.value + '%'; });
  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return; var tool = $('cape-tool').value, pos = point(e);
    canvas.setPointerCapture(e.pointerId);
    if (tool === 'pan') { drawing = true; panOrigin = {x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop}; return; }
    if (tool === 'pick') { var rgba = ctx.getImageData(pos.x,pos.y,1,1).data; if (rgba[3]) { $('cape-color').value = '#' + Array.from(rgba.slice(0,3)).map(function(v){return v.toString(16).padStart(2,'0');}).join(''); remember(); } else message('That pixel is transparent.'); return; }
    saveUndo(); remember(); drawing = true; start = last = pos;
    if (tool === 'fill') { fill(pos.x,pos.y); if ($('cape-mirror').checked) fill(mirrorX(pos.x),pos.y); drawing = false; draw(); return; }
    if (tool === 'line' || tool === 'gradient') base = snapshot();
    if (tool === 'gradient') gradient(start,pos); else dab(pos.x,pos.y,tool === 'erase'); draw();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return; var tool = $('cape-tool').value;
    if (tool === 'pan') { viewport.scrollLeft = panOrigin.left-(e.clientX-panOrigin.x); viewport.scrollTop = panOrigin.top-(e.clientY-panOrigin.y); return; }
    var pos = point(e);
    if (tool === 'line' || tool === 'gradient') { ctx.putImageData(base,0,0); if (tool === 'line') line(start,pos,false); else gradient(start,pos); }
    else line(last,pos,tool === 'erase'); last = pos; draw();
  });
  canvas.addEventListener('pointerup', function () { drawing = false; base = panOrigin = null; });
  canvas.addEventListener('pointercancel', function () { drawing = false; base = panOrigin = null; });
  $('cape-grid').addEventListener('change', draw);
  $('cape-template').addEventListener('change', draw);
  $('cape-clear').addEventListener('click', function () { saveUndo(); ctx.clearRect(0, 0, 64, 32); draw(); message('Texture cleared.'); });
  $('cape-file').addEventListener('change', function () {
    var file = this.files[0]; if (!file) return;
    if (file.type !== 'image/png') { message('Please choose a PNG image.', true); this.value = ''; return; }
    var url = URL.createObjectURL(file), image = new Image();
    image.onload = function () {
      URL.revokeObjectURL(url);
      if (image.width !== 64 || image.height !== 32) { message('The PNG must be exactly 64 × 32 pixels.', true); return; }
      saveUndo(); ctx.clearRect(0, 0, 64, 32); ctx.drawImage(image, 0, 0); draw(); message('Texture loaded.');
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
  // Saved projects never leave this browser. A same-name save deliberately updates it.
  var storageKey = 'fmf-cape-projects-v1', projectStatus = $('cape-project-status');
  function projectMessage(text, bad) { projectStatus.textContent = text; projectStatus.classList.toggle('bad', !!bad); }
  function readProjects() {
    var raw = localStorage.getItem(storageKey), data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data) || data.some(function (p) { return !p || typeof p.name !== 'string' || typeof p.image !== 'string'; })) throw new Error('Invalid saved projects');
    return data;
  }
  function refreshProjects(selected) {
    var select = $('cape-projects'), projects;
    try { projects = readProjects(); }
    catch (e) { projectMessage('Saved projects could not be read. Check browser storage.', true); projects = []; }
    select.textContent = '';
    var placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = projects.length ? 'Choose a project' : 'No saved projects'; select.appendChild(placeholder);
    projects.forEach(function (p) { var opt = document.createElement('option'); opt.value = p.name; opt.textContent = p.name; select.appendChild(opt); });
    select.value = selected || '';
    $('cape-load-project').disabled = $('cape-delete-project').disabled = !select.value;
  }
  $('cape-projects').addEventListener('change', function () { $('cape-load-project').disabled = $('cape-delete-project').disabled = !this.value; });
  $('cape-save-project').addEventListener('click', function () {
    var name = $('cape-name').value.trim(); if (!name) { projectMessage('Enter a pack name first.', true); return; }
    try {
      var list = readProjects(), select = $('cape-version'), mc = select.options[select.selectedIndex].getAttribute('data-mc');
      var project = { name: name, description: $('cape-description').value, mc: mc, image: texture.toDataURL('image/png') };
      var index = list.findIndex(function (p) { return p.name === name; });
      if (index < 0) list.push(project); else list[index] = project;
      localStorage.setItem(storageKey, JSON.stringify(list)); refreshProjects(name); projectMessage('Saved ' + name + ' in this browser.');
    } catch (e) { projectMessage('Could not save. Browser storage may be blocked or full.', true); }
  });
  $('cape-load-project').addEventListener('click', function () {
    try {
      var name = $('cape-projects').value, project = readProjects().find(function (p) { return p.name === name; });
      if (!project || !/^data:image\/png;base64,/.test(project.image)) throw new Error('Invalid project');
      var image = new Image();
      image.onload = function () {
        if (image.width !== 64 || image.height !== 32) { projectMessage('Saved texture is not 64 × 32.', true); return; }
        saveUndo(); ctx.clearRect(0, 0, 64, 32); ctx.drawImage(image, 0, 0); draw();
        $('cape-name').value = project.name; $('cape-description').value = project.description || '';
        var options = $('cape-version').options;
        for (var i = 0; i < options.length; i++) if (options[i].getAttribute('data-mc') === project.mc) { $('cape-version').selectedIndex = i; break; }
        projectMessage('Loaded ' + name + '.');
      };
      image.onerror = function () { projectMessage('Could not load saved texture.', true); }; image.src = project.image;
    } catch (e) { projectMessage('Could not load that project.', true); }
  });
  $('cape-delete-project').addEventListener('click', function () {
    try {
      var name = $('cape-projects').value, list = readProjects();
      if (!name) return;
      localStorage.setItem(storageKey, JSON.stringify(list.filter(function (p) { return p.name !== name; })));
      refreshProjects(''); projectMessage('Deleted ' + name + ' from this browser.');
    } catch (e) { projectMessage('Could not delete that project.', true); }
  });
  refreshProjects('');
  // A starter appears when no projects are saved. It is ordinary texture pixels,
  // not a saved project, and Clear removes it like any other drawing.
  function addStarter() {
    try {
      if (readProjects().length) return;
      ctx.fillStyle = '#146c58'; ctx.fillRect(0, 0, 22, 17);
      ctx.fillStyle = '#35c980'; ctx.fillRect(1, 1, 10, 16); ctx.fillRect(12, 1, 10, 16);
      ctx.fillStyle = '#b6f4ce';
      [[5, 4, 2, 2], [4, 6, 4, 2], [3, 8, 6, 2], [4, 10, 4, 2], [5, 12, 2, 2],
       [16, 4, 2, 2], [15, 6, 4, 2], [14, 8, 6, 2], [15, 10, 4, 2], [16, 12, 2, 2]].forEach(function (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); });
    } catch (e) { /* If storage is unavailable, do not assume projects are absent. */ }
  }
  addStarter();
  $('cape-zip').addEventListener('click', async function () {
    var button = this, select = $('cape-version'), fmt = Number(select.value), version = select.options[select.selectedIndex].getAttribute('data-mc');
    button.disabled = true;
    try {
      var image = await png(), zip = new JSZip(), name = $('cape-name').value.trim() || 'My Elytra Pack';
      var description = $('cape-description').value.trim() || 'Custom elytra texture';
      var pack = { pack_format: fmt, description: description };
      if (fmt >= 65) { pack.min_format = fmt; pack.max_format = fmt; }
      zip.file('pack.mcmeta', JSON.stringify({pack: pack}, null, 2));
      var bytes = await image.arrayBuffer();
      zip.file('assets/minecraft/textures/entity/elytra.png', bytes);
      zip.file('assets/minecraft/textures/entity/equipment/wings/elytra.png', bytes);
      zip.file('README.txt', 'Java elytra texture pack for Minecraft ' + version + '. Put this ZIP in resourcepacks and enable it. This does not create a wearable custom cape. An equipped cape or higher-priority pack may override the elytra texture.');
      var filename = name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'elytra-pack';
      save(await zip.generateAsync({type: 'blob'}), filename + '-mc' + version + '.zip');
      message('Elytra pack downloaded. It does not add a wearable cape.');
    } catch (e) { message('Could not create the ZIP. Please try again.', true); }
    finally { button.disabled = false; }
  });
  draw();
})();
