// Checks the generated navigation on every page and simulates in-site header navigation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('../website/node_modules/jsdom');
const root = 'website/public';
function files(dir) { return fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []); }
const routes = ['/', '/guides/', '/creations/', '/settings/', '/account/'];
const pages = files(root);
for (const file of pages) {
  const rel = path.relative(root, file).replace(/index\.html$/, '');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), { url: 'https://example.test/' + rel });
  const doc = dom.window.document, nav = doc.querySelector('header.top nav[aria-label="Main navigation"]');
  assert(nav, `${file}: labelled navigation`);
  const links = [...nav.querySelectorAll('a')];
  assert.deepEqual(links.map(a => new URL(a.href).pathname), routes, `${file}: navigation destinations`);
  assert.deepEqual(links.map(a => a.textContent.trim()), ['Home', 'Guides', 'Projects', 'Settings', 'Login']);
  const current = nav.querySelectorAll('[aria-current="page"]'); assert(current.length <= 1);
  if (current.length) assert(current[0].classList.contains('on'));
  const download = new URL(doc.querySelector('header.top .get').href);
  assert.equal(download.pathname, '/'); assert.equal(download.hash, '#download');
  assert(doc.querySelector('[data-music-toggle]')); assert(doc.querySelector('#site-help .site-help-toggle'));
  dom.window.close();
}
assert(new JSDOM(fs.readFileSync(root + '/index.html','utf8')).window.document.getElementById('download'));
(async function () {
  const dom = new JSDOM(fs.readFileSync(root + '/index.html','utf8'), { url:'https://example.test/', runScripts:'outside-only' });
  const w=dom.window, d=w.document, loaded=[], scrolled=[];
  w.scrollTo = () => scrolled.push('top');
  w.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.id); };
  w.fetch = async url => {
    const u = new URL(url, w.location.href), file = path.join(root, u.pathname, 'index.html');
    loaded.push(u.pathname); return {ok:true, url:u.href, headers:{get:()=> 'text/html'}, text:async()=>fs.readFileSync(file, 'utf8')};
  };
  const append = w.HTMLBodyElement.prototype.appendChild;
  w.HTMLBodyElement.prototype.appendChild = function (node) {
    const result=append.call(this,node);
    if (node.tagName === 'SCRIPT' && node.src) queueMicrotask(() => node.onload && node.onload());
    return result;
  };
  w.eval(fs.readFileSync('website/nav.js','utf8'));
  async function click(selector, expected) {
    const link = d.querySelector(selector); assert(link, selector);
    const navigated = new Promise(resolve => d.addEventListener('fmf-nav',resolve,{once:true}));
    link.dispatchEvent(new w.MouseEvent('click', {bubbles:true, cancelable:true, button:0}));
    await navigated; assert.equal(w.location.pathname, expected); assert(d.querySelector('header.top'));
  }
  await click('nav a[href$="guides/"]', '/guides/');
  await click('nav a[href$="creations/"]', '/creations/');
  await click('nav a[href$="settings/"]', '/settings/');
  await click('nav a[href$="account/"]', '/account/');
  await click('header.top .get', '/');
  assert.equal(w.location.hash, '#download'); assert(scrolled.includes('download'));
  assert.deepEqual(loaded, ['/guides/', '/creations/', '/settings/', '/account/', '/']);
  dom.window.close();
  console.log(`Header links and controls checked across ${pages.length} pages; navigation and Download simulated`);
})().catch(error => { console.error(error); process.exitCode=1; });
