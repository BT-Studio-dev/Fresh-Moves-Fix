#!/usr/bin/env python3
"""Download a pinned Just Expressions wiki's image attachments for inspection.

The images are not bundled into the website or committed. The manifest records
where each image appeared so an artifact can be reviewed against the wiki.
"""
import argparse
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

URL_RE = re.compile(r'https://github\.com/user-attachments/assets/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
MAX_BYTES = 10 * 1024 * 1024


def collect(wiki):
    references = {}
    for page in sorted(wiki.glob('*.md')):
        for url in URL_RE.findall(page.read_text(encoding='utf-8')):
            references.setdefault(url, set()).add(page.name)
    return {url: sorted(pages) for url, pages in sorted(references.items())}


def download(url, output):
    asset_id = url.rsplit('/', 1)[-1].lower()
    request = Request(url, headers={'User-Agent': 'Fresh-Moves-Fix-diagram-review/1.0'})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=40) as response:
                content_type = response.headers.get_content_type()
                ext = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif'}.get(content_type)
                if not ext:
                    raise ValueError('Unexpected content type: ' + content_type)
                data = response.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise ValueError('Image exceeds size limit')
                signature = ((ext == '.png' and data.startswith(b'\x89PNG\r\n\x1a\n')) or
                             (ext == '.jpg' and data.startswith(b'\xff\xd8\xff')) or
                             (ext == '.gif' and data.startswith((b'GIF87a', b'GIF89a'))) or
                             (ext == '.webp' and data[:4] == b'RIFF' and data[8:12] == b'WEBP'))
                if not signature:
                    raise ValueError('Invalid image signature')
                file = asset_id + ext
                (output / file).write_bytes(data)
                return {'file': file, 'bytes': len(data)}
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as error:
            if attempt == 2:
                return {'error': str(error)}
            time.sleep(2 ** attempt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('wiki', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if not args.wiki.is_dir():
        parser.error('wiki directory does not exist')
    refs = collect(args.wiki)
    if not refs or len(refs) > 500:
        parser.error('unexpected number of attachment links: ' + str(len(refs)))
    args.output.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda url: download(url, args.output), refs))
    manifest = [{'url': url, 'pages': refs[url], **result} for url, result in zip(refs, results)]
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (args.output / 'README.txt').write_text(
        'Diagrams from https://github.com/IthanMendoza/Just-Expressions/wiki\n'
        'For inspection only. The manifest records each source URL and wiki page.\n'
        'Check upstream rights before redistributing images or deriving assets.\n', encoding='utf-8')
    failed = [item for item in manifest if 'error' in item]
    print(f'Downloaded {len(manifest) - len(failed)} of {len(manifest)} diagrams.')
    for item in failed:
        print(item['url'], item['error'], file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
