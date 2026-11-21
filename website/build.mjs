// Builds the static website into ./public from the repository files.
import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "public");
const REPO = "https://github.com/BT-Studio-dev/Fresh-Moves-Fix";
const skinReleases = JSON.parse(fs.readFileSync(path.join(root, "minecraft-skins/upstream-releases.json"), "utf8"));

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const version = read("VERSION").trim();
// time of the release on GitHub (asked at build time; the page asks again when it is opened)
let releaseTime = "";
try {
  const r = await fetch(`https://api.github.com/repos/BT-Studio-dev/Fresh-Moves-Fix/releases/tags/v${version}`, { headers: { "User-Agent": "fresh-moves-fix-site" }, signal: AbortSignal.timeout(8000) });
  if (r.ok) { const j = await r.json(); releaseTime = (j.assets || []).map((x) => x.updated_at).sort().pop() || j.published_at || ""; }
} catch (e) {}
const dl = (file) => `${REPO}/releases/download/v${version}/${file}`;

// A short fingerprint of a file, added to its address, so browsers fetch the new file after every change
// instead of showing an old saved copy of the styles or scripts.
import { createHash } from "node:crypto";
// a new address when the banner changes, so chat apps (Discord...) fetch the new picture for link previews
const bannerVer = createHash("sha1").update(fs.readFileSync(path.join(root, "docs/images/banner.png"))).digest("hex").slice(0, 8);
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
  lock: svg('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
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
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3-3a6 6 0 0 1-7.7 7.7l-6.8 6.8a2.1 2.1 0 0 1-3-3l6.8-6.8a6 6 0 0 1 7.7-7.7z"/>'),
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
<meta property="og:image" content="https://fresh-moves-fix.vercel.app/banner.png?v=${bannerVer}">
<meta property="og:image:width" content="1920">
<meta property="og:image:height" content="1080">
<meta name="twitter:card" content="summary_large_image">
<script>(function(){var t="";try{t=localStorage.getItem("fmf-theme")||""}catch(e){}
if(!t){try{var m=document.cookie.match(/(?:^|; )fmf-theme=([a-z]+)/);if(m)t=m[1]}catch(e){}}
if(["system","light","dark","oled","glass","minecraft","nightsky"].indexOf(t)<0)t="glass";
if(t==="system")t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";
document.documentElement.setAttribute("data-theme",t);
var bg="";try{bg=localStorage.getItem("fmf-background")||""}catch(e){}
if(!bg){try{var b=document.cookie.match(/(?:^|; )fmf-background=(on|off)/);if(b)bg=b[1]}catch(e){}}
document.documentElement.setAttribute("data-background",bg==="off"?"off":"on");
var sb="";try{sb=localStorage.getItem("fmf-scrollbar")||""}catch(e){}
if(!sb){try{var sm=document.cookie.match(/(?:^|; )fmf-scrollbar=(on|off)/);if(sm)sb=sm[1]}catch(e){}}
document.documentElement.setAttribute("data-scrollbar",sb==="off"?"off":"on")})()</script>
<link rel="icon" href="${up}favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="192x192" href="${up}icon-192.png">
<link rel="apple-touch-icon" href="${up}icon-180.png">
<link rel="manifest" href="${up}site.webmanifest">
<link rel="yandex-tableau-widget" href="${up}tableau.json">
<meta name="application-name" content="Fresh Moves Fix">
<meta name="apple-mobile-web-app-title" content="Fresh Moves Fix">
<link rel="stylesheet" href="${up}style.css?v=${ver("style.css")}">
<link rel="stylesheet" href="${up}refresh-2026.css?v=${ver("refresh-2026.css")}">
</head>
<body>
<header class="top"><div class="bar">
  <a class="brand" href="${up || "./"}"><img src="${up}pack.png" alt=""><span>Fresh Moves Fix</span></a>
  <nav>
    ${nav("home", up || "./", ICON.home + " Home")}
    ${nav("guides", up + "guides/", ICON.book + " Guides")}
    ${nav("creations", up + "creations/", ICON.box + " Projects")}
    ${nav("editor", up + "editor/", ICON.eye + " Eye editor")}
    ${nav("title", up + "title/", ICON.tag + " Title")}
    ${nav("settings", up + "settings/", ICON.gear + " Settings")}
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
<script src="${up}enhancements.js?v=${ver("enhancements.js")}"></script>
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
// Minecraft Skins downloads are temporarily unavailable; keep the JARs out of the public build.
// icons for browser start pages, bookmarks and "add to home screen"
for (const f of ["favicon.ico", "icon-180.png", "icon-192.png", "icon-512.png", "tile-logo.png"]) fs.copyFileSync(path.join(here, f), path.join(out, f));
const SITE = "https://fresh-moves-fix.vercel.app/";
fs.writeFileSync(path.join(out, "site.webmanifest"), JSON.stringify({
  name: "Fresh Moves Fix", short_name: "Fresh Moves", start_url: "/", display: "browser",
  background_color: "#0f1412", theme_color: "#17362a",
  icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
}));
fs.writeFileSync(path.join(out, "tableau.json"), JSON.stringify({
  version: "1.0", api_version: 1,
  layout: { logo: SITE + "tile-logo.png", color: "#17362a", show_title: true },
}));
for (const f of ["icon-skin.png", "icon-title.png", "icon-alex.png", "icon-dummy.png", "icon-dummy2.png", "icon-anim.png", "icon-model.png", "icon-paint.png", "icon-painted.png"]) fs.copyFileSync(path.join(here, f), path.join(out, f));
fs.copyFileSync(path.join(here, "style.css"), path.join(out, "style.css"));
for (const f of ["night-stars.svg", "night-clouds.svg", "night-moon.svg", "owner-profile.png", "owner-skin.png"]) fs.copyFileSync(path.join(here, f), path.join(out, f));
fs.copyFileSync(path.join(here, "refresh-2026.css"), path.join(out, "refresh-2026.css"));
fs.copyFileSync(path.join(here, "enhancements.js"), path.join(out, "enhancements.js"));
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
<div class="text-card guide-prose">${renderDoc(md)}</div>
<div class="guide-nav">
  ${docs[i - 1] ? `<a class="card go back" href="../${docs[i - 1].slug}/">${ICON.left}<span>${esc(docs[i - 1].name)}</span></a>` : ""}
  ${docs[i + 1] ? `<a class="card go" href="../${docs[i + 1].slug}/"><span>${esc(docs[i + 1].name)}</span>${ICON.right}</a>` : ""}
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
  body: `<div class="wrap"><article class="guides-index">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.book} Guides</h1>
<div class="text-card">
<h2>${ICON.list} How to animate the eyes</h2>
<ol class="steps">
<li>Get the skin you want to use (from your Minecraft account, NameMC, or any skin you like).</li>
<li>Open it in a .png editor that supports transparency, such as Blockbench (free), GIMP or Photoshop.</li>
<li>Add the extra pixels for your eye type and size, following the matching guide below. Leave the face itself untouched, so players without the pack see a normal skin.</li>
<li>Save the skin and upload it in the Minecraft launcher or on your Minecraft account.</li>
</ol>
</div>
<h2>${ICON.wrench} Fixes</h2>
${cards(fixes)}
<h2>${ICON.eye} Eye and eyebrow types</h2>
${cards(eyes)}
<p class="text-card guide-credit">These guides are copied from the original Fresh Moves wiki. Images and videos are hosted on the original GitHub repository.</p>
</article></div>`,
}));

// Shared preview-only backdrop controls for the two skin editors.
const backdropControls = `<div class="backdrop-controls" role="group" aria-label="Preview backdrop">
  <span>Backdrop</span>
  <button type="button" data-backdrop="default" aria-label="Theme backdrop" title="Theme backdrop" aria-pressed="true"></button>
  <button type="button" data-backdrop="#101714" style="--swatch:#101714" aria-label="Dark backdrop" title="Dark backdrop" aria-pressed="false"></button>
  <button type="button" data-backdrop="#303844" style="--swatch:#303844" aria-label="Slate backdrop" title="Slate backdrop" aria-pressed="false"></button>
  <button type="button" data-backdrop="#e1e7e3" style="--swatch:#e1e7e3" aria-label="Light backdrop" title="Light backdrop" aria-pressed="false"></button>
  <button type="button" data-backdrop="#7fb8ff" style="--swatch:#7fb8ff" aria-label="Blue backdrop" title="Blue backdrop" aria-pressed="false"></button>
  <label class="backdrop-custom">Custom <input type="color" data-backdrop-custom value="#7fb8ff" aria-label="Custom backdrop colour"></label>
</div>`;

// ---------- skin eye editor ----------
// the two default skins are embedded in the page, so the editor needs no extra requests
const skinData = (p) => "data:image/png;base64," + fs.readFileSync(path.join(root, "assets/minecraft/textures/entity/player", p)).toString("base64");
fs.copyFileSync(path.join(here, "editor.js"), path.join(out, "editor.js"));
fs.copyFileSync(path.join(here, "paint.js"), path.join(out, "paint.js"));
fs.copyFileSync(path.join(here, "backdrop.js"), path.join(out, "backdrop.js"));
fs.copyFileSync(path.join(here, "player.js"), path.join(out, "player.js"));
fs.copyFileSync(path.join(here, "studio.js"), path.join(out, "studio.js"));
fs.copyFileSync(path.join(here, "ui.js"), path.join(out, "ui.js"));
fs.copyFileSync(path.join(here, "title.js"), path.join(out, "title.js"));
fs.copyFileSync(path.join(here, "cape.js"), path.join(out, "cape.js"));
fs.copyFileSync(path.join(here, "node_modules/jszip/dist/jszip.min.js"), path.join(out, "jszip.min.js"));
// 3D preview library (skinview3d, MIT licence), served from this site
fs.copyFileSync(path.join(here, "node_modules/skinview3d/bundles/skinview3d.bundle.js"), path.join(out, "skinview3d.bundle.js"));
write("editor/index.html", page({
  title: "Skin eye editor - Fresh Moves Fix",
  active: "editor",
  description: "Add the animated-eye pixels for Fresh Moves to your Minecraft skin and download the result.",
  depth: 1,
  body: `<div class="wrap editor-workspace-wrap"><article class="editor eye-workspace">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.eye} Skin eye editor</h1>
<p>Adds the extra pixels that make the eyes blink and move, then lets you download the skin. Everything happens in your browser; the skin is not uploaded anywhere.</p>
<div class="note"><strong>Eyes tested in-game:</strong> a player reported that their eyes blink and move. Other eye shapes and features may behave differently and still need testing (see "How it works" below). Keep a copy of your original skin. <a href="#test">How to test it in the game</a></div>

<div class="ed workspace-layout">
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
      <button type="button" class="pickb" data-name="Dummy (blank face)" data-type="2x1" data-pos="upper" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "painted.png")).toString("base64")}"><img src="../icon-painted.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Blank face</small></span></button>
    </div>
    <p class="elabel">Format</p>
    <div class="pick">
      <label class="pickb"><input type="radio" name="fmt" id="fmtwide" value="default" checked><span><b>Steve</b><small>Wide arms</small></span></label>
      <label class="pickb"><input type="radio" name="fmt" id="fmtslim" value="slim"><span><b>Alex</b><small>Slim arms</small></span></label>
    </div>
    <p class="ehint">${ICON.info} The format is guessed from the skin when you load it. If you pick the other one, the arms in the saved file are changed to fit it (Steve = 4 pixels wide, Alex = 3).</p>

  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.eye}</span><span><b>2. Eyes</b><small>Shape and place of the eyes, eyebrows, eyelashes, mouth</small></span></h3>
    <p class="elabel">Quick choice</p>
    <p class="row"><button type="button" class="btn ghost" id="eyeboy">Boy eyes</button> <button type="button" class="btn ghost" id="eyegirl">Girl eyes</button></p>
    <p class="ehint">${ICON.info} <span>Boy: small eyes, 2 wide and 1 tall, with eyebrows. Girl: big eyes, 2 wide and 2 tall, with eyelashes. You can still change everything below.</span></p>
    <p><label>Eye shape
      <select id="type"></select></label></p>
    <p><label>Position on the face
      <select id="pos"></select></label></p>
    <p><label>Eyebrows
      <select id="brow">
        <option value="keep">Do not change</option>
        <option value="none">No moving eyebrows</option>
        <option value="f2">Top (row 3 of the face, above the eyes)</option>
        <option value="f3">Upper middle (row 4, above the eyes)</option>
        <option value="f4">Lower middle (row 5, above the eyes)</option>
        <option value="f5">Bottom (row 6, above the eyes)</option>
        <option value="h2">On the hat layer, top (above the eyes)</option>
        <option value="h3">On the hat layer, upper middle (above the eyes)</option>
        <option value="h4">On the hat layer, lower middle (above the eyes)</option>
        <option value="h5">On the hat layer, bottom (above the eyes)</option>
        <option value="villager">Villager (one long eyebrow, above the eyes)</option>
      </select></label></p>
    <p><label>Mouth
      <select id="mouth">
        <option value="keep">Do not change</option>
        <option value="boy">Boy mouth (small, brown, under the eyes)</option>
        <option value="girl">Girl mouth (small, pink, under the eyes)</option>
        <option value="wide">Wide mouth (under the eyes)</option>
        <option value="beard">Mouth with beard (like Steve, under the eyes)</option>
        <option value="none">No mouth (plain skin, under the eyes)</option>
      </select></label></p>
    <label class="pickb wide" id="lashwrap"><input type="checkbox" id="lash"><span><b>Eyelashes</b><small>Only with the eye shape "2 wide, 2 tall" at the position "Bottom".</small></span></label>
    <p class="ehint">${ICON.info} <span>Eyebrows are drawn just above the eyes, and the mouth is drawn under the eyes. Hat-layer eyebrows and eyelashes are drawn by the pack in the game, so the preview here does not show them. Not tested in-game.</span></p>
    <p class="ehint">${ICON.info} <span>The mouth is the lips area in the two bottom rows of the face. With pack 3.1-fix6 or newer the mouth opens in the game when you get hurt, cheer or wave. With 3.1-fix7 or newer you can also switch a talking mouth on and off: tap sneak twice quickly while looking forward. It does not follow your real voice; a pack cannot hear Simple Voice Chat (two hidden pixels in the skin file tell the pack; not tested in the game). It is drawn under the eyes; with eyes at the very bottom there is no room and it is left out. The beard uses the eyebrow colour.</span></p>

  </section>
  </div>
  <div class="ed-col workspace-side">
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.brush}</span><span><b>3. Colours</b><small>Eyelid, eyes, eyebrows, eyelashes and mouth</small></span></h3>
    <p class="row"><label>Eyelid <input type="hidden" id="lid" value="#9b6349"><button type="button" class="sw" data-for="lid" aria-label="Choose colour"></button></label></p>
    <p class="row">
      <label id="whitewrap">Eye white <input type="hidden" id="white" value="#ffffff"><button type="button" class="sw" data-for="white" aria-label="Choose colour"></button></label>
      <label><span id="pupilname">Pupil</span> <input type="hidden" id="pupil" value="#523d89"><button type="button" class="sw" data-for="pupil" aria-label="Choose colour"></button></label>
    </p>
    <p class="row">
      <label id="browwrap">Eyebrows <input type="hidden" id="browcol" value="#3a2616"><button type="button" class="sw" data-for="browcol" aria-label="Choose colour"></button></label>
      <label id="mouthwrap">Mouth <input type="hidden" id="mouthcol" value="#c4826a"><button type="button" class="sw" data-for="mouthcol" aria-label="Choose colour"></button></label>
      <label id="lashcolwrap">Eyelashes <input type="hidden" id="lashcol" value="#1c1c1c"><button type="button" class="sw" data-for="lashcol" aria-label="Choose colour"></button></label>
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

  <div class="ed-col workspace-preview">
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.box}</span><span><b>3D preview</b><small>Drag to turn, scroll to zoom</small></span></h3>
    ${backdropControls}
    <div id="wrap3d">
      <canvas id="view3d" width="420" height="520"></canvas>
      <p class="row ctl">
        <label>Emote <select id="anim">
          <option value="idle" selected>Standing</option>
          <option value="walk">Walking</option>
          <option value="run">Running</option>
          <option value="wave">Waving</option>
          <option value="cheer">Cheer</option>
          <option value="dance">Dance</option>
          <option value="jacks">Jumping jacks</option>
          <option value="clap">Clap</option>
          <option value="dab">Dab</option>
          <option value="sit">Sit</option>
          <option value="look">Look around</option>
          <option value="tpose">T-pose</option>
        </select></label>
        <button type="button" class="btn ghost" id="play3d" aria-pressed="false" title="Stop or start the movement">Pause</button>
        <label title="The eyes blink and look left and right, like the pack does in the game"><input type="checkbox" id="eyes3d" checked> Eyes blink and move</label>
        <label><input type="checkbox" id="spin"> Spin</label>
        <label title="Shows or hides the second skin layer (hat, jacket, sleeves)"><input type="checkbox" id="outer3d" checked> Show the outer layer</label>
        <label title="Shows the second skin layer (hat, jacket, sleeves) as little 3D blocks, like the 3D Skin Layers mod"><input type="checkbox" id="layers3d"> 3D skin layers</label>
        <label>Zoom <input type="range" id="zoom" min="0.6" max="2.4" step="0.05" value="0.9"></label>
      </p>
      <p class="ehint">${ICON.info} Drag to turn the model, scroll to zoom. The preview shows the skin only; the blinking happens in-game.</p>
    </div>
    <div class="why3d" id="why3d" hidden>
      <p>${ICON.info} <span id="why3dtext"></span></p>
      <p><span id="why3dmore">You can still edit and download your skin; only the turning model is missing.</span> <a href="https://get.webgl.org" target="_blank" rel="noopener">Test 3D in this browser</a></p>
      <button type="button" class="btn" id="retry3d">Try again</button>
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

<section class="text-card">
<h2 id="test">${ICON.info} How to test it in the game</h2>
<p>A player confirmed that blinking and moving eyes worked in their game. Results may differ with other skins, eye shapes or versions. Use Minecraft Java Edition; the website preview cannot test the pack for you. Keep a copy of your original skin.</p>
<ol class="steps">
  <li><strong>Make and save your skin.</strong> In card 2 choose the eye shape and position matching your face. If you want a mouth, pick one from the Mouth list. In card 4, press <b>Download skin (.png)</b>.</li>
  <li><strong>Use the skin.</strong> In the Minecraft Launcher open Skins, choose New skin and Browse, then select your downloaded PNG. Choose Wide or Slim to match your skin and select Save &amp; Use.</li>
  <li><strong>Install the mods.</strong> Use a mod loader supported by your Minecraft version, plus matching versions of <a href="https://modrinth.com/mod/entity-model-features" rel="noopener">Entity Model Features (EMF)</a> and <a href="https://modrinth.com/mod/entitytexturefeatures" rel="noopener">Entity Texture Features (ETF)</a>. Put the mod JARs in the <code>mods</code> folder. For Fabric, also install a matching <a href="https://modrinth.com/mod/fabric-api" rel="noopener">Fabric API</a> and launch the Fabric profile. Fabric does not show a Mods button unless you add Mod Menu.</li>
  <li><strong>Install one pack.</strong> <a href="../#download">Download Fresh Moves Fix</a>, put the ZIP in <code>resourcepacks</code> without unzipping it, then enable it in Options → Resource Packs. Choose either the normal pack or Eyes Only, not both. Eyes Only does not have body emotes.</li>
  <li><strong>Check the eyes.</strong> Open a world and press F5 twice to face the camera. Wait for a blink and move around to check the eye animation. Simple eye types only blink.</li>
  <li><strong>Try the mouth (optional).</strong> With a supported mouth skin, try getting hurt. To try the talking switch in pack 3.1-fix7 or newer, look forward and tap sneak twice quickly; repeat to stop. This is not linked to voice chat. Mouth animations and their placement are not tested in-game.</li>
</ol>
<h3>If something is wrong</h3>
<ul>
  <li><strong>Body moves, eyes do not:</strong> check that the downloaded skin is active on your account and that the selected eye shape and position match its face. Reload resources with F3 + T and try again.</li>
  <li><strong>Nothing moves:</strong> check the game version, loader and mod versions, and that the pack is enabled. The Eyes Only pack intentionally leaves body movement unchanged.</li>
  <li><strong>Black eyes:</strong> follow the <a href="../guides/fix-black-eyes/">Fix Black Eyes guide</a>.</li>
  <li><strong>Mouth missing or misplaced:</strong> make sure you selected a mouth in the editor and saved the new skin. The moving mouth only supports face row 7; some eye positions leave no room or place it lower. Its in-game position is untested.</li>
</ul>
</section>

<section class="editor-info-card">
<h2>${ICON.info} How it works</h2>
<p>Choose the eye shape and position that match your skin. The editor adds marker pixels to the skin file; the pack reads those pixels to animate the eyes. The green outline in <b>Added pixels</b> shows the eye marker area. Other marker pixels can be elsewhere in the skin.</p>
<ul>
<li><b>2 wide</b> (1, 2 or 3 tall): the eyes sit one pixel in from each side of the face; the pupils move and the eyes blink.</li>
<li><b>Derp</b>: like 2 wide, 1 tall, with cross-eyed pupils.</li>
<li><b>3 wide (enderman)</b>: the eyes touch the sides of the face.</li>
<li><b>Simple</b> (1 wide): no moving pupil; the eyes only blink.</li>
</ul>
<p><b>Eyebrows and mouth:</b> the editor can draw them on the face and add marker pixels for the pack. For a supported mouth in face row 7, the two pixels at x 60–61, y 32 give the open mouth colour. The website preview does not prove the in-game animation works.</p>
<p><b>Keep the face on the first skin layer.</b> The pack animates the first layer only. Eyes or eyebrows painted on the outer layer (the hat layer) stay still in front of the moving eyes, so the editor removes solid outer-layer pixels over the eyes; see-through glass is kept. Do not erase the face of your skin: players without the pack and the mods still see your normal face.</p>
<p>${ICON.ext} Video by Laynce that shows the eye types, eyebrows and eyelashes of the original Fresh Moves pack: <a href="https://www.youtube.com/watch?v=uDccyv7FROs" target="_blank" rel="noopener">The Animation Update</a> (YouTube, not made by us).</p>
<p>The positions of 2 wide 1 tall and 2 wide 2 tall come from the example skins in the pack. The other shapes were worked out from the pack's model file and are less certain; the derp layout is the least certain. Eyebrows and eyelashes were also worked out from the model file and are not tested in the game. Fox eyes are not in the editor (the guide marks them as unfinished); see the <a href="../guides/">guides</a>.</p>
</section>
</article></div>
<script src="../skinview3d.bundle.js"></script>
<script src="../player.js?v=${ver("player.js")}"></script>
<script src="../editor.js?v=${ver("editor.js")}"></script>
<script src="../backdrop.js?v=${ver("backdrop.js")}"></script>`,
}));

// ---------- settings ----------
// ---- Minecraft title: the real Blockbench web app, shown inside the page ----
const BB = "https://web.blockbench.net/?plugins=minecraft_title_generator";
write("title/index.html", page({
  title: "Minecraft title - Fresh Moves Fix",
  active: "title",
  description: "Type a text and download a Minecraft-style block-letter title picture, right in your browser.",
  depth: 1,
  body: `<div class="wrap twide"><article class="editor">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.tag} Minecraft title</h1>
<p>Type your text and get a block-letter title picture, in the style of the "Fresh Moves Fix" title. Everything happens in your browser. It works without 3D graphics (WebGL).</p>
<div class="ed paint ted">
  <div class="ed-col">
  <section class="panel ecard">
    <h3 class="ehead"><img class="tool-img" src="../icon-title.png" alt="" width="44" height="44"><span><b>1. Title</b><small>Text, texture, overlay, style and settings</small></span></h3>
    <div class="ttabs" role="tablist">
      <button type="button" role="tab" data-ttab="text">Text</button>
      <button type="button" role="tab" data-ttab="texture">Texture</button>
      <button type="button" role="tab" data-ttab="overlay">Overlay</button>
      <button type="button" role="tab" data-ttab="style">Style</button>
      <button type="button" role="tab" data-ttab="settings">Settings</button>
    </div>
    <div id="tp-text">
    <p class="prow tline"><label>Line 1 <input type="text" id="tt1" class="ttext" maxlength="24" value="MINECRAFT" spellcheck="false"></label> <input type="color" id="tc1" value="#ffffff" aria-label="Colour of line 1"> <label>Type <select id="tk1"><option value="top" selected>Top</option><option value="bottom">Bottom</option><option value="small">Small</option></select></label></p>
    <p class="prow tline"><label>Line 2 <input type="text" id="tt2" class="ttext" maxlength="24" value="HEROBRINE" spellcheck="false"></label> <input type="color" id="tc2" value="#63ff54" aria-label="Colour of line 2"> <label>Type <select id="tk2"><option value="top">Top</option><option value="bottom" selected>Bottom</option><option value="small">Small</option></select></label></p>
    <p class="prow tline"><label>Line 3 <input type="text" id="tt3" class="ttext" maxlength="24" value="JAVA EDITION" spellcheck="false"></label> <input type="color" id="tc3" value="#ffd24a" aria-label="Colour of line 3"> <label>Type <select id="tk3"><option value="top">Top</option><option value="bottom">Bottom</option><option value="small" selected>Small</option></select></label></p>
    <p class="ehint">${ICON.info} <span>Type: <b>Top</b> is the big "Minecraft" text, <b>Bottom</b> is the smaller update text under it, <b>Small</b> is the little edition text. Letters A to Z, numbers and ! ? . - : work. Leave a line empty to skip it.</span></p>
    <p class="elabel">Ready-made</p>
    <p class="prow">
      <button type="button" class="btn ghost" data-title="MINECRAFT|#ffffff|top;HEROBRINE|#63ff54|bottom;JAVA EDITION|#ffd24a|small">Minecraft Herobrine</button>
      <button type="button" class="btn ghost" data-title="FRESH MOVES|#ffffff|top;FIX|#63ff54|top">Fresh Moves Fix</button>
      <button type="button" class="btn ghost" data-title="MY SERVER|#ffd24a|top;SEASON 2|#ffffff|bottom">My Server</button>
    </p>
    </div>
    <div id="tp-texture" hidden>
      <p class="prow"><label>Texture <select id="ttex"><option value="plain" selected>Plain colour</option><option value="stone">Stone</option><option value="bricks">Bricks</option><option value="planks">Planks</option><option value="stripes">Stripes</option><option value="dots">Dots</option><option value="grass">Grass block</option><option value="ore">Diamond ore</option><option value="gold">Gold</option><option value="lava">Lava</option></select></label></p>
      <p class="ehint">${ICON.info} <span>The texture is a pattern drawn on the letters. Plain colour, Stone, Bricks, Planks, Stripes and Dots keep the colour of each line. Grass block, Diamond ore, Gold and Lava bring their own colours. The patterns are our own drawings, not Minecraft's block pictures.</span></p>
    </div>
    <div id="tp-overlay" hidden>
      <p class="prow"><label>Overlay <select id="tover"><option value="none" selected>None</option><option value="down">Fade in towards the bottom</option><option value="up">Fade in towards the top</option><option value="all">Over the whole letter</option></select></label></p>
      <p class="prow" id="tovrow"><span>Colour</span> <input type="color" id="tovc" value="#000000" aria-label="Overlay colour"> <label>Strength <input type="range" id="tovs" min="0" max="100" value="60"></label></p>
      <p class="ehint">${ICON.info} <span>An overlay lays a second colour over the letters, for example black fading in at the bottom, or orange at the top for a sunset look.</span></p>
    </div>
    <div id="tp-style" hidden>
      <p class="prow"><label><input type="checkbox" id="tout" checked> Outline</label></p>
      <p class="prow" id="toutrow"><span>Outline colour</span> <input type="color" id="toutc" value="#14100e" aria-label="Outline colour"> <label>Thickness <select id="toutw"><option value="thin">Thin</option><option value="normal" selected>Normal</option><option value="thick">Thick</option></select></label></p>
      <p class="prow"><label>3D depth <select id="tdepth"><option value="none">Flat</option><option value="normal" selected>Normal</option><option value="deep">Deep</option></select></label>
        <label>Letter spacing <select id="tspace"><option value="tight">Tight</option><option value="normal" selected>Normal</option><option value="wide">Wide</option></select></label></p>
      <p class="prow"><label>Space between lines <input type="range" id="tlines" min="-8" max="24" value="3"></label></p>
    </div>
    <div id="tp-settings" hidden>
      <p class="prow"><label>Size <select id="tsize"><option value="2">Small</option><option value="4" selected>Normal</option><option value="8">Big</option></select></label>
        <label>Lines <select id="talign"><option value="left">Left</option><option value="center" selected>Centre</option><option value="right">Right</option></select></label></p>
      <p class="prow"><label><input type="checkbox" id="tbg"> Background colour</label> <span id="tbgrow"><input type="color" id="tbgc" value="#1d3c2d" aria-label="Background colour"></span></p>
      <p class="prow"><button type="button" class="btn ghost" id="treset">Reset texture, overlay, style and settings</button></p>
    </div>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.down}</span><span><b>2. Save</b><small>A .png picture</small></span></h3>
    <p class="prow"><button type="button" class="btn" id="tsave">${ICON.down} Download title (.png)</button></p>
    <p><small id="tinfo"></small></p>
  </section>
  </div>
  <div class="ed-col">
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.eye}</span><span><b>Preview</b><small>Changes while you type</small></span></h3>
    <div class="ttabs"><button type="button" data-tview="flat">Flat picture</button><button type="button" data-tview="3d">3D view</button></div>
    <div class="tprev" id="tflat"><canvas id="tcanvas" width="16" height="16"></canvas></div>
    <div id="t3dwrap" hidden>
      <div class="tprev t3d"><canvas id="t3d" width="840" height="460"></canvas></div>
      <p class="ehint">${ICON.info} <span>Drag the empty space to turn the title. Drag the red (X), green (Y) or blue (Z) arrow to move it (or only the letter selected in the Outliner). Click a ball of the X, Y, Z cross in the corner to look from that side; the darker balls are the opposite sides. From behind, the text reads mirrored.</span></p>
    </div>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.box}</span><span><b>Transform</b><small>Turn and zoom the 3D view</small></span></h3>
    <p><small>Moving: <b id="tselname">the whole title</b></small></p>
    <p class="prow"><span>Position</span> <label>X <input type="number" id="tpx" class="tlsecs" value="0" step="1"></label> <label>Y <input type="number" id="tpy" class="tlsecs" value="0" step="1"></label> <label>Z <input type="number" id="tpz" class="tlsecs" value="0" step="1"></label> <button type="button" class="btn ghost" id="tcentre">Centre</button></p>
    <p class="prow"><label>Rotation X <input type="range" id="trx" min="-90" max="90" value="12"> <span id="trxv" class="tnum"></span></label></p>
    <p class="prow"><label>Rotation Y <input type="range" id="try" min="-180" max="180" value="-28"> <span id="tryv" class="tnum"></span></label></p>
    <p class="prow"><label>Rotation Z <input type="range" id="trz" min="-180" max="180" value="0"> <span id="trzv" class="tnum"></span></label></p>
    <p class="prow"><label>Zoom <input type="range" id="tzoom" min="40" max="160" value="100"></label></p>
    <p class="prow"><label>Angles <select id="tangle"><option value="12,-28,0" selected>Initial angle</option><option value="90,0,0">Top</option><option value="-90,0,0">Bottom</option><option value="0,0,0">South (front)</option><option value="0,180,0">North (back)</option><option value="0,90,0">East</option><option value="0,-90,0">West</option><option value="26.57,-45,0">Isometric right (2:1)</option><option value="26.57,45,0">Isometric left (2:1)</option><option value="30,-45,0">True isometric right (30°)</option><option value="30,45,0">True isometric left (30°)</option><option value="-24,0,0">Minecraft Title</option></select></label></p>
    <p><small>Size (wide x tall x deep): <span id="tsize3"></span></small></p>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.grid}</span><span><b>Outliner</b><small>Click a letter to select it</small></span></h3>
    <div class="toutl" id="toutl"></div>
    <p class="prow"><button type="button" class="btn ghost" id="thide" disabled>Hide the selected letter</button> <button type="button" class="btn ghost" id="tselnone" disabled>Select the whole title</button></p>
    <p class="ehint">${ICON.info} <span>A selected letter gets a blue frame in the 3D view. The arrows and the Position boxes then move only that letter. Moving single letters shows in the 3D view and in the render, not in the flat picture.</span></p>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span class="tool-ic">${ICON.down}</span><span><b>Render</b><small>The 3D view as a clean picture</small></span></h3>
    <p class="prow"><label>Mode <select id="trmode"><option value="normal" selected>Normal</option><option value="square">Square</option><option value="custom">Custom</option><option value="minecraft">Minecraft (1024 x 256)</option></select></label>
      <label id="trsizerow">Size <select id="trsize"><option value="640">SD (640)</option><option value="1280">HD (1280)</option><option value="1024" selected>1K (1024)</option><option value="2048">2K (2048)</option><option value="4096">4K (4096)</option></select></label></p>
    <p class="prow" id="trcustom"><label>Resolution <input type="number" id="trw" class="tlsecs" min="16" max="4096" value="1920"></label> <label>x <input type="number" id="trh" class="tlsecs" min="16" max="4096" value="1080"></label></p>
    <p class="prow"><label><input type="checkbox" id="trbg"> Background colour</label> <span id="trbgc-wrap"><input type="color" id="trbgc" value="#1d3c2d" aria-label="Render background colour"></span> <label><input type="checkbox" id="traa" checked> Antialiasing</label> <label>Padding <input type="number" id="trpad" class="tlsecs" min="0" max="400" value="0"></label></p>
    <div class="tprev"><canvas id="trender" width="16" height="16"></canvas></div>
    <p><small id="trinfo"></small></p>
    <p class="prow"><button type="button" class="btn" id="trsave">${ICON.down} Save render (.png)</button> <button type="button" class="btn ghost" id="trcopy">Copy render</button></p>
    <p><small id="trmsg"></small></p>
  </section>
  </div>
</div>
<section class="text-card">
<h2>${ICON.box} Blockbench</h2>
<p>This is the real <b>Blockbench</b> web app, shown inside this page. Press <b>New</b>, then <b>Minecraft Title</b> to make a title, or <b>Minecraft Skin</b> to paint a skin.</p>
<p><a class="btn" rel="noopener" target="_blank" href="${BB}">${ICON.right} Open Blockbench in a new tab</a>
<a class="btn ghost" rel="noopener" target="_blank" href="${REPO}/blob/main/model.bbmodel">${ICON.down} Our title model (.bbmodel)</a></p>
<p><small>The "Fresh Moves Fix" title on the home page was made this way. Open the model file in Blockbench with File &rarr; Open Model.</small></p>
<div class="note">If the box below stays empty, or "Minecraft Title" is missing from the New list, use the button above. In Blockbench you can also add it by hand: File &rarr; Plugins &rarr; Available &rarr; "Minecraft Title Generator" &rarr; Install. Blockbench is made by JannisX11 and the Title Generator plugin by Ewan Howell; they are not part of Fresh Moves Fix.</div>
</section>
</article></div>
<script src="../title.js?v=${ver("title.js")}"></script>
<script src="../ui.js?v=${ver("ui.js")}"></script>
<div class="wrap"><div class="bb-help" id="bbhelp" hidden>
  <h2>${ICON.info} Blockbench cannot start in this browser</h2>
  <p>Blockbench needs 3D graphics (WebGL), and your browser has it switched off right now. That is why it says "Error creating WebGL context". This is a browser setting on your computer, not a fault of this website, so it has to be switched on there:</p>
  <ol class="steps">
    <li><strong>Restart the browser.</strong> Close every window of it, then open it again.</li>
    <li><strong>Turn on graphics acceleration.</strong> In Chrome: Settings, System, switch on "Use graphics acceleration when available", then press Relaunch. (Edge: Settings, System and performance. Firefox: Settings, General, Performance.)</li>
    <li><strong>Still off in Chrome?</strong> Type <code>chrome://flags/#ignore-gpu-blocklist</code> in the address bar, set it to Enabled, and press Relaunch.</li>
    <li><strong>Update the graphics driver</strong> of your computer, or try another browser (Firefox, Edge).</li>
  </ol>
  <p>Check with <a href="https://get.webgl.org" target="_blank" rel="noopener">get.webgl.org</a>: when you see a spinning cube there, Blockbench will work.</p>
  <p><button type="button" class="btn" id="bbretry">Check again</button> <button type="button" class="btn ghost" id="bbshow">Show Blockbench anyway</button></p>
  <p><small>The <a href="../editor/">Skin eye editor</a> works without 3D graphics: it has its own simple 3D preview.</small></p>
</div></div>
<div class="bb-frame" id="bbframe"><iframe data-src="${BB}" title="Blockbench" allow="clipboard-read; clipboard-write; fullscreen" allowfullscreen></iframe></div>
<script>(function(){
  var help=document.getElementById("bbhelp"), box=document.getElementById("bbframe"), fr=box.querySelector("iframe");
  function hasGL(){ try{ var c=document.createElement("canvas"); var g=c.getContext("webgl2")||c.getContext("webgl"); if(!g) return false; var x=g.getExtension("WEBGL_lose_context"); if(x) x.loseContext(); return true; }catch(e){ return false; } }
  function show(force){ var ok=force||hasGL(); help.hidden=ok&&!force; box.hidden=!ok; if(ok&&!fr.getAttribute("src")) fr.setAttribute("src", fr.getAttribute("data-src")); if(ok&&!force) help.hidden=true; }
  document.getElementById("bbretry").addEventListener("click", function(){ show(false); });
  document.getElementById("bbshow").addEventListener("click", function(){ show(true); });
  show(false);
})()</script>`,
}));

const themeCard = (id, name, pb, pp, pl, pt) => `<label><span class="pv" style="--pb:${pb};--pp:${pp};--pl:${pl};--pt:${pt}"><i><b></b><u></u></i></span><span class="nm"><input type="radio" name="theme" value="${id}"> ${name}</span></label>`;
// ---- Skin Painter 3D (our own; drawn on a 2D canvas, so it also works where WebGL is off) ----
write("paint/index.html", page({
  title: "Skin Painter 3D - Fresh Moves Fix",
  active: "",
  description: "Paint a Minecraft skin on a 3D model or on the flat skin file, right in your browser.",
  depth: 1,
  body: `<div class="wrap editor-workspace-wrap"><article class="editor painter-page">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<div class="painter-intro">
<span class="home-eyebrow">CREATE IN YOUR BROWSER</span>
<h1>${ICON.brush} Skin Painter 3D</h1>
<p>Paint your Minecraft skin pixel by pixel, on the 3D model or on the flat skin file. Everything happens in your browser; the skin is not uploaded anywhere. It works without 3D graphics (WebGL).</p>
</div>

<div class="painter-workspace-bar"><div><b>Skin Painter</b><small>64 × 64 skin editor</small></div><div class="painter-view-switch" role="group" aria-label="Painter views"><button type="button" data-pview="3d" aria-pressed="true">${ICON.box} 3D</button><button type="button" data-pview="2d" aria-pressed="false">${ICON.grid} 2D</button></div><div class="painter-history"><p class="prow"><button type="button" class="btn ghost" id="pundo" title="Ctrl+Z">Undo</button> <button type="button" class="btn ghost" id="predo" title="Ctrl+Y">Redo</button></p></div><a class="btn ghost" href="#painter-file">${ICON.up} Skin file</a></div>
<div class="ed paint workspace-layout">
  <div class="ed-col painter-tools-column">
  <section class="panel ecard painter-tools-card">
    <h3 class="ehead"><img class="tool-img" src="../icon-paint.png" alt="" width="44" height="44"><span><b>Tools</b><small>Pick a tool, pick a colour, then click the model</small></span></h3>
    <div class="ptools" id="ptools">
      <button type="button" data-tool="pen" title="Pen (B)">${ICON.brush}<span>Pen</span></button>
      <button type="button" data-tool="erase" title="Eraser (E)">${ICON.close}<span>Eraser</span></button>
      <button type="button" data-tool="fill" title="Fill one side of a body part (G)">${ICON.box}<span>Fill</span></button>
      <button type="button" data-tool="pick" title="Take a colour from the skin (I)">${ICON.eye}<span>Take colour</span></button>
      <button type="button" data-tool="light" title="Make pixels lighter (L)">${ICON.star}<span>Lighter</span></button>
      <button type="button" data-tool="dark" title="Make pixels darker (D)">${ICON.star}<span>Darker</span></button>
      <button type="button" data-tool="tone" title="Paints the colour a little lighter or darker on every pixel, so it looks less flat (T)">${ICON.grid}<span>Auto tone</span></button>
    </div>


  </section>
  </div>
  <div class="ed-col workspace-side">
  <section class="panel ecard painter-colour-card">
    <h3 class="ehead"><span class="tool-ic">${ICON.brush}</span><span><b>Colour &amp; layers</b><small>Choose your colours and paint layer</small></span></h3>
    <p class="elabel">Colour</p>
    <p class="prow painter-main-colour"><span class="pnow" id="pnow"></span> <input type="color" id="pcolor" data-inline-picker value="#3b82c4" aria-label="Colour"> <input type="text" id="phex" class="phex" value="#3b82c4" maxlength="7" spellcheck="false" aria-label="Colour code"></p>
    <details class="painter-second-colour"><summary>Second colour (right click)</summary><p class="prow"><span class="pnow" id="pnow2"></span> <input type="color" id="pcolor2" value="#ffffff" aria-label="Second colour"> <button type="button" class="btn ghost" id="pswap">Swap</button></p></details>
    <p class="elabel">Recent</p>
    <div class="psws" id="precent"></div>
    <p class="elabel">Palette</p>
    <div class="psws" id="ppalette"><button type="button" class="psw" style="background:#000000" title="#000000" data-c="#000000"></button><button type="button" class="psw" style="background:#3f3f3f" title="#3f3f3f" data-c="#3f3f3f"></button><button type="button" class="psw" style="background:#7f7f7f" title="#7f7f7f" data-c="#7f7f7f"></button><button type="button" class="psw" style="background:#bfbfbf" title="#bfbfbf" data-c="#bfbfbf"></button><button type="button" class="psw" style="background:#ffffff" title="#ffffff" data-c="#ffffff"></button><button type="button" class="psw" style="background:#5a3a1e" title="#5a3a1e" data-c="#5a3a1e"></button><button type="button" class="psw" style="background:#8b5a2b" title="#8b5a2b" data-c="#8b5a2b"></button><button type="button" class="psw" style="background:#c68642" title="#c68642" data-c="#c68642"></button><button type="button" class="psw" style="background:#e0ac69" title="#e0ac69" data-c="#e0ac69"></button><button type="button" class="psw" style="background:#f1c27d" title="#f1c27d" data-c="#f1c27d"></button><button type="button" class="psw" style="background:#ffdbac" title="#ffdbac" data-c="#ffdbac"></button><button type="button" class="psw" style="background:#e5534b" title="#e5534b" data-c="#e5534b"></button><button type="button" class="psw" style="background:#ff8c1a" title="#ff8c1a" data-c="#ff8c1a"></button><button type="button" class="psw" style="background:#ffd21a" title="#ffd21a" data-c="#ffd21a"></button><button type="button" class="psw" style="background:#7bc043" title="#7bc043" data-c="#7bc043"></button><button type="button" class="psw" style="background:#2e8b57" title="#2e8b57" data-c="#2e8b57"></button><button type="button" class="psw" style="background:#1fb5a8" title="#1fb5a8" data-c="#1fb5a8"></button><button type="button" class="psw" style="background:#3b82c4" title="#3b82c4" data-c="#3b82c4"></button><button type="button" class="psw" style="background:#2b4fa8" title="#2b4fa8" data-c="#2b4fa8"></button><button type="button" class="psw" style="background:#7a4fd0" title="#7a4fd0" data-c="#7a4fd0"></button><button type="button" class="psw" style="background:#d05fb5" title="#d05fb5" data-c="#d05fb5"></button><button type="button" class="psw" style="background:#ff9ecb" title="#ff9ecb" data-c="#ff9ecb"></button></div>
    <p class="elabel">Shades</p>
    <div class="psws" id="pshades" aria-label="Shades of the selected colour"></div>
    <p class="elabel">Opacity (glass)</p>
    <p class="prow"><input type="range" id="palpha" min="5" max="100" step="5" value="100" aria-label="Opacity"> <span class="tnum" id="palphav">100%</span> <button type="button" class="btn ghost" data-palpha="100">Solid</button> <button type="button" class="btn ghost" data-palpha="50">Glass</button> <button type="button" class="btn ghost" data-palpha="25">Light glass</button></p>
    <p class="ehint">${ICON.info} <span>Below 100% the Pen and Fill paint see-through pixels, for glass in glasses. <b>Take colour</b> also takes how see-through a pixel is. In Minecraft, see-through only works on the <b>outer layer</b>; on the first layer the game shows it solid.</span></p>
    <p class="elabel">Paint on</p>
    <div class="painter-layer-choice" role="group" aria-label="Paint layer"><label><input type="radio" name="player" value="0" checked><span>Base</span></label><label><input type="radio" name="player" value="1"><span>Overlay</span></label></div>
    <p class="prow"><label><input type="checkbox" id="pshow" checked> Show the outer layer</label></p>
    <div class="painter-layers">
      <h4>Part visibility</h4>
      <p><small>Show or hide each part in the 3D preview. Hidden parts are dimmed in 2D but are not erased from your skin.</small></p>
      <table><thead><tr><th scope="col">Part</th><th scope="col"><label class="layer-master">Base <input type="checkbox" data-layer-all="0" aria-label="Show all base layer parts" checked></label></th><th scope="col"><label class="layer-master">Outer <input type="checkbox" data-layer-all="1" aria-label="Show all outer layer parts" checked></label></th></tr></thead><tbody>
      ${[["head","Head"],["body","Body"],["la","Left arm"],["ra","Right arm"],["ll","Left leg"],["rl","Right leg"]].map(([id,name]) => `<tr><th scope="row">${name}</th><td><label class="layer-eye"><input type="checkbox" data-part="${id}" data-layer="0" aria-label="Show ${name} base layer" checked>${ICON.eye}</label></td><td><label class="layer-eye outer"><input type="checkbox" data-part="${id}" data-layer="1" aria-label="Show ${name} outer layer" checked>${ICON.eye}</label></td></tr>`).join("")}
      </tbody></table>
    </div>
  </section>
  <section class="panel ecard" id="painter-file">
    <h3 class="ehead"><img class="tool-img" src="../icon-skin.png" alt="" width="44" height="44"><span><b>Skin file</b><small>Load a skin, or start from one of these</small></span></h3>
    <label class="drop" id="pdrop">
      <input type="file" id="pfile" accept="image/png" class="vh">
      <span class="drop-ic">${ICON.up}</span>
      <span><b>Choose your skin file</b><br><small>or drop the .png here</small></span>
    </label>
    <div class="pick" id="pstart">
      <button type="button" class="pickb" data-name="Steve" data-slim="0" data-skin="${skinData("wide/steve.png")}"><img src="../icon-skin.png" alt="" width="36" height="36"><span><b>Steve</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Alex" data-slim="1" data-skin="${skinData("slim/alex.png")}"><img src="../icon-alex.png" alt="" width="36" height="36"><span><b>Alex</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (tall eyes)" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "dummy.png")).toString("base64")}"><img src="../icon-dummy.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Tall eyes</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (dot eyes)" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "dummy2.png")).toString("base64")}"><img src="../icon-dummy2.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Dot eyes</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (blank face)" data-skin="${"data:image/png;base64," + fs.readFileSync(path.join(here, "painted.png")).toString("base64")}"><img src="../icon-painted.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Blank face</small></span></button>
    </div>
    <p class="elabel">Format</p>
    <div class="pick">
      <label class="pickb"><input type="radio" name="pfmt" id="pfmtwide" value="wide" checked><span><b>Steve</b><small>Wide arms</small></span></label>
      <label class="pickb"><input type="radio" name="pfmt" id="pfmtslim" value="slim"><span><b>Alex</b><small>Slim arms</small></span></label>
    </div>
    <p class="ehint">${ICON.info} <span>The format is guessed from the skin when you load it. If you pick the other one, the arms of your skin are changed to fit it (Steve = 4 pixels wide, Alex = 3). Undo brings them back.</span></p>
    <p class="prow"><button type="button" class="btn ghost" id="pclear">Empty skin</button></p>
    <p class="prow"><button type="button" class="btn" id="psave">${ICON.down} Save skin (.png)</button> <a class="btn ghost" href="../editor/">${ICON.eye} Add moving eyes</a></p>
    <p><small id="pmsg" role="status"></small></p>
    <p><small>Your painting is kept in this browser, so it is still here when you come back.</small></p>
  </section>
  </div>
  <div class="ed-col workspace-preview">
  <section class="panel ecard">
    <h3 class="ehead"><span><b id="painter-view-title">3D model</b><small id="painter-view-help">Click the model to paint; right click paints with the second colour. Drag next to the model to turn it. Mouse wheel = zoom.</small></span></h3>
    <div class="painter-brush-controls"><p class="prow"><span>Size</span> <span class="pviews psize"><button type="button" data-psize="1" class="on" aria-pressed="true">1</button><button type="button" data-psize="2" aria-pressed="false">2</button><button type="button" data-psize="3" aria-pressed="false">3</button><button type="button" data-psize="4" aria-pressed="false">4</button></span>
      <label title="Paints the left and the right half of the player at the same time"><input type="checkbox" id="psym"> Symmetry</label>
      <label><input type="checkbox" id="pgrid" checked> Pixel grid</label></p></div>
    ${backdropControls}
    <canvas id="p3d" class="p3d" width="460" height="560"></canvas>
    <div id="p2d-view" hidden><p class="painter-flat-hint">Paint the flat skin file. Blue outlines are the base layer; orange outlines are the outer layer.</p><canvas id="p2d" class="p2d" width="512" height="512"></canvas><div class="painter-live-preview"><b>Live 3D preview</b><canvas id="p2d-preview" width="180" height="220" role="img" aria-label="Live 3D skin preview"></canvas></div></div>
    <div id="p3d-controls">
    <div class="pbar" role="group" aria-label="3D model buttons">
      <button type="button" id="pbsneak" data-tip="Sneak" aria-label="Sneak" aria-pressed="false">${svg('<circle cx="9" cy="5" r="2.2"/><path d="M3 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 3 1"/><path d="M18 11v9"/><path d="M14.5 17l3.5 3.5 3.5-3.5"/>')}</button>
      <button type="button" id="pblayer" data-tip="Hide outer layer" aria-label="Hide outer layer" aria-pressed="true">${svg('<rect x="3" y="8" width="13" height="13" rx="2"/><path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/>')}</button>
      <button type="button" id="pbfly" data-tip="Start Flying" aria-label="Start Flying" aria-pressed="false">${svg('<path d="M11 4C7 4 5 7 5 11c0 4 2 7 4 9 1.5-2 2-5 2-8z"/><path d="M13 4c4 0 6 3 6 7 0 4-2 7-4 9-1.5-2-2-5-2-8z"/>')}</button>
      <button type="button" id="pbplay" data-tip="Play" aria-label="Play" aria-pressed="false"><span class="pb-play">${svg('<path d="M7 4.5v15l12-7.5z"/>')}</span><span class="pb-pause">${svg('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>')}</span></button>
    </div>
    <div class="row ctl">
      <span id="pviews" class="pviews"><button type="button" data-v="0.55,0.15">Front</button><button type="button" data-v="3.7,0.15">Back</button><button type="button" data-v="1.5708,0">Left</button><button type="button" data-v="-1.5708,0">Right</button><button type="button" data-v="0.4,1.3">Top</button><button type="button" data-v="0.4,-1.3">Bottom</button></span>
      <label>Zoom <input type="range" id="pzoom" min="0.5" max="3" step="0.01" value="0.9"></label>
      <label>Pose <select id="ppose"><option value="stand">Standing</option><option value="apart">Arms and legs apart</option></select></label>
    </div>
    <p class="prow"><label>Cape <select id="pcape"><option value="none">No cape</option><option value="red">Red and gold</option><option value="leaf">Leaf</option><option value="blossom">Blossom</option><option value="ice">Ice</option><option value="sunset">Sunset</option><option value="checker">Checker</option><option value="night">Night sky</option><option value="star">Gold cross</option><option value="green">Fresh green</option><option value="gem">Blue gem</option><option value="flowers">Pink flowers</option><option value="smile">Green smile</option><option value="file">Your own cape file...</option></select></label>
      <input type="file" id="pcapefile" accept="image/png" hidden> <button type="button" class="btn ghost" id="pcapesave" disabled>Save cape (.png)</button></p>
    <p class="ehint">${ICON.info} <span>The cape is only a preview on the model. It is not part of the skin file: in Minecraft a cape belongs to your account, or comes from a mod such as OptiFine. The official Minecraft capes can be looked at on <a href="https://laby.net/capes" target="_blank" rel="noopener">laby.net/capes</a>.</span></p>
    <p class="prow" id="pparts">Show: <label><input type="checkbox" value="head" checked> Head</label> <label><input type="checkbox" value="body" checked> Body</label> <label><input type="checkbox" value="arms" checked> Arms</label> <label><input type="checkbox" value="legs" checked> Legs</label></p>
    </div>
  </section>
  </div>
</div>

<section class="editor-info-card painter-help">
<h2>${ICON.info} How to use it</h2>
<ol class="steps">
<li>Load your skin, or start from Steve, Alex or a Dummy.</li>
<li>Pick a colour and click the model to paint. Hold the mouse button and move to draw a line.</li>
<li>To reach hidden sides (under the arms, between the legs) choose the pose "Arms and legs apart" or untick a body part under "Show".</li>
<li>To paint a hat, jacket or sleeves, choose "Outer layer" under "Paint on".</li>
<li>Press "Save skin (.png)". Then, if you want blinking eyes, load that file in the <a href="../editor/">Skin eye editor</a>.</li>
</ol>
<p><small>Keys: B pen, E eraser, G fill, I take colour, L lighter, D darker, Ctrl+Z undo, Ctrl+Y redo.</small></p>
</section>
</article></div>
<script src="../paint.js?v=${ver("paint.js")}"></script>
<script src="../ui.js?v=${ver("ui.js")}"></script>
<script src="../backdrop.js?v=${ver("backdrop.js")}"></script>`,
}));
// ---- shared parts of the "3D Model" and "Animation" pages (studio.js) ----
const MOVE_OPTS = [["idle", "Standing"], ["walk", "Walking"], ["run", "Running"], ["wave", "Waving"], ["cheer", "Cheer"], ["dance", "Dance"], ["jacks", "Jumping jacks"], ["clap", "Clap"], ["dab", "Dab"], ["sit", "Sit"], ["look", "Look around"], ["tpose", "T-pose"]]
  .map(([v, n]) => `<option value="${v}">${n}</option>`).join("");
const fileData = (f) => "data:image/png;base64," + fs.readFileSync(path.join(here, f)).toString("base64");
const studioSkin = `<section class="panel ecard">
    <h3 class="ehead"><img class="tool-img" src="../icon-skin.png" alt="" width="44" height="44"><span><b>1. Skin</b><small>Load your skin, or start from one of these</small></span></h3>
    <label class="drop" id="sdrop">
      <input type="file" id="sfile" accept="image/png" class="vh">
      <span class="drop-ic">${ICON.up}</span>
      <span><b>Choose your skin file</b><br><small>or drop the .png here</small></span>
    </label>
    <div class="pick" id="sstart">
      <button type="button" class="pickb" data-name="Steve" data-slim="0" data-skin="${skinData("wide/steve.png")}"><img src="../icon-skin.png" alt="" width="36" height="36"><span><b>Steve</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Alex" data-slim="1" data-skin="${skinData("slim/alex.png")}"><img src="../icon-alex.png" alt="" width="36" height="36"><span><b>Alex</b><small>Default skin</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (tall eyes)" data-skin="${fileData("dummy.png")}"><img src="../icon-dummy.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Tall eyes</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (dot eyes)" data-skin="${fileData("dummy2.png")}"><img src="../icon-dummy2.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Dot eyes</small></span></button>
      <button type="button" class="pickb" data-name="Dummy (blank face)" data-skin="${fileData("painted.png")}"><img src="../icon-painted.png" alt="" width="36" height="36"><span><b>Dummy</b><small>Blank face</small></span></button>
      <button type="button" class="pickb" id="smine" hidden><img src="../icon-paint.png" alt="" width="36" height="36"><span><b>My painting</b><small>From the Skin Painter 3D</small></span></button>
    </div>
    <p class="prow"><label>Format <select id="sformat"><option value="wide">Wide arms (Steve)</option><option value="slim">Slim arms (Alex)</option></select></label></p>
    <p class="prow"><a class="btn ghost" href="../paint/">${ICON.brush} Paint a skin</a> <a class="btn ghost" href="../editor/">${ICON.eye} Add moving eyes</a></p>
  </section>`;
const studioView = (extra) => `<section class="panel ecard">
    <h3 class="ehead"><span><b>3D preview</b><small>Drag to turn it. Mouse wheel = zoom.</small></span></h3>
    <canvas id="s3d" class="p3d" width="460" height="560"></canvas>
    ${extra}
    <div class="row ctl">
      <button type="button" class="btn ghost" id="splay" aria-pressed="false">Pause</button>
      <label><input type="checkbox" id="sspin"> Spin</label>
      <label><input type="checkbox" id="souter" checked> Show the outer layer</label>
      <label><input type="checkbox" id="slayers"> 3D skin layers</label>
      <label>Zoom <input type="range" id="szoom" min="0.6" max="2.4" step="0.05" value="0.9"></label>
    </div>
    <p><small id="smsg" role="status"></small></p>
  </section>`;
const studioScripts = `<script src="../player.js?v=${ver("player.js")}"></script>
<script src="../studio.js?v=${ver("studio.js")}"></script>
<script src="../ui.js?v=${ver("ui.js")}"></script>`;

// ---- Minecraft 3D Model: its own page (skin -> animated .gltf file) ----
write("model/index.html", page({
  title: "Minecraft 3D Model - Fresh Moves Fix",
  active: "",
  description: "Turn your Minecraft skin into an animated 3D model file (.gltf) for Blender, Blockbench and 3D viewers.",
  depth: 1,
  body: `<div class="wrap"><article class="editor">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.box} Minecraft 3D Model</h1>
<p>Turn your skin into a 3D model of the player, with a movement, and download it as one file. Everything happens in your browser; nothing is uploaded. It works without 3D graphics (WebGL).</p>
<div class="ed paint">
  <div class="ed-col">
  ${studioSkin}
  <section class="panel ecard">
    <h3 class="ehead"><img class="tool-img" src="../icon-model.png" alt="" width="44" height="44"><span><b>2. Movement and download</b><small>The model moves like this, again and again</small></span></h3>
    <p class="prow"><label>Movement <select id="smove">${MOVE_OPTS}</select></label></p>
    <p class="prow"><button type="button" class="btn" id="sgltf">${ICON.down} Download 3D model (.gltf)</button></p>
    <p><small>One .gltf file with the player, your skin (both layers) and the chosen movement inside.</small></p>
  </section>
  </div>
  <div class="ed-col">
  ${studioView("")}
  </div>
</div>
<section class="text-card">
<h2>${ICON.info} How to open the file</h2>
<ol class="steps">
  <li><strong>Blender:</strong> File, Import, glTF 2.0, pick the file. Press Space to play the movement.</li>
  <li><strong>Blockbench:</strong> File, Import, "Import glTF" (or drag the file into the window).</li>
  <li><strong>Windows:</strong> double-click the file; it opens in "3D Viewer" if that app is installed.</li>
</ol>
<p><small>The game itself does not use this file. It is for pictures, videos and 3D programs.</small></p>
</section>
</article></div>
${studioScripts}`,
}));

// ---- Minecraft animation in Blender (a guide page: Blender is a desktop program and cannot run inside a web page) ----
write("animation/index.html", page({
  title: "Minecraft Animation - Fresh Moves Fix",
  active: "",
  description: "Make a Minecraft animation with your own skin right in the browser and save it as a video. Plus a guide for Blender.",
  depth: 1,
  body: `<div class="wrap"><article class="editor">
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<h1>${ICON.play} Minecraft Animation</h1>
<p>Make a short animation with your own skin: put movements in a row, press play, and save it as a video. Everything happens in your browser; nothing is uploaded. It works without 3D graphics (WebGL).</p>
<div class="ed paint">
  <div class="ed-col">
  ${studioSkin}
  <section class="panel ecard">
    <h3 class="ehead"><img class="tool-img" src="../icon-anim.png" alt="" width="44" height="44"><span><b>2. Movements</b><small>They play one after the other, from top to bottom</small></span></h3>
    <div class="tl" id="tl"></div>
    <p class="prow"><label>Add <select id="tlmove">${MOVE_OPTS}</select></label> <label>for <input type="number" id="tlsecs" class="tlsecs" min="0.5" max="30" step="0.5" value="3"> seconds</label> <button type="button" class="btn ghost" id="tladd">Add</button></p>
    <p class="prow"><small>Whole animation: <b id="tltotal"></b></small> <label><input type="checkbox" id="tlloop" checked> Repeat</label></p>
  </section>
  <section class="panel ecard">
    <h3 class="ehead"><span><b>3. Save</b><small>As a video or as one picture</small></span></h3>
    <p class="prow"><label><input type="checkbox" id="sbgon" checked> Background colour</label> <input type="color" id="sbg" value="#7fb8ff" aria-label="Background colour"></p>
    <p class="prow"><button type="button" class="btn" id="svideo">Save video</button> <button type="button" class="btn ghost" id="spng">Save picture (.png)</button></p>
    <p><small>The video is recorded while the animation plays once, so it takes as long as the animation. It is a .webm file; it plays in browsers and in VLC, and you can upload it to YouTube.</small></p>
  </section>
  </div>
  <div class="ed-col">
  ${studioView(`<div class="tlbarwrap"><div class="tlbar" id="tlbar"></div></div>
    <p class="prow"><button type="button" class="btn ghost" id="tlstart">From the start</button> <small id="tltime"></small></p>`)}
  </div>
</div>

<section class="text-card">
<h2>${ICON.info} Bigger animations: Blender</h2>
<p><b>Blender</b> is a free 3D program for your computer. With the free <b>MCprep</b> add-on it gets ready-made Minecraft characters that you can pose, animate and turn into a video. Blender cannot run inside a web page, so this page is a guide: you download it and follow the steps.</p>
<p><a class="btn" rel="noopener" target="_blank" href="https://www.blender.org/download/">${ICON.down} Download Blender</a>
<a class="btn ghost" rel="noopener" target="_blank" href="https://github.com/Moo-Ack-Productions/MCprep">${ICON.right} MCprep add-on</a>
<a class="btn ghost" href="../editor/">${ICON.eye} Make your skin</a></p>
<div class="note"><strong>Good to know.</strong> Blender needs working 3D graphics on your computer (a graphics driver that is up to date). MCprep's page lists which Blender versions it supports; if the newest Blender is not on that list yet, install a Blender version that is.</div>

<h2>${ICON.info} Step by step</h2>
<ol class="steps">
  <li><strong>Install Blender.</strong> Download it from blender.org and install it like any other program.</li>
  <li><strong>Download MCprep.</strong> Open the MCprep page and download the add-on. Keep it as a .zip file; do not unzip it.</li>
  <li><strong>Add MCprep to Blender.</strong> In Blender: Edit, Preferences, Add-ons, "Install from file" (in newer versions it is in the small arrow menu at the top right), choose the .zip, then tick the box next to MCprep.</li>
  <li><strong>Open the MCprep panel.</strong> In the 3D view press N. A side bar opens; click the "MCprep" tab.</li>
  <li><strong>Add a player.</strong> In "Spawner", choose a player rig and press Spawn. A Minecraft character appears.</li>
  <li><strong>Put your skin on it.</strong> Select the character, open "Skin Swapper", choose "Skin from file" and pick your skin .png (for example the one you made in the <a href="../editor/">Skin eye editor</a>).</li>
  <li><strong>Make a first pose.</strong> Click the rig and press Ctrl+Tab to switch to Pose Mode. Click a control (an arm, the head), press R and move the mouse to turn it. With the mouse over the 3D view press I to save the pose as a keyframe.</li>
  <li><strong>Make it move.</strong> Drag the blue marker in the timeline at the bottom to a later frame, change the pose, press I again. Press Space to play: Blender fills in the movement between your poses.</li>
  <li><strong>Make the video.</strong> In the Output settings choose a folder and the file format "FFmpeg video", then Render, Render Animation.</li>
</ol>

<h2>${ICON.star} Tips</h2>
<ul>
  <li><strong>Start small.</strong> A wave or a few steps of walking, 2 to 3 seconds long, is a good first animation.</li>
  <li><strong>24 frames are one second</strong> with Blender's normal settings. A pose every 6 to 12 frames looks natural.</li>
  <li><strong>The eye pixels do not matter here.</strong> The extra pixels the Skin eye editor adds are for the resource pack in the game. In Blender the eyes are moved with the rig's own controls, if the rig has them.</li>
  <li><strong>Blockbench models.</strong> A model made in Blockbench can be brought into Blender: in Blockbench use File, Export, glTF, then in Blender File, Import, glTF.</li>
  <li><strong>Save often</strong> (Ctrl+S), and keep the rig's file and your skin in the same project folder.</li>
</ul>

<h2>${ICON.info} What this page is not</h2>
<p>This resource pack animates the player <em>inside the game</em>. Blender animations are separate <em>videos</em>; the two do not share files. MCprep is made by its own team (GPL-3.0 licence) and Blender by the Blender Foundation; they are not part of Fresh Moves Fix. Button and menu names can differ a little between Blender versions.</p>
</section>
</article></div>
${studioScripts}`,
}));

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
    <p>Background music made by your browser (no music files). Choose Calm, Minecraft, Fresh Moves Fix, or Night Sky. All are original instrumental tracks. Each song repeats. It is off until you turn it on, and saved in this browser only.</p>
    <p class="elabel">Song</p>
    <div class="mtiles two">
      <label class="mtile"><input type="radio" name="song" value="calm" data-music-song checked><span><b>Calm</b><small>Soft and friendly</small></span></label>
      <label class="mtile"><input type="radio" name="song" value="minecraft" data-music-song><span><b>Minecraft</b><small>Soft piano, 6:00</small></span></label>
      <label class="mtile"><input type="radio" name="song" value="fresh" data-music-song><span><b>Fresh Moves Fix</b><small>Original upbeat theme, 2:40</small></span></label>
      <label class="mtile"><input type="radio" name="song" value="night" data-music-song><span><b>Night Sky</b><small>Original peaceful instrumental, 3:12</small></span></label>
    </div>
    <details class="note">
      <summary><b>Fresh Moves Fix — song lyrics</b></summary>
      <p><b>Owner: lie_kg</b><br>The website track is instrumental; these words are not sung in the player.</p>
      <p><b>Verse 1</b><br>Step into a world we know,<br>Watch the little pixels glow.<br>Blinking eyes and moves so new,<br>Every skin comes alive with you.</p>
      <p><b>Chorus</b><br>Fresh Moves Fix, let’s move today,<br>Build and dance the blocks away!<br>Wave hello and take a look,<br>Make your story, write your book.</p>
      <p><b>Verse 2</b><br>Through the mountains, through the trees,<br>Make your skin look how you please.<br>Every journey starts with you,<br>There’s a world of things to do.</p>
      <p><b>Chorus</b><br>Fresh Moves Fix, let’s move today,<br>Build and dance the blocks away!<br>Wave hello and take a look,<br>Make your story, write your book.</p>
    </details>
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
    <h2 class="shead"><span class="tool-ic">${ICON.brush}</span><span><b>Color theme</b><small>Light, dark, OLED, glass, Minecraft or Night Sky</small></span></h2>
    <p>Select your preferred color theme for this website. It is saved in this browser only.</p>
    <div class="themes">
      ${themeCard("system", "Sync with system", "linear-gradient(90deg,#f4f6f5 50%,#121212 50%)", "#18201c", "#2a3630", "#9aa8a0")}
      ${themeCard("light", "Light", "#f4f6f5", "#ffffff", "#d5dcd8", "#17201b")}
      ${themeCard("dark", "Dark", "#121212", "#202020", "#383838", "#b0b0b0")}
      ${themeCard("oled", "OLED", "#000000", "#0d0f0e", "#222826", "#98a39d")}
      ${themeCard("glass", "Glass", "radial-gradient(circle at 20% 20%,#2fae78 0,transparent 55%),radial-gradient(circle at 85% 80%,#3b6fd0 0,transparent 55%),#0a1210", "rgba(255,255,255,.16)", "rgba(255,255,255,.34)", "#eef6f1")}
      ${themeCard("minecraft", "Minecraft", "linear-gradient(#50869a 0 52%, #63884e 52% 74%, #5b4532 74%)", "rgba(27,38,33,.84)", "rgba(200,226,207,.5)", "#f2f0dc")}
      ${themeCard("nightsky", "Night Sky", "radial-gradient(circle at 78% 25%, #f0f2fa 0 9%, transparent 10%), #1a173f", "#252249", "#4b4a76", "#eef0ff")}
    </div>
    <div class="fmf-blur-setting">
      <label for="settings-glass-blur"><span><b>Glass card blur</b><small>Turn the frosted-glass blur on or off. This only affects the Glass theme.</small></span><input type="checkbox" id="settings-glass-blur" checked></label>
    </div>
    <p class="saved" id="theme-saved" role="status" hidden>${ICON.check || ""}<span></span></p>
    <h3>Animated background</h3>
    <label class="background-toggle"><input type="checkbox" id="background-toggle"> <span><b>Show animated background</b><small>Turn off the night sky and moving clouds on all themes. Saved in this browser.</small></span></label>
    <p class="saved" id="background-saved" role="status" hidden></p>
    <h3>Page scrollbar</h3>
    <label class="background-toggle"><input type="checkbox" id="scrollbar-toggle"> <span><b>Show page scrollbar</b><small>When hidden, you can still scroll with the mouse wheel, keyboard or touch. Saved in this browser.</small></span></label>
    <p class="saved" id="scrollbar-saved" role="status" hidden></p>
  </div>
</div>
</article></div>
<script>(function(){
  var key="fmf-theme", cur=""; try{cur=localStorage.getItem(key)||""}catch(e){}
  if(!cur){ try{ var m=document.cookie.match(/(?:^|; )fmf-theme=([a-z]+)/); if(m) cur=m[1]; }catch(e){} } // second place the choice is kept
  if(!cur) cur="glass"; // the theme new visitors start with
  function keep(v){ try{ document.cookie=key+"="+v+"; path=/; max-age=31536000"+(location.protocol==="https:"?"; SameSite=None; Secure":"; SameSite=Lax"); return document.cookie.indexOf(key+"="+v)>=0; }catch(e){ return false; } }
  function apply(t){ var r=t; if(t==="system") r=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"; document.documentElement.setAttribute("data-theme",r); applyBlur(); }
  var blurControl=document.getElementById("settings-glass-blur");
  function applyBlur(){ var on=true; try{on=localStorage.getItem("fmf-glass-blur")!=="0"}catch(e){} if(blurControl) blurControl.checked=on; document.documentElement.classList.toggle("fmf-glass-blur", document.documentElement.getAttribute("data-theme")==="glass" && on); if(blurControl) blurControl.disabled=document.documentElement.getAttribute("data-theme")!=="glass"; }
  if(blurControl) blurControl.addEventListener("change",function(){try{localStorage.setItem("fmf-glass-blur",blurControl.checked?"1":"0")}catch(e){} applyBlur();});
  var note=document.getElementById("theme-saved");
  function told(el, ok){ if(!note) return; var name=(el.closest("label").textContent||"").trim();
    note.querySelector("span").textContent = ok ? "Saved: " + name + ". It stays when you close the page." : "Could not save: this browser blocks saving. The theme lasts until you close the page.";
    note.classList.toggle("bad", !ok); note.hidden=false; note.classList.remove("flash"); void note.offsetWidth; note.classList.add("flash"); }
  function markThemeCards(){ document.querySelectorAll('input[name="theme"]').forEach(function(el){ el.closest("label").classList.toggle("selected", el.checked); }); }
  document.querySelectorAll('input[name="theme"]').forEach(function(el){
    el.checked = el.value===cur;
    el.addEventListener("change",function(){ cur=el.value; var ok=true; try{localStorage.setItem(key,cur); ok=localStorage.getItem(key)===cur}catch(e){ok=false} if(keep(cur)) ok=true; apply(cur); markThemeCards(); told(el, ok); });
  });
  markThemeCards();
  var background=document.getElementById("background-toggle"), bgNote=document.getElementById("background-saved"), bgKey="fmf-background";
  background.checked=document.documentElement.getAttribute("data-background")!=="off";
  background.addEventListener("change",function(){
    var value=background.checked?"on":"off", saved=false;
    document.documentElement.setAttribute("data-background",value);
    try{localStorage.setItem(bgKey,value);saved=localStorage.getItem(bgKey)===value}catch(e){}
    try{document.cookie=bgKey+"="+value+"; path=/; max-age=31536000"+(location.protocol==="https:"?"; SameSite=None; Secure":"; SameSite=Lax");if(document.cookie.indexOf(bgKey+"="+value)>=0)saved=true}catch(e){}
    bgNote.textContent=saved?"Animated background " + value + ". Saved in this browser.":"Animated background " + value + ". Your browser could not save this setting.";
    bgNote.classList.toggle("bad",!saved); bgNote.hidden=false;
  });
  var scroll=document.getElementById("scrollbar-toggle"), scrollNote=document.getElementById("scrollbar-saved"), scrollKey="fmf-scrollbar";
  scroll.checked=document.documentElement.getAttribute("data-scrollbar")!=="off";
  scroll.addEventListener("change",function(){
    var value=scroll.checked?"on":"off", saved=false;
    document.documentElement.setAttribute("data-scrollbar",value);
    try{localStorage.setItem(scrollKey,value);saved=localStorage.getItem(scrollKey)===value}catch(e){}
    try{document.cookie=scrollKey+"="+value+"; path=/; max-age=31536000"+(location.protocol==="https:"?"; SameSite=None; Secure":"; SameSite=Lax");if(document.cookie.indexOf(scrollKey+"="+value)>=0)saved=true}catch(e){}
    scrollNote.textContent=saved?"Page scrollbar " + value + ". Saved in this browser.":"Page scrollbar " + value + ". Your browser could not save this setting.";
    scrollNote.classList.toggle("bad",!saved); scrollNote.hidden=false;
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

// Original browser-based Java cape texture and elytra resource pack builder.
write("cape/index.html", page({
  title: "Cape Pack Builder - Fresh Moves Fix", active: "", depth: 1,
  description: "Paint a cape texture and create a Java elytra resource pack in your browser.",
  body: `<div class="wrap"><article>
<div class="crumb"><a href="../">${ICON.home} Home</a></div>
<div class="text-card"><h1>${ICON.brush} Cape Pack Builder</h1>
<p>Draw or load your own 64 × 32 cape texture. Everything stays in your browser.</p></div>
<div class="note"><strong>Java cape limitation:</strong> a resource pack cannot give you a wearable custom cape. Download the PNG for a compatible cape mod. The optional ZIP changes the normal elytra texture only, not your cape. Other players will not see your resource pack; an equipped cape or another pack may override the elytra texture.</div>
<section class="cape-settings card">
<h2>Pack settings</h2>
<div class="cape-fields">
<label>Pack name <input type="text" id="cape-name" value="My Elytra Pack" maxlength="60"></label>
<label>Description <input type="text" id="cape-description" value="Custom elytra texture" maxlength="120"></label>
</div>
<p>The name is used for your saved project and ZIP filename. The description appears in Minecraft's resource pack list.</p>
</section>
<section class="cape-settings card">
<h2>Saved projects</h2>
<p>Save the current texture and settings in this browser only. Saving with the same name updates that project. Clearing browser data deletes these projects; download a PNG or ZIP as a backup.</p>
<label>Projects <select id="cape-projects" aria-label="Saved projects"><option value="">No saved projects</option></select></label>
<div class="cape-project-actions"><button type="button" class="btn small" id="cape-save-project">Save / update</button> <button type="button" class="btn small ghost" id="cape-load-project" disabled>Load selected</button> <button type="button" class="btn small ghost" id="cape-delete-project" disabled>Delete selected</button></div>
<p id="cape-project-status" role="status" aria-live="polite"></p>
</section>
<div class="ed cape-builder"><section class="panel ecard">
<h2>Paint cape texture</h2>
<p>Draw on the flat texture. The white outlines mark the two main cape faces; side and top edges are in the remaining texture area.</p>
<label>Colour <input id="cape-color" type="color" value="#35c980"></label>
<label>Tool <select id="cape-tool"><option value="pen">Pen</option><option value="erase">Eraser</option></select></label>
<label><input type="checkbox" id="cape-grid" checked> Pixel grid</label>
<div class="cape-canvas-wrap"><canvas id="cape-canvas" width="640" height="320" aria-label="Cape texture drawing area, 64 by 32 pixels"></canvas></div>
<p><label>Load your 64 × 32 PNG <input id="cape-file" type="file" accept="image/png"></label></p>
<p><button class="btn small" id="cape-clear" type="button">Clear</button> <button class="btn small" id="cape-png" type="button">Download cape PNG</button></p>
<p id="cape-status" role="status" aria-live="polite"></p>
</section><section class="panel ecard">
<h2>Java elytra pack</h2>
<p>Choose your Minecraft Java version, then download the resource pack ZIP. Put it in <code>resourcepacks</code> and enable it in Minecraft. Wings use the texture differently from the cape; the result may need editing and has not been tested in-game.</p>
<label>Minecraft version <select id="cape-version">${versions.map((v) => `<option value="${v.format}" data-mc="${v.mc}"${v.mc === versions[versions.length - 1].mc ? " selected" : ""}>${v.mc}</option>`).join("")}</select></label>
<p><button class="btn" id="cape-zip" type="button">Download elytra pack ZIP</button></p>
<p><b>Note:</b> the pack is for elytra, not a custom wearable cape. Cape-mod installation and visibility depend on the mod.</p>
</section></div>
</article></div>
<script src="../jszip.min.js"></script><script src="../cape.js?v=${ver("cape.js")}"></script>`,
}));

// ---------- projects ----------
write("creations/index.html", page({
  title: "Projects - Fresh Moves Fix", active: "creations", depth: 1,
  description: "Explore Fresh Moves Fix projects and creative tools.",
  body: `<div class="wrap projects-page"><div class="crumb"><a href="../">${ICON.home} Home</a></div>
<header class="projects-heading"><h1>Projects</h1><p>Projects and creative tools from Fresh Moves Fix.</p></header>
<div class="projects-grid">
  <a class="project-card" href="../#download"><img src="../pack.png" alt="" width="112" height="112"><h2>Fresh Moves Fix</h2><p>Player animations and animated eyes for Minecraft Java.</p><span>View downloads ${ICON.right}</span></a>
  <a class="project-card" href="../paint/"><img src="../icon-paint.png" alt="" width="112" height="112"><h2>Skin Painter 3D</h2><p>Paint a skin pixel by pixel in your browser.</p><span>Open painter ${ICON.right}</span></a>
  <a class="project-card" href="../editor/"><img src="../icon-skin.png" alt="" width="112" height="112"><h2>Skin eye editor</h2><p>Add animated eye markers to your skin.</p><span>Open editor ${ICON.right}</span></a>
  <a class="project-card" href="../title/"><img src="../icon-title.png" alt="" width="112" height="112"><h2>Minecraft Title</h2><p>Make and download a block-letter title picture.</p><span>Open title maker ${ICON.right}</span></a>
  <a class="project-card" href="../model/"><img src="../icon-model.png" alt="" width="112" height="112"><h2>Minecraft 3D Model</h2><p>Turn your skin into an animated 3D model file.</p><span>Open model maker ${ICON.right}</span></a>
  <a class="project-card" href="../animation/"><img src="../icon-anim.png" alt="" width="112" height="112"><h2>Minecraft Animation</h2><p>Arrange movements and save an animation as a video.</p><span>Open animation tool ${ICON.right}</span></a>
  <a class="project-card" href="../cape/"><span class="project-icon" aria-hidden="true">${ICON.box}</span><h2>Cape Pack Builder</h2><p>Make a cape texture or a Java elytra pack.</p><span>Open builder ${ICON.right}</span></a>
  <div class="project-card project-soon"><span class="project-icon" aria-hidden="true">${ICON.lock}</span><h2>Minecraft Skins</h2><p>A separate Fabric mod. Downloads are temporarily locked.</p><span>Coming soon</span></div>
</div></div>`,
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

const skinVersionLinks = skinReleases.map((release) => {
  const mc = esc(release.minecraft_build);
  return `<div class="ver locked" aria-label="Minecraft ${mc}, Fabric, locked, coming soon">
    <span class="tool-head"><img class="ver-ic" src="icon-skin.png" alt="" width="40" height="40" loading="lazy"><span><b>${mc}</b><small>Minecraft build</small></span></span>
    <span class="tags"><i>Fabric</i><i class="coming-soon">${ICON.lock} Coming soon</i></span>
  </div>`;
}).join("\n");

// "Page not found" page. Vercel shows 404.html for every address that does not exist,
// at any depth, so all its links are made to start from the top of the site (<base href="/">).
write("404.html", page({
  title: "Page not found - Fresh Moves Fix",
  active: "",
  description: "This page does not exist.",
  depth: 0,
  body: `<div class="wrap"><article class="nf">
  <p class="nf-code">404</p>
  <h1>Page not found</h1>
  <p>This address does not exist on the site. It may have been moved, or the link was typed wrong.</p>
  <p class="nf-go"><a class="btn" href="./">${ICON.home} Home</a> <a class="btn ghost" href="editor/">${ICON.eye} Eye editor</a> <a class="btn ghost" href="guides/">${ICON.book} Guides</a> <a class="btn ghost" href="./#download">${ICON.down} Download</a></p>
</article></div>`,
}).replace("<head>", '<head>\n<base href="/">'));

write("index.html", page({
  title: "Fresh Moves Fix - player animations for Minecraft",
  active: "home",
  description: "A fork of the Fresh Moves resource pack: smoother player animations and animated eyes, with builds for Minecraft 1.20 to 26.3.",
  body: `<div class="wrap home-page">
<div class="hero home-hero">
  <div class="hero-art"><img src="pack.png" alt="Fresh Moves Fix pack icon" width="180" height="180"><span class="hero-art-caption">JAVA EDITION</span></div>
  <div class="txt">
    <span class="hero-kicker"><span aria-hidden="true"></span> MINECRAFT JAVA RESOURCE PACK</span>
    <h1 class="mc-title"><img src="title.png?2" width="1708" height="228" alt="Fresh Moves Fix"></h1>
    <p class="hero-lead">Bring more life to your Minecraft player.</p>
    <p>Smoother player animations and animated eyes, with builds for Minecraft ${versions[0].mc} to ${versions[versions.length - 1].mc}. A fork of Fresh Moves with small fixes.</p>
    <div class="hero-actions">
      <a class="btn" href="#download">${ICON.down} Choose a download</a>
      <a class="btn ghost" href="editor/">${ICON.eye} Open skin eye editor</a>
    </div>
    <div class="hero-meta"><span>${ICON.tag} ${esc(version)}</span><a href="guides/">${ICON.book} Eye guides</a></div>
  </div>
</div>

<aside class="owner-profile" aria-label="Owner profile">
  <img id="owner-fallback" class="owner-profile-image" src="owner-profile.png?v=${ver("owner-profile.png")}" alt="Minecraft skin for lie_kg" width="160" height="320">
  <canvas id="owner-model" class="owner-profile-model" width="240" height="240" role="img" aria-label="lie_kg's Minecraft skin in a pose" hidden></canvas>
  <span class="home-eyebrow">OWNER PROFILE</span>
  <h2>lie_kg</h2>
  <p>Owner of Fresh Moves Fix</p>
</aside>

<section class="home-section">
  <div class="note"><strong>Beta.</strong> Blinking and moving eyes have worked in a player’s game; other features and versions still need testing. On Minecraft 1.21.4 and newer the cape and elytra may not be animated.</div>
  <div class="home-heading"><div><span class="home-eyebrow">THE PACK</span><h2>${ICON.star} What it does</h2></div><p>Little details, more personality.</p></div>
  <div class="cards">
    <a class="card feat" href="#download"><h3>${ICON.run} Player animations</h3><p>Reworked walking, sprinting, sneaking, swimming, crawling and sleeping, in the style of Fresh Animations.</p><span class="more">Download ${ICON.right}</span></a>
    <a class="card feat" href="guides/"><h3>${ICON.eye} Animated eyes</h3><p>Eyes blink and look around when your skin has the marker pixels described in the guides.</p><span class="more">Eye guides ${ICON.right}</span></a>
    <a class="card feat" rel="noopener" href="${REPO}#changes-from-the-original-pack"><h3>${ICON.wrench} Changes in this fork</h3><p>Eyes stay closed while sleeping and after death, and the second skin layer no longer moves twice on 1.21.2+.</p><span class="more">Changes ${ICON.ext}</span></a>
    <a class="card feat" href="editor/"><h3>${ICON.hand} Seven emotes</h3><p>Stand still, look straight up and tap sneak. Each tap is the next emote: wave, cheer, clap, dab, dance, jumping jacks, T-pose. Look away or walk to stop. All but the wave are new in 3.1-fix5 and not tested in the game.</p><span class="more">3D preview ${ICON.right}</span></a>
    <a class="card feat" href="editor/"><h3>${ICON.hand} Sit emote</h3><p>Stand still, sneak and look straight down, and you sit on the ground. New in 3.1-fix5, not tested in the game.</p><span class="more">3D preview ${ICON.right}</span></a>
  </div>
</section>
<section class="home-section" id="create">
  <div class="home-heading"><div><span class="home-eyebrow">MAKE IT YOURS</span><h2>${ICON.brush} Create</h2></div><p>Free tools, right in your browser.</p></div>
  <div class="tools">
    <a class="tool" href="editor/">
      <span class="tool-head"><img class="tool-img" src="icon-skin.png" alt="" width="48" height="48"><span><b>Minecraft Skin</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Add blinking, moving eyes and a mouth to your skin and see it in 3D.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Skin</i><i>Eyes</i><i>Mouth</i></span>
    </a>
    <a class="tool" href="paint/">
      <span class="tool-head"><img class="tool-img" src="icon-paint.png" alt="" width="48" height="48"><span><b>Skin Painter 3D</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Paint your Minecraft skin right on a 3D model, pixel by pixel.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Skin</i><i>Paint</i><i>3D</i></span>
    </a>
    <a class="tool" href="title/">
      <span class="tool-head"><img class="tool-img" src="icon-title.png" alt="" width="48" height="48"><span><b>Minecraft Title</b><small>Type a text, get the picture</small></span></span>
      <span class="tool-text">Type your text and download a block-letter title picture. Blockbench is on the same page.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Title</i><i>Logo</i></span>
    </a>
    <a class="tool" href="model/">
      <span class="tool-head"><img class="tool-img" src="icon-model.png" alt="" width="48" height="48"><span><b>Minecraft 3D Model</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Turn your skin into an animated 3D model file for Blender or Blockbench.</span>
      <span class="tags"><i class="g">Minecraft</i><i>3D Model</i><i>Animated</i></span>
    </a>
    <a class="tool" href="animation/">
      <span class="tool-head"><img class="tool-img" src="icon-anim.png" alt="" width="48" height="48"><span><b>Minecraft Animation</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Put movements in a row with your own skin and save the animation as a video.</span>
      <span class="tags"><i class="g">Minecraft</i><i>Animation</i><i>Video</i></span>
    </a>
    <a class="tool" href="cape/">
      <span class="tool-head"><span class="tool-ic">${ICON.box}</span><span><b>Cape Pack Builder</b><small>by Fresh Moves Fix</small></span></span>
      <span class="tool-text">Paint a cape texture or make an elytra pack for Minecraft Java.</span>
      <span class="tags"><i class="g">New</i><i>Java</i><i>Cape PNG</i><i>Elytra</i></span>
    </a>
  </div>
</section>

<section class="home-section" id="requirements">
  <div class="home-heading"><div><span class="home-eyebrow">BEFORE YOU PLAY</span><h2>${ICON.wrench} Requirements</h2></div><p>Get the right mods for your version.</p></div>
  <div class="text-card">
  <p>You need the <strong>latest</strong> versions of these two client-side mods (Fabric, Forge and NeoForge):</p>
  <p>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entity-model-features">${ICON.ext} Entity Model Features (EMF)</a>
    <a class="btn ghost" rel="noopener" href="https://modrinth.com/mod/entitytexturefeatures">${ICON.ext} Entity Texture Features (ETF)</a>
  </p>
  <p>On Fabric, also install a matching <a rel="noopener" href="https://modrinth.com/mod/fabric-api">Fabric API</a>. The mods and loader must match your Minecraft version; Fabric API is only for Fabric.</p>
  <p>Helpful, not required: <a rel="noopener" href="https://modrinth.com/mod/modmenu">Mod Menu</a> and <a rel="noopener" href="https://modrinth.com/mod/cloth-config">Cloth Config</a>, to open the settings of the mods in the game. Custom Skin Loader and Alpha Skins from old guides are no longer needed.</p>
  <p>On Minecraft 1.21.9 and newer armour only follows the animations with a recent EMF (3.0.5 or newer; 3.0.12 fixes armour lag).</p>
  <p>On Minecraft 26.1, 26.1.1 and 26.1.2 use EMF 3.3.2 or newer (older versions do not start or crash there). On 26.3 use EMF 3.3.6 or newer. EMF for 26.x exists for Fabric and NeoForge.</p>
  </div>
</section>

<section id="download" class="home-section">
  <div class="home-heading"><div><span class="home-eyebrow">READY TO PLAY?</span><h2>${ICON.down} Download</h2></div><p>Choose the pack and version that fit your game.</p></div>
  <p><a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">${ICON.down} Fresh-Moves-Fix.zip - all versions</a>
    <a class="btn ghost" href="${dl("Fresh-Moves-Fix-Eyes-Only.zip")}">${ICON.down} Eyes only - all versions</a></p>
  <div class="text-card download-info">
  <p><strong>Eyes only</strong> is the same pack without the body animations: the eyes blink and look around, and walking, running and the arms stay as in normal Minecraft. It has no emotes. Use one of the two packs, not both. New and not tested in the game.</p>
  <p class="reltime" id="reltime"${releaseTime ? "" : " hidden"}>${ICON.tag} <span>Release <b>v${version}</b> · updated <time datetime="${releaseTime}">${releaseTime ? releaseTime.replace("T", " ").replace(/:\d\dZ$/, " UTC") : ""}</time></span></p>
  <script>(function(){
    var p=document.getElementById("reltime"); if(!p) return; var t=p.querySelector("time");
    function show(iso){ var d=new Date(iso); if(isNaN(d)) return; t.setAttribute("datetime",iso);
      var txt; try{ txt=d.toLocaleString(document.documentElement.lang||undefined,{dateStyle:"medium",timeStyle:"short"}); }catch(e){ txt=d.toLocaleString(); }
      t.textContent=txt; t.title=iso.replace("T"," ").replace("Z"," UTC"); p.hidden=false; }
    if(t.getAttribute("datetime")) show(t.getAttribute("datetime"));
    try{ fetch("https://api.github.com/repos/BT-Studio-dev/Fresh-Moves-Fix/releases/tags/v${version}").then(function(r){return r.ok?r.json():null}).then(function(j){
      if(!j) return; var a=(j.assets||[]).map(function(x){return x.updated_at}).sort().pop()||j.published_at; if(a) show(a); }).catch(function(){}); }catch(e){}
  })()</script>
  <p>One zip for every supported version. Or pick the zip labelled for your Minecraft version:</p>
  </div>
  <div class="versions">
${versionLinks}
  </div>
  <a class="card go release-all" href="${REPO}/releases" target="_blank" rel="noopener noreferrer">
    <span>${ICON.tag} <b>All releases on GitHub</b><small>Browse every version, release note and download</small></span>
    <i aria-hidden="true">${ICON.ext}</i>
  </a>
</section>

<section id="minecraft-skins-download" class="home-section">
  <div class="text-card">
  <h2>${ICON.down} Download Minecraft Skins — Fabric</h2>
  <p><strong>Coming soon.</strong> Minecraft Skins downloads are temporarily locked. This is a separate mod, not the Fresh Moves Fix resource pack.</p>
  </div>
  <div class="versions">${skinVersionLinks}</div>
</section>

<section>
  <div class="text-card">
  <h2>${ICON.list} How to install</h2>
  <ol class="steps">
    <li>Install a mod loader for your Minecraft Java version, such as Fabric.</li>
    <li>Download matching versions of <a href="https://modrinth.com/mod/entity-model-features" rel="noopener">Entity Model Features (EMF)</a> and <a href="https://modrinth.com/mod/entitytexturefeatures" rel="noopener">Entity Texture Features (ETF)</a>. For Fabric, also download <a href="https://modrinth.com/mod/fabric-api" rel="noopener">Fabric API</a>. Choose the files for your Minecraft version and loader.</li>
    <li>Put the mod <strong>JAR</strong> files in your <code>mods</code> folder. Start Minecraft with the matching loader profile.</li>
    <li>Put the downloaded Fresh Moves Fix <strong>ZIP</strong> (do not unzip it) in your <code>resourcepacks</code> folder. Choose either the normal pack or Eyes Only, not both.</li>
    <li>In Minecraft go to Options → Resource Packs, move the pack to the right and click Done.</li>
  </ol>
  </div>
  <div class="install-cards" aria-label="Installation downloads and help">
    <a class="card install-link" href="https://modrinth.com/mod/entity-model-features" rel="noopener noreferrer"><span class="install-icon">${ICON.box}</span><span><b>Entity Model Features</b><small>Download EMF for your loader</small></span><span aria-hidden="true">${ICON.ext}</span></a>
    <a class="card install-link" href="https://modrinth.com/mod/entitytexturefeatures" rel="noopener noreferrer"><span class="install-icon">${ICON.grid}</span><span><b>Entity Texture Features</b><small>Download ETF for your loader</small></span><span aria-hidden="true">${ICON.ext}</span></a>
    <a class="card install-link" href="https://modrinth.com/mod/fabric-api" rel="noopener noreferrer"><span class="install-icon">${ICON.code}</span><span><b>Fabric API</b><small>Required when using Fabric</small></span><span aria-hidden="true">${ICON.ext}</span></a>
    <a class="card install-link" href="guides/fix-black-eyes/"><span class="install-icon">${ICON.eye}</span><span><b>Fix Black Eyes</b><small>Open the troubleshooting guide</small></span><span aria-hidden="true">${ICON.right}</span></a>
  </div>
</section>
</div>
<script src="player.js?v=${ver("player.js")}"></script>
<script>(function(){
  var canvas=document.getElementById("owner-model"), fallback=document.getElementById("owner-fallback");
  if(!canvas || !fallback || !window.FMFPlayer) return;
  var image=new Image();
  image.onload=function(){
    try {
      var source=document.createElement("canvas"); source.width=64; source.height=64;
      source.getContext("2d").drawImage(image,0,0);
      var viewer=new window.FMFPlayer.SoftViewer(canvas);
      viewer.pose="cheer"; viewer.zoom=1.05; viewer.view(-0.45,0.12,0);
      viewer.loadSkin(source,{model:"wide"}); viewer.render(); viewer.dispose();
      canvas.hidden=false; fallback.hidden=true;
    } catch(e) { /* Keep the static fallback. */ }
  };
  image.src="owner-skin.png?v=${ver("owner-skin.png")}";
})()</script>`,
}));

console.log(`Built website: ${docs.length} guides, ${versions.length} Minecraft versions, release v${version}`);
