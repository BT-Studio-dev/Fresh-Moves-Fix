// Themed drop-down lists and colour picker for the Skin Painter, 3D Model and Animation pages
// (the same look as in the eye editor, instead of the browser's own grey lists and colour box).
(function () {
  const menus = [];
  const raise = () => document.querySelectorAll(".ed .panel").forEach((p) =>
    p.classList.toggle("dd-open", !!p.querySelector('.dd-btn[aria-expanded="true"], .uipick:not([hidden])')));
  // run code whenever a script sets element.value, so the themed control shows the same value
  function watchValue(el, fn) {
    try {
      const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
      Object.defineProperty(el, "value", { configurable: true, get() { return d.get.call(el); }, set(v) { d.set.call(el, v); fn(); } });
    } catch (e) {}
  }

  function enhance(sel) {
    if (sel.classList.contains("vh")) return;
    const wrap = document.createElement("span"); wrap.className = "dd";
    const btn = document.createElement("button"); btn.type = "button"; btn.className = "dd-btn"; btn.setAttribute("aria-haspopup", "listbox");
    const list = document.createElement("span"); list.className = "dd-list"; list.setAttribute("role", "listbox"); list.hidden = true;
    wrap.appendChild(btn); wrap.appendChild(list);
    sel.classList.add("vh"); sel.tabIndex = -1; sel.after(wrap);
    const m = {
      close() { list.hidden = true; btn.setAttribute("aria-expanded", "false"); raise(); },
      sync() {
        const opts = Array.from(sel.options), cur = opts.find((o) => o.value === sel.value) || opts[0];
        btn.textContent = cur ? cur.textContent : "";
        list.innerHTML = "";
        for (const o of opts) {
          const b = document.createElement("button");
          b.type = "button"; b.className = "dd-opt" + (o === cur ? " on" : ""); b.textContent = o.textContent;
          b.setAttribute("role", "option"); b.setAttribute("aria-selected", o === cur ? "true" : "false");
          b.addEventListener("click", (e) => {
            e.preventDefault(); m.close(); btn.focus();
            if (sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true })); }
            m.sync();
          });
          list.appendChild(b);
        }
      },
    };
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const open = list.hidden; closeAll(); m.sync(); list.hidden = !open; btn.setAttribute("aria-expanded", String(open)); raise();
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
    watchValue(sel, () => m.sync());
    menus.push(m); m.close(); m.sync();
  }

  // ---- colour picker ----
  const COLOURS = ["#ffffff", "#d9d9d9", "#9a9a9a", "#4d4d4d", "#000000", "#3e2b18", "#6b4226", "#a9744f", "#d4ae87", "#f2d3b3",
    "#c0392b", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c", "#3b82c4", "#1f4e9e", "#523d89", "#9b59b6", "#e84393"];
  const toHex = (c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
  const fromHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function hsv2rgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))); }; return [f(5), f(3), f(1)]; }
  function rgb2hsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx];
  }
  const pickers = [];
  function colour(inp) {
    if (inp.classList.contains("vh")) return;
    const el = (tag, cls, attrs) => { const e = document.createElement(tag); if (cls) e.className = cls; Object.assign(e, attrs || {}); return e; };
    const wrap = el("span", "dd"), sw = el("button", "sw", { type: "button" }), box = el("div", "picker uipick", { hidden: true });
    sw.setAttribute("aria-label", inp.getAttribute("aria-label") || "Choose colour");
    const head = el("div", "pk-head"), title = el("b", "", { textContent: "Colour" }), x = el("button", "", { type: "button", textContent: "\u00d7" });
    x.setAttribute("aria-label", "Close"); head.appendChild(title); head.appendChild(x);
    const sv = el("canvas", "pk-sv", { width: 220, height: 130 }), hue = el("input", "pk-hue", { type: "range", min: 0, max: 360, value: 0 });
    hue.setAttribute("aria-label", "Hue");
    const row = el("div", "pk-row"), now = el("span", "pk-now"), hexIn = el("input", "pk-hex", { type: "text", maxLength: 7, spellcheck: false });
    hexIn.setAttribute("aria-label", "Hex colour"); row.appendChild(now); row.appendChild(hexIn);
    const sws = el("div", "pk-sws");
    for (const c of COLOURS) { const b = el("button", "sw small", { type: "button", title: c }); b.style.background = c; b.addEventListener("click", () => apply(c)); sws.appendChild(b); }
    box.appendChild(head); box.appendChild(sv); box.appendChild(hue); box.appendChild(row); box.appendChild(sws);
    wrap.appendChild(sw); wrap.appendChild(box);
    inp.classList.add("vh"); inp.tabIndex = -1; inp.after(wrap);
    let H = 0, S = 0, V = 1;
    function draw() {
      const ctx = sv.getContext && sv.getContext("2d"); if (!ctx) return;
      const w = sv.width, h = sv.height;
      ctx.fillStyle = toHex(hsv2rgb(H, 1, 1)); ctx.fillRect(0, 0, w, h);
      let g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.beginPath(); ctx.arc(S * w, (1 - V) * h, 6, 0, 7);
      ctx.lineWidth = 2; ctx.strokeStyle = V > 0.5 ? "#000" : "#fff"; ctx.stroke();
    }
    function show(fromDrag) { // put the input's colour into the swatch and the open card
      const v = inp.value; sw.style.background = v;
      if (box.hidden) return;
      if (!fromDrag) { [H, S, V] = rgb2hsv(fromHex(v)); hue.value = Math.round(H); }
      now.style.background = v; if (document.activeElement !== hexIn) hexIn.value = v; draw();
    }
    let busy = false;
    function apply(v, fromDrag) {
      busy = true; inp.value = v; busy = false; show(fromDrag);
      inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const close = () => { box.hidden = true; raise(); };
    function point(e) {
      const r = sv.getBoundingClientRect();
      S = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); V = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      apply(toHex(hsv2rgb(H, S, V)), true);
    }
    sw.addEventListener("click", (e) => { e.preventDefault(); const open = box.hidden; closeAll(); box.hidden = !open; show(); raise(); });
    x.addEventListener("click", close);
    sv.addEventListener("pointerdown", (e) => { try { sv.setPointerCapture(e.pointerId); } catch (er) {} point(e); });
    sv.addEventListener("pointermove", (e) => { if (e.buttons) point(e); });
    hue.addEventListener("input", () => { H = Number(hue.value); apply(toHex(hsv2rgb(H, S, V)), true); });
    hexIn.addEventListener("change", () => {
      let t = hexIn.value.trim().toLowerCase(); if (t[0] !== "#") t = "#" + t;
      if (/^#[0-9a-f]{6}$/.test(t)) apply(t); else hexIn.value = inp.value;
    });
    wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); sw.focus(); } });
    watchValue(inp, () => { if (!busy) show(); });
    pickers.push({ close }); show();
  }

  function closeAll() { menus.forEach((m) => m.close()); pickers.forEach((p) => p.close()); }
  document.addEventListener("click", (e) => { if (!(e.target.closest && e.target.closest(".dd"))) closeAll(); });
  function start() {
    document.querySelectorAll(".ed select").forEach(enhance);
    document.querySelectorAll('.ed input[type="color"]').forEach(colour);
  }
  window.FMFUI = { enhance, colour, start };
  start();
})();
