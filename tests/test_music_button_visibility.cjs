// Run after website build; exercises the real boot and settings scripts.
const {JSDOM, VirtualConsole}=require('../website/node_modules/jsdom'), fs=require('fs'), assert=require('assert');
const settings=fs.readFileSync('website/public/settings/index.html','utf8'), home=fs.readFileSync('website/public/index.html','utf8');
function load(html, saved) {
  const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(e));
  const dom=new JSDOM(html,{url:'https://example.com/settings/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){ w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}}); if(saved) for(const [k,v] of Object.entries(saved)) w.localStorage.setItem(k,v); }});
  assert.deepEqual(errors,[]); return dom.window;
}
let w=load(settings); let root=w.document.documentElement, control=w.document.getElementById('music-button-visibility');
assert(control.checked); assert.equal(root.getAttribute('data-music-button'),'on');
assert(!w.document.querySelector('input[name="theme"][value="livesky"]')); assert(!w.document.querySelector('.live-sky-settings'));
w.localStorage.setItem('fmf-music','on'); control.checked=false; control.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(root.getAttribute('data-music-button'),'off'); assert.equal(w.localStorage.getItem('fmf-show-music-button'),'off'); assert.equal(w.localStorage.getItem('fmf-music'),'on','hiding button does not pause music');
let next=load(home,{'fmf-show-music-button':'off','fmf-theme':'livesky'}); assert.equal(next.document.documentElement.getAttribute('data-music-button'),'off'); assert.equal(next.document.documentElement.getAttribute('data-theme'),'livesky','saved themes preserved');
w=load(settings,{'fmf-show-music-button':'off'}); control=w.document.getElementById('music-button-visibility'); assert(!control.checked); control.checked=true;control.dispatchEvent(new w.Event('change',{bubbles:true})); assert.equal(w.document.documentElement.getAttribute('data-music-button'),'on');assert.equal(w.localStorage.getItem('fmf-show-music-button'),'on');
assert(fs.readFileSync('website/style.css','utf8').includes('html[data-music-button="off"] header.top .snd-wrap { display: none; }'));
console.log('Music button visibility defaults, persistence, navigation and player independence passed');
