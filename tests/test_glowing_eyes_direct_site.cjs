// Run after website/build.mjs: the built site must contain the exact published files.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const entries = JSON.parse(fs.readFileSync('website/glowing-eyes-experimental.json', 'utf8'));
for (const entry of entries) {
  const input = fs.readFileSync(path.join('website/downloads/glowing-eyes', entry.file));
  const output = fs.readFileSync(path.join('website/public/downloads/glowing-eyes', entry.file));
  assert.deepEqual(output, input);
  assert.equal(crypto.createHash('sha256').update(output).digest('hex'), entry.sha256);
}
const source = 'glowing-eyes-experimental-source.zip';
assert.deepEqual(fs.readFileSync(path.join('website/public/downloads/glowing-eyes', source)), fs.readFileSync(path.join('website/downloads/glowing-eyes', source)));
console.log('All direct experimental JARs and their source ZIP are present in the built site');
