/* Live Sky: sun and moon calculations stay in the browser; no weather service. */
import SunCalc from 'suncalc';
(function () {
  'use strict';
  if (window.__fmfLiveSkyStop) window.__fmfLiveSkyStop();
  const root = document.documentElement, key = 'fmf-live-sky-location-v1';
  const sky = document.createElement('div'); sky.className = 'fmf-live-sky'; sky.setAttribute('aria-hidden', 'true');
  sky.innerHTML = '<div class="fmf-live-sun"></div><svg class="fmf-live-moon" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#5d647f"/><path fill="#f6f2d9"></path></svg>';
  document.body.insertBefore(sky, document.body.firstChild);
  const path = sky.querySelector('path'), sun = sky.querySelector('.fmf-live-sun'), moon = sky.querySelector('.fmf-live-moon');
  const useButton = document.getElementById('live-sky-use-location'), forgetButton = document.getElementById('live-sky-forget-location'), status = document.getElementById('live-sky-location-status');
  let timer = null, stopped = false, requestId = 0, location = null;
  function validLocation(value) { return value && Number.isFinite(value.lat) && Number.isFinite(value.lon) && Math.abs(value.lat) <= 90 && Math.abs(value.lon) <= 180; }
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (validLocation(saved)) location = saved; } catch (e) {}
  function phase(date) { return SunCalc.getMoonIllumination(date).phase; }
  function moonPath(p) {
    const waxing = p < .5, half = Math.max(.01, Math.abs(Math.cos(p * Math.PI * 2)) * 46);
    const outer = waxing ? 1 : 0, inner = waxing ? (Math.cos(p * Math.PI * 2) >= 0 ? 0 : 1) : (Math.cos(p * Math.PI * 2) >= 0 ? 1 : 0);
    return 'M50 4 A46 46 0 0 ' + outer + ' 50 96 A' + half.toFixed(2) + ' 46 0 0 ' + inner + ' 50 4 Z';
  }
  function calculate(date, lat, lon) {
    const sunPosition = SunCalc.getPosition(date, lat, lon), moonPosition = SunCalc.getMoonPosition(date, lat, lon);
    const priorSun = SunCalc.getPosition(new Date(date.getTime() - 120000), lat, lon);
    const degrees = 180 / Math.PI, sunAltitude = sunPosition.altitude * degrees;
    const stage = sunAltitude > 6 ? 'day' : sunAltitude > -6 ? (sunPosition.altitude > priorSun.altitude ? 'dawn' : 'dusk') : 'night';
    return { stage, sun: sunPosition, moon: moonPosition, phase: phase(date), sunVisible: sunAltitude > -0.833, moonVisible: moonPosition.altitude > 0 };
  }
  function place(element, position) {
    // Illustration maps compass azimuth and altitude to screen coordinates; it is
    // not an AR view or a compass. SunCalc azimuth is measured from south.
    const fraction = ((position.azimuth + Math.PI) / (2 * Math.PI) + 1) % 1;
    element.style.left = (5 + fraction * 82).toFixed(2) + '%'; element.style.right = 'auto';
    element.style.top = (82 - Math.max(0, Math.min(1, position.altitude / (Math.PI / 2))) * 72).toFixed(2) + '%';
  }
  function message(text) { if (status) status.textContent = text; }
  function update() {
    const enabled = root.getAttribute('data-theme') === 'livesky' && root.getAttribute('data-background') !== 'off';
    sky.hidden = !enabled;
    if (!enabled) { root.removeAttribute('data-live-sky'); if (timer) { clearInterval(timer); timer = null; } return; }
    const now = new Date(); let stage;
    if (location) {
      const result = calculate(now, location.lat, location.lon); stage = result.stage;
      place(sun, result.sun); place(moon, result.moon);
      root.setAttribute('data-live-sun', result.sunVisible ? 'on' : 'off');
      root.setAttribute('data-live-moon', result.moonVisible ? 'on' : 'off');
      path.setAttribute('d', moonPath(result.phase));
    } else {
      const h = now.getHours() + now.getMinutes() / 60;
      stage = h >= 7 && h < 17 ? 'day' : h >= 5 && h < 7 ? 'dawn' : h >= 17 && h < 19 ? 'dusk' : 'night';
      root.setAttribute('data-live-sun', stage === 'night' ? 'off' : 'on'); root.setAttribute('data-live-moon', stage === 'night' ? 'on' : 'off');
      sun.style.left = moon.style.left = ''; sun.style.right = moon.style.right = ''; sun.style.top = moon.style.top = '';
      path.setAttribute('d', moonPath(phase(now)));
    }
    root.setAttribute('data-live-sky', stage);
    if (!timer) timer = setInterval(update, 60000);
  }
  function onUseLocation() {
    if (!navigator.geolocation) { message('Location is unavailable in this browser. Live Sky will use your local clock.'); return; }
    const id = ++requestId; message('Requesting location permission…');
    navigator.geolocation.getCurrentPosition(function (position) {
      if (stopped || id !== requestId) return;
      const next = { lat: Math.round(position.coords.latitude * 100) / 100, lon: Math.round(position.coords.longitude * 100) / 100 };
      if (!validLocation(next)) { message('Could not read your location. Live Sky will use your local clock.'); return; }
      location = next; let saved = false;
      try { localStorage.setItem(key, JSON.stringify(next)); saved = true; } catch (e) {}
      message(saved ? 'Location enabled and saved in this browser.' : 'Location enabled for this page; browser storage is unavailable.'); update();
    }, function () { if (!stopped && id === requestId) message(location ? 'Location unavailable or permission denied. Your previously saved location is still in use.' : 'Location was not available or permission was denied. Live Sky uses your local clock.'); }, { enableHighAccuracy: false, maximumAge: 1800000, timeout: 15000 });
  }
  function onForgetLocation() { ++requestId; location = null; try { localStorage.removeItem(key); } catch (e) {} message('Location forgotten. Live Sky uses your local clock.'); update(); }
  if (useButton) useButton.addEventListener('click', onUseLocation);
  if (forgetButton) forgetButton.addEventListener('click', onForgetLocation);
  message(location ? 'Location enabled and saved in this browser.' : 'No location saved. Live Sky uses your local clock.');
  const observer = new MutationObserver(update);
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-background'] });
  document.addEventListener('visibilitychange', update);
  window.__fmfLiveSkyStop = function () { stopped = true; ++requestId; observer.disconnect(); document.removeEventListener('visibilitychange', update); if (timer) clearInterval(timer); if (useButton) useButton.removeEventListener('click', onUseLocation); if (forgetButton) forgetButton.removeEventListener('click', onForgetLocation); sky.remove(); };
  window.FMFLiveSky = { phase, moonPath, calculate };
  update();
})();
