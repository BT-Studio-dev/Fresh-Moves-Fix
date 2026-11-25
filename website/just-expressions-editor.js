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
  const controlIds = ['je-eye-shape','je-eye-position','je-toon-position','je-curious-position','je-dot-position','je-brow','je-mouth','je-brow-color','je-mouth-color','je-eye-white','je-eye-pupil','je-mask-toggle','je-mask-dots','je-mask-mode','je-mask-color'];
  let active = { brow: null, mouth: null }, ownership = new Uint8Array(4096), patches = { eye: [], brow: [], mouth: [] }, maskBackup = null;
  let committed = controls(), otherMarkers = false;
  function controls() { const result = {}; for (const id of controlIds) { const e = $(id); result[id] = e.type === 'checkbox' ? e.checked : e.value; } return result; }
  function restoreControls(values) { for (const id of controlIds) { const e = $(id); if (e.type === 'checkbox') e.checked = values[id]; else e.value = values[id]; } syncOptions(); document.dispatchEvent(new Event('je-controls-sync')); }
  function snapshot() { return { pixels: new Uint8ClampedArray(pixels), ownership: new Uint8Array(ownership), patches: JSON.parse(JSON.stringify(patches)), maskBackup: maskBackup && JSON.parse(JSON.stringify(maskBackup)), active: { ...active }, controls: { ...committed } }; }
  function restore(entry) { pixels = new Uint8ClampedArray(entry.pixels); ownership = new Uint8Array(entry.ownership); patches = JSON.parse(JSON.stringify(entry.patches)); maskBackup = entry.maskBackup && JSON.parse(JSON.stringify(entry.maskBackup)); active = { ...entry.active }; restoreControls(entry.controls); committed = controls(); }
  function remember(entry = snapshot()) { history.push(entry); if (history.length > 30) history.shift(); }
  function syncOptions() {
    const shape = $('je-eye-shape').value;
    $('je-standard-options').hidden = !['standard','derp','far','far-derp','square','wide','flat'].includes(shape);
    $('je-toon-options').hidden = shape !== 'toon';
    $('je-curious-options').hidden = shape !== 'curious' && shape !== 'cyclops';
    $('je-dot-options').hidden = !/^(dots|short|long)-(close|far)$/.test(shape);
    const pos = $('je-eye-position'), superOption = Array.from(pos.options).find(o => o.value === 'super');
    superOption.disabled = shape === 'square';
    if (superOption.disabled && pos.value === 'super') pos.value = 'top';
    const dot = $('je-dot-position'), minimum = shape.startsWith('long-') ? (shape.endsWith('-far') ? 4 : 3) : shape.startsWith('short-') ? 2 : 1;
    for (const option of dot.options) option.disabled = Number(option.value) < minimum;
    if (Number(dot.value) < minimum) dot.value = String(minimum);
  }
  function release(group) {
    const id = { eye: 1, brow: 2, mouth: 3 }[group];
    for (const p of patches[group]) {
      if (ownership[p.index] === id && p.after.every((v, k) => pixels[p.index * 4 + k] === v)) {
        pixels.set(p.before, p.index * 4); ownership[p.index] = p.beforeOwner || 0;
      } else {
        // If a newer feature covers this pixel, remove this layer from its restore chain.
        for (const other of Object.keys(patches)) if (other !== group) for (const next of patches[other]) {
          if (next.index === p.index && next.beforeOwner === id && next.before.every((v,k) => v === p.after[k])) {
            next.before = p.before.slice(); next.beforeOwner = p.beforeOwner || 0;
          }
        }
      }
    }
    patches[group] = [];
  }
  function maskNeeded() {
    return !!active.brow || !!active.mouth || ($('je-mask-dots').checked && /^(dots|short|long)-(close|far)$/.test($('je-eye-shape').value));
  }
  function restoreMask() {
    if (!maskBackup) return;
    for (const p of maskBackup) if (p.after.every((v,k) => pixels[p.index * 4 + k] === v)) {
      pixels.set(p.before, p.index * 4); ownership[p.index] = p.beforeOwner;
    }
    maskBackup = null;
  }
  function transact(group, apply, mask) {
    if (!pixels) { committed = controls(); return; }
    const before = snapshot(); otherMarkers = false;
    if (group) release(group);
    const baseline = new Uint8ClampedArray(pixels), baselineOwnership = new Uint8Array(ownership);
    if (apply && !apply()) { restore(before); draw(); return; }
    if (group) {
      const id = { eye: 1, brow: 2, mouth: 3 }[group];
      for (let i=0;i<4096;i++) {
        const offset=i*4, previous=baseline.slice(offset,offset+4), next=pixels.slice(offset,offset+4);
        if (previous.some((v,k)=>v!==next[k])) { patches[group].push({index:i,before:Array.from(previous),after:Array.from(next),beforeOwner:baselineOwnership[i]}); ownership[i]=id; }
      }
    }
    if (mask === 'auto') { if (maskNeeded()) generateMask(); else restoreMask(); }
    else if (mask) generateMask();
    const changed = before.pixels.some((v,i)=>v!==pixels[i]);
    const nextControls = controls(), controlChanged = Object.keys(nextControls).some(id => nextControls[id] !== before.controls[id]);
    if (changed || controlChanged) remember(before);
    committed = nextControls; draw();
    if (changed || controlChanged) status('Updated automatically. Undo restores the previous skin. ' + (otherMarkers ? 'Other marker-area pixels were preserved; review them. ' : '') + 'Review the mask and test in-game.');
  }
  // Loading a new skin never applies presets implicitly; returning unchanged keeps undo.
  window.JustExpressionsEditor = {
    setSkin(data, name, forceNew = false) {
      const incoming = new Uint8ClampedArray(data);
      const same = pixels && pixels.length === incoming.length && pixels.every((v, i) => v === incoming[i]);
      if (forceNew || !same) {
        pixels = incoming; original = new Uint8ClampedArray(incoming); history = [];
        active = { brow: null, mouth: null }; ownership = new Uint8Array(4096); patches = { eye: [], brow: [], mouth: [] }; maskBackup = null;
        $('je-eye-shape').value = $('je-brow').value = $('je-mouth').value = 'keep';
        $('je-eye-position').value = 'upper'; $('je-toon-position').value = $('je-curious-position').value = 'bottom'; $('je-dot-position').value = '6';
        $('je-mask-toggle').checked = true; $('je-mask-dots').checked = false;
        syncOptions(); committed = controls(); document.dispatchEvent(new Event('je-controls-sync'));
      }
      $('je-copy-mask').disabled = false;
      draw(); status((name || 'Skin') + ' ready. Choose a preset or open the manual tools.');
    },
    getSkin() { return pixels && new Uint8ClampedArray(pixels); },
    getOriginal() { return original && new Uint8ClampedArray(original); },
    hasEye() { return !!pixels && $('je-eye-shape').value !== 'keep' && patches.eye.length > 0; },
    eyeFrame(data, state) {
      const out = new Uint8ClampedArray(data), cells = featureCells('je-eye-shape', $('je-eye-shape').value);
      if (!cells.length) return out;
      const eyeSet = new Set(cells.map(c => c.y * 8 + c.x));
      if (state === 'shut') for (const cell of cells) {
        const candidates = [];
        for (let row=0; row<8; row++) for (let col=0; col<8; col++) {
          const i=at(8+col,8+row);
          if (!eyeSet.has(row*8+col) && data[i+3] === 255) candidates.push({i, distance: Math.abs(row-cell.y)*2+Math.abs(col-cell.x)});
        }
        candidates.sort((a,b)=>a.distance-b.distance);
        if (candidates.length) out.set(data.subarray(candidates[0].i,candidates[0].i+4),at(8+cell.x,8+cell.y));
      } else {
        for (let row=0;row<8;row++) for (let side=0;side<2;side++) {
          const group=cells.filter(c=>c.y===row && (c.x>=4?1:0)===side).sort((a,b)=>a.x-b.x);
          if (group.length<2 || !group.some(c=>c.role==='white') || !group.some(c=>c.role==='pupil')) continue;
          const pupil=state==='left'?group[0].x:group[group.length-1].x;
          for (const c of group) out.set(colour(c.x===pupil ? $('je-eye-pupil').value : $('je-eye-white').value), at(8+c.x,8+c.y));
        }
      }
      return out;
    },
    onChange: null
  };
  $('je-guide').addEventListener('change', function () { $('je-guide-link').href = '../guides/just-expressions/' + encodeURIComponent(this.value) + '/'; });
  $('je-view').addEventListener('change', draw);
  function clearArea(x, y, width, height) { for (let j = y; j < y + height; j++) for (let i = x; i < x + width; i++) pixels.fill(0, at(i, j), at(i, j) + 4); }
  function otherPixels(zones, x, y, width, height) {
    return zones.some(([zx,zy,zw,zh]) => { for (let j=zy;j<zy+zh;j++) for (let i=zx;i<zx+zw;i++) if (!(i>=x && i<x+width && j>=y && j<y+height) && pixels[at(i,j)+3]) return true; return false; });
  }
  function colour(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(255); }
  function featureCells(id, value) {
    if (!window.FMFJEThumbnail || value === 'keep') return [];
    // Distinct sentinel colours preserve the geometry even when chosen colours match.
    const state = { shape: $('je-eye-shape').value, position: $('je-eye-position').value,
      toon: $('je-toon-position').value, curious: $('je-curious-position').value, dot: $('je-dot-position').value,
      white: '#112233', pupil: '#445566', brow: '#778899', mouth: '#aabbcc', oldCells: [] };
    const layout = window.FMFJEThumbnail.pixels(new Uint8ClampedArray(256), id, value, state), cells=[];
    for (let i=0;i<64;i++) if (layout[i*4+3]) cells.push({x:i%8, y:Math.floor(i/8), role:layout[i*4]===17?'white':layout[i*4]===68?'pupil':'feature'});
    return cells;
  }
  function paintFeature(id, value, color, layer) {
    for (const cell of featureCells(id, value)) {
      const face=at(8+cell.x,8+cell.y), hat=at(40+cell.x,8+cell.y);
      const chosen = id === 'je-eye-shape' ? (cell.role === 'white' ? $('je-eye-white').value : $('je-eye-pupil').value) : color;
      if (layer) pixels.set(colour(chosen),hat);
      else { pixels.set(colour(chosen),face); if (pixels[hat+3]) pixels.fill(0,hat,hat+4); }
    }
  }
  // Coordinates are transcribed from the Just Expressions 2.0 guide diagrams.
  // Selected facial features are painted first; marker sources are sampled afterward.
  function applyEye() {
    if (!pixels) return;
    const position = $('je-eye-position').value, shape = $('je-eye-shape').value;
    paintFeature('je-eye-shape', shape, null, false);
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
      otherMarkers = otherPixels(zones, tx, ty, tw, th);
      const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
      clearArea(tx, ty, tw, th); for (const [x, y, value] of values) pixels.set(value, at(x, y));
      return true;
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
      otherMarkers = otherPixels([[32,0,8,8]], markerX, markerY, 4, 2);
      const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
      clearArea(markerX, markerY, 4, 2);
      for (const [x, y, value] of values) pixels.set(value, at(x, y));
      return true;
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
    const zones = shape === 'square' ? [[24,2,8,6]] : [[isFar ? 0 : 4,0,4,8],[isFar ? 28 : 24,0,4,2]];
    otherMarkers = otherPixels(zones, markerX, markerY, 4, height);
    const values = copies.map(([x, y, fromX, fromY]) => [x, y, new Uint8ClampedArray(pixels.subarray(at(fromX, fromY), at(fromX, fromY) + 4))]);
    clearArea(markerX, markerY, 4, height);
    for (const [x, y, value] of values) pixels.set(value, at(x, y));
    return true;
  }
  function applyBrow() {
    const options = { 'regular-top': [28, 48, 6], 'regular-upper': [28, 49, 6], 'regular-lower': [28, 50, 6], 'regular-bottom': [28, 51, 6], 'regular-super': [14, 48, 6], 'layer-top': [34, 48, 2], 'layer-upper': [34, 49, 2], 'layer-lower': [34, 50, 2], 'layer-bottom': [34, 51, 2] };
    const selected = options[$('je-brow').value]; if (!selected) return false;
    const [x, y, width] = selected;
    paintFeature('je-brow', $('je-brow').value, $('je-brow-color').value, $('je-brow').value.startsWith('layer-'));
    otherMarkers = otherPixels([[28,48,8,4],[14,48,6,1]], x, y, width, 1);
    for (let i=0;i<width;i++) pixels.set(colour($('je-brow-color').value), at(x+i,y));
    active.brow = $('je-brow').value; return true;
  }
  function applyMouth() {
    const options = { 'top-long': [50, 16, 4], 'top-short': [50, 17, 2], 'bottom-long': [51, 16, 4], 'bottom-short': [51, 17, 2] };
    const selected = options[$('je-mouth').value]; if (!selected) return false;
    const [y, x, width] = selected;
    paintFeature('je-mouth', $('je-mouth').value, $('je-mouth-color').value, false);
    otherMarkers = otherPixels([[16,50,4,2]], 16, y, 4, 1);
    clearArea(16, y, 4, 1); for (let i=0;i<width;i++) pixels.set(colour($('je-mouth-color').value), at(x+i,y));
    active.mouth = $('je-mouth').value; return true;
  }
  function generateMask() {
    if (!pixels) return;
    const copy = new Uint8ClampedArray(8 * 8 * 4);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) copy.set(pixels.subarray(at(8 + x, 8 + y), at(8 + x, 8 + y) + 4), (y * 8 + x) * 4);
    const fill = colour($('je-mask-color').value), hidden = new Set();
    const hide = (row, columns) => { for (const x of columns) hidden.add(row * 8 + x); };
    if ($('je-mask-toggle').checked && active.brow) {
      const [layer, position] = active.brow.split('-');
      const browRows = { super: 1, top: 2, upper: 3, lower: 4, bottom: 5 };
      const row = browRows[position];
      const columns = layer === 'layer' ? [1, 2, 5, 6] : [0, 1, 2, 5, 6, 7];
      if (row !== undefined) hide(row, columns);
    }
    if ($('je-mask-toggle').checked && active.mouth) {
      const [position, width] = active.mouth.split('-');
      hide(position === 'bottom' ? 7 : 6, width === 'short' ? [3, 4] : [2, 3, 4, 5]);
    }
    const shape = $('je-eye-shape').value, dotRow = Number($('je-dot-position').value), [kind, spacing] = shape.split('-');
    const singleEye = /^(dots|short|long)-(close|far)$/.test(shape), height = kind === 'short' ? 2 : kind === 'long' ? 3 : 1;
    const minRow = kind === 'long' && spacing === 'far' ? 4 : height;
    const missingDotSelection = $('je-mask-toggle').checked && $('je-mask-dots').checked && (!singleEye || !Number.isInteger(dotRow) || dotRow < minRow || dotRow > 6);
    if ($('je-mask-toggle').checked && $('je-mask-dots').checked && !missingDotSelection) for (let row = dotRow - height + 1; row <= dotRow; row++) hide(row, spacing === 'far' ? [1, 6] : [2, 5]);
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
    if (!maskBackup) maskBackup = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const i=at(56+x,y), index=i/4, value=Array.from(copy.subarray((y*8+x)*4,(y*8+x)*4+4));
      let entry=maskBackup.find(p => p.index === index);
      if (!entry) { entry={index, before:Array.from(pixels.slice(i,i+4)), beforeOwner:ownership[index], after:value}; maskBackup.push(entry); }
      else if (!entry.after.every((v,k) => pixels[i+k] === v)) { entry.before=Array.from(pixels.slice(i,i+4)); entry.beforeOwner=ownership[index]; }
      entry.after=value; pixels.set(value,i); ownership[index] = 0;
    }
    if (missingDotSelection) status('Choose a supported dots, short or long eye shape and row to hide those eyes.');
  }
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
    const i = at(x, y), hex = $('je-color').value; ownership[i / 4] = 0;
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
    remember(); drawing = true; last = p; if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); paint(p[0], p[1]); draw();
  });
  canvas.addEventListener('pointermove', function (e) { const p = locate(e); if (!p) { last = null; return; } $('je-coords').textContent = 'Pixel: X ' + p[0] + ', Y ' + p[1]; if (drawing && pixels) { stroke(last || p, p); last = p; draw(); } });
  function stop() { drawing = false; last = null; }
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop); canvas.addEventListener('lostpointercapture', stop);
  $('je-undo').addEventListener('click', function () { if (!history.length) return; restore(history.pop()); draw(); status('Undid the last edit.'); });
  $('je-reset').addEventListener('click', function () { if (!original || !pixels) return; remember(); pixels = new Uint8ClampedArray(original); ownership = new Uint8Array(4096); patches = { eye: [], brow: [], mouth: [] }; maskBackup = null; active = { brow: null, mouth: null }; $('je-eye-shape').value = $('je-brow').value = $('je-mouth').value = 'keep'; syncOptions(); committed = controls(); document.dispatchEvent(new Event('je-controls-sync')); draw(); status('Skin reset to the loaded image.'); });
  $('je-eye-shape').addEventListener('change', function () {
    syncOptions();
    if (this.value !== 'keep') transact('eye', applyEye, maskNeeded() ? 'auto' : false);
    else transact('eye', null, 'auto');
  });
  for (const id of ['je-eye-position','je-toon-position','je-curious-position','je-dot-position']) $(id).addEventListener('change', function () { if ($('je-eye-shape').value !== 'keep') transact('eye', applyEye, maskNeeded() ? 'auto' : false); else committed = controls(); });
  for (const [id, group, apply] of [['je-brow','brow',applyBrow], ['je-mouth','mouth',applyMouth]]) $(id).addEventListener('change', function () {
    if (this.value !== 'keep') transact(group, apply, 'auto');
    else transact(group, () => { active[group] = null; return true; }, 'auto');
  });
  for (const [id, group, select, apply] of [['je-brow-color','brow','je-brow',applyBrow], ['je-mouth-color','mouth','je-mouth',applyMouth], ['je-eye-white','eye','je-eye-shape',applyEye], ['je-eye-pupil','eye','je-eye-shape',applyEye]]) {
    const update = () => { if ($(id).value === committed[id]) return; if ($(select).value !== 'keep') transact(group, apply, group !== 'eye' || maskNeeded()); else committed = controls(); };
    $(id).addEventListener('input', update); $(id).addEventListener('change', update);
  }
  for (const id of ['je-mask-toggle','je-mask-dots','je-mask-mode','je-mask-color']) {
    const update = () => { if (controls()[id] === committed[id]) return; if (active.brow || active.mouth || $('je-mask-dots').checked) transact(null, null, true); else committed = controls(); };
    $(id).addEventListener('input', update); $(id).addEventListener('change', update);
  }
  $('je-copy-mask').addEventListener('click', () => { if (!pixels) return; transact(null, null, true); if (!maskNeeded()) maskBackup = null; $('je-view').value = 'top-right'; $('je-pixel-tools').open = true; draw(); });
  syncOptions();
})();
