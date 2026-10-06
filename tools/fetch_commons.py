#!/usr/bin/env python3
"""Download Wikimedia Commons audio files (licence-checked) into assets/raw/commons-<slug>/ with meta.json.
usage: python3 -I tools/fetch_commons.py "File:Foo.ogg" ...   (title as shown on Commons; 'File:' optional)
Only CC0 / Public domain / CC BY 3.0 / CC BY 4.0 are downloaded."""
import sys, os, re, json, subprocess, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commons
RAW = '/home/user/voxelwars/assets/raw'
def slug(t): return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')[:70]
titles = [t if t.startswith("File:") else "File:" + t for t in (sys.argv[1:] if sys.argv[1:] and not sys.argv[1].startswith("@") else [l.strip() for l in open(sys.argv[1][1:]) if l.strip()])]
infos = {d['title']: d for d in commons.info(titles)}
for t in titles:
    d = infos.get(t.replace('_', ' '))
    if not d or not d.get('url'): print('NOT FOUND', t); continue
    if not d['ok']: print('REJECT licence', t, d['license']); continue
    base = os.path.join(RAW, 'commons-' + slug(os.path.splitext(t[5:])[0]))
    if os.path.exists(base): print('exists', t); continue
    os.makedirs(base)
    fn = os.path.join(base, os.path.basename(urllib.parse.unquote(d['url'])))
    import time
    d['http'] = '0'
    for attempt in range(8):
        hdr = os.path.join(base, '_hdr.txt')
        r = subprocess.run(['curl', '-sS', '-L', '-m', '300', '-A', commons.UA, '-D', hdr, '-o', fn, '-w', '%{http_code}', d['url']], capture_output=True, text=True)
        d['http'] = r.stdout.strip()
        if d['http'] == '200': break
        wait = 60
        try:
            m = re.findall(r'(?im)^retry-after:\s*(\d+)', open(hdr).read())
            if m: wait = int(m[-1]) + 5
        except Exception: pass
        print('  HTTP', d['http'], 'for', t, '- sleeping', wait, 's', flush=True)
        time.sleep(min(wait, 900))
    if os.path.exists(os.path.join(base, '_hdr.txt')): os.remove(os.path.join(base, '_hdr.txt'))
    if d['http'] != '200':
        print('FAILED', t, d['http'], flush=True); import shutil; shutil.rmtree(base); continue
    time.sleep(12)   # be polite: ~5 requests/minute
    json.dump(d, open(os.path.join(base, 'meta.json'), 'w'), indent=1)
    print(t, '|', d['license'], '|', d['artist'][:30], '|', d['http'], os.path.getsize(fn), flush=True)
