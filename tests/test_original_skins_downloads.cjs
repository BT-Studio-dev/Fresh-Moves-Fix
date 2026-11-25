const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const release = JSON.parse(fs.readFileSync('minecraft-skins/original-release-request.json', 'utf8'));
const doc = new JSDOM(fs.readFileSync('website/public/index.html', 'utf8'), {url: 'https://example.com/'}).window.document;
const section = doc.getElementById('minecraft-skins-download');
assert(section);
assert.match(section.textContent, /not been tested in Minecraft/);
assert.match(section.textContent, /visible only to you/);
const cards = [...section.querySelectorAll('.versions a.ver')];
assert.equal(cards.length, release.versions.length);
for (const version of release.versions) {
  const url = `https://github.com/BT-Studio-dev/Fresh-Moves-Fix/releases/download/${release.tag}/minecraft-skins-fabric-${version}.jar`;
  assert(cards.some(a => a.href === url), `missing exact release JAR ${version}`);
}
assert(!section.querySelector('a[href*="/downloads/minecraft-skins/"]'), 'historical upstream jars must not be linked as original');
console.log('Original Minecraft Skins prerelease links and warnings passed');
