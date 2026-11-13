// Fresh Moves Fix - optional background music, generated in the browser with Web Audio.
// No audio files: a calm song of 3:34 (64 bars) is made from notes and then repeats. Off by default.
// Saved in localStorage: "fmf-music" ("on"/"off") and "fmf-volume" (0..100).
(function () {
  var on = false, vol = 40;
  try { on = localStorage.getItem("fmf-music") === "on"; var v = parseInt(localStorage.getItem("fmf-volume"), 10); if (v >= 0 && v <= 100) vol = v; } catch (e) {}
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, timer = null, step = 0, nextTime = 0;
  // ---- the song: 64 bars, exactly 3:34 long, then it repeats ----
  var LENGTH = 214, BARS_N = 64, BEAT = LENGTH / (BARS_N * 8); // seconds per eighth note (about 0.418)
  // chords as [root in semitones above A3, third]: Am F C G / Dm Am F G / Am Em F C
  var Am = [0, 3], F = [-4, 4], C = [3, 4], G = [-2, 4], Dm = [5, 3], Em = [-5, 3];
  var MAIN = [Am, F, C, G], LIFT = [Am, Em, F, C], BRIDGE = [Dm, Am, F, G];
  // sections: bars, chords, layers (p pad, b bass, a arpeggio, m melody, s sparkle), level
  var SECTIONS = [
    { bars: 8, chords: MAIN, layers: "pa", arp: 0, level: 0.7 },    // intro
    { bars: 16, chords: MAIN, layers: "pba", arp: 1, level: 0.9 },  // first part
    { bars: 16, chords: LIFT, layers: "pbam", arp: 1, level: 1 },   // tune comes in
    { bars: 8, chords: BRIDGE, layers: "pbs", arp: 0, level: 0.8 }, // quiet middle
    { bars: 8, chords: MAIN, layers: "pbams", arp: 2, level: 1 },   // full
    { bars: 8, chords: MAIN, layers: "pa", arp: 0, level: 0.6 }     // ending
  ];
  var ARPS = [
    [0, -1, 2, -1, 3, -1, 2, -1],  // sparse (−1 = rest)
    [0, 1, 2, 3, 4, 3, 2, 1],      // rolling
    [0, 2, 3, 4, 5, 4, 3, 2]       // higher
  ];
  var SCALE = [0, 2, 3, 5, 7, 8, 10]; // A natural minor
  // fixed "random" numbers, so the song is the same every time
  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  var SONG = []; // one entry per bar
  (function compose() {
    var deg = 9; // melody position on the scale (two octaves)
    SECTIONS.forEach(function (sec) {
      for (var i = 0; i < sec.bars; i++) {
        var ch = sec.chords[i % sec.chords.length], tones = [0, ch[1], 7, 12, 12 + ch[1], 19];
        var bar = { root: ch[0], tones: tones, sec: sec, last: i === sec.bars - 1, mel: [], spark: [] };
        if (sec.layers.indexOf("m") >= 0) {
          for (var k = 0; k < 8; k += 2) { // quarter notes, sometimes held
            if (k > 0 && rnd() < 0.3) continue;
            deg += Math.round(rnd() * 4 - 2); deg = Math.max(5, Math.min(13, deg));
            var semi = SCALE[deg % 7] + 12 * Math.floor(deg / 7);
            bar.mel.push({ at: k, semi: semi, len: rnd() < 0.35 ? 4 : 2 });
          }
        }
        if (sec.layers.indexOf("s") >= 0) bar.spark.push({ at: 2 + 2 * Math.floor(rnd() * 3), tone: Math.floor(rnd() * 3) });
        SONG.push(bar);
      }
    });
  })();
  function freq(semi) { return 220 * Math.pow(2, semi / 12); }
  function tone(f, t, len, peak, type, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + len + 0.05);
  }
  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.6) {
      var bar = SONG[Math.floor(step / 8) % SONG.length], i = step % 8, sec = bar.sec, L = sec.layers, lv = sec.level, t = nextTime;
      var has = function (c) { return L.indexOf(c) >= 0; };
      if (i === 0) {
        if (has("p")) [0, 1, 2].forEach(function (n) { tone(freq(bar.root + bar.tones[n]), t, BEAT * 8.5, 0.045 * lv, "sine", 0.6); });
        if (has("b")) tone(freq(bar.root - 12), t, BEAT * 7, 0.15 * lv, "sine");
      }
      if (i === 4 && has("b")) tone(freq(bar.root - 12 + 7), t, BEAT * 3.5, 0.08 * lv, "sine");
      if (has("a")) { var n = ARPS[sec.arp][i]; if (n >= 0) tone(freq(bar.root + bar.tones[n]), t, BEAT * 2.4, 0.1 * lv, "triangle"); }
      bar.mel.forEach(function (m) { if (m.at === i) tone(freq(m.semi + 12), t, BEAT * m.len * 1.3, 0.085 * lv, "sine", 0.02); });
      bar.spark.forEach(function (sp) { if (sp.at === i) tone(freq(bar.root + bar.tones[sp.tone] + 24), t, BEAT * 4, 0.03, "sine"); });
      nextTime += BEAT; step++;
    }
  }
  function position() { return (step * BEAT) % LENGTH; } // seconds into the song
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
      b.removeAttribute("title"); // the card under the button shows this instead
      b.setAttribute("aria-label", on ? "Music: on" : "Music: off");
    });
    document.querySelectorAll("[data-music-state]").forEach(function (e) { e.textContent = on ? "Music: on" : "Music: off"; });
    document.querySelectorAll("[data-music-check]").forEach(function (c) { c.checked = on; });
    document.querySelectorAll("[data-music-volume]").forEach(function (r) { r.value = vol; });
  }
  function clock(sec) { sec = Math.floor(sec); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
  setInterval(function () {
    var txt = clock(on && timer ? position() : 0) + " / " + clock(LENGTH);
    document.querySelectorAll("[data-music-time]").forEach(function (e) { if (e.textContent !== txt) e.textContent = txt; });
  }, 500);
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
    // the music waits while a video on the page is playing
    var held = false;
    function release() { if (held) { held = false; if (on && ctx) ctx.resume(); } }
    document.addEventListener("play", function (e) {
      if (e.target.tagName === "VIDEO" && on && ctx && ctx.state === "running") { held = true; ctx.suspend(); }
    }, true);
    document.addEventListener("pause", function (e) { if (e.target.tagName === "VIDEO") release(); }, true);
    document.addEventListener("ended", function (e) { if (e.target.tagName === "VIDEO") release(); }, true);
    document.addEventListener("fmf-nav", release);
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
