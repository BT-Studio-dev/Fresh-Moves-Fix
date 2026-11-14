// Minecraft title maker: type a text, get a block-letter title picture (.png) in the style of the
// "Fresh Moves Fix" title. Own letters, drawn on a normal 2D canvas (no WebGL needed).
(function () {
  const $ = (id) => document.getElementById(id);
  const R = (...spec) => { const out = []; for (let i = 0; i < spec.length; i += 2) for (let k = 0; k < spec[i + 1]; k++) out.push(spec[i]); return out; };
  const F = "XXXXXXX", S2 = "XXX.XXX", L = "XXX....", RT = "....XXX", MID = "..XXX..";
  const G = {
    A: R(F, 2, S2, 2, F, 2, S2, 4), B: R(F, 2, S2, 2, "XXXXXX.", 1, F, 1, S2, 2, F, 2), C: R(F, 2, L, 6, F, 2),
    D: R("XXXXXX.", 2, S2, 6, "XXXXXX.", 2), E: R(F, 2, L, 2, F, 2, L, 2, F, 2), F: R(F, 2, L, 2, F, 2, L, 4),
    G: R(F, 2, L, 2, S2, 4, F, 2), H: R(S2, 4, F, 2, S2, 4), I: R("XXX", 10), J: R(RT, 6, S2, 2, F, 2),
    K: R(S2, 4, "XXXXXX.", 2, S2, 4), L: R(L, 8, F, 2),
    M: R("XXX....XXX", 2, "XXXX..XXXX", 2, "XXXXXXXXXX", 2, "XXX.XX.XXX", 2, "XXX....XXX", 2),
    N: R("XXX...XXX", 2, "XXXX..XXX", 2, "XXXXXXXXX", 2, "XXX..XXXX", 2, "XXX...XXX", 2),
    O: R(F, 2, S2, 6, F, 2), P: R(F, 2, S2, 2, F, 2, L, 4), Q: R(F, 2, S2, 5, F, 2, RT, 1),
    R: R(F, 2, S2, 2, "XXXXXX.", 1, F, 1, S2, 4), S: R(F, 2, L, 2, F, 2, RT, 2, F, 2), T: R(F, 2, MID, 8),
    U: R(S2, 8, F, 2), V: R(S2, 6, F, 2, ".XXXXX.", 1, MID, 1),
    W: R("XXX....XXX", 2, "XXX.XX.XXX", 2, "XXXXXXXXXX", 2, "XXXX..XXXX", 2, "XXX....XXX", 2),
    X: R(S2, 4, ".XXXXX.", 2, S2, 4), Y: R(S2, 4, F, 2, MID, 4), Z: R(F, 2, RT, 2, F, 2, L, 2, F, 2),
    0: R(F, 2, S2, 6, F, 2), 1: R("XXXXX..", 2, MID, 6, F, 2), 2: R(F, 2, RT, 2, F, 2, L, 2, F, 2),
    3: R(F, 2, RT, 2, F, 2, RT, 2, F, 2), 4: R(S2, 4, F, 2, RT, 4), 5: R(F, 2, L, 2, F, 2, RT, 2, F, 2),
    6: R(F, 2, L, 2, F, 2, S2, 2, F, 2), 7: R(F, 2, RT, 8), 8: R(F, 2, S2, 2, F, 2, S2, 2, F, 2), 9: R(F, 2, S2, 2, F, 2, RT, 2, F, 2),
    "!": R("XXX", 6, "...", 2, "XXX", 2), ".": R("...", 8, "XXX", 2), "-": R(".....", 4, "XXXXX", 2, ".....", 4),
    "?": R(F, 2, RT, 2, "..XXXXX", 2, "..XXX..", 1, ".......", 1, "..XXX..", 2), ":": R("...", 2, "XXX", 2, "...", 2, "XXX", 2, "...", 2),
  };
  // sizes in small cells; one small cell = 4 picture pixels at scale 1 (so one letter block = 16 pixels)
  // text types, as in the Blockbench Title Generator: Top = the big "Minecraft" text, Bottom = the update text, Small = the edition text
  const KIND = { top: { U: 4, OX: 2, OY: 3, D: 11 }, bottom: { U: 3, OX: 2, OY: 2, D: 8 }, small: { U: 2, OX: 1, OY: 2, D: 5 } };
  const IDS = [1, 2, 3];
  const FIELDS = ["tt1", "tc1", "tk1", "tt2", "tc2", "tk2", "tt3", "tc3", "tk3", "ttex", "tover", "tovc", "tovs",
    "toutc", "toutw", "tdepth", "tspace", "tlines", "tsize", "talign", "tbgc"];
  const CHECKS = ["tout", "tbg"];
  const clean = (t) => t.toUpperCase().split("").filter((c) => c === " " || G[c]).join("").replace(/\s+/g, " ").trim().slice(0, 24);
  const val = (id, d) => { const e = $(id); return e && e.value !== undefined && e.value !== "" ? e.value : d; };
  const on = (id, d) => { const e = $(id); return e ? !!e.checked : d; };

  // style choices that change the shape
  function shape(kind) {
    const k = KIND[kind] || KIND.top;
    const ow = { thin: 0.5, normal: 1, thick: 1.5 }[val("toutw", "normal")] || 1, dp = { none: 0, normal: 1, deep: 1.6 }[val("tdepth", "normal")];
    const sp = { tight: 0.5, normal: 1, wide: 2 }[val("tspace", "normal")] || 1;
    const outline = on("tout", true);
    return { U: k.U, OX: outline ? Math.max(1, Math.round(k.OX * ow)) : 0, OY: outline ? Math.max(1, Math.round(k.OY * ow)) : 0,
      D: Math.round(k.D * (dp === undefined ? 1 : dp)), LG: Math.max(1, Math.round(k.U * sp)) };
  }

  // one line of text -> grid of 0 (empty), 1 (outline), 2 (shade), 3 (face)
  function line(text, kind) {
    const { U, OX, OY, D, LG } = shape(kind), GAP = 3 * U;
    let w = 0; const at = [];
    for (const c of text) { if (c === " ") { w += GAP - LG; continue; } at.push([c, w]); w += G[c][0].length * U + LG; }
    w -= LG; if (w < 1) return null;
    const W = w + 2 * OX, H = 10 * U + D + 2 * OY, face = new Uint8Array(W * H), ext = new Uint8Array(W * H), g = new Uint8Array(W * H);
    for (const [c, x0] of at) G[c].forEach((row, r) => { for (let k = 0; k < row.length; k++) if (row[k] === "X")
      for (let y = 0; y < U; y++) for (let x = 0; x < U; x++) face[(OY + r * U + y) * W + OX + x0 + k * U + x] = 1; });
    for (let x = 0; x < W; x++) { let left = 0; for (let y = 0; y < H; y++) { if (face[y * W + x]) left = D + 1; if (left > 0) { ext[y * W + x] = 1; left--; } } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (face[i]) { g[i] = 3; continue; }
      if (ext[i]) { g[i] = 2; continue; }
      if (!OX) continue;
      let near = false;
      for (let yy = Math.max(0, y - OY); yy <= Math.min(H - 1, y + OY) && !near; yy++)
        for (let xx = Math.max(0, x - OX); xx <= Math.min(W - 1, x + OX); xx++) if (ext[yy * W + xx]) { near = true; break; }
      if (near) g[i] = 1;
    }
    return { W, H, g, top: OY, tall: 10 * U };
  }
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rnd = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  // ---- textures: own simple patterns, worked out from the position (no picture files) ----
  // each returns [brightness, colour or null] for one small square of a letter; ry = 0 at the top of the letter, 1 at the bottom
  const TEX = {
    plain: () => [1, null],
    stone: (x, y) => [rnd(x >> 1, y >> 1) < 0.14 ? 0.74 : 0.86 + 0.14 * rnd(x, y), null],
    bricks: (x, y) => { const row = y >> 2; return [(y & 3) === 3 || ((x + (row & 1) * 4) & 7) === 7 ? 0.66 : 0.9 + 0.1 * rnd(x >> 3, row), null]; },
    planks: (x, y) => { const row = y >> 2; return [(y & 3) === 3 ? 0.7 : ((x + row * 5) % 16) === 0 ? 0.78 : 0.88 + 0.12 * rnd(x >> 2, row), null]; },
    stripes: (x, y) => [((x + y) & 7) < 4 ? 1 : 0.8, null],
    dots: (x, y) => [(x & 3) === 1 && (y & 3) === 1 ? 0.7 : 1, null],
    grass: (x, y, ry) => ry < 0.22 + 0.1 * rnd(x, 7) ? [0.85 + 0.15 * rnd(x, y), [96, 190, 72]] : [0.84 + 0.16 * rnd(x, y), [134, 96, 67]],
    ore: (x, y) => rnd(x >> 1, (y >> 1) + 91) < 0.1 ? [1, [92, 232, 222]] : [rnd(x >> 1, y >> 1) < 0.14 ? 0.74 : 0.86 + 0.14 * rnd(x, y), [150, 150, 150]],
    gold: (x, y, ry) => [0.82 + 0.3 * (1 - ry) * rnd(x >> 1, y) + ((x + y * 2) % 11 === 0 ? 0.16 : 0), [250, 206, 60]],
    lava: (x, y) => { const v = rnd(x >> 1, y >> 1); return [1, v < 0.3 ? [255, 208, 64] : v < 0.7 ? [240, 120, 24] : [196, 60, 16]]; },
  };

  function draw() {
    const rowsIn = IDS.map((n) => [clean($("tt" + n).value), $("tc" + n).value, $("tk" + n).value]).filter((r) => r[0]);
    const lines = rowsIn.map((r) => ({ l: line(r[0], r[2]), col: hexRgb(r[1]) })).filter((r) => r.l);
    const cv = $("tcanvas"), sc = Number(val("tsize", "4")) || 4;
    if (!lines.length) { cv.width = 16; cv.height = 16; $("tsave").disabled = true; $("tinfo").textContent = "Type a text first."; return; }
    const VGAP = Math.round(Number(val("tlines", "3"))) || 0, align = val("talign", "center");
    const W = Math.max(...lines.map((r) => r.l.W)), H = Math.max(1, lines.reduce((a, r) => a + r.l.H, 0) + VGAP * (lines.length - 1));
    const tex = TEX[val("ttex", "plain")] || TEX.plain, over = val("tover", "none"), ovc = hexRgb(val("tovc", "#000000")), ovs = Number(val("tovs", "60")) / 100;
    const outc = hexRgb(val("toutc", "#14100e")), bg = on("tbg", false) ? hexRgb(val("tbgc", "#1d3c2d")) : null;
    const px = new Uint8ClampedArray(W * H * 4);
    if (bg) for (let i = 0; i < W * H; i++) { px[i * 4] = bg[0]; px[i * 4 + 1] = bg[1]; px[i * 4 + 2] = bg[2]; px[i * 4 + 3] = 255; }
    let y0 = 0;
    for (const { l, col } of lines) {
      const x0 = align === "left" ? 0 : align === "right" ? W - l.W : Math.floor((W - l.W) / 2);
      for (let y = 0; y < l.H; y++) { const gy = y0 + y; if (gy < 0 || gy >= H) continue;
        for (let x = 0; x < l.W; x++) {
          const v = l.g[y * l.W + x]; if (!v) continue;
          let c;
          if (v === 1) c = outc;
          else {
            const ry = Math.max(0, Math.min(1, (y - l.top) / l.tall)), [b, tint] = tex(x, y, ry), base = tint || col, k = b * (v === 2 ? 0.33 : 1);
            c = [base[0] * k, base[1] * k, base[2] * k];
            const a = over === "none" ? 0 : ovs * (over === "down" ? ry : over === "up" ? 1 - ry : 1);
            if (a > 0) { const m = v === 2 ? 0.33 : 1; c = [c[0] + (ovc[0] * m - c[0]) * a, c[1] + (ovc[1] * m - c[1]) * a, c[2] + (ovc[2] * m - c[2]) * a]; }
          }
          const i = (gy * W + x0 + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
        } }
      y0 += l.H + VGAP;
    }
    // the small picture is drawn once, then enlarged with hard edges
    cv.width = W * sc; cv.height = H * sc;
    const ctx = cv.getContext("2d"), small = document.createElement("canvas"); small.width = W; small.height = H;
    const sctx = small.getContext("2d"), im = sctx.createImageData(W, H); im.data.set(px); sctx.putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(small, 0, 0, W, H, 0, 0, cv.width, cv.height);
    $("tsave").disabled = false;
    $("tinfo").textContent = "Picture size: " + cv.width + " x " + cv.height + " pixels" + (bg ? "." : ", see-through background.");
    const show = (id, yes) => { const e = $(id); if (e && e.style) e.style.display = yes ? "" : "none"; };
    show("tovrow", over !== "none"); show("toutrow", on("tout", true)); show("tbgrow", !!bg);
    try { localStorage.setItem("fmf-title3", JSON.stringify({ v: FIELDS.map((id) => val(id, "")), c: CHECKS.map((id) => on(id, false)) })); } catch (e) {}
  }

  try {
    const s = JSON.parse(localStorage.getItem("fmf-title3") || "null");
    if (s) { FIELDS.forEach((id, i) => { if (typeof s.v[i] === "string" && $(id)) $(id).value = s.v[i]; }); CHECKS.forEach((id, i) => { if ($(id)) $(id).checked = !!s.c[i]; }); }
  } catch (e) {}
  FIELDS.concat(CHECKS).forEach((id) => { const e = $(id); if (e) { e.addEventListener("input", draw); e.addEventListener("change", draw); } });
  document.querySelectorAll("[data-title]").forEach((b) => b.addEventListener("click", () => {
    const parts = b.dataset.title.split(";"); // per line: text|colour|type
    IDS.forEach((n, i) => { const [t, c, k] = (parts[i] || "|#ffffff|small").split("|"); $("tt" + n).value = t; $("tc" + n).value = c; $("tk" + n).value = k; });
    if (b.dataset.tex) $("ttex").value = b.dataset.tex;
    draw();
  }));
  // tabs: Text, Texture, Overlay, Style, Settings
  const tabs = Array.from(document.querySelectorAll("[data-ttab]"));
  const openTab = (name) => tabs.forEach((b) => { const yes = b.dataset.ttab === name; b.setAttribute("aria-selected", String(yes)); b.classList.toggle("on", yes); const p = $("tp-" + b.dataset.ttab); if (p) p.hidden = !yes; });
  tabs.forEach((b) => b.addEventListener("click", () => openTab(b.dataset.ttab)));
  if (tabs.length) openTab("text");
  const reset = $("treset");
  if (reset) reset.addEventListener("click", () => {
    const d = { ttex: "plain", tover: "none", tovc: "#000000", tovs: "60", toutc: "#14100e", toutw: "normal", tdepth: "normal", tspace: "normal", tlines: "3", tsize: "4", talign: "center", tbgc: "#1d3c2d" };
    Object.keys(d).forEach((id) => { if ($(id)) $(id).value = d[id]; }); if ($("tout")) $("tout").checked = true; if ($("tbg")) $("tbg").checked = false; draw();
  });
  $("tsave").addEventListener("click", () => {
    const name = IDS.map((n) => clean($("tt" + n).value)).join(" ").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "title";
    const done = (url) => { const a = document.createElement("a"); a.href = url; a.download = "title-" + name + ".png"; document.body.appendChild(a); a.click(); a.remove(); $("tinfo").textContent = "Downloaded " + a.download + "."; };
    const cv = $("tcanvas");
    if (cv.toBlob) cv.toBlob((bl) => { const u = URL.createObjectURL(bl); done(u); setTimeout(() => URL.revokeObjectURL(u), 2000); }, "image/png"); else done(cv.toDataURL("image/png"));
  });
  draw();
})();
