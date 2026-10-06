#!/usr/bin/env python3
"""Download Kevin MacLeod (incompetech.com, CC BY 4.0) tracks by exact title.
usage: python3 -I tools/fetch_incompetech.py "Heroic Age" "Tabuk" ...
Each track goes into assets/raw/incompetech-<slug>/ with meta.json (title, bpm, feel, isrc, source url, licence)."""
import sys, os, json, re, urllib.parse, urllib.request, subprocess
RAW = '/home/user/voxelwars/assets/raw'
BASE = 'https://incompetech.com/music/royalty-free/'
CAT = os.environ.get('INC_CATALOG') or os.path.join(RAW, '_incompetech_pieces.json')
if not os.path.exists(CAT):
    subprocess.run(['curl', '-sS', '-L', '-m', '90', '-o', CAT, BASE + 'pieces.json'], check=True)
pieces = json.load(open(CAT))
GEN = {x['id']: x['genre'] for x in json.load(urllib.request.urlopen(BASE + 'genre.json'))}
def slug(t): return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
for want in sys.argv[1:]:
    m = [p for p in pieces if p['title'].lower() == want.lower()]
    if not m: print('NOT FOUND', want); continue
    p = m[0]; d = os.path.join(RAW, 'incompetech-' + slug(p['title']))
    if os.path.exists(d): print('exists', want); continue
    os.makedirs(d)
    url = BASE + 'mp3-royaltyfree/' + urllib.parse.quote(p['filename'])
    dst = os.path.join(d, p['filename'])
    r = subprocess.run(['curl', '-sS', '-L', '-m', '600', '-o', dst, '-w', '%{http_code}', url], capture_output=True, text=True)
    meta = dict(title=p['title'], author='Kevin MacLeod', length=p['length'], bpm=p['bpm'], feel=p['feel'], description=p['description'],
                instruments=p['instruments'], genre=GEN.get(int(p['genre'])) if p['genre'] else None, isrc=p['isrc'],
                source='https://incompetech.com/music/royalty-free/index.html?isrc=' + str(p['isrc']), file=p['filename'],
                license='CC BY 4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/', http=r.stdout.strip())
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), indent=1)
    print(want, r.stdout.strip(), os.path.getsize(dst))
