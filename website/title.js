// Fresh Moves Fix - Minecraft-style title maker. Draws blocky stone-like letters on a canvas
// and lets you download the picture. Everything happens in the browser.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  if (!$("tt-cv")) return;
  // 7 rows per letter; "#" = block
  var FONT = {
    A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
    H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    J: ["..###", "....#", "....#", "....#", "....#", "#...#", ".###."],
    K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
    O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": [".#.", "##.", ".#.", ".#.", ".#.", ".#.", "###"],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "5": ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    "!": ["#", "#", "#", "#", "#", ".", "#"],
    "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
    ".": [".", ".", ".", ".", ".", ".", "#"],
    ",": ["..", "..", "..", "..", "..", ".#", "#."],
    ":": [".", ".", "#", ".", ".", "#", "."],
    "-": ["....", "....", "....", "####", "....", "....", "...."],
    "+": [".....", ".....", "..#..", ".###.", "..#..", ".....", "....."],
    "'": ["#", "#", ".", ".", ".", ".", "."]
  };
  // [light, dark, outline]
  var STYLES = {
    stone: ["#d6d6d6", "#969698", "#181412"],
    grass: ["#78e896", "#28a058", "#181412"],
    gold: ["#ffe27a", "#d99a1e", "#2a1a08"],
    diamond: ["#9ff3ee", "#2aa7b8", "#0c2228"],
    redstone: ["#ff8a7a", "#b3261e", "#260a08"],
    netherite: ["#5d565a", "#2e292c", "#e8e2dc"]
  };
  var rgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };
  var css = function (c) { return "rgb(" + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(",") + ")"; };
  var mul = function (c, f) { return c.map(function (v) { return v * f; }); };
  var mix = function (a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); };
  var picked = function (name) { var r = document.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; };

  function layout(text) {
    var lines = text.toUpperCase().split("\n").map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean).slice(0, 4);
    var unknown = {};
    var out = lines.map(function (line, li) {
      var cells = [], x = 0, words = line.split(" ");
      words.forEach(function (word, wi) {
        if (wi) x += 3;
        word.split("").forEach(function (ch) {
          var g = FONT[ch];
          if (!g) { unknown[ch] = 1; return; }
          g.forEach(function (row, cy) { row.split("").forEach(function (c, cx) { if (c === "#") cells.push([x + cx, cy, wi === words.length - 1 && words.length > 1, li === lines.length - 1 && lines.length > 1]); }); });
          x += g[0].length + 1;
        });
      });
      return { cells: cells, width: Math.max(0, x - 1) };
    }).filter(function (l) { return l.cells.length; });
    return { lines: out, unknown: Object.keys(unknown) };
  }

  var yaw = 0, pitch = 0.35, lastBox = null;

  // paints the flat title (front faces, optional outline O and edge D) and returns the cells with their colours
  function paint(ctx, L, C, O, D, o, wCells) {
    var P = C / 4, lineH = 7 * C + D, gap = 2 * C, all = [];
    var seed = 3; var rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    L.lines.forEach(function (line, li) {
      var ox = O + Math.floor((wCells - line.width) / 2) * C, oy = O + li * (lineH + gap);
      var S = {}; line.cells.forEach(function (c) { S[c[0] + "," + c[1]] = 1; });
      var has = function (x, y) { return S[x + "," + y]; };
      var styleOf = function (c) { return (o.accent === "word" && c[2]) || (o.accent === "line" && c[3]) ? o.second : o.main; };
      if (O) line.cells.forEach(function (c) { ctx.fillStyle = styleOf(c)[2]; ctx.fillRect(ox + c[0] * C - O, oy + c[1] * C - O, C + 2 * O, C + D + 2 * O); });
      line.cells.forEach(function (c) {
        var st = styleOf(c), hi = rgb(st[0]), lo = rgb(st[1]), x0 = ox + c[0] * C, y0 = oy + c[1] * C;
        if (D) { ctx.fillStyle = css(mul(lo, 0.45)); ctx.fillRect(x0, y0 + C, C, D); }
        for (var py = 0; py < 4; py++) for (var px = 0; px < 4; px++) {
          var t = (c[1] * 4 + py) / 28, col = mul(mix(hi, lo, t), 1 + (rnd() - 0.5) * 0.14);
          if (o.cracks && rnd() < 0.012) col = mul(lo, 0.6);
          ctx.fillStyle = css(col); ctx.fillRect(x0 + px * P, y0 + py * P, P, P);
        }
        var n = [has(c[0], c[1] - 1), has(c[0] - 1, c[1]), has(c[0], c[1] + 1), has(c[0] + 1, c[1])];
        if (!n[0]) { ctx.fillStyle = css(mul(hi, 1.12)); ctx.fillRect(x0, y0, C, P); }
        if (!n[1]) { ctx.fillStyle = css(mul(hi, 1.05)); ctx.fillRect(x0, y0, P, C); }
        if (!n[2]) { ctx.fillStyle = css(mul(lo, 0.8)); ctx.fillRect(x0, y0 + C - P, C, P); }
        if (!n[3]) { ctx.fillStyle = css(mul(lo, 0.88)); ctx.fillRect(x0 + C - P, y0, P, C); }
        all.push({ x: x0, y: y0, n: n, hi: hi, lo: lo });
      });
    });
    return all;
  }

  function render() {
    var text = $("tt-text").value, L = layout(text);
    var C = Number($("tt-size").value) * 4, three = picked("tt-view") === "3d";
    var o = { cracks: $("tt-cracks").checked, accent: picked("tt-accent"), main: STYLES[picked("tt-style")] || STYLES.stone, second: STYLES[picked("tt-style2")] || STYLES.grass };
    var cv = $("tt-cv"), ctx = cv.getContext("2d");
    $("tt-sizeval").textContent = C + " px";
    $("tt-second").style.display = o.accent === "none" ? "none" : "";
    $("tt-flatopts").style.display = three ? "none" : "";
    $("tt-3dopts").style.display = three ? "" : "none";
    cv.style.cursor = three ? "grab" : "";
    cv.style.touchAction = three ? "none" : "";
    lastBox = null;
    if (!L.lines.length) { cv.width = 320; cv.height = 80; ctx.clearRect(0, 0, 320, 80); $("tt-save").disabled = true; $("tt-msg").textContent = "Type some text."; return; }
    var wCells = Math.max.apply(null, L.lines.map(function (l) { return l.width; }));
    var note = L.unknown.length ? " Left out (no such letter here): " + L.unknown.join(" ") : "";
    if (wCells * C > 8000) { $("tt-msg").textContent = "Too wide. Use a smaller block size or more lines."; $("tt-save").disabled = true; return; }
    $("tt-save").disabled = false;

    if (!three) {
      var O = C / 4, D = $("tt-depth").checked ? Math.round(C * 0.6) : 0;
      var W = wCells * C + 2 * O, H = L.lines.length * (7 * C + D) + (L.lines.length - 1) * 2 * C + 2 * O;
      cv.width = W; cv.height = H; ctx.clearRect(0, 0, W, H);
      paint(ctx, L, C, O, D, o, wCells);
      $("tt-msg").textContent = W + " x " + H + " pixels." + note;
      return;
    }

    // ---- 3D: the letters are blocks with thickness T, seen from the angle (yaw, pitch) ----
    var T = Number($("tt-thick").value) * C / 2;
    $("tt-thickval").textContent = (T / C) + (T === C ? " block" : " blocks");
    var W0 = wCells * C, H0 = L.lines.length * 7 * C + (L.lines.length - 1) * 2 * C;
    var front = document.createElement("canvas"); front.width = W0; front.height = H0;
    var cells = paint(front.getContext("2d"), L, C, 0, 0, o, wCells);
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var pad = 8, W3 = Math.ceil(W0 + T + 2 * pad), H3 = Math.ceil(H0 + T + W0 * Math.abs(sy * sp) + 2 * pad);
    var proj = function (x, y, z) { // model point (origin = middle of the title) -> [screen x, screen y, nearness]
      x -= W0 / 2; y -= H0 / 2;
      var z1 = -x * sy + z * cy;
      return [W3 / 2 + x * cy + z * sy, H3 / 2 + y * cp - z1 * sp, y * sp + z1 * cp];
    };
    cv.width = W3; cv.height = H3; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W3, H3);
    var h = T / 2, quads = [];
    // which side faces look at the viewer: top, left, bottom, right
    var vis = [-sp > 0.001, sy * cp < -0.001, sp > 0.001, sy * cp > 0.001];
    cells.forEach(function (c) {
      var x0 = c.x, y0 = c.y, x1 = c.x + C, y1 = c.y + C;
      var faces = [
        [[x0, y0], [x1, y0], mul(c.hi, 1.08)],
        [[x0, y0], [x0, y1], mul(c.lo, 0.72)],
        [[x0, y1], [x1, y1], mul(c.lo, 0.45)],
        [[x1, y0], [x1, y1], mul(c.lo, 0.6)]
      ];
      faces.forEach(function (f, k) {
        if (c.n[k] || !vis[k]) return;
        var a = proj(f[0][0], f[0][1], h), b = proj(f[1][0], f[1][1], h), d = proj(f[1][0], f[1][1], -h), e = proj(f[0][0], f[0][1], -h);
        quads.push([(a[2] + b[2] + d[2] + e[2]) / 4, [a, b, d, e], css(f[2])]);
      });
    });
    quads.sort(function (a, b) { return a[0] - b[0]; });
    ctx.lineWidth = 1; ctx.lineJoin = "round";
    quads.forEach(function (q) {
      ctx.fillStyle = ctx.strokeStyle = q[2];
      ctx.beginPath(); ctx.moveTo(q[1][0][0], q[1][0][1]);
      for (var k = 1; k < 4; k++) ctx.lineTo(q[1][k][0], q[1][k][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    // the front is one flat picture, so it can be placed with a plain canvas transform
    var p0 = proj(0, 0, h);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(cy, sy * sp, 0, cp, p0[0], p0[1]);
    ctx.drawImage(front, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // smallest box around the drawing, used for the download
    var xs = [], ys = [];
    [0, W0].forEach(function (x) { [0, H0].forEach(function (y) { [h, -h].forEach(function (z) { var q = proj(x, y, z); xs.push(q[0]); ys.push(q[1]); }); }); });
    var bx = Math.max(0, Math.floor(Math.min.apply(null, xs)) - 2), by = Math.max(0, Math.floor(Math.min.apply(null, ys)) - 2);
    lastBox = [bx, by, Math.min(W3, Math.ceil(Math.max.apply(null, xs)) + 2) - bx, Math.min(H3, Math.ceil(Math.max.apply(null, ys)) + 2) - by];
    $("tt-msg").textContent = lastBox[2] + " x " + lastBox[3] + " pixels. Drag the picture to turn it." + note;
  }

  // drag to turn (3D view only)
  (function () {
    var cv = $("tt-cv"), from = null;
    cv.addEventListener("pointerdown", function (e) {
      if (picked("tt-view") !== "3d") return;
      from = [e.clientX, e.clientY, yaw, pitch]; cv.style.cursor = "grabbing";
      if (cv.setPointerCapture) cv.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    cv.addEventListener("pointermove", function (e) {
      if (!from) return;
      yaw = Math.max(-1.1, Math.min(1.1, from[2] - (e.clientX - from[0]) * 0.008));
      pitch = Math.max(-0.9, Math.min(0.9, from[3] + (e.clientY - from[1]) * 0.008));
      render();
    });
    var stop = function () { if (from) { from = null; cv.style.cursor = "grab"; } };
    cv.addEventListener("pointerup", stop); cv.addEventListener("pointercancel", stop);
  })();
  document.querySelectorAll("[data-tt-angle]").forEach(function (b) {
    b.addEventListener("click", function () { var a = b.getAttribute("data-tt-angle").split(","); yaw = Number(a[0]); pitch = Number(a[1]); render(); });
  });

  ["tt-text", "tt-size", "tt-thick"].forEach(function (id) { $(id).addEventListener("input", render); });
  document.querySelectorAll("#tt-form input[type=radio], #tt-form input[type=checkbox]").forEach(function (el) { el.addEventListener("change", render); });
  $("tt-save").addEventListener("click", function () {
    var src = $("tt-cv");
    if (lastBox) { // 3D view: cut off the empty border
      var cut = document.createElement("canvas"); cut.width = lastBox[2]; cut.height = lastBox[3];
      cut.getContext("2d").drawImage(src, -lastBox[0], -lastBox[1]); src = cut;
    }
    src.toBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ($("tt-text").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "title") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  });
  render();
})();
