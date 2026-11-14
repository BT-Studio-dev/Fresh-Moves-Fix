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
  const VGAP = 3, IDS = [1, 2, 3];
  const clean = (t) => t.toUpperCase().split("").filter((c) => c === " " || G[c]).join("").replace(/\s+/g, " ").trim().slice(0, 24);

  // one line of text -> grid of 0 (empty), 1 (outline), 2 (shade), 3 (face)
  function line(text, kind) {
    const { U, OX, OY, D } = KIND[kind] || KIND.top, GAP = 3 * U;
    let w = 0; const at = [];
    for (const c of text) { if (c === " ") { w += GAP - U; continue; } at.push([c, w]); w += (G[c][0].length + 1) * U; }
    w -= U; if (w < 1) return null;
    const W = w + 2 * OX, H = 10 * U + D + 2 * OY, face = new Uint8Array(W * H), ext = new Uint8Array(W * H), g = new Uint8Array(W * H);
    for (const [c, x0] of at) G[c].forEach((row, r) => { for (let k = 0; k < row.length; k++) if (row[k] === "X")
      for (let y = 0; y < U; y++) for (let x = 0; x < U; x++) face[(OY + r * U + y) * W + OX + x0 + k * U + x] = 1; });
    for (let x = 0; x < W; x++) { let left = 0; for (let y = 0; y < H; y++) { if (face[y * W + x]) left = D + 1; if (left > 0) { ext[y * W + x] = 1; left--; } } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (face[i]) { g[i] = 3; continue; }
      if (ext[i]) { g[i] = 2; continue; }
      let near = false;
      for (let yy = Math.max(0, y - OY); yy <= Math.min(H - 1, y + OY) && !near; yy++)
        for (let xx = Math.max(0, x - OX); xx <= Math.min(W - 1, x + OX); xx++) if (ext[yy * W + xx]) { near = true; break; }
      if (near) g[i] = 1;
    }
    return { W, H, g };
  }
  const FIELDS = ["tt1", "tc1", "tk1", "tt2", "tc2", "tk2", "tt3", "tc3", "tk3", "tsize"];
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (c) => "rgb(" + c.map((v) => Math.round(v)).join(",") + ")";

  function draw() {
    const rowsIn = IDS.map((n) => [clean($("tt" + n).value), $("tc" + n).value, $("tk" + n).value]).filter((r) => r[0]);
    const lines = rowsIn.map((r) => ({ l: line(r[0], r[2]), col: hexRgb(r[1]) })).filter((r) => r.l);
    const cv = $("tcanvas"), sc = Number($("tsize").value) || 4;
    if (!lines.length) { cv.width = 16; cv.height = 16; $("tsave").disabled = true; $("tinfo").textContent = "Type a text first."; return; }
    const W = Math.max(...lines.map((r) => r.l.W)), H = lines.reduce((a, r) => a + r.l.H, 0) + VGAP * (lines.length - 1);
    cv.width = W * sc; cv.height = H * sc;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height);
    let y0 = 0;
    for (const { l, col } of lines) {
      const x0 = Math.floor((W - l.W) / 2), cols = [null, "rgb(20,16,14)", css(col.map((v) => v * 0.33)), css(col)];
      for (let y = 0; y < l.H; y++) for (let x = 0; x < l.W;) { // draw runs of the same colour as one box
        const v = l.g[y * l.W + x]; let x2 = x + 1;
        while (x2 < l.W && l.g[y * l.W + x2] === v) x2++;
        if (v) { ctx.fillStyle = cols[v]; ctx.fillRect((x0 + x) * sc, (y0 + y) * sc, (x2 - x) * sc, sc); }
        x = x2;
      }
      y0 += l.H + VGAP;
    }
    $("tsave").disabled = false;
    $("tinfo").textContent = "Picture size: " + cv.width + " x " + cv.height + " pixels, see-through background.";
    try { localStorage.setItem("fmf-title2", JSON.stringify(FIELDS.map((id) => $(id).value))); } catch (e) {}
  }

  try { const s = JSON.parse(localStorage.getItem("fmf-title2") || "null"); if (s) FIELDS.forEach((id, i) => { if (typeof s[i] === "string") $(id).value = s[i]; }); } catch (e) {}
  FIELDS.forEach((id) => { $(id).addEventListener("input", draw); $(id).addEventListener("change", draw); });
  document.querySelectorAll("[data-title]").forEach((b) => b.addEventListener("click", () => {
    const parts = b.dataset.title.split(";"); // per line: text|colour|type
    IDS.forEach((n, i) => { const [t, c, k] = (parts[i] || "|#ffffff|small").split("|"); $("tt" + n).value = t; $("tc" + n).value = c; $("tk" + n).value = k; });
    draw();
  }));
  $("tsave").addEventListener("click", () => {
    const name = IDS.map((n) => clean($("tt" + n).value)).join(" ").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "title";
    const done = (url) => { const a = document.createElement("a"); a.href = url; a.download = "title-" + name + ".png"; document.body.appendChild(a); a.click(); a.remove(); $("tinfo").textContent = "Downloaded " + a.download + "."; };
    const cv = $("tcanvas");
    if (cv.toBlob) cv.toBlob((bl) => { const u = URL.createObjectURL(bl); done(u); setTimeout(() => URL.revokeObjectURL(u), 2000); }, "image/png"); else done(cv.toDataURL("image/png"));
  });
  draw();
})();
