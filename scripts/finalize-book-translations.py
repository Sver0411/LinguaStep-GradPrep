#!/usr/bin/env python3
"""Apply cached build translations and queue only missing fields for the next pass."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data', type=Path, default=Path('data/word-books.generated.json'))
parser.add_argument('--work', type=Path, default=Path('work/book-import'))
args = parser.parse_args()
data = json.loads(args.data.read_text())
cache_path = args.work / 'translations.json'
cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
pending = []
applied = 0
for word in data['words']:
    # English example must be applied before its Chinese translation is queued.
    for field, source, target in [('english', 'zh-CN', 'en'), ('exampleJpZh', 'ja', 'zh-CN'), ('exampleEn', 'ja', 'en'), ('exampleEnZh', 'en', 'zh-CN')]:
        if word[field]: continue
        text = word['meaningZh'].split('。')[0][:100] if field == 'english' else word['exampleEn'] if field == 'exampleEnZh' else word['exampleJp']
        if not text: continue
        key = hashlib.sha256(json.dumps([source, target, text], ensure_ascii=False).encode()).hexdigest()
        if cache.get(key):
            word[field] = cache[key].strip()
            applied += 1
        else:
            pending.append({'word': word['id'], 'field': field, 'source': source, 'target': target, 'text': text})
args.data.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
(args.work / 'pending-translations.json').write_text(json.dumps(pending, ensure_ascii=False, separators=(',', ':')) + '\n')
print(json.dumps({'applied': applied, 'pending': len(pending), 'missing': {f: sum(not w[f] for w in data['words']) for f in ['english', 'exampleJp', 'exampleJpZh', 'exampleEn', 'exampleEnZh']}}))
