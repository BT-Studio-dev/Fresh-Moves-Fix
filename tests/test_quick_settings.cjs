// cd website && npm ci && npm run build, then node tests/test_quick_settings.cjs
const assert = require('assert');
const fs = require('fs');
const { JSDOM } = require('../website/node_modules/jsdom');
const source = fs.readFileSync('website/enhancements.js','utf8');
const dom = new JSDOM('<!doctype html><html data-theme="dark"><body><header class="top"><div class="bar"><a class="get"></a></div></header><main></main><label><input type="radio" name="theme" value="glass"></label><input id="settings-glass-blur" type="checkbox"></body></html>', {url:'https://example.com/',runScripts:'outside-only'});
const {window:w}=dom; w.matchMedia=()=>({matches:false}); w.requestAnimationFrame=f=>f(); w.scrollTo=()=>{};
w.eval(source);
const $=s=>w.document.querySelector(s), change=el=>el.dispatchEvent(new w.Event('change',{bubbles:true}));
const panel=$('.fmf-settings'), toggle=$('.fmf-settings-toggle'); toggle.click(); assert(!panel.hidden); assert.equal(toggle.getAttribute('aria-expanded'),'true');
const theme=$('[data-fmf-theme]'), blur=$('[data-fmf-glass-blur]'), size=$('[data-fmf-size]'), contrast=$('[data-fmf-contrast]'), motion=$('[data-fmf-motion]');
assert(blur.disabled); theme.value='glass'; change(theme); assert.equal(w.document.documentElement.getAttribute('data-theme'),'glass'); assert.equal(w.localStorage.getItem('fmf-theme'),'glass'); assert(!blur.disabled); assert(w.document.documentElement.classList.contains('fmf-glass-blur')); assert($('input[name="theme"]').checked);
blur.checked=false; change(blur); assert.equal(w.localStorage.getItem('fmf-glass-blur'),'0'); assert(!w.document.documentElement.classList.contains('fmf-glass-blur')); assert(!$('#settings-glass-blur').checked);
size.value='large'; change(size); assert(w.document.body.classList.contains('fmf-reading')); assert.equal(w.localStorage.getItem('fmf-extra-size'),'large');
contrast.checked=true; change(contrast); motion.checked=true; change(motion); assert(w.document.body.classList.contains('fmf-contrast')); assert(w.document.body.classList.contains('fmf-motion-off')); assert.equal(w.localStorage.getItem('fmf-extra-contrast'),'1'); assert.equal(w.localStorage.getItem('fmf-extra-motion'),'1');
w.eval(source); assert($('[data-fmf-contrast]').checked); assert($('[data-fmf-motion]').checked); assert.equal($('[data-fmf-size]').value,'large'); assert(!$('[data-fmf-glass-blur]').checked);
$('.fmf-settings-toggle').click(); $('.fmf-close').click(); assert($('.fmf-settings').hidden);
// Removed menu choices must not reset a previously saved theme.
w.localStorage.setItem('fmf-theme','livesky'); w.document.documentElement.setAttribute('data-theme','livesky'); w.eval(source);
assert.equal(w.document.documentElement.getAttribute('data-theme'),'livesky'); assert.equal(w.localStorage.getItem('fmf-theme'),'livesky');
assert.equal(w.document.querySelector('[data-fmf-theme]').value,'');
assert(!Array.from(w.document.querySelectorAll('.fmf-choice-list button')).some(b => /^(Minecraft|Night Sky|Live Sky)$/.test(b.textContent)));
const radio = w.document.createElement('input'); radio.type='radio'; radio.name='theme'; radio.value='nightsky'; w.document.body.appendChild(radio);
w.document.documentElement.setAttribute('data-theme','nightsky'); w.localStorage.setItem('fmf-theme','nightsky'); change(radio);
assert.equal(w.localStorage.getItem('fmf-theme'),'nightsky'); assert.equal(w.document.documentElement.getAttribute('data-theme'),'nightsky');
console.log('Quick settings controls, persistence, navigation and sync passed');
