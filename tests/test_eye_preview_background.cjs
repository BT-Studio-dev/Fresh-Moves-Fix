const assert = require('assert'), fs = require('fs'), vm = require('vm');
const text=fs.readFileSync('website/editor.js','utf8');
const fn=text.slice(text.indexOf('  function previewPicture(source)'),text.indexOf('  blobLink($("msg3d")'));
let ops=[], output={getContext(){return {set fillStyle(v){ops.push(['colour',v])},fillRect(...v){ops.push(['fill',...v])},drawImage(...v){ops.push(['draw',...v])}}}};
let colour='rgb(33, 110, 245)';const box={document:{createElement(){return output}},getComputedStyle(){return {backgroundColor:colour}}};vm.runInNewContext(fn+';this.picture=previewPicture;',box);
const original={width:420,height:520};assert.equal(box.picture(original),output);assert.deepEqual(ops,[['colour',colour],['fill',0,0,420,520],['draw',original,0,0]]);ops=[];colour='rgba(0, 0, 0, 0)';box.picture(original);assert.deepEqual(ops,[['draw',original,0,0]]);console.log('Eye preview picture composites backdrop without altering skin (mocked canvas)');
