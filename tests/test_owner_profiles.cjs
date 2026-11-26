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
assert.equal(requests.length, 3, 'lie_kg must not trigger a live lookup');
assert.match(requests[0].url, /^lie-kg-skin\.png\?v=/);
assert.match(requests[1].url, /^data:image\/png/);
assert.equal(requests[2].url, 'https://mc-heads.net/skin/dudualt');
assert.equal(requests[2].crossOrigin, 'anonymous');
assert.match(d.getElementById('owner-fallback').getAttribute('src'), /^lie-kg-profile\.png\?v=/);
assert.equal(d.getElementById('owner-skin-status').textContent, 'Custom skin');
requests[0].onload(); requests[1].onload();
assert.equal(d.getElementById('owner-skin-status').textContent, 'Custom skin');
assert.equal(d.getElementById('dudualt-skin-status').textContent, 'Saved fallback skin');
assert(!d.getElementById('owner-model').hidden && d.getElementById('owner-fallback').hidden);
requests[2].onload();
assert.equal(d.getElementById('owner-skin-status').textContent, 'Custom skin');
assert.equal(d.getElementById('dudualt-skin-status').textContent, 'Skin from mc-heads.net');
assert.equal(env.renders.length, 3);
requests[1].onload(); assert.equal(env.renders.length, 3, 'late fallback cannot replace live image');
assert.match(d.querySelector('.owner-skin-note').textContent, /mc-heads.net/);
assert.match(d.querySelector('[aria-label="dudualt co-owner profile"]').textContent, /CO-OWNER PROFILE/);
assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync('website/lie-kg-skin.png')).digest('hex'), 'ff1839af5a05784f5ba4dc7e63ca4122e4170a3f847a0a76973b9559698aeda0', 'uploaded skin pixels remain unchanged');
assert(fs.readFileSync('website/public/lie-kg-skin.png').equals(fs.readFileSync('website/lie-kg-skin.png')));
env.dom.window.close();
const failed = setup(); failed.requests[0].onload(); failed.requests[1].onload();
failed.requests[2].url += '?cors-error'; failed.requests[2].onload();
assert.equal(failed.d.getElementById('owner-skin-status').textContent, 'Custom skin');
assert.equal(failed.d.getElementById('dudualt-skin-status').textContent, 'Saved fallback skin');
assert.equal(failed.renders.length, 2); failed.dom.window.close();
const invalid = setup(); invalid.requests[2].width = 100; invalid.requests[2].onload();
assert.equal(invalid.d.getElementById('dudualt-skin-status').textContent, 'Saved fallback image'); invalid.dom.window.close();
const legacy = setup(); legacy.requests[2].height = 32; legacy.requests[2].onload();
assert.equal(legacy.renders[0].model, 'wide');
legacy.d.getElementById('owner-model').remove(); legacy.requests[0].onload();
assert.equal(legacy.renders.length, 1, 'detached cards are not rendered'); legacy.dom.window.close();
console.log('Custom lie_kg skin and dudualt live lookup, fallback, race, errors, legacy and navigation passed (mocked canvas/network)');
