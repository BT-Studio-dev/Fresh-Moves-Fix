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

function page({ title, body, depth = 0, description = "" }) {
  const up = "../".repeat(depth);
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
<link rel="icon" href="${up}pack.png">
<link rel="stylesheet" href="${up}style.css">
</head>
<body>
<header class="top"><div class="wrap">
  <img src="${up}pack.png" alt="">
  <a class="name" href="${up || "./"}">Fresh Moves Fix</a>
  <nav>
    <a href="${up}#download">Download</a>
    <a href="${up}guides/">Guides</a>
    <a href="${REPO}">GitHub</a>
  </nav>
</div></header>
${body}
<footer><div class="wrap">
  Fresh Moves Fix is a fork of <a href="https://github.com/IthanMendoza/Fresh-Moves">Fresh Moves</a> by IthanMendoza (CC0),
  based on Fresh Animations by FreshLX. Not an official Minecraft product; not approved by or associated with Mojang or Microsoft.
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
  description: "A fork of the Fresh Moves resource pack: smoother player animations and animated eyes, with builds for Minecraft 1.20 to 26.3.",
  body: `<div class="wrap">
<div class="hero">
  <img src="pack.png" alt="Fresh Moves Fix pack icon">
  <div class="txt">
    <h1>Fresh Moves Fix</h1>
    <p>Smoother, more expressive player animations and animated eyes for Minecraft. A fork of Fresh Moves with small fixes and builds for Minecraft ${versions[0].mc} to ${versions[versions.length - 1].mc}.</p>
    <a class="btn" href="${dl("Fresh-Moves-Fix.zip")}">Download ${esc(version)}</a>
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
