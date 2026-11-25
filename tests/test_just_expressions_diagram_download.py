import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from email.message import Message

spec = importlib.util.spec_from_file_location('je_diagrams', Path(__file__).resolve().parents[1] / 'tools/download_just_expressions_diagrams.py')
je = importlib.util.module_from_spec(spec)
spec.loader.exec_module(je)


class FakeResponse:
    def __init__(self, kind, data):
        self.headers = Message()
        self.headers['Content-Type'] = kind
        self.data = data
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, limit): return self.data[:limit]


class DiagramDownloadTest(unittest.TestCase):
    def test_collect_only_approved_attachment_urls_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            url = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc'
            (root / 'A.md').write_text(url + '\n' + url + '\nhttps://evil.example/img.png', encoding='utf-8')
            (root / 'B.md').write_text(url, encoding='utf-8')
            self.assertEqual(je.collect(root), {url: ['A.md', 'B.md']})

    def test_valid_image_and_reject_html(self):
        url = 'https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc'
        with tempfile.TemporaryDirectory() as d, patch.object(je.time, 'sleep'):
            out = Path(d)
            with patch.object(je, 'urlopen', return_value=FakeResponse('image/png', b'\x89PNG\r\n\x1a\nexample')):
                result = je.download(url, out)
            self.assertTrue((out / result['file']).is_file())
            with patch.object(je, 'urlopen', return_value=FakeResponse('text/html', b'not an image')):
                self.assertIn('error', je.download(url, out))


if __name__ == '__main__': unittest.main()
