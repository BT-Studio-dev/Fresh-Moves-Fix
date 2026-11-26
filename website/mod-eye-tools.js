// Reactions 0.9.2 placement and Glowing Eyes 2.1.3 preset helpers.
// Neither helper writes to the skin; the glow map is a separate DataVersion 4 file.
(function () {
  const $ = id => document.getElementById(id);
  if (!$('rx-grid') || !$('gl-grid')) return;
  document.querySelectorAll('[data-open-mod-card]').forEach(link => link.addEventListener('click', () => {
    const card = $(link.dataset.openModCard);
    if (card) { card.open = true; const summary = card.querySelector('summary'); if (summary) summary.focus({ preventScroll: true }); }
  }));
  let skin = null, glow = {}, history = [], imported = null, importPending = false, importToken = 0;
  const rx = { left: { x: 9, y: 12, layer: 'base' }, right: { x: 13, y: 12, layer: 'base' } };
  const part = () => $('gl-part').value.split(',').map(Number);
  const rgb = value => {
    const n = parseInt(value.slice(1), 16);
    return (0xff000000 | n); // Java signed ARGB integer
  };
  function skinColor(x, y) {
    if (!skin) return 'transparent';
    const i = (y * 64 + x) * 4;
    return `rgba(${skin[i]},${skin[i+1]},${skin[i+2]},${skin[i+3] / 255})`;
  }
  function makeGrid(id, onClick) {
    const grid = $(id);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const b = document.createElement('button');
      b.type = 'button'; b.addEventListener('click', () => onClick(x, y)); grid.appendChild(b);
    }
  }
  function renderRx() {
    const layer = $('rx-layer').value, w = +$('rx-width').value, h = +$('rx-height').value;
    for (const p of Object.values(rx)) { p.x = Math.min(p.x, 16-w); p.y = Math.min(p.y, 16-h); }
    [...$('rx-grid').children].forEach((b, i) => {
      const x = i % 8 + 8, y = Math.floor(i / 8) + 8;
      b.style.backgroundColor = skinColor(x + (layer === 'outer' ? 32 : 0), y);
      const selected = ['left', 'right'].filter(side => { const p = rx[side]; return p.layer === layer && x >= p.x && x < p.x+w && y >= p.y && y < p.y+h; });
      b.dataset.selected = selected.length === 2 ? 'both' : selected[0] || '';
      b.setAttribute('aria-label', `Face pixel ${x}, ${y}${selected.length ? ', ' + selected.join(' and ') + (selected.length === 2 ? ' eyes' : ' eye') : ''}`);
    });
    const describe = p => `${p.x}, ${p.y} (${p.layer === 'base' ? 'layer 1' : 'layer 2'})`;
    $('rx-result').textContent = `Left Eye: ${describe(rx.left)}; Right Eye: ${describe(rx.right)}. Size: ${w} × ${h}. Coordinates use the base face (8–15) even when layer 2 is selected.`;
  }
  makeGrid('rx-grid', (x, y) => {
    const w = +$('rx-width').value, h = +$('rx-height').value;
    rx[$('rx-target').value] = { x: Math.min(x+8, 16-w), y: Math.min(y+8, 16-h), layer: $('rx-layer').value };
    renderRx();
  });
  ['rx-layer','rx-target','rx-width','rx-height'].forEach(id => $(id).addEventListener('change', () => {
    if (+$('rx-width').value === 3 && +$('rx-height').value === 3) {
      // Upstream rejects 3x3 eyes.
      $(id === 'rx-width' ? 'rx-height' : 'rx-width').value = '2';
    }
    renderRx();
  }));
  let rxImported = null, rxImportToken = 0;
  function rxStatus(message) { $('rx-status').textContent = message; }
  function readRxConfig(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !['eyeWidth', 'eyeHeight', 'leftEyeX', 'leftEyeY', 'rightEyeX', 'rightEyeY'].every(key => Object.prototype.hasOwnProperty.call(data, key))) throw new Error();
    const number = (key, fallback, min, max) => {
      const value = data[key] == null ? fallback : data[key];
      if (!Number.isInteger(value) || value < min || value > max) throw new Error();
      return value;
    };
    const layer = value => {
      value = value == null ? 'BASE' : value;
      if (value !== 'BASE' && value !== 'OUTER') throw new Error();
      return value === 'BASE' ? 'base' : 'outer';
    };
    const width = number('eyeWidth', 2, 1, 3), height = number('eyeHeight', 1, 1, 3);
    if (width === 3 && height === 3) throw new Error();
    const legacyLayer = data.eyeSkinLayer == null ? 'BASE' : data.eyeSkinLayer;
    const left = { x: number('leftEyeX', 9, 8, 16-width), y: number('leftEyeY', 12, 8, 16-height), layer: layer(data.leftEyeSkinLayer == null ? legacyLayer : data.leftEyeSkinLayer) };
    const right = { x: number('rightEyeX', 13, 8, 16-width), y: number('rightEyeY', 12, 8, 16-height), layer: layer(data.rightEyeSkinLayer == null ? legacyLayer : data.rightEyeSkinLayer) };
    return { width, height, left, right };
  }
  $('rx-import').addEventListener('change', () => {
    const file = $('rx-import').files[0], token = ++rxImportToken;
    rxImported = null; $('rx-export').disabled = true;
    if (!file) { rxStatus('Import an existing configuration to enable export and preserve your other settings.'); return; }
    if (file.size > 2 * 1024 * 1024) { rxStatus('File is too large. Choose a reactions.json under 2 MB.'); return; }
    rxStatus('Reading configuration…');
    const reader = new FileReader();
    reader.onerror = () => { if (token === rxImportToken) rxStatus('Could not read the configuration. Choose another file.'); };
    reader.onload = () => {
      if (token !== rxImportToken) return;
      try {
        const data = JSON.parse(reader.result), settings = readRxConfig(data);
        rxImported = data; rx.left = settings.left; rx.right = settings.right;
        $('rx-width').value = String(settings.width); $('rx-height').value = String(settings.height);
        $('rx-layer').value = rx[$('rx-target').value].layer;
        $('rx-export').disabled = false; renderRx();
        rxStatus('Configuration loaded. Choose positions, then download the updated file. Your original file is unchanged.');
      } catch (_) { rxStatus('Invalid or unsupported eye settings. Open and save the configuration in Reactions first, then try again.'); }
    };
    reader.readAsText(file);
  });
  $('rx-reset-import').addEventListener('click', () => {
    ++rxImportToken; $('rx-import').value = ''; rxImported = null; $('rx-export').disabled = true;
    rxStatus('Import an existing configuration to enable export and preserve your other settings.');
  });
  $('rx-export').addEventListener('click', () => {
    if (!rxImported) return;
    const data = { ...rxImported, leftEyeX: rx.left.x, leftEyeY: rx.left.y, rightEyeX: rx.right.x, rightEyeY: rx.right.y,
      eyeWidth: +$('rx-width').value, eyeHeight: +$('rx-height').value,
      leftEyeSkinLayer: rx.left.layer.toUpperCase(), rightEyeSkinLayer: rx.right.layer.toUpperCase() };
    // The mod only updates its legacy shared layer when both eyes use the same layer.
    if (rx.left.layer === rx.right.layer) data.eyeSkinLayer = rx.left.layer.toUpperCase();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'reactions.json';
    document.body.appendChild(a); a.click(); a.remove();
    const url = a.href; setTimeout(() => URL.revokeObjectURL(url), 2000);
    rxStatus('Downloaded reactions.json. Back up the old file and close Minecraft before replacing it.');
  });
  function renderGlow() {
    const [ox, oy] = part();
    [...$('gl-grid').children].forEach((b, i) => {
      const x = ox + i % 8, y = oy + Math.floor(i / 8), value = glow[`${x},${y}`];
      b.style.backgroundColor = value === undefined ? skinColor(x, y) : '#' + (value & 0xffffff).toString(16).padStart(6, '0');
      b.dataset.glow = value === undefined ? 'false' : 'true';
      b.setAttribute('aria-label', `Skin pixel ${x}, ${y}${value === undefined ? '' : ', glowing'}`);
    });
    $('gl-count').textContent = `${Object.keys(glow).length} glowing pixels across all parts.`;
    $('gl-undo').disabled = !history.length;
  }
  function remember() { history.push({ ...glow }); if (history.length > 100) history.shift(); }
  makeGrid('gl-grid', (dx, dy) => {
    const [ox,oy] = part(), x = ox+dx, y = oy+dy, key = `${x},${y}`, tool = $('gl-tool').value;
    let next = tool === 'erase' ? undefined : rgb($('gl-color').value);
    if (tool === 'copy' || tool === 'pick') {
      const i = (y * 64 + x) * 4;
      if (!skin || !skin[i+3]) { $('gl-feedback').textContent = 'No visible skin colour at this pixel; the glow map was not changed.'; return; }
      const color = '#' + [skin[i], skin[i+1], skin[i+2]].map(n => n.toString(16).padStart(2, '0')).join('');
      next = rgb(color);
      if (tool === 'pick') {
        $('gl-color').value = color;
        $('gl-feedback').textContent = `Picked ${color}; select Draw to use it. The glow map was not changed.`;
        return;
      }
      $('gl-feedback').textContent = skin[i+3] < 255 ? 'Copied the skin RGB; preset colours are opaque.' : `Copied skin colour ${color}.`;
    } else $('gl-feedback').textContent = '';
    if (glow[key] === next) return;
    remember(); if (next === undefined) delete glow[key]; else glow[key] = next;
    renderGlow();
  });
  $('gl-part').addEventListener('change', renderGlow);
  $('gl-undo').addEventListener('click', () => { if (history.length) { glow = history.pop(); renderGlow(); } });
  $('gl-clear').addEventListener('click', () => { if (Object.keys(glow).length) { remember(); glow = {}; renderGlow(); } });
  function status(text) { $('gl-status').textContent = text; }
  function refreshExisting() {
    const select = $('gl-existing'); select.replaceChildren();
    if (!imported || !imported.presets.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = imported ? 'No presets in file' : 'Import a file first'; select.appendChild(option);
      select.disabled = true; $('gl-load-existing').disabled = true; return;
    }
    imported.presets.forEach((preset, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = preset.name; select.appendChild(option); });
    select.disabled = false; $('gl-load-existing').disabled = false;
  }
  $('gl-load-existing').addEventListener('click', () => {
    if (!imported || $('gl-existing').disabled) return;
    const preset = imported.presets[Number($('gl-existing').value)];
    if (!preset) return;
    remember(); glow = { ...preset.content }; $('gl-name').value = preset.name;
    $('gl-feedback').textContent = 'Preset loaded as a draft. Undo restores your previous glow map. The original preset remains unchanged.';
    renderGlow();
  });
  $('gl-import').addEventListener('change', () => {
    const file = $('gl-import').files[0], token = ++importToken;
    imported = null; importPending = !!file; refreshExisting();
    if (!file) { status('No file imported: export contains only this new preset.'); return; }
    if (file.size > 2 * 1024 * 1024) { status('File is too large. Choose a presets.json under 2 MB or remove the selection. Export is blocked.'); return; }
    status('Reading presets file…');
    const reader = new FileReader();
    reader.onerror = () => { if (token === importToken) status('Could not read the file. Export is blocked; choose another file or remove the selection.'); };
    reader.onload = () => {
      if (token !== importToken) return;
      try {
        const data = JSON.parse(reader.result);
        // v3 and v4 already use absolute coordinates. Older files need the mod's migration first.
        if (!data || ![3,4].includes(data.DataVersion) || !Array.isArray(data.presets) || !data.presets.every(p => p && typeof p.name === 'string' && p.content && typeof p.content === 'object' && !Array.isArray(p.content) && Object.entries(p.content).every(([key, color]) => { const match = /^(\d+),(\d+)$/.exec(key); return match && +match[1] < 64 && +match[2] < 64 && Number.isInteger(color) && color >= -2147483648 && color <= 2147483647; }))) throw new Error();
        imported = data; importPending = false; refreshExisting();
        status(`Loaded ${data.presets.length} presets; the download will append your new preset. Your original file is unchanged.`);
      } catch (_) { status('Unsupported or invalid presets file. Open and save older presets in Glowing Eyes first. Export is blocked; choose another file or remove the selection.'); }
    };
    reader.readAsText(file);
  });
  $('gl-reset-import').addEventListener('click', () => {
    ++importToken; $('gl-import').value = ''; imported = null; importPending = false; refreshExisting();
    status('No file imported: export contains only this new preset.');
  });
  $('gl-export').addEventListener('click', () => {
    if (importPending) { status('Import not complete or invalid; export is blocked. Choose another file or remove the selection.'); return; }
    const name = $('gl-name').value.trim();
    if (!name || !Object.keys(glow).length) { status('Enter a preset name and draw at least one glowing pixel.'); return; }
    const data = imported ? { ...imported, DataVersion: 4, presets: [...imported.presets, { name, content: { ...glow } }] } : { DataVersion: 4, presets: [{ name, content: { ...glow } }] };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'presets.json';
    document.body.appendChild(a); a.click(); a.remove();
    const url = a.href; setTimeout(() => URL.revokeObjectURL(url), 2000);
    status('Downloaded presets.json. Back up your existing file before replacing it; restart Minecraft and apply the preset.');
  });
  window.ModEyeTools = { setSkin(data) { skin = data; renderRx(); renderGlow(); } };
  renderRx(); renderGlow();
})();
