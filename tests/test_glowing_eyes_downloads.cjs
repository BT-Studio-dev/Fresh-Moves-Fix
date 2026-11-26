const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('../website/node_modules/jsdom');
const metadata = JSON.parse(fs.readFileSync('website/glowing-eyes-release.json','utf8'));
const d = new JSDOM(fs.readFileSync('website/public/editor/index.html','utf8')).window.document;
const card = d.getElementById('glowing-eyes-downloads');
assert(card, 'downloads are alongside the skin editor');
assert.equal(metadata.integrationBuild, '1.16.0');
assert.equal(metadata.modVersion, '2.1.3'); assert.equal(metadata.minecraftVersion, '1.21.11');
assert.match(card.textContent, /integration build 1\.16\.0/);
assert.match(card.textContent, /Glowing Eyes 2\.1\.3/); assert.match(card.textContent, /Minecraft Java 1\.21\.11/);
assert.match(card.textContent, /hosted by Modrinth, not built or hosted by Fresh Moves Fix/);
assert.match(card.textContent, /not downloaded or independently verified/); assert.match(card.textContent, /Fabric API/);
assert.equal(metadata.artifacts.length,2);
for (const artifact of metadata.artifacts) {
 assert.match(artifact.sha512,/^[0-9a-f]{128}$/);
 const url = new URL(artifact.url); assert.equal(url.hostname,'cdn.modrinth.com'); assert.equal(url.pathname.split('/').at(-1),artifact.filename);
 const link = [...card.querySelectorAll('a')].find(a => a.href === artifact.url);
 assert(link, `direct ${artifact.loader} JAR link exists`); assert.match(link.textContent,/JAR/);
 assert([...card.querySelectorAll('a')].some(a=>a.href===artifact.versionPage),'official version page exists');
 assert(card.textContent.includes(artifact.sha512),'published checksum shown');
}
assert(d.querySelector('a[href="#glowing-eyes-downloads"]'),'tool links to the download card');
assert(d.querySelector('#gl-grid') && d.querySelector('#rx-grid'),'existing mod tools remain present');
console.log('Glowing Eyes official artifact links, versions, checksums and provenance passed');
