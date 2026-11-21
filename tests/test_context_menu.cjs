const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><body><main><p id="plain">Page</p><a id="link" href="#">Link</a><input id="input"><canvas id="p3d"></canvas></main></body>',{url:'https://example.com/paint/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 let prints=0,copied='',scrolls=0;w.print=()=>prints++;w.scrollTo=()=>scrolls++;Object.defineProperty(w.navigator,'clipboard',{value:{writeText(t){copied=t;return Promise.resolve()}}});
 const src=fs.readFileSync('website/context-menu.js','utf8');w.eval(src);
 const $=s=>d.querySelector(s),menu=$('.fmf-context-menu'),evt=(selector,opts={})=>{let e=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:50,clientY:60,...opts});$(selector).dispatchEvent(e);return e};
 assert(evt('#plain').defaultPrevented);assert(!menu.hidden);assert.equal(d.activeElement.dataset.action,'save');
 d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(d.activeElement.dataset.action,'print');d.activeElement.click();assert.equal(prints,1);assert(menu.hidden);
 evt('#plain');$('[data-action=save]').click();assert.match($('.fmf-context-notice').textContent,/Ctrl\+S/);
 evt('#plain');$('[data-action=copy]').click();await Promise.resolve();assert.equal(copied,w.location.href);assert.match($('.fmf-context-notice').textContent,/copied/i);
 evt('#plain');$('[data-action=top]').click();assert.equal(scrolls,1);
 for(const el of ['#input','#p3d','#link']){assert(!evt(el).defaultPrevented);assert(menu.hidden)}
 assert(!evt('#plain',{shiftKey:true}).defaultPrevented);
 evt('#plain');d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(menu.hidden);
 w.eval(src);assert.equal(d.querySelectorAll('.fmf-context-menu').length,1);evt('#plain');assert(!$('.fmf-context-menu').hidden);w.__fmfContextCleanup();assert(!$('.fmf-context-menu'));
 const html=fs.readFileSync('website/public/index.html','utf8');assert(html.includes('context-menu.js?v='));
 console.log('Context menu actions, accessibility, browser exclusions and navigation cleanup passed');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
