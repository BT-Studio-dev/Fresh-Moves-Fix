#!/usr/bin/env python3
"""Build the resource pack zip: checks the pack files, then writes dist/<name>.zip.

Usage: python3 build.py [version]
"""
import json
import struct
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = "Fresh-Moves-Fix"
INCLUDE = ["pack.mcmeta", "pack.png", "LICENSE", "assets"]


def fail(msg):
    print(f"ERROR: {msg}")
    sys.exit(1)


def check():
    meta_path = ROOT / "pack.mcmeta"
    if not meta_path.is_file():
        fail("pack.mcmeta is missing")
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except ValueError as e:
        fail(f"pack.mcmeta is not valid JSON: {e}")
    if "pack_format" not in meta.get("pack", {}):
        fail("pack.mcmeta has no pack.pack_format")

    overlays = [e.get("directory") for e in meta.get("overlays", {}).get("entries", [])]
    for d in overlays:
        if not d or not (ROOT / d).is_dir():
            fail(f"overlay directory '{d}' listed in pack.mcmeta does not exist")

    icon = ROOT / "pack.png"
    if icon.is_file():
        head = icon.read_bytes()[:24]
        if head[:8] != b"\x89PNG\r\n\x1a\n":
            fail("pack.png is not a PNG file")
        w, h = struct.unpack(">II", head[16:24])
        if w != h:
            fail(f"pack.png must be square, it is {w}x{h}")

    folders = INCLUDE + overlays
    count = 0
    for folder in folders:
        base = ROOT / folder
        files = [base] if base.is_file() else base.rglob("*")
        for f in files:
            if f.suffix in (".jem", ".jpm", ".json", ".mcmeta"):
                try:
                    json.loads(f.read_text(encoding="utf-8"))
                except ValueError as e:
                    fail(f"{f.relative_to(ROOT)} is not valid JSON: {e}")
                count += 1
    print(f"Checked {count} JSON files, {len(overlays)} overlay(s)")
    return folders


def build(version):
    folders = check()
    out_dir = ROOT / "dist"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / (f"{NAME}-{version}.zip" if version else f"{NAME}.zip")
    n = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for folder in folders:
            base = ROOT / folder
            if not base.exists():
                continue
            files = [base] if base.is_file() else sorted(p for p in base.rglob("*") if p.is_file())
            for f in files:
                z.write(f, f.relative_to(ROOT).as_posix())
                n += 1
    print(f"Wrote {out.relative_to(ROOT)} ({n} files, {out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "")
