#!/usr/bin/env python3
"""Build music tracks from tools/music_spec.py -> assets/audio/music/<id>.mp3 (+ FLAC masters in assets/masters/music).
Chain: decode stereo 44.1k -> trim silence -> optional [t0,t1] cut + fades -> gain to -16 LUFS (peak guard -1 dBFS) -> FLAC master -> LAME joint-stereo CBR.
Then re-measures the shipped MP3 (LUFS, duration, loop seam metrics, bpm) into assets/_music_build.json.
usage: python3 -I tools/build_music.py [id ...]"""
import sys, os, json, math, subprocess, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as A
import numpy as np
import build_sfx as B
OUT = '/home/user/voxelwars/assets/audio/music'; MASTERS = '/home/user/voxelwars/assets/masters/music'
os.makedirs(OUT, exist_ok=True); os.makedirs(MASTERS, exist_ok=True)
TARGET_LUFS = -16.0

def trim_stereo(a, thr=-50.0):
    m = a.mean(axis=1)
    e, h = A.env_db(m, 0.01)
    ref = e.max()
    idx = np.where(e > ref + thr)[0]
    if len(idx) == 0: return a, 0.0, len(a) / A.SR
    s = idx[0] * h; en = min(len(a), (idx[-1] + 1) * h)
    return a[s:en], s / A.SR, en / A.SR

def fade_stereo(a, fin, fout):
    a = a.copy()
    ni, no = int(fin * A.SR), int(fout * A.SR)
    if ni > 0: a[:ni] *= np.linspace(0, 1, ni)[:, None]
    if no > 0: a[-no:] *= (np.linspace(1, 0, no) ** 1.3)[:, None]
    return a

def lufs_of(a):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, 'x.flac'); A.write_wav(p, np.clip(a, -1, 1)); r = A.loudnorm_stats(p)
    return r['i'] if r else None

def limit_peaks(a, ceil=0.891, knee=0.7):
    ab = np.abs(a); over = ab > knee
    y = a.copy()
    y[over] = np.sign(a[over]) * (knee + (ceil - knee) * np.tanh((ab[over] - knee) / (ceil - knee)))
    return y

def process(sp):
    f = B.resolve(sp['src']); srcfile = os.path.relpath(f, B.RAW)
    a = A.decode(f, mono=False)
    full = len(a) / A.SR
    a, lead, end = trim_stereo(a)
    if sp.get('t0') or sp.get('t1'):
        t0 = sp.get('t0', 0.0); t1 = sp.get('t1', len(a) / A.SR)
        a = a[int(t0 * A.SR):int(t1 * A.SR)]
        lead += t0
    pre_fade_mono = a.mean(axis=1).copy()          # loop test is run on the audio as trimmed, before any fade is applied
    if sp.get('nofade'): fin, fout = 0.0, 0.0
    else: fin, fout = sp.get('fade_in', 0.01), sp.get('fade_out', 0.05)
    a = fade_stereo(a, fin, fout)
    # loudness
    i0 = lufs_of(a); gain_db = TARGET_LUFS - i0
    for _ in range(3):
        y = a * (10 ** (gain_db / 20))
        pk = float(np.max(np.abs(y)))
        if pk > 0.891: y = limit_peaks(y)
        i1 = lufs_of(y)
        if abs(i1 - TARGET_LUFS) < 0.4: break
        gain_db += (TARGET_LUFS - i1)
    a = np.clip(y, -0.999, 0.999)
    mfile = os.path.join(MASTERS, sp['id'] + '.flac'); A.write_wav(mfile, a)
    mp3 = os.path.join(OUT, sp['id'] + '.mp3')
    kb = sp.get('kbps', 112)
    A.encode_mp3(mfile, mp3, kb, mono=sp.get('mono', False), joint=True)
    # verify shipped file
    dec = A.decode(mp3, mono=False); dm = dec.mean(axis=1)
    dur = A.probe_duration(mp3)
    st = A.loudnorm_stats(mp3)
    bpm_est, conf = A.estimate_bpm(dm)
    bpm = sp.get('bpm', bpm_est)
    chk = A.loop_check(pre_fade_mono, bpm if (sp.get('bpm') or conf > 0.15) else None)
    mean, mx = A.volumedetect(mp3)
    return dict(srcfile=srcfile, duration=round(dur, 2), size=os.path.getsize(mp3), kbps=kb, lufs=st['i'] if st else None, tp=st['tp'] if st else None,
                bpm=bpm, bpm_source='catalog' if sp.get('bpm') else 'estimated', loop_check=chk, trimmed_lead=round(lead, 2), source_duration=round(full, 2),
                mean_volume=mean, max_volume=mx)

if __name__ == '__main__':
    import importlib.util
    spm = importlib.util.spec_from_file_location('music_spec', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music_spec.py'))
    m = importlib.util.module_from_spec(spm); spm.loader.exec_module(m)
    want = set(sys.argv[1:]); res = {}
    mp = '/home/user/voxelwars/assets/_music_build.json'
    if os.path.exists(mp): res = json.load(open(mp))
    for sp in m.SPEC:
        if want and sp['id'] not in want: continue
        try:
            r = process(sp); res[sp['id']] = r
            print('%-14s %6.1fs %7dB %3dk LUFS=%s TP=%s bpm=%s loop=%s %s' % (sp['id'], r['duration'], r['size'], r['kbps'], r['lufs'], r['tp'], r['bpm'], r['loop_check']['loop'], r['loop_check']))
        except SystemExit as e: print('ERROR', sp['id'], e)
    json.dump(res, open(mp, 'w'), indent=1)
    tot = sum(v['size'] for v in res.values()); print('total music bytes', tot, '(%.2f MB)' % (tot / 1e6))
