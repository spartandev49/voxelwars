#!/usr/bin/env python3
"""Print level profile (100 ms bins, dB rel. peak) and onsets for raw files. usage: probe.py rawdir:regex [...]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import audiolib as A, build_sfx as B
np = A.np
for src in sys.argv[1:]:
    f = B.resolve(src); a = A.decode(f, hp=25)
    e, h = A.env_db(a, 0.1)
    prof = ' '.join('%d' % round(x - e.max()) for x in e[:60])
    on = A.onsets(a)
    print('##', os.path.relpath(f, B.RAW)[:80], '| dur %.2f' % (len(a) / A.SR), '| peak@%.1fs' % (float(np.argmax(np.abs(a))) / A.SR) if False else '')
    print('  prof(100ms):', prof)
    print('  onsets:', [(round(t, 2), round(p)) for t, p in on[:14]])
