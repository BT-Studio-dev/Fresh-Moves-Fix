// Fresh Moves Fix - optional background music, generated in the browser with Web Audio.
// No audio files: a calm song of 3:34 (64 bars) is made from notes and then repeats. Off by default.
// A second, dark song ("Herobrine") can be chosen in Settings; it has the same length.
// A third song ("Minecraft", soft piano) is 6:00 long (96 bars).
// Saved in localStorage: "fmf-music" ("on"/"off"), "fmf-volume" (0..100) and "fmf-song" ("calm"/"herobrine").
(function () {
  var on = false, vol = 40, song = "calm";
  var INFO = { calm: { name: "Calm", len: 214, bars: 64 }, herobrine: { name: "Herobrine", len: 214, bars: 64 }, minecraft: { name: "Minecraft", len: 360, bars: 96 } };
  try { var saved = localStorage.getItem("fmf-song"); if (INFO[saved]) song = saved; } catch (e) {}
  try { on = localStorage.getItem("fmf-music") === "on"; var v = parseInt(localStorage.getItem("fmf-volume"), 10); if (v >= 0 && v <= 100) vol = v; } catch (e) {}
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, timer = null, step = 0, nextTime = 0;
  // ---- the song: 64 bars, exactly 3:34 long, then it repeats ----
  // the "Minecraft" song is 96 bars and exactly 6:00 long (a slower beat)
  var LENGTH = INFO[song].len, BEAT = LENGTH / (INFO[song].bars * 8); // seconds per eighth note (about 0.418; 0.469 for the long song)
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
    [0, 2, 3, 4, 5, 4, 3, 2],      // higher
    [0, -1, -1, 2, -1, 4, -1, -1], // piano, very sparse
    [0, -1, 2, -1, 4, 3, -1, 2]    // piano, walking
  ];
  var SCALE = [0, 2, 3, 5, 7, 8, 10]; // A natural minor
  // fixed "random" numbers, so the song is the same every time
  var seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  // ---- the "Herobrine" song: slow, dark, lots of empty space. Same 64 bars. ----
  // chords as [root, third, fifth]: a tritone (6) instead of the fifth makes them uneasy
  var hA = [0, 3, 7], hBb = [1, 4, 7], hDim = [0, 3, 6], hE = [-5, 4, 7], hF = [-4, 3, 6], hD = [5, 3, 6];
  var H_WATCH = [hA, hA, hBb, hA], H_NEAR = [hA, hDim, hBb, hE], H_GONE = [hF, hD, hBb, hE];
  // extra layers: d drone, h heartbeat, w far high wail
  var H_SECTIONS = [
    { bars: 8, chords: H_WATCH, layers: "d", arp: 0, level: 0.8, dark: true },       // empty cave
    { bars: 16, chords: H_WATCH, layers: "dpa", arp: 0, level: 0.9, dark: true },    // something is there
    { bars: 16, chords: H_NEAR, layers: "dpmhw", arp: 0, level: 1, dark: true },     // it comes closer
    { bars: 8, chords: H_GONE, layers: "dw", arp: 0, level: 0.8, dark: true },       // silence
    { bars: 8, chords: H_NEAR, layers: "dpamhw", arp: 0, level: 1, dark: true },     // right behind you
    { bars: 8, chords: H_WATCH, layers: "dh", arp: 0, level: 0.7, dark: true }       // gone
  ];
  var H_SCALE = [0, 1, 3, 5, 6, 8, 10]; // A locrian: flat second and flat fifth
  function compose(sections, scale, startSeed) {
    seed = startSeed;
    var out = [], deg = 9; // melody position on the scale (two octaves)
    sections.forEach(function (sec) {
      for (var i = 0; i < sec.bars; i++) {
        var ch = sec.chords[i % sec.chords.length], fifth = ch[2] || 7, tones = [0, ch[1], fifth, 12, 12 + ch[1], 12 + fifth];
        var bar = { root: ch[0], tones: tones, sec: sec, last: i === sec.bars - 1, mel: [], spark: [], wail: null };
        if (sec.layers.indexOf("m") >= 0) {
          for (var k = 0; k < 8; k += 2) { // quarter notes, sometimes held
            if (k > 0 && rnd() < (sec.dark ? 0.6 : 0.3)) continue;
            deg += Math.round(rnd() * 4 - 2); deg = Math.max(5, Math.min(13, deg));
            var semi = scale[deg % 7] + 12 * Math.floor(deg / 7);
            bar.mel.push({ at: k, semi: semi, len: rnd() < 0.35 ? 4 : 2 });
          }
        }
        if (sec.layers.indexOf("s") >= 0) bar.spark.push({ at: 2 + 2 * Math.floor(rnd() * 3), tone: Math.floor(rnd() * 3) });
        if (sec.layers.indexOf("w") >= 0 && rnd() < 0.45) bar.wail = { at: 2 * Math.floor(rnd() * 3), tone: Math.floor(rnd() * 3) };
        out.push(bar);
      }
    });
    return out;
  }
  // ---- the "Minecraft" song: slow, soft piano notes with a lot of air, in the mood of the game's quiet music (our own notes, not a copy) ----
  var M_HOME = [C, G, Am, F], M_WALK = [F, C, G, Am], M_DUSK = [Am, Em, F, C];
  var M_SECTIONS = [
    { bars: 8, chords: M_HOME, layers: "a", arp: 3, level: 0.8, piano: true },       // a few single notes
    { bars: 16, chords: M_HOME, layers: "pa", arp: 3, level: 0.9, piano: true },     // morning
    { bars: 16, chords: M_WALK, layers: "pam", arp: 4, level: 1, piano: true },      // the tune
    { bars: 8, chords: M_DUSK, layers: "ps", arp: 0, level: 0.8, piano: true },      // quiet
    { bars: 16, chords: M_HOME, layers: "pbam", arp: 4, level: 1, piano: true },     // fuller
    { bars: 8, chords: M_DUSK, layers: "pas", arp: 3, level: 0.9, piano: true },     // evening
    { bars: 16, chords: M_WALK, layers: "pbams", arp: 4, level: 1, piano: true },    // everything
    { bars: 8, chords: M_HOME, layers: "a", arp: 3, level: 0.7, piano: true }        // the last notes
  ];
  var SONGS = { calm: compose(SECTIONS, SCALE, 7), herobrine: compose(H_SECTIONS, H_SCALE, 13), minecraft: compose(M_SECTIONS, SCALE, 21) };
  function freq(semi) { return 220 * Math.pow(2, semi / 12); }
  function tone(f, t, len, peak, type, attack, slideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + len + 0.05);
  }
  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.6) {
      var SONG = SONGS[song], bar = SONG[Math.floor(step / 8) % SONG.length], i = step % 8, sec = bar.sec, L = sec.layers, lv = sec.level, t = nextTime;
      var has = function (c) { return L.indexOf(c) >= 0; };
      if (sec.dark) { darkStep(bar, i, t, has, lv); nextTime += BEAT; step++; continue; }
      if (i === 0) {
        if (has("p")) [0, 1, 2].forEach(function (n) { tone(freq(bar.root + bar.tones[n]), t, BEAT * 8.5, 0.045 * lv, "sine", 0.6); });
        if (has("b")) tone(freq(bar.root - 12), t, BEAT * 7, 0.15 * lv, "sine");
      }
      if (i === 4 && has("b")) tone(freq(bar.root - 12 + 7), t, BEAT * 3.5, 0.08 * lv, "sine");
      if (has("a")) {
        var n = ARPS[sec.arp][i];
        if (n >= 0 && sec.piano) { var pf = freq(bar.root + bar.tones[n]); tone(pf, t, BEAT * 6, 0.12 * lv, "sine", 0.008); tone(pf * 2, t, BEAT * 2.5, 0.02 * lv, "triangle", 0.008); } // a soft piano note that rings out
        else if (n >= 0) tone(freq(bar.root + bar.tones[n]), t, BEAT * 2.4, 0.1 * lv, "triangle");
      }
      bar.mel.forEach(function (m) { if (m.at === i) tone(freq(m.semi + 12), t, BEAT * m.len * (sec.piano ? 2.6 : 1.3), 0.085 * lv, "sine", sec.piano ? 0.008 : 0.02); });
      bar.spark.forEach(function (sp) { if (sp.at === i) tone(freq(bar.root + bar.tones[sp.tone] + 24), t, BEAT * 4, 0.03, "sine"); });
      nextTime += BEAT; step++;
    }
  }
  // one eighth note of the dark song
  function darkStep(bar, i, t, has, lv) {
    if (i === 0) {
      if (has("d")) { // low drone: two notes almost the same, so the sound slowly throbs
        tone(55, t, BEAT * 8.6, 0.13 * lv, "sine", 1.2); tone(55.6, t, BEAT * 8.6, 0.1 * lv, "sine", 1.2);
        tone(110.4, t, BEAT * 8.6, 0.025 * lv, "triangle", 2);
      }
      if (has("p")) [0, 1, 2].forEach(function (n) { tone(freq(bar.root + bar.tones[n] - 12), t, BEAT * 8.5, 0.04 * lv, "triangle", 1.5); });
    }
    if (has("h") && (i === 0 || i === 1)) tone(62, t, 0.32, (i === 0 ? 0.3 : 0.2) * lv, "sine", 0.008, 38); // heartbeat
    if (has("a") && (i === 2 || i === 6)) { // single cold notes with a quiet echo
      var f = freq(bar.root + bar.tones[i === 2 ? 4 : 3]);
      tone(f, t, BEAT * 3, 0.06 * lv, "sine", 0.01); tone(f, t + BEAT * 1.5, BEAT * 3, 0.022 * lv, "sine", 0.01);
    }
    bar.mel.forEach(function (m) {
      if (m.at !== i) return;
      var f = freq(m.semi);
      tone(f, t, BEAT * m.len * 1.8, 0.075 * lv, "triangle", 0.02, f * 0.985); // each note sinks a little
      tone(f, t + BEAT * 3, BEAT * m.len * 1.5, 0.025 * lv, "sine", 0.02, f * 0.985);
    });
    if (bar.wail && bar.wail.at === i) { var w = freq(bar.root + bar.tones[bar.wail.tone] + 24); tone(w, t, BEAT * 6, 0.016 * lv, "sine", 1.5, w * 0.94); }
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
    document.querySelectorAll("[data-music-song]").forEach(function (r) { r.checked = r.value === song; });
    document.querySelectorAll("[data-music-name]").forEach(function (e) { e.textContent = INFO[song].name; });
  }
  function setSong(next) {
    song = INFO[next] ? next : "calm"; LENGTH = INFO[song].len; BEAT = LENGTH / (INFO[song].bars * 8); try { localStorage.setItem("fmf-song", song); } catch (e) {}
    step = 0; if (ctx) nextTime = Math.max(nextTime, ctx.currentTime + 0.1); // start the chosen song from its beginning
    paint();
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
      // choosing a song (also the one already chosen) starts the music
      if (e.target.matches && e.target.matches("[data-music-song]")) { if (e.target.value !== song) setSong(e.target.value); if (!on) set(true); }
    });
    document.addEventListener("change", function (e) {
      if (e.target.matches && e.target.matches("[data-music-check]")) set(e.target.checked);
      if (e.target.matches && e.target.matches("[data-music-song]") && e.target.checked) setSong(e.target.value);
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
