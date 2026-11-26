// Official Modrinth releases and separately labeled FMF experimental JARs.
// This browser never reads or changes the editor's skin or presets.
(function () {
  const $ = id => document.getElementById(id);
  const root = $('glowing-eyes-downloads');
  if (!root || !$('glow-version-list')) return;
  const isCurrent = () => $('glowing-eyes-downloads') === root;
  const endpoint = 'https://api.modrinth.com/v2/project/9i2aYUyi/version';
  const loaders = { fabric: 'Fabric', quilt: 'Quilt', neoforge: 'NeoForge', forge: 'Forge' };
  // Build metadata is embedded in the generated page after checksum verification.
  let experimental = [];
  try {
    const data = JSON.parse(root.dataset.experimentalBuilds || '[]');
    if (Array.isArray(data)) experimental = data.filter(v => v && /^(fabric|neoforge)$/.test(v.loader) && /^\d+(?:\.\d+){1,2}$/.test(v.game) && v.file === `glowing-eyes-fmf-${v.loader}-${v.game}-experimental.jar` && /^[a-f0-9]{64}$/.test(v.sha256));
  } catch (_) {}
  let versions = [], games = [], supportedGames = new Set(), request = 0, state = 'loading';
  let projectGames = [];
  try { const data = JSON.parse($('glow-version-filters').dataset.projectGameVersions || '[]'); if (Array.isArray(data)) projectGames = data.filter(x => typeof x === 'string' && /^\d+(?:\.\d+){1,2}$/.test(x)); } catch (_) {}
  const status = message => { $('glow-versions-status').textContent = message; };
  const make = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  function trustedFile(version) {
    if (!/^[a-zA-Z0-9]+$/.test(version.id || '')) return null;
    const file = Array.isArray(version.files) && version.files.find(f => f && f.primary === true);
    if (!file || typeof file.filename !== 'string' || !/\.jar$/i.test(file.filename)) return null;
    try {
      const url = new URL(file.url);
      if (url.protocol !== 'https:' || url.hostname !== 'cdn.modrinth.com' || !url.pathname.startsWith(`/data/9i2aYUyi/versions/${version.id}/`)) return null;
      return { url: url.href, filename: file.filename };
    } catch (_) { return null; }
  }
  function normalize(raw) {
    if (!Array.isArray(raw)) throw new Error('Invalid response');
    return raw.flatMap(v => {
      if (!v || v.project_id !== '9i2aYUyi' || v.status !== 'listed') return [];
      const file = trustedFile(v), gameVersions = Array.isArray(v.game_versions) ? v.game_versions.filter(x => typeof x === 'string' && /^\d+(?:\.\d+){1,2}$/.test(x)) : [];
      const platforms = Array.isArray(v.loaders) ? v.loaders.filter(x => Object.prototype.hasOwnProperty.call(loaders, x)) : [];
      if (!file || !gameVersions.length || !platforms.length || typeof v.version_number !== 'string') return [];
      return [{ id: v.id, number: v.version_number, type: ['release','beta','alpha'].includes(v.version_type) ? v.version_type : 'unknown', date: /^\d{4}-\d{2}-\d{2}/.test(v.date_published || '') ? v.date_published.slice(0,10) : '', gameVersions, platforms, file }];
    }).sort((a,b) => b.date.localeCompare(a.date));
  }
  function compareGame(a,b) {
    const av=a.split('.').map(Number), bv=b.split('.').map(Number);
    for (let i=0;i<Math.max(av.length,bv.length);i++) if ((av[i]||0)!==(bv[i]||0)) return (bv[i]||0)-(av[i]||0);
    return a.localeCompare(b);
  }
  function updateGameOptions() {
    const sel=$('glow-game-version'), selected=sel.value, query=$('glow-version-search').value.trim().toLowerCase();
    sel.replaceChildren(); const all=make('option','All game versions'); all.value=''; sel.appendChild(all);
    const shown=games.filter(g=>g.toLowerCase().includes(query));
    for (const game of shown) {
      const builds=experimental.filter(v=>v.game===game);
      let label=game;
      if (builds.length) label += ` — experimental ${builds.map(v=>loaders[v.loader]).join(' / ')} build${builds.length === 1 ? '' : 's'}`;
      if (state === 'ready' && !supportedGames.has(game)) label += ' (no official release)';
      const option=make('option',label); option.value=game; sel.appendChild(option);
    }
    if (shown.includes(selected)) sel.value=selected;
    return query && !shown.length;
  }
  function rebuildGames() { games=[...new Set([...projectGames,...supportedGames,...experimental.map(v=>v.game)])].sort(compareGame); }
  function render() {
    if (!isCurrent()) return;
    const noGame=updateGameOptions(), search=$('glow-version-search').value.trim().toLowerCase(), selected=$('glow-game-version').value, loader=$('glow-loader').value;
    const matchesGame = gs => (!selected || gs.includes(selected)) && (!search || gs.some(g=>g.toLowerCase().includes(search)));
    const matching=versions.filter(v => matchesGame(v.gameVersions) && (!loader || v.platforms.includes(loader)));
    const builds=experimental.filter(v => matchesGame([v.game]) && (!loader || loader === (v.loader || 'fabric')));
    const list=$('glow-version-list'); list.replaceChildren();
    for (const v of builds) {
      const platform=loaders[v.loader || 'fabric'];
      const card=make('article',null,'glow-version-row glow-version-experimental');
      card.append(make('strong','Unofficial experimental Glowing Eyes'), make('span',`${v.game} · ${platform} · Java ${v.java}`, 'glow-version-meta'), make('small','Compiled and checked for basic metadata only. Not tested in Minecraft; back up your files.'));
      if (v.neo) card.append(make('small',`Requires NeoForge ${v.neo} for Minecraft ${v.game}.`));
      const actions=make('div',null,'glow-version-actions');
      const download=make('a','Download JAR','btn');
      download.href=`../downloads/glowing-eyes/${v.file}`;
      download.download=v.file;
      download.setAttribute('aria-label',`Download experimental ${platform} JAR for Minecraft ${v.game}`);
      actions.append(download);
      card.append(make('small', `SHA-256: ${v.sha256}`));
      card.append(actions); list.append(card);
    }
    for (const v of matching) {
      const card=make('article',null,'glow-version-row');
      card.append(make('strong',`Glowing Eyes ${v.number}`),make('span',`${v.gameVersions.join(', ')} · ${v.platforms.map(x=>loaders[x]).join(' / ')}`,'glow-version-meta'));
      const extra=[v.type, v.date].filter(Boolean).join(' · '); if (extra) card.append(make('small',extra));
      const actions=make('div',null,'glow-version-actions');
      const download=make('a','Download JAR','btn'); download.href=v.file.url; download.rel='noopener noreferrer'; download.setAttribute('aria-label',`Download ${v.file.filename}`);
      const detail=make('a','Version details'); detail.href=`https://modrinth.com/mod/glowing-eyes/version/${encodeURIComponent(v.id)}`; detail.rel='noopener noreferrer';
      actions.append(download, detail); card.append(actions); list.append(card);
    }
    const fallback=$('glow-version-fallback');
    let fallbackCount=0;
    fallback.querySelectorAll('[data-glow-fallback-loaders]').forEach(option => {
      const visible=state === 'error' && matchesGame(['1.21.11']) && (!loader || option.dataset.glowFallbackLoaders.split(' ').includes(loader));
      option.hidden=!visible; if (visible) fallbackCount++;
    });
    fallback.hidden=!fallbackCount;
    if (state === 'loading') { status('Loading official Modrinth versions; experimental builds are shown separately.'); return; }
    const official=state === 'error' ? 'Official version list unavailable; retry or use the matching pinned 1.21.11 links below.' : `${matching.length} official ${matching.length === 1 ? 'release' : 'releases'} found.`;
    const count=`${builds.length} experimental ${builds.length === 1 ? 'build' : 'builds'} shown.`;
    status(noGame || (!matching.length && !builds.length && !fallbackCount) ? `${official} No builds match these filters. Check the game version and platform.` : `${official} ${count} Check each version's requirements.`);
  }
  async function load() {
    const token=++request, retry=$('glow-versions-retry'); retry.hidden=true; state='loading'; render();
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(endpoint,{signal:controller.signal});
      if (!response.ok) throw new Error('Request failed');
      const result=normalize(await response.json()); if (token!==request || !isCurrent()) return;
      if (!result.length) throw new Error('No usable releases');
      versions=result; supportedGames=new Set(result.flatMap(v=>v.gameVersions)); state='ready'; rebuildGames(); render();
    } catch (_) {
      if (token!==request || !isCurrent()) return;
      versions=[]; supportedGames=new Set(); state='error'; rebuildGames(); retry.hidden=false; render();
    } finally { clearTimeout(timeout); }
  }
  $('glow-version-search').addEventListener('input',render);
  $('glow-game-version').addEventListener('change',render);
  $('glow-loader').addEventListener('change',render);
  $('glow-versions-retry').addEventListener('click',load);
  rebuildGames(); $('glow-version-filters').hidden=false; load();
})();
