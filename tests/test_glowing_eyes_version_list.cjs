const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('../website/node_modules/jsdom');
const html=fs.readFileSync('website/public/editor/index.html','utf8'),script=fs.readFileSync('website/glowing-eyes-downloads.js','utf8');
const version=(id, games, platforms, number, date)=>({id,project_id:'9i2aYUyi',status:'listed',version_number:number,version_type:'release',date_published:date,game_versions:games,loaders:platforms,files:[{primary:true,filename:'glowingeyes.jar',url:`https://cdn.modrinth.com/data/9i2aYUyi/versions/${id}/glowingeyes.jar`},{primary:false,filename:'sources.jar',url:'https://evil.test/source.jar'}]});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
 const dom=new JSDOM(html,{url:'https://example.test/editor/',runScripts:'outside-only'}),w=dom.window,d=w.document,$=id=>d.getElementById(id);let fail=false,called='';
 const sample=[version('FAB121',['1.21.11'],['fabric','quilt'],'2.1.3','2026-07-26'),version('NEO121',['1.21.11'],['neoforge'],'2.1.3','2026-07-26'),version('FOR119',['1.19','1.19.2'],['forge'],'<img src=x>','2025-04-13'),version('OLD112',['1.12.2'],['forge'],'1.0.0','2023-01-01'),{...version('BAD',['1.21.11'],['fabric'],'9','2026-08-01'),files:[{primary:true,filename:'mod.jar',url:'https://evil.test/mod.jar'}]}];
 w.fetch=async url=>{called=url;if(fail)throw Error('offline');return {ok:true,json:async()=>sample}};
 w.eval(script);await tick();await tick();
 assert.equal(called,'https://api.modrinth.com/v2/project/9i2aYUyi/version');assert(!$('glow-version-filters').hidden);assert($('glow-version-fallback').hidden);assert.equal(d.querySelectorAll('.glow-version-row').length,4,'untrusted downloads excluded');
 const options=[...$('glow-game-version').options]; assert.deepEqual(options.map(x=>x.value),['','1.21.11','1.19.2','1.19','1.12.2']); for (const absent of ['26.3','26.2','26.1.2','26.1.1','26.1','1.20.6','1.20.5']) assert(!options.some(x=>x.value===absent),`${absent} is not offered without a release`);
 const set=(id,value,event='change')=>{$(id).value=value;$(id).dispatchEvent(new w.Event(event,{bubbles:true}));};
 set('glow-game-version','1.21.11');set('glow-loader','fabric');assert.equal(d.querySelectorAll('.glow-version-row').length,1);assert.match($('glow-version-list').textContent,/Fabric \/ Quilt/);
 assert.equal(d.querySelector('.glow-version-row a.btn').href,'https://cdn.modrinth.com/data/9i2aYUyi/versions/FAB121/glowingeyes.jar');
 set('glow-loader','forge');assert.match($('glow-versions-status').textContent,/No official/);assert.equal(d.querySelectorAll('.glow-version-row').length,0);
 set('glow-game-version','');set('glow-version-search','1.19','input');assert.equal(d.querySelectorAll('.glow-version-row').length,1);assert(!$('glow-version-list').querySelector('img'),'untrusted labels are text, not HTML');
 set('glow-loader','');set('glow-version-search','26.3','input');assert.match($('glow-versions-status').textContent,/No official/);assert.equal($('glow-game-version').options.length,1,'search does not invent unsupported options');assert.equal(d.querySelectorAll('.glow-version-row').length,0,'unsupported version not invented');
 fail=true;$('glow-versions-retry').click();await tick();await tick();assert(!$('glow-version-fallback').hidden);assert($('glow-version-filters').hidden);assert.match($('glow-versions-status').textContent,/Could not load/);assert.equal($('glow-version-fallback').querySelectorAll('a.btn').length,2);
 fail=false;$('glow-versions-retry').click();await tick();await tick();assert(!$('glow-version-filters').hidden);assert($('glow-version-fallback').hidden);set('glow-version-search','', 'input');set('glow-game-version','');assert.equal(d.querySelectorAll('.glow-version-row').length,4);
 // A future official release must appear automatically, without a code update.
 sample.unshift(version('FUTURE',['26.3'],['fabric'],'3.0.0','2027-01-01'));$('glow-versions-retry').click();await tick();await tick();assert([...$('glow-game-version').options].some(x=>x.value==='26.3'));set('glow-game-version','26.3');assert.equal(d.querySelectorAll('.glow-version-row').length,1);
 dom.window.close();console.log('Glowing Eyes version/loader filters, provenance, empty results and offline fallback passed (mocked Modrinth)');
})().catch(e=>{console.error(e);process.exitCode=1});
