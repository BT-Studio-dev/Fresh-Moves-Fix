const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const html = fs.readFileSync('website/public/index.html', 'utf8');
const doc = new JSDOM(html).window.document;
const main = doc.querySelector('main#main');
assert(main, 'the homepage provides a main landmark before JavaScript runs');
assert.equal(doc.querySelectorAll('main').length, 1);
assert(main.querySelector('h1'), 'the primary heading belongs to the main landmark');
assert(main.querySelector('#download'), 'the download section belongs to the main landmark');
const headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(el => !el.closest('[hidden]'));
let previous = 0;
for (const heading of headings) {
  const current = Number(heading.tagName[1]);
  assert(current <= previous + 1, `heading level skipped at ${heading.textContent.trim()}`);
  previous = current;
}
const footerHeadings = [...doc.querySelectorAll('footer .cols h2')];
assert.deepEqual(footerHeadings.map(h => h.textContent.trim()), ['Pack', 'Skins', 'Required mods', 'Resources']);
assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://fresh-moves-fix.vercel.app/');
console.log('Homepage landmark and visible heading order passed');
