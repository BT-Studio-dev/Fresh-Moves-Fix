const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const html = fs.readFileSync('website/public/index.html', 'utf8');
const code = fs.readFileSync('website/video-banner.js', 'utf8');
function setup(reduced, reject = false) {
  const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, video = d.getElementById('fresh-banner-video'), button = d.getElementById('fresh-banner-motion');
  let listener, removed = false, plays = 0, pauses = 0;
  w.matchMedia = () => ({ matches: reduced, addEventListener(event, fn) { listener = fn; }, removeEventListener() { removed = true; } });
  video.play = () => { plays++; return reject ? Promise.reject(new Error('blocked')) : Promise.resolve(); };
  video.pause = () => { pauses++; };
  w.eval(code);
  return {dom, w, d, video, button, get plays(){return plays}, get pauses(){return pauses}, get removed(){return removed}, reduce(){listener({matches:true})}};
}
(async function () {
  const normal = setup(false);
  assert(normal.video.hasAttribute('muted') && normal.video.hasAttribute('loop') && normal.video.hasAttribute('playsinline'));
  assert(normal.video.hasAttribute('data-music-ignore')); assert.equal(normal.video.getAttribute('aria-hidden'), 'true');
  assert.match(normal.video.getAttribute('src'), /^fresh-moves-banner\.mp4\?v=/); assert.equal(normal.plays, 1);
  assert.equal(normal.button.textContent, 'Pause animation'); assert(!normal.button.hidden);
  assert.match(normal.d.querySelector('.fresh-video-banner h2').textContent, /Fresh Moves Fix/);
  assert(normal.d.querySelector('.fresh-banner-ingot'));
  normal.button.click(); assert.equal(normal.pauses, 1); assert.equal(normal.button.textContent, 'Play animation');
  normal.button.click(); assert.equal(normal.plays, 2); normal.reduce(); assert.equal(normal.button.textContent, 'Play animation');
  normal.video.dispatchEvent(new normal.w.Event('error')); assert(normal.button.disabled); assert.equal(normal.button.textContent, 'Animation unavailable');
  normal.video.remove(); normal.d.dispatchEvent(new normal.w.Event('fmf-nav')); assert(normal.removed); normal.dom.window.close();
  const reduced = setup(true); assert.equal(reduced.plays, 0); assert(!reduced.video.hasAttribute('src'), 'reduced motion does not fetch video');
  assert.equal(reduced.button.textContent, 'Play animation'); reduced.button.click(); assert.equal(reduced.plays, 1); reduced.dom.window.close();
  const blocked = setup(false, true); await Promise.resolve(); assert.equal(blocked.button.textContent, 'Play animation'); assert(!blocked.button.disabled); blocked.dom.window.close();
  const mp4 = fs.readFileSync('website/public/fresh-moves-banner.mp4'); assert.equal(mp4.toString('ascii', 4, 8), 'ftyp');
  console.log('Silent banner, text, icon, playback, reduced motion, errors and navigation passed (mocked media)');
})().catch(error => { console.error(error); process.exitCode = 1; });
