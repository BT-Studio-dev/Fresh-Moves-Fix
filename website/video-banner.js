// Decorative silent video: the text remains visible without video or JavaScript.
(function () {
  const video = document.getElementById('fresh-banner-video');
  const button = document.getElementById('fresh-banner-motion');
  const banner = video && video.closest('.fresh-video-banner');
  if (!video || !button || !banner) return;
  const preference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let wanted = false;
  let failed = false;
  let siteReduced = false;
  try { siteReduced = localStorage.getItem('fmf-extra-motion') === '1'; } catch (_) {}
  let attempt = 0;
  function update() {
    button.disabled = failed || siteReduced;
    button.textContent = failed ? 'Animation unavailable' : siteReduced ? 'Motion reduced in quick settings' : (wanted ? 'Pause animation' : 'Play animation');
    banner.classList.toggle('banner-motion-playing', wanted && !failed && !siteReduced);
  }
  function pause() { attempt++; wanted = false; video.pause(); update(); }
  function play() {
    if (failed || siteReduced) return;
    const current = ++attempt;
    wanted = true;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    update();
    try {
      const pending = video.play();
      if (pending && pending.catch) pending.catch(function () { if (attempt === current) { wanted = false; update(); } });
    } catch (_) { if (attempt === current) { wanted = false; update(); } }
  }
  video.addEventListener('error', function () { attempt++; failed = true; wanted = false; update(); });
  button.addEventListener('click', function () { if (wanted) pause(); else play(); });
  function siteMotionChanged(event) {
    siteReduced = !!(event.detail && event.detail.reduced);
    if (siteReduced) pause(); else update();
  }
  document.addEventListener('fmf-motion-change', siteMotionChanged);
  function preferenceChanged(event) { if (event.matches) pause(); }
  if (preference && preference.addEventListener) preference.addEventListener('change', preferenceChanged);
  function cleanup() {
    if (video.isConnected) return;
    video.pause();
    if (preference && preference.removeEventListener) preference.removeEventListener('change', preferenceChanged);
    document.removeEventListener('fmf-motion-change', siteMotionChanged);
    document.removeEventListener('fmf-nav', cleanup);
  }
  document.addEventListener('fmf-nav', cleanup);
  button.hidden = false;
  update();
  if (!siteReduced && (!preference || !preference.matches)) play();
})();
