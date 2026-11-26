const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('../website/node_modules/jsdom');
const root = path.resolve('website/public');
const pages = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'index.html' || entry.name === '404.html') pages.push(file);
  }
}
walk(root);
assert(pages.length > 10, 'build the website before checking generated pages');
let cards = 0;
for (const page of pages) {
  const relative = path.relative(root, page).replace(/index\.html$/, '');
  const dom = new JSDOM(fs.readFileSync(page, 'utf8'), { url: `https://example.test/${relative}` });
  const doc = dom.window.document;
  assert(doc.querySelector('link[rel="stylesheet"][href*="refresh-2027.css?v="]'), `${relative}: refresh stylesheet missing`);
  assert.equal(doc.querySelector('footer .design-edition')?.textContent, '2027 design edition');
  for (const a of doc.querySelectorAll('a.card[href], a.tool[href], a.project-card[href], .versions a[href]')) {
    cards++;
    assert(a.textContent.trim() || a.querySelector('img[alt]') || a.getAttribute('aria-label'), `${relative}: card has no accessible label`);
    const target = new URL(a.getAttribute('href'), dom.window.location.href);
    if (target.origin !== 'https://example.test') continue;
    let targetPath = path.join(root, decodeURIComponent(target.pathname));
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) targetPath = path.join(targetPath, 'index.html');
    assert(fs.existsSync(targetPath), `${relative}: card link ${a.getAttribute('href')} does not exist`);
  }
  dom.window.close();
}
assert(cards > 50, 'expected to check cards throughout the website');
const css = fs.readFileSync(path.join(root, 'refresh-2027.css'), 'utf8');
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /data-theme="minecraft"/);
assert.match(css, /:focus-visible/);
const editor = new JSDOM(fs.readFileSync(path.join(root, 'editor/index.html'), 'utf8')).window.document;
const experimental = editor.getElementById('glow-experimental-title').parentElement;
assert.match(experimental.textContent, /Unofficial experimental builds/);
assert.match(experimental.textContent, /1\.20\.5 and 1\.20\.6/);
assert.match(experimental.textContent, /not been tested in Minecraft/);
assert.match(experimental.textContent, /port is unfinished/);
assert.match(experimental.textContent, /26\.1, 26\.1\.1, 26\.1\.2/);
assert.match(experimental.textContent, /26\.2 and 26\.3/);
assert(experimental.querySelector('a[href="https://github.com/BT-Studio-dev/Fresh-Moves-Fix/actions/runs/45896822544"]'));
assert.match(experimental.textContent, /expire after 7 days/);
assert(experimental.querySelector('a[href="https://github.com/BT-Studio-dev/Fresh-Moves-Fix/actions/runs/45853964289"]'));
console.log(`2027 design shell and ${cards} card links across ${pages.length} pages passed; experimental status is clearly labeled`);
