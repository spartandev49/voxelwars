#!/usr/bin/env python3
"""Shared audio helpers (ffmpeg + numpy). Never executes downloaded files; only decodes them with ffmpeg."""
import os, sys, subprocess, json, re, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'pylib'))
import numpy as np

SR = 44100

def decode(path, sr=SR, mono=True, t0=0.0, dur=None, hp=None):
    """Decode any audio file to float32 numpy array (n,) mono or (n,2) stereo."""
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if t0: cmd += ['-ss', str(t0)]
    cmd += ['-i', path]
    if dur: cmd += ['-t', str(dur)]
    af = []
    if hp: af.append('highpass=f=%s' % hp)
    if af: cmd += ['-af', ','.join(af)]
    cmd += ['-ac', '1' if mono else '2', '-ar', str(sr), '-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True)
    a = np.frombuffer(r.stdout, dtype=np.float32)
    if not mono: a = a.reshape(-1, 2)
    return a.copy()

def write_wav(path, a, sr=SR):
    """Write float32 array as 16-bit PCM wav via ffmpeg (flac/other by extension)."""
    ch = 1 if a.ndim == 1 else a.shape[1]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-nostdin', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-']
    if path.endswith('.flac'): cmd += ['-c:a', 'flac', '-sample_fmt', 's16']
    cmd.append(path)
    subprocess.run(cmd, input=np.ascontiguousarray(a, dtype=np.float32).tobytes(), check=True)

def encode_mp3(src, dst, kbps, mono=True, joint=True):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-nostdin', '-i', src, '-c:a', 'libmp3lame', '-b:a', '%dk' % kbps,
           '-ac', '1' if mono else '2', '-ar', str(SR)]
    if not mono and joint: cmd += ['-joint_stereo', '1']
    cmd += ['-write_xing', '1', '-id3v2_version', '0', '-map_metadata', '-1', dst]
    subprocess.run(cmd, check=True)

def probe_duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except Exception: return 0.0

def env_db(a, win=0.005, sr=SR):
    """RMS envelope in dBFS with non-overlapping windows. Returns (env_db, hop_samples)."""
    h = max(1, int(win * sr)); n = len(a) // h
    if n == 0: return np.array([-120.0]), h
    x = a[:n * h]
    if x.ndim == 2: x = x.mean(axis=1)
    rms = np.sqrt((x.reshape(n, h) ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9), h

def peak_db(a): return 20 * math.log10(float(np.max(np.abs(a))) + 1e-9)

def trim_silence(a, start_db=-45.0, end_db=-48.0, win=0.005, sr=SR, rel_to_peak=True):
    """Trim leading/trailing silence relative to the file's own peak (or absolute if rel_to_peak False)."""
    e, h = env_db(a, win, sr)
    ref = e.max() if rel_to_peak else 0.0
    s_idx = np.argmax(e > ref + start_db) if np.any(e > ref + start_db) else 0
    nz = np.where(e > ref + end_db)[0]
    e_idx = (nz[-1] + 1) if len(nz) else len(e)
    s = max(0, int(s_idx * h) - int(0.002 * sr)); en = min(len(a), int(e_idx * h) + int(0.004 * sr))
    return a[s:en], s / sr, en / sr

def fade(a, fin=0.002, fout=0.03, sr=SR):
    a = a.copy()
    n_in = int(fin * sr); n_out = int(fout * sr)
    if n_in > 0 and len(a) > n_in: a[:n_in] *= np.linspace(0, 1, n_in) if a.ndim == 1 else np.linspace(0, 1, n_in)[:, None]
    if n_out > 0 and len(a) > n_out:
        ramp = np.linspace(1, 0, n_out) ** 1.5
        a[-n_out:] *= ramp if a.ndim == 1 else ramp[:, None]
    return a

def loudnorm_stats(path, i=-16.0, tp=-1.5):
    """Integrated LUFS etc. via ffmpeg loudnorm (analysis only)."""
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', path, '-af', 'loudnorm=I=%s:TP=%s:LRA=11:print_format=json' % (i, tp), '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr, re.S)
    if not m: return None
    j = json.loads(m.group(0))
    return dict(i=float(j['input_i']), tp=float(j['input_tp']), lra=float(j['input_lra']), thresh=float(j['input_thresh']))

def volumedetect(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
    mean = re.search(r'mean_volume: (-?[\d.inf]+) dB', r.stderr); mx = re.search(r'max_volume: (-?[\d.inf]+) dB', r.stderr)
    f = lambda m: float(m.group(1)) if m and 'inf' not in m.group(1) else -99.0
    return f(mean), f(mx)

def estimate_bpm(a, sr=SR, lo=75, hi=185):
    """Onset-envelope autocorrelation tempo estimate. a: mono float32. Returns (bpm, confidence)."""
    # downsample to ~11 kHz by decimation
    d = 4; x = a[:len(a) // d * d].reshape(-1, d).mean(axis=1); sr2 = sr / d
    n = 1024; hop = 256
    if len(x) < n * 8: return None, 0.0
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop]
    spec = np.abs(np.fft.rfft(frames * win, axis=1))
    spec = np.log1p(spec * 20)
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    flux = flux - np.convolve(flux, np.ones(21) / 21, mode='same')
    flux = np.maximum(flux, 0)
    if flux.std() < 1e-6: return None, 0.0
    f = flux - flux.mean()
    ac = np.correlate(f, f, mode='full')[len(f) - 1:]
    ac /= (ac[0] + 1e-9)
    fps = sr2 / hop
    best, bscore = None, -1
    scores = {}
    for bpm in np.arange(lo, hi + 0.5, 0.5):
        lag = fps * 60.0 / bpm
        l0 = int(round(lag))
        if l0 + 1 >= len(ac): continue
        # sum of ac at multiples (1x, 2x, 4x) to favour true beat period
        s = 0
        for k, w in ((1, 1.0), (2, 0.6), (4, 0.3)):
            li = int(round(lag * k))
            if li < len(ac): s += w * ac[li]
        prior = math.exp(-0.5 * ((math.log2(bpm / 110.0)) / 0.8) ** 2)
        scores[bpm] = s * (0.6 + 0.4 * prior)
    if not scores: return None, 0.0
    bpm = max(scores, key=scores.get)
    vals = np.array(list(scores.values()))
    conf = float((scores[bpm] - np.median(vals)) / (np.max(np.abs(vals)) + 1e-9))
    return float(bpm), conf

def loop_check(a, bpm=None, sr=SR):
    """Heuristic seamlessness test across the wrap (end -> start). Returns dict with metrics and 'loop' verdict."""
    n250 = int(0.25 * sr); n20 = int(0.02 * sr)
    if len(a) < n250 * 4: return dict(loop=False, why='too short')
    head, tail = a[:n250], a[-n250:]
    rms = lambda x: float(np.sqrt(np.mean(x ** 2) + 1e-12))
    rh, rt = rms(head), rms(tail)
    db = 20 * math.log10(rt / rh)
    body = rms(a)
    zc = lambda x: float(np.mean(np.abs(np.diff(np.signbit(x).astype(np.int8)))))
    zh, zt = zc(a[:n250 // 2]), zc(a[-n250 // 2:])
    zr = (zt + 1e-6) / (zh + 1e-6)
    # seam jump: last sample vs first sample relative to local rms
    jump = abs(float(a[-1]) - float(a[0])) / (rms(np.concatenate([a[-n20:], a[:n20]])) + 1e-9)
    tail_ratio_db = 20 * math.log10(rt / (body + 1e-9))   # tail loudness vs body (fade-out => very negative)
    beats = None
    if bpm: beats = (len(a) / sr) * bpm / 60.0
    beat_frac = abs(beats - round(beats)) if beats else None
    ok = (abs(db) < 3.5 and 0.6 < zr < 1.7 and jump < 2.0 and tail_ratio_db > -9)
    # a clean loop must additionally be beat-aligned when tempo is known with confidence
    if beat_frac is not None and beat_frac > 0.2: ok = ok and False
    return dict(loop=bool(ok), rms_end_vs_start_db=round(db, 2), zc_ratio=round(zr, 2), seam_jump=round(jump, 2),
                tail_vs_body_db=round(tail_ratio_db, 1), beat_frac=None if beat_frac is None else round(beat_frac, 3))

def descriptors(a, sr=SR):
    """Quick content descriptors for sanity checks: duration, peak dB, rms dB, crest, spectral centroid (Hz), low-band share, flatness."""
    if len(a) < 256: return dict(dur=len(a) / sr)
    x = a if a.ndim == 1 else a.mean(axis=1)
    n = 1 << int(math.floor(math.log2(min(len(x), 65536))))
    seg = x[:n] * np.hanning(n)
    sp = np.abs(np.fft.rfft(seg)) ** 2 + 1e-12
    fr = np.fft.rfftfreq(n, 1 / sr)
    cen = float((sp * fr).sum() / sp.sum())
    low = float(sp[fr < 250].sum() / sp.sum())
    flat = float(np.exp(np.mean(np.log(sp[fr > 100]))) / np.mean(sp[fr > 100]))
    rms = float(np.sqrt(np.mean(x ** 2) + 1e-12)); pk = float(np.max(np.abs(x)) + 1e-9)
    return dict(dur=round(len(x) / sr, 2), peak_db=round(20 * math.log10(pk), 1), rms_db=round(20 * math.log10(rms), 1),
                crest=round(pk / rms, 1), centroid=round(cen), low=round(low, 2), flat=round(flat, 3))

def segments(a, sr=SR, thresh_db=-38.0, min_gap=0.12, min_len=0.08, win=0.01):
    """Split a long recording into sound events separated by silence (relative to peak). Returns [(t0,t1)] seconds."""
    e, h = env_db(a, win, sr)
    thr = e.max() + thresh_db
    on = e > thr
    segs = []; i = 0; n = len(on); gap = int(min_gap / win)
    while i < n:
        if on[i]:
            j = i; last = i
            while j < n and (on[j] or j - last <= gap):
                if on[j]: last = j
                j += 1
            segs.append((max(0, i - 2) * h / sr, (last + 3) * h / sr))
            i = j
        else: i += 1
    return [(s, t) for s, t in segs if t - s >= min_len]

def onsets(a, sr=SR, rise_db=9.0, refractory=0.2, floor_db=-30.0, win=0.003):
    """Detect sharp attacks. Returns list of (time_s, strength_db_peak_after) chronological."""
    e, h = env_db(a, win, sr)
    mx = e.max(); out = []; last = -1e9
    k = int(0.02 / win)
    for i in range(k, len(e) - k):
        if e[i] < mx + floor_db: continue
        before = e[max(0, i - k):i].mean()
        if e[i] - before >= rise_db and e[i] >= e[i:i + k].max() - 3 and (i - last) * win >= refractory:
            pk = float(np.max(np.abs(a[i * h:(i + int(0.1 * sr)) * 1 if False else i * h + int(0.1 * sr)]))) if i * h < len(a) else 0.0
            out.append((i * win, 20 * math.log10(pk + 1e-9))); last = i
    return out
