const assert = require('node:assert/strict');
const fs = require('node:fs');

for (const [suffix, targets, java] of [
  ['120', ['1.20.5', '1.20.6'], 21],
  ['26', ['26.1', '26.1.1', '26.1.2', '26.2', '26.3'], 25],
]) {
  const workflow = fs.readFileSync(`.github/workflows/glowing-eyes-${suffix}.yml`, 'utf8');
  const gradle = fs.readFileSync(`glowing-eyes-fabric-${suffix}/build.gradle`, 'utf8');
  const metadata = JSON.parse(fs.readFileSync(`glowing-eyes-fabric-${suffix}/src/main/resources/fabric.mod.json`, 'utf8'));
  const notice = fs.readFileSync(`glowing-eyes-fabric-${suffix}/NOTICE.md`, 'utf8');
  assert.deepEqual([...workflow.matchAll(/minecraft: '([^']+)'/g)].map(x => x[1]), targets);
  assert.match(workflow, /fail-fast: false/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /if-no-files-found: error/);
  assert(workflow.indexOf('Check artifact metadata') < workflow.indexOf('actions/upload-artifact'));
  assert.match(workflow, /depends'\]\['minecraft'\] == '=' \+ version/);
  assert.match(workflow, new RegExp(`java-version: '${java}'`));
  assert.match(gradle, /project\.minecraft_version/);
  assert.match(gradle, /experimental\.jar/);
  assert.equal(metadata.id, '${mod_id}');
  assert.equal(metadata.depends.minecraft, '=${minecraft_version}');
  assert.equal(metadata.depends.java, '>=${java_version}');
  assert.match(notice, /unofficial/i);
  assert.match(notice, /LGPL-3\.0/);
  assert(fs.existsSync(`glowing-eyes-fabric-${suffix}/LICENSE`));
}
console.log('Experimental Glowing Eyes Fabric target matrices, artifact gates and provenance passed');
