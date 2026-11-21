/* A lightweight illustrative sky based on device-local time, not weather or location. */
(function () {
  'use strict';
  if (window.__fmfLiveSkyStop) window.__fmfLiveSkyStop();
  var root = document.documentElement;
  var sky = document.createElement('div'); sky.className = 'fmf-live-sky'; sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<div class="fmf-live-sun"></div><svg class="fmf-live-moon" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#5d647f"/><path fill="#f6f2d9"></path></svg>';
  document.body.insertBefore(sky, document.body.firstChild);
  var path = sky.querySelector('path'), timer = null;
  function phase(date) {
    // Epoch is a known new moon; the mean synodic month gives an approximate phase.
    var cycle = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / (29.530588853 * 86400000);
    return ((cycle % 1) + 1) % 1;
  }
  function moonPath(p) {
    var waxing = p < .5, half = Math.max(.01, Math.abs(Math.cos(p * Math.PI * 2)) * 46);
    var outer = waxing ? 1 : 0, inner = waxing ? (Math.cos(p * Math.PI * 2) >= 0 ? 0 : 1) : (Math.cos(p * Math.PI * 2) >= 0 ? 1 : 0);
    return 'M50 4 A46 46 0 0 ' + outer + ' 50 96 A' + half.toFixed(2) + ' 46 0 0 ' + inner + ' 50 4 Z';
  }
  function update() {
    var enabled = root.getAttribute('data-theme') === 'livesky' && root.getAttribute('data-background') !== 'off';
    sky.hidden = !enabled;
    if (!enabled) { root.removeAttribute('data-live-sky'); if (timer) { clearInterval(timer); timer = null; } return; }
    var now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    var stage = h >= 7 && h < 17 ? 'day' : h >= 5 && h < 7 ? 'dawn' : h >= 17 && h < 19 ? 'dusk' : 'night';
    root.setAttribute('data-live-sky', stage);
    path.setAttribute('d', moonPath(phase(now)));
    if (!timer) timer = setInterval(update, 60000);
  }
  var observer = new MutationObserver(update);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-background'] });
  document.addEventListener('visibilitychange', update);
  window.__fmfLiveSkyStop = function () { observer.disconnect(); document.removeEventListener('visibilitychange', update); if (timer) clearInterval(timer); sky.remove(); };
  // Expose the calculation for predictable tests without exposing user data.
  window.FMFLiveSky = { phase: phase, moonPath: moonPath };
  update();
})();
