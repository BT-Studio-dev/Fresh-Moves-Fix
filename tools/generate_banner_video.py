#!/usr/bin/env python3
"""Create the silent decorative homepage background (requires Pillow and ffmpeg)."""
import math
import random
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

W, H, FPS, DURATION = 960, 360, 15, 8
rng = random.Random(2027)
stars = [(rng.randrange(W), rng.randrange(H), rng.choice((2, 2, 3, 4)), rng.random()*math.tau) for _ in range(70)]
blocks = [(rng.randrange(-40, W), rng.randrange(-30, H), rng.choice((18, 28, 38, 52)), rng.random()*math.tau) for _ in range(21)]
root = Path(__file__).resolve().parents[1]
ffmpeg = sys.argv[1] if len(sys.argv) > 1 else 'ffmpeg'
output = root / 'website' / 'fresh-moves-banner.mp4'
cmd = [ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
try:
    for frame in range(FPS * DURATION):
        t = math.tau * frame / (FPS * DURATION)
        img = Image.new('RGB', (W, H), '#081c1d')
        draw = ImageDraw.Draw(img)
        # A dark teal field keeps overlaid text legible while blocky facets move gently.
        for y in range(0, H, 8):
            p = y / H
            draw.rectangle((0, y, W, y + 7), fill=(int(7 + 3*p), int(29 + 10*p), int(30 + 9*p)))
        for x, y, size, phase in blocks:
            dx, dy = round(9*math.sin(t+phase)), round(6*math.cos(t+phase))
            draw.rectangle((x+dx, y+dy, x+dx+size, y+dy+size), outline='#214b43', width=2)
            draw.rectangle((x+dx+4, y+dy+4, x+dx+size-4, y+dy+size-4), fill='#102f2e')
        for x, y, size, phase in stars:
            bright = int(40 + 30 * (1 + math.sin(t+phase))/2)
            draw.rectangle((x, y, x+size, y+size), fill=(bright//2, bright, int(bright*.8)))
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg failed')
except BaseException:
    proc.kill()
    proc.wait()
    raise
print(output)
