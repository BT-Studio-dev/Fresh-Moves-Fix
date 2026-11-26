import hashlib
import json
import pathlib
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / 'website'
DOWNLOADS = SITE / 'downloads' / 'glowing-eyes'


class DirectGlowingEyesDownloads(unittest.TestCase):
    def test_jar_manifest_and_site_copies(self):
        builds = json.loads((SITE / 'glowing-eyes-experimental.json').read_text())
        expected = {('fabric', v) for v in ('1.20.5', '1.20.6', '26.1', '26.1.1', '26.1.2', '26.2', '26.3')}
        expected |= {('neoforge', v) for v in ('26.1', '26.1.1', '26.1.2', '26.2', '26.3')}
        self.assertEqual({(x['loader'], x['game']) for x in builds}, expected)
        self.assertEqual(len(builds), len(expected))
        for entry in builds:
            with self.subTest(loader=entry['loader'], game=entry['game']):
                filename = f"glowing-eyes-fmf-{entry['loader']}-{entry['game']}-experimental.jar"
                self.assertEqual(entry['file'], filename)
                data = (DOWNLOADS / filename).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), entry['sha256'])
                self.assertEqual((SITE / 'public' / 'downloads' / 'glowing-eyes' / filename).read_bytes(), data)
                with zipfile.ZipFile(DOWNLOADS / filename) as jar:
                    self.assertIsNone(jar.testzip())
                    self.assertIn('NOTICE.md', jar.namelist())
                    if entry['loader'] == 'fabric':
                        meta = json.loads(jar.read('fabric.mod.json'))
                        self.assertEqual(meta['depends']['minecraft'], '=' + entry['game'])
                        self.assertIn('experimental', meta['name'].lower())
                        self.assertIn(meta['accessWidener'], jar.namelist())
                    else:
                        meta = jar.read('META-INF/neoforge.mods.toml').decode()
                        self.assertIn('[' + entry['game'] + ']', meta)
                        self.assertIn('experimental', meta.lower())
                        self.assertIn('META-INF/accesstransformer.cfg', jar.namelist())

    def test_source_archive_includes_matching_sources_and_licenses(self):
        archive = DOWNLOADS / 'glowing-eyes-experimental-source.zip'
        self.assertEqual((SITE / 'public' / 'downloads' / 'glowing-eyes' / archive.name).read_bytes(), archive.read_bytes())
        with zipfile.ZipFile(archive) as source:
            self.assertIsNone(source.testzip())
            for directory in ('glowing-eyes-fabric-120', 'glowing-eyes-fabric-26', 'glowing-eyes-neoforge-26'):
                for file in (ROOT / directory).rglob('*'):
                    if file.is_file() and not {'build', '.gradle'}.intersection(file.parts):
                        self.assertEqual(source.read(file.relative_to(ROOT).as_posix()), file.read_bytes(), str(file))
                self.assertIn(f'{directory}/LICENSE', source.namelist())
                self.assertIn(f'{directory}/NOTICE.md', source.namelist())


if __name__ == '__main__':
    unittest.main()
