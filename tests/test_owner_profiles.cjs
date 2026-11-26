const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const html = fs.readFileSync('website/public/index.html', 'utf8');
const script = fs.readFileSync('website/public/owner-profiles.bundle.js', 'utf8');
function setup() {
  const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, requests = [], renders = [];
  w.Image = class {
    constructor() { this.width = 64; this.height = 64; requests.push(this); }
    set src(value) { this.url = value; }
    get src() { return this.url; }
  };
  w.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return {
      canvas, clearRect() {}, save() {}, restore() {}, scale() {},
      drawImage(source) { if (source.url) canvas.imageUrl = source.url; },
      getImageData(x, y, width, height) {
        if (canvas.imageUrl && canvas.imageUrl.includes('cors-error')) throw new Error('CORS');
        const data = new Uint8ClampedArray(width * height * 4); for (let i = 3; i < data.length; i += 4) data[i] = 255;
        return { data };
      }
    };
  };
  w.FMFPlayer = { SoftViewer: class {
    view() {} loadSkin(source, options) { renders.push({ url: source.imageUrl, model: options.model }); }
    render() {} dispose() {}
  }};
  w.eval(script);
  return { dom, w, d, requests, renders };
}
const env = setup(), { d, requests } = env;
assert.equal(requests.length, 4);
assert.match(requests[0].url, /owner-skin\.png/);
assert.equal(requests[1].url, 'https://mc-heads.net/skin/lie_kg');
assert.match(requests[2].url, /^data:image\/png/);
assert.equal(requests[3].url, 'https://mc-heads.net/skin/dudualt');
assert.equal(requests[1].crossOrigin, 'anonymous'); assert.equal(requests[3].crossOrigin, 'anonymous');
requests[0].onload(); requests[2].onload();
assert.equal(d.getElementById('owner-skin-status').textContent, 'Saved fallback skin');
assert.equal(d.getElementById('dudualt-skin-status').textContent, 'Saved fallback skin');
assert(!d.getElementById('owner-model').hidden && d.getElementById('owner-fallback').hidden);
requests[1].onload(); requests[3].onload();
assert.equal(d.getElementById('owner-skin-status').textContent, 'Skin from mc-heads.net');
assert.equal(d.getElementById('dudualt-skin-status').textContent, 'Skin from mc-heads.net');
assert.equal(env.renders.length, 4);
requests[0].onload(); assert.equal(env.renders.length, 4, 'late fallback cannot replace live image');
assert.match(d.querySelector('.owner-skin-note').textContent, /mc-heads.net/);
assert.match(d.querySelector('[aria-label="dudualt co-owner profile"]').textContent, /CO-OWNER PROFILE/);
env.dom.window.close();
const failed = setup(); failed.requests[0].onload(); failed.requests[2].onload();
failed.requests[1].url += '?cors-error'; failed.requests[1].onload();
failed.requests[3].width = 100; failed.requests[3].onload();
assert.equal(failed.d.getElementById('owner-skin-status').textContent, 'Saved fallback skin');
assert.equal(failed.d.getElementById('dudualt-skin-status').textContent, 'Saved fallback skin');
assert.equal(failed.renders.length, 2); failed.dom.window.close();
const legacy = setup(); legacy.requests[1].height = 32; legacy.requests[1].onload();
assert.equal(legacy.renders[0].model, 'wide');
legacy.d.getElementById('dudualt-model').remove(); legacy.requests[3].onload();
assert.equal(legacy.renders.length, 1, 'detached cards are not rendered'); legacy.dom.window.close();
console.log('Owner skins: live lookups, fallbacks, race, errors, legacy skins and navigation passed (mocked canvas/network)');
