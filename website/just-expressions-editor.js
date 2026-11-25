// Guide-assisted 64×64 editor with selected 2.0 presets; the full set is not implemented.
(function () {
  const root = document.getElementById('je-editor');
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const canvas = $('je-canvas'), face = $('je-face');
  const ctx = canvas.getContext('2d'), faceCtx = face.getContext('2d');
  const source = document.createElement('canvas'); source.width = source.height = 64;
  const src = source.getContext('2d', { willReadFrequently: true });
  const views = { full: [0, 0, 64], face: [8, 8, 8], 'top-left': [0, 0, 8], 'top-right': [56, 0, 8] };
  let pixels = null, original = null, history = [], tool = 'brush', drawing = false, last = null;
  const status = (text) => { $('je-status').textContent = text; };
  const at = (x, y) => (y * 64 + x) * 4;
  function draw() {
    if (!pixels) return;
    const area = views[$('je-view').value] || views.full;
    canvas.width = canvas.height = area[2];
    const image = ctx.createImageData(area[2], area[2]);
    for (let y = 0; y < area[2]; y++) for (let x = 0; x < area[2]; x++) {
      const from = at(area[0] + x, area[1] + y), to = (y * area[2] + x) * 4;
      image.data.set(pixels.subarray(from, from + 4), to);
    }
    ctx.putImageData(image, 0, 0);
    root.style.setProperty('--je-grid-count', area[2]);
    const whole = src.createImageData(64, 64); whole.data.set(pixels); src.putImageData(whole, 0, 0);
    faceCtx.clearRect(0, 0, 8, 8);
    faceCtx.drawImage(source, 8, 8, 8, 8, 0, 0, 8, 8);
    faceCtx.drawImage(source, 40, 8, 8, 8, 0, 0, 8, 8);
    $('je-undo').disabled = history.length === 0;
    $('je-reset').disabled = !original || !pixels.some((value, index) => value !== original[index]);
    if (window.JustExpressionsEditor && window.JustExpressionsEditor.onChange) window.JustExpressionsEditor.onChange(new Uint8ClampedArray(pixels));
  }
  // The unified editor owns loading and exporting. Keep history when returning to an
  // unchanged skin; a different skin begins a new, clearly bounded 2.0 session.
  window.JustExpressionsEditor = {
    setSkin(data, name, forceNew = false) {
      const incoming = new Uint8ClampedArray(data);
      const same = pixels && pixels.length === incoming.length && pixels.every((v, i) => v === incoming[i]);
      if (forceNew || !same) { pixels = incoming; original = new Uint8ClampedArray(incoming); history = []; }
      ['je-apply-eye', 'je-apply-brow', 'je-apply-mouth', 'je-copy-mask'].forEach(id => { $(id).disabled = false; });
      draw(); status((name || 'Skin') + ' ready. Select a preset or follow a guide to paint pixels.');
    },
    getSkin() { return pixels && new Uint8ClampedArray(pixels); },
    onChange: null
  };
  $('je-mask-toggle').addEventListener('change', function () { $('je-mask-options').hidden = !this.checked; });
  $('je-guide').addEventListener('change', function () { $('je-guide-link').href = '../guides/just-expressions/' + encodeURIComponent(this.value) + '/'; });
  $('je-view').addEventListener('change', draw);
  $('je-eye-shape').addEventListener('change', function () {
    $('je-standard-options').hidden = !['standard','derp','far','far-derp','square','wide','flat'].includes(this.value);
    $('je-toon-options').hidden = this.value !== 'toon';
    $('je-curious-options').hidden = this.value !== 'curious' && this.value !== 'cyclops';
    $('je-dot-options').hidden = !/^(dots|short|long)-(close|far)$/.test(this.value);
    // Only offer positions for which the selected marker layout exists.
    const pos = $('je-eye-position'), superOption = Array.from(pos.options).find(o => o.value === 'super');
    superOption.disabled = this.value === 'square';
    if (superOption.disabled && pos.value === 'super') pos.value = 'top';
    const dot = $('je-dot-position'), minimum = this.value.startsWith('long-') ? (this.value.endsWith('-far') ? 4 : 3) : this.value.startsWith('short-') ? 2 : 1;
    for (const option of dot.options) option.disabled = Number(option.value) < minimum;
    if (Number(dot.value) < minimum) dot.value = String(minimum);
  });
  function remember() { history.push(new Uint8ClampedArray(pixels)); if (history.length > 30) history.shift(); }
  function clearArea(x, y, width, height) { for (let j = y; j < y + height; j++) for (let i = x; i < x + width; i++) pixels.fill(0, at(i, j), at(i, j) + 4); }
  function occupied(x, y, width, height) { for (let j = y; j < y + height; j++) for (let i = x; i < x + width; i++) if (pixels[at(i, j) + 3]) return true; return false; }
  function confirmArea(x, y, width, height, description) {
    return !occupied(x, y, width, height) || window.confirm('This will replace existing pixels in ' + description + '. Continue?');
  }
  function colour(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(255); }
  // Coordinates are transcribed from the Just Expressions 2.0 guide diagrams.
  // The existing face is never repainted or used as metadata storage.
  $('je-apply-eye').addEventListener('click', function () {
    if (!pixels) return;
    const position = $('je-eye-position').value, shape = $('je-eye-shape').value;
    const standard = { super: [2, 24, 0], top: [3, 4, 0], upper: [4, 4, 2], lower: [5, 4, 4], bottom: [6, 4, 6] };
    const square = { top: [2, 28, 2], upper: [3, 28, 5], lower: [4, 24, 2], bottom: [5, 24, 5] };
    if (shape === 'toon' || shape === 'rectangle' || shape === 'big' || shape === 'square-far' || shape === 'curious' || shape === 'cyclops' || shape === 'lateral' || shape === 'single-big' || shape === 'single-small' || /^(dots|short|long)-(close|far)$/.test(shape)) {
      let copies, target, zones;
      if (shape === 'lateral') {
        target = [40, 34, 4, 2]; zones = [target];
        copies = [[40, 34, 3, 9], [43, 34, 20, 9], [40, 35, 3, 10], [41, 35, 4, 10], [42, 35, 19, 10], [43, 35, 20, 10]];
      } else if (shape === 'cyclops') {
        const config = { top: [32, 2], bottom: [34, 3] }[$('je-curious-position').value]; if (!config) return;
        const [y, row] = config; target = [52, y, 3, 2]; zones = [[52, 32, 3, 4]];
        copies = [[52, y, 8, 8 + row], [53, y, 10, 8 + row], [54, y, 11, 8 + row], [53, y + 1, 10, 9 + row], [54, y + 1, 11, 8 + row]];
      } else if (shape === 'single-big' || shape === 'single-small') {
        target = [44, 48, 6, 4]; zones = [target]; copies = [];
        const large = shape === 'single-big', size = large ? 4 : 2, faceStart = large ? 2 : 3, markerStart = large ? 44 : 45, markerY = large ? 48 : 49;
        for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) copies.push([markerStart + col, markerY + row, 8 + faceStart + col, 8 + faceStart + row]);
        copies.push([large ? 48 : 49, 51, 8, 10]);
      } else if (shape === 'curious') {
        const config = { top: [32, 2], bottom: [34, 3] }[$('je-curious-position').value]; if (!config) return;
        const [y, row] = config; target = [16, y, 4, 2]; zones = [[16, 32, 4, 4]]; copies = [];
        [1, 3, 4, 6].forEach((faceX, i) => copies.push([16 + i, y, 8 + faceX, 8 + row]));
        [1, 2, 5, 6].forEach((faceX, i) => copies.push([16 + i, y + 1, 8 + faceX, 9 + row]));
      } else if (shape === 'square-far') {
        target = [48, 48, 4, 3]; zones = [target]; copies = [];
        for (let row = 0; row < 3; row++) [0, 1, 6, 7].forEach((faceX, i) => copies.push([48 + i, 48 + row, 8 + faceX, 10 + row]));
      } else if (shape === 'rectangle' || shape === 'big') {
        target = [36, 32, shape === 'big' ? 8 : 4, 3]; zones = [[36, 32, 8, 3]];
        copies = [[36, 32, 8, 11], [39, 32, 15, 11]];
        for (let row = 0; row < 2; row++) {
          if (shape === 'rectangle') [0, 1, 6, 7].forEach((faceX, i) => copies.push([36 + i, 33 + row, 8 + faceX, 12 + row]));
          else {
            copies.push([36, 33 + row, 8, 12 + row], [39, 33 + row, 15, 12 + row]);
            [1, 2, 5, 6].forEach((faceX, i) => copies.push([40 + i, 32 + row, 8 + faceX, 12 + row]));
          }
        }
      } else if (shape === 'toon') {
        const config = { bottom: [36, 5, 4], mid: [36, 2, 3], top: [12, 32, 2] }[$('je-toon-position').value];
        if (!config) return;
        const [x, y, faceRow] = config; target = [x, y, 4, 3]; zones = [[36, 2, 4, 6], [12, 32, 4, 3]];
        copies = [];
        [1, 3, 4, 6].forEach((faceX, i) => copies.push([x + i, y, 8 + faceX, 8 + faceRow]));
        for (let row = 1; row < 3; row++) [1, 2, 5, 6].forEach((faceX, i) => copies.push([x + i, y + row, 8 + faceX, 8 + faceRow + row]));
      } else {
        const row = Number($('je-dot-position').value), [kind, spacing] = shape.split('-'), far = spacing === 'far';
        const minimum = kind === 'dots' ? 1 : kind === 'short' ? 2 : far ? 4 : 3;
        if (!Number.isInteger(row) || row < minimum || row > 6) { status('This eye shape does not have a guide layout for that row. Choose a supported row.'); return; }
        const markerY = (kind === 'long' ? 35 : 41) + row, faceX = far ? [1, 6] : [2, 5];
        const baseX = kind === 'short' ? 56 : 60, xs = far ? [baseX, baseX + 3] : [baseX + 1, baseX + 2];
        copies = xs.map((x, i) => [x, markerY, 8 + faceX[i], 8 + row]);
        target = [xs[0], markerY, xs[1] - xs[0] + 1, 1];
        zones = kind === 'dots' ? [[60, 42, 4, 6]] : kind === 'short' ? [[56, 43, 4, 5]] : [[60, 38, 4, 4]];
      }
      if (copies.some(([, , x, y]) => pixels[at(x, y) + 3] !== 255)) { status('The eye pixels at this position are transparent. Paint them on the face first.'); return; }
      const [tx, ty, tw, th] = target;
      for (const [zx, zy, zw, zh] of zones) for (let y = zy; y < zy + zh; y++) for (let x = zx; x < zx + zw; x++) {
        if (!(x >= tx && x < tx + tw && y >= ty && y < ty + th) && pixels[at(x, y) + 3]) { status('Other pixels are present in the eye marker area. Review them before applying this preset.'); return; }
      }
      if (!confirmArea(tx, ty, tw, th, 'the eye marker area')) return;
      const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
      remember(); clearArea(tx, ty, tw, th); for (const [x, y, value] of values) pixels.set(value, at(x, y));
      draw(); status('Eye markers applied. Test the downloaded skin with a compatible 2.0 pack.'); return;
    }
    if (shape === 'wide' || shape === 'flat') {
      const positions = { super: [2, 0], top: [2, 0], upper: [3, 2], lower: [4, 4], bottom: [5, 6] };
      const selected = positions[position]; if (!selected) return;
      const [wideRow, markerY] = selected, row = wideRow + (shape === 'flat' && position !== 'super' ? 1 : 0), markerX = position === 'super' ? 36 : 32;
      const copies = [[markerX, markerY, 8, 8 + row - 1], [markerX + 3, markerY, 15, 8 + row - 1]];
      if (shape === 'flat') {
        copies.push([markerX + 1, markerY, 9, 8 + row], [markerX + 2, markerY, 14, 8 + row],
          [markerX, markerY + 1, 8, 8 + row], [markerX + 3, markerY + 1, 15, 8 + row]);
      } else {
        [8, 9, 14, 15].forEach((x, i) => copies.push([markerX + i, markerY + 1, x, 8 + row]));
      }
      if (copies.some(([, , x, y]) => pixels[at(x, y) + 3] !== 255)) { status('The eye or eyelid pixels at this position are transparent. Paint them on the face first.'); return; }
      for (let y = 0; y < 8; y++) for (let x = 32; x < 40; x++) {
        if (!(x >= markerX && x < markerX + 4 && y >= markerY && y < markerY + 2) && pixels[at(x, y) + 3]) { status('Other pixels are present in the eye marker area. Review them before applying this preset.'); return; }
      }
      if (!confirmArea(markerX, markerY, 4, 2, 'the eye marker area')) return;
      const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
      remember(); clearArea(markerX, markerY, 4, 2);
      for (const [x, y, value] of values) pixels.set(value, at(x, y));
      draw(); status('Eye markers applied. Test the downloaded skin with a compatible 2.0 pack.'); return;
    }
    const isFar = shape === 'far' || shape === 'far-derp', isDerp = shape === 'derp' || shape === 'far-derp';
    const variant = (shape === 'square' ? square : standard)[position];
    if (!variant || !['standard', 'derp', 'far', 'far-derp', 'square'].includes(shape)) { status('This shape does not have a guide layout for that position.'); return; }
    const [row, baseX, markerY] = variant, markerX = position === 'super' ? (isFar ? 28 : 24) : (isFar ? 0 : baseX), height = shape === 'square' ? 3 : 2;
    const faceX = isFar ? [8, 9, 14, 15] : [9, 10, 13, 14];
    const copies = [[markerX, markerY, faceX[0], 8 + row - 1], [markerX + 3, markerY, faceX[3], 8 + row - 1]];
    if (isDerp) {
      copies.push([markerX + 1, markerY, faceX[1], 8 + row], [markerX + 2, markerY, faceX[2], 8 + row],
        [markerX, markerY + 1, faceX[0], 8 + row], [markerX + 3, markerY + 1, faceX[3], 8 + row]);
    } else {
      const rows = shape === 'square' ? 2 : 1;
      for (let r = 0; r < rows; r++) faceX.forEach((x, k) => copies.push([markerX + k, markerY + 1 + r, x, 8 + row + r]));
    }
    if (copies.some(entry => pixels[at(entry[2], entry[3]) + 3] !== 255)) { status('The eye or eyelid pixels at this position are transparent. Paint them on the face first.'); return; }
    const zones = shape === 'square' ? [[24, 2, 8, 6]] : [[isFar ? 0 : 4, 0, 4, 8], [isFar ? 28 : 24, 0, 4, 2]];
    for (const [x0, y0, width, h] of zones) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + width; x++) {
      if (!(x >= markerX && x < markerX + 4 && y >= markerY && y < markerY + height) && pixels[at(x, y) + 3]) {
        status('Other pixels are present in the eye marker area. Review them before applying this preset.'); return;
      }
    }
    if (!confirmArea(markerX, markerY, 4, height, 'the eye marker area')) return;
    const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
    remember(); clearArea(markerX, markerY, 4, height);
    for (const [x, y, value] of values) pixels.set(value, at(x, y));
    draw(); status('Eye markers applied. Test the downloaded skin with a compatible 2.0 pack.');
  });
  $('je-apply-brow').addEventListener('click', function () {
    if (!pixels) return;
    const options = { 'regular-top': [28, 48, 6], 'regular-upper': [28, 49, 6], 'regular-lower': [28, 50, 6], 'regular-bottom': [28, 51, 6], 'regular-super': [14, 48, 6], 'layer-top': [34, 48, 2], 'layer-upper': [34, 49, 2], 'layer-lower': [34, 50, 2], 'layer-bottom': [34, 51, 2] };
    const selected = options[$('je-brow').value]; if (!selected) return;
    const [x, y, width] = selected;
    // Refuse competing eyebrow marker positions instead of silently deleting them.
    for (const [ox, oy, ow] of Object.values(options)) {
      if (ox === x && oy === y && ow === width) continue;
      if (occupied(ox, oy, ow, 1)) { status('Other eyebrow-marker pixels are present. Review them before applying this preset.'); return; }
    }
    if (!confirmArea(x, y, width, 1, 'the eyebrow marker area')) return;
    remember(); for (let i = 0; i < width; i++) pixels.set(colour($('je-brow-color').value), at(x + i, y));
    draw(); status('Eyebrow markers applied. Add and edit a Universal Mask, then test in-game.');
  });
  $('je-apply-mouth').addEventListener('click', function () {
    if (!pixels) return;
    const options = { 'top-long': [50, 16, 4], 'top-short': [50, 17, 2], 'bottom-long': [51, 16, 4], 'bottom-short': [51, 17, 2] };
    const selected = options[$('je-mouth').value]; if (!selected) return;
    const [y, x, width] = selected, otherY = y === 50 ? 51 : 50;
    if (occupied(16, otherY, 4, 1)) { status('Other mouth-marker pixels are present. Review them before applying this preset.'); return; }
    if (!confirmArea(16, y, 4, 1, 'the mouth marker area')) return;
    remember(); clearArea(16, y, 4, 1); for (let i = 0; i < width; i++) pixels.set(colour($('je-mouth-color').value), at(x + i, y));
    draw(); status('Mouth markers applied. Add and edit a Universal Mask, then test in-game.');
  });
  $('je-copy-mask').addEventListener('click', function () {
    if (!pixels || !confirmArea(56, 0, 8, 8, 'the Universal Mask area')) return;
    const copy = new Uint8ClampedArray(8 * 8 * 4);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) copy.set(pixels.subarray(at(8 + x, 8 + y), at(8 + x, 8 + y) + 4), (y * 8 + x) * 4);
    const fill = colour($('je-mask-color').value), hidden = new Set();
    const hide = (row, columns) => { for (const x of columns) hidden.add(row * 8 + x); };
    if ($('je-mask-brow').checked) {
      const [layer, position] = $('je-brow').value.split('-');
      const browRows = { super: 1, top: 2, upper: 3, lower: 4, bottom: 5 };
      const row = browRows[position];
      const columns = layer === 'layer' ? [1, 2, 5, 6] : [0, 1, 2, 5, 6, 7];
      if (row !== undefined) hide(row, columns);
    }
    if ($('je-mask-mouth').checked) {
      const [position, width] = $('je-mouth').value.split('-');
      hide(position === 'bottom' ? 7 : 6, width === 'short' ? [3, 4] : [2, 3, 4, 5]);
    }
    const shape = $('je-eye-shape').value, dotRow = Number($('je-dot-position').value), [kind, spacing] = shape.split('-');
    const singleEye = /^(dots|short|long)-(close|far)$/.test(shape), height = kind === 'short' ? 2 : kind === 'long' ? 3 : 1;
    const minRow = kind === 'long' && spacing === 'far' ? 4 : height;
    const missingDotSelection = $('je-mask-dots').checked && (!singleEye || !Number.isInteger(dotRow) || dotRow < minRow || dotRow > 6);
    if ($('je-mask-dots').checked && !missingDotSelection) for (let row = dotRow - height + 1; row <= dotRow; row++) hide(row, spacing === 'far' ? [1, 6] : [2, 5]);
    // Sample only the original copy, excluding all selected feature pixels, so results don't depend on iteration order.
    const originalCopy = new Uint8ClampedArray(copy);
    for (const index of hidden) {
      const row = Math.floor(index / 8), x = index % 8;
      let value = fill;
      if ($('je-mask-mode').value === 'sample') {
        const candidates = Array.from({ length: 8 }, (_, col) => col)
          .filter(col => !hidden.has(row * 8 + col) && originalCopy[(row * 8 + col) * 4 + 3] === 255)
          .sort((a, b) => Math.abs(a - x) - Math.abs(b - x) || a - b);
        if (candidates.length) value = originalCopy.subarray((row * 8 + candidates[0]) * 4, (row * 8 + candidates[0]) * 4 + 4);
      }
      copy.set(value, index * 4);
    }
    remember(); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) pixels.set(copy.subarray((y * 8 + x) * 4, (y * 8 + x) * 4 + 4), at(56 + x, y));
    $('je-view').value = 'top-right'; $('je-pixel-tools').open = true; draw();
    status((missingDotSelection ? 'Choose a supported dots, short or long eye shape and row to hide those eyes. ' : '') + 'Mask copied. Review and edit it: selected areas may include shading or hair, and other features may still need hiding.');
  });
  root.querySelectorAll('[data-je-tool]').forEach((button) => button.addEventListener('click', function () {
    tool = this.dataset.jeTool;
    root.querySelectorAll('[data-je-tool]').forEach((b) => { const active = b === this; b.setAttribute('aria-pressed', String(active)); b.classList.toggle('ghost', !active); });
  }));
  function locate(event) {
    const r = canvas.getBoundingClientRect(), area = views[$('je-view').value] || views.full;
    if (!r.width || !r.height || event.clientX < r.left || event.clientY < r.top || event.clientX >= r.right || event.clientY >= r.bottom) return null;
    return [area[0] + Math.floor((event.clientX - r.left) * area[2] / r.width), area[1] + Math.floor((event.clientY - r.top) * area[2] / r.height)];
  }
  function paint(x, y) {
    const i = at(x, y), hex = $('je-color').value;
    if (tool === 'eraser') pixels.fill(0, i, i + 4);
    else { pixels[i] = parseInt(hex.slice(1, 3), 16); pixels[i + 1] = parseInt(hex.slice(3, 5), 16); pixels[i + 2] = parseInt(hex.slice(5, 7), 16); pixels[i + 3] = 255; }
  }
  function stroke(a, b) {
    let x = a[0], y = a[1], dx = Math.abs(b[0] - x), dy = Math.abs(b[1] - y), sx = x < b[0] ? 1 : -1, sy = y < b[1] ? 1 : -1, err = dx - dy;
    while (true) { paint(x, y); if (x === b[0] && y === b[1]) break; const e = 2 * err; if (e > -dy) { err -= dy; x += sx; } if (e < dx) { err += dx; y += sy; } }
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (!pixels || e.button !== 0) return; const p = locate(e); if (!p) return; e.preventDefault();
    if (tool === 'picker') { const i = at(p[0], p[1]); if (!pixels[i + 3]) { status('That pixel is transparent.'); return; } $('je-color').value = '#' + Array.from(pixels.subarray(i, i + 3), n => n.toString(16).padStart(2, '0')).join(''); status('Picked colour at ' + p.join(', ') + '.'); return; }
    history.push(new Uint8ClampedArray(pixels)); if (history.length > 30) history.shift(); drawing = true; last = p; if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); paint(p[0], p[1]); draw();
  });
  canvas.addEventListener('pointermove', function (e) { const p = locate(e); if (!p) { last = null; return; } $('je-coords').textContent = 'Pixel: X ' + p[0] + ', Y ' + p[1]; if (drawing && pixels) { stroke(last || p, p); last = p; draw(); } });
  function stop() { drawing = false; last = null; }
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop); canvas.addEventListener('lostpointercapture', stop);
  $('je-undo').addEventListener('click', function () { if (!history.length) return; pixels = history.pop(); draw(); status('Undid the last stroke.'); });
  $('je-reset').addEventListener('click', function () { if (!original) return; history.push(new Uint8ClampedArray(pixels)); if (history.length > 30) history.shift(); pixels = new Uint8ClampedArray(original); draw(); status('Skin reset to the loaded image.'); });
})();
