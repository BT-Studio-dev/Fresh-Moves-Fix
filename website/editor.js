// Fresh Moves Fix - skin eye editor. Runs entirely in the browser.
// Marker layout: see the comment above TYPES.
(function () {
  const $ = (id) => document.getElementById(id);
  const skin = document.createElement("canvas");
  skin.width = skin.height = 64;
  const sctx = skin.getContext("2d", { willReadFrequently: true });
  let original = null; // ImageData of the loaded skin
  let loaded = false;

  // face = skin pixels (8..15, 8..15); face column 0 is the left edge as you look at the skin.
  // Marker positions: 2x1 and 2x2 match the example skins shipped in the pack; the other
  // types were read from the texture coordinates of the eye parts in optifine/cem/player.jem.
  // A variant is { label, face: [[col,row,role]], marker: [[x,y,src]] } where src is
  // "lid" | "white" | "pupil" | [col,row] (copy that face pixel).
  const eyeRows = (rows) => rows.flatMap((r) => [[1, r, "white"], [2, r, "pupil"], [5, r, "pupil"], [6, r, "white"]]);
  function wide2(rows, mx, my) { // eyelid row, then one marker row per eye row
    const marker = [0, 1, 2, 3].map((k) => [mx + k, my, "lid"]);
    rows.forEach((r, i) => [1, 2, 5, 6].forEach((c, k) => marker.push([mx + k, my + 1 + i, [c, r]])));
    return { face: eyeRows(rows), marker };
  }
  function derp(row, my) { // 2x1 marker with white in the pupil slots, pupils two pixels to the left
    const marker = [0, 1, 2, 3].map((k) => [4 + k, my, "lid"]);
    marker.push([4, my + 1, [1, row]], [5, my + 1, [1, row]], [6, my + 1, [6, row]], [7, my + 1, [6, row]]);
    marker.push([2, my + 1, [2, row]], [3, my + 1, [5, row]]);
    return { face: eyeRows([row]), marker };
  }
  function wide3(row, my) { // enderman: three wide, touching the sides of the face
    const marker = [];
    for (const x of [32, 33, 34, 37, 38, 39]) marker.push([x, my, "lid"], [x, my + 1, "white"]);
    marker.push([35, my + 1, "pupil"], [36, my + 1, "pupil"]);
    return { face: [[0, row, "white"], [1, row, "white"], [2, row, "pupil"], [5, row, "pupil"], [6, row, "white"], [7, row, "white"]], marker };
  }
  function simple(cols, rows, my) { // no pupil: one eyelid pixel per eye
    return { face: rows.flatMap((r) => cols.map((c) => [c, r, "pupil"])), marker: [[0, my, "lid"], [1, my, "lid"]] };
  }
  const v = (label, o) => ({ label, ...o });
  const TYPES = {
    "2x1": { label: "2 wide, 1 tall", def: "upper", variants: {
      top: v("Top", wide2([3], 4, 0)), upper: v("Upper middle (Steve, Alex)", wide2([4], 4, 2)),
      lower: v("Lower middle", wide2([5], 4, 4)), bottom: v("Bottom", wide2([6], 4, 6)) } },
    "2x2": { label: "2 wide, 2 tall", def: "upper", variants: {
      top: v("Top", wide2([2, 3], 28, 2)), upper: v("Upper middle", wide2([3, 4], 28, 5)),
      lower: v("Lower middle", wide2([4, 5], 24, 2)), bottom: v("Bottom", wide2([5, 6], 24, 5)) } },
    "2x3": { label: "2 wide, 3 tall", def: "only", variants: {
      only: v("Rows 5 to 7 of the face (only position)", wide2([4, 5, 6], 32, 4)) } },
    "derp": { label: "2 wide, 1 tall, derp (cross-eyed)", def: "upper", variants: {
      top: v("Top", derp(3, 0)), upper: v("Upper middle", derp(4, 2)),
      lower: v("Lower middle", derp(5, 4)), bottom: v("Bottom", derp(6, 6)) } },
    "3x1": { label: "3 wide, 1 tall (enderman)", def: "top", variants: {
      top: v("Top", wide3(4, 0)), bottom: v("Bottom", wide3(5, 2)) } },
    "1x1": { label: "1 x 1 simple (blink only)", def: "outer_top", variants: {
      outer_top: v("Top, outer", simple([1, 6], [3], 6)), outer_bottom: v("Bottom, outer", simple([1, 6], [4], 7)),
      inner_top: v("Top, inner", simple([2, 5], [3], 4)), inner_bottom: v("Bottom, inner", simple([2, 5], [4], 5)) } },
    "1x2": { label: "1 wide, 2 tall simple (blink only)", def: "top", variants: {
      top: v("Top", simple([2, 5], [3, 4], 2)), bottom: v("Bottom", simple([2, 5], [4, 5], 3)) } },
    "1x3": { label: "1 wide, 3 tall simple (blink only)", def: "top", variants: {
      top: v("Top", simple([2, 5], [2, 3, 4], 0)), bottom: v("Bottom", simple([2, 5], [3, 4, 5], 1)) } },
  };
  // marker areas this editor manages; cleared before writing so only one eye type is active
  const AREAS = [[0, 0, 8, 8], [24, 2, 8, 6], [32, 0, 8, 4]];
  const AREA_2X3 = [32, 4, 4, 4]; // some skins keep other data here, so it is only cleared for 2x3 eyes

  const hex = (d, i) => "#" + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("");
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const idx = (x, y) => (y * 64 + x) * 4;

  let oldEyes = null;
  function setStatus(text, bad) {
    $("status").textContent = text;
    $("status").className = bad ? "status bad" : "status";
  }

  function loadImage(src, name, preset) {
    const img = new Image();
    img.onload = () => {
      if (img.width !== 64 || img.height !== 64) {
        setStatus(`"${name}" is ${img.width}x${img.height}. The skin must be 64x64 pixels.`, true);
        return;
      }
      sctx.clearRect(0, 0, 64, 64);
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(img, 0, 0);
      original = sctx.getImageData(0, 0, 64, 64);
      loaded = true;
      oldEyes = findOldEyes(original.data);
      $("custom").checked = true;
      // slim (Alex) skins leave the last arm column empty
      const slim = original.data[idx(54, 20) + 3] === 0;
      $("fmtslim").checked = slim; $("fmtwide").checked = !slim;
      setStatus(`Loaded ${name}.`);
      if (preset && TYPES[preset.type]) { // start skins that already have eyes choose the matching shape and place
        $("type").value = preset.type; fillPositions();
        if (TYPES[preset.type].variants[preset.pos]) $("pos").value = preset.pos;
        syncMenus();
      }
      pickDefaults();
      render();
    };
    img.onerror = () => setStatus(`Could not read "${name}" as an image.`, true);
    img.src = src;
  }

  function fillPositions() {
    const t = TYPES[$("type").value], sel = $("pos");
    sel.innerHTML = "";
    for (const [key, va] of Object.entries(t.variants)) {
      const o = document.createElement("option");
      o.value = key; o.textContent = va.label; o.selected = key === t.def;
      sel.appendChild(o);
    }
    sel.value = t.def;
    const hasWhite = Object.values(t.variants)[0].face.some((f) => f[2] === "white");
    $("whitewrap").style.display = hasWhite ? "" : "none";
    $("pupilname").textContent = hasWhite ? "Pupil" : "Eye colour";
  }

  function choice() {
    const t = TYPES[$("type").value];
    const va = t.variants[$("pos").value] || t.variants[t.def];
    const xs = va.marker.map((m) => m[0]), ys = va.marker.map((m) => m[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { type: $("type").value, ...va, box: { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 } };
  }

  // Eyes the loaded skin already has, found through its 2x1 or 2x2 marker.
  // Returns { cells: [[col,row]], lid, white, pupil } or null.
  function findOldEyes(d) {
    const solid = (x, y, w, h) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!d[idx(xx, yy) + 3]) return false; return true; };
    const make = (rows, mx, my) => ({
      cells: rows.flatMap((r) => [1, 2, 5, 6].map((c) => [c, r])),
      lid: hex(d, idx(mx, my)), white: hex(d, idx(mx, my + 1)), pupil: hex(d, idx(mx + 1, my + 1)) });
    for (const my of [0, 2, 4, 6]) if (solid(4, my, 4, 2)) return make([3 + my / 2], 4, my);
    for (const [mx, my, r] of [[28, 2, 2], [28, 5, 3], [24, 2, 4], [24, 5, 5]]) if (solid(mx, my, 4, 3)) return make([r, r + 1], mx, my);
    return null;
  }
  const far = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) > 60; };
  const dark = (h) => { const c = rgb(h); return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11 < 90; };

  // default colours: from the eyes the skin already has; otherwise from the face, and when
  // that gives colours you could not see (same as the skin, or white and pupil alike), safe ones
  function pickDefaults() {
    if (!loaded) return;
    const c = choice(), d = original.data;
    const first = c.face[0], w = c.face.find((f) => f[2] === "white"), p = c.face.find((f) => f[2] === "pupil");
    let lid = hex(d, idx(8 + first[0], 8 + Math.max(0, first[1] - 1)));
    let white = w ? hex(d, idx(8 + w[0], 8 + w[1])) : "#ffffff";
    let pupil = p ? hex(d, idx(8 + p[0], 8 + p[1])) : "#2b2b2b";
    if (oldEyes) { lid = oldEyes.lid; white = oldEyes.white; pupil = oldEyes.pupil; }
    if (w) {
      if (!far(white, lid) || !far(white, pupil)) white = "#ffffff";
      if (!far(pupil, white)) pupil = "#2b2b2b";
    } else if (!far(pupil, lid)) pupil = dark(lid) ? "#ffffff" : "#2b2b2b";
    $("lid").value = lid; $("white").value = white; $("pupil").value = pupil;
  }

  function build() {
    const out = new ImageData(new Uint8ClampedArray(original.data), 64, 64);
    const d = out.data, c = choice();
    const custom = $("custom").checked;
    const put = (x, y, col) => { const i = idx(x, y); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    for (const [ax, ay, w, h] of c.type === "2x3" ? [...AREAS, AREA_2X3] : AREAS)
      for (let y = ay; y < ay + h; y++) for (let x = ax; x < ax + w; x++) { const i = idx(x, y); d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
    const colour = { white: rgb($("white").value), pupil: rgb($("pupil").value), lid: rgb($("lid").value) };
    if (custom) {
      // remove the eyes the skin had, so they do not stay next to the new ones
      if (oldEyes) for (const [col, row] of oldEyes.cells) put(8 + col, 8 + row, rgb(oldEyes.lid));
      for (const [col, row, role] of c.face) {
        put(8 + col, 8 + row, colour[role]);
        d[idx(40 + col, 8 + row) + 3] = 0; // nothing from the second layer (hat) over the eye
      }
    }
    for (const [x, y, src] of c.marker) {
      if (typeof src === "string") put(x, y, colour[src]);
      else { const i = idx(8 + src[0], 8 + src[1]); put(x, y, [d[i], d[i + 1], d[i + 2]]); }
    }
    return { out, c };
  }

  function draw(canvas, data, sx, sy, sw, sh, mark) {
    const ctx = canvas.getContext("2d");
    const s = canvas.width / sw;
    ctx.imageSmoothingEnabled = false;
    // checkerboard so transparent pixels are visible
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#26302b" : "#1c2420";
      ctx.fillRect(x * s, y * s, s, s);
    }
    const tmp = document.createElement("canvas"); tmp.width = tmp.height = 64;
    tmp.getContext("2d").putImageData(data, 0, 0);
    ctx.drawImage(tmp, sx, sy, sw, sh, 0, 0, canvas.width, sh * s);
    if (mark) {
      ctx.strokeStyle = "#3fd07f"; ctx.lineWidth = 2;
      ctx.strokeRect((mark.x - sx) * s + 1, (mark.y - sy) * s + 1, mark.w * s - 2, mark.h * s - 2);
    }
  }

  // ---- 3D preview (skinview3d). Falls back to the flat skin when WebGL is not available. ----
  let viewer = null, failed3d = false;
  const tex = document.createElement("canvas"); tex.width = tex.height = 64;

  // ---- emotes: one description for both 3D viewers. t = seconds; each part gets [turn x, turn y, turn z]; lift moves the whole player up ----
  const EMOTES = {
    cheer: (t) => ({ ra: [0, 0, -2.6 + Math.sin(t * 8) * 0.2], la: [0, 0, 2.6 - Math.sin(t * 8) * 0.2], head: [-0.25, 0, 0], lift: Math.abs(Math.sin(t * 4)) * 2 }),
    jacks: (t) => { const p = (1 - Math.cos(t * 6)) / 2; return { ra: [0, 0, -p * 2.7], la: [0, 0, p * 2.7], rl: [0, 0, -p * 0.4], ll: [0, 0, p * 0.4], lift: Math.sin(Math.min(1, p * 1.2) * Math.PI) * 1.5 }; },
    clap: (t) => { const c = 0.32 + Math.max(0, Math.sin(t * 11)) * 0.3; return { ra: [-1.35, 0, c], la: [-1.35, 0, -c], head: [0.12, 0, 0] }; },
    dance: (t) => { const w = Math.sin(t * 6); return { ra: [-2.7 + w * 0.5, 0, -0.25], la: [-2.7 - w * 0.5, 0, 0.25], rl: [w * 0.45, 0, 0], ll: [-w * 0.45, 0, 0], head: [0, 0, w * 0.18], lift: Math.abs(w) * 1.2 }; },
    dab: (t) => { const b = Math.sin(t * 3) * 0.04; return { head: [0.45, 0.35, 0], ra: [0, 0, -2.05 + b], la: [-1.75, -0.2, -0.95 + b], rl: [0, 0, -0.08], ll: [0, 0, 0.08] }; },
    sit: (t) => { const b = Math.sin(t * 1.6) * 0.03; return { rl: [-1.45, 0.12, 0], ll: [-1.45, -0.12, 0], ra: [-0.55 + b, 0, -0.08], la: [-0.55 - b, 0, 0.08], lift: -10 }; },
    look: (t) => ({ head: [Math.sin(t * 0.9) * 0.25, Math.sin(t * 1.5) * 0.9, 0], ra: [0, 0, -0.05], la: [0, 0, 0.05] }),
    tpose: () => ({ ra: [0, 0, -Math.PI / 2], la: [0, 0, Math.PI / 2] }),
  };
  const PARTS3D = { head: "head", body: "body", ra: "rightArm", la: "leftArm", rl: "rightLeg", ll: "leftLeg" };
  // the same emote for the WebGL viewer (skinview3d)
  function emoteAnimation(fn) {
    return new skinview3d.FunctionAnimation((player, t) => {
      const e = fn(t);
      for (const k in PARTS3D) { const r = e[k] || [0, 0, 0]; player.skin[PARTS3D[k]].rotation.set(r[0], r[1], r[2]); }
      player.position.y = e.lift || 0;
    });
  }

  // ---- simple 3D preview without WebGL: the model is drawn pixel by pixel on a normal 2D canvas ----
  function SoftViewer(cv) {
    const g = cv.getContext("2d");
    let img = null, slim = false, yaw = -0.5, pitch = 0.15, raf = 0, last = 0, t = 0, dead = false, drag = null;
    const self = this; self.soft = true; self.autoRotate = false; self.zoom = 0.9; self.pose = "idle"; self.layers3d = false;
    // box: uv corner, size (w,h,d), centre, pivot name, inflate
    function parts() {
      const aw = slim ? 3 : 4, ax = slim ? 5.5 : 6;
      const P = [
        ["head", 0, 0, 8, 8, 8, 0, 28, 0, 0], ["head", 32, 0, 8, 8, 8, 0, 28, 0, 0.5],
        ["body", 16, 16, 8, 12, 4, 0, 18, 0, 0], ["body", 16, 32, 8, 12, 4, 0, 18, 0, 0.25],
        ["ra", 40, 16, aw, 12, 4, -ax, 18, 0, 0], ["ra", 40, 32, aw, 12, 4, -ax, 18, 0, 0.25],
        ["la", 32, 48, aw, 12, 4, ax, 18, 0, 0], ["la", 48, 48, aw, 12, 4, ax, 18, 0, 0.25],
        ["rl", 0, 16, 4, 12, 4, -2, 6, 0, 0], ["rl", 0, 32, 4, 12, 4, -2, 6, 0, 0.25],
        ["ll", 16, 48, 4, 12, 4, 2, 6, 0, 0], ["ll", 0, 48, 4, 12, 4, 2, 6, 0, 0.25],
      ];
      return P;
    }
    const NORMALS = [[0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0]]; // front, back, right, left, top, bottom
    const PIV = { head: [0, 24, 0], body: [0, 24, 0], ra: [-5, 22, 0], la: [5, 22, 0], rl: [-2, 12, 0], ll: [2, 12, 0] };
    function angles() { // [turn x, turn y, turn z] per part, plus lift
      const A = { head: [0, 0, 0], body: [0, 0, 0], ra: [0, 0, 0], la: [0, 0, 0], rl: [0, 0, 0], ll: [0, 0, 0], lift: 0 };
      const p = self.pose;
      if (EMOTES[p]) { const e = EMOTES[p](t); for (const k in e) A[k] = e[k]; return A; }
      if (p === "walk" || p === "run") {
        const k = p === "run" ? 1.1 : 0.6, w = Math.sin(t * (p === "run" ? 10 : 6)) * k;
        A.ra[0] = w; A.la[0] = -w; A.rl[0] = -w; A.ll[0] = w;
      } else if (p === "wave") {
        A.ra[2] = -2.4 + Math.sin(t * 7) * 0.35; A.la[2] = 0.05; A.head[2] = 0.06;
      } else {
        const b = Math.sin(t * 1.6) * 0.04; A.ra[2] = -0.05 - b; A.la[2] = 0.05 + b; A.ra[0] = b; A.la[0] = -b;
      }
      return A;
    }
    function draw() {
      const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
      if (!img) return;
      const d = img.data, A = angles(), sc = (H / 46) * self.zoom, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const quads = [];
      const pt = (name, x, y, z) => {
        const a = A[name], pv = PIV[name];
        let X = x - pv[0], Y = y - pv[1], Z = z - pv[2];
        if (a[2]) { const c = Math.cos(a[2]), s2 = Math.sin(a[2]); const x2 = X * c - Y * s2; Y = X * s2 + Y * c; X = x2; }   // same order as the WebGL viewer: z, then y, then x
        if (a[1]) { const c = Math.cos(a[1]), s2 = Math.sin(a[1]); const x2 = X * c + Z * s2; Z = -X * s2 + Z * c; X = x2; }
        if (a[0]) { const c = Math.cos(a[0]), s2 = Math.sin(a[0]); const y2 = Y * c - Z * s2; Z = Y * s2 + Z * c; Y = y2; }
        X += pv[0]; Y += pv[1] - 16 + A.lift; Z += pv[2];
        const x3 = X * cy + Z * sy, z3 = -X * sy + Z * cy;       // turn left/right
        const y4 = Y * cp - z3 * sp, z4 = Y * sp + z3 * cp;       // tilt
        const f = 90 / (90 - z4);                                 // a little perspective
        return [W / 2 + x3 * f * sc, H / 2 - y4 * f * sc, z4];
      };
      const col = (o, k) => "rgba(" + Math.round(d[o] * k) + "," + Math.round(d[o + 1] * k) + "," + Math.round(d[o + 2] * k) + "," + (d[o + 3] / 255) + ")";
      const zq = (a, b, c, e) => (a[2] + b[2] + c[2] + e[2]) / 4;
      for (const [name, u, v, w, h, dp, cx, cyy, cz, inf0] of parts()) {
        const vox = self.layers3d && inf0 > 0;          // 3D skin layers: the second layer becomes little blocks
        const inf = vox ? (name === "head" ? 0.7 : 0.55) : inf0;
        // each face: texture corner, columns, rows, and a function texel corner (i,j) -> model point
        const faces = (n) => {
          const sx = (w + 2 * n) / w, sy2 = (h + 2 * n) / h, sz = (dp + 2 * n) / dp, top = cyy + h / 2 * sy2;
          return [
            [u + dp, v + dp, w, h, (i, j) => [cx + (-w / 2 + i) * sx, top - j * sy2, cz + dp / 2 * sz]],               // front
            [u + 2 * dp + w, v + dp, w, h, (i, j) => [cx + (w / 2 - i) * sx, top - j * sy2, cz - dp / 2 * sz]],       // back
            [u, v + dp, dp, h, (i, j) => [cx - w / 2 * sx, top - j * sy2, cz + (-dp / 2 + i) * sz]],                  // player's right
            [u + dp + w, v + dp, dp, h, (i, j) => [cx + w / 2 * sx, top - j * sy2, cz + (dp / 2 - i) * sz]],          // player's left
            [u + dp, v, w, dp, (i, j) => [cx + (-w / 2 + i) * sx, top, cz + (-dp / 2 + j) * sz]],                     // top
            [u + dp + w, v, w, dp, (i, j) => [cx + (-w / 2 + i) * sx, top - h * sy2, cz + (-dp / 2 + j) * sz]],       // bottom
          ];
        };
        const F = faces(inf);
        for (let fi = 0; fi < 6; fi++) {
          const [fu, fv, cols, rows, fn] = F[fi];
          // corners of the whole face, to drop faces that look away (not for the thin see-through layer)
          const c00 = pt(name, ...fn(0, 0)), c10 = pt(name, ...fn(cols, 0)), c01 = pt(name, ...fn(0, rows));
          let cross = (c10[0] - c00[0]) * (c01[1] - c00[1]) - (c10[1] - c00[1]) * (c01[0] - c00[0]);
          if (fi === 5) cross = -cross; // the bottom is seen from below
          if (!inf0 && cross <= 0) continue;
          const C = cols + 1, grid = [], base = [];
          for (let jj = 0; jj <= rows; jj++) for (let ii = 0; ii <= cols; ii++) {
            grid.push(pt(name, ...fn(ii, jj)));
            if (vox) { const q = fn(ii, jj), nrm = NORMALS[fi]; base.push(pt(name, q[0] - nrm[0] * inf, q[1] - nrm[1] * inf, q[2] - nrm[2] * inf)); } // straight down to the skin
          }
          const shade = cross > 0 ? (fi < 2 ? 1 : fi < 4 ? 0.82 : fi === 4 ? 1 : 0.6) : 0.7;
          const solid = (ii, jj) => ii >= 0 && jj >= 0 && ii < cols && jj < rows && d[((fv + jj) * 64 + fu + ii) * 4 + 3] > 0;
          for (let jj = 0; jj < rows; jj++) for (let ii = 0; ii < cols; ii++) {
            const o = ((fv + jj) * 64 + fu + ii) * 4;
            if (!d[o + 3]) continue;
            const k = [jj * C + ii, jj * C + ii + 1, (jj + 1) * C + ii + 1, (jj + 1) * C + ii];
            const a = grid[k[0]], b = grid[k[1]], c = grid[k[2]], e = grid[k[3]];
            if (!vox || cross > 0) quads.push([zq(a, b, c, e), a, b, c, e, col(o, shade)]);
            if (vox) { // walls of the little block where the pixel next to it is empty
              const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
              for (let m = 0; m < 4; m++) {
                if (solid(ii + nb[m][0], jj + nb[m][1])) continue;
                const p1 = grid[k[m]], p2 = grid[k[(m + 1) % 4]], q2 = base[k[(m + 1) % 4]], q1 = base[k[m]];
                // walls that look away from you are not drawn
                let area = (p2[0] - p1[0]) * (q1[1] - p1[1]) - (p2[1] - p1[1]) * (q1[0] - p1[0]);
                if (fi === 5) area = -area;
                if (area >= 0) continue;
                quads.push([zq(p1, p2, q2, q1), p1, p2, q2, q1, col(o, m % 2 ? 0.72 : 0.86)]);
              }
            }
          }
        }
      }
      quads.sort((p, q) => p[0] - q[0]);
      g.lineJoin = "round"; g.lineWidth = 0.7;
      for (const q of quads) {
        g.fillStyle = g.strokeStyle = q[5];
        g.beginPath(); g.moveTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); g.lineTo(q[3][0], q[3][1]); g.lineTo(q[4][0], q[4][1]); g.closePath();
        g.fill(); g.stroke();
      }
    }
    function frame(now) {
      if (dead) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; t += dt;
      if (self.autoRotate && !drag) yaw += dt * 0.9;
      try { draw(); } catch (e) {}
      raf = requestAnimationFrame(frame);
    }
    const down = (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
    const move = (e) => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) * 0.012; pitch = Math.max(-1.3, Math.min(1.3, drag[3] + (e.clientY - drag[1]) * 0.012)); };
    const up = () => { drag = null; };
    const wheel = (e) => {
      e.preventDefault(); const z = $("zoom"), n = Math.max(Number(z.min), Math.min(Number(z.max), self.zoom * (e.deltaY > 0 ? 0.93 : 1.07)));
      self.zoom = n; z.value = n;
    };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    cv.style.touchAction = "none"; cv.style.cursor = "grab";
    self.loadSkin = (canvas, opt) => { img = canvas.getContext("2d").getImageData(0, 0, 64, 64); slim = !!opt && opt.model === "slim"; };
    self.view = (y, p, at) => { yaw = y; pitch = p; if (at !== undefined) t = at; };
    self.render = () => { try { draw(); } catch (e) {} };
    self.dispose = () => { dead = true; cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); cv.removeEventListener("wheel", wheel); };
    raf = requestAnimationFrame(frame);
  }
  // why 3D cannot start, in plain words
  function why3d(e) {
    if (!window.skinview3d) return "The 3D part of the page did not load. Check your internet connection.";
    let gl = null;
    try { const c = document.createElement("canvas"); gl = c.getContext("webgl2") || c.getContext("webgl"); } catch (x) {}
    if (!gl) return "Your browser has 3D graphics (WebGL) switched off right now. Close the browser completely and open it again. If that does not help, turn on graphics acceleration in the browser settings (Chrome: Settings > System).";
    try { const x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } catch (x) {}
    return "The 3D preview could not start (" + String((e && e.message) || e).slice(0, 120) + ").";
  }
  function fresh3d() { // a canvas that failed once cannot be used again
    const old = $("view3d"), cv = document.createElement("canvas");
    cv.id = "view3d"; cv.width = old.width; cv.height = old.height; old.replaceWith(cv);
    cv.addEventListener("webglcontextlost", (ev) => { if (viewer && !viewer.soft && ev.target === $("view3d")) fail3d(new Error("the browser stopped the 3D picture")); });
  }
  function fail3d(e) {
    try { if (viewer) viewer.dispose(); } catch (x) {}
    failed3d = true; viewer = null;
    const reason = why3d(e);
    try { // simple 3D that needs no WebGL
      startSoft();
      $("msg3d").textContent = "3D preview on (simple mode).";
      $("why3d").hidden = false; $("why3dtext").textContent = "Simple 3D mode. " + reason;
      $("why3dmore").textContent = "The simple mode shows the same skin, only less smooth.";
    } catch (x) {
      viewer = null;
      $("wrap3d").style.display = "none";
      $("flat").open = true;
      $("msg3d").textContent = "3D preview is not available in this browser; showing the flat skin instead.";
      $("why3d").hidden = false; $("why3dtext").textContent = reason;
    }
  }
  function start3d() {
    const cv = $("view3d");
    viewer = new skinview3d.SkinViewer({ canvas: cv, width: cv.width, height: cv.height, zoom: Number($("zoom").value) });
    viewer.autoRotate = $("spin").checked;
    setAnim();
    $("wrap3d").style.display = ""; $("why3d").hidden = true;
    $("msg3d").textContent = "3D preview on.";
  }
  // the simple viewer on purpose: it can show the second skin layer as 3D blocks
  function startSoft() {
    fresh3d();
    viewer = new SoftViewer($("view3d"));
    viewer.autoRotate = $("spin").checked; viewer.zoom = Number($("zoom").value); viewer.layers3d = $("layers3d").checked; setAnim();
    $("wrap3d").style.display = "";
  }
  function init3d() {
    if (viewer || failed3d) return;
    if ($("layers3d").checked) {
      try { startSoft(); $("why3d").hidden = true; $("msg3d").textContent = "3D preview on (3D skin layers)."; return; } catch (e) { viewer = null; }
    }
    try {
      if (!window.skinview3d) throw new Error("library not loaded");
      start3d();
    } catch (e) { fail3d(e); }
  }
  // "Try again": load the 3D part again if it is missing, then start on a new canvas
  function retry3d() {
    const go = () => { try { if (viewer) viewer.dispose(); } catch (x) {} failed3d = false; viewer = null; fresh3d(); if (current) update3d(current); else init3d(); };
    $("why3dtext").textContent = "Trying again...";
    if (window.skinview3d) return go();
    const sc = document.createElement("script");
    sc.src = "../skinview3d.bundle.js?r=" + Date.now(); sc.onload = sc.onerror = go; document.body.appendChild(sc);
  }
  $("retry3d").addEventListener("click", retry3d);
  $("layers3d").addEventListener("change", () => {
    try { localStorage.setItem("fmf-layers3d", $("layers3d").checked ? "on" : "off"); } catch (e) {}
    if (viewer && viewer.soft && failed3d) { viewer.layers3d = $("layers3d").checked; return; } // no WebGL: stay in the simple viewer
    try { if (viewer) { const r = viewer.renderer; viewer.dispose(); if (r && r.forceContextLoss) r.forceContextLoss(); } } catch (e) {}
    viewer = null; failed3d = false; fresh3d();
    if (current) update3d(current); else init3d();
  });
  try { $("layers3d").checked = localStorage.getItem("fmf-layers3d") === "on"; } catch (e) {}
  $("view3d").addEventListener("webglcontextlost", (ev) => { if (viewer && !viewer.soft && ev.target === $("view3d")) fail3d(new Error("the browser stopped the 3D picture")); });
  function setAnim() {
    if (!viewer) return;
    if (viewer.soft) { viewer.pose = $("anim").value; return; }
    const A = { idle: skinview3d.IdleAnimation, walk: skinview3d.WalkingAnimation, run: skinview3d.RunningAnimation, wave: skinview3d.WaveAnimation }[$("anim").value];
    const em = EMOTES[$("anim").value];
    viewer.animation = em ? emoteAnimation(em) : A ? new A() : null;
  }
  function update3d(data) {
    init3d();
    if (!viewer) return;
    try {
      tex.getContext("2d").putImageData(data, 0, 0);
      viewer.loadSkin(tex, { model: $("fmtslim").checked ? "slim" : "default" });
    } catch (e) { $("msg3d").textContent = "3D preview could not show this skin."; }
  }
  ["fmtwide", "fmtslim"].forEach((id) => $(id).addEventListener("change", () => { if (current) update3d(current); }));
  window.fmfCleanup = () => { try { if (viewer) { const r = viewer.renderer; viewer.dispose(); if (r && r.forceContextLoss) r.forceContextLoss(); } } catch (e) {} viewer = null; try { blobUrls.forEach((u) => URL.revokeObjectURL(u)); } catch (e) {} };
  $("anim").addEventListener("change", setAnim);
  $("spin").addEventListener("change", () => { if (viewer) viewer.autoRotate = $("spin").checked; });
  $("zoom").addEventListener("input", () => { if (viewer) viewer.zoom = Number($("zoom").value); });

  // ---- colour picker card (replaces the browser's own colour dialog) ----
  const BASIC = ["#ffffff", "#d9d9d9", "#9a9a9a", "#4d4d4d", "#000000", "#3e2b18", "#6b4226", "#a9744f", "#d4ae87", "#f2d3b3",
    "#c0392b", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3b82c4", "#1f4e9e", "#523d89", "#9b59b6", "#e84393"];
  let pkFor = null, pkH = 0, pkS = 0, pkV = 1;
  const toHex = (c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
  function hsv2rgb(h, sa, va) {
    const f = (n) => { const k = (n + h / 60) % 6; return 255 * (va - va * sa * Math.max(0, Math.min(k, 4 - k, 1))); };
    return [f(5), f(3), f(1)];
  }
  function rgb2hsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx];
  }
  function syncSwatches() {
    document.querySelectorAll(".sw[data-for]").forEach((b) => { b.style.background = $(b.dataset.for).value; });
  }
  function pkDraw() {
    const cv = $("pk-sv"), ctx = cv.getContext("2d"), w = cv.width, h = cv.height;
    ctx.fillStyle = toHex(hsv2rgb(pkH, 1, 1)); ctx.fillRect(0, 0, w, h);
    let g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.beginPath(); ctx.arc(pkS * w, (1 - pkV) * h, 6, 0, 7);
    ctx.lineWidth = 2; ctx.strokeStyle = pkV > 0.5 ? "#000" : "#fff"; ctx.stroke();
  }
  function pkApply(hexv, keepHsv) {
    if (!pkFor) return;
    if (!keepHsv) { const [h, sa, va] = rgb2hsv(rgb(hexv)); if (sa > 0 && va > 0) pkH = h; pkS = sa; pkV = va; $("pk-hue").value = Math.round(pkH); }
    $(pkFor).value = hexv;
    $("pk-hex").value = hexv; $("pk-now").style.background = hexv;
    pkDraw();
    if (pkFor !== "lid") $("custom").checked = true;
    render();
  }
  function pkSwatches(box, list) {
    box.innerHTML = "";
    for (const c of list) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sw small"; b.style.background = c; b.title = c;
      b.addEventListener("click", () => pkApply(c));
      box.appendChild(b);
    }
  }
  function pkOpen(btn) {
    const id = btn.dataset.for;
    if (pkFor === id && !$("picker").hidden) { pkClose(); return; }
    pkFor = id;
    $("pk-title").textContent = { lid: "Eyelid colour", white: "Eye white colour", pupil: $("pupilname").textContent + " colour" }[id];
    const seen = [];
    if (original) for (let y = 8; y < 16; y++) for (let x = 8; x < 16; x++) { const c = hex(original.data, idx(x, y)); if (!seen.includes(c)) seen.push(c); }
    pkSwatches($("pk-skin"), seen.slice(0, 20));
    pkSwatches($("pk-basic"), BASIC);
    btn.closest("p").after($("picker"));
    $("picker").hidden = false;
    const custom = $("custom").checked;
    pkApply($(id).value);
    $("custom").checked = custom; render(); // opening the card must not change anything
  }
  function pkClose() { $("picker").hidden = true; pkFor = null; }
  function pkPoint(e) {
    const r = $("pk-sv").getBoundingClientRect();
    pkS = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    pkV = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    pkApply(toHex(hsv2rgb(pkH, pkS, pkV)), true);
  }
  document.querySelectorAll(".sw[data-for]").forEach((b) => b.addEventListener("click", () => pkOpen(b)));
  $("pk-close").addEventListener("click", pkClose);
  $("pk-sv").addEventListener("pointerdown", (e) => { $("pk-sv").setPointerCapture(e.pointerId); pkPoint(e); });
  $("pk-sv").addEventListener("pointermove", (e) => { if (e.buttons) pkPoint(e); });
  $("pk-hue").addEventListener("input", () => { pkH = Number($("pk-hue").value); pkApply(toHex(hsv2rgb(pkH, pkS, pkV)), true); });
  $("pk-hex").addEventListener("change", () => {
    let t = $("pk-hex").value.trim().toLowerCase(); if (t[0] !== "#") t = "#" + t;
    if (/^#[0-9a-f]{6}$/.test(t)) pkApply(t); else $("pk-hex").value = $(pkFor).value;
  });

  let current = null;
  function render() {
    if (!loaded) return;
    syncSwatches();
    const { out, c } = build();
    current = out;
    try { // the small picture in the "1. Skin" heading shows the face of the skin being edited
      const ic = $("skinicon"), g = ic && ic.getContext && ic.getContext("2d");
      if (g) {
        const face = g.createImageData(8, 8);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const hat = idx(40 + x, 8 + y), base = idx(8 + x, 8 + y), from = out.data[hat + 3] > 127 ? hat : base, to = (y * 8 + x) * 4;
          for (let k = 0; k < 3; k++) face.data[to + k] = out.data[from + k];
          face.data[to + 3] = 255;
        }
        g.putImageData(face, 0, 0);
      }
    } catch (e) {}
    draw($("face"), out, 8, 8, 8, 8);
    draw($("top"), out, 0, 0, 40, 8, c.box);
    draw($("full"), out, 0, 0, 64, 64, c.box);
    update3d(out);
    $("save").disabled = false;
  }

  function readFile(f) {
    if (!f) return;
    $("filename").textContent = f.name; $("filename").className = "has";
    const r = new FileReader();
    r.onload = () => loadImage(r.result, f.name);
    r.readAsDataURL(f);
  }
  $("file").addEventListener("change", (e) => readFile(e.target.files[0]));
  // dropping a file on the box works too, without the system file window
  ["dragenter", "dragover"].forEach((t) => $("drop").addEventListener(t, (e) => { e.preventDefault(); $("drop").classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => $("drop").addEventListener(t, (e) => { e.preventDefault(); $("drop").classList.remove("over"); }));
  $("drop").addEventListener("drop", (e) => readFile(e.dataTransfer && e.dataTransfer.files[0]));

  // ---- themed drop-down lists (replace the browser's own lists) ----
  const menus = [];
  function closeMenus(except) { menus.forEach((m) => { if (m !== except) m.close(); }); }
  function enhance(sel) {
    const wrap = document.createElement("span"); wrap.className = "dd";
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "dd-btn"; btn.setAttribute("aria-haspopup", "listbox");
    const list = document.createElement("span"); list.className = "dd-list"; list.setAttribute("role", "listbox"); list.hidden = true;
    wrap.appendChild(btn); wrap.appendChild(list);
    sel.classList.add("vh"); sel.tabIndex = -1; sel.after(wrap);
    const m = {
      close() { list.hidden = true; btn.setAttribute("aria-expanded", "false"); raise(); },
      sync() {
        const opts = Array.from(sel.options);
        const cur = opts.find((o) => o.value === sel.value) || opts[0];
        btn.textContent = cur ? cur.textContent : "";
        list.innerHTML = "";
        for (const o of opts) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "dd-opt" + (o === cur ? " on" : ""); b.textContent = o.textContent;
          b.setAttribute("role", "option"); b.setAttribute("aria-selected", o === cur ? "true" : "false");
          b.addEventListener("click", (e) => {
            e.preventDefault(); m.close(); btn.focus();
            if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event("change")); sel.dispatchEvent(new Event("input")); }
            syncMenus();
          });
          list.appendChild(b);
        }
      },
    };
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const open = list.hidden; closeMenus(m); list.hidden = !open; btn.setAttribute("aria-expanded", String(open)); raise();
      if (open) { const on = list.querySelector(".on"); if (on) on.focus(); }
    });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { m.close(); btn.focus(); }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !list.hidden) {
        e.preventDefault();
        const items = Array.from(list.children), i = items.indexOf(document.activeElement);
        const n = items[Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
        if (n) n.focus();
      }
    });
    menus.push(m); m.close(); m.sync();
  }
  // the card with an open list comes in front of the cards after it
  function raise() {
    document.querySelectorAll(".ed .panel").forEach((p) => p.classList.toggle("dd-open", !!p.querySelector('.dd-btn[aria-expanded="true"]')));
  }
  function syncMenus() { menus.forEach((m) => m.sync()); }
  document.addEventListener("fmf-lang", () => setTimeout(syncMenus, 0));
  setTimeout(syncMenus, 0); // pick up translated option texts
  document.addEventListener("click", (e) => { if (!(e.target.closest && e.target.closest(".dd"))) closeMenus(); });
  document.querySelectorAll("[data-skin]").forEach((b) =>
    b.addEventListener("click", () => loadImage(b.dataset.skin, b.dataset.name || b.textContent.trim(), b.dataset.type ? { type: b.dataset.type, pos: b.dataset.pos } : null)));
  for (const [key, t] of Object.entries(TYPES)) {
    const o = document.createElement("option");
    o.value = key; o.textContent = t.label;
    $("type").appendChild(o);
  }
  $("type").value = "2x1";
  fillPositions();
  $("type").addEventListener("change", () => { fillPositions(); syncMenus(); pickDefaults(); render(); });
  ["type", "pos", "anim"].forEach((id) => enhance($(id)));
  $("pos").addEventListener("change", () => { pickDefaults(); render(); });
  $("custom").addEventListener("input", render);

  // the two status lines are real links: just before one is used, its address is set to a fresh
  // blob: address of the picture, so a click, "open in new tab" and "copy link" all work
  const blobUrls = [];
  function blobOf(c) {
    const bin = atob(c.toDataURL("image/png").split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    blobUrls.push(url);
    return url;
  }
  function skinCanvas() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    c.getContext("2d").putImageData(current, 0, 0);
    return c;
  }
  function blobLink(a, picture) {
    let made = 0;
    const prepare = () => {
      if (!current || Date.now() - made < 400) return; // one picture per use, not one per event
      try { a.href = blobOf(picture()); made = Date.now(); } catch (e) {}
    };
    ["pointerdown", "mouseenter", "focus", "touchstart", "contextmenu"].forEach((t) => a.addEventListener(t, prepare));
    a.addEventListener("keydown", (e) => { if (e.key === "Enter") prepare(); });
    a.addEventListener("click", (e) => { if (String(a.getAttribute("href") || "").indexOf("blob:") !== 0) e.preventDefault(); });
  }
  blobLink($("status"), skinCanvas);
  blobLink($("msg3d"), () => {
    if (!viewer) return skinCanvas();
    try { viewer.render(); } catch (e) {}
    return $("view3d");
  });

  $("save").addEventListener("click", () => {
    if (!current) return;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    c.getContext("2d").putImageData(current, 0, 0);
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "skin-fresh-moves.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setStatus("Downloaded skin-fresh-moves.png.");
    }, "image/png");
  });

  loadImage($("steve").dataset.skin, "Steve");
})();
