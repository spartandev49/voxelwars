#!/usr/bin/env python3
"""OpenGameArt helper (metadata only; downloads are done with curl by fetch scripts).
  python3 -I tools/oga.py search <keys> <sfx|music> [pages]   -> slug | title | licenses
  python3 -I tools/oga.py info <slug> [<slug>...]             -> author, license(s), files, description
"""
import sys, re, html, urllib.request, urllib.parse, os, hashlib, json
CACHE = os.environ.get('OGA_CACHE', '/tmp/oga_cache')
os.makedirs(CACHE, exist_ok=True)
TYPES = {'sfx': 13, 'music': 12}
UA = 'Mozilla/5.0 (voxelwars-asset-hunter)'

def get(url):
    p = os.path.join(CACHE, hashlib.md5(url.encode()).hexdigest())
    if os.path.exists(p):
        return open(p, encoding='utf-8', errors='replace').read()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    h = urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')
    open(p, 'w', encoding='utf-8').write(h)
    return h

def strip(s):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s))).strip()

def licenses(h):
    i = h.find('field-name-field-art-licenses')
    if i < 0: return []
    seg = h[i:i + 2500]
    return re.findall(r"class='license-name'>([^<]+)<", seg)

def info(slug):
    url = 'https://opengameart.org/content/' + slug
    h = get(url)
    t = re.search(r'<title>(.*?) \| OpenGameArt', h, re.S)
    title = html.unescape(t.group(1)).strip() if t else slug
    a = re.search(r"class='username'><a[^>]*>(.*?)</a>", h, re.S)
    author = strip(a.group(1)) if a else '?'
    lic = licenses(h)
    files = [f for f in re.findall(r'href="(https://opengameart.org/sites/default/files/[^"]+)"', h)
             if not f.endswith('.css') and '/license_images/' not in f and '/styles/' not in f and '/css/' not in f and '/js/' not in f]
    files = list(dict.fromkeys(files))
    d = re.search(r'field-name-body.*?<div class="field-item even"[^>]*>(.*?)</div></div></div>', h, re.S)
    desc = strip(d.group(1))[:700] if d else ''
    tags = re.findall(r'field_art_tags_tid=[^"]*"[^>]*>([^<]+)<', h)
    return dict(slug=slug, url=url, title=title, author=author, licenses=lic, files=files, desc=desc, tags=tags[:12])

def search(keys, typ, pages=1):
    out = []
    for pg in range(pages):
        u = 'https://opengameart.org/art-search-advanced?keys=%s&field_art_type_tid%%5B%%5D=%d&sort_by=count&sort_order=DESC&page=%d' % (urllib.parse.quote(keys), TYPES[typ], pg)
        h = get(u)
        for m in re.finditer(r'<h2[^>]*class="[^"]*art-preview-title[^"]*"[^>]*><a href="/content/([^"]+)"[^>]*>(.*?)</a>', h, re.S):
            out.append((m.group(1), strip(m.group(2))))
        if not out and pg == 0:
            for m in re.finditer(r'href="/content/([^"]+)"[^>]*>([^<]+)</a>', h):
                out.append((m.group(1), strip(m.group(2))))
    seen = set(); res = []
    for s, t in out:
        if s in seen: continue
        seen.add(s); res.append((s, t))
    return res

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'search':
        pages = int(sys.argv[4]) if len(sys.argv) > 4 else 1
        for s, t in search(sys.argv[2], sys.argv[3], pages):
            print(s, '|', t)
    elif cmd == 'info':
        for s in sys.argv[2:]:
            d = info(s)
            print('##', d['slug'], '|', d['title'], '| by', d['author'], '|', ','.join(d['licenses']))
            print('   files:', ' '.join(os.path.basename(f) for f in d['files'])[:400])
            print('   tags:', ','.join(d['tags']), '|', d['desc'][:300])
