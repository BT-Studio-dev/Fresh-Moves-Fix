const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('../website/node_modules/jsdom');
const navSource = fs.readFileSync('website/nav.js','utf8');
const html = (body) => `<!doctype html><html><head><title>Page</title></head><body><header class="top"><a href="/first/">First</a><a href="/second/">Second</a></header>${body}</body></html>`;
const tick = () => new Promise(resolve => setTimeout(resolve,0));
(async () => {
  const dom = new JSDOM(html('home'),{url:'https://example.test/',runScripts:'dangerously'}), w=dom.window,d=w.document;
  w.scrollTo=()=>{};
  const pages = {'/first/':html('<script src="/slow.js"></script><script>window.oldPageRan = true</script>'),'/second/':html('<main>Second page</main>')};
  w.fetch=async url=>({ok:true,url,headers:{get:()=> 'text/html'},text:async()=>pages[new URL(url).pathname]});
  let slow;
  const original=w.HTMLBodyElement.prototype.appendChild;
  w.HTMLBodyElement.prototype.appendChild=function(node){const result=original.call(this,node);if(node.tagName==='SCRIPT' && node.src.endsWith('/slow.js'))slow=node;return result;};
  w.eval(navSource);
  async function click(path) {const done=new Promise(r=>d.addEventListener('fmf-nav',r,{once:true}));d.querySelector(`a[href="${path}"]`).dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));await done;}
  await click('/first/');assert(slow);await click('/second/');slow.onload();assert.equal(w.oldPageRan,undefined,'stale page scripts must not continue after navigation');assert.match(d.querySelector('main').textContent,/Second/);
  dom.window.close();

  const busyDom=new JSDOM(html('home'),{url:'https://example.test/',runScripts:'outside-only'}),bw=busyDom.window,bd=bw.document;
  bw.fetch=()=>new Promise(()=>{});bw.scrollTo=()=>{};bw.eval(navSource);
  bd.querySelector('a[href="/first/"]').dispatchEvent(new bw.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
  const second=new bw.MouseEvent('click',{bubbles:true,cancelable:true,button:0});
  // Prevent jsdom's unimplemented native navigation after observing nav's decision.
  bd.addEventListener('click', e=>{assert.equal(e.defaultPrevented,false,'a second click must fall back to normal navigation');e.preventDefault();},{once:true});
  bd.querySelector('a[href="/second/"]').dispatchEvent(second);busyDom.window.close();

  const built=fs.readFileSync('website/public/editor/index.html','utf8'),guardDom=new JSDOM(built,{url:'https://example.test/editor/',runScripts:'outside-only'}),gw=guardDom.window,gd=gw.document;
  let callback;gw.setTimeout=(fn,ms)=>{assert.equal(ms,10000);callback=fn;};
  const screen=gd.getElementById('project-lock-screen'),inline=screen.nextElementSibling;assert.equal(inline.tagName,'SCRIPT');gw.eval(inline.textContent);callback();
  assert.match(screen.querySelector('h1').textContent,/Unable/);assert.equal(screen.querySelector('button').hidden,false,'missing guard script must offer a retry');
  screen.querySelector('h1').textContent='Checking';screen.dataset.guardStarted='1';callback();assert.equal(screen.querySelector('h1').textContent,'Checking','watchdog does not override an active check');
  guardDom.window.close();
  const css=fs.readFileSync('website/refresh-2026.css','utf8');assert.match(css,/#project-lock-screen ~ \*/);assert(!css.includes('body > :not(#project-lock-screen)'));
  await tick();console.log('Navigation race, busy fallback, guard watchdog and blank-page prevention passed (DOM simulation)');
})().catch(e=>{console.error(e);process.exitCode=1;});
