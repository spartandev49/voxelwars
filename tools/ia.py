#!/usr/bin/env python3
"""archive.org helper.
  python3 -I tools/ia.py search '<lucene query>' [rows]   -> identifier | title | creator | licenseurl
  python3 -I tools/ia.py files <identifier>               -> audio files (name, size, length) + licenseurl
  python3 -I tools/ia.py get <identifier> <file name> <outdir>  -> download one file + meta.json
Only items whose licenseurl is CC0/publicdomain or CC-BY 3.0/4.0 may be used."""
import sys, json, os, urllib.request, urllib.parse, subprocess
UA = 'voxelwars-asset-hunter/1.0'
def jget(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=90))
def search(q, rows=40):
    u = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
        [('q', q), ('fl[]', 'identifier'), ('fl[]', 'title'), ('fl[]', 'creator'), ('fl[]', 'licenseurl'), ('rows', rows), ('output', 'json')])
    return jget(u)['response']
def meta(ident): return jget('https://archive.org/metadata/' + ident)
def ok_lic(u):
    u = (u or '').lower()
    return ('publicdomain/zero' in u) or ('publicdomain/mark' in u) or ('/licenses/by/3.0' in u) or ('/licenses/by/4.0' in u)
if __name__ == '__main__':
    c = sys.argv[1]
    if c == 'search':
        r = search(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 40)
        print('found', r['numFound'])
        for x in r['docs']:
            print(('OK ' if ok_lic(x.get('licenseurl')) else 'NO ') + x['identifier'], '|', str(x.get('title'))[:60], '|', str(x.get('creator'))[:30], '|', str(x.get('licenseurl'))[-34:])
    elif c == 'files':
        m = meta(sys.argv[2]); md = m['metadata']
        print('TITLE', md.get('title'), '| CREATOR', md.get('creator'), '| LIC', md.get('licenseurl'))
        for f in m['files']:
            if f['name'].lower().endswith(('.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aif', '.aiff')) and f.get('source') == 'original':
                print(f['name'], '|', f.get('size'), '|', f.get('length'))
    elif c == 'get':
        m = meta(sys.argv[2]); md = m['metadata']
        os.makedirs(sys.argv[4], exist_ok=True)
        fn = os.path.join(sys.argv[4], os.path.basename(sys.argv[3]))
        subprocess.run(['curl', '-sS', '-L', '-m', '600', '-A', UA, '-o', fn, 'https://archive.org/download/%s/%s' % (sys.argv[2], urllib.parse.quote(sys.argv[3]))], check=True)
        json.dump(dict(identifier=sys.argv[2], title=md.get('title'), creator=md.get('creator'), licenseurl=md.get('licenseurl'), file=sys.argv[3]), open(os.path.join(sys.argv[4], 'meta.json'), 'w'), indent=1)
        print(fn)
