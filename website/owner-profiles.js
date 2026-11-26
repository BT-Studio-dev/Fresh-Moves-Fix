import { loadSkinToCanvas, inferModelType } from 'skinview-utils';

// Render the saved skin first, then replace it only if the live lookup succeeds.
// A failed network request, CORS failure, or unsupported image keeps the fallback.
(function () {
  if (!window.FMFPlayer) return;
  function setup(name, canvasId, fallbackId, statusId, savedSkin) {
    const canvas = document.getElementById(canvasId);
    const fallback = document.getElementById(fallbackId);
    const status = document.getElementById(statusId);
    if (!canvas || !fallback || !status || !savedSkin) return;
    let liveRendered = false;
    function load(url, live) {
      const image = new Image();
      if (live) image.crossOrigin = 'anonymous';
      image.onload = function () {
        if (!canvas.isConnected || (!live && liveRendered)) return;
        let viewer;
        try {
          if (image.width !== 64 || (image.height !== 64 && image.height !== 32)) throw new Error('Unsupported skin dimensions');
          const source = document.createElement('canvas');
          loadSkinToCanvas(source, image);
          const model = image.height === 32 ? 'wide' : inferModelType(source);
          // Draw off-screen so a failed live render cannot erase the saved image.
          const output = document.createElement('canvas');
          output.width = canvas.width; output.height = canvas.height;
          viewer = new window.FMFPlayer.SoftViewer(output);
          viewer.pose = 'cheer'; viewer.zoom = 1.05; viewer.view(-0.45, 0.12, 0);
          viewer.loadSkin(source, { model }); viewer.render(); viewer.dispose(); viewer = null;
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(output, 0, 0);
          canvas.hidden = false; fallback.hidden = true;
          status.textContent = live ? 'Skin from mc-heads.net' : 'Saved fallback skin';
          if (live) liveRendered = true;
        } catch (_) {
          if (viewer) viewer.dispose();
        }
      };
      image.src = url;
    }
    load(savedSkin, false);
    load('https://mc-heads.net/skin/' + encodeURIComponent(name), true);
  }
  const steve = document.getElementById('dudualt-model');
  setup('lie_kg', 'owner-model', 'owner-fallback', 'owner-skin-status', 'owner-skin.png');
  if (steve) setup('dudualt', 'dudualt-model', 'dudualt-fallback', 'dudualt-skin-status', steve.getAttribute('data-skin'));
})();
