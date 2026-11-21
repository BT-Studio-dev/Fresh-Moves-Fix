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
  root.classList.remove("fmf-quick-open"); // also reset after in-site navigation
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
  top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 20V5M6 11l6-6 6 6"/></svg>';
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
  body.appendChild(top);

  var panel = document.createElement("section");
  panel.className = "fmf-settings";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Quick appearance settings");
  panel.innerHTML =
    '<button class="fmf-close" type="button" aria-label="Close settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<h2>Quick settings</h2>' +
    '<div class="fmf-setting-row fmf-option"><span><b>Theme</b><small>Choose your look</small></span><select aria-label="Theme" data-fmf-theme><option value="glass">Glass</option><option value="dark">Dark</option><option value="light">Light</option><option value="oled">OLED</option><option value="minecraft">Minecraft</option><option value="nightsky">Night Sky</option><option value="livesky">Live Sky</option><option value="system">System</option></select></div>' +
    '<label class="fmf-option fmf-switch"><span><b>Glass card blur</b><small>Available with Glass theme</small></span><input type="checkbox" data-fmf-glass-blur></label>' +
    '<div class="fmf-setting-row fmf-option"><span><b>Text size</b><small>Make text easier to read</small></span><select aria-label="Text size" data-fmf-size><option value="normal">Normal</option><option value="large">Large</option></select></div>' +
    '<label class="fmf-option fmf-switch"><span><b>High contrast</b><small>Stronger text and borders</small></span><input type="checkbox" data-fmf-contrast></label>' +
    '<label class="fmf-option fmf-switch"><span><b>Reduce motion</b><small>Minimize animations</small></span><input type="checkbox" data-fmf-motion></label>' +
    '<p class="fmf-hint">Settings are saved on this device. Your existing site settings remain available.</p>';
  body.appendChild(panel);

  var themeSelect = panel.querySelector("[data-fmf-theme]");
  var glassBlur = panel.querySelector("[data-fmf-glass-blur]");
  var sizeSelect = panel.querySelector("[data-fmf-size]");
  var contrast = panel.querySelector("[data-fmf-contrast]");
  var motion = panel.querySelector("[data-fmf-motion]");
  function saved(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  var savedTheme = saved("fmf-theme", "");
  if (!savedTheme) {
    try { var themeCookie = document.cookie.match(/(?:^|; )fmf-theme=([a-z]+)/); if (themeCookie) savedTheme = themeCookie[1]; } catch (e) {}
  }
  themeSelect.value = ["glass","dark","light","oled","minecraft","nightsky","livesky","system"].indexOf(savedTheme) >= 0 ? savedTheme : "dark";
  var savedSize = saved("fmf-extra-size","normal");
  sizeSelect.value = savedSize === "large" ? "large" : "normal";
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

  // Keep a working native select as the fallback, but use themed, keyboard-friendly
  // buttons where JavaScript is available instead of the OS's grey dropdown.
  function themedSelect(select) {
    var details = document.createElement("details"), summary = document.createElement("summary"), list = document.createElement("div");
    details.className = "fmf-choice"; summary.setAttribute("aria-label", select.getAttribute("aria-label"));
    list.className = "fmf-choice-list";
    Array.prototype.forEach.call(select.options, function (option) {
      var button = document.createElement("button"); button.type = "button"; button.textContent = option.textContent;
      button.addEventListener("click", function () {
        select.value = option.value; select.dispatchEvent(new Event("change", {bubbles:true}));
        sync(); details.open = false; summary.focus();
      });
      list.appendChild(button);
    });
    function sync() { summary.textContent = select.options[select.selectedIndex].textContent; }
    details.appendChild(summary); details.appendChild(list); select.parentNode.appendChild(details); select.hidden = true;
    select.addEventListener("change", sync);
    details.addEventListener("toggle", function () { if (details.open) panel.querySelectorAll(".fmf-choice").forEach(function (other) { if (other !== details) other.open = false; }); });
    details.addEventListener("keydown", function (e) { if (e.key === "Escape" && details.open) { e.stopPropagation(); details.open = false; summary.focus(); } });
    sync();
  }
  themedSelect(themeSelect); themedSelect(sizeSelect);
  // Keep the full Settings page and the quick panel in sync without reloading.
  if (window.__fmfSettingsSync) document.removeEventListener("change", window.__fmfSettingsSync);
  window.__fmfSettingsSync = function (event) {
    var target = event.target;
    if (target.matches('input[name="theme"]')) {
      themeSelect.value = target.value;
      themeSelect.dispatchEvent(new Event("change", { bubbles: false }));
    } else if (target.id === "settings-glass-blur") {
      glassBlur.checked = target.checked;
      syncGlassBlur();
    } else if (target === themeSelect) {
      document.querySelectorAll('input[name="theme"]').forEach(function (radio) {
        radio.checked = radio.value === themeSelect.value;
        radio.closest("label").classList.toggle("selected", radio.checked);
      });
      var blur = document.getElementById("settings-glass-blur");
      if (blur) blur.disabled = root.getAttribute("data-theme") !== "glass";
    } else if (target === glassBlur) {
      var fullBlur = document.getElementById("settings-glass-blur");
      if (fullBlur) fullBlur.checked = glassBlur.checked;
    }
  };
  document.addEventListener("change", window.__fmfSettingsSync);
  panel.id = "fmf-quick-settings";
  panel.querySelector(".fmf-close").addEventListener("click", closePanel);
  function closePanel() {
    panel.hidden = true; root.classList.remove("fmf-quick-open");
    panel.querySelectorAll(".fmf-choice").forEach(function (d) { d.open = false; });
    var button = document.querySelector(".fmf-settings-toggle"); if (button) button.setAttribute("aria-expanded", "false");
  }
  function openPanel() {
    panel.hidden = false; root.classList.add("fmf-quick-open");
    var button = document.querySelector(".fmf-settings-toggle"); if (button) button.setAttribute("aria-expanded", "true");
    panel.querySelector(".fmf-close").focus();
  }
  window.__fmfKeyHandler = function (e) { if (e.key === "Escape") closePanel(); };
  document.addEventListener("keydown", window.__fmfKeyHandler);

  var oldToggle = document.querySelector(".fmf-settings-toggle");
  if (oldToggle) oldToggle.remove();
  var nav = document.querySelector("header.top .bar");
  if (nav) {
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fmf-settings-toggle";
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/><circle cx="12" cy="12" r="7"/></svg>';
    toggle.setAttribute("aria-label", "Quick settings");
    toggle.setAttribute("aria-controls", "fmf-quick-settings");
    toggle.setAttribute("aria-expanded", "false");
    toggle.title = "Quick settings";
    toggle.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
    var get = nav.querySelector(".get");
    if (get) nav.insertBefore(toggle, get); else nav.appendChild(toggle);
  }

  // Opening the music controls closes settings; while settings is open its CSS
  // suppresses the hover popup so the two panels can never cover each other.
  var music = document.querySelector(".snd-wrap");
  if (music) {
    music.addEventListener("pointerenter", function () { if (!panel.hidden) closePanel(); });
    music.addEventListener("focusin", function () { if (!panel.hidden) closePanel(); });
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
