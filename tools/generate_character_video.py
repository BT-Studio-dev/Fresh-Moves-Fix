#!/usr/bin/env python3
"""Make the silent blinking/looking banner video from the supplied character image.

Requires Pillow and ffmpeg (or pass the ffmpeg binary path as the first argument).
The original source image remains unchanged; this is illustrative animation, not gameplay.
"""
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'website/fresh-banner-character.png').convert('RGB')
if source.size != (512, 512):
    raise SystemExit('Expected the 512 x 512 banner character image')
crop = (110, 65, 390, 345)
size = (384, 384)
poster = source.crop(crop).resize(size, Image.Resampling.LANCZOS)
poster.save(root / 'website/fresh-banner-head-poster.png', optimize=True)
ffmpeg = sys.argv[1] if len(sys.argv) > 1 else 'ffmpeg'
cmd = [ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '384x384', '-r', '15', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(root / 'website/fresh-banner-head.mp4')]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
try:
    for frame in range(75):  # Five seconds, looping back to the original eyes.
        img = source.copy()
        draw = ImageDraw.Draw(img)
        if frame in range(48, 51):
            # Closed eyelids match the surrounding skin, with thin dark lash lines.
            draw.polygon([(164,180),(218,180),(217,220),(163,220)], fill='#aa764e')
            draw.polygon([(266,180),(321,180),(320,220),(265,220)], fill='#aa764e')
            draw.rectangle((166,211,214,213), fill='#71472f')
            draw.rectangle((268,211,316,213), fill='#71472f')
        elif frame in range(15, 27) or frame in range(54, 63):
            # Draw the pupils looking left while keeping them inside the eye whites.
            draw.polygon([(165,181),(217,181),(216,218),(163,218)], fill='#c9c7c6')
            draw.polygon([(267,181),(320,181),(319,218),(265,218)], fill='#c9c7c6')
            draw.polygon([(168,184),(188,184),(187,210),(167,210)], fill='#392a70')
            draw.polygon([(270,184),(292,184),(291,210),(269,210)], fill='#392a70')
        img = img.crop(crop).resize(size, Image.Resampling.LANCZOS)
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg failed')
except BaseException:
    proc.kill()
    proc.wait()
    raise
print('Created fresh-banner-head.mp4 and fresh-banner-head-poster.png')
