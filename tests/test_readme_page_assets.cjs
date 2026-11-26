const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { marked } = require('../website/node_modules/marked');
const { JSDOM } = require('../website/node_modules/jsdom');
const readme = fs.readFileSync('README.md', 'utf8');
const rendered = new JSDOM(marked.parse(readme)).window.document;
const images = [...readme.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
const pageFiles = fs.readdirSync('.github/page').filter(x => x.endsWith('.png')).sort();
assert.equal(pageFiles.length, 14, 'the README image set should contain 14 separate PNGs');
for (const [file, label, url] of [
  ['required-emf.png', 'Entity Model Features (EMF)', 'https://modrinth.com/mod/entity-model-features'],
  ['required-etf.png', 'Entity Texture Features (ETF)', 'https://modrinth.com/mod/entitytexturefeatures'],
]) {
  assert(readme.includes(`](.github/page/${file})](${url})`), `${file} should link to its own official mod page`);
  assert.equal(rendered.querySelector(`img[src=".github/page/${file}"]`)?.closest('a')?.href, url, `${file} must render as a clickable link`);
  assert(readme.includes(`[${label}](${url})`), `${file} also needs a text link`);
}
for (const [, alt, target] of images) {
  assert(alt.trim(), `${target} needs meaningful alt text`);
  assert(fs.existsSync(target), `${target} is missing`);
}
for (const file of pageFiles) {
  const image = `.github/page/${file}`;
  assert(images.some(([, , target]) => target === image), `${image} is not used in README`);
  const bytes = fs.readFileSync(image);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${image} is not a PNG`);
  assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0, `${image} has invalid dimensions`);
}
for (const target of ['https://github.com/BT-Studio-dev/Fresh-Moves-Fix/releases', 'https://fresh-moves-fix.vercel.app/editor/', 'docs/Home.md']) {
  assert(readme.includes(`](${target})`), `${target} link is missing`);
}
assert.match(readme, /not in-game screenshots/);
assert.match(readme, /without unzipping/);
console.log(`README uses all ${pageFiles.length} designed page images, with alt text and working local files`);
