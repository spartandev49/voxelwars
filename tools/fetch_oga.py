#!/usr/bin/env python3
"""Download OpenGameArt packs safely (metadata + files) into assets/raw/oga-<slug>/ .
usage: python3 -I tools/fetch_oga.py slug [slug ...]
 - only downloads if the page lists CC0 / CC-BY 3.0 / CC-BY 4.0 among its licences
 - archives are extracted with path-traversal checks into files/ (never executed)
 - writes meta.json (title, author, licences, page url, file list)
"""
import sys, os, json, subprocess, zipfile, tarfile, urllib.parse, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(1, os.path.join(HERE, 'pylib'))
import oga
RAW = '/home/user/voxelwars/assets/raw'
OK = ('CC0', 'CC-BY 3.0', 'CC-BY 4.0')
AUDIO = ('.wav', '.ogg', '.mp3', '.flac', '.aif', '.aiff', '.m4a')
SKIP = ('.png', '.jpg', '.jpeg', '.gif', '.txt', '.pdf', '.mid', '.midi')

def safe(name):
    n = os.path.normpath(name)
    return not (os.path.isabs(name) or n.startswith('..') or '/..' in name or name.startswith('/'))

def extract(path, dest):
    low = path.lower()
    os.makedirs(dest, exist_ok=True)
    if low.endswith('.zip'):
        with zipfile.ZipFile(path) as z:
            bad = [n for n in z.namelist() if not safe(n)]
            if bad: print('  UNSAFE zip', bad[:3]); return
            z.extractall(dest)
    elif low.endswith('.7z'):
        import py7zr
        with py7zr.SevenZipFile(path) as z:
            bad = [n for n in z.getnames() if not safe(n)]
            if bad: print('  UNSAFE 7z', bad[:3]); return
            z.extractall(dest)
    elif low.endswith(('.tar.gz', '.tgz', '.tar')):
        with tarfile.open(path) as t:
            bad = [m.name for m in t.getmembers() if not safe(m.name) or m.issym() or m.islnk()]
            if bad: print('  UNSAFE tar', bad[:3]); return
            t.extractall(dest, filter='data')
    else:
        shutil.copy(path, dest)

def fetch(slug):
    d = oga.info(slug)
    if not any(l in OK for l in d['licenses']):
        print(slug, 'SKIP licence', d['licenses']); return
    base = os.path.join(RAW, 'oga-' + slug)
    if os.path.exists(base): print(slug, 'exists'); return
    os.makedirs(os.path.join(base, 'dl')); os.makedirs(os.path.join(base, 'files'))
    got = []
    for u in d['files']:
        fn = urllib.parse.unquote(os.path.basename(u))
        if fn.lower().endswith(SKIP): continue
        dst = os.path.join(base, 'dl', fn)
        r = subprocess.run(['curl', '-sS', '-L', '-m', '300', '-o', dst, '-w', '%{http_code}', u], capture_output=True, text=True)
        if r.stdout.strip() != '200': print('  fail', fn, r.stdout, r.stderr[:100]); continue
        try: extract(dst, os.path.join(base, 'files', os.path.splitext(fn)[0] if not fn.lower().endswith('.tar.gz') else fn[:-7]))
        except Exception as e: print('  extract err', fn, e)
        got.append(fn)
    d['downloaded'] = got
    json.dump(d, open(os.path.join(base, 'meta.json'), 'w'), indent=1)
    n = sum(len(f) for _, _, f in os.walk(os.path.join(base, 'files')))
    print(slug, '|', d['title'], '|', d['author'], '|', ','.join(d['licenses']), '|', n, 'files')

if __name__ == '__main__':
    for s in sys.argv[1:]:
        try: fetch(s)
        except Exception as e: print(s, 'ERR', e)
