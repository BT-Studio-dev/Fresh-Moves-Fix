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

// A short fingerprint of a file, added to its address, so browsers fetch the new file after every change
// instead of showing an old saved copy of the styles or scripts.
import { createHash } from "node:crypto";
const ver = (f) => createHash("sha1").update(fs.readFileSync(path.join(here, f))).digest("hex").slice(0, 8);

// Minecraft versions and pack formats come from build.py, so the site matches the builds.
const versions = [...read("build.py").match(/VERSIONS = \{([\s\S]*?)\}/)[1].matchAll(/"([\d.]+)":\s*(\d+)/g)]
  .map((m) => ({ mc: m[1], format: Number(m[2]) }));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Icons are drawn as inline SVG, so they look the same in every browser (no emoji or symbol fonts needed).
const svg = (d, extra = "") => `<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const ICON = {
  music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>'),
  down: svg('<path d="M12 4v13"/><path d="M6 12l6 6 6-6"/><path d="M5 21h14"/>'),
  up: svg('<path d="M12 20V7"/><path d="M6 12l6-6 6 6"/><path d="M5 3h14"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  play: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18c-3-3-3-15 0-18z"/>'),
  brush: svg('<path d="M20 4l-9 9"/><path d="M11 13c-2-1-5 0-5 3 0 2-2 3-3 3 3 2 9 1 9-4z"/>'),
  smile: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8.5 10h.01M15.5 10h.01"/><path d="M9 15h6"/>'),
  grid: svg('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9.300h16M4 14.700h16M9.300 4v16M14.700 4v16"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.500h.01"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  person: svg('<circle cx="12" cy="6" r="3"/><path d="M8 21v-9h8v9"/><path d="M5 12h3M16 12h3"/>'),
  home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>'),
  code: svg('<path d="M8 6l-6 6 6 6"/><path d="M16 6l6 6-6 6"/>'),
  ext: svg('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>'),
  run: svg('<circle cx="14" cy="4.5" r="2"/><path d="M6 11l4-3 4 1 2 4 3 1"/><path d="M12 9l-2 6 4 3v4"/><path d="M10 15l-2 3H4"/>'),
  wrench: svg('<path d="M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3l8.5-8.5"/><path d="M14.5 6.5L17 4a4 4 0 0 0-5 5"/>'),
  hand: svg('<path d="M8 13V5a1.500 1.500 0 0 1 3 0v6"/><path d="M11 11V4a1.500 1.500 0 0 1 3 0v7"/><path d="M14 11V6a1.500 1.500 0 0 1 3 0v8"/><path d="M8 13l-1.500-2a1.500 1.500 0 0 0-2.500 1.700L7 18a5 5 0 0 0 4 2h2a4 4 0 0 0 4-4v-2"/>'),
  star: svg('<path d="M12 3l2.700 5.600 6.100.800-4.500 4.300 1.100 6.100L12 16.900 6.600 19.800l1.100-6.100L3.200 9.400l6.100-.800z"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>'),
  box: svg('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
  bug: svg('<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M12 7V4M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 20l3-3M19 20l-3-3"/>'),
  tag: svg('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="7.500" r="1.200"/>'),
};
function page({ title, body, depth = 0, description = "", active = "" }) {
  const up = "../".repeat(depth);
  const nav = (id, href, label) => `<a${id === active ? ' class="on"' : ""} href="${href}">${label}</a>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0f1412" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f4f6f5" media="(prefers-color-scheme: light)">
<meta name="mobile-web-app-capable" content="yes">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || "Fresh Moves Fix - player animation resource pack for Minecraft")}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:image" content="https://fresh-moves-fix.vercel.app/banner.png">
<meta name="twitter:card" content="summary_large_image">
<script>(function(){var t="system";try{t=localStorage.getItem("fmf-theme")||"system"}catch(e){}
if(t==="system")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
document.documentElement.setAttribute("data-theme",t)})()</script>
<link rel="icon" href="${up}pack.png">
<link rel="stylesheet" href="${up}style.css?v=${ver("style.css")}">
</head>
<body>
<header class="top"><div class="bar">
  <a class="brand" href="${up || "./"}"><img src="${up}pack.png" alt=""><span>Fresh Moves Fix</span></a>
  <nav>
    ${nav("home", up || "./", ICON.home + " Home")}
    ${nav("guides", up + "guides/", ICON.book + " Guides")}
    ${nav("editor", up + "editor/", ICON.eye + " Eye editor")}
    ${nav("title", up + "title/", ICON.tag + " Title")}
    ${nav("settings", up + "settings/", ICON.gear + " Settings")}
    <a rel="noopener" href="${REPO}">${ICON.code} GitHub</a>
  </nav>
  <span class="snd-wrap">
    <button type="button" class="snd" data-music-toggle aria-pressed="false" aria-label="Music">${ICON.music}</button>
    <span class="snd-card"><span class="snd-box">
      <span class="snd-head">${ICON.music} <b data-music-state>Music: off</b> <i data-music-time>0:00 / 3:34</i></span>
      <label class="snd-line"><input type="checkbox" data-music-check> Play music <i data-music-name>Calm</i></label>
      <label class="snd-line">Volume <input type="range" min="0" max="100" value="40" data-music-volume></label>
      <a class="snd-more" href="${up}settings/#music">${ICON.gear} Music settings</a>
    </span></span>
  </span>
  <a class="get" href="${up}#download">${ICON.down} Download</a>
</div></header>
${body}
<footer><div class="bar">
  <div class="cols">
    <div class="about">
      <a class="brand" href="${up || "./"}"><img src="${up}pack.png" alt=""><span>Fresh Moves Fix</span></a>
      <p>Fresh Moves Fix is <a rel="noopener" href="${REPO}">open source</a>.</p>
      <p>CC0 1.0 · a fork of <a rel="noopener" href="https://github.com/IthanMendoza/Fresh-Moves">Fresh Moves</a> by IthanMendoza, based on Fresh Animations by FreshLX.</p>
    </div>
    <div><h4>${ICON.box} Pack</h4>
      <a href="${up}#download">${ICON.down} Download</a>
      <a rel="noopener" href="${REPO}/releases">${ICON.tag} Releases</a>
      <a rel="noopener" href="${REPO}#changes-from-the-original-pack">${ICON.star} Changes</a>
    </div>
    <div><h4>${ICON.eye} Skins</h4>
      <a href="${up}guides/">${ICON.book} Eye guides</a>
      <a href="${up}editor/">${ICON.eye} Eye editor</a>
      <a href="${up}title/">${ICON.tag} Title</a>
      <a href="${up}guides/fix-black-eyes/">${ICON.wrench} Fix black eyes</a>
    </div>
    <div><h4>${ICON.wrench} Required mods</h4>
      <a rel="noopener" href="https://modrinth.com/mod/entity-model-features">${ICON.ext} Entity Model Features</a>
      <a rel="noopener" href="https://modrinth.com/mod/entitytexturefeatures">${ICON.ext} Entity Texture Features</a>
    </div>
    <div><h4>${ICON.list} Resources</h4>
      <a rel="noopener" href="${REPO}">${ICON.code} GitHub</a>
      <a rel="noopener" href="${REPO}/issues">${ICON.bug} Report issues</a>
      <a href="${up}settings/">${ICON.gear} Settings</a>
    </div>
  </div>
  <p class="legal">Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</p>
</div></footer>
<script src="${up}i18n.js?v=${ver("i18n.js")}"></script>
<script src="${up}music.js?v=${ver("music.js")}"></script>
<script src="${up}nav.js?v=${ver("nav.js")}"></script>
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
fs.copyFileSync(path.join(here, "title.png"), path.join(out, "title.png"));
for (const f of ["icon-skin.png", "icon-title.png", "icon-alex.png", "icon-dummy.png", "icon-dummy2.png"]) fs.copyFileSync(path.join(here, f), path.join(out, f));
fs.copyFileSync(path.join(here, "style.css"), path.join(out, "style.css"));
fs.copyFileSync(path.join(here, "i18n.js"), path.join(out, "i18n.js"));
fs.copyFileSync(path.join(here, "music.js"), path.join(out, "music.js"));
fs.copyFileSync(path.join(here, "nav.js"), path.join(out, "nav.js"));
// flag pictures for the language list (flag-icons, MIT), so no flag emoji are needed
fs.mkdirSync(path.join(out, "flags"), { recursive: true });
for (const f of ["us", "eg", "de", "es", "fr", "it", "br", "ru", "pl", "ua", "tr", "cn", "jp"])
  fs.copyFileSync(path.join(here, `node_modules/flag-icons/flags/4x3/${f}.svg`), path.join(out, "flags", `${f}.svg`));
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
  // bare GitHub attachment links are videos: show a video card with the player on the page,
  // and a plain link below in case it does not load
  md = md.replace(/^(https:\/\/github\.com\/\S+\/assets\/\S+)\s*$/gm, (m, url) =>
    `\n<figure class="video-card"><div class="video-head">${ICON.play}<span>Video</span></div>` +
    `<video controls playsinline preload="metadata" src="${url}"></video>` +
    `<figcaption>If the video does not play, <a href="${url}" target="_blank">open it on GitHub</a>. The website music pauses while the video plays.</figcaption></figure>\n`);
  let html = marked.parse(md);
  // links between docs -> links between pages
  html = html.replace(/href="<?([^"]+?\.md)>?"/g, (m, target) => {
    const d = bySource.get(decodeURIComponent(target));
    return d ? `href="../${d.slug}/"` : m;
  });
  html = html.replace(/%%PLAY%%/g, ICON.play);
  return html.replace(/<a href="http/g, '<a rel="noopener" href="http').replace(/<img /g, '<img loading="lazy" ');
}

for (const [i, d] of docs.entries()) {
  const md = fs.readFileSync(path.join(docsDir, d.file), "utf8").replace(/^# .*\n/, "");
  write(`guides/${d.slug}/index.html`, page({
    title: `${d.name} - Fresh Moves Fix`,
    active: "guides",
    depth: 2,
    body: `<div class="wrap"><article>
<div class="crumb"><a href="../../">${ICON.home} Home</a> ${ICON.right} <a href="../">${ICON.book} Guides</a></div>
<h1>${d.name.startsWith("Fix") ? ICON.wrench : ICON.eye} ${esc(d.name)}</h1>
${renderDoc(md)}
<div class="guide-nav">
  ${docs[i - 1] ? `<a class="card go back" href="../${docs[i - 1].slug}/">${ICON.left}<span>${esc(docs[i - 1].name)}</span></a>` : "<span></span>"}
  ${docs[i + 1] ? `<a class="card go" href="../${docs[i + 1].slug}/"><span>${esc(docs[i + 1].name)}</span>${ICON.right}</a>` : "<span></span>"}
</div>
<p class="guide-cta"><a class="btn" href="../../editor/">${ICON.eye} Open the eye editor</a> <a class="btn ghost" href="../">${ICON.book} All guides</a></p>
</article></div>`,
  }));
}

const fixes = docs.filter((d) => d.name.startsWith("Fix"));
const eyes = docs.filter((d) => !d.name.startsWith("Fix"));
const cards = (list) => `<div class="cards">${list.map((d) =>
  `<a class="card go" href="${d.slug}/"><span>${d.name.startsWith("Fix") ? ICON.wrench : ICON.eye} ${esc(d.name)}</span>${ICON.right}</a>`).join("")}</div>`;

write("guides/index.html", page({
  title: "Guides - Fresh Moves Fix",
  active: "guides",
  depth: 1,
  body: `<div class="wrap"><article>
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.book} Guides</h1>
<h2>${ICON.list} How to animate the eyes</h2>
<ol class="steps">
<li>Get the skin you want to use (from your Minecraft account, NameMC, or any skin you like).</li>
<li>Open it in a .png editor that supports transparency, such as Blockbench (free), GIMP or Photoshop.</li>
<li>Add the extra pixels for your eye type and size, following the matching guide below. Leave the face itself untouched, so players without the pack see a normal skin.</li>
<li>Save the skin and upload it in the Minecraft launcher or on your Minecraft account.</li>
</ol>
<h2>${ICON.wrench} Fixes</h2>
${cards(fixes)}
<h2>${ICON.eye} Eye and eyebrow types</h2>
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
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.eye} Skin eye editor</h1>
<p>Adds the extra pixels that make the eyes blink and move, then lets you download the skin. Everything happens in your browser; the skin is not uploaded anywhere.</p>
<div class="note"><strong>Not tested in-game.</strong> Some eye shapes are less certain than others (see "How it works" below). Keep a copy of your original skin.</div>

<div class="ed">
  <div class="ed-col">
  <section class="panel ecard">
    <h3 class="ehead"><canvas id="skinicon" class="tool-img" width="8" height="8" style="background-image:url(../icon-skin.png)" aria-hidden="true"></canvas><span><b>1. Skin</b><small>Load your skin or start from Steve, Alex or a dummy</small></span></h3>
    <label class="drop" id="drop">
      <input type="file" id="file" accept="image/png" class="vh">
      <span class="drop-ic">${ICON.up}</span>
      <span><b>Choose your skin file</b><br><small id="filename">or drop the .png here</small></span>
    </label>
    <p class="elabel">Or start from a default skin</p>
    <div class="pick">
      <button type="button" class="pickb" id="steve" data-name="Steve" data-type="2x1" data-pos="upper" data-skin="${skinData("wide/steve.png")}"><img src="../icon-skin.png" alt="" width="36" height="36"><span><b>Steve</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Alex" data-type="2x1" data-pos="upper" data-skin="${skinData("slim/alex.png")}"><img src="../icon-alex.png" alt="" width="36" height="36"><span><b>Alex</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (tall eyes)" data-type="1x2" data-pos="bottom" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "dummy.png")).toString("base64")}"><img src="../icon-dummy.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Tall eyes</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (dot eyes)" data-type="1x1" data-pos="outer_bottom" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "dummy2.png")).toString("base64")}"><img src="../icon-dummy2.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Dot eyes</small></span></button>
    </div>
    <p class="elabel">Format</p>
    <div class="pick">
      <label class="pickb"><input type="radio" name="fmt" id="fmtwide" value="default" checked><span><b>Steve</b><small>Wide arms</small></span></label>
      <label class="pickb"><input type="radio" name="fmt" id="fmtslim" value="slim"><span><b>Alex</b><small>Slim arms</small></span></label>
    </div>
    <p class="ehint">${ICON.info} The format is guessed from the skin when you load it. It only changes the 3D preview, not the file.</p>

  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.eye}</span><span><b>2. Eyes</b><small>Shape and place of the eyes</small></span></h3>
    <p><label>Eye shape
      <select id="type"></select></label></p>
    <p><label>Position on the face
      <select id="pos"></select></label></p>

  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.brush}</span><span><b>3. Colours</b><small>Eyelid, eye white and pupil</small></span></h3>
    <p class="row"><label>Eyelid <input type="hidden" id="lid" value="#9b6349"><button type="button" class="sw" data-for="lid" aria-label="Choose colour"></button></label></p>
    <p class="row">
      <label id="whitewrap">Eye white <input type="hidden" id="white" value="#ffffff"><button type="button" class="sw" data-for="white" aria-label="Choose colour"></button></label>
      <label><span id="pupilname">Pupil</span> <input type="hidden" id="pupil" value="#523d89"><button type="button" class="sw" data-for="pupil" aria-label="Choose colour"></button></label>
    </p>
    <label class="pickb wide"><input type="checkbox" id="custom" checked><span><b>Draw the eyes on the face</b><small>On: the old eyes are removed and the new ones are drawn in these colours. Off: the face is not changed and the eyes already drawn on your skin are used.</small></span></label>

    <div class="picker" id="picker" hidden>
      <div class="pk-head"><b id="pk-title">Colour</b><button type="button" id="pk-close" aria-label="Close">${ICON.close}</button></div>
      <canvas id="pk-sv" width="220" height="130"></canvas>
      <input type="range" id="pk-hue" min="0" max="360" value="0" aria-label="Hue">
      <div class="pk-row"><span class="pk-now" id="pk-now"></span><input type="text" id="pk-hex" maxlength="7" spellcheck="false" aria-label="Hex colour"></div>
      <small>From your skin's face</small>
      <div class="pk-sws" id="pk-skin"></div>
      <small>Basic colours</small>
      <div class="pk-sws" id="pk-basic"></div>
    </div>

  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.down}</span><span><b>4. Save</b><small>Download the finished skin</small></span></h3>
    <p><button type="button" class="btn" id="save" disabled>${ICON.down} Download skin (.png)</button></p>
    <p class="statline"><a id="status" class="status" href="#" target="_blank" rel="noopener" title="Open the skin picture in a new tab"></a></p>
  </section>
  </div>

  <div class="ed-col">
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.box}</span><span><b>3D preview</b><small>Drag to turn, scroll to zoom</small></span></h3>
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
      <p class="ehint">${ICON.info} Drag to turn the model, scroll to zoom. The preview shows the skin only; the blinking happens in-game.</p>
    </div>
    <p class="statline"><a id="msg3d" class="status" href="#" target="_blank" rel="noopener" title="Open a picture of the 3D preview in a new tab"></a></p>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.smile}</span><span><b>Face</b><small>How the eyes look on the skin</small></span></h3>
    <canvas id="face" width="256" height="256"></canvas>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.grid}</span><span><b>Added pixels</b><small>Top-left corner of the skin file</small></span></h3>
    <canvas id="top" width="480" height="96"></canvas>
  </section>
  <details id="flat" class="panel ecard">
    <summary class="ehead"><span class="tool-ic">${ICON.grid}</span><span><b>Whole skin file</b><small>The flat picture that gets downloaded</small></span><span class="chev">${ICON.down}</span></summary>
    <canvas id="full" width="384" height="384"></canvas>
  </details>
  </div>
</div>

<h2>${ICON.info} How it works</h2>
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
<script src="../editor.js?v=${ver("editor.js")}"></script>`,
}));

// ---------- settings ----------
// ---- Minecraft title: the real Blockbench web app, shown inside the page ----
const BB = "https://web.blockbench.net/?plugins=minecraft_title_generator";
write("title/index.html", page({
  title: "Minecraft title - Fresh Moves Fix",
  active: "title",
  description: "Make a Minecraft title or paint a skin with the real Blockbench web app, right on this page.",
  depth: 1,
  body: `<div class="wrap"><article class="editor">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.tag} Minecraft title</h1>
<p>This is the real <b>Blockbench</b> web app, shown inside this page. Press <b>New</b>, then <b>Minecraft Title</b> to make a title, or <b>Minecraft Skin</b> to paint a skin.</p>
<p><a class="btn" rel="noopener" target="_blank" href="${BB}">${ICON.right} Open Blockbench in a new tab</a>
<a class="btn ghost" rel="noopener" target="_blank" href="${REPO}/blob/arena/6ecf9e80-fresh-moves-fix/model.bbmodel">${ICON.down} Our title model (.bbmodel)</a></p>
<p><small>The "Fresh Moves Fix" title on the home page was made this way. Open the model file in Blockbench with File &rarr; Open Model.</small></p>
<div class="note">If the box below stays empty, or "Minecraft Title" is missing from the New list, use the button above. In Blockbench you can also add it by hand: File &rarr; Plugins &rarr; Available &rarr; "Minecraft Title Generator" &rarr; Install. Blockbench is made by JannisX11 and the Title Generator plugin by Ewan Howell; they are not part of Fresh Moves Fix.</div>
</article></div>
<div class="bb-frame"><iframe src="${BB}" title="Blockbench" loading="lazy" allow="clipboard-read; clipboard-write; fullscreen" allowfullscreen></iframe></div>`,
}));

const themeCard = (id, name, pb, pp, pl, pt) => `<label><span class="pv" style="--pb:${pb};--pp:${pp};--pl:${pl};--pt:${pt}"><i><b></b><u></u></i></span><span class="nm"><input type="radio" name="theme" value="${id}"> ${name}</span></label>`;
write("settings/index.html", page({
  title: "Settings - Fresh Moves Fix",
  active: "settings",
  depth: 1,
  body: `<div class="wrap"><article>
<h1>${ICON.gear} Settings</h1>
<div class="set">
  <div class="menu"><small>DISPLAY</small>
    <button type="button" class="tab on" data-tab="appearance">${ICON.brush} Appearance</button>
    <button type="button" class="tab" data-tab="language">${ICON.globe} Language</button>
    <small>SOUND</small>
    <button type="button" class="tab" data-tab="music">${ICON.music} Music</button></div>
  <div class="box" id="tab-music" hidden>
    <h2 class="shead"><span class="tool-ic">${ICON.music}</span><span><b>Music</b><small>Background song for the website</small></span></h2>
    <p>Background music made by your browser (no music files). Choose the calm song or the dark Herobrine song; each is 3 minutes 34 seconds long and repeats. It is off until you turn it on, and saved in this browser only.</p>
    <p class="elabel">Song</p>
    <div class="mtiles two">
      <label class="mtile"><input type="radio" name="song" value="calm" data-music-song checked><span><b>Calm</b><small>Soft and friendly</small></span></label>
      <label class="mtile"><input type="radio" name="song" value="herobrine" data-music-song><span><b>Herobrine</b><small>Dark and creepy</small></span></label>
    </div>
    <p class="elabel">Player</p>
    <div class="mtiles">
      <label class="mtile"><input type="checkbox" data-music-check><span><b>Play music</b><small data-music-state>Music: off</small></span><i data-music-time>0:00 / 3:34</i></label>
      <label class="mtile"><span class="mt-ic">${ICON.music}</span><span><b>Volume</b></span><input type="range" min="0" max="100" value="40" data-music-volume></label>
    </div>
    <p class="shint">${ICON.info} You can also use the music button at the top of every page. The music keeps playing while you move between pages of this site.</p>
  </div>
  <div class="box" id="tab-language" hidden>
    <h2 class="shead"><span class="tool-ic">${ICON.globe}</span><span><b>Language</b><small>Language of menus and buttons</small></span></h2>
    <div class="note">Only menus, buttons and the editor are translated. Guides and longer texts stay in English. The translations are machine-made and may contain mistakes.</div>
    <p>Choose your preferred language for the site.</p>
    <div class="langs" id="langs"></div>
  </div>
  <div class="box" id="tab-appearance">
    <h2 class="shead"><span class="tool-ic">${ICON.brush}</span><span><b>Color theme</b><small>Light, dark, OLED or glass</small></span></h2>
    <p>Select your preferred color theme for this website. It is saved in this browser only.</p>
    <div class="themes">
      ${themeCard("system", "Sync with system", "linear-gradient(90deg,#f4f6f5 50%,#0f1412 50%)", "#18201c", "#2a3630", "#9aa8a0")}
      ${themeCard("light", "Light", "#f4f6f5", "#ffffff", "#d5dcd8", "#17201b")}
      ${themeCard("dark", "Dark", "#0f1412", "#18201c", "#2a3630", "#9aa8a0")}
      ${themeCard("oled", "OLED", "#000000", "#0d0f0e", "#222826", "#98a39d")}
      ${themeCard("glass", "Glass", "radial-gradient(circle at 20% 20%,#2fae78 0,transparent 55%),radial-gradient(circle at 85% 80%,#3b6fd0 0,transparent 55%),#0a1210", "rgba(255,255,255,.16)", "rgba(255,255,255,.34)", "#eef6f1")}
    </div>
    <p class="saved" id="theme-saved" role="status" hidden>${ICON.check || ""}<span></span></p>
  </div>
</div>
</article></div>
<script>(function(){
  var key="fmf-theme", cur="system"; try{cur=localStorage.getItem(key)||"system"}catch(e){}
  function apply(t){ var r=t; if(t==="system") r=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"; document.documentElement.setAttribute("data-theme",r); }
  var note=document.getElementById("theme-saved");
  function told(el, ok){ if(!note) return; var name=(el.closest("label").textContent||"").trim();
    note.querySelector("span").textContent = ok ? "Saved: " + name + ". It stays when you close the page." : "Could not save: this browser blocks saving. The theme lasts until you close the page.";
    note.classList.toggle("bad", !ok); note.hidden=false; note.classList.remove("flash"); void note.offsetWidth; note.classList.add("flash"); }
  document.querySelectorAll('input[name="theme"]').forEach(function(el){
    el.checked = el.value===cur;
    el.addEventListener("change",function(){ cur=el.value; var ok=true; try{localStorage.setItem(key,cur); ok=localStorage.getItem(key)===cur}catch(e){ok=false} apply(cur); told(el, ok); });
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener("change",function(){ if(cur==="system") apply(cur); });
})()</script>
<script>(function(){function go(){
  var tabs=document.querySelectorAll(".tab");
  function show(id){ tabs.forEach(function(t){ var on=t.getAttribute("data-tab")===id; t.classList.toggle("on",on); document.getElementById("tab-"+t.getAttribute("data-tab")).hidden=!on; }); }
  tabs.forEach(function(t){ t.addEventListener("click",function(){ var id=t.getAttribute("data-tab"); show(id); try{history.replaceState(null,"","#"+id)}catch(e){} }); });
  if(location.hash==="#language") show("language"); if(location.hash==="#music") show("music");
  var FLAG={en:"us",ar:"eg",de:"de",es:"es",fr:"fr",it:"it",pt:"br",ru:"ru",pl:"pl",uk:"ua",tr:"tr",zh:"cn",ja:"jp"};
  var box=document.getElementById("langs"), api=window.fmfI18n; if(!api) return;
  api.langs.forEach(function(l){
    var lab=document.createElement("label"); lab.className="lang"+(api.get()===l[0]?" on":"");
    var code=document.createElement("span"); code.className="code"; code.textContent=l[0].toUpperCase();
    var fl=document.createElement("img"); fl.className="flag"; fl.alt=""; fl.width=28; fl.height=21; fl.src="../flags/"+FLAG[l[0]]+".svg"; fl.onerror=function(){ fl.replaceWith(code); };
    var name=document.createElement("b"); name.textContent=l[1]; name.setAttribute("translate","no");
    var en=document.createElement("small"); en.textContent=l[1]===l[2]?"":l[2];
    var inp=document.createElement("input"); inp.type="radio"; inp.name="lang"; inp.value=l[0]; inp.checked=api.get()===l[0];
    inp.addEventListener("change",function(){ api.set(l[0]); box.querySelectorAll(".lang").forEach(function(x){x.classList.remove("on")}); lab.classList.add("on"); });
    lab.appendChild(FLAG[l[0]]?fl:code); lab.appendChild(name); lab.appendChild(en); lab.appendChild(inp); box.appendChild(lab);
  });
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",go); else go();})()</script>`,
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
  const newest = g === groups[groups.length - 1];
  return `<a class="ver" download href="${dl(`Fresh-Moves-Fix-mc${last}.zip`)}" title="Download Fresh-Moves-Fix-mc${last}.zip">
    <span class="tool-head"><img class="ver-ic" src="pack.png" alt="" width="40" height="40" loading="lazy"><span><b>${label}</b><small>Minecraft</small></span></span>
    <span class="tags"><i>format ${g.format}</i><i class="dl">${ICON.down} .zip</i></span>${newest ? '<i class="ver-new">Newest</i>' : ""}
  </a>`;
}).join("\n");

write("index.html", page({
  title: "Fresh Moves Fix - player animations for Minecraft",
  active: "home",
  description: "A fork of the Fresh Moves resource pack: smoother player animations and animated eyes, with builds for Minecraft 1.20 to 26.3.",
  body: `<div class="wrap">
<div class="hero">
  <img src="pack.png" alt="Fresh Moves Fix pack icon">
  <div class="txt">
    <h1 class="mc-title"><img src="title.png?2" width="1708" height="228" alt="Fresh Moves Fix"></h1>
    <p>Smoother, more expressive player animations and animated eyes for Minecraft. A fork of Fresh Moves with small fixes and builds for Minecraft ${versions[0].mc} to ${versions[versions.length - 1].mc}.</p>
    <a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">${ICON.down} Download ${esc(version)}</a>
    <a class="btn ghost" href="editor/">${ICON.eye} Skin eye editor</a>
    <a class="btn ghost" href="guides/">${ICON.book} Eye guides</a>
  </div>
</div>

<section>
  <div class="note"><strong>Beta.</strong> These builds have not been tested in-game yet. On Minecraft 1.21.4 and newer the cape and elytra may not be animated.</div>
  <h2>${ICON.star} What it does</h2>
  <div class="cards">
    <a class="card feat" href="#download"><h3>${ICON.run} Player animations</h3><p>Reworked walking, sprinting, sneaking, swimming, crawling and sleeping, in the style of Fresh Animations.</p><span class="more">Download ${ICON.right}</span></a>
    <a class="card feat" href="guides/"><h3>${ICON.eye} Animated eyes</h3><p>Eyes blink and look around when your skin has the marker pixels described in the guides.</p><span class="more">Eye guides ${ICON.right}</span></a>
    <a class="card feat" rel="noopener" href="${REPO}#changes-from-the-original-pack"><h3>${ICON.wrench} Changes in this fork</h3><p>Eyes stay closed while sleeping and after death, and the second skin layer no longer moves twice on 1.21.2+.</p><span class="more">Changes ${ICON.ext}</span></a>
    <a class="card feat" href="editor/"><h3>${ICON.hand} Wave emote</h3><p>Stand still, sneak and look straight up, and your right arm waves.</p><span class="more">3D preview ${ICON.right}</span></a>
  </div>
</section>
<section>
  <h2>${ICON.brush} Create</h2>
  <div class="tools">
    <a class="tool" href="editor/">
      <span class="tool-head"><img class="tool-img" src="icon-skin.png" alt="" width="48" height="48"><span><b>Minecraft Skin</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Add blinking, moving eyes to your skin and see it in 3D.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Skin</i><i>Eyes</i></span>
    </a>
    <a class="tool" href="title/">
      <span class="tool-head"><img class="tool-img" src="icon-title.png" alt="" width="48" height="48"><span><b>Minecraft Title</b><small>Blockbench + Title Generator</small></span></span>
      <span class="tool-text">Make a real 3D Minecraft title in Blockbench, right on this website.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Title</i><i>Logo</i></span>
    </a>
  </div>
</section>

<section>
  <h2>${ICON.wrench} Requirements</h2>
  <p>You need the <strong>latest</strong> versions of these two client-side mods (Fabric, Forge and NeoForge):</p>
  <p>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entity-model-features">${ICON.ext} Entity Model Features (EMF)</a>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entitytexturefeatures">${ICON.ext} Entity Texture Features (ETF)</a>
  </p>
  <p>On Minecraft 1.21.9 and newer armour only follows the animations with a recent EMF (3.0.5 or newer; 3.0.12 fixes armour lag).</p>
</section>

<section id="download">
  <h2>${ICON.down} Download</h2>
  <p><a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">${ICON.down} Fresh-Moves-Fix.zip - all versions</a></p>
  <p>One zip for every supported version. Or pick the zip labelled for your Minecraft version:</p>
  <div class="versions">
${versionLinks}
  </div>
  <p style="margin-top:16px"><a rel="noopener" href="${REPO}/releases">${ICON.tag} All releases on GitHub</a></p>
</section>

<section>
  <h2>${ICON.list} How to install</h2>
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
