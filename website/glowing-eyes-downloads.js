// Official Modrinth releases and separately labeled, temporary FMF artifacts.
// This browser never reads or changes the editor's skin or presets.
(function () {
  const $ = id => document.getElementById(id);
  const root = $('glowing-eyes-downloads');
  if (!root || !$('glow-version-list')) return;
  const isCurrent = () => $('glowing-eyes-downloads') === root;
  const endpoint = 'https://api.modrinth.com/v2/project/9i2aYUyi/version';
  const repo = 'https://github.com/BT-Studio-dev/Fresh-Moves-Fix';
  const loaders = { fabric: 'Fabric', quilt: 'Quilt', neoforge: 'NeoForge', forge: 'Forge' };
  // These are Actions artifacts, not published releases. They may require GitHub
  // sign-in and expire; never offer an expired artifact as a download.
  const experimental = [
    { game: '1.20.5', run: '45853964289', artifact: '15135286464', expires: '2026-12-03T15:57:38Z', java: '21', workflow: '120' },
    { game: '1.20.6', run: '45853964289', artifact: '15135276716', expires: '2026-12-03T15:57:38Z', java: '21', workflow: '120' },
    { game: '26.1', run: '45891971875', artifact: '15151434010', expires: '2026-12-03T20:34:45Z', java: '25', workflow: '26' },
    { game: '26.1.1', run: '45891971875', artifact: '15151852156', expires: '2026-12-03T20:34:43Z', java: '25', workflow: '26' },
    { game: '26.1.2', run: '45891971875', artifact: '15151697873', expires: '2026-12-03T20:34:40Z', java: '25', workflow: '26' }
  ];
  let versions = [], games = [], supportedGames = new Set(), request = 0, state = 'loading';
  let projectGames = [];
  try { const data = JSON.parse($('glow-version-filters').dataset.projectGameVersions || '[]'); if (Array.isArray(data)) projectGames = data.filter(x => typeof x === 'string' && /^\d+(?:\.\d+){1,2}$/.test(x)); } catch (_) {}
  const status = message => { $('glow-versions-status').textContent = message; };
  const make = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const artifactAvailable = build => Date.now() < Date.parse(build.expires);
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
      const build=experimental.find(v=>v.game===game);
      let label=game;
      if (build) label += artifactAvailable(build) ? ' — experimental Fabric build' : ' — experimental artifact expired';
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
    const builds=experimental.filter(v => matchesGame([v.game]) && (!loader || loader === 'fabric'));
    const list=$('glow-version-list'); list.replaceChildren();
    for (const v of builds) {
      const card=make('article',null,'glow-version-row glow-version-experimental');
      card.append(make('strong','Unofficial experimental Glowing Eyes'), make('span',`${v.game} · Fabric · Java ${v.java}`, 'glow-version-meta'), make('small','Compiled and checked for basic metadata only. Not tested in Minecraft; back up your files.'));
      const actions=make('div',null,'glow-version-actions');
      if (artifactAvailable(v)) {
        const download=make('a','Open artifact ZIP','btn'); download.href=`${repo}/actions/runs/${v.run}/artifacts/${v.artifact}`; download.rel='noopener noreferrer'; download.setAttribute('aria-label',`Open experimental Fabric artifact ZIP for Minecraft ${v.game}`); actions.append(download);
        card.append(make('small','GitHub sign-in may be required. Extract the JAR from the ZIP; artifacts expire after 7 days.'));
      } else card.append(make('small','This temporary artifact has expired. Check the workflow for a newer successful build.'));
      const details=make('a',artifactAvailable(v) ? 'Build details' : 'Find a newer build'); details.href=artifactAvailable(v) ? `${repo}/actions/runs/${v.run}` : `${repo}/actions/workflows/glowing-eyes-${v.workflow}.yml`; details.rel='noopener noreferrer'; actions.append(details);
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
