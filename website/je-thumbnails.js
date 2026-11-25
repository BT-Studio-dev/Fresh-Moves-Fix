// Illustrative 8x8 face thumbnails. These never alter the skin or write markers;
// the 2.0 presets sample an existing face rather than drawing these example eyes.
(function () {
  function pixels(base, id, value, s) {
    const out = new Uint8ClampedArray(base);
    if (value === 'keep') return out;
    const put = (x, y, c) => { if (x < 0 || x > 7 || y < 0 || y > 7) return; out.set(c, (y * 8 + x) * 4); };
    const color = (hex, fallback) => /^#[0-9a-f]{6}$/i.test(hex || '') ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).concat(255) : fallback;
    const white = color(s.white, [255,255,255,255]), pupil = color(s.pupil, [65,68,150,255]);
    if (id === 'je-brow') {
      const [layer, pos] = value.split('-'), row = {super:1, top:2, upper:3, lower:4, bottom:5}[pos];
      if (row !== undefined) for (const x of layer === 'layer' ? [1,2,5,6] : [0,1,2,5,6,7]) put(x,row,color(s.brow,[70,49,36,255]));
      return out;
    }
    if (id === 'je-mouth') {
      const [pos, width] = value.split('-');
      for (const x of width === 'short' ? [3,4] : [2,3,4,5]) put(x,pos === 'bottom' ? 7 : 6,color(s.mouth,[196,130,106,255]));
      return out;
    }
    const shape = id === 'je-eye-shape' ? value : s.shape;
    const position = id === 'je-eye-position' ? value : s.position;
    const toon = id === 'je-toon-position' ? value : s.toon;
    const curious = id === 'je-curious-position' ? value : s.curious;
    const dot = Number(id === 'je-dot-position' ? value : s.dot);
    // Clear only conservatively detected old eye cells from this illustrative copy.
    const lid = color(s.lid, [155,99,73,255]);
    for (const cell of (s.oldCells || [])) put(cell[0], cell[1], lid);
    const row = {super:2,top:3,upper:4,lower:5,bottom:6}[position] ?? 4;
    const pair = (cols, rows, cross = false) => rows.forEach(y => cols.forEach((x,i) => put(x,y, (i === (cross ? 0 : 1) || i === (cross ? 3 : 2)) ? pupil : white)));
    if (/^(dots|short|long)-(close|far)$/.test(shape)) {
      const [kind, spacing] = shape.split('-'), h = kind === 'short' ? 2 : kind === 'long' ? 3 : 1;
      const y = Number.isFinite(dot) ? dot : 6;
      for (let r = y-h+1; r <= y; r++) for (const x of spacing === 'far' ? [1,6] : [2,5]) put(x,r,pupil);
    } else if (shape === 'single-big' || shape === 'single-small') {
      const big = shape === 'single-big', start = big ? 2 : 3, size = big ? 4 : 2;
      for (let y=start;y<start+size;y++) for(let x=start;x<start+size;x++) put(x,y,pupil);
    } else if (shape === 'cyclops') {
      const y = curious === 'top' ? 2 : 3; for (let r=y;r<y+2;r++) for (const x of [2,3,4,5]) put(x,r, x===3||x===4 ? pupil : white);
    } else if (shape === 'curious') {
      const y=curious === 'top' ? 2 : 3; pair([1,2,5,6],[y,y+1]);
    } else if (shape === 'toon') {
      const y = {top:2,mid:3,bottom:4}[toon] ?? 4; pair([1,2,5,6],[y,y+1,y+2]);
    } else if (shape === 'rectangle' || shape === 'big') {
      for (const y of [4,5]) for (const x of [0,1,2,5,6,7]) put(x,y, shape === 'big' ? (x===0||x===7?white:pupil) : (x===1||x===6?pupil:white));
    } else if (shape === 'square-far') pair([0,1,6,7],[3,4]);
    else if (shape === 'square') { const y={top:2,upper:3,lower:4,bottom:5}[position] ?? 2; pair([1,2,5,6],[y,y+1]); }
    else if (shape === 'wide' || shape === 'flat') { const y=({super:2,top:2,upper:3,lower:4,bottom:5}[position] ?? 3) + (shape === 'flat' && position !== 'super' ? 1 : 0); for(const x of [0,1,2,5,6,7]) put(x,y,(x===1||x===6)?pupil:white); }
    else if (shape === 'lateral') { for(const x of [0,7])put(x,2,pupil); }
    else pair(shape === 'far' || shape === 'far-derp' ? [0,1,6,7] : [1,2,5,6], [row], shape === 'derp' || shape === 'far-derp');
    return out;
  }
  window.FMFJEThumbnail = { pixels };
})();
