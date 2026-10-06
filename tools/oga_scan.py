#!/usr/bin/env python3
"""Fetch info for many OGA slugs in parallel and dump JSON. usage: oga_scan.py slugs.txt out.json"""
import sys, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oga
from concurrent.futures import ThreadPoolExecutor
slugs = [l.split('\t')[-1].split(' | ')[0].strip() for l in open(sys.argv[1]) if l.strip()]
slugs = sorted(set(s.split(' ')[0] for s in slugs))
def f(s):
    try: return oga.info(s)
    except Exception as e: return dict(slug=s, err=str(e), licenses=[], files=[], title=s, author='?', desc='', tags=[])
with ThreadPoolExecutor(8) as ex: res = list(ex.map(f, slugs))
json.dump(res, open(sys.argv[2], 'w'), indent=1)
print(len(res), 'pages;', sum(1 for r in res if 'err' in r), 'errors')
