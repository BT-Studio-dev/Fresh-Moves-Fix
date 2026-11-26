// Decorative silent video: the text remains visible without video or JavaScript.
(function () {
  const video = document.getElementById('fresh-banner-video');
  const head = document.getElementById('fresh-banner-head');
  const button = document.getElementById('fresh-banner-motion');
  const banner = video && video.closest('.fresh-video-banner');
  if (!video || !head || !button || !banner) return;
  const videos = [video, head];
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
  function pause() { attempt++; wanted = false; videos.forEach(function (item) { item.pause(); }); update(); }
  function play() {
    if (failed || siteReduced) return;
    const current = ++attempt;
    wanted = true;
    update();
    try {
      const pending = videos.map(function (item) {
        item.muted = true;
        if (!item.getAttribute('src')) item.src = item.dataset.src;
        return item.play();
      });
      Promise.all(pending).catch(function () { if (attempt === current) pause(); });
    } catch (_) { if (attempt === current) pause(); }
  }
  videos.forEach(function (item) {
    item.addEventListener('error', function () { failed = true; pause(); });
  });
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
    videos.forEach(function (item) { item.pause(); });
    if (preference && preference.removeEventListener) preference.removeEventListener('change', preferenceChanged);
    document.removeEventListener('fmf-motion-change', siteMotionChanged);
    document.removeEventListener('fmf-nav', cleanup);
  }
  document.addEventListener('fmf-nav', cleanup);
  button.hidden = false;
  update();
  if (!siteReduced && (!preference || !preference.matches)) play();
})();
