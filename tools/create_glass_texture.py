#!/usr/bin/env python3
"""Create original, translucent green-to-blue glass textures for the pack."""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'assets/minecraft/textures/block'


def png(path, width, height, pixels):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    raw = b''.join(b'\0' + bytes(sum((list(pixels(x, y)) for x in range(width)), [])) for y in range(height))
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


def glass(x, y):
    # A light green-to-blue tint with a thin translucent frame and pixel reflections.
    t = (x + y * 0.3) / 19.5
    color = (int(76 - 30*t), int(211 - 68*t), int(156 + 65*t))
    if x in (0, 15) or y in (0, 15):
        return (*color, 150)
    if (x, y) in {(2, 3), (3, 2), (2, 4), (3, 3), (4, 2), (3, 4), (4, 3), (11, 12), (12, 11)}:
        return (220, 255, 248, 90)
    return (*color, 28)


def pane_top(x, y):
    return glass(x, 0 if y in (0, 15) else 7)


if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    png(ROOT / 'glass.png', 16, 16, glass)
    png(ROOT / 'glass_pane_top.png', 16, 16, pane_top)
