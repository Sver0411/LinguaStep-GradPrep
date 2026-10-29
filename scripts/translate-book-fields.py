#!/usr/bin/env python3
"""Offline content-build helper; caches translations, never runs in the app.

Uses the public Google Translate web endpoint for non-sensitive dictionary
sentences. Build provenance stays in the documentation. Stops
on rate limiting instead of changing identities or bypassing access controls.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--batch-size',type=int,default=18)
parser.add_argument('--work',type=Path,default=Path('work/book-import'))
args=parser.parse_args()
cache_path=args.work/'translations.json'
cache=json.loads(cache_path.read_text()) if cache_path.exists() else {}
pending=json.loads((args.work/'pending-translations.json').read_text())
def key(item): return hashlib.sha256(json.dumps([item['source'],item['target'],item['text']],ensure_ascii=False).encode()).hexdigest()
unique={key(item):item for item in pending if key(item) not in cache}
groups={}
for identifier,item in unique.items(): groups.setdefault((item['source'],item['target']),[]).append((identifier,item['text']))
batches=[]
for (source,target),items in groups.items():
    current=[];length=0
    for item in items:
        if current and (length+len(item[1])>1100 or len(current)>=max(1,args.batch_size)):
            batches.append((source,target,current));current=[];length=0
        current.append(item);length+=len(item[1])+8
    if current:batches.append((source,target,current))
stop=threading.Event()
def translate(batch):
    source,target,items=batch
    if stop.is_set(): return []
    text='\n'.join(f'{i+1:04d}. {value}' for i,(_,value) in enumerate(items))
    url='https://translate.googleapis.com/translate_a/single?'+urllib.parse.urlencode({'client':'gtx','sl':source,'tl':target,'dt':'t','q':text})
    request=urllib.request.Request(url,headers={'User-Agent':'LinguaStep-local-content-build/1.0'})
    for attempt in range(3):
        try:
            time.sleep(0.4)
            with urllib.request.urlopen(request,timeout=25) as response:data=json.load(response)
            result=''.join(part[0] for part in data[0] if part[0])
            matches=list(re.finditer(r'(?m)^[ \t]*(?:\[\s*)?(\d{4})(?:\s*\]|[.．、:：])\s*',result))
            if len(matches)!=len(items):
                print(f'Unaligned batch: {source}->{target}, {len(items)} items',flush=True)
                return []
            values=[]
            for i,match in enumerate(matches):
                if int(match[1])!=i+1:return []
                value=result[match.end():matches[i+1].start() if i+1<len(matches) else len(result)].strip()
                if not value:return []
                values.append((items[i][0],value))
            return values
        except urllib.error.HTTPError as error:
            if error.code in [403,429]:
                stop.set();print(f'Translation stopped by upstream HTTP {error.code}',flush=True);return []
            if attempt==2:print(f'Translation HTTP {error.code}',flush=True);return []
            time.sleep(2*(attempt+1))
        except Exception as error:
            if attempt==2: print(type(error).__name__,str(error),flush=True);return []
            time.sleep(2*(attempt+1))
    return []
print(f'{len(unique)} unique missing translations; {len(batches)} batches',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for index,result in enumerate(pool.map(translate,batches)):
        cache.update(result)
        if index%10==0 or index+1==len(batches):
            cache_path.write_text(json.dumps(cache,ensure_ascii=False,separators=(',',':'))+'\n')
            print(f'Batches {index+1}/{len(batches)}; cached {len(cache)}; stopped={stop.is_set()}',flush=True)
cache_path.write_text(json.dumps(cache,ensure_ascii=False,separators=(',',':'))+'\n')
