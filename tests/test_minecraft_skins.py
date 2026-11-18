"""Check that every website card has its attributed, readable mod JAR."""
import json
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SkinDownloadTests(unittest.TestCase):
    def test_pinned_website_jars(self):
        releases = json.loads((ROOT / 'minecraft-skins/upstream-releases.json').read_text())
        self.assertEqual(len(releases), 15)
        self.assertEqual(len({r['minecraft_build'] for r in releases}), len(releases))
        for release in releases:
            with self.subTest(build=release['minecraft_build']):
                path = ROOT / 'website/downloads/minecraft-skins' / ('minecraft-skins-fabric-' + release['minecraft_build'] + '.jar')
                with zipfile.ZipFile(path) as jar:
                    self.assertIsNone(jar.testzip())
                    meta = json.loads(jar.read('fabric.mod.json'))
                    self.assertEqual(meta['id'], 'hdskins')
                    self.assertIn('Minecraft Skins', meta['name'])
                    self.assertEqual(meta['version'], release['asset'].removeprefix('hdskins-').removesuffix('.jar'))
                    self.assertIn(b'MIT License', jar.read('LICENSE.minecraft-skins-upstream.txt'))
                    self.assertIn(release['asset'].encode(), jar.read('NOTICE.minecraft-skins.txt'))


if __name__ == '__main__':
    unittest.main()
