// Run after npm run build in website/ (tests the actual bundled script).
const assert = require('assert'), vm = require('vm'), fs = require('fs');
const attrs = {'data-theme':'livesky','data-background':'on'}, nodes=[], listeners = {}, storage={};
const root = {getAttribute:k=>attrs[k]||null, setAttribute:(k,v)=>attrs[k]=v, removeAttribute:k=>delete attrs[k]};
function element(){return {style:{},events:{},setAttribute(k,v){this[k]=v},addEventListener(k,f){this.events[k]=f},removeEventListener(k){delete this.events[k]},remove(){this.removed=true}}}
const path=element(),sun=element(),moon=element(),use=element(),forget=element(),status=element();
const document = {documentElement:root, body:{firstChild:null, insertBefore(el){nodes.push(el)}}, createElement(){const el=element(); el.querySelector=s=>s==='path'?path:s==='.fmf-live-sun'?sun:moon;return el},getElementById(id){return {'live-sky-use-location':use,'live-sky-forget-location':forget,'live-sky-location-status':status}[id]||null},addEventListener(k,f){listeners[k]=f},removeEventListener(k){delete listeners[k]}};
let callback, intervalCount=0, cleared=0, prompt=0, resolveLocation, rejectLocation;
class Observer { constructor(fn){callback=fn} observe(){} disconnect(){} }
class Clock extends Date { constructor(...args){super(...(args.length ? args : ['2024-03-20T12:00:00Z']))} getHours(){return 12} }
const navigator={geolocation:{getCurrentPosition(ok,fail){prompt++;resolveLocation=ok;rejectLocation=fail}}};
const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v,removeItem:k=>delete storage[k]};
const window = {}, sandbox={window,document,navigator,localStorage,MutationObserver:Observer,Date:Clock,setInterval(){intervalCount++;return 1},clearInterval(){cleared++}};
vm.runInNewContext(fs.readFileSync('website/public/livesky.bundle.js','utf8'),sandbox);
assert.equal(attrs['data-live-sky'],'day'); assert.equal(intervalCount,1); assert(path.d.startsWith('M50 4')); assert.equal(prompt,0,'no location request without user action');
const api=window.FMFLiveSky; assert(api.phase(new Date('2024-04-08T18:21:00Z')) < .02 || api.phase(new Date('2024-04-08T18:21:00Z')) > .98);
const greenwich=api.calculate(new Date('2024-03-20T12:00:00Z'),51.5,0); assert.equal(greenwich.stage,'day'); assert(greenwich.sunVisible); assert(greenwich.sun.altitude > .5);
const midnight=api.calculate(new Date('2024-03-20T00:00:00Z'),51.5,0); assert.equal(midnight.stage,'night'); assert(!midnight.sunVisible);
assert.notEqual(api.moonPath(0),api.moonPath(.5));
use.events.click(); assert.equal(prompt,1); resolveLocation({coords:{latitude:29.98765,longitude:31.23456}});
assert.deepEqual(JSON.parse(storage['fmf-live-sky-location-v1']),{lat:29.99,lon:31.23}); assert(status.textContent.includes('saved')); assert(sun.style.left.endsWith('%')); assert(['on','off'].includes(attrs['data-live-moon']));
use.events.click(); forget.events.click(); resolveLocation({coords:{latitude:0,longitude:0}}); assert.equal(storage['fmf-live-sky-location-v1'],undefined,'late location result ignored');
use.events.click(); rejectLocation(); assert(status.textContent.includes('denied'));
attrs['data-background']='off'; callback(); assert.equal(nodes[0].hidden,true); assert.equal(attrs['data-live-sky'],undefined); assert.equal(cleared,1);
attrs['data-background']='on'; attrs['data-theme']='dark'; callback(); assert.equal(nodes[0].hidden,true);
attrs['data-theme']='livesky'; callback(); assert.equal(nodes[0].hidden,false); assert.equal(intervalCount,2);
window.__fmfLiveSkyStop(); assert.equal(nodes[0].removed,true); assert.equal(cleared,2);
console.log('Live Sky astronomy, permission, privacy, fallback and cleanup passed');
