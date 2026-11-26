// Browse official Modrinth releases without touching the editor or the skin.
(function () {
  const $ = id => document.getElementById(id);
  if (!$('glow-version-list')) return;
  const endpoint = 'https://api.modrinth.com/v2/project/9i2aYUyi/version';
  const loaders = { fabric: 'Fabric', quilt: 'Quilt', neoforge: 'NeoForge', forge: 'Forge' };
  let versions = [], games = [], supportedGames = new Set(), request = 0;
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
    for (const game of shown) { const option=make('option',supportedGames.has(game) ? game : `${game} — no official Glowing Eyes release`); option.value=game; sel.appendChild(option); }
    if (shown.includes(selected)) sel.value=selected;
    return query && !shown.length;
  }
  function render() {
    const noGame=updateGameOptions(), search=$('glow-version-search').value.trim().toLowerCase(), selected=$('glow-game-version').value, loader=$('glow-loader').value;
    const matching=versions.filter(v => (!selected || v.gameVersions.includes(selected)) && (!loader || v.platforms.includes(loader)) && (!search || v.gameVersions.some(g=>g.toLowerCase().includes(search))));
    const list=$('glow-version-list'); list.replaceChildren();
    if (noGame || !matching.length) { status('No official Glowing Eyes releases match these filters. Check the game version and platform.'); return; }
    status(`${matching.length} official ${matching.length === 1 ? 'release' : 'releases'} found. Select a JAR and check its version page for requirements.`);
    for (const v of matching) {
      const card=make('article',null,'glow-version-row');
      card.append(make('strong',`Glowing Eyes ${v.number}`),make('span',`${v.gameVersions.join(', ')} · ${v.platforms.map(x=>loaders[x]).join(' / ')}`,'glow-version-meta'));
      const extra=[v.type, v.date].filter(Boolean).join(' · '); if (extra) card.append(make('small',extra));
      const actions=make('div',null,'glow-version-actions');
      const download=make('a','Download JAR','btn'); download.href=v.file.url; download.rel='noopener noreferrer'; download.setAttribute('aria-label',`Download ${v.file.filename}`);
      const detail=make('a','Version details'); detail.href=`https://modrinth.com/mod/glowing-eyes/version/${encodeURIComponent(v.id)}`; detail.rel='noopener noreferrer';
      actions.append(download, detail); card.append(actions); list.append(card);
    }
  }
  async function load() {
    const token=++request, retry=$('glow-versions-retry'); retry.hidden=true; status('Loading the Modrinth version list…');
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(endpoint,{signal:controller.signal});
      if (!response.ok) throw new Error('Request failed');
      const result=normalize(await response.json()); if (token!==request) return;
      if (!result.length) throw new Error('No usable releases');
      versions=result; supportedGames=new Set(result.flatMap(v=>v.gameVersions)); games=[...new Set([...supportedGames,...projectGames])].sort(compareGame);
      $('glow-version-fallback').hidden=true; $('glow-version-filters').hidden=false; render();
    } catch (_) {
      if (token!==request) return;
      versions=[]; games=[]; $('glow-version-list').replaceChildren(); $('glow-version-filters').hidden=true; $('glow-version-fallback').hidden=false; retry.hidden=false;
      status('Could not load the version list. Use the official 1.21.11 links below or visit the Modrinth project page.');
    } finally { clearTimeout(timeout); }
  }
  $('glow-version-search').addEventListener('input',render);
  $('glow-game-version').addEventListener('change',render);
  $('glow-loader').addEventListener('change',render);
  $('glow-versions-retry').addEventListener('click',load);
  load();
})();
