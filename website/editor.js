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

  function setStatus(text, bad) {
    $("status").textContent = text;
    $("status").className = bad ? "status bad" : "status";
  }

  function loadImage(src, name) {
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
      // slim (Alex) skins leave the last arm column empty
      const slim = original.data[idx(54, 20) + 3] === 0;
      $("fmtslim").checked = slim; $("fmtwide").checked = !slim;
      setStatus(`Loaded ${name}.`);
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

  // take the default colours from the face of the loaded skin
  function pickDefaults() {
    if (!loaded) return;
    const c = choice(), d = original.data;
    const first = c.face[0], w = c.face.find((f) => f[2] === "white"), p = c.face.find((f) => f[2] === "pupil");
    $("lid").value = hex(d, idx(8 + first[0], 8 + Math.max(0, first[1] - 1)));
    if (w) $("white").value = hex(d, idx(8 + w[0], 8 + w[1]));
    if (p) $("pupil").value = hex(d, idx(8 + p[0], 8 + p[1]));
  }

  function build() {
    const out = new ImageData(new Uint8ClampedArray(original.data), 64, 64);
    const d = out.data, c = choice();
    const custom = $("custom").checked;
    const put = (x, y, col) => { const i = idx(x, y); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    for (const [ax, ay, w, h] of c.type === "2x3" ? [...AREAS, AREA_2X3] : AREAS)
      for (let y = ay; y < ay + h; y++) for (let x = ax; x < ax + w; x++) { const i = idx(x, y); d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
    const colour = { white: rgb($("white").value), pupil: rgb($("pupil").value), lid: rgb($("lid").value) };
    if (custom) for (const [col, row, role] of c.face) put(8 + col, 8 + row, colour[role]);
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
  function init3d() {
    if (viewer || failed3d) return;
    try {
      if (!window.skinview3d) throw new Error("library not loaded");
      const cv = $("view3d");
      viewer = new skinview3d.SkinViewer({ canvas: cv, width: cv.width, height: cv.height, zoom: Number($("zoom").value) });
      viewer.autoRotate = false;
      setAnim();
      $("msg3d").textContent = "3D preview on.";
    } catch (e) {
      failed3d = true; viewer = null;
      $("wrap3d").style.display = "none";
      $("flat").open = true;
      $("msg3d").textContent = "3D preview is not available in this browser; showing the flat skin instead.";
    }
  }
  function setAnim() {
    if (!viewer) return;
    const A = { idle: skinview3d.IdleAnimation, walk: skinview3d.WalkingAnimation, run: skinview3d.RunningAnimation, wave: skinview3d.WaveAnimation }[$("anim").value];
    viewer.animation = A ? new A() : null;
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
    draw($("face"), out, 8, 8, 8, 8);
    draw($("top"), out, 0, 0, 40, 8, c.box);
    draw($("full"), out, 0, 0, 64, 64, c.box);
    update3d(out);
    $("save").disabled = false;
  }

  function readFile(f) {
    if (!f) return;
    $("filename").textContent = f.name;
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
      close() { list.hidden = true; btn.setAttribute("aria-expanded", "false"); },
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
      const open = list.hidden; closeMenus(m); list.hidden = !open; btn.setAttribute("aria-expanded", String(open));
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
  function syncMenus() { menus.forEach((m) => m.sync()); }
  document.addEventListener("click", (e) => { if (!(e.target.closest && e.target.closest(".dd"))) closeMenus(); });
  document.querySelectorAll("[data-skin]").forEach((b) =>
    b.addEventListener("click", () => loadImage(b.dataset.skin, b.textContent.trim())));
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
