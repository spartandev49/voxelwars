#!/usr/bin/env python3
"""Analyze candidate music files -> TSV (relpath, dur, trimmed_dur, lufs, peak_db, bpm, conf, loop verdict + metrics)
usage: analyze_music.py out.tsv file1 [file2 ...]  (paths relative to assets/raw)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as A
from concurrent.futures import ThreadPoolExecutor
RAW = '/home/user/voxelwars/assets/raw'
def one(rel):
    p = os.path.join(RAW, rel)
    try:
        a = A.decode(p)
        d = len(a) / A.SR
        t, s0, e0 = A.trim_silence(a, -50, -55)
        bpm, conf = A.estimate_bpm(t)
        lc = A.loop_check(t, bpm if conf > 0.15 else None)
        ln = A.loudnorm_stats(p)
        return '\t'.join(map(str, [rel, round(d, 1), round(e0 - s0, 1), round(s0, 2), ln and ln['i'], round(A.peak_db(a), 1), bpm and round(bpm, 1), round(conf, 2), lc['loop'], lc.get('rms_end_vs_start_db'), lc.get('zc_ratio'), lc.get('seam_jump'), lc.get('tail_vs_body_db'), lc.get('beat_frac')]))
    except Exception as e:
        return rel + '\tERR ' + str(e)
files = [l.rstrip('\n') for l in open(sys.argv[2][1:])] if sys.argv[2].startswith('@') else sys.argv[2:]
with ThreadPoolExecutor(3) as ex: rows = list(ex.map(one, files))
open(sys.argv[1], 'w').write('rel\tdur\ttrim\tlead\tlufs\tpeak\tbpm\tconf\tloop\tdb\tzc\tjump\ttail\tbeatfrac\n' + '\n'.join(rows) + '\n')
