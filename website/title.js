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

  function render() {
    var text = $("tt-text").value, L = layout(text);
    var C = Number($("tt-size").value) * 4, P = C / 4, O = P, D = $("tt-depth").checked ? Math.round(C * 0.6) : 0;
    var cracks = $("tt-cracks").checked, accent = picked("tt-accent"), main = STYLES[picked("tt-style")] || STYLES.stone, second = STYLES[picked("tt-style2")] || STYLES.grass;
    var cv = $("tt-cv"), ctx = cv.getContext("2d");
    $("tt-sizeval").textContent = C + " px";
    if (!L.lines.length) { cv.width = 320; cv.height = 80; ctx.clearRect(0, 0, 320, 80); $("tt-save").disabled = true; $("tt-msg").textContent = "Type some text."; return; }
    var lineH = 7 * C + D, gap = 2 * C;
    var wCells = Math.max.apply(null, L.lines.map(function (l) { return l.width; }));
    var W = wCells * C + 2 * O, H = L.lines.length * lineH + (L.lines.length - 1) * gap + 2 * O;
    if (W > 8000) { $("tt-msg").textContent = "Too wide. Use a smaller block size or more lines."; $("tt-save").disabled = true; return; }
    cv.width = W; cv.height = H; ctx.clearRect(0, 0, W, H);
    var seed = 3; var rnd = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    L.lines.forEach(function (line, li) {
      var ox = O + Math.floor((wCells - line.width) / 2) * C, oy = O + li * (lineH + gap);
      var S = {}; line.cells.forEach(function (c) { S[c[0] + "," + c[1]] = 1; });
      var has = function (x, y) { return S[x + "," + y]; };
      var styleOf = function (c) { return (accent === "word" && c[2]) || (accent === "line" && c[3]) ? second : main; };
      line.cells.forEach(function (c) { ctx.fillStyle = styleOf(c)[2]; ctx.fillRect(ox + c[0] * C - O, oy + c[1] * C - O, C + 2 * O, C + D + 2 * O); });
      line.cells.forEach(function (c) {
        var st = styleOf(c), hi = rgb(st[0]), lo = rgb(st[1]), x0 = ox + c[0] * C, y0 = oy + c[1] * C;
        if (D) { ctx.fillStyle = css(mul(lo, 0.45)); ctx.fillRect(x0, y0 + C, C, D); }
        for (var py = 0; py < 4; py++) for (var px = 0; px < 4; px++) {
          var t = (c[1] * 4 + py) / 28, col = mul(mix(hi, lo, t), 1 + (rnd() - 0.5) * 0.14);
          if (cracks && rnd() < 0.012) col = mul(lo, 0.6);
          ctx.fillStyle = css(col); ctx.fillRect(x0 + px * P, y0 + py * P, P, P);
        }
        if (!has(c[0], c[1] - 1)) { ctx.fillStyle = css(mul(hi, 1.12)); ctx.fillRect(x0, y0, C, P); }
        if (!has(c[0] - 1, c[1])) { ctx.fillStyle = css(mul(hi, 1.05)); ctx.fillRect(x0, y0, P, C); }
        if (!has(c[0], c[1] + 1)) { ctx.fillStyle = css(mul(lo, 0.8)); ctx.fillRect(x0, y0 + C - P, C, P); }
        if (!has(c[0] + 1, c[1])) { ctx.fillStyle = css(mul(lo, 0.88)); ctx.fillRect(x0 + C - P, y0, P, C); }
      });
    });
    $("tt-save").disabled = false;
    $("tt-msg").textContent = W + " x " + H + " pixels." + (L.unknown.length ? " Left out (no such letter here): " + L.unknown.join(" ") : "");
    $("tt-second").style.display = accent === "none" ? "none" : "";
  }

  ["tt-text", "tt-size"].forEach(function (id) { $(id).addEventListener("input", render); });
  document.querySelectorAll("#tt-form input[type=radio], #tt-form input[type=checkbox]").forEach(function (el) { el.addEventListener("change", render); });
  $("tt-save").addEventListener("click", function () {
    $("tt-cv").toBlob(function (blob) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ($("tt-text").value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "title") + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  });
  render();
})();
