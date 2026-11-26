// Audits local references in the generated website, not external services or runtime links.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('../website/node_modules/jsdom');
const root = path.resolve('website/public');
function files(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []); }
let assets = 0, links = 0;
const pages = files(root);
for (const file of pages) {
  const rel = path.relative(root,file).replace(/index\.html$/, '');
  const dom = new JSDOM(fs.readFileSync(file,'utf8'),{url:'https://example.test/'+rel});
  const d = dom.window.document;
  for (const el of d.querySelectorAll('img[src], script[src], link[rel="stylesheet"][href], video[poster], video[data-src], a[href]')) {
    const raw = el.getAttribute(el.tagName === 'A' || el.tagName === 'LINK' ? 'href' : el.tagName === 'VIDEO' ? (el.getAttribute('data-src') ? 'data-src' : 'poster') : 'src');
    if (!raw || raw.startsWith('#') || raw.startsWith('data:')) continue;
    let url; try { url = new URL(raw, dom.window.location.href); } catch (_) { throw new Error(`${rel}: invalid URL ${raw}`); }
    if (url.origin !== 'https://example.test') continue;
    let target = path.join(root, decodeURIComponent(url.pathname));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target,'index.html');
    assert(fs.existsSync(target), `${rel}: missing ${raw}`);
    if (el.tagName === 'A') links++; else assets++;
  }
  dom.window.close();
}
assert(pages.length > 10 && links > 100 && assets > 100);
console.log(`${links} local links and ${assets} local assets checked across ${pages.length} generated pages`);
