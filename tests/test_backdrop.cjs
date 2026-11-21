const vm = require('vm'), fs = require('fs'), assert = require('assert');
function run(containerType, saved) {
  const events = {}, storage = { 'fmf-editor-backdrop': saved }, styles = {};
  const panel = { style: {setProperty(k,v){styles[k]=v}, removeProperty(k){delete styles[k]}} };
  const makeButton = value => ({attrs:{'data-backdrop':value},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this[k]=fn}});
  const buttons = [makeButton('default'),makeButton('#303844'),makeButton('#7fb8ff')];
  const custom = {value:'#7fb8ff', addEventListener(k,fn){events[k]=fn}};
  const controls = {closest(selector){assert(selector.includes(containerType));return panel},querySelector(){return custom},querySelectorAll(){return buttons}};
  const sandbox = {document:{querySelector(){return controls}},localStorage:{getItem(k){return storage[k]},setItem(k,v){storage[k]=v}}};
  vm.runInNewContext(fs.readFileSync('website/backdrop.js','utf8'),sandbox);
  assert.equal(styles['--editor-backdrop'],saved); assert.equal(buttons[1].attrs['aria-pressed'],'true');
  buttons[2].click(); assert.equal(storage['fmf-editor-backdrop'],'#7fb8ff'); assert.equal(styles['--editor-backdrop'],'#7fb8ff');
  custom.value='#123456'; events.input(); assert.equal(storage['fmf-editor-backdrop'],'#123456'); assert.equal(styles['--editor-backdrop'],'#123456');
  buttons[0].click(); assert.equal(styles['--editor-backdrop'],undefined); assert.equal(storage['fmf-editor-backdrop'],'default');
}
run('.cape-preview','#303844'); run('.panel','#303844');
console.log('Cape and skin backdrop presets, custom color and persistence passed');
