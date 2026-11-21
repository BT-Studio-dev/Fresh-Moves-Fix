// Fresh Moves Fix - Skin Painter 3D. Paint a Minecraft skin on a 3D model or on the flat skin file.
// Runs entirely in the browser and needs no WebGL: the model is drawn on a normal 2D canvas.
(function () {
  const $ = (id) => document.getElementById(id);
  const cv3 = $("p3d"), cv2 = $("p2d");
  if (!cv3 || !cv2) return;
  const g3 = cv3.getContext("2d"), g2 = cv2.getContext("2d");
  const skin = document.createElement("canvas"); skin.width = skin.height = 64;
  const sctx = skin.getContext("2d", { willReadFrequently: true });
  let px = new Uint8ClampedArray(64 * 64 * 4); // the skin pixels being painted

  let size = 1, symmetry = false, grid = true, color2 = [255, 255, 255], altOn = false; // brush size, mirror painting, pixel grid, second colour (right click)
  let alpha = 255; // 255 = solid, lower = see-through (glass)
  let tool = "pen", color = [59, 130, 196], slim = false, target = 0, showOuter = true, pose = "stand";
  let walk = false, sneak = false, fly = false, phase = 0, lastT = 0; // walking movement of the 3D model
  let yaw = 0.55, pitch = 0.15, zoom = 0.9, hover = null, dirty = true, dead = false, raf = 0;
  const hidden = {}, hiddenLayers = {};
  const undo = [], redo = [];
  let stroke = null; // { before, changed, seen, last }
  let picks = [];    // what can be clicked in the 3D picture

  // ---------- the model ----------
  // [part, u, v, width, height, depth, centre x, centre y, centre z, inflate, layer]
  function parts() {
    const aw = slim ? 3 : 4, ax = slim ? 5.5 : 6;
    return [
      ["head", 0, 0, 8, 8, 8, 0, 28, 0, 0, 0], ["head", 32, 0, 8, 8, 8, 0, 28, 0, 0.5, 1],
      ["body", 16, 16, 8, 12, 4, 0, 18, 0, 0, 0], ["body", 16, 32, 8, 12, 4, 0, 18, 0, 0.25, 1],
      ["ra", 40, 16, aw, 12, 4, -ax, 18, 0, 0, 0], ["ra", 40, 32, aw, 12, 4, -ax, 18, 0, 0.25, 1],
      ["la", 32, 48, aw, 12, 4, ax, 18, 0, 0, 0], ["la", 48, 48, aw, 12, 4, ax, 18, 0, 0.25, 1],
      ["rl", 0, 16, 4, 12, 4, -2, 6, 0, 0, 0], ["rl", 0, 32, 4, 12, 4, -2, 6, 0, 0.25, 1],
      ["ll", 16, 48, 4, 12, 4, 2, 6, 0, 0, 0], ["ll", 0, 48, 4, 12, 4, 2, 6, 0, 0.25, 1],
    ];
  }
  const PIV = { head: [0, 24, 0], body: [0, 24, 0], ra: [-5, 22, 0], la: [5, 22, 0], rl: [-2, 12, 0], ll: [2, 12, 0] };
  const POSES = {
    stand: { ra: 0, la: 0, rl: 0, ll: 0 },
    apart: { ra: -0.7, la: 0.7, rl: -0.28, ll: 0.28 }, // arms and legs away from the body, to reach their inner sides
  };
  // the six rectangles of a box in the skin file: [x, y, w, h]
  function rects(u, v, w, h, d) {
    return [[u + d, v + d, w, h], [u + 2 * d + w, v + d, w, h], [u, v + d, d, h], [u + d + w, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d]];
  }
  function faceRects() { const R = []; for (const p of parts()) for (const r of rects(p[1], p[2], p[3], p[4], p[5])) R.push([r[0], r[1], r[2], r[3], p[10]]); return R; }

  function draw3d() {
    const W = cv3.width, H = cv3.height; g3.clearRect(0, 0, W, H);
    const sc = (H / 46) * zoom, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), A = POSES[pose] || POSES.stand;
    const quads = [], over = []; picks = []; capeBox = null;
    const sw = walk && !fly ? Math.sin(phase) * (sneak ? 0.45 : 0.7) : 0, SW = { ra: sw, la: -sw, rl: -sw, ll: sw }, OFF = {};
    let tilt = 0;
    if (fly) { tilt = 1.0; SW.head = -0.75; } // flying: the whole body lies forward, the head looks ahead
    else if (sneak) { SW.body = 0.5; SW.ra += 0.4; SW.la += 0.4; OFF.rl = OFF.ll = [1.47, -5.75]; OFF.head = [-1, 0]; } // sneaking: body bent forward, legs set back
    const tc = Math.cos(tilt), ts = Math.sin(tilt);
    const cam = (X, Y, Z) => { // whole-body tilt, then the camera
      if (tilt) { const y2 = Y * tc - Z * ts; Z = Y * ts + Z * tc; Y = y2; }
      const x3 = X * cy + Z * sy, z3 = -X * sy + Z * cy, y4 = Y * cp - z3 * sp, z4 = Y * sp + z3 * cp, f = 90 / (90 - z4);
      return [W / 2 + x3 * f * sc, H / 2 - y4 * f * sc, z4];
    };
    const pt = (name, x, y, z) => {
      const a = A[name] || 0, pv = PIV[name];
      let X = x - pv[0], Y = y - pv[1], Z = z - pv[2];
      if (a) { const c = Math.cos(a), s = Math.sin(a), x2 = X * c - Y * s; Y = X * s + Y * c; X = x2; }
      const w = SW[name]; // walking: arms and legs swing forwards and backwards
      if (w) { const c = Math.cos(w), s = Math.sin(w), y2 = Y * c - Z * s; Z = Y * s + Z * c; Y = y2; }
      X += pv[0]; Y += pv[1] - 16; Z += pv[2];
      const of = OFF[name]; if (of) { Y += of[0]; Z += of[1]; }
      return cam(X, Y, Z);
    };
    for (const [name, u, v, w, h, dp, cx, cyy, cz, inf, layer] of parts()) {
      if (hidden[name] || hiddenLayers[name + ":" + layer]) continue;
      if (layer === 1 && !showOuter) continue;
      const sx = (w + 2 * inf) / w, sy2 = (h + 2 * inf) / h, sz = (dp + 2 * inf) / dp, top = cyy + h / 2 * sy2;
      const R = rects(u, v, w, h, dp);
      const F = [
        (i, j) => [cx + (-w / 2 + i) * sx, top - j * sy2, cz + dp / 2 * sz],          // front
        (i, j) => [cx + (w / 2 - i) * sx, top - j * sy2, cz - dp / 2 * sz],           // back
        (i, j) => [cx - w / 2 * sx, top - j * sy2, cz + (-dp / 2 + i) * sz],          // player's right
        (i, j) => [cx + w / 2 * sx, top - j * sy2, cz + (dp / 2 - i) * sz],           // player's left
        (i, j) => [cx + (-w / 2 + i) * sx, top, cz + (-dp / 2 + j) * sz],             // top
        (i, j) => [cx + (-w / 2 + i) * sx, top - h * sy2, cz + (-dp / 2 + j) * sz],   // bottom
      ];
      for (let fi = 0; fi < 6; fi++) {
        const fu = R[fi][0], fv = R[fi][1], cols = R[fi][2], rows = R[fi][3], fn = F[fi];
        const c00 = pt(name, ...fn(0, 0)), c10 = pt(name, ...fn(cols, 0)), c01 = pt(name, ...fn(0, rows));
        let cross = (c10[0] - c00[0]) * (c01[1] - c00[1]) - (c10[1] - c00[1]) * (c01[0] - c00[0]);
        if (fi === 5) cross = -cross;
        const front = cross > 0;
        if (!front && layer === 0) continue;
        const C = cols + 1, grid = [];
        for (let jj = 0; jj <= rows; jj++) for (let ii = 0; ii <= cols; ii++) grid.push(pt(name, ...fn(ii, jj)));
        const shade = front ? (fi < 2 ? 1 : fi < 4 ? 0.82 : fi === 4 ? 1 : 0.6) : 0.7;
        for (let jj = 0; jj < rows; jj++) for (let ii = 0; ii < cols; ii++) {
          const tx = fu + ii, ty = fv + jj, o = (ty * 64 + tx) * 4;
          const a = grid[jj * C + ii], b = grid[jj * C + ii + 1], c = grid[(jj + 1) * C + ii + 1], e = grid[(jj + 1) * C + ii];
          const z = (a[2] + b[2] + c[2] + e[2]) / 4;
          if (front && layer === target) picks.push([z, a, b, c, e, tx, ty]);
          if (px[o + 3]) quads.push([z, a, b, c, e, "rgba(" + Math.round(px[o] * shade) + "," + Math.round(px[o + 1] * shade) + "," + Math.round(px[o + 2] * shade) + "," + (px[o + 3] / 255) + ")"]);
        }
      }
    }
    if (cape && !fly) { // cape like in Minecraft: a 10 x 16 x 1 box, hinged at the shoulders, hanging away from the back
      const xr = 0.11 + (sneak ? 0.55 : 0) + (walk ? 0.32 + Math.sin(phase * 2) * 0.07 : 0), c = Math.cos(xr), sn = Math.sin(xr);
      const P = (x, j, t) => cam(x, 8 - j * c + t * sn, -2.02 - j * sn - t * c); // t: 0 = side towards the body, 1 = outside
      const bias = (cam(0, 8, -10)[2] - cam(0, 8, 0)[2]) * 0.3; // seen from behind the cape is in front of the body, from the front it is behind
      const front = bias > 1.5, list = front ? over : quads; // seen from behind: drawn last, over the body and over the pixel grid
      if (front) capeBox = [P(5, 0, 1), P(-5, 0, 1), P(-5, 16, 1), P(5, 16, 1)];
      const add = (a, b2, d, e, o, k) => list.push([(a[2] + b2[2] + d[2] + e[2]) / 4 + bias, a, b2, d, e, "rgb(" + Math.round(cape[o] * k) + "," + Math.round(cape[o + 1] * k) + "," + Math.round(cape[o + 2] * k) + ")"]);
      for (let j = 0; j < 16; j++) {
        for (let i = 0; i < 10; i++) { const o = (j * 10 + i) * 3;
          add(P(5 - i, j, 1), P(4 - i, j, 1), P(4 - i, j + 1, 1), P(5 - i, j + 1, 1), o, 0.95); // outside
          add(P(5 - i, j, 0), P(4 - i, j, 0), P(4 - i, j + 1, 0), P(5 - i, j + 1, 0), o, 0.55); // inside
        }
        add(P(5, j, 0), P(5, j, 1), P(5, j + 1, 1), P(5, j + 1, 0), j * 30, 0.7); // the two thin sides
        add(P(-5, j, 0), P(-5, j, 1), P(-5, j + 1, 1), P(-5, j + 1, 0), (j * 10 + 9) * 3, 0.7);
      }
      for (let i = 0; i < 10; i++) { // top and bottom edge
        add(P(5 - i, 0, 0), P(4 - i, 0, 0), P(4 - i, 0, 1), P(5 - i, 0, 1), i * 3, 0.8);
        add(P(5 - i, 16, 0), P(4 - i, 16, 0), P(4 - i, 16, 1), P(5 - i, 16, 1), (150 + i) * 3, 0.6);
      }
    }
    if (fly) { // elytra wings, spread open (plain grey, they are not part of the skin file)
      const flap = walk ? Math.sin(phase * 0.6) * 0.12 : 0, zr = 1.15 + flap, xr = 0.3, zc = Math.cos(zr), zs = Math.sin(zr), xc = Math.cos(xr), xs = Math.sin(xr);
      const wd = (t) => 10 * (1 - 0.6 * Math.pow(t, 1.6));
      for (const side of [-1, 1]) {
        const P = (u, t) => { const x = u * wd(t), y = -20 * t, x1 = x * zc - y * zs, y1 = x * zs + y * zc; return cam(side * (1 + x1), 7.5 + y1 * xc, -2.6 + y1 * xs); };
        for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
          const a = P(i / 4, j / 8), b = P((i + 1) / 4, j / 8), c = P((i + 1) / 4, (j + 1) / 8), e = P(i / 4, (j + 1) / 8), v = 150 - (j % 2) * 18 - i * 7;
          quads.push([(a[2] + b[2] + c[2] + e[2]) / 4, a, b, c, e, "rgb(" + (v - 10) + "," + v + "," + (v + 10) + ")"]);
        }
      }
    }
    quads.sort((p, q) => p[0] - q[0]);
    g3.lineJoin = "round"; g3.lineWidth = 0.7;
    const paintQuads = (L) => { g3.lineWidth = 0.7; for (const q of L) {
      g3.fillStyle = g3.strokeStyle = q[5];
      g3.beginPath(); g3.moveTo(q[1][0], q[1][1]); g3.lineTo(q[2][0], q[2][1]); g3.lineTo(q[3][0], q[3][1]); g3.lineTo(q[4][0], q[4][1]); g3.closePath();
      g3.fill(); g3.stroke();
    } };
    paintQuads(quads);
    picks.sort((p, q) => q[0] - p[0]); // nearest first
    if (hover && grid) { const L = locate(hover[0], hover[1]);
      if (L) { const r = L[4]; g3.lineWidth = 1; g3.strokeStyle = "rgba(255,255,255,.28)"; g3.beginPath();
        for (const q of picks) if (q[5] >= r[0] && q[6] >= r[1] && q[5] < r[0] + r[2] && q[6] < r[1] + r[3]) { g3.moveTo(q[1][0], q[1][1]); g3.lineTo(q[2][0], q[2][1]); g3.lineTo(q[3][0], q[3][1]); g3.lineTo(q[4][0], q[4][1]); g3.closePath(); }
        g3.stroke(); } }
    if (hover) for (const q of picks) if (q[5] === hover[0] && q[6] === hover[1]) {
      g3.lineWidth = 2; g3.strokeStyle = "#fff"; g3.beginPath(); g3.moveTo(q[1][0], q[1][1]); g3.lineTo(q[2][0], q[2][1]); g3.lineTo(q[3][0], q[3][1]); g3.lineTo(q[4][0], q[4][1]); g3.closePath(); g3.stroke();
      g3.lineWidth = 1; g3.strokeStyle = "#000"; g3.stroke();
      break;
    }
    if (over.length) { over.sort((p, q) => p[0] - q[0]); paintQuads(over); }
  }
  const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  let capeBox = null; // the cape's outline on the screen while it covers the back
  function pick(p) { // which skin pixel is under this point of the 3D picture
    if (capeBox) { const c = capeBox, t = [side(p, c[0], c[1]), side(p, c[1], c[2]), side(p, c[2], c[3]), side(p, c[3], c[0])];
      if (t.every((v) => v >= 0) || t.every((v) => v <= 0)) return null; } // the cape is in the way: nothing to paint here
    for (const q of picks) {
      const s1 = side(p, q[1], q[2]), s2 = side(p, q[2], q[3]), s3 = side(p, q[3], q[4]), s4 = side(p, q[4], q[1]);
      if ((s1 >= 0 && s2 >= 0 && s3 >= 0 && s4 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0 && s4 <= 0)) return [q[5], q[6]];
    }
    return null;
  }

  // ---------- the flat skin ----------
  function draw2d() {
    const S = cv2.width / 64;
    g2.clearRect(0, 0, cv2.width, cv2.height);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { g2.fillStyle = (x + y) % 2 ? "#8a8a8a" : "#a5a5a5"; g2.fillRect(x * S * 2, y * S * 2, S * 2, S * 2); }
    sctx.putImageData(new ImageData(px, 64, 64), 0, 0);
    g2.imageSmoothingEnabled = false; g2.drawImage(skin, 0, 0, cv2.width, cv2.height);
    // Dim hidden faces in the flat editor without changing the saved pixels.
    g2.fillStyle = 'rgba(128, 128, 128, 0.55)';
    for (const [name, u, v, w, h, dp, , , , , layer] of parts()) {
      if (hidden[name] || hiddenLayers[name + ':' + layer] || (layer === 1 && !showOuter)) {
        for (const r of rects(u, v, w, h, dp)) g2.fillRect(r[0] * S, r[1] * S, r[2] * S, r[3] * S);
      }
    }
    g2.lineWidth = 1;
    for (const r of faceRects()) {
      g2.strokeStyle = r[4] ? "rgba(255,170,60,.85)" : "rgba(80,170,255,.85)";
      g2.strokeRect(r[0] * S + 0.5, r[1] * S + 0.5, r[2] * S - 1, r[3] * S - 1);
    }
    if (hover) { g2.strokeStyle = "#fff"; g2.lineWidth = 2; g2.strokeRect(hover[0] * S, hover[1] * S, S, S); g2.strokeStyle = "#000"; g2.lineWidth = 1; g2.strokeRect(hover[0] * S + 0.5, hover[1] * S + 0.5, S - 1, S - 1); }
  }
  function frame() { if (dead) return;
    if (walk) { const now = Date.now(); if (now - lastT >= 50) { phase += Math.min(200, now - lastT) * 0.007; lastT = now; dirty = true; } } // about 20 pictures a second, easy on slow PCs
    if (dirty) { dirty = false; try {
      draw3d(); draw2d();
      if (!$('p2d-view').hidden) {
        const preview = $('p2d-preview'), context = preview.getContext('2d');
        context.clearRect(0, 0, preview.width, preview.height);
        context.drawImage(cv3, 0, 0, preview.width, preview.height);
      }
    } catch (e) {} } raf = requestAnimationFrame(frame); }

  // ---------- painting ----------
  const hex = (c) => "#" + c.map((n) => (n < 16 ? "0" : "") + n.toString(16)).join("");
  function setColor(c, keep) {
    color = [c[0] | 0, c[1] | 0, c[2] | 0];
    const h = hex(color); $("pcolor").value = h; if (!keep) $("phex").value = h; showNow(); updateShades(); syncSwatches();
  }
  function updateShades() {
    const box = $("pshades"); if (!box) return;
    box.textContent = "";
    [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].forEach((amount) => {
      const c = color.map((v) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount));
      const h = hex(c), b = document.createElement("button");
      b.type = "button"; b.className = "psw"; b.style.background = h; b.dataset.c = h;
      b.title = h; b.setAttribute("aria-label", "Use shade " + h); box.appendChild(b);
    });
  }
  function syncSwatches() {
    const chosen = hex(color).toLowerCase();
    document.querySelectorAll("#precent [data-c], #pskinpalette [data-c], #ppalette [data-c], #pshades [data-c]").forEach((b) => {
      const selected = b.dataset.c.toLowerCase() === chosen;
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
  }
  function updateSkinPalette() {
    const counts = new Map();
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 16) continue;
      const h = hex([px[i], px[i + 1], px[i + 2]]);
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    const box = $("pskinpalette"); box.textContent = "";
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([h]) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "psw";
      button.dataset.c = h; button.style.background = h; button.title = h;
      button.setAttribute("aria-label", "Use skin colour " + h); box.appendChild(button);
    });
    syncSwatches();
  }
  function showNow() { // the colour square: see-through colours show the checker behind them
    const c = "rgba(" + color[0] + "," + color[1] + "," + color[2] + "," + (alpha / 255) + ")";
    $("pnow").style.background = "linear-gradient(" + c + "," + c + "), repeating-conic-gradient(#8a8a8a 0% 25%, #c4c4c4 0% 50%) 0 0 / 12px 12px";
    $("palpha").style.setProperty("--opacity-colour", hex(color));
  }
  function setAlpha(a) { // a = 1..255
    alpha = Math.max(1, Math.min(255, Math.round(a)));
    const pc = Math.max(1, Math.round(alpha / 2.55)), e = $("palpha"), o = $("palphav");
    if (e && document.activeElement !== e) e.value = String(pc);
    if (o) o.textContent = pc + "%";
    showNow();
  }
  function useTool(t) {
    tool = t;
    document.querySelectorAll("#ptools button").forEach((b) => { const on = b.dataset.tool === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }
  function fill(x, y) {
    let box = [0, 0, 64, 64];
    for (const r of faceRects()) if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) { box = r; break; }
    if (box.length > 4) { // on the model: the whole side of that body part gets the colour
      for (let b2 = box[1]; b2 < box[1] + box[3]; b2++) for (let a2 = box[0]; a2 < box[0] + box[2]; a2++) { const o = (b2 * 64 + a2) * 4; px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = alpha; }
      return true;
    }
    const o0 = (y * 64 + x) * 4, from = [px[o0], px[o0 + 1], px[o0 + 2], px[o0 + 3]];
    if (from[3] === alpha && from[0] === color[0] && from[1] === color[1] && from[2] === color[2]) return false;
    const same = (o) => px[o + 3] === from[3] && (from[3] === 0 || (px[o] === from[0] && px[o + 1] === from[1] && px[o + 2] === from[2]));
    const todo = [[x, y]];
    while (todo.length) {
      const [a, b] = todo.pop();
      if (a < box[0] || b < box[1] || a >= box[0] + box[2] || b >= box[1] + box[3]) continue;
      const o = (b * 64 + a) * 4; if (!same(o)) continue;
      px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = alpha;
      todo.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
    return true;
  }
  // where a skin pixel sits: [part index, side index, column, row] or null
  function locate(x, y) {
    const P = parts();
    for (let n = 0; n < P.length; n++) { const R = rects(P[n][1], P[n][2], P[n][3], P[n][4], P[n][5]);
      for (let f = 0; f < 6; f++) { const r = R[f]; if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) return [n, f, x - r[0], y - r[1], r]; } }
    return null;
  }
  const TWIN = { head: "head", body: "body", ra: "la", la: "ra", rl: "ll", ll: "rl" };
  function mirror(x, y) { // the same pixel on the other half of the player
    const L = locate(x, y); if (!L) return null;
    const P = parts(), me = P[L[0]], n2 = P.findIndex((q) => q[0] === TWIN[me[0]] && q[10] === me[10]); if (n2 < 0) return null;
    const f2 = L[1] === 2 ? 3 : L[1] === 3 ? 2 : L[1], r = rects(P[n2][1], P[n2][2], P[n2][3], P[n2][4], P[n2][5])[f2];
    return [r[0] + r[2] - 1 - L[2], r[1] + L[3]];
  }
  function apply(x, y) { // brush size and symmetry, then pixel by pixel
    if (x < 0 || y < 0 || x > 63 || y > 63 || !stroke) return;
    if (tool === "pick") { apply1(x, y); return; }
    const spots = [[x, y]];
    if (tool !== "fill" && size > 1) { const L = locate(x, y), r = L ? L[4] : [0, 0, 64, 64], o = (size - 1) >> 1; spots.length = 0;
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const a = x - o + i, b = y - o + j; if (a >= r[0] && b >= r[1] && a < r[0] + r[2] && b < r[1] + r[3]) spots.push([a, b]); } }
    for (const q of spots) { apply1(q[0], q[1]); if (symmetry) { const m = mirror(q[0], q[1]); if (m) apply1(m[0], m[1]); } }
  }
  function apply1(x, y) {
    if (x < 0 || y < 0 || x > 63 || y > 63 || !stroke) return;
    const o = (y * 64 + x) * 4, key = y * 64 + x;
    if (tool === "pick") { if (px[o + 3]) { setColor([px[o], px[o + 1], px[o + 2]]); setAlpha(px[o + 3]); remember(); } return; }
    if (stroke.seen[key]) return; stroke.seen[key] = 1;
    if (tool === "pen") { px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = alpha; }
    else if (tool === "tone") { const k = Math.round(Math.random() * 28) - 14; px[o] = color[0] + k; px[o + 1] = color[1] + k; px[o + 2] = color[2] + k; px[o + 3] = alpha; } // the colour, a little lighter or darker each pixel
    else if (tool === "erase") { px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
    else if (tool === "fill") { if (!fill(x, y)) return; }
    else if (tool === "light" || tool === "dark") { if (!px[o + 3]) return; const k = tool === "light" ? 16 : -16; px[o] += k; px[o + 1] += k; px[o + 2] += k; }
    stroke.changed = true; dirty = true;
  }
  function begin() { stroke = { before: new Uint8ClampedArray(px), changed: false, seen: {}, last: null }; }
  function end() {
    if (!stroke) return;
    if (stroke.changed) { undo.push(stroke.before); if (undo.length > 80) undo.shift(); redo.length = 0; if (tool === "pen" || tool === "fill" || tool === "tone") remember(); autosave(); buttons(); }
    stroke = null;
  }
  function showFormat() { $("pfmtslim").checked = slim; $("pfmtwide").checked = !slim; }
  // Change the arms between Steve (4 pixels wide) and Alex (3 pixels wide); the same as in the eye editor.
  function convertArms(d, toSlim) {
    const src = new Uint8ClampedArray(d), idx = (x, y) => (y * 64 + x) * 4;
    const W = [[4, 4, 0, 4], [8, 4, 0, 4], [0, 4, 4, 16], [4, 4, 4, 16], [8, 4, 4, 16], [12, 4, 4, 16]]; // x, width, y0, y1 of each part
    const S = [[4, 3, 0, 4], [7, 3, 0, 4], [0, 4, 4, 16], [4, 3, 4, 16], [7, 4, 4, 16], [11, 3, 4, 16]];
    const from = toSlim ? W : S, to = toSlim ? S : W;
    for (const [ox, oy] of [[40, 16], [40, 32], [32, 48], [48, 48]]) {
      for (let y = oy; y < oy + 16; y++) for (let x = ox; x < ox + 16; x++) { const i = idx(x, y); d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
      from.forEach((f, k) => {
        const t = to[k];
        const cols = f[1] === t[1] ? [0, 1, 2, 3].slice(0, f[1]) : toSlim ? [0, 1, 3] : [0, 1, 1, 2];
        cols.forEach((c, n) => { for (let y = f[2]; y < f[3]; y++) { const a = idx(ox + f[0] + c, oy + y), b = idx(ox + t[0] + n, oy + y); for (let q = 0; q < 4; q++) d[b + q] = src[a + q]; } });
      });
    }
  }
  // after Undo or Redo the arms may be the other width again: read it from the skin
  function reguess() {
    let wide = false, any = false;
    for (let y = 20; y < 32; y++) { for (let x = 40; x < 54; x++) if (px[(y * 64 + x) * 4 + 3]) any = true; for (let x = 54; x < 56; x++) if (px[(y * 64 + x) * 4 + 3]) wide = true; }
    if (wide) slim = false; else if (any) slim = true;
    showFormat();
  }
  function buttons() { $("pundo").disabled = !undo.length; $("predo").disabled = !redo.length; }
  function doUndo() { if (!undo.length) return; redo.push(new Uint8ClampedArray(px)); px = undo.pop(); reguess(); dirty = true; autosave(); buttons(); }
  function doRedo() { if (!redo.length) return; undo.push(new Uint8ClampedArray(px)); px = redo.pop(); reguess(); dirty = true; autosave(); buttons(); }
  function autosave() {
    updateSkinPalette();
    try { sctx.putImageData(new ImageData(px, 64, 64), 0, 0); localStorage.setItem("fmf-paint", skin.toDataURL("image/png")); localStorage.setItem("fmf-paint-slim", slim ? "1" : "0"); } catch (e) {}
  }
  const recent = [];
  function remember() {
    const h = hex(color), i = recent.indexOf(h); if (i >= 0) recent.splice(i, 1); recent.unshift(h); if (recent.length > 10) recent.pop();
    const box = $("precent"); box.textContent = "";
    for (const c of recent) { const b = document.createElement("button"); b.type = "button"; b.className = "psw"; b.style.background = c; b.title = c; b.dataset.c = c; b.setAttribute("aria-label", "Use recent colour " + c); box.appendChild(b); }
    syncSwatches();
  }
  const fromHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // ---------- loading and saving ----------
  function say(t, bad) { const m = $("pmsg"); m.textContent = t; m.style.color = bad ? "#e5534b" : ""; }
  function loadUrl(url, name, forceSlim, first) {
    const im = new Image();
    im.onload = () => {
      if (im.width !== 64 || (im.height !== 64 && im.height !== 32)) { say("This picture is " + im.width + " x " + im.height + ". A Minecraft skin must be 64 x 64 pixels.", true); return; }
      const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
      x.drawImage(im, 0, 0);
      if (im.height === 32) { x.drawImage(c, 0, 16, 16, 16, 16, 48, 16, 16); x.drawImage(c, 40, 16, 16, 16, 32, 48, 16, 16); } // old skin: copy right leg and arm to the left ones
      const d = x.getImageData(0, 0, 64, 64).data;
      if (!first) { undo.push(new Uint8ClampedArray(px)); redo.length = 0; }
      px = new Uint8ClampedArray(d);
      slim = forceSlim === undefined ? px[(20 * 64 + 54) * 4 + 3] === 0 : forceSlim;
      showFormat(); updateSkinPalette();
      dirty = true; buttons(); if (!first) autosave();
      say(name ? "Loaded: " + name : "");
    };
    im.onerror = () => say("This file could not be read as a picture.", true);
    im.src = url;
  }
  function loadFile(f) { if (!f) return; const r = new FileReader(); r.onload = () => loadUrl(r.result, f.name); r.readAsDataURL(f); }
  function save() {
    sctx.putImageData(new ImageData(px, 64, 64), 0, 0);
    skin.toBlob((b) => {
      const a = document.createElement("a"), u = URL.createObjectURL(b);
      a.href = u; a.download = "skin-painted.png"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
      say("Saved as skin-painted.png (look in your Downloads folder).");
    }, "image/png");
  }

  // ---------- mouse and touch ----------
  const at = (cv, e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  let mode = null, drag = null;
  const alt = (yes) => { if (yes !== altOn) { altOn = yes; const t = color; color = color2; color2 = t; if (!yes) setColor(color); } }; // right button: paint with the second colour for this stroke
  const d3 = (e) => {
    e.preventDefault(); try { cv3.setPointerCapture(e.pointerId); } catch (x) {}
    const hit = e.button === 0 || e.button === 2 ? pick(at(cv3, e)) : null;
    if (hit) { mode = "paint"; alt(e.button === 2); begin(); apply(hit[0], hit[1]); } else { mode = "turn"; drag = [e.clientX, e.clientY, yaw, pitch]; cv3.style.cursor = "grabbing"; }
  };
  const m3 = (e) => {
    if (mode === "turn") { yaw = drag[2] + (e.clientX - drag[0]) * 0.012; pitch = Math.max(-1.45, Math.min(1.45, drag[3] + (e.clientY - drag[1]) * 0.012)); dirty = true; return; }
    const hit = pick(at(cv3, e));
    if (mode === "paint" && hit) apply(hit[0], hit[1]);
    if ((hover && !hit) || (hit && (!hover || hover[0] !== hit[0] || hover[1] !== hit[1]))) { hover = hit; dirty = true; }
    cv3.style.cursor = hit ? "crosshair" : "grab";
  };
  const u3 = () => { if (mode === "paint") { end(); alt(false); } mode = null; cv3.style.cursor = "grab"; };
  const w3 = (e) => { e.preventDefault(); zoom = Math.max(0.5, Math.min(3, zoom * (e.deltaY > 0 ? 0.93 : 1.07))); $("pzoom").value = zoom; dirty = true; };
  const noMenu = (e) => e.preventDefault();
  const cell = (e) => { const p = at(cv2, e); return [Math.floor(p[0] / cv2.width * 64), Math.floor(p[1] / cv2.height * 64)]; };
  let down2 = false;
  const line = (a, b) => { // every pixel between two points, so a fast stroke has no gaps
    let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (let n = 0; n < 200; n++) { apply(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const d2 = (e) => { if (e.button !== 0 && e.button !== 2) return; alt(e.button === 2); e.preventDefault(); try { cv2.setPointerCapture(e.pointerId); } catch (x) {} down2 = true; begin(); const c = cell(e); stroke.last = c; apply(c[0], c[1]); };
  const m2 = (e) => {
    const c = cell(e), inside = c[0] >= 0 && c[1] >= 0 && c[0] < 64 && c[1] < 64;
    if (down2 && stroke) { if (tool === "fill" || tool === "pick") apply(c[0], c[1]); else line(stroke.last, c); stroke.last = c; }
    hover = inside ? c : null; dirty = true;
  };
  const u2 = () => { if (down2) { end(); alt(false); } down2 = false; };
  const leave = () => { if (hover && !mode && !down2) { hover = null; dirty = true; } };
  cv3.addEventListener("pointerdown", d3); cv3.addEventListener("pointermove", m3); cv3.addEventListener("pointerup", u3); cv3.addEventListener("pointercancel", u3);
  cv3.addEventListener("pointerleave", leave); cv3.addEventListener("wheel", w3, { passive: false }); cv3.addEventListener("contextmenu", noMenu); cv2.addEventListener("contextmenu", noMenu);
  cv2.addEventListener("pointerdown", d2); cv2.addEventListener("pointermove", m2); cv2.addEventListener("pointerup", u2); cv2.addEventListener("pointercancel", u2); cv2.addEventListener("pointerleave", leave);
  cv3.style.touchAction = cv2.style.touchAction = "none"; cv3.style.cursor = "grab"; cv2.style.cursor = "crosshair";

  // ---------- buttons ----------
  document.querySelectorAll("#ptools button").forEach((b) => b.addEventListener("click", () => useTool(b.dataset.tool)));
  $("pcolor").addEventListener("input", (e) => setColor(fromHex(e.target.value)));
  document.querySelectorAll("[data-psize]").forEach((b) => b.addEventListener("click", () => { size = Number(b.dataset.psize) || 1; document.querySelectorAll("[data-psize]").forEach((q) => { const on = q === b; q.classList.toggle("on", on); q.setAttribute("aria-pressed", on ? "true" : "false"); }); }));
  if ($("psym")) $("psym").addEventListener("change", (e) => { symmetry = e.target.checked; });
  if ($("pgrid")) $("pgrid").addEventListener("change", (e) => { grid = e.target.checked; dirty = true; });
  if ($("palpha")) $("palpha").addEventListener("input", (e) => setAlpha((Number(e.target.value) || 100) * 2.55));
  $("phex").addEventListener("input", (e) => { let v = e.target.value.trim(); if (v[0] !== "#") v = "#" + v; if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(fromHex(v), true); });
  const swatch = (e) => { const c = e.target && e.target.dataset && e.target.dataset.c; if (c) { setColor(fromHex(c)); remember(); if (tool === "erase" || tool === "pick") useTool("pen"); } };
  $("ppalette").addEventListener("click", swatch); $("pskinpalette").addEventListener("click", swatch); $("precent").addEventListener("click", swatch); $("pshades").addEventListener("click", swatch);
  $("pcolor").addEventListener("change", remember);
  $("phex").addEventListener("change", () => { if (/^#?[0-9a-fA-F]{6}$/.test($("phex").value.trim())) remember(); });
  $("pundo").addEventListener("click", doUndo); $("predo").addEventListener("click", doRedo);
  $("psave-top").addEventListener("click", save);
  $("pfile-top").addEventListener("click", () => $("pfile").click());
  $("pfile").addEventListener("change", (e) => { loadFile(e.target.files[0]); e.target.value = ""; });
  document.querySelectorAll("#pstart button").forEach((b) => b.addEventListener("click", () => loadUrl(b.dataset.skin, b.dataset.name, b.dataset.slim ? b.dataset.slim === "1" : undefined)));
  $("pclear").addEventListener("click", () => { undo.push(new Uint8ClampedArray(px)); redo.length = 0; px = new Uint8ClampedArray(64 * 64 * 4); dirty = true; autosave(); buttons(); say("Empty skin. Use Undo to get the old one back."); });
  document.querySelectorAll("input[name=pfmt]").forEach((r) => r.addEventListener("change", () => {
    if (!r.checked) return;
    const want = r.value === "slim"; if (want === slim) return;
    undo.push(new Uint8ClampedArray(px)); if (undo.length > 80) undo.shift(); redo.length = 0;
    convertArms(px, want); slim = want; dirty = true; autosave(); buttons();
    say(want ? "Arms changed to Alex (3 pixels wide)." : "Arms changed to Steve (4 pixels wide).");
  }));
  document.querySelectorAll("input[name=player]").forEach((r) => r.addEventListener("change", () => { if (r.checked) { target = Number(r.value); if (target === 1 && !showOuter) { showOuter = true; $("pshow").checked = true; } dirty = true; } }));
  $("pshow").addEventListener("change", (e) => { showOuter = e.target.checked; if (!showOuter && target === 1) { target = 0; document.querySelector("input[name=player][value='0']").checked = true; } dirty = true; });
  document.querySelectorAll("[data-show-part]").forEach((c) => c.addEventListener("change", () => { hidden[c.dataset.showPart] = !c.checked; dirty = true; }));
  function syncLayerMasters() {
    document.querySelectorAll('[data-layer-all]').forEach((master) => {
      const controls = Array.from(document.querySelectorAll('[data-part][data-layer="' + master.dataset.layerAll + '"]'));
      const count = controls.filter((control) => control.checked).length;
      master.checked = count === controls.length;
      master.indeterminate = count > 0 && count < controls.length;
    });
  }
  document.querySelectorAll("[data-part][data-layer]").forEach((c) => c.addEventListener("change", () => {
    hiddenLayers[c.dataset.part + ":" + c.dataset.layer] = !c.checked;
    syncLayerMasters(); dirty = true;
  }));
  document.querySelectorAll('[data-layer-all]').forEach((master) => master.addEventListener('change', () => {
    document.querySelectorAll('[data-part][data-layer="' + master.dataset.layerAll + '"]').forEach((control) => {
      control.checked = master.checked;
      hiddenLayers[control.dataset.part + ':' + control.dataset.layer] = !control.checked;
    });
    if (master.dataset.layerAll === '1' && master.checked && !showOuter) $('pshow').click();
    syncLayerMasters(); dirty = true;
  }));
  syncLayerMasters();
  document.querySelectorAll("[data-pview]").forEach((button) => button.addEventListener("click", () => {
    const flat = button.dataset.pview === "2d";
    cv3.hidden = flat; $("p3d-controls").hidden = flat; $("p2d-view").hidden = !flat;
    $("painter-view-title").textContent = flat ? "Flat skin file" : "3D model";
    $("painter-view-help").textContent = flat ? "Paint directly on the skin texture." : "Click the model to paint; right click paints with the second colour. Drag next to the model to turn it. Mouse wheel = zoom.";
    document.querySelectorAll("[data-pview]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    hover = null; dirty = true;
  }));
  // ---------- capes: own simple designs drawn by code, or your own cape file ----------
  const CAPES = {
    red: (i, j) => j < 3 ? (i % 3 === 1 ? [240, 200, 60] : [40, 44, 60]) : [200 - j * 4, 36, 40],
    leaf: (i, j) => j < 5 + ((i * 7) % 3) ? [60, 150 + ((i + j) % 2) * 20, 60] : [110 - ((i + j) % 2) * 12, 78, 50],
    blossom: (i, j) => (i * 5 + j * 3) % 7 === 0 ? [255, 235, 245] : [240, 150 + ((i + j) % 2) * 14, 200],
    ice: (i, j) => Math.abs(i - 4.5) < 2 && Math.abs(j - 7.5) < 3.2 ? [255, 250, 250] : [150 + j * 3, 215, 235],
    sunset: (i, j) => [250 - j * 6, 120 + j * 2, 70 + j * 9],
    checker: (i, j) => ((i >> 1) + (j >> 1)) % 2 ? [30, 30, 36] : [235, 235, 240],
    night: (i, j) => (i * 13 + j * 7) % 11 === 0 ? [255, 255, 200] : [24, 28 + j, 70 + j * 3],
    star: (i, j) => { const x = Math.abs(i - 4.5), y = Math.abs(j - 7.5); return x + y < 3.6 || (x < 0.6 && y < 5.5) || (y < 0.6 && x < 4.6) ? [250, 205, 60] : [70, 40, 130]; },
    gem: (i, j) => { const x = Math.abs(i - 4.5), y = Math.abs(j - 8); if (j < 2) return i === 2 || i === 7 ? [245, 205, 70] : [30, 60, 110]; if (x + y * 0.7 < 2.2) return [200, 250, 255]; if (x + y * 0.7 < 3.6) return [70, 210, 230]; if (x < 4 && y < 6 && (x > 3 || y > 5)) return [245, 205, 70]; return [40, 95 + j * 2, 170]; },
    flowers: (i, j) => { const a = (i + (j >> 2) * 3) % 5, b2 = j % 4; if (a === 1 && b2 === 1) return [255, 225, 90]; if ((a === 1 && (b2 === 0 || b2 === 2)) || (b2 === 1 && (a === 0 || a === 2))) return [255, 250, 252]; return [236, 130 + j * 3, 180]; },
    smile: (i, j) => { if (j < 2) return [50, 120, 60]; const eye = (j === 5 || j === 6) && (i === 2 || i === 3 || i === 6 || i === 7), mouth = (j === 10 && i >= 3 && i <= 6) || (j === 9 && (i === 2 || i === 7)); return eye || mouth ? [20, 50, 25] : ((i >> 1) + (j >> 1)) % 2 ? [110, 205, 95] : [130, 225, 110]; },
    green: (i, j) => i === 0 || i === 9 || j === 0 || j === 15 ? [40, 110, 70] : [90, 230 - ((i + j) % 2) * 22, 150],
  };
  let cape = null; // 10 x 16 colours, or null = no cape
  function capeFile() { // the cape as a normal 64 x 32 cape picture
    const c = document.createElement("canvas"); c.width = 64; c.height = 32; const x = c.getContext("2d");
    const edge = "rgb(" + Math.round(cape[0] * 0.7) + "," + Math.round(cape[1] * 0.7) + "," + Math.round(cape[2] * 0.7) + ")";
    x.fillStyle = edge; x.fillRect(0, 0, 22, 17);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 10; i++) { const o = (j * 10 + i) * 3; x.fillStyle = "rgb(" + cape[o] + "," + cape[o + 1] + "," + cape[o + 2] + ")"; x.fillRect(1 + i, 1 + j, 1, 1); x.fillRect(12 + (9 - i), 1 + j, 1, 1); }
    return c;
  }
  (function () {
    const sel = $("pcape"), up = $("pcapefile"), dl = $("pcapesave"); if (!sel) return;
    const sync = () => { if (dl) dl.disabled = !cape; dirty = true; };
    sel.addEventListener("change", () => {
      const v = sel.value;
      if (v === "file") { if (up) up.click(); return; }
      const f0 = CAPES[v]; cape = null;
      const f = f0 && ((i, j) => { // every cape gets the same finish: darker border, a little grain, shading towards the bottom
        let q = f0(i, j).slice(); const edge = i === 0 || i === 9 || j === 15, grain = ((i * 7 + j * 13) % 5 - 2) * 3, k = (edge ? 0.72 : 1) * (1 - j * 0.012);
        return q.map((c) => Math.max(0, Math.min(255, Math.round((c + grain) * k))));
      });
      if (f) { cape = new Uint8ClampedArray(480); for (let j = 0; j < 16; j++) for (let i = 0; i < 10; i++) { const q = f(i, j), o = (j * 10 + i) * 3; cape[o] = q[0]; cape[o + 1] = q[1]; cape[o + 2] = q[2]; } }
      sync();
    });
    if (up) up.addEventListener("change", () => { const f = up.files && up.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => {
        if (im.width < 22 || im.height < 17 || im.width !== im.height * 2) { say("This picture is " + im.width + " x " + im.height + ". A cape file is 64 x 32 pixels (twice as wide as high).", true); return; }
        const c = document.createElement("canvas"); c.width = 64; c.height = 32; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, 64, 32);
        const d = x.getImageData(1, 1, 10, 16).data; cape = new Uint8ClampedArray(480);
        for (let n = 0; n < 160; n++) { cape[n * 3] = d[n * 4]; cape[n * 3 + 1] = d[n * 4 + 1]; cape[n * 3 + 2] = d[n * 4 + 2]; }
        say("Cape loaded: " + f.name); sync();
      }; im.onerror = () => say("This file is not a picture.", true); im.src = r.result; }; r.readAsDataURL(f); up.value = ""; });
    if (dl) dl.addEventListener("click", () => { if (!cape) return; capeFile().toBlob((b) => { const a = document.createElement("a"), u = URL.createObjectURL(b); a.href = u; a.download = "cape.png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); say("Saved as cape.png."); }, "image/png"); });
    sync();
  })();
  (function () { // small icon bar under the 3D model
    const press = (id, yes, tip) => { const b = $(id); if (b) { b.classList.toggle("on", yes); b.setAttribute("aria-pressed", yes ? "true" : "false"); b.dataset.tip = tip; b.setAttribute("aria-label", tip); } };
    const sync = () => { press("pbsneak", sneak, sneak ? "Stand up" : "Sneak"); press("pblayer", showOuter, showOuter ? "Hide outer layer" : "Show outer layer"); press("pbfly", fly, fly ? "Stop Flying" : "Start Flying"); press("pbplay", walk, walk ? "Pause" : "Play"); };
    const on = (id, fn) => { const b = $(id); if (b) b.addEventListener("click", () => { fn(); dirty = true; sync(); }); };
    on("pbsneak", () => { sneak = !sneak; if (sneak) fly = false; });
    on("pblayer", () => { $("pshow").click(); });
    on("pbfly", () => { fly = !fly; if (fly) sneak = false; });
    on("pbplay", () => { walk = !walk; lastT = Date.now(); });
    $("pshow").addEventListener("change", () => setTimeout(sync, 0));
    document.querySelectorAll("input[name=player]").forEach((r) => r.addEventListener("change", () => setTimeout(sync, 0)));
    sync();
  })();
  $("ppose").addEventListener("change", (e) => { pose = e.target.value; dirty = true; });
  $("pzoom").addEventListener("input", (e) => { zoom = Number(e.target.value); dirty = true; });
  const KEYS = { t: "tone", b: "pen", p: "pen", e: "erase", g: "fill", f: "fill", i: "pick", l: "light", d: "dark" };
  const key = (e) => {
    const t = e.target && e.target.tagName; if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA") return;
    const k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); doRedo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS[k]) useTool(KEYS[k]);
  };
  document.addEventListener("keydown", key);
  window.fmfCleanup = () => { dead = true; cancelAnimationFrame(raf); document.removeEventListener("keydown", key); };

  // ---------- start ----------
  setColor(color); remember(); useTool("pen"); buttons();
  let saved = null, savedSlim = false;
  try { saved = localStorage.getItem("fmf-paint"); savedSlim = localStorage.getItem("fmf-paint-slim") === "1"; } catch (e) {}
  const first = document.querySelector("#pstart button");
  if (saved && saved.indexOf("data:image/png") === 0) { loadUrl(saved, "", savedSlim, true); say("Your last painting is back."); }
  else if (first) loadUrl(first.dataset.skin, "", false, true);
  raf = requestAnimationFrame(frame);
})();
