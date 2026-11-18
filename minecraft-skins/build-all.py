#!/usr/bin/env python3
"""Download and repackage the pinned upstream Minecraft-specific releases."""
import json
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
output = Path(sys.argv[1])
upstream = output.parent / 'upstream-skins'
upstream.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
entries = json.loads((root / 'upstream-releases.json').read_text(encoding='utf-8'))
for entry in entries:
    subprocess.run(['gh', 'release', 'download', entry['tag'], '--repo', 'MineLittlePony/HDSkins',
                    '--pattern', entry['asset'], '--dir', str(upstream)], check=True)
    subprocess.run([sys.executable, str(root / 'repackage.py'), str(upstream / entry['asset']),
                    str(output / ('minecraft-skins-fabric-' + entry['minecraft_build'] + '.jar'))], check=True)
