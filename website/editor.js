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

  let current = null;
  function render() {
    if (!loaded) return;
    const { out, c } = build();
    current = out;
    draw($("face"), out, 8, 8, 8, 8);
    draw($("top"), out, 0, 0, 40, 8, c.box);
    draw($("full"), out, 0, 0, 64, 64, c.box);
    update3d(out);
    $("save").disabled = false;
  }

  $("file").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => loadImage(r.result, f.name);
    r.readAsDataURL(f);
  });
  document.querySelectorAll("[data-skin]").forEach((b) =>
    b.addEventListener("click", () => loadImage(b.dataset.skin, b.textContent.trim())));
  for (const [key, t] of Object.entries(TYPES)) {
    const o = document.createElement("option");
    o.value = key; o.textContent = t.label;
    $("type").appendChild(o);
  }
  $("type").value = "2x1";
  fillPositions();
  $("type").addEventListener("change", () => { fillPositions(); pickDefaults(); render(); });
  $("pos").addEventListener("change", () => { pickDefaults(); render(); });
  ["lid", "white", "pupil", "custom"].forEach((id) => $(id).addEventListener("input", render));
  ["white", "pupil"].forEach((id) => $(id).addEventListener("input", () => { $("custom").checked = true; render(); }));

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
