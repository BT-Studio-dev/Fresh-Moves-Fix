const assert = require('assert'), vm = require('vm'), fs = require('fs');
const handlers = {}, storage = {}, timers = [];
const targets = []; const audioParam = { setValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(v){targets.push(v)}, cancelScheduledValues(){} };
class AudioContext { constructor(){ this.currentTime=0; this.state='running'; this.destination={}; } createGain(){ return {gain:audioParam,connect(){}}; } createOscillator(){return {frequency:audioParam,connect(){},start(){},stop(){}};} resume(){} suspend(){} }
const radio={value:'end',checked:true,matches(s){return s==='[data-music-song]'}};
const name={textContent:''}, time={textContent:''};
const document={readyState:'complete',addEventListener(k,f){handlers[k]=f},removeEventListener(){},querySelectorAll(s){return s==='[data-music-song]'?[radio]:s==='[data-music-name]'?[name]:s==='[data-music-time]'?[time]:[]}};
const sandbox={window:{AudioContext},document,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},setInterval(f){timers.push(f);return timers.length},clearInterval(){},setTimeout(){},Math};
vm.runInNewContext(fs.readFileSync('website/music.js','utf8'),sandbox);
handlers.click({target:radio}); handlers.change({target:radio});
assert.equal(storage['fmf-song'],'end'); assert.equal(storage['fmf-music'],'on'); assert.equal(name.textContent,'The End'); timers[0](); assert.match(time.textContent,/\/ 4:00/); timers[1]();
radio.value='left'; radio.checked=true; handlers.change({target:radio}); assert.equal(storage['fmf-song'],'left'); assert.equal(name.textContent,'Player Left'); timers[0](); assert.match(time.textContent,/\/ 3:20/); timers[1]();
const slider={value:'100',matches(s){return s==='[data-music-volume]'},setAttribute(){}};
handlers.input({target:slider}); assert.equal(storage['fmf-volume'],'100'); assert.equal(targets.at(-1),.5);
slider.value='0'; handlers.input({target:slider}); assert.equal(targets.at(-1),0);
slider.value='65'; handlers.change({target:slider}); assert.equal(storage['fmf-volume'],'65'); assert.equal(targets.at(-1),.325);
console.log('Sad song selection, playback, and volume changes passed');
