const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const html = fs.readFileSync('website/public/guides/fix-black-eyes/index.html','utf8');
const script = fs.readFileSync('website/guide-video.js','utf8');
function setup(off) {
  const dom = new JSDOM(html,{url:'https://example.test/guides/fix-black-eyes/',runScripts:'outside-only'});
  const w=dom.window, d=w.document, v=d.querySelector('figure.video-card video'), status=d.querySelector('[data-guide-video-status]');
  assert(v && status); if(off) w.localStorage.setItem('fmf-guide-video','off');
  let paused=true, count=0;
  Object.defineProperty(v,'paused',{get(){return paused}}); v.pause=()=>{paused=true; count++};
  w.eval(script); w.eval(script);
  return {dom,w,d,v,status,playing(){paused=false;v.dispatchEvent(new w.Event('play'))},get pauses(){return count}};
}
const t=setup(false);
assert(t.v.controls && t.status.hidden); assert.equal(t.v.getAttribute('preload'),'none');
t.v.dispatchEvent(new t.w.Event('loadstart')); assert.match(t.status.textContent,/Loading/);
t.v.dispatchEvent(new t.w.Event('canplay')); assert(t.status.hidden);
t.v.dispatchEvent(new t.w.Event('error')); assert.match(t.status.textContent,/GitHub/);
t.playing(); t.d.dispatchEvent(new t.w.CustomEvent('fmf-guide-video-change',{detail:{enabled:false}}));
assert.equal(t.pauses,1); assert(!t.v.controls); assert.match(t.status.textContent,/off in settings/);
t.playing(); assert.equal(t.pauses,2, 'play is stopped while disabled');
t.d.dispatchEvent(new t.w.CustomEvent('fmf-guide-video-change',{detail:{enabled:true}})); assert(t.v.controls && t.status.hidden);
t.dom.window.close();
const persisted=setup(true); assert(!persisted.v.controls); assert.match(persisted.status.textContent,/off in settings/); persisted.dom.window.close();
console.log('Guide video native controls, off setting, loading and error fallback passed (mocked media)');
