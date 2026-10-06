#!/usr/bin/env python3
"""Write assets/manifest.json and assets/CREDITS.md from the build reports + source metadata.
Run after: build_sfx.py, build_music.py, build_vfx.py.   usage: python3 -I tools/build_manifest.py"""
import sys, os, json, re, collections, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import credits_lib as C
import build_sfx as B
ROOT = '/home/user/voxelwars/assets'
def load(path, name):
    sp = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); return m
sfx_spec = load(os.path.join(HERE, 'sfx_spec.py'), 'sfx_spec'); music_spec = load(os.path.join(HERE, 'music_spec.py'), 'music_spec')
sfx_build = json.load(open(ROOT + '/_sfx_build.json')); music_build = json.load(open(ROOT + '/_music_build.json')); vfx_build = json.load(open(ROOT + '/_vfx_build.json'))

def rawdirs_of(spec):
    o = spec.get('opts', {})
    if spec['src'].startswith('synth:'): return ['synth']
    if 'layers' in o: return [l[0].split(':')[0] for l in o['layers']]
    return [spec['src'].split(':')[0]]

def merge_attrib(dirs):
    infos = [C.attrib(d) for d in dirs]
    seen = []; [seen.append(i) for i in infos if i not in seen]
    if len(seen) == 1: i = seen[0]; return i, [i]
    # composite: licence is the most restrictive (CC-BY wins over CC0); author/title joined
    req = [i for i in seen if i['attributionRequired']]
    lead = req[0] if req else seen[0]
    d = dict(lead); d['author'] = ' + '.join(dict.fromkeys(i['author'] for i in seen)); d['title'] = ' + '.join(dict.fromkeys(i['title'] for i in seen))
    d['source'] = ' ; '.join(dict.fromkeys(i['source'] for i in seen)); d['attributionRequired'] = bool(req)
    return d, seen

sfx, music, vfx = [], [], []
credit_items = {}      # (author,title,source,licenseKey) -> dict(count, kind, ids)
def note_credit(i, kind, ident):
    k = (i['author'], i['title'], i['source'], i['licenseKey'])
    e = credit_items.setdefault(k, dict(info=i, kind=set(), ids=[]))
    e['kind'].add(kind); e['ids'].append(ident)

missing = []
for s in sfx_spec.SPEC:
    b = sfx_build.get(s['id'])
    if not b or not os.path.exists(os.path.join(ROOT, 'audio/sfx', s['id'] + '.mp3')): missing.append(s['id']); continue
    a, parts = merge_attrib(rawdirs_of(s))
    for p in parts: note_credit(p, 'sfx', s['id'])
    note = '; '.join(x for x in [s.get('notes') or '', 'source file: ' + b['srcfile'], 'trimmed, loudness-lifted, peak-normalised to -3 dBFS, mono MP3'] if x)
    e = dict(id=s['id'], file=s['id'] + '.mp3', path='audio/sfx/%s.mp3' % s['id'], category=s['cat'], tags=s['tags'], duration=round(b['duration'], 2),
             author=a['author'], title=a['title'], source=a['source'], license=a['license'], licenseUrl=a['licenseUrl'], attributionRequired=a['attributionRequired'], notes=note)
    if s.get('core'): e['core'] = True
    sfx.append(e)

for s in music_spec.SPEC:
    b = music_build.get(s['id'])
    if not b: missing.append(s['id']); continue
    rawdir = s['src'].split(':')[0]; a = C.attrib(rawdir); note_credit(a, 'music', s['id'])
    lc = b['loop_check']
    e = dict(id=s['id'], file=s['id'] + '.mp3', path='audio/music/%s.mp3' % s['id'], mood=s['mood'], tags=s.get('tags', []), duration=b['duration'],
             loop=bool(s.get('loop_override', lc['loop'])), loopStart=0.0, loopEnd=b['duration'], bpm=b['bpm'], bpmSource=b['bpm_source'],
             integratedLoudness=b['lufs'], truePeak=b['tp'], kbps=b['kbps'], author=a['author'], title=a['title'], source=a['source'], license=a['license'], licenseUrl=a['licenseUrl'],
             attributionRequired=a['attributionRequired'],
             notes='source file: %s; leading silence trimmed %.2fs; %s; loop seam metrics (end-vs-start RMS dB %s, zero-crossing ratio %s, seam jump %s, beat fraction %s)' % (
                 b['srcfile'], b['trimmed_lead'], s.get('notes', 'normalised to -16 LUFS'), lc.get('rms_end_vs_start_db'), lc.get('zc_ratio'), lc.get('seam_jump'), lc.get('beat_frac')))
    e['fade_out'] = 0 if s.get('nofade') else s.get('fade_out', 0.05)
    e['loop_check'] = lc
    if s.get('core'): e['core'] = True
    if not e['loop']: e['notes'] += '; not seamless -> cross-fade 2-3 s when looping'; e['crossfadeSeconds'] = 2.5
    music.append(e)

ken = C.attrib('kenney-particle-pack'); note_credit(ken, 'vfx', 'particles')
for vid, v in vfx_build.items():
    vfx.append(dict(id=vid, file=vid + '.png', path='vfx/%s.png' % vid, tags=v['tags'], width=v['width'], height=v['height'], size=v['size'], author=ken['author'], title=ken['title'],
                    source=ken['source'], license=ken['license'], licenseUrl=ken['licenseUrl'], attributionRequired=False, notes='downscaled from 512px, alpha PNG'))

by_cat = collections.OrderedDict()
for e in sfx: by_cat.setdefault(e['category'], []).append(e['id'])
by_mood = collections.OrderedDict()
for e in music: by_mood.setdefault(e['mood'], []).append(e['id'])
man = dict(version=1, generated='by tools/build_manifest.py', credits='CREDITS.md',
           format=dict(sfx='mp3 mono 44.1 kHz (64-80 kbps)', music='mp3 stereo joint (80-112 kbps), loudness ~-16 LUFS', vfx='png rgba 256px'),
           categories=list(by_cat), sfxByCategory=by_cat, musicByMood=by_mood,
           coreSfx=[e['id'] for e in sfx if e.get('core')], coreMusic=[e['id'] for e in music if e.get('core')],
           sfx=sfx, music=music, vfx=vfx)
json.dump(man, open(ROOT + '/manifest.json', 'w'), indent=1, ensure_ascii=False)
print('manifest: sfx', len(sfx), 'music', len(music), 'vfx', len(vfx), 'missing', missing)

# ---------------------------------------------------------------- CREDITS.md
L = ['# VOXELWARS audio and VFX credits', '',
     'All third-party audio / sprites below are used under CC0 / Public Domain, or under Creative Commons Attribution (CC BY 3.0 / 4.0).',
     'Audio was trimmed, loudness-normalised and re-encoded to MP3 for the game (changes made). Every entry in the first section (CC BY) must stay in the in-game credits; the CC0 section is listed as a courtesy.', '']
by = [i for i in credit_items.values() if i['info']['attributionRequired']]
L += ['## Required attribution lines (CC BY)', '']
for e in sorted(by, key=lambda e: (e['info']['author'].lower(), e['info']['title'].lower())):
    i = e['info']; kinds = '/'.join(sorted(e['kind']))
    if i['author'] == 'Kevin MacLeod':
        L += ['- "%s" Kevin MacLeod (incompetech.com)  ' % i['title'], '  Licensed under Creative Commons: By Attribution 4.0 License  ', '  http://creativecommons.org/licenses/by/4.0/  ', '  Source: %s  ' % i['source'], '  Used for: %s (%d file(s))' % (kinds, len(e['ids'])), '']
    else:
        L += ['- "%s" by %s, %s, licensed under %s (%s). Modified (trimmed/normalised/encoded).  ' % (i['title'], i['author'], i['source'], i['license'], i['licenseUrl']), '  Used for: %s (%d file(s))' % (kinds, len(e['ids'])), '']
L += ['## CC0 / Public Domain sources (no attribution required, listed as a courtesy)', '']
grp = collections.defaultdict(list)
for e in credit_items.values():
    if not e['info']['attributionRequired']: grp[e['info']['author']].append(e)
for author in sorted(grp, key=str.lower):
    L.append('### %s' % author)
    for e in sorted(grp[author], key=lambda e: e['info']['title'].lower()):
        i = e['info']; L.append('- %s - %s - %s (%d file(s))' % (i['title'], i['license'], i['source'], len(e['ids'])))
    L.append('')
L += ['## Synthesized', '', '- UI countdown beeps are generated by `tools/build_sfx.py` (original work, CC0).', '']
open(ROOT + '/CREDITS.md', 'w').write('\n'.join(L))
print('credits entries', len(credit_items), 'cc-by entries', len(by))
