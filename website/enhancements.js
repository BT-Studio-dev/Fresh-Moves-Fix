/* Fresh Moves Fix — small progressive-enhancement layer. No dependencies. */
(function () {
  "use strict";
  if (window.__fmfScrollHandler) window.removeEventListener("scroll", window.__fmfScrollHandler);
  if (window.__fmfResizeHandler) window.removeEventListener("resize", window.__fmfResizeHandler);
  if (window.__fmfKeyHandler) document.removeEventListener("keydown", window.__fmfKeyHandler);
  [".fmf-skip", ".fmf-progress", ".fmf-top", ".fmf-settings"].forEach(function (s) {
    var old = document.querySelector(s); if (old) old.remove();
  });

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var skip = document.createElement("a");
  skip.className = "fmf-skip";
  skip.href = "#main";
  skip.textContent = "Skip to content";
  body.insertBefore(skip, body.firstChild);

  var main = document.querySelector("main, .wrap");
  if (main && !document.getElementById("main")) main.id = "main";
  else if (!document.getElementById("main")) {
    var first = document.querySelector(".wrap");
    if (first) first.id = "main";
  }

  var progress = document.createElement("div");
  progress.className = "fmf-progress";
  progress.setAttribute("aria-hidden", "true");
  body.appendChild(progress);

  var top = document.createElement("button");
  top.type = "button";
  top.className = "fmf-top";
  top.setAttribute("aria-label", "Back to top");
  top.title = "Back to top";
  top.textContent = "↑";
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  body.appendChild(top);

  var panel = document.createElement("section");
  panel.className = "fmf-settings";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Quick appearance settings");
  panel.innerHTML =
    '<button class="fmf-close" type="button" aria-label="Close settings">×</button>' +
    '<h2>Quick settings</h2>' +
    '<label>Theme <select data-fmf-theme><option value="glass">Glass</option><option value="dark">Dark</option><option value="light">Light</option><option value="oled">OLED</option><option value="minecraft">Minecraft</option><option value="system">System</option></select></label>' +
    '<label><span>Glass card blur</span><input type="checkbox" data-fmf-glass-blur></label>' +
    '<label>Text size <select data-fmf-size><option value="normal">Normal</option><option value="large">Large</option></select></label>' +
    '<label><span>High contrast</span><input type="checkbox" data-fmf-contrast></label>' +
    '<label><span>Reduce motion</span><input type="checkbox" data-fmf-motion></label>' +
    '<p class="fmf-hint">Settings are saved on this device. Your existing site settings remain available.</p>';
  body.appendChild(panel);

  var themeSelect = panel.querySelector("[data-fmf-theme]");
  var glassBlur = panel.querySelector("[data-fmf-glass-blur]");
  var sizeSelect = panel.querySelector("[data-fmf-size]");
  var contrast = panel.querySelector("[data-fmf-contrast]");
  var motion = panel.querySelector("[data-fmf-motion]");
  function saved(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  themeSelect.value = ["glass","dark","light","oled","minecraft","system"].indexOf(saved("fmf-theme","glass")) >= 0 ? saved("fmf-theme","glass") : "glass";
  sizeSelect.value = saved("fmf-extra-size","normal");
  contrast.checked = saved("fmf-extra-contrast","0") === "1";
  motion.checked = saved("fmf-extra-motion", reduce ? "1" : "0") === "1";
  glassBlur.checked = saved("fmf-glass-blur", "1") === "1";
  function syncGlassBlur() {
    var isGlass = root.getAttribute("data-theme") === "glass";
    root.classList.toggle("fmf-glass-blur", isGlass && glassBlur.checked);
    glassBlur.disabled = !isGlass;
    glassBlur.parentElement.style.opacity = isGlass ? "1" : ".55";
  }
  syncGlassBlur();
  glassBlur.addEventListener("change", function () {
    store("fmf-glass-blur", glassBlur.checked ? "1" : "0");
    syncGlassBlur();
  });
  if (sizeSelect.value === "large") body.classList.add("fmf-reading");
  if (contrast.checked) body.classList.add("fmf-contrast");
  if (motion.checked) body.classList.add("fmf-motion-off");

  themeSelect.addEventListener("change", function () {
    store("fmf-theme", themeSelect.value);
    var t = themeSelect.value;
    if (t === "system") t = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    root.setAttribute("data-theme", t);
    syncGlassBlur();
    try { document.cookie = "fmf-theme=" + themeSelect.value + "; path=/; max-age=31536000; SameSite=Lax"; } catch (e) {}
  });
  sizeSelect.addEventListener("change", function () {
    store("fmf-extra-size", sizeSelect.value);
    body.classList.toggle("fmf-reading", sizeSelect.value === "large");
  });
  contrast.addEventListener("change", function () {
    store("fmf-extra-contrast", contrast.checked ? "1" : "0");
    body.classList.toggle("fmf-contrast", contrast.checked);
  });
  motion.addEventListener("change", function () {
    store("fmf-extra-motion", motion.checked ? "1" : "0");
    body.classList.toggle("fmf-motion-off", motion.checked);
  });

  panel.querySelector(".fmf-close").addEventListener("click", closePanel);
  function closePanel() { panel.hidden = true; }
  function openPanel() { panel.hidden = false; panel.querySelector(".fmf-close").focus(); }
  window.__fmfKeyHandler = function (e) { if (e.key === "Escape") closePanel(); };
  document.addEventListener("keydown", window.__fmfKeyHandler);

  var oldToggle = document.querySelector(".fmf-settings-toggle");
  if (oldToggle) oldToggle.remove();
  var nav = document.querySelector("header.top .bar");
  if (nav) {
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fmf-settings-toggle";
    toggle.textContent = "⚙";
    toggle.setAttribute("aria-label", "Quick settings");
    toggle.title = "Quick settings";
    toggle.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
    var get = nav.querySelector(".get");
    if (get) nav.insertBefore(toggle, get); else nav.appendChild(toggle);
  }

  var ticking = false;
  function updateScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
    progress.style.width = pct + "%";
    top.classList.toggle("visible", window.scrollY > 500);
    ticking = false;
  }
  window.__fmfScrollHandler = function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateScroll); }
  };
  window.__fmfResizeHandler = updateScroll;
  window.addEventListener("scroll", window.__fmfScrollHandler, { passive: true });
  window.addEventListener("resize", window.__fmfResizeHandler, { passive: true });
  updateScroll();
})();
