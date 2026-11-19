/* Fresh Moves Fix — quick settings, reading progress and accessibility helpers */
(function () {
  if (window.__fmfUpgradeInstalled) return;
  window.__fmfUpgradeInstalled = true;
  var root = document.documentElement;
  var themes = ["glass", "dark", "light", "oled", "minecraft"];
  var labels = { glass: "Glass", dark: "Dark", light: "Light", oled: "OLED", minecraft: "Minecraft" };
  function get(key, fallback) { try { var v = localStorage.getItem(key); return v === null ? fallback : v; } catch (_) { return fallback; } }
  function set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function apply() {
    root.setAttribute("data-fmf-text", get("fmf-text-size", "normal"));
    root.setAttribute("data-fmf-contrast", get("fmf-high-contrast", "off"));
    root.setAttribute("data-fmf-motion", get("fmf-reduced-motion", "off") === "on" ? "off" : "on");
  }
  function toast(message) {
    var el = document.querySelector(".fmf-toast");
    if (!el) return;
    el.textContent = message; el.setAttribute("data-show", "true");
    window.clearTimeout(el._hideTimer);
    el._hideTimer = window.setTimeout(function () { el.setAttribute("data-show", "false"); }, 1900);
  }
  function build() {
    if (document.querySelector(".fmf-tools")) return;
    var main = document.querySelector("body > .wrap, body > main, body > article");
    if (main && !main.id) { main.id = "fmf-main-content"; main.setAttribute("tabindex", "-1"); }
    var skip = document.createElement("a");
    skip.className = "fmf-skip"; skip.href = "#" + (main ? main.id : "top"); skip.textContent = "Skip to content";
    var progress = document.createElement("div"); progress.id = "fmf-progress"; progress.setAttribute("aria-hidden", "true");
    var tools = document.createElement("div"); tools.className = "fmf-tools";
    tools.innerHTML =
      '<button class="fmf-top" type="button" aria-label="Back to top" title="Back to top">↑</button>' +
      '<section class="fmf-panel" id="fmf-quick-panel" aria-label="Quick settings" data-open="false">' +
      '<h2>Quick settings</h2><p>Changes are saved on this device.</p>' +
      '<div class="fmf-group" aria-label="Color theme">' +
      '<button type="button" data-theme-choice="glass">Glass</button><button type="button" data-theme-choice="dark">Dark</button><button type="button" data-theme-choice="light">Light</button>' +
      '<button type="button" data-theme-choice="oled">OLED</button><button type="button" data-theme-choice="minecraft">Minecraft</button></div>' +
      '<label class="fmf-row">Larger text <input type="checkbox" data-pref="text"></label>' +
      '<label class="fmf-row">High contrast <input type="checkbox" data-pref="contrast"></label>' +
      '<label class="fmf-row">Reduce motion <input type="checkbox" data-pref="motion"></label>' +
      '<div class="fmf-actions"><button class="fmf-action" type="button" data-copy-link>Copy page link</button><button class="fmf-action" type="button" data-close-panel>Close</button></div>' +
      '</section><button class="fmf-fab" type="button" aria-label="Open quick settings" aria-expanded="false" aria-controls="fmf-quick-panel" title="Quick settings">Aa</button>';
    var notice = document.createElement("div"); notice.className = "fmf-toast"; notice.setAttribute("role", "status"); notice.setAttribute("aria-live", "polite");
    document.body.appendChild(skip); document.body.appendChild(progress); document.body.appendChild(tools); document.body.appendChild(notice);
    var panel = tools.querySelector(".fmf-panel"), fab = tools.querySelector(".fmf-fab"), top = tools.querySelector(".fmf-top");
    function sync() {
      var theme = root.getAttribute("data-theme") || "glass";
      tools.querySelectorAll("[data-theme-choice]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themeChoice === theme)); });
      tools.querySelector('[data-pref="text"]').checked = get("fmf-text-size", "normal") === "large";
      tools.querySelector('[data-pref="contrast"]').checked = get("fmf-high-contrast", "off") === "on";
      tools.querySelector('[data-pref="motion"]').checked = get("fmf-reduced-motion", "off") === "on";
    }
    function open(value) { panel.setAttribute("data-open", String(value)); fab.setAttribute("aria-expanded", String(value)); fab.setAttribute("aria-label", value ? "Close quick settings" : "Open quick settings"); if (value) sync(); }
    fab.addEventListener("click", function () { open(panel.getAttribute("data-open") !== "true"); });
    tools.querySelector("[data-close-panel]").addEventListener("click", function () { open(false); fab.focus(); });
    tools.querySelectorAll("[data-theme-choice]").forEach(function (b) {
      b.addEventListener("click", function () {
        var theme = b.dataset.themeChoice;
        root.setAttribute("data-theme", theme); set("fmf-theme", theme);
        try { document.cookie = "fmf-theme=" + theme + "; path=/; max-age=31536000; samesite=lax"; } catch (_) {}
        sync(); toast(labels[theme] + " theme selected");
      });
    });
    tools.querySelector('[data-pref="text"]').addEventListener("change", function (e) { set("fmf-text-size", e.target.checked ? "large" : "normal"); apply(); });
    tools.querySelector('[data-pref="contrast"]').addEventListener("change", function (e) { set("fmf-high-contrast", e.target.checked ? "on" : "off"); apply(); });
    tools.querySelector('[data-pref="motion"]').addEventListener("change", function (e) { set("fmf-reduced-motion", e.target.checked ? "on" : "off"); apply(); });
    tools.querySelector("[data-copy-link]").addEventListener("click", function () {
      var text = location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast("Page link copied"); }).catch(function () { toast("Copy is unavailable in this browser"); });
      else { var field = document.createElement("textarea"); field.value = text; field.style.position = "fixed"; field.style.opacity = "0"; document.body.appendChild(field); field.select(); try { document.execCommand("copy"); toast("Page link copied"); } catch (_) { toast("Copy is unavailable in this browser"); } field.remove(); }
    });
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: root.getAttribute("data-fmf-motion") === "off" ? "auto" : "smooth" }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.getAttribute("data-open") === "true") { open(false); fab.focus(); }
      if (e.altKey && e.key.toLowerCase() === "t" && !/input|textarea|select/i.test((e.target || {}).tagName || "")) { e.preventDefault(); open(panel.getAttribute("data-open") !== "true"); }
    });
    function scroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0;
      progress.style.width = pct + "%"; top.setAttribute("data-visible", String(window.scrollY > 420));
    }
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll); scroll(); apply(); sync();
    document.addEventListener("fmf-nav", function () { scroll(); sync(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true }); else build();
})();