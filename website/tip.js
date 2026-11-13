// Fresh Moves Fix - a small card under the mouse that says where a link goes
// (page, section, other website or file download). Mouse only; nothing is shown on touch screens.
(function () {
  if (!window.matchMedia || !matchMedia("(hover: hover)").matches) return;
  var card = null, cur = null, timer = null;
  var ICONS = {
    page: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/>',
    down: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
    ext: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    here: '<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>'
  };
  function el() {
    if (card && document.body.contains(card)) return card;
    card = document.createElement("div"); card.className = "linktip"; card.hidden = true; card.setAttribute("aria-hidden", "true");
    document.body.appendChild(card);
    return card;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function short(s) { return s.length > 58 ? s.slice(0, 28) + "..." + s.slice(-27) : s; }
  function describe(a) {
    var u; try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    var file = decodeURIComponent(u.pathname.split("/").pop() || "");
    if (a.hasAttribute("download") || /\.(zip|png|jar|mcmeta)$/i.test(file))
      return { icon: "down", title: "Download", main: file, sub: u.host };
    if (u.host !== location.host)
      return { icon: "ext", title: "Opens another website", main: u.host.replace(/^www\./, ""), sub: short(decodeURIComponent(u.pathname + u.hash).replace(/^\/$/, "")) };
    if (u.pathname === location.pathname && u.hash)
      return { icon: "here", title: "On this page", main: decodeURIComponent(u.hash.slice(1)).replace(/-/g, " "), sub: "" };
    return { icon: "page", title: "Page on this website", main: decodeURIComponent(u.pathname === "/" ? "Home" : u.pathname.replace(/^\/|\/$/g, "").replace(/\//g, " / ").replace(/-/g, " ")) + (u.hash ? " # " + decodeURIComponent(u.hash.slice(1)).replace(/-/g, " ") : ""), sub: "" };
  }
  function place(x, y) {
    var c = el(), w = c.offsetWidth, h = c.offsetHeight, px = x + 14, py = y + 22;
    if (px + w > innerWidth - 8) px = Math.max(8, innerWidth - 8 - w);
    if (py + h > innerHeight - 8) py = Math.max(8, y - h - 12);
    c.style.left = px + "px"; c.style.top = py + "px";
  }
  function hide() { clearTimeout(timer); cur = null; if (card) card.hidden = true; }
  document.addEventListener("mouseover", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a === cur) return;
    hide();
    if (!a) return;
    var d = describe(a); if (!d) return;
    cur = a;
    var x = e.clientX, y = e.clientY;
    timer = setTimeout(function () {
      if (cur !== a || !document.body.contains(a)) return;
      var c = el();
      c.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[d.icon] + "</svg>" +
        "<span><small>" + esc(d.title) + "</small><b>" + esc(d.main) + "</b>" + (d.sub ? "<i>" + esc(d.sub) + "</i>" : "") + "</span>";
      c.hidden = false; place(x, y);
    }, 250);
    a.addEventListener("mousemove", function mv(ev) { x = ev.clientX; y = ev.clientY; if (cur !== a) { a.removeEventListener("mousemove", mv); return; } if (card && !card.hidden) place(x, y); });
  });
  ["mousedown", "scroll", "keydown", "fmf-nav"].forEach(function (t) { document.addEventListener(t, hide, true); });
  document.addEventListener("mouseleave", hide);
})();
