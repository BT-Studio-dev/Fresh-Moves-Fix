// Fresh Moves Fix - optional background music, generated in the browser with Web Audio.
// No audio files: a slow, calm tune is made from a few notes. Off by default.
// Saved in localStorage: "fmf-music" ("on"/"off") and "fmf-volume" (0..100).
(function () {
  var on = false, vol = 40;
  try { on = localStorage.getItem("fmf-music") === "on"; var v = parseInt(localStorage.getItem("fmf-volume"), 10); if (v >= 0 && v <= 100) vol = v; } catch (e) {}
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, timer = null, step = 0, nextTime = 0;
  // four bars: chord root + scale notes (semitones above A3 = 220 Hz), a gentle minor-pentatonic loop
  var BARS = [
    { bass: -12, notes: [0, 3, 7, 10, 12, 10, 7, 3] },
    { bass: -16, notes: [-4, 0, 3, 8, 12, 8, 3, 0] },
    { bass: -9, notes: [3, 7, 10, 15, 19, 15, 10, 7] },
    { bass: -14, notes: [-2, 2, 5, 10, 14, 10, 5, 2] }
  ];
  var BEAT = 0.42; // seconds per note
  function freq(semi) { return 220 * Math.pow(2, semi / 12); }
  function tone(f, t, len, peak, type) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + len + 0.05);
  }
  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.6) {
      var bar = BARS[Math.floor(step / 8) % BARS.length], i = step % 8;
      if (i === 0) { tone(freq(bar.bass), nextTime, BEAT * 8, 0.16, "sine"); tone(freq(bar.bass + 7), nextTime, BEAT * 8, 0.07, "sine"); }
      tone(freq(bar.notes[i]), nextTime, BEAT * 2.4, 0.11, "triangle");
      if (i === 4) tone(freq(bar.notes[0] + 24), nextTime, BEAT * 3, 0.035, "sine");
      nextTime += BEAT; step++;
    }
  }
  function setGain() { if (master) master.gain.setTargetAtTime(on ? (vol / 100) * 0.5 : 0, ctx.currentTime, 0.15); }
  function start() {
    if (!AC) return false;
    try {
      if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); }
      if (ctx.state === "suspended") ctx.resume();
      if (!timer) { nextTime = ctx.currentTime + 0.1; timer = setInterval(schedule, 200); schedule(); }
      setGain();
      return true;
    } catch (e) { return false; }
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    setGain();
    if (ctx && ctx.state === "running") setTimeout(function () { if (!on && ctx) ctx.suspend(); }, 600);
  }
  function paint() {
    document.querySelectorAll("[data-music-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(on)); b.classList.toggle("on", on);
      b.title = on ? "Music: on" : "Music: off";
    });
    document.querySelectorAll("[data-music-check]").forEach(function (c) { c.checked = on; });
    document.querySelectorAll("[data-music-volume]").forEach(function (r) { r.value = vol; });
  }
  function set(next) {
    on = next; try { localStorage.setItem("fmf-music", on ? "on" : "off"); } catch (e) {}
    if (on) start(); else stop();
    paint();
  }
  function init() {
    // one set of listeners on the document, so they keep working when the page content is swapped
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-music-toggle]");
      if (b) set(!on);
    });
    document.addEventListener("change", function (e) {
      if (e.target.matches && e.target.matches("[data-music-check]")) set(e.target.checked);
    });
    document.addEventListener("input", function (e) {
      if (!(e.target.matches && e.target.matches("[data-music-volume]"))) return;
      vol = Number(e.target.value); try { localStorage.setItem("fmf-volume", String(vol)); } catch (err) {} setGain();
    });
    document.addEventListener("fmf-nav", paint);
    if (!AC) document.querySelectorAll("[data-music-toggle]").forEach(function (b) { b.hidden = true; });
    paint();
    // browsers only allow sound after a click or key press, so after a full page load the music resumes on the first one
    if (on) {
      var kick = function () { if (on) start(); document.removeEventListener("pointerdown", kick); document.removeEventListener("keydown", kick); };
      document.addEventListener("pointerdown", kick); document.addEventListener("keydown", kick);
      start();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
