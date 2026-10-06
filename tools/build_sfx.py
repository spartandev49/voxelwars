#!/usr/bin/env python3
"""Build all SFX from tools/sfx_spec.py -> assets/audio/sfx/<id>.mp3 (+ masters in assets/masters/sfx/<id>.flac) and
write assets/_sfx_manifest.json (consumed by tools/build_manifest.py).
usage: python3 -I tools/build_sfx.py [id ...]     (no ids = build everything)
Processing per sound: decode (mono 44.1k) -> optional slice/onset -> trim silence -> max-duration cut + fade -> peak-normalise to -3 dBFS
-> FLAC master -> LAME MP3 mono (default 80 kbps)."""
import sys, os, json, re, glob, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as A
import numpy as np
RAW = '/home/user/voxelwars/assets/raw'
OUT = '/home/user/voxelwars/assets/audio/sfx'
MASTERS = '/home/user/voxelwars/assets/masters/sfx'
AUDIO_EXT = ('.wav', '.flac', '.ogg', '.oga', '.mp3', '.aif', '.aiff', '.opus', '.m4a')
PREF = {'.wav': 0, '.flac': 1, '.oga': 2, '.ogg': 2, '.mp3': 3}
os.makedirs(OUT, exist_ok=True); os.makedirs(MASTERS, exist_ok=True)

_index = {}
def pack_files(pack):
    if pack in _index: return _index[pack]
    base = os.path.join(RAW, pack)
    fl = []
    for dp, dn, fn in os.walk(base):
        rel = os.path.relpath(dp, base)
        if rel.split(os.sep)[0] in ('dl', 'zip') or '__MACOSX' in dp: dn[:] = []; continue
        for f in fn:
            if f.startswith('._') or not f.lower().endswith(AUDIO_EXT): continue
            fl.append(os.path.join(dp, f))
    _index[pack] = fl
    return fl

def resolve(src):
    pack, _, pat = src.partition(':')
    fl = pack_files(pack)
    if not fl: raise SystemExit('no audio under ' + pack)
    if not pat:
        pass
    else:
        rx = re.compile(pat, re.I)
        fl = [f for f in fl if rx.search(os.path.relpath(f, os.path.join(RAW, pack)))]
    if not fl: raise SystemExit('no match for ' + src)
    # collapse duplicates that differ only by extension (and _0 suffix)
    groups = {}
    for f in fl:
        key = re.sub(r'(_0)?\.[a-z0-9]+$', '', f.lower())
        groups.setdefault(key, []).append(f)
    if len(groups) > 1:
        raise SystemExit('ambiguous %s -> %s' % (src, [os.path.basename(k) for k in groups][:8]))
    cand = sorted(list(groups.values())[0], key=lambda f: (PREF.get(os.path.splitext(f)[1].lower(), 9), len(f)))
    return cand[0]

def layer_mix(layers, sr=A.SR):
    out = np.zeros(1, dtype=np.float32)
    for (a, off, g) in layers:
        s = int(off * sr); a = a * (10 ** (g / 20))
        if len(out) < s + len(a): out = np.pad(out, (0, s + len(a) - len(out)))
        out[s:s + len(a)] += a
    return out

def process(spec):
    o = dict(max=1.6, kbps=80, start_db=-42, end_db=-46, fout=0.05, gain=0.0)
    o.update(spec.get('opts', {}))
    src = spec['src']
    if 'layers' in o:                       # composite: list of (src, offset, gain_db, opts)
        parts = []
        for (s, off, g, po) in o['layers']:
            f = resolve(s)
            a = A.decode(f, t0=po.get('t0', 0), dur=po.get('dur'), hp=po.get('hp'))
            if po.get('seg') is not None:
                sg = A.segments(a, thresh_db=po.get('thr', -38)); t0, t1 = sg[po['seg']]; a = a[int(t0 * A.SR):int(t1 * A.SR)]
            a, _, _ = A.trim_silence(a, o['start_db'], o['end_db'])
            if 'lp' in po: a = lowpass(a, po['lp'])
            if po.get('norm', True): a = a / (np.max(np.abs(a)) + 1e-9)
            parts.append((a, off, g))
        a = layer_mix(parts)
        srcfile = ' + '.join(os.path.relpath(resolve(s), RAW) for (s, _, _, _) in o['layers'])
    else:
        f = resolve(src); srcfile = os.path.relpath(f, RAW)
        a = A.decode(f, t0=o.get('t0', 0), dur=o.get('read'), hp=o.get('hp', 25))
        if o.get('seg') is not None:
            sg = A.segments(a, thresh_db=o.get('thr', -38), min_gap=o.get('gap', 0.12))
            if o['seg'] >= len(sg): raise SystemExit('%s: only %d segments' % (spec['id'], len(sg)))
            t0, t1 = sg[o['seg']]; a = a[int(t0 * A.SR):int(t1 * A.SR)]
        if o.get('on') is not None:         # slice starting at an onset
            ons = A.onsets(a, rise_db=o.get('rise', 9.0), refractory=o.get('refr', 0.15))
            mode = o['on']
            if isinstance(mode, int): t = ons[mode][0]
            elif mode == 'strongest': t = max(ons, key=lambda x: x[1])[0]
            elif mode == 'iso':
                need = o.get('isodur', 0.9); t = None
                for i, (ti, _) in enumerate(ons):
                    nxt = ons[i + 1][0] if i + 1 < len(ons) else 1e9
                    if nxt - ti >= need: t = ti; break
                if t is None: raise SystemExit('%s: no isolated onset' % spec['id'])
            a = a[max(0, int((t - 0.004) * A.SR)):]
    # processing chain
    if 'lp' in o: a = lowpass(a, o['lp'])
    a, _, _ = A.trim_silence(a, o['start_db'], o['end_db'])
    mx = int(o['max'] * A.SR)
    cut = len(a) > mx
    if cut: a = a[:mx]
    a = A.fade(a, 0.002, o['fout'] if not cut else max(o['fout'], 0.12))
    pk = float(np.max(np.abs(a)) + 1e-9)
    a = a * (10 ** (-3.0 / 20) / pk) * (10 ** (o['gain'] / 20))
    a = np.clip(a, -0.999, 0.999)
    mfile = os.path.join(MASTERS, spec['id'] + '.flac')
    A.write_wav(mfile, a)
    mp3 = os.path.join(OUT, spec['id'] + '.mp3')
    A.encode_mp3(mfile, mp3, o['kbps'], mono=True)
    d = A.descriptors(a)
    return dict(srcfile=srcfile, duration=round(A.probe_duration(mp3), 3), size=os.path.getsize(mp3), desc=d, cut=cut)

def lowpass(a, hz):
    n = len(a); sp = np.fft.rfft(a); fr = np.fft.rfftfreq(n, 1 / A.SR)
    sp[fr > hz] *= 0
    return np.fft.irfft(sp, n).astype(np.float32)

if __name__ == '__main__':
    import importlib.util
    spec_mod = importlib.util.spec_from_file_location('sfx_spec', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sfx_spec.py'))
    m = importlib.util.module_from_spec(spec_mod); spec_mod.loader.exec_module(m)
    want = set(sys.argv[1:])
    res = {}
    mp = '/home/user/voxelwars/assets/_sfx_build.json'
    if os.path.exists(mp): res = json.load(open(mp))
    errs = 0
    for s in m.SPEC:
        if want and s['id'] not in want: continue
        try:
            r = process(s); res[s['id']] = r
            d = r['desc']
            print('%-26s %5.2fs %6dB  cen=%-5s low=%-4s crest=%-5s %s%s' % (s['id'], r['duration'], r['size'], d.get('centroid'), d.get('low'), d.get('crest'), os.path.basename(r['srcfile'])[:34], ' CUT' if r['cut'] else ''))
        except SystemExit as e:
            errs += 1; print('ERROR', s['id'], e)
        except Exception as e:
            errs += 1; print('EXC', s['id'], repr(e))
    json.dump(res, open(mp, 'w'), indent=1)
    print('built', len(res), 'errors', errs)
