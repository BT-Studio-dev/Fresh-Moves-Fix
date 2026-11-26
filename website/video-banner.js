// Silent decorative media: keep the static poster and text usable without JavaScript.
(function () {
  const video = document.getElementById('fresh-banner-video');
  const head = document.getElementById('fresh-banner-head');
  const button = document.getElementById('fresh-banner-motion');
  const banner = video && video.closest('.fresh-video-banner');
  if (!video || !head || !button || !banner) return;
  const videos = [video, head];
  const preference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let siteReduced = false, enabled = true;
  try {
    siteReduced = localStorage.getItem('fmf-extra-motion') === '1';
    enabled = localStorage.getItem('fmf-banner-motion') !== 'off';
  } catch (_) {}
  let wanted = enabled && !siteReduced && !(preference && preference.matches);
  const supportsObserver = typeof window.IntersectionObserver === 'function';
  let visible = false, active = false, failed = false, attempt = 0, observer;
  function update() {
    button.disabled = failed || siteReduced || !enabled;
    button.textContent = failed ? 'Animation unavailable' : siteReduced ? 'Motion reduced in quick settings' : !enabled ? 'Banner animation off in settings' : (wanted ? 'Pause animation' : 'Play animation');
    banner.classList.toggle('banner-motion-playing', active);
  }
  function stopPlayback() {
    if (!active) return;
    attempt++; active = false;
    videos.forEach(function (item) { item.pause(); });
  }
  function reconcile() {
    if (!wanted || !enabled || siteReduced || failed || document.hidden || !visible) {
      stopPlayback(); update(); return;
    }
    if (active) { update(); return; }
    const current = ++attempt;
    active = true; update();
    try {
      const pending = videos.map(function (item) {
        item.muted = true;
        if (!item.getAttribute('src')) item.src = item.dataset.src;
        return item.play();
      });
      Promise.all(pending).catch(function () {
        if (attempt === current) { wanted = false; stopPlayback(); update(); }
      });
    } catch (_) { if (attempt === current) { wanted = false; stopPlayback(); update(); } }
  }
  videos.forEach(function (item) {
    item.addEventListener('error', function () { failed = true; wanted = false; reconcile(); });
  });
  button.addEventListener('click', function () { wanted = !wanted; reconcile(); });
  function siteMotionChanged(event) {
    siteReduced = !!(event.detail && event.detail.reduced);
    if (siteReduced) wanted = false;
    reconcile();
  }
  function bannerMotionChanged(event) {
    enabled = !!(event.detail && event.detail.enabled);
    wanted = enabled && !siteReduced && !(preference && preference.matches);
    reconcile();
  }
  function preferenceChanged(event) { if (event.matches) wanted = false; reconcile(); }
  function visibilityChanged() { reconcile(); }
  document.addEventListener('fmf-motion-change', siteMotionChanged);
  document.addEventListener('fmf-banner-motion-change', bannerMotionChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  if (preference && preference.addEventListener) preference.addEventListener('change', preferenceChanged);
  function checkViewport() {
    const rect = banner.getBoundingClientRect();
    const next = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    if (next !== visible) { visible = next; reconcile(); }
  }
  if (supportsObserver) {
    observer = new IntersectionObserver(function (entries) {
      for (const entry of entries) if (entry.target === banner) visible = entry.isIntersecting;
      reconcile();
    }, { threshold: 0.01 });
    observer.observe(banner);
  } else {
    window.addEventListener('scroll', checkViewport, { passive: true });
    window.addEventListener('resize', checkViewport, { passive: true });
    checkViewport();
  }
  function cleanup() {
    if (video.isConnected) return;
    stopPlayback();
    if (observer) observer.disconnect();
    if (!supportsObserver) { window.removeEventListener('scroll', checkViewport); window.removeEventListener('resize', checkViewport); }
    if (preference && preference.removeEventListener) preference.removeEventListener('change', preferenceChanged);
    document.removeEventListener('fmf-motion-change', siteMotionChanged);
    document.removeEventListener('fmf-banner-motion-change', bannerMotionChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
    document.removeEventListener('fmf-nav', cleanup);
  }
  document.addEventListener('fmf-nav', cleanup);
  button.hidden = false;
  reconcile();
})();
