// Native guide video controls, kept once across in-site navigation.
(function () {
  if (window.__fmfGuideVideoReady) return;
  window.__fmfGuideVideoReady = true;
  let enabled = true;
  try { enabled = localStorage.getItem('fmf-guide-video') !== 'off'; } catch (_) {}
  function isGuide(video) { return video && video.matches && video.matches('figure.video-card video'); }
  function message(video, text) {
    const card = video.closest('figure.video-card');
    const status = card && card.querySelector('[data-guide-video-status]');
    if (status) { status.textContent = text; status.hidden = !text; }
  }
  function sync() {
    document.querySelectorAll('figure.video-card video').forEach(function (video) {
      if (!enabled && !video.paused) video.pause();
      video.controls = enabled;
      message(video, enabled ? '' : 'Guide video playback is off in settings.');
    });
  }
  document.addEventListener('fmf-guide-video-change', function (event) { enabled = !!(event.detail && event.detail.enabled); sync(); });
  document.addEventListener('fmf-nav', sync);
  document.addEventListener('play', function (event) {
    const video = event.target; if (!isGuide(video)) return;
    if (!enabled) { video.pause(); message(video, 'Guide video playback is off in settings.'); }
    else message(video, '');
  }, true);
  document.addEventListener('loadstart', function (event) { if (enabled && isGuide(event.target)) message(event.target, 'Loading video…'); }, true);
  document.addEventListener('canplay', function (event) { if (enabled && isGuide(event.target)) message(event.target, ''); }, true);
  document.addEventListener('error', function (event) { if (enabled && isGuide(event.target)) message(event.target, 'Video could not be loaded. Use the GitHub link below.'); }, true);
  sync();
})();
