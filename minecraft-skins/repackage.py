#!/usr/bin/env python3
"""Create a clearly attributed Minecraft Skins JAR from the pinned HD Skins release."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

EXPECTED_SHA256 = '5e8833c042492b944a7ece1bd15c7ed02810a218421b846d2691880ab202a9ad'
source = Path(sys.argv[1])
target = Path(sys.argv[2])
if hashlib.sha256(source.read_bytes()).hexdigest() != EXPECTED_SHA256:
    raise SystemExit('Unexpected upstream JAR hash; refusing to repackage')
license_text = (Path(__file__).parent / 'LICENSE.upstream').read_bytes()
notice = (b'Minecraft Skins is a renamed distribution of HD Skins 6.16.2+26.3.\n'
          b'Copyright (c) 2019 Mine Little Pony; authors Mumfrey, Killjoy1221 and Sollace.\n'
          b'Source: https://github.com/MineLittlePony/HDSkins\n'
          b'The upstream MIT license is included in LICENSE.minecraft-skins-upstream.txt.\n'
          b'This renamed distribution is not an official upstream release.\n')
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
