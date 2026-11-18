#!/usr/bin/env python3
"""Repackage one pinned upstream HD Skins release with attribution."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
root = Path(__file__).parent
releases = json.loads((root / 'upstream-releases.json').read_text(encoding='utf-8'))
matches = [item for item in releases if item['asset'] == source.name]
if len(matches) != 1 or hashlib.sha256(source.read_bytes()).hexdigest() != matches[0]['sha256']:
    raise SystemExit('Unknown upstream JAR or unexpected SHA-256; refusing to repackage')
entry = matches[0]
license_text = (root / 'LICENSE.upstream').read_bytes()
notice = (f'Minecraft Skins is a renamed distribution of {entry["asset"]}.\n'
          'Copyright (c) 2019 Mine Little Pony; authors Mumfrey, Killjoy1221 and Sollace.\n'
          'Source: https://github.com/MineLittlePony/HDSkins\n'
          'The upstream MIT license is included in LICENSE.minecraft-skins-upstream.txt.\n'
          'This renamed distribution is not an official upstream release.\n').encode()
target.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(source) as src, zipfile.ZipFile(target, 'w') as dst:
    if any(i.filename.upper().startswith('META-INF/') and i.filename.upper().endswith(('.SF', '.RSA', '.DSA', '.EC')) for i in src.infolist()):
        raise SystemExit('Upstream JAR is signed; refusing to modify signatures')
    if src.testzip():
        raise SystemExit('Upstream JAR has a corrupt entry')
    for item in src.infolist():
        data = src.read(item.filename)
        if item.filename == 'fabric.mod.json':
            meta = json.loads(data)
            if meta.get('id') != 'hdskins':
                raise SystemExit('Unexpected mod ID')
            meta['name'] = 'Minecraft Skins (based on HD Skins)'
            meta['description'] = 'Renamed distribution of HD Skins by Mine Little Pony; skin server and HD skin support.'
            data = (json.dumps(meta, ensure_ascii=False, indent=2) + '\n').encode()
        dst.writestr(item, data)
    dst.writestr('NOTICE.minecraft-skins.txt', notice)
    dst.writestr('LICENSE.minecraft-skins-upstream.txt', license_text)
with zipfile.ZipFile(target) as z:
    if z.testzip():
        raise SystemExit('Output JAR has a corrupt entry')
    meta = json.loads(z.read('fabric.mod.json'))
    print('Created', target, 'id:', meta['id'], 'version:', meta['version'], 'name:', meta['name'])
