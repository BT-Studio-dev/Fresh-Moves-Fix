const assert = require('assert'), vm = require('vm'), fs = require('fs');
const attrs = {'data-theme':'livesky','data-background':'on'}, path = {setAttribute(k,v){this[k]=v}}, nodes=[];
const root = {getAttribute:k=>attrs[k]||null, setAttribute:(k,v)=>attrs[k]=v, removeAttribute:k=>delete attrs[k]};
const document = {documentElement:root, body:{firstChild:null, insertBefore(el){nodes.push(el)}}, createElement(){return {setAttribute(){},querySelector(){return path},remove(){this.removed=true}}}, addEventListener(){},removeEventListener(){}};
let callback, intervalCount=0, cleared=0;
class Observer { constructor(fn){callback=fn} observe(){} disconnect(){} }
class Clock extends Date { constructor(...args){super(...(args.length ? args : ['2024-04-08T12:00:00Z']))} getHours(){return 12} }
const window = {}, sandbox={window,document,MutationObserver:Observer,Date:Clock,setInterval(){intervalCount++;return 1},clearInterval(){cleared++}};
vm.runInNewContext(fs.readFileSync('website/livesky.js','utf8'),sandbox);
assert.equal(attrs['data-live-sky'],'day'); assert.equal(intervalCount,1); assert(path.d.startsWith('M50 4'));
const api=window.FMFLiveSky; assert(api.phase(new Date('2000-01-06T18:14:00Z')) < 1e-8);
assert(Math.abs(api.phase(new Date('2000-01-21T12:36:00Z'))-.5)<.002);
assert.notEqual(api.moonPath(0),api.moonPath(.5));
attrs['data-background']='off'; callback(); assert.equal(nodes[0].hidden,true); assert.equal(attrs['data-live-sky'],undefined); assert.equal(cleared,1);
attrs['data-background']='on'; attrs['data-theme']='dark'; callback(); assert.equal(nodes[0].hidden,true);
attrs['data-theme']='livesky'; callback(); assert.equal(nodes[0].hidden,false); assert.equal(intervalCount,2);
window.__fmfLiveSkyStop(); assert.equal(nodes[0].removed,true); assert.equal(cleared,2);
console.log('Live Sky local time, lunar phase, background toggle and cleanup passed');
