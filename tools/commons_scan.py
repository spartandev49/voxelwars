#!/usr/bin/env python3
"""Run many Commons audio searches (throttled+cached) and write OK (licence-acceptable) hits to a TSV.
usage: commons_scan.py out.tsv 'query1' 'query2' ..."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import commons
out = open(sys.argv[1], 'w')
for q in sys.argv[2:]:
    try:
        res = commons.search_info(q, 30)
    except Exception as e:
        out.write('### %s\tERR %s\n' % (q, e)); continue
    out.write('### %s\n' % q)
    for d in res:
        if d['ok'] and (d['dur'] or 0) >= 0.2 and (d['dur'] or 0) < 400:
            out.write('%s\t%s\t%s\t%s\t%s\n' % (d['title'].replace('File:', ''), d['license'], d['artist'][:40], round(d['dur'] or 0, 1), d['size']))
    out.flush()
