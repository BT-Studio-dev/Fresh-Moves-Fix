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

  let tool = "pen", color = [59, 130, 196], slim = false, target = 0, showOuter = true, pose = "stand";
  let yaw = 0.55, pitch = 0.15, zoom = 0.9, hover = null, dirty = true, dead = false, raf = 0;
  const hidden = {};
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
  const GROUP = { head: "head", body: "body", ra: "arms", la: "arms", rl: "legs", ll: "legs" };
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
    const quads = []; picks = [];
    const pt = (name, x, y, z) => {
      const a = A[name] || 0, pv = PIV[name];
      let X = x - pv[0], Y = y - pv[1]; const Z = z - pv[2];
      if (a) { const c = Math.cos(a), s = Math.sin(a), x2 = X * c - Y * s; Y = X * s + Y * c; X = x2; }
      X += pv[0]; Y += pv[1] - 16;
      const x3 = X * cy + Z * sy, z3 = -X * sy + Z * cy, y4 = Y * cp - z3 * sp, z4 = Y * sp + z3 * cp, f = 90 / (90 - z4);
      return [W / 2 + x3 * f * sc, H / 2 - y4 * f * sc, z4];
    };
    for (const [name, u, v, w, h, dp, cx, cyy, cz, inf, layer] of parts()) {
      if (hidden[GROUP[name]]) continue;
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
    quads.sort((p, q) => p[0] - q[0]);
    g3.lineJoin = "round"; g3.lineWidth = 0.7;
    for (const q of quads) {
      g3.fillStyle = g3.strokeStyle = q[5];
      g3.beginPath(); g3.moveTo(q[1][0], q[1][1]); g3.lineTo(q[2][0], q[2][1]); g3.lineTo(q[3][0], q[3][1]); g3.lineTo(q[4][0], q[4][1]); g3.closePath();
      g3.fill(); g3.stroke();
    }
    picks.sort((p, q) => q[0] - p[0]); // nearest first
    if (hover) for (const q of picks) if (q[5] === hover[0] && q[6] === hover[1]) {
      g3.lineWidth = 2; g3.strokeStyle = "#fff"; g3.beginPath(); g3.moveTo(q[1][0], q[1][1]); g3.lineTo(q[2][0], q[2][1]); g3.lineTo(q[3][0], q[3][1]); g3.lineTo(q[4][0], q[4][1]); g3.closePath(); g3.stroke();
      g3.lineWidth = 1; g3.strokeStyle = "#000"; g3.stroke();
      break;
    }
  }
  const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  function pick(p) { // which skin pixel is under this point of the 3D picture
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
    g2.lineWidth = 1;
    for (const r of faceRects()) {
      g2.strokeStyle = r[4] ? "rgba(255,170,60,.85)" : "rgba(80,170,255,.85)";
      g2.strokeRect(r[0] * S + 0.5, r[1] * S + 0.5, r[2] * S - 1, r[3] * S - 1);
    }
    if (hover) { g2.strokeStyle = "#fff"; g2.lineWidth = 2; g2.strokeRect(hover[0] * S, hover[1] * S, S, S); g2.strokeStyle = "#000"; g2.lineWidth = 1; g2.strokeRect(hover[0] * S + 0.5, hover[1] * S + 0.5, S - 1, S - 1); }
  }
  function frame() { if (dead) return; if (dirty) { dirty = false; try { draw3d(); draw2d(); } catch (e) {} } raf = requestAnimationFrame(frame); }

  // ---------- painting ----------
  const hex = (c) => "#" + c.map((n) => (n < 16 ? "0" : "") + n.toString(16)).join("");
  function setColor(c, keep) {
    color = [c[0] | 0, c[1] | 0, c[2] | 0];
    const h = hex(color); $("pcolor").value = h; if (!keep) $("phex").value = h; $("pnow").style.background = h;
  }
  function useTool(t) {
    tool = t;
    document.querySelectorAll("#ptools button").forEach((b) => { const on = b.dataset.tool === t; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  }
  function fill(x, y) {
    let box = [0, 0, 64, 64];
    for (const r of faceRects()) if (x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]) { box = r; break; }
    if (box.length > 4) { // on the model: the whole side of that body part gets the colour
      for (let b2 = box[1]; b2 < box[1] + box[3]; b2++) for (let a2 = box[0]; a2 < box[0] + box[2]; a2++) { const o = (b2 * 64 + a2) * 4; px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = 255; }
      return true;
    }
    const o0 = (y * 64 + x) * 4, from = [px[o0], px[o0 + 1], px[o0 + 2], px[o0 + 3]];
    if (from[3] === 255 && from[0] === color[0] && from[1] === color[1] && from[2] === color[2]) return false;
    const same = (o) => px[o + 3] === from[3] && (from[3] === 0 || (px[o] === from[0] && px[o + 1] === from[1] && px[o + 2] === from[2]));
    const todo = [[x, y]];
    while (todo.length) {
      const [a, b] = todo.pop();
      if (a < box[0] || b < box[1] || a >= box[0] + box[2] || b >= box[1] + box[3]) continue;
      const o = (b * 64 + a) * 4; if (!same(o)) continue;
      px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = 255;
      todo.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
    }
    return true;
  }
  function apply(x, y) {
    if (x < 0 || y < 0 || x > 63 || y > 63 || !stroke) return;
    const o = (y * 64 + x) * 4, key = y * 64 + x;
    if (tool === "pick") { if (px[o + 3]) { setColor([px[o], px[o + 1], px[o + 2]]); remember(); } return; }
    if (stroke.seen[key]) return; stroke.seen[key] = 1;
    if (tool === "pen") { px[o] = color[0]; px[o + 1] = color[1]; px[o + 2] = color[2]; px[o + 3] = 255; }
    else if (tool === "erase") { px[o] = px[o + 1] = px[o + 2] = px[o + 3] = 0; }
    else if (tool === "fill") { if (!fill(x, y)) return; }
    else if (tool === "light" || tool === "dark") { if (!px[o + 3]) return; const k = tool === "light" ? 16 : -16; px[o] += k; px[o + 1] += k; px[o + 2] += k; }
    stroke.changed = true; dirty = true;
  }
  function begin() { stroke = { before: new Uint8ClampedArray(px), changed: false, seen: {}, last: null }; }
  function end() {
    if (!stroke) return;
    if (stroke.changed) { undo.push(stroke.before); if (undo.length > 80) undo.shift(); redo.length = 0; if (tool === "pen" || tool === "fill") remember(); autosave(); buttons(); }
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
    try { sctx.putImageData(new ImageData(px, 64, 64), 0, 0); localStorage.setItem("fmf-paint", skin.toDataURL("image/png")); localStorage.setItem("fmf-paint-slim", slim ? "1" : "0"); } catch (e) {}
  }
  const recent = [];
  function remember() {
    const h = hex(color), i = recent.indexOf(h); if (i >= 0) recent.splice(i, 1); recent.unshift(h); if (recent.length > 10) recent.pop();
    const box = $("precent"); box.textContent = "";
    for (const c of recent) { const b = document.createElement("button"); b.type = "button"; b.className = "psw"; b.style.background = c; b.title = c; b.dataset.c = c; box.appendChild(b); }
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
      showFormat();
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
  const d3 = (e) => {
    e.preventDefault(); try { cv3.setPointerCapture(e.pointerId); } catch (x) {}
    const hit = e.button === 0 ? pick(at(cv3, e)) : null;
    if (hit) { mode = "paint"; begin(); apply(hit[0], hit[1]); } else { mode = "turn"; drag = [e.clientX, e.clientY, yaw, pitch]; cv3.style.cursor = "grabbing"; }
  };
  const m3 = (e) => {
    if (mode === "turn") { yaw = drag[2] + (e.clientX - drag[0]) * 0.012; pitch = Math.max(-1.45, Math.min(1.45, drag[3] + (e.clientY - drag[1]) * 0.012)); dirty = true; return; }
    const hit = pick(at(cv3, e));
    if (mode === "paint" && hit) apply(hit[0], hit[1]);
    if ((hover && !hit) || (hit && (!hover || hover[0] !== hit[0] || hover[1] !== hit[1]))) { hover = hit; dirty = true; }
    cv3.style.cursor = hit ? "crosshair" : "grab";
  };
  const u3 = () => { if (mode === "paint") end(); mode = null; cv3.style.cursor = "grab"; };
  const w3 = (e) => { e.preventDefault(); zoom = Math.max(0.5, Math.min(3, zoom * (e.deltaY > 0 ? 0.93 : 1.07))); $("pzoom").value = zoom; dirty = true; };
  const noMenu = (e) => e.preventDefault();
  const cell = (e) => { const p = at(cv2, e); return [Math.floor(p[0] / cv2.width * 64), Math.floor(p[1] / cv2.height * 64)]; };
  let down2 = false;
  const line = (a, b) => { // every pixel between two points, so a fast stroke has no gaps
    let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (let n = 0; n < 200; n++) { apply(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const d2 = (e) => { if (e.button !== 0) return; e.preventDefault(); try { cv2.setPointerCapture(e.pointerId); } catch (x) {} down2 = true; begin(); const c = cell(e); stroke.last = c; apply(c[0], c[1]); };
  const m2 = (e) => {
    const c = cell(e), inside = c[0] >= 0 && c[1] >= 0 && c[0] < 64 && c[1] < 64;
    if (down2 && stroke) { if (tool === "fill" || tool === "pick") apply(c[0], c[1]); else line(stroke.last, c); stroke.last = c; }
    hover = inside ? c : null; dirty = true;
  };
  const u2 = () => { if (down2) end(); down2 = false; };
  const leave = () => { if (hover && !mode && !down2) { hover = null; dirty = true; } };
  cv3.addEventListener("pointerdown", d3); cv3.addEventListener("pointermove", m3); cv3.addEventListener("pointerup", u3); cv3.addEventListener("pointercancel", u3);
  cv3.addEventListener("pointerleave", leave); cv3.addEventListener("wheel", w3, { passive: false }); cv3.addEventListener("contextmenu", noMenu);
  cv2.addEventListener("pointerdown", d2); cv2.addEventListener("pointermove", m2); cv2.addEventListener("pointerup", u2); cv2.addEventListener("pointercancel", u2); cv2.addEventListener("pointerleave", leave);
  cv3.style.touchAction = cv2.style.touchAction = "none"; cv3.style.cursor = "grab"; cv2.style.cursor = "crosshair";

  // ---------- buttons ----------
  document.querySelectorAll("#ptools button").forEach((b) => b.addEventListener("click", () => useTool(b.dataset.tool)));
  $("pcolor").addEventListener("input", (e) => setColor(fromHex(e.target.value)));
  $("phex").addEventListener("input", (e) => { let v = e.target.value.trim(); if (v[0] !== "#") v = "#" + v; if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(fromHex(v), true); });
  const swatch = (e) => { const c = e.target && e.target.dataset && e.target.dataset.c; if (c) { setColor(fromHex(c)); if (tool === "erase" || tool === "pick") useTool("pen"); } };
  $("ppalette").addEventListener("click", swatch); $("precent").addEventListener("click", swatch);
  $("pundo").addEventListener("click", doUndo); $("predo").addEventListener("click", doRedo);
  $("psave").addEventListener("click", save);
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
  document.querySelectorAll("#pparts input").forEach((c) => c.addEventListener("change", () => { hidden[c.value] = !c.checked; dirty = true; }));
  $("ppose").addEventListener("change", (e) => { pose = e.target.value; dirty = true; });
  $("pzoom").addEventListener("input", (e) => { zoom = Number(e.target.value); dirty = true; });
  document.querySelectorAll("#pviews button").forEach((b) => b.addEventListener("click", () => { const v = b.dataset.v.split(","); yaw = Number(v[0]); pitch = Number(v[1]); dirty = true; }));
  const drop = $("pdrop");
  const over = (e) => { e.preventDefault(); drop.classList.add("over"); }, out = () => drop.classList.remove("over");
  const dropped = (e) => { e.preventDefault(); out(); loadFile(e.dataTransfer.files[0]); };
  drop.addEventListener("dragover", over); drop.addEventListener("dragleave", out); drop.addEventListener("drop", dropped);
  const KEYS = { b: "pen", p: "pen", e: "erase", g: "fill", f: "fill", i: "pick", l: "light", d: "dark" };
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
  setColor(color); useTool("pen"); buttons();
  let saved = null, savedSlim = false;
  try { saved = localStorage.getItem("fmf-paint"); savedSlim = localStorage.getItem("fmf-paint-slim") === "1"; } catch (e) {}
  const first = document.querySelector("#pstart button");
  if (saved && saved.indexOf("data:image/png") === 0) { loadUrl(saved, "", savedSlim, true); say("Your last painting is back."); }
  else if (first) loadUrl(first.dataset.skin, "", false, true);
  raf = requestAnimationFrame(frame);
})();
