#!/usr/bin/env python3
"""Verify every manifest entry: file exists, decodes (ffprobe), has audible content, duration matches, licence recorded and allowed.
Prints counts per category and total sizes. Exit code 1 on any failure."""
import sys, os, json, subprocess, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as A
ROOT = '/home/user/voxelwars/assets'
man = json.load(open(ROOT + '/manifest.json'))
OKLIC = {'CC0 1.0', 'CC BY 3.0', 'CC BY 4.0', 'Public Domain'}
bad = []
def chk(kind, e):
    p = os.path.join(ROOT, e['path'])
    if not os.path.exists(p): bad.append((e['id'], 'missing file')); return 0
    for k in ('author', 'title', 'source', 'license', 'licenseUrl'):
        if not e.get(k): bad.append((e['id'], 'missing ' + k))
    if e['license'] not in OKLIC: bad.append((e['id'], 'licence not allowed: ' + e['license']))
    if e['attributionRequired'] != e['license'].startswith('CC BY'): bad.append((e['id'], 'attributionRequired mismatch'))
    if kind in ('sfx', 'music'):
        d = A.probe_duration(p)
        if d <= 0.02: bad.append((e['id'], 'does not decode')); return os.path.getsize(p)
        if abs(d - e['duration']) > 0.06: bad.append((e['id'], 'duration mismatch %.3f vs %.3f' % (d, e['duration'])))
        mean, mx = A.volumedetect(p)
        if mean < -50 or mx < -20: bad.append((e['id'], 'too quiet mean %.1f max %.1f' % (mean, mx)))
        if kind == 'sfx' and mx > -1.0: bad.append((e['id'], 'peak too hot %.1f' % mx))
    else:
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p], capture_output=True, text=True)
        w, h = (r.stdout.strip().split(',') + ['0', '0'])[:2]
        if int(w) > 256 or int(h) > 256 or int(w) == 0: bad.append((e['id'], 'bad png size ' + r.stdout))
    return os.path.getsize(p)
tot = {}
for kind in ('sfx', 'music', 'vfx'):
    cnt = collections.Counter(); size = 0; core = 0
    for e in man[kind]:
        size += chk(kind, e); cnt[e.get('category') or e.get('mood') or 'vfx'] += 1; core += bool(e.get('core'))
        if not e['file'].endswith(('.mp3', '.png')): bad.append((e['id'], 'unexpected extension'))
    tot[kind] = size
    print(kind, len(man[kind]), 'files', size, 'bytes (%.2f MB)' % (size / 1e6), 'core', core, dict(cnt))
core_sfx = sum(os.path.getsize(os.path.join(ROOT, e['path'])) for e in man['sfx'] if e.get('core'))
core_mus = [e for e in man['music'] if e.get('core')]
print('core sfx bytes', core_sfx, 'core music', [(e['id'], os.path.getsize(os.path.join(ROOT, e['path']))) for e in core_mus])
print('BAD:', bad if bad else 'none')
sys.exit(1 if bad else 0)
