#!/usr/bin/env python3
"""Apply reviewed concise glosses without changing IDs, examples or progress keys.

The manifest retains each previous gloss and the reviewed replacement. Any new
source text fails closed and must be reviewed again; no runtime hard truncation.
"""
import argparse,json
from pathlib import Path

def apply_meanings(data, manifest):
    by_id={word['id']:word for word in data['words']}
    for edit in manifest['changes']:
        word=by_id[edit['id']]
        if word['meaningZh'] not in (edit['from'],edit['to']):
            raise ValueError(f"Review changed source before applying {edit['id']}")
        assert edit['to'].strip() and len(edit['to']) <= 22
        word['meaningZh']=edit['to']
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data',type=Path,default=Path('data/word-books.generated.json'))
    parser.add_argument('--review',type=Path,default=Path('data/word-meaning-review.json'))
    args=parser.parse_args()
    data=apply_meanings(json.loads(args.data.read_text()),json.loads(args.review.read_text()))
    args.data.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f"Reviewed {len(data['words'])} glosses; applied {len(json.loads(args.review.read_text())['changes'])} recorded edits")
