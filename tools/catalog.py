#!/usr/bin/env python3
"""Catalog every audio file under assets/raw into a TSV: path<TAB>dur<TAB>channels<TAB>sr
usage: python3 -I tools/catalog.py out.tsv"""
import os, sys, subprocess, json
from concurrent.futures import ThreadPoolExecutor
RAW = '/home/user/voxelwars/assets/raw'
EXT = ('.wav', '.ogg', '.oga', '.mp3', '.flac', '.aif', '.aiff', '.m4a', '.opus')
files = []
for dp, dn, fn in os.walk(RAW):
    if os.path.basename(dp) == 'dl': dn[:] = []; continue
    for f in fn:
        if f.lower().endswith(EXT): files.append(os.path.join(dp, f))
def probe(p):
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=channels,sample_rate', '-of', 'json', p], capture_output=True, text=True, timeout=60)
        j = json.loads(r.stdout or '{}')
        st = (j.get('streams') or [{}])[0]
        return (os.path.relpath(p, RAW), float(j.get('format', {}).get('duration', 0) or 0), st.get('channels'), st.get('sample_rate'))
    except Exception as e:
        return (os.path.relpath(p, RAW), -1, None, None)
with ThreadPoolExecutor(4) as ex: res = list(ex.map(probe, sorted(files)))
with open(sys.argv[1], 'w') as o:
    for r in res: o.write('%s\t%.2f\t%s\t%s\n' % r)
print(len(res), 'files')
