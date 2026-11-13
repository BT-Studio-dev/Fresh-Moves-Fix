#!/usr/bin/env python3
"""Build the resource pack zip: checks the pack files, then writes dist/<name>.zip.

Usage:
  python3 build.py              universal zip + one zip per supported Minecraft version
  python3 build.py 26.3 1.21.5  only the zips for these Minecraft versions
"""
import json
import struct
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = "Fresh-Moves-Fix"
INCLUDE = ["pack.mcmeta", "pack.png", "LICENSE", "INSTALL.txt", "assets"]


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


# Resource pack format of each supported Minecraft version.
VERSIONS = {
    "1.20": 15,
    "1.20.1": 15,
    "1.20.2": 18,
    "1.20.3": 22,
    "1.20.4": 22,
    "1.20.5": 32,
    "1.20.6": 32,
    "1.21": 34,
    "1.21.1": 34,
    "1.21.2": 42,
    "1.21.3": 42,
    "1.21.4": 46,
    "1.21.5": 55,
    "1.21.6": 63,
    "1.21.7": 64,
    "1.21.8": 64,
    "1.21.9": 69,
    "1.21.10": 69,
    "1.21.11": 75,
    "26.1": 84,
    "26.1.1": 84,
    "26.1.2": 84,
    "26.2": 88,
    "26.3": 97,
}


def collect(folders):
    """Map of zip path -> file for the given top-level files/folders."""
    out = {}
    for folder in folders:
        base = ROOT / folder
        if not base.exists():
            continue
        files = [base] if base.is_file() else sorted(p for p in base.rglob("*") if p.is_file())
        for f in files:
            out[f.relative_to(ROOT).as_posix()] = f
    return out


def write_zip(name, entries):
    out_dir = ROOT / "dist"
    out_dir.mkdir(exist_ok=True)
    out = out_dir / name
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for arc, src in entries.items():
            if isinstance(src, Path):
                z.write(src, arc)
            else:
                z.writestr(arc, src)
    print(f"Wrote dist/{name} ({len(entries)} files, {out.stat().st_size // 1024} KB)")


def build_universal(folders):
    """One zip for every version; Minecraft picks the overlay folders itself."""
    write_zip(f"{NAME}.zip", collect(folders))


def build_version(mc):
    """A zip for one Minecraft version: matching overlays are merged into assets/."""
    fmt = VERSIONS[mc]
    meta = json.loads((ROOT / "pack.mcmeta").read_text(encoding="utf-8"))
    entries = collect(INCLUDE)
    for e in meta.get("overlays", {}).get("entries", []):
        lo, hi = e["formats"]
        if lo <= fmt <= hi:
            prefix = e["directory"] + "/"
            for arc, f in collect([e["directory"]]).items():
                entries[arc[len(prefix):]] = f
    pack = {"pack_format": fmt}
    if fmt >= 65:  # 1.21.9+ reads min_format / max_format
        pack["min_format"] = fmt
        pack["max_format"] = fmt
    pack["description"] = f"\u00a7a\u2611 With Animated Eyes \u00a7b\n\u2756 For Minecraft {mc}"
    entries["pack.mcmeta"] = json.dumps({"pack": pack}, indent=4, ensure_ascii=False) + "\n"
    write_zip(f"{NAME}-mc{mc}.zip", entries)


if __name__ == "__main__":
    wanted = sys.argv[1:]
    unknown = [v for v in wanted if v not in VERSIONS]
    if unknown:
        fail(f"unknown Minecraft version(s): {', '.join(unknown)}. Known: {', '.join(VERSIONS)}")
    folders = check()
    if not wanted:
        build_universal(folders)
    for mc in wanted or VERSIONS:
        build_version(mc)
