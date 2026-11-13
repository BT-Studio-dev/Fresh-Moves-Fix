// Fresh Moves Fix - skin eye editor. Runs entirely in the browser.
// Marker layout taken from the example skins shipped in the pack
// (assets/minecraft/textures/entity/examples/1px_*.png and 2px_*.png).
(function () {
  const $ = (id) => document.getElementById(id);
  const skin = document.createElement("canvas");
  skin.width = skin.height = 64;
  const sctx = skin.getContext("2d", { willReadFrequently: true });
  let original = null; // ImageData of the loaded skin
  let loaded = false;

  // face = skin pixels (8..15, 8..15). Eyes sit in face columns 1,2 (right eye) and 5,6 (left eye).
  const COLS = [1, 2, 5, 6];
  const LAYOUT = {
    "2x1": { // one pixel tall: marker = eyelid row + eye row at x 4..7
      top: { row: 3, x: 4, y: 0 }, upper: { row: 4, x: 4, y: 2 },
      lower: { row: 5, x: 4, y: 4 }, bottom: { row: 6, x: 4, y: 6 }, rows: 1,
    },
    "2x2": { // two pixels tall: marker = eyelid row + two eye rows
      top: { row: 2, x: 28, y: 2 }, upper: { row: 3, x: 28, y: 5 },
      lower: { row: 4, x: 24, y: 2 }, bottom: { row: 5, x: 24, y: 5 }, rows: 2,
    },
  };
  // every marker area this editor manages; cleared before writing so only one eye type is active
  const AREAS = [[4, 0, 4, 8], [24, 2, 8, 6]];

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
      setStatus(`Loaded ${name}.`);
      pickDefaults();
      render();
    };
    img.onerror = () => setStatus(`Could not read "${name}" as an image.`, true);
    img.src = src;
  }

  function choice() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const pos = $("pos").value;
    return { type, rows: LAYOUT[type].rows, ...LAYOUT[type][pos] };
  }

  // take the default colours from the face of the loaded skin
  function pickDefaults() {
    if (!loaded) return;
    const c = choice(), d = original.data;
    $("lid").value = hex(d, idx(8 + 1, 8 + c.row - 1));
    $("white").value = hex(d, idx(8 + 1, 8 + c.row + c.rows - 1));
    $("pupil").value = hex(d, idx(8 + 2, 8 + c.row + c.rows - 1));
  }

  function build() {
    const out = new ImageData(new Uint8ClampedArray(original.data), 64, 64);
    const d = out.data, c = choice();
    const custom = $("custom").checked;
    const put = (x, y, col) => { const i = idx(x, y); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    for (const [ax, ay, w, h] of AREAS)
      for (let y = ay; y < ay + h; y++) for (let x = ax; x < ax + w; x++) d[idx(x, y) + 3] = 0, d[idx(x, y)] = d[idx(x, y) + 1] = d[idx(x, y) + 2] = 0;
    const white = rgb($("white").value), pupil = rgb($("pupil").value), lid = rgb($("lid").value);
    if (custom) // paint the chosen colours on the face: white outside, pupil inside
      for (let r = 0; r < c.rows; r++) {
        put(8 + 1, 8 + c.row + r, white); put(8 + 2, 8 + c.row + r, pupil);
        put(8 + 5, 8 + c.row + r, pupil); put(8 + 6, 8 + c.row + r, white);
      }
    for (let k = 0; k < 4; k++) put(c.x + k, c.y, lid);
    for (let r = 0; r < c.rows; r++)
      for (let k = 0; k < 4; k++) {
        const i = idx(8 + COLS[k], 8 + c.row + r);
        put(c.x + k, c.y + 1 + r, [d[i], d[i + 1], d[i + 2]]);
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
      ctx.strokeRect((mark.x - sx) * s + 1, (mark.y - sy) * s + 1, 4 * s - 2, (mark.rows + 1) * s - 2);
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
      viewer.loadSkin(tex, { model: "auto-detect" });
    } catch (e) { $("msg3d").textContent = "3D preview could not show this skin."; }
  }
  $("anim").addEventListener("change", setAnim);
  $("spin").addEventListener("change", () => { if (viewer) viewer.autoRotate = $("spin").checked; });
  $("zoom").addEventListener("input", () => { if (viewer) viewer.zoom = Number($("zoom").value); });

  let current = null;
  function render() {
    if (!loaded) return;
    const { out, c } = build();
    current = out;
    draw($("face"), out, 8, 8, 8, 8);
    draw($("top"), out, 0, 0, 40, 8, c);
    draw($("full"), out, 0, 0, 64, 64, c);
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
  document.querySelectorAll('input[name="type"]').forEach((el) => el.addEventListener("change", () => { pickDefaults(); render(); }));
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
