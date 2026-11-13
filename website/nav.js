// Fresh Moves Fix - page changes without a full reload, so the background music keeps playing.
// Internal links are fetched and the page body is swapped in place. On any problem the browser
// simply opens the link the normal way.
(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  var KEEP = /(^|\/)(nav|music|i18n|tip)\.js(\?|$)/; // already running; must not be loaded twice
  var busy = false;

  function runScripts(list, i) {
    if (i >= list.length) return;
    var old = list[i], s = document.createElement("script");
    if (old.src) {
      if (KEEP.test(old.src) || (/skinview3d/.test(old.src) && window.skinview3d)) return runScripts(list, i + 1);
      s.src = old.src; s.onload = s.onerror = function () { runScripts(list, i + 1); };
      document.body.appendChild(s);
    } else {
      s.textContent = old.textContent; document.body.appendChild(s); runScripts(list, i + 1);
    }
  }

  function load(url, push) {
    if (busy) return;
    busy = true;
    fetch(url, { credentials: "same-origin" }).then(function (r) {
      var type = r.headers.get("content-type") || "";
      if (!r.ok || type.indexOf("text/html") < 0) throw new Error("not a page");
      return r.text().then(function (html) { return { html: html, final: r.url || url }; });
    }).then(function (res) {
      var doc = new DOMParser().parseFromString(res.html, "text/html");
      if (!doc.body || !doc.querySelector("header.top")) throw new Error("unexpected page");
      if (typeof window.fmfCleanup === "function") { try { window.fmfCleanup(); } catch (e) {} window.fmfCleanup = null; }
      var target = new URL(url, location.href);
      if (push) history.pushState({ fmf: 1 }, "", target.href); // before inserting, so relative links resolve
      document.title = doc.title;
      var scripts = [];
      doc.body.querySelectorAll("script").forEach(function (s) {
        // resolve the script address against the new page
        scripts.push({ src: s.getAttribute("src") ? new URL(s.getAttribute("src"), target.href).href : "", textContent: s.textContent });
        s.remove();
      });
      document.body.innerHTML = doc.body.innerHTML;
      runScripts(scripts, 0);
      var el = target.hash && document.getElementById(decodeURIComponent(target.hash.slice(1)));
      if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
      busy = false;
      document.dispatchEvent(new Event("fmf-nav"));
    }).catch(function () { busy = false; location.href = url; });
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download")) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    if (/\.[a-z0-9]{2,5}$/i.test(u.pathname) && !/\.html?$/i.test(u.pathname)) return; // files (images, zips)
    if (u.pathname === location.pathname && u.search === location.search) {
      if (u.hash) return; // same page, jump to a section: let the browser do it
      e.preventDefault(); window.scrollTo(0, 0); return;
    }
    e.preventDefault();
    load(u.href, true);
  });
  window.addEventListener("popstate", function () { load(location.href, false); });
})();
