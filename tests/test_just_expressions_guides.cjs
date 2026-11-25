const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const index = new JSDOM(fs.readFileSync('website/public/guides/index.html', 'utf8'), {url:'https://example.com/guides/'}).window.document;
const cards = [...index.querySelectorAll('a[href^="just-expressions/"]')];
assert.equal(cards.length, 24, 'each Just Expressions guide has a card');
for (const card of cards) {
  assert(!card.target, 'guide opens on the website');
  const folder = card.getAttribute('href');
  const file = 'website/public/guides/' + folder + 'index.html';
  assert(fs.existsSync(file), file);
  const doc = new JSDOM(fs.readFileSync(file, 'utf8'), {url:new URL(folder, 'https://example.com/guides/').href}).window.document;
  assert(doc.querySelector('.je-guide-prose'), folder);
  assert(doc.querySelector('a[href^="https://github.com/IthanMendoza/Just-Expressions/wiki/"]'), 'credit and link upstream');
  assert.match(doc.body.textContent, /not all been verified for Fresh Moves Fix/);
  assert.equal(doc.querySelector('.guide-cta a').href, 'https://example.com/editor/');
  assert.equal(doc.querySelector('.guide-cta a + a').href, 'https://example.com/guides/');
  for (const link of doc.querySelectorAll('.guide-nav a')) assert(fs.existsSync('website/public' + new URL(link.href).pathname + 'index.html'), link.href);
  if (!folder.includes('universal-mask')) assert(doc.querySelector('.je-guide-prose img'), `${folder} has illustrations`);
}
const read = (name) => fs.readFileSync(`website/public/guides/just-expressions/${name}/index.html`, 'utf8');
assert(read('standard-2x1-eyes').includes('Bottom Standard Eyes'));
assert(!read('standard-2x1-eyes').includes('Bottom Derp Eyes'));
assert(read('far-set-derp-2x1-eyes').includes('Bottom Far-set Derp Eyes'));
assert(read('second-layer-eyebrows').includes('Bottom 2nd Layer Eyebrows'));
console.log('All 24 local Just Expressions guide cards and source credits passed');
