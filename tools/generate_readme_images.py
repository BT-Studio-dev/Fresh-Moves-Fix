#!/usr/bin/env python3
"""Generate the README artwork from this repository's existing images.

Requires Pillow and the DejaVu Sans fonts (override FONT_DIR if necessary).
No Minecraft resource-pack files or website images are modified.
"""
from pathlib import Path
import os
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.github' / 'page'
OUT.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path(os.environ.get('FONT_DIR', '/usr/share/fonts/truetype/dejavu'))
REGULAR = FONT_DIR / 'DejaVuSans.ttf'
BOLD = FONT_DIR / 'DejaVuSans-Bold.ttf'
INK = '#edf8f0'
MUTED = '#acbfb4'
GREEN = '#57dc91'
LINE = '#2f5849'


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size)


def background(size):
    w, h = size
    im = Image.new('RGB', size, '#0d1d17')
    d = ImageDraw.Draw(im)
    # Subtle Minecraft-inspired blocks along the outer edge, keeping text clear.
    block = 40
    for y in range(0, h, block):
        for x in range(0, w, block):
            if (x // block + y // block) % 2 == 0:
                d.rectangle((x, y, x + block - 1, y + block - 1), fill='#10241b')
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=22, outline=LINE, width=3)
    return im


def label(d, xy, text, size, color=INK, bold=False):
    d.text(xy, text, font=font(size, bold), fill=color, stroke_width=0)


def accent(d, x, y, length):
    d.rounded_rectangle((x, y, x + length, y + 7), radius=3, fill=GREEN)


def thumbnail(im, source, box, *, pixel=False, rounded=14):
    source = Image.open(ROOT / source).convert('RGB') if isinstance(source, str) else source.convert('RGB')
    x, y, w, h = box
    resample = Image.Resampling.NEAREST if pixel else Image.Resampling.LANCZOS
    source = ImageOps.fit(source, (w, h), method=resample, centering=(.5, .5))
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w-1, h-1), radius=rounded, fill=255)
    im.paste(source, (x, y), mask)


def save(im, name):
    im.save(OUT / name, format='PNG', optimize=True)


def banner():
    im = background((1600, 620)); d = ImageDraw.Draw(im)
    label(d, (70, 54), 'MINECRAFT JAVA  /  RESOURCE PACK', 21, GREEN, True)
    label(d, (65, 123), 'FRESH MOVES', 77, INK, True)
    label(d, (65, 212), 'FIX', 92, GREEN, True)
    accent(d, 70, 338, 92)
    label(d, (70, 369), 'More personality for your player.', 31)
    label(d, (70, 418), 'Animations, expressive eyes & creative tools', 23, MUTED)
    label(d, (70, 518), 'UNOFFICIAL FORK  •  REQUIRES EMF + ETF', 19, MUTED, True)
    # Crop the original project-made preview; it is an illustration, not gameplay.
    src = Image.open(ROOT / 'docs/images/banner.png').copy()
    # Remove a small fragment of the original caption in the art crop.
    ImageDraw.Draw(src).rectangle((965, 670, 1019, 706), fill=(26, 53, 40))
    art = src.crop((965, 418, 1880, 895))
    thumbnail(im, art, (850, 106, 670, 348), rounded=20)
    label(d, (1010, 478), 'PROJECT PREVIEW  /  NOT GAMEPLAY', 17, MUTED, True)
    save(im, 'banner.png')


def heading(filename, eyebrow, title, subtitle):
    im = background((1600, 190)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((34, 31, 43, 159), radius=3, fill=GREEN)
    label(d, (77, 32), eyebrow, 18, GREEN, True)
    label(d, (74, 61), title, 45, INK, True)
    label(d, (77, 128), subtitle, 21, MUTED)
    # Decorative blocks, never text-bearing.
    for x, y, s in [(1454, 47, 22), (1490, 47, 22), (1526, 47, 22), (1490, 83, 22), (1526, 119, 22)]:
        d.rounded_rectangle((x, y, x+s, y+s), radius=3, fill='#244336')
    save(im, filename)


def feature(filename, number, title, line1, line2, icon):
    im = background((520, 390)); d = ImageDraw.Draw(im)
    label(d, (30, 25), number, 18, GREEN, True)
    thumbnail(im, icon, (32, 69, 102, 102), pixel=True, rounded=12)
    accent(d, 32, 196, 54)
    label(d, (28, 225), title, 32, INK, True)
    label(d, (32, 280), line1, 20, MUTED)
    label(d, (32, 312), line2, 20, MUTED)
    label(d, (32, 351), 'FRESH MOVES FIX', 14, GREEN, True)
    save(im, filename)


def install():
    im = background((1600, 330)); d = ImageDraw.Draw(im)
    items = [('01', 'INSTALL THE MODS', 'Add EMF and ETF', 'for your game & loader.'),
             ('02', 'ADD THE PACK', 'Put the downloaded ZIP', 'in resourcepacks.'),
             ('03', 'ENABLE IN GAME', 'Open Resource Packs', 'and enable the ZIP.')]
    for i, (n, title, first, second) in enumerate(items):
        x = 55 + i * 520
        d.rounded_rectangle((x, 43, x + 475, 284), radius=16, fill='#122a20', outline=LINE, width=2)
        label(d, (x+25, 64), n, 27, GREEN, True)
        label(d, (x+25, 120), title, 23, INK, True)
        label(d, (x+25, 172), first, 21, MUTED)
        label(d, (x+25, 203), second, 21, MUTED)
    save(im, 'install-steps.png')


def tile(filename, title, description, symbol):
    im = background((520, 185)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((24, 28, 104, 108), radius=14, fill='#1d4432', outline=LINE, width=2)
    label(d, (45, 43), symbol, 32, GREEN, True)
    label(d, (125, 34), title, 28, INK, True)
    label(d, (126, 81), description, 18, MUTED)
    label(d, (27, 140), 'OPEN LINK  →', 16, GREEN, True)
    save(im, filename)


banner()
heading('head-features.png', '01  /  EXPLORE', 'Made for more expression', 'A closer look at the pack and its browser tools.')
heading('head-install.png', '02  /  GET STARTED', 'Set up in three steps', 'A matching Minecraft version and mod loader matter.')
heading('head-download.png', '03  /  LINKS', 'Choose where to go', 'Downloads, the editor and guides are just a click away.')
heading('head-changes.png', '04  /  THE DETAILS', 'What this fork changes', 'Fixes, experiments and compatibility notes.')
feature('feature-eyes.png', '01  /  CUSTOM SKINS', 'Animated eyes', 'Make a skin with', 'expressive eye pixels.', 'website/icon-skin.png')
feature('feature-animation.png', '02  /  PLAYER MODEL', 'Player animation', 'Walking, swimming', 'and more movement.', 'website/icon-anim.png')
feature('feature-tools.png', '03  /  CREATE', 'Browser tools', 'Edit and preview', 'your own skin.', 'website/icon-paint.png')
install()
tile('tile-github.png', 'GitHub releases', 'Choose a pack ZIP', '↓')
tile('tile-editor.png', 'Skin Eye Editor', 'Make expressive eyes', '✦')
tile('tile-guides.png', 'Guides & help', 'Learn the skin layout', '?')
print(f'Created 12 README images in {OUT.relative_to(ROOT)}')
