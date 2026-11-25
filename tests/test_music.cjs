// Simulates Web Audio and DOM events; it does not play sound or test real devices.
const assert = require('assert'), vm = require('vm'), fs = require('fs');
const source = fs.readFileSync('website/music.js','utf8');
const songs = [
  ['calm','Calm',214,'3:34'], ['minecraft','Minecraft',360,'6:00'],
  ['fresh','Fresh Moves Fix',160,'2:40'], ['night','Night Sky',192,'3:12'],
  ['end','The End',240,'4:00'], ['left','Player Left',200,'3:20'],
  ['horizon','Quiet Horizons',216,'3:36'], ['fading','Fading Lights',228,'3:48']
];
function createPlayer(saved = {}) {
  const handlers = {}, storage = {...saved}, intervals = [], oscillators = [], gainNodes = [];
  class Param {
    constructor(){ this.value=0; this.target=null; }
    setValueAtTime(v){ assert(Number.isFinite(v)); this.value=v; }
    exponentialRampToValueAtTime(v){ assert(Number.isFinite(v) && v>0); }
    setTargetAtTime(v){ assert(Number.isFinite(v) && v>=0); this.target=v; }
    linearRampToValueAtTime(v,t){ assert(Number.isFinite(v) && Number.isFinite(t)); this.ramp={value:v,time:t}; }
    cancelScheduledValues(){} cancelAndHoldAtTime(){}
  }
  class Gain {
    constructor(){this.gain=new Param(); this.connections=[]; gainNodes.push(this);}
    connect(node){this.connections.push(node)} disconnect(){}
  }
  class Oscillator {
    constructor(){this.frequency=new Param(); this.connections=[]; this.stops=[]; oscillators.push(this)}
    connect(node){this.connections.push(node)} disconnect(){}
    start(t){assert(Number.isFinite(t));this.started=t;this.hz=this.frequency.value}
    stop(t){assert(Number.isFinite(t));this.stops.push(t)}
  }
  let context;
  class AudioContext {
    constructor(){context=this;this.currentTime=0;this.state='running';this.destination={};}
    createGain(){return new Gain()} createOscillator(){return new Oscillator()}
    resume(){this.state='running'} suspend(){this.state='suspended'}
  }
  const radios=songs.map(([value])=>({value,checked:false,matches(s){return s==='[data-music-song]'}}));
  const volumes=[0,1].map(()=>({value:'',attributes:{},matches(s){return s==='[data-music-volume]'},setAttribute(k,v){this.attributes[k]=v}}));
  const outputs=[{textContent:''},{textContent:''}], name={textContent:''}, time={textContent:''}, check={checked:false}, seekControl={value:'0',setAttribute(){},matches(s){return s==='[data-music-seek]'}};
  const document={readyState:'complete', addEventListener(k,f){(handlers[k] ||= []).push(f)}, removeEventListener(){},querySelectorAll(s){return ({'[data-music-song]':radios,'[data-music-volume]':volumes,'[data-music-volume-value]':outputs,'[data-music-name]':[name],'[data-music-time]':[time],'[data-music-check]':[check],'[data-music-seek]':[seekControl]})[s]||[]}};
  const sandbox={window:{AudioContext},document,localStorage:{getItem:k=>Object.hasOwn(storage,k)?storage[k]:null,setItem:(k,v)=>storage[k]=v},setInterval(f,ms){intervals.push({f,ms,active:true});return intervals.length},clearInterval(id){if(intervals[id-1]) intervals[id-1].active=false},setTimeout(){},Math,Set,isFinite};
  vm.runInNewContext(source,sandbox);
  function fire(type,target){(handlers[type]||[]).forEach(f=>f({target}));}
  function choose(id){ const r=radios.find(r=>r.value===id); r.checked=true; fire('click',r); fire('change',r); }
  function volume(v,event='input'){volumes[0].value=String(v);fire(event,volumes[0]);}
  function play(on){fire('change',{checked:on,matches(s){return s==='[data-music-check]'}})}
  function navigate(){fire('fmf-nav',{});}
  function seek(v){seekControl.value=String(v);fire('input',seekControl);}
  function gesture(){fire('pointerdown',{});}
  function tick(ms){intervals.filter(i=>i.ms===ms && i.active).forEach(i=>i.f())}
  return {storage,oscillators,gainNodes,volumes,outputs,name,time,check,choose,volume,play,navigate,seek,gesture,tick,get context(){return context}};
}
for (const [id, name, seconds, duration] of songs) {
  const p=createPlayer({ 'fmf-volume':'50' });
  p.choose(id); assert(!p.context,`${name}: selecting a song does not turn on music`); p.play(true);
  assert(p.context,`${name}: audio context created`); assert(p.oscillators.length>0,`${name}: notes scheduled`);
  const master=p.gainNodes[0]; assert(master.connections.includes(p.context.destination),`${name}: master connected to output`);
  for(let v=0;v<=100;v++) {
    p.volume(v); assert.equal(master.gain.target,v/100,`${name}: gain at ${v}%`);
    assert.equal(p.storage['fmf-volume'],String(v)); assert(p.volumes.every(s=>Number(s.value)===v)); assert(p.outputs.every(s=>s.textContent===v+'%'));
  }
  p.volume(50,'change'); assert.equal(master.gain.target,.5,`${name}: 50% change event`);
  p.tick(500); assert.equal(p.time.textContent,`0:00 / ${duration}`,`${name}: displayed length`); assert.equal(p.name.textContent,name);
  const first=p.oscillators[0]; const firstTime=first.started, firstHz=first.hz;
  p.context.currentTime=firstTime+61.1; p.tick(500); assert.equal(p.time.textContent,`1:01 / ${duration}`,`${name}: elapsed progress`);
  p.navigate(); assert.equal(p.name.textContent,name,`${name}: navigation keeps song`); assert.equal(p.storage['fmf-music'],'on');
  for (let t=0; t<seconds+.1; t+=.2) { p.context.currentTime=t; p.tick(200); }
  const endTime=firstTime+seconds, bus=first.connections[0].connections[0];
  assert.equal(bus.gain.ramp.value,0,`${name}: end fade`); assert(Math.abs(bus.gain.ramp.time-endTime)<1e-7);
  for(const o of p.oscillators) {
    assert.equal(o.connections.length,1,`${name}: oscillator has one output`);
    const voiceGain=o.connections[0], voiceBus=voiceGain.connections[0]; assert(voiceGain.connections.length===1 && voiceBus.connections.length===1 && voiceBus.connections[0]===master,`${name}: voice cannot bypass master volume`);
    assert(o.started < endTime && o.stops[0] <= endTime,`${name}: no notes past the end`);
  }
  p.context.currentTime=endTime+.01; p.tick(200); p.tick(500);
  assert.equal(p.storage['fmf-music'],'off',`${name}: stopped state saved`); assert.equal(p.check.checked,false,`${name}: play checkbox stopped`);
  assert.equal(p.time.textContent,`0:00 / ${duration}`,`${name}: progress reset`); assert.equal(p.name.textContent,name,`${name}: song remains selected`);
  const count=p.oscillators.length; p.context.currentTime+=10; p.tick(200); p.tick(500); assert.equal(p.oscillators.length,count,`${name}: no automatic restart`);
  p.play(true); assert(p.oscillators.length>count,`${name}: can start again`); assert.equal(p.oscillators[count].hz,firstHz,`${name}: starts at first note`);
  const old=p.oscillators.at(-1), oldBus=old.connections[0].connections[0], switchTime=p.context.currentTime; const next=songs[(songs.findIndex(s=>s[0]===id)+1)%songs.length];
  p.choose(next[0]); assert.equal(p.storage['fmf-volume'],'50',`${name}: switching retains saved volume`); assert.equal(master.gain.target,.5,`${name}: switching retains gain`); assert(p.volumes.every(s=>Number(s.value)===50));
  assert(old.stops.includes(switchTime+.04),`${name}: old notes stop at fade end`);
  assert.equal(oldBus.gain.ramp.value,0); assert.equal(oldBus.gain.ramp.time,switchTime+.04);
  assert(p.oscillators.at(-1).started>=switchTime+.04,`${name}: new song starts after fade`);
  const reload=createPlayer({'fmf-song':id,'fmf-volume':'50','fmf-music':'on'});
  assert.equal(reload.name.textContent,name,`${name}: restored song`); assert(!reload.context,`${name}: no autoplay before gesture`); reload.gesture(); assert.equal(reload.gainNodes[0].gain.target,.5,`${name}: restored volume`); assert(reload.oscillators.length>0,`${name}: restored playback`);
  const q=createPlayer(); q.choose(id); q.play(true); q.context.currentTime=30.1; q.play(false); assert.equal(q.time.textContent,`0:30 / ${duration}`,`${name}: pause preserves position`);
  q.context.currentTime=45; q.play(true); q.tick(500); assert.equal(q.time.textContent,`0:30 / ${duration}`,`${name}: resume preserves position`);
  q.seek(seconds-5); q.tick(500); assert.equal(q.time.textContent,`${Math.floor((seconds-5)/60)}:${String((seconds-5)%60).padStart(2,'0')} / ${duration}`,`${name}: seeking updates position`);
  q.context.currentTime+=5.2; q.tick(200); assert.equal(q.storage['fmf-music'],'off',`${name}: seek retains end time`); assert.equal(q.time.textContent,`0:00 / ${duration}`);
  console.log(`PASS ${name}: generated notes, common volume path, 0–100%, ${duration} stop, pause, seek, restart, switching`);
}
const restored=createPlayer({'fmf-song':'left','fmf-volume':'0'}); restored.choose('left'); restored.play(true); assert.equal(restored.gainNodes[0].gain.target,0,'saved zero volume is restored');
console.log('PASS saved zero volume');
