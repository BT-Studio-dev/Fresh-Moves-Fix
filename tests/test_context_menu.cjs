const assert=require('assert'),fs=require('fs'),{JSDOM}=require('../website/node_modules/jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><body><main><p id="plain">Page</p><a id="link" href="/guides/"><span>Link</span></a><a id="mail" href="mailto:test@example.com">Mail</a><input id="input"><canvas id="p3d"></canvas></main></body>',{url:'https://example.com/paint/',runScripts:'outside-only'}),w=dom.window,d=w.document;
 let prints=0,copied='',scrolls=0,opened=[];w.open=(...args)=>opened.push(args);w.print=()=>prints++;w.scrollTo=()=>scrolls++;Object.defineProperty(w.navigator,'clipboard',{value:{writeText(t){copied=t;return Promise.resolve()}}});
 const src=fs.readFileSync('website/context-menu.js','utf8');w.eval(src);
 const $=s=>d.querySelector(s),menu=$('.fmf-context-menu'),evt=(selector,opts={})=>{let e=new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:50,clientY:60,...opts});$(selector).dispatchEvent(e);return e};
 Object.defineProperty(menu,'offsetWidth',{value:225});Object.defineProperty(menu,'offsetHeight',{value:200});
 assert(evt('#plain',{clientX:350,clientY:270}).defaultPrevented);assert(!menu.hidden);assert.equal(menu.style.left,'350px');assert.equal(menu.style.top,'270px');assert.equal(d.activeElement.dataset.action,'save');
 evt('#plain',{clientX:w.innerWidth-10,clientY:w.innerHeight-10});assert.equal(menu.style.left,(w.innerWidth-10-225)+'px');assert.equal(menu.style.top,(w.innerHeight-10-200)+'px');
 $('#plain').dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,button:2,clientX:310,clientY:320}));evt('#plain',{clientX:0,clientY:0});assert.equal(menu.style.left,'310px');assert.equal(menu.style.top,'320px');
 d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(d.activeElement.dataset.action,'print');d.activeElement.click();assert.equal(prints,1);assert(menu.hidden);
 evt('#plain');$('[data-action=save]').click();assert.match($('.fmf-context-notice').textContent,/Ctrl\+S/);
 evt('#plain');$('[data-action=copy]').click();await Promise.resolve();assert.equal(copied,w.location.href);assert.match($('.fmf-context-notice').textContent,/copied/i);
 evt('#plain');$('[data-action=top]').click();assert.equal(scrolls,1);
 assert(evt('#link span').defaultPrevented);assert.equal(d.activeElement.dataset.action,'open-link');d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(d.activeElement.dataset.action,'copy-link');d.activeElement.click();await Promise.resolve();assert.equal(copied,'https://example.com/guides/');evt('#link');$('[data-action=open-link]').click();assert.deepEqual(opened[0],['https://example.com/guides/','_blank','noopener,noreferrer']);assert(!evt('#link',{shiftKey:true}).defaultPrevented);
 for(const el of ['#input','#p3d','#mail']){assert(!evt(el).defaultPrevented);assert(menu.hidden)}
 assert(!evt('#plain',{shiftKey:true}).defaultPrevented);
 evt('#plain');d.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(menu.hidden);
 w.eval(src);assert.equal(d.querySelectorAll('.fmf-context-menu').length,1);evt('#plain');assert(!$('.fmf-context-menu').hidden);w.__fmfContextCleanup();assert(!$('.fmf-context-menu'));
 const html=fs.readFileSync('website/public/index.html','utf8');assert(html.includes('context-menu.js?v='));
 console.log('Context menu actions, accessibility, browser exclusions and navigation cleanup passed');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
