const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('../website/node_modules/jsdom');

const root = 'website/public';
const site = 'https://fresh-moves-fix.vercel.app/';
const excluded = new Set(['404.html', 'account/index.html', 'messages/index.html', 'profiles/index.html', 'settings/index.html']);
function* htmlFiles(dir = '') {
  for (const ent of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, ent.name);
    if (ent.isDirectory()) yield* htmlFiles(rel);
    else if (rel.endsWith('.html')) yield rel;
  }
}
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.match(robots, /User-agent: \*\nAllow: \/\n/);
assert(robots.includes(`Sitemap: ${site}sitemap.xml`));
const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemap = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
assert.equal(sitemap.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
const locs = [...sitemap.getElementsByTagName('loc')].map(el => el.textContent);
assert.equal(locs.length, new Set(locs).size, 'sitemap URLs are unique');
const expected = [];
for (const rel of htmlFiles()) {
  // Search Console's verification file is a plain-text token with an .html
  // extension, not an indexable site page or part of the sitemap.
  if (rel === 'google5091c15ca9dc0202.html') continue;
  const doc = new JSDOM(fs.readFileSync(path.join(root, rel), 'utf8')).window.document;
  const canonical = doc.querySelector('link[rel="canonical"]');
  const noindex = doc.querySelector('meta[name="robots"]');
  if (excluded.has(rel)) {
    assert(noindex && /noindex/.test(noindex.content), `${rel} is noindex`);
    assert(!canonical, `${rel} has no canonical to an indexable page`);
    continue;
  }
  const url = new URL(rel === 'index.html' ? '' : rel.replace(/index\.html$/, ''), site).href;
  expected.push(url);
  assert.equal(canonical?.href, url, `${rel} canonical`);
  assert.equal(doc.querySelector('meta[property="og:url"]')?.content, url);
  assert(!noindex || !/noindex/i.test(noindex.content), `${rel} remains indexable`);
  assert(doc.title && doc.querySelector('meta[name="description"]')?.content, `${rel} title and description`);
}
assert.deepEqual(locs.sort(), expected.sort(), 'sitemap contains exactly the public generated pages');
assert(locs.includes(site));
assert(locs.includes(site + 'guides/'));
assert(locs.includes(site + 'editor/'));
console.log(`SEO metadata, robots and sitemap checked for ${locs.length} public pages`);
