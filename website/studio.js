// Fresh Moves Fix - the "Minecraft 3D Model" and "Minecraft Animation" pages.
// Both show the player with your skin in a 3D viewer that needs no WebGL (see player.js).
(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $("s3d"), P = window.FMFPlayer;
  if (!cv || !P) return;
  const skin = document.createElement("canvas"); skin.width = skin.height = 64;
  const sctx = skin.getContext("2d", { willReadFrequently: true });
  let slim = false, loaded = false, paused = false;
  const viewer = new P.SoftViewer(cv);
  viewer.zoom = 0.9; viewer.pose = "idle";
  viewer.onZoom = (n) => { if ($("szoom")) $("szoom").value = n; };
  const say = (t, bad) => { const m = $("smsg"); if (m) { m.textContent = t; m.style.color = bad ? "#e5534b" : ""; } };
  const show = () => { if (loaded) viewer.loadSkin(skin, { model: slim ? "slim" : "default" }); };
  const download = (blob, name) => {
    const a = document.createElement("a"), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  };

  // ---------- the skin ----------
  function loadUrl(url, name, forceSlim) {
    const im = new Image();
    im.onload = () => {
      if (im.width !== 64 || (im.height !== 64 && im.height !== 32)) { say("This picture is " + im.width + " x " + im.height + ". A Minecraft skin must be 64 x 64 pixels.", true); return; }
      sctx.clearRect(0, 0, 64, 64); sctx.drawImage(im, 0, 0);
      if (im.height === 32) { sctx.drawImage(skin, 0, 16, 16, 16, 16, 48, 16, 16); sctx.drawImage(skin, 40, 16, 16, 16, 32, 48, 16, 16); } // old skin: copy right leg and arm to the left ones
      slim = forceSlim === undefined ? sctx.getImageData(54, 20, 1, 1).data[3] === 0 : forceSlim;
      $("sformat").value = slim ? "slim" : "wide";
      loaded = true; show(); say(name ? "Skin: " + name : "");
    };
    im.onerror = () => say("This file could not be read as a picture.", true);
    im.src = url;
  }
  const loadFile = (f) => { if (!f) return; const r = new FileReader(); r.onload = () => loadUrl(r.result, f.name); r.readAsDataURL(f); };
  $("sfile").addEventListener("change", (e) => { loadFile(e.target.files[0]); e.target.value = ""; });
  const drop = $("sdrop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); loadFile(e.dataTransfer.files[0]); });
  document.querySelectorAll("#sstart button[data-skin]").forEach((b) => b.addEventListener("click", () => loadUrl(b.dataset.skin, b.dataset.name, b.dataset.slim ? b.dataset.slim === "1" : undefined)));
  $("sformat").addEventListener("change", (e) => { slim = e.target.value === "slim"; show(); });
  // the skin from the Skin Painter 3D, when there is one in this browser
  let mine = null, mineSlim = false;
  try { mine = localStorage.getItem("fmf-paint"); mineSlim = localStorage.getItem("fmf-paint-slim") === "1"; } catch (e) {}
  if (mine && mine.indexOf("data:image/png") === 0 && $("smine")) { $("smine").hidden = false; $("smine").addEventListener("click", () => loadUrl(mine, "your painted skin", mineSlim)); }

  // ---------- the view ----------
  $("szoom").addEventListener("input", (e) => { viewer.zoom = Number(e.target.value); });
  $("sspin").addEventListener("change", (e) => { viewer.autoRotate = e.target.checked; });
  $("slayers").addEventListener("change", (e) => { viewer.layers3d = e.target.checked; });
  $("souter").addEventListener("change", (e) => { viewer.showOuter = e.target.checked; });
  function setPaused(p) { paused = p; viewer.paused = p; $("splay").textContent = p ? "Play" : "Pause"; $("splay").setAttribute("aria-pressed", p ? "true" : "false"); }
  $("splay").addEventListener("click", () => setPaused(!paused));
  const NAMES = {}; // move id -> name, from the list on the page
  const moveList = $("smove") || $("tlmove");
  for (const o of moveList.options) NAMES[o.value] = o.textContent;

  // ---------- 3D model page: one move, download as .gltf ----------
  if ($("smove")) {
    $("smove").addEventListener("change", (e) => { viewer.pose = e.target.value; });
    viewer.pose = $("smove").value;
    $("sgltf").addEventListener("click", () => {
      if (!loaded) return;
      const move = $("smove").value, text = P.buildGltf(skin.toDataURL("image/png"), slim, move);
      download(new Blob([text], { type: "model/gltf+json" }), "player-" + move + ".gltf");
      say("Downloaded player-" + move + ".gltf (look in your Downloads folder).");
    });
  }

  // ---------- animation page: a row of moves played one after the other ----------
  let timer = 0, rec = null;
  if ($("tl")) {
    let clips = [{ move: "wave", secs: 3 }, { move: "walk", secs: 3 }, { move: "dance", secs: 4 }, { move: "cheer", secs: 3 }];
    try { const s = JSON.parse(localStorage.getItem("fmf-anim") || "null"); if (Array.isArray(s) && s.length && s.every((c) => NAMES[c.move] && c.secs > 0)) clips = s.slice(0, 40); } catch (e) {}
    let pos = 0, last = Date.now(), now = -1;
    const total = () => clips.reduce((n, c) => n + c.secs, 0);
    const keep = () => { try { localStorage.setItem("fmf-anim", JSON.stringify(clips)); } catch (e) {} };
    const fmt = (n) => n.toFixed(1) + " s";
    function list() {
      const box = $("tl"); box.textContent = "";
      clips.forEach((c, i) => {
        const row = document.createElement("div"); row.className = "tlrow"; row.dataset.i = i;
        const b = (txt, act, title, off) => { const x = document.createElement("button"); x.type = "button"; x.textContent = txt; x.dataset.act = act; x.title = title; x.disabled = !!off; return x; };
        const name = document.createElement("b"); name.textContent = (i + 1) + ". " + NAMES[c.move];
        const secs = document.createElement("span"); secs.textContent = fmt(c.secs);
        row.append(name, secs, b("−", "less", "Shorter", c.secs <= 0.5), b("+", "more", "Longer", c.secs >= 30), b("↑", "up", "Earlier", i === 0), b("↓", "down", "Later", i === clips.length - 1), b("✕", "del", "Remove", clips.length === 1));
        box.appendChild(row);
      });
      $("tltotal").textContent = fmt(total()); now = -1;
    }
    $("tl").addEventListener("click", (e) => {
      const act = e.target && e.target.dataset && e.target.dataset.act; if (!act || rec) return;
      const i = Number(e.target.parentNode.dataset.i), c = clips[i];
      if (act === "less") c.secs = Math.max(0.5, c.secs - 0.5);
      if (act === "more") c.secs = Math.min(30, c.secs + 0.5);
      if (act === "up" && i > 0) { clips[i] = clips[i - 1]; clips[i - 1] = c; }
      if (act === "down" && i < clips.length - 1) { clips[i] = clips[i + 1]; clips[i + 1] = c; }
      if (act === "del" && clips.length > 1) clips.splice(i, 1);
      keep(); list();
    });
    $("tladd").addEventListener("click", () => { if (rec || clips.length >= 40) return; clips.push({ move: $("tlmove").value, secs: Math.max(0.5, Math.min(30, Number($("tlsecs").value) || 3)) }); keep(); list(); });
    $("tlstart").addEventListener("click", () => { pos = 0; setPaused(false); });
    function tick() {
      const t = Date.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;
      const all = total();
      if (!paused) pos += dt;
      if (rec && pos >= all) { stopRec(); pos = 0; }
      if (pos >= all) { if ($("tlloop").checked) pos %= all; else { pos = all - 0.001; if (!paused) setPaused(true); } }
      let i = 0, a = pos; while (i < clips.length - 1 && a >= clips[i].secs) { a -= clips[i].secs; i++; }
      viewer.pose = clips[i].move;
      if (i !== now) { now = i; document.querySelectorAll("#tl .tlrow").forEach((r, k) => r.classList.toggle("on", k === i)); }
      $("tlbar").style.width = (100 * pos / all).toFixed(1) + "%";
      $("tltime").textContent = fmt(pos) + " / " + fmt(all);
    }
    timer = setInterval(tick, 40);
    list();

    // background colour, picture and video
    const bg = () => { viewer.bg = $("sbgon").checked ? $("sbg").value : ""; };
    $("sbgon").addEventListener("change", bg); $("sbg").addEventListener("input", bg); bg();
    $("spng").addEventListener("click", () => { viewer.render(); cv.toBlob((b) => { if (b) { download(b, "minecraft-animation.png"); say("Saved the picture minecraft-animation.png."); } }, "image/png"); });
    function stopRec() { if (rec) { try { rec.stop(); } catch (e) {} } }
    $("svideo").addEventListener("click", () => {
      if (rec) { stopRec(); return; }
      if (!cv.captureStream || !window.MediaRecorder) { say("This browser cannot record a video here. Try Chrome, Edge or Firefox on a computer.", true); return; }
      let type = ""; for (const t of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]) if (MediaRecorder.isTypeSupported(t)) { type = t; break; }
      const hadBg = viewer.bg; if (!hadBg) viewer.bg = $("sbg").value; // a video needs a background
      const parts = [];
      try { rec = new MediaRecorder(cv.captureStream(30), type ? { mimeType: type, videoBitsPerSecond: 4000000 } : undefined); }
      catch (e) { rec = null; viewer.bg = hadBg; say("The video could not be started in this browser.", true); return; }
      rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = () => {
        const ext = type.indexOf("mp4") >= 0 ? "mp4" : "webm";
        rec = null; viewer.bg = hadBg; $("svideo").textContent = "Save video";
        if (parts.length) { download(new Blob(parts, { type: type || "video/webm" }), "minecraft-animation." + ext); say("Saved the video minecraft-animation." + ext + " (look in your Downloads folder)."); }
        else say("The video is empty. Please try again.", true);
      };
      pos = 0; setPaused(false); rec.start(); $("svideo").textContent = "Stop recording";
      say("Recording… the video is saved when the animation has played once.");
    });
  }

  window.fmfCleanup = () => { clearInterval(timer); try { if (rec) rec.stop(); } catch (e) {} try { viewer.dispose(); } catch (e) {} };

  const first = document.querySelector("#sstart button[data-skin]");
  if (first) loadUrl(first.dataset.skin, "", first.dataset.slim ? first.dataset.slim === "1" : undefined);
})();
