#!/usr/bin/env python3
"""Wikimedia Commons helper (audio search + licence metadata).
  python3 -I tools/commons.py search "<query>" [limit]      -> title | licence | artist | secs | url
  python3 -I tools/commons.py get "File:Foo.ogg" <outdir>    -> downloads (curl) + writes meta json
Accepted licences: CC0, Public domain / PD*, CC BY 3.0 / 4.0 (anything else is flagged REJECT).
"""
import sys, os, json, re, html, urllib.request, urllib.parse, subprocess
API = 'https://commons.wikimedia.org/w/api.php'
UA = 'voxelwars-asset-hunter/1.0 (game dev; contact via repo)'

import time, hashlib
CACHE = os.environ.get('COMMONS_CACHE', '/tmp/commons_cache')
os.makedirs(CACHE, exist_ok=True)

def api(**p):
    """Cached, throttled, 429-aware API call."""
    p['format'] = 'json'
    url = API + '?' + urllib.parse.urlencode(p)
    cp = os.path.join(CACHE, hashlib.md5(url.encode()).hexdigest())
    if os.path.exists(cp):
        return json.load(open(cp))
    for attempt in range(8):
        time.sleep(1.5)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            d = json.load(urllib.request.urlopen(req, timeout=60))
            json.dump(d, open(cp, 'w'))
            return d
        except urllib.error.HTTPError as e:
            if e.code == 429:
                w = int(e.headers.get('Retry-After', '10') or 10)
                time.sleep(min(60, max(w, 8 * (attempt + 1))))
                continue
            raise
    raise RuntimeError('rate limited')

def strip(s):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s or ''))).strip()

def ok_license(name):
    n = (name or '').lower()
    if n.startswith('cc0') or n.startswith('public domain') or n.startswith('pd') or 'cc0' in n: return True
    return n in ('cc by 3.0', 'cc by 4.0') or re.fullmatch(r'cc[ -]by[ -](3|4)\.0( [a-z]+)?', n) is not None and 'sa' not in n

def search(q, limit=20):
    r = api(action='query', list='search', srsearch=q + ' filetype:audio', srnamespace=6, srlimit=limit)
    return [x['title'] for x in r['query']['search']]

def search_info(q, limit=20):
    """generator=search + imageinfo in ONE request."""
    r = api(action='query', generator='search', gsrsearch=q + ' filetype:audio', gsrnamespace=6, gsrlimit=limit,
            prop='imageinfo', iiprop='url|size|mime|extmetadata|metadata')
    return _parse(r)

def info(titles):
    out = []
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        r = api(action='query', titles='|'.join(chunk), prop='imageinfo', iiprop='url|size|mime|extmetadata|metadata')
        out += _parse(r)
    return out

def _parse(r):
    out = []
    if True:
        for pg in sorted(r.get('query', {}).get('pages', {}).values(), key=lambda x: x.get('index', 0)):
            ii = (pg.get('imageinfo') or [{}])[0]
            em = ii.get('extmetadata', {})
            g = lambda k: strip(em.get(k, {}).get('value', ''))
            dur = None
            for m in ii.get('metadata') or []:
                if m.get('name') in ('playtime_seconds', 'length', 'duration'):
                    try: dur = float(m['value'])
                    except Exception: pass
            out.append(dict(title=pg['title'], url=ii.get('url'), size=ii.get('size'), mime=ii.get('mime'),
                            license=g('LicenseShortName'), licenseUrl=em.get('LicenseUrl', {}).get('value', ''),
                            artist=g('Artist'), credit=g('Credit'), desc=g('ImageDescription')[:300],
                            page=ii.get('descriptionurl'), dur=dur, ok=ok_license(g('LicenseShortName'))))
    return out

def main():
    cmd = sys.argv[1]
    if cmd == 'search':
        lim = int(sys.argv[3]) if len(sys.argv) > 3 else 20
        for d in search_info(sys.argv[2], lim):
            print(('OK ' if d['ok'] else 'REJECT '), d['title'], '|', d['license'], '|', d['artist'][:40], '|', d['dur'], '|', d['size'])
    elif cmd == 'get':
        d = info([sys.argv[2]])[0]
        os.makedirs(sys.argv[3], exist_ok=True)
        fn = os.path.join(sys.argv[3], os.path.basename(urllib.parse.unquote(d['url'])))
        subprocess.run(['curl', '-sS', '-L', '-m', '300', '-A', UA, '-o', fn, d['url']], check=True)
        json.dump(d, open(os.path.join(sys.argv[3], 'meta.json'), 'w'), indent=1)
        print(fn, d['license'], d['artist'])

def cat_members(cat, limit=100):
    r = api(action='query', generator='categorymembers', gcmtitle=cat, gcmtype='file', gcmlimit=limit,
            prop='imageinfo', iiprop='url|size|mime|extmetadata|metadata')
    return _parse(r)

def find_cats(q, limit=30):
    r = api(action='query', list='search', srsearch=q, srnamespace=14, srlimit=limit)
    return [x['title'] for x in r['query']['search']]

def main2():
    cmd = sys.argv[1]
    if cmd == 'cats':
        for c in find_cats(sys.argv[2]): print(c)
    elif cmd == 'cat':
        for d in cat_members(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 100):
            print(('OK ' if d['ok'] else 'REJECT '), d['title'], '|', d['license'], '|', d['artist'][:40], '|', d['dur'], '|', d['size'])
    else:
        main()

if __name__ == '__main__':
    main2()
