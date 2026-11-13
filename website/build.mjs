// Builds the static website into ./public from the repository files.
import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "public");
const REPO = "https://github.com/BT-Studio-dev/Fresh-Moves-Fix";

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const version = read("VERSION").trim();
const dl = (file) => `${REPO}/releases/download/v${version}/${file}`;

// Minecraft versions and pack formats come from build.py, so the site matches the builds.
const versions = [...read("build.py").match(/VERSIONS = \{([\s\S]*?)\}/)[1].matchAll(/"([\d.]+)":\s*(\d+)/g)]
  .map((m) => ({ mc: m[1], format: Number(m[2]) }));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function page({ title, body, depth = 0, description = "", active = "" }) {
  const up = "../".repeat(depth);
  const nav = (id, href, label) => `<a${id === active ? ' class="on"' : ""} href="${href}">${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || "Fresh Moves Fix - player animation resource pack for Minecraft")}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:image" content="https://fresh-moves-fix.vercel.app/banner.png">
<meta name="twitter:card" content="summary_large_image">
<script>(function(){var t="system";try{t=localStorage.getItem("fmf-theme")||"system"}catch(e){}
if(t==="system")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
document.documentElement.setAttribute("data-theme",t)})()</script>
<link rel="icon" href="${up}pack.png">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<header class="top"><div class="bar">
  <a class="brand" href="${up || "./"}"><img src="${up}pack.png" alt=""><span>Fresh Moves Fix</span></a>
  <nav>
    ${nav("home", up || "./", "Home")}
    ${nav("guides", up + "guides/", "Guides")}
    ${nav("editor", up + "editor/", "Eye editor")}
    ${nav("settings", up + "settings/", "Settings")}
    <a rel="noopener" href="${REPO}">GitHub</a>
  </nav>
  <a class="get" href="${up}#download"><span>↓</span> Download</a>
</div></header>
${body}
<footer><div class="bar">
  <div class="cols">
    <div class="about">
      <a class="brand" href="${up || "./"}"><img src="${up}pack.png" alt=""><span>Fresh Moves Fix</span></a>
      <p>Fresh Moves Fix is <a rel="noopener" href="${REPO}">open source</a>.</p>
      <p>CC0 1.0 · a fork of <a rel="noopener" href="https://github.com/IthanMendoza/Fresh-Moves">Fresh Moves</a> by IthanMendoza, based on Fresh Animations by FreshLX.</p>
    </div>
    <div><h4>Pack</h4>
      <a href="${up}#download">Download</a>
      <a rel="noopener" href="${REPO}/releases">Releases</a>
      <a rel="noopener" href="${REPO}#changes-from-the-original-pack">Changes</a>
    </div>
    <div><h4>Skins</h4>
      <a href="${up}guides/">Eye guides</a>
      <a href="${up}editor/">Eye editor</a>
      <a href="${up}guides/fix-black-eyes/">Fix black eyes</a>
    </div>
    <div><h4>Required mods</h4>
      <a rel="noopener" href="https://modrinth.com/mod/entity-model-features">Entity Model Features</a>
      <a rel="noopener" href="https://modrinth.com/mod/entitytexturefeatures">Entity Texture Features</a>
    </div>
    <div><h4>Resources</h4>
      <a rel="noopener" href="${REPO}">GitHub</a>
      <a rel="noopener" href="${REPO}/issues">Report issues</a>
      <a href="${up}settings/">Settings</a>
    </div>
  </div>
  <p class="legal">Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p>
</div></footer>
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, "pack.png"), path.join(out, "pack.png"));
fs.copyFileSync(path.join(here, "style.css"), path.join(out, "style.css"));
fs.copyFileSync(path.join(root, "docs/images/banner.png"), path.join(out, "banner.png"));

// ---------- guides (from docs/*.md) ----------
const docsDir = path.join(root, "docs");
const docs = fs.readdirSync(docsDir)
  .filter((f) => f.endsWith(".md") && f !== "Home.md" && f !== "Versions.md")
  .map((f) => {
    const name = f.slice(0, -3).replace(/-/g, " ");
    return { file: f, name, slug: slug(name) };
  });
const bySource = new Map(docs.map((d) => [d.file, d]));

function renderDoc(md) {
  // bare GitHub attachment links are videos: turn them into readable links
  md = md.replace(/^(https:\/\/github\.com\/\S+\/assets\/\S+)\s*$/gm, "[▶ Watch the video]($1)");
  let html = marked.parse(md);
  // links between docs -> links between pages
  html = html.replace(/href="<?([^"]+?\.md)>?"/g, (m, target) => {
    const d = bySource.get(decodeURIComponent(target));
    return d ? `href="../${d.slug}/"` : m;
  });
  return html.replace(/<a href="http/g, '<a rel="noopener" href="http').replace(/<img /g, '<img loading="lazy" ');
}

for (const d of docs) {
  const md = fs.readFileSync(path.join(docsDir, d.file), "utf8").replace(/^# .*\n/, "");
  write(`guides/${d.slug}/index.html`, page({
    title: `${d.name} - Fresh Moves Fix`,
    active: "guides",
    depth: 2,
    body: `<div class="wrap"><article>
<div class="crumb"><a href="../../">Home</a> / <a href="../">Guides</a></div>
<h1>${esc(d.name)}</h1>
${renderDoc(md)}
</article></div>`,
  }));
}

const fixes = docs.filter((d) => d.name.startsWith("Fix"));
const eyes = docs.filter((d) => !d.name.startsWith("Fix"));
const cards = (list) => `<div class="cards">${list.map((d) =>
  `<div class="card"><a class="title" href="${d.slug}/">${esc(d.name)}</a></div>`).join("")}</div>`;

write("guides/index.html", page({
  title: "Guides - Fresh Moves Fix",
  active: "guides",
  depth: 1,
  body: `<div class="wrap"><article>
<div class="crumb"><a href="../">Home</a></div>
<h1>Guides</h1>
<h2>How to animate the eyes</h2>
<ol class="steps">
<li>Get the skin you want to use (from your Minecraft account, NameMC, or any skin you like).</li>
<li>Open it in a .png editor that supports transparency, such as Blockbench (free), GIMP or Photoshop.</li>
<li>Add the extra pixels for your eye type and size, following the matching guide below. Leave the face itself untouched, so players without the pack see a normal skin.</li>
<li>Save the skin and upload it in the Minecraft launcher or on your Minecraft account.</li>
</ol>
<h2>Fixes</h2>
${cards(fixes)}
<h2>Eye and eyebrow types</h2>
${cards(eyes)}
<p style="margin-top:24px;color:var(--muted)">These guides are copied from the original Fresh Moves wiki. Images and videos are hosted on the original GitHub repository.</p>
</article></div>`,
}));

// ---------- skin eye editor ----------
// the two default skins are embedded in the page, so the editor needs no extra requests
const skinData = (p) => "data:image/png;base64," + fs.readFileSync(path.join(root, "assets/minecraft/textures/entity/player", p)).toString("base64");
fs.copyFileSync(path.join(here, "editor.js"), path.join(out, "editor.js"));
// 3D preview library (skinview3d, MIT licence), served from this site
fs.copyFileSync(path.join(here, "node_modules/skinview3d/bundles/skinview3d.bundle.js"), path.join(out, "skinview3d.bundle.js"));
write("editor/index.html", page({
  title: "Skin eye editor - Fresh Moves Fix",
  active: "editor",
  description: "Add the animated-eye pixels for Fresh Moves to your Minecraft skin and download the result.",
  depth: 1,
  body: `<div class="wrap"><article class="editor">
<div class="crumb"><a href="../">Home</a></div>
<h1>Skin eye editor</h1>
<p>Adds the extra pixels that make the eyes blink and move, then lets you download the skin. Everything happens in your browser; the skin is not uploaded anywhere.</p>
<div class="note"><strong>Not tested in-game.</strong> The pixel positions were copied from the example skins inside the pack. Keep a copy of your original skin.</div>

<div class="ed">
  <div class="panel">
    <h3>1. Skin</h3>
    <label class="drop" id="drop">
      <input type="file" id="file" accept="image/png" class="vh">
      <span class="drop-ic" aria-hidden="true">&uarr;</span>
      <span><b>Choose your skin file</b><br><small id="filename">or drop the .png here</small></span>
    </label>
    <p>or start from
      <button type="button" class="btn ghost small" id="steve" data-skin="${skinData("wide/steve.png")}">Steve</button>
      <button type="button" class="btn ghost small" data-skin="${skinData("slim/alex.png")}">Alex</button></p>

    <p class="row">Format:
      <label><input type="radio" name="fmt" id="fmtwide" value="default" checked> Steve</label>
      <label><input type="radio" name="fmt" id="fmtslim" value="slim"> Alex</label></p>
    <p><small>Steve = wide arms, Alex = slim arms. It is guessed from the skin when you load it; it only changes the 3D preview, not the file.</small></p>

    <h3>2. Eyes</h3>
    <p><label>Eye shape
      <select id="type"></select></label></p>
    <p><label>Position on the face
      <select id="pos"></select></label></p>

    <h3>3. Colours</h3>
    <p class="row"><label>Eyelid <input type="hidden" id="lid" value="#9b6349"><button type="button" class="sw" data-for="lid" aria-label="Choose colour"></button></label></p>
    <p class="row">
      <label id="whitewrap">Eye white <input type="hidden" id="white" value="#ffffff"><button type="button" class="sw" data-for="white" aria-label="Choose colour"></button></label>
      <label><span id="pupilname">Pupil</span> <input type="hidden" id="pupil" value="#523d89"><button type="button" class="sw" data-for="pupil" aria-label="Choose colour"></button></label>
    </p>
    <p><label><input type="checkbox" id="custom"> Paint these eye colours on the face</label><br>
      <small>Off: the eyes already drawn on your skin are used and the face is not changed.</small></p>

    <div class="picker" id="picker" hidden>
      <div class="pk-head"><b id="pk-title">Colour</b><button type="button" id="pk-close" aria-label="Close">&times;</button></div>
      <canvas id="pk-sv" width="220" height="130"></canvas>
      <input type="range" id="pk-hue" min="0" max="360" value="0" aria-label="Hue">
      <div class="pk-row"><span class="pk-now" id="pk-now"></span><input type="text" id="pk-hex" maxlength="7" spellcheck="false" aria-label="Hex colour"></div>
      <small>From your skin's face</small>
      <div class="pk-sws" id="pk-skin"></div>
      <small>Basic colours</small>
      <div class="pk-sws" id="pk-basic"></div>
    </div>

    <h3>4. Save</h3>
    <p><button type="button" class="btn" id="save" disabled>Download skin (.png)</button></p>
    <p id="status" class="status"></p>
  </div>

  <div class="panel">
    <h3>3D preview</h3>
    <div id="wrap3d">
      <canvas id="view3d" width="420" height="520"></canvas>
      <p class="row ctl">
        <label>Pose <select id="anim">
          <option value="idle" selected>Standing</option>
          <option value="walk">Walking</option>
          <option value="run">Running</option>
          <option value="wave">Waving</option>
        </select></label>
        <label><input type="checkbox" id="spin"> Spin</label>
        <label>Zoom <input type="range" id="zoom" min="0.6" max="2.4" step="0.05" value="0.9"></label>
      </p>
      <small>Drag to turn the model, scroll to zoom. The preview shows the skin only; the blinking happens in-game.</small>
    </div>
    <p id="msg3d" class="status"></p>
    <h3>Face</h3>
    <canvas id="face" width="256" height="256"></canvas>
    <h3>Added pixels (top-left of the skin file)</h3>
    <canvas id="top" width="480" height="96"></canvas>
    <details id="flat"><summary>Whole skin file (flat)</summary>
      <canvas id="full" width="384" height="384"></canvas>
    </details>
  </div>
</div>

<h2>How it works</h2>
<p>Choose the eye shape and the position that match the eyes on your skin. The editor writes an eyelid colour and, for eyes with pupils, the eye colours into an unused corner of the skin file (outlined in green). The pack reads that corner to animate the eyes.</p>
<ul>
<li><b>2 wide</b> (1, 2 or 3 tall): the eyes sit one pixel in from each side of the face; the pupils move and the eyes blink.</li>
<li><b>Derp</b>: like 2 wide, 1 tall, with cross-eyed pupils.</li>
<li><b>3 wide (enderman)</b>: the eyes touch the sides of the face.</li>
<li><b>Simple</b> (1 wide): no moving pupil, the eyes only blink.</li>
</ul>
<p>The positions of 2 wide 1 tall and 2 wide 2 tall come from the example skins in the pack. The other shapes were worked out from the pack's model file and are less certain; the derp layout is the least certain. Eyebrows, eyelashes and fox eyes are not in the editor yet; see the <a href="../guides/">guides</a>.</p>
</article></div>
<script src="../skinview3d.bundle.js"></script>
<script src="../editor.js"></script>`,
}));

// ---------- settings ----------
const themeCard = (id, name, pb, pp, pl, pt) => `<label><span class="pv" style="--pb:${pb};--pp:${pp};--pl:${pl};--pt:${pt}"><i><b></b><u></u></i></span><span class="nm"><input type="radio" name="theme" value="${id}"> ${name}</span></label>`;
write("settings/index.html", page({
  title: "Settings - Fresh Moves Fix",
  active: "settings",
  depth: 1,
  body: `<div class="wrap"><article>
<h1>Settings</h1>
<div class="set">
  <div class="menu"><small>DISPLAY</small><span>Appearance</span></div>
  <div class="box">
    <h2>Color theme</h2>
    <p>Select your preferred color theme for this website. It is saved in this browser only.</p>
    <div class="themes">
      ${themeCard("system", "Sync with system", "linear-gradient(90deg,#f4f6f5 50%,#0f1412 50%)", "#18201c", "#2a3630", "#9aa8a0")}
      ${themeCard("light", "Light", "#f4f6f5", "#ffffff", "#d5dcd8", "#17201b")}
      ${themeCard("dark", "Dark", "#0f1412", "#18201c", "#2a3630", "#9aa8a0")}
      ${themeCard("oled", "OLED", "#000000", "#0d0f0e", "#222826", "#98a39d")}
    </div>
  </div>
</div>
</article></div>
<script>(function(){
  var key="fmf-theme", cur="system"; try{cur=localStorage.getItem(key)||"system"}catch(e){}
  function apply(t){ var r=t; if(t==="system") r=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"; document.documentElement.setAttribute("data-theme",r); }
  document.querySelectorAll('input[name="theme"]').forEach(function(el){
    el.checked = el.value===cur;
    el.addEventListener("change",function(){ cur=el.value; try{localStorage.setItem(key,cur)}catch(e){} apply(cur); });
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change",function(){ if(cur==="system") apply(cur); });
})()</script>`,
}));

// ---------- home ----------
const groups = [];
for (const v of versions) {
  const g = groups.find((x) => x.format === v.format);
  if (g) g.list.push(v.mc); else groups.push({ format: v.format, list: [v.mc] });
}
const versionLinks = groups.map((g) => {
  const last = g.list[g.list.length - 1];
  const label = g.list.length > 1 ? `${g.list[0]} – ${last}` : last;
  return `<a href="${dl(`Fresh-Moves-Fix-mc${last}.zip`)}">${label}<small>pack format ${g.format}</small></a>`;
}).join("\n");

write("index.html", page({
  title: "Fresh Moves Fix - player animations for Minecraft",
  active: "home",
  description: "A fork of the Fresh Moves resource pack: smoother player animations and animated eyes, with builds for Minecraft 1.20 to 26.3.",
  body: `<div class="wrap">
<div class="hero">
  <img src="pack.png" alt="Fresh Moves Fix pack icon">
  <div class="txt">
    <h1>Fresh Moves Fix</h1>
    <p>Smoother, more expressive player animations and animated eyes for Minecraft. A fork of Fresh Moves with small fixes and builds for Minecraft ${versions[0].mc} to ${versions[versions.length - 1].mc}.</p>
    <a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">Download ${esc(version)}</a>
    <a class="btn ghost" href="editor/">Skin eye editor</a>
    <a class="btn ghost" href="guides/">Eye guides</a>
  </div>
</div>

<section>
  <div class="note"><strong>Beta.</strong> These builds have not been tested in-game yet. On Minecraft 1.21.4 and newer the cape and elytra may not be animated.</div>
  <h2>What it does</h2>
  <div class="cards">
    <div class="card"><h3>Player animations</h3><p>Reworked walking, sprinting, sneaking, swimming, crawling and sleeping, in the style of Fresh Animations.</p></div>
    <div class="card"><h3>Animated eyes</h3><p>Eyes blink and look around when your skin has the marker pixels described in the guides.</p></div>
    <div class="card"><h3>Changes in this fork</h3><p>Eyes stay closed while sleeping and after death, and the second skin layer no longer moves twice on 1.21.2+.</p></div>
    <div class="card"><h3>Wave emote</h3><p>Stand still, sneak and look straight up, and your right arm waves.</p></div>
  </div>
</section>

<section>
  <h2>Requirements</h2>
  <p>You need the <strong>latest</strong> versions of these two client-side mods (Fabric, Forge and NeoForge):</p>
  <p>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entity-model-features">Entity Model Features (EMF)</a>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entitytexturefeatures">Entity Texture Features (ETF)</a>
  </p>
  <p>On Minecraft 1.21.9 and newer armour only follows the animations with a recent EMF (3.0.5 or newer; 3.0.12 fixes armour lag).</p>
</section>

<section id="download">
  <h2>Download</h2>
  <p><a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">Fresh-Moves-Fix.zip - all versions</a></p>
  <p>One zip for every supported version. Or pick the zip labelled for your Minecraft version:</p>
  <div class="versions">
${versionLinks}
  </div>
  <p style="margin-top:16px"><a href="${REPO}/releases">All releases on GitHub</a></p>
</section>

<section>
  <h2>How to install</h2>
  <ol class="steps">
    <li>Install EMF and ETF.</li>
    <li>Put the downloaded zip (do not unzip it) in your <code>resourcepacks</code> folder.</li>
    <li>In Minecraft go to Options → Resource Packs, move the pack to the right and click Done.</li>
  </ol>
  <p>Black eyes? See <a href="guides/fix-black-eyes/">Fix Black Eyes</a>.</p>
</section>
</div>`,
}));

console.log(`Built website: ${docs.length} guides, ${versions.length} Minecraft versions, release v${version}`);
