#!/usr/bin/env python3
"""Release reviewed source fields after rejecting unresolved source defects."""
import argparse,collections,json,shutil
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--stage',type=Path,default=Path('work/grammar-rebuild/staged'));parser.add_argument('--review',type=Path,default=Path('data/grammar-bluebook-audit.json'));args=parser.parse_args()
rows=json.loads((args.stage/'grammar.json').read_text());audit=json.loads((args.stage/'audit.json').read_text());review=json.loads(args.review.read_text());review=review.get('review',review)
if audit['issues']:raise SystemExit('Resolve staging issues before release')
held={item['sourceNote'] for item in review['heldLessons']};examples={item['sourceNote']:set(item['indices']) for item in review['heldExamples']}
release=[]
for row in rows:
 if row['sourceNote'] in held:continue
 banned=examples.get(row['sourceNote'],set());row['examples']=[e for e in row['examples'] if e['sourceIndex'] not in banned];row['recalls']=[e for e in row['recalls'] if e['sourceIndex'] not in banned]
 for recall in row['recalls']:
  assert recall['prompt'].count('（　）')==1
  assert recall['prompt'].replace('（　）',recall['answer'])==recall['sentence']
  assert any(e['sourceIndex']==recall['sourceIndex'] and e['text']==recall['sentence'] and e['translationZh']==recall['translationZh'] for e in row['examples'])
 assert row['title'] and (row['examples'] or row['notes'] or row['explanations'] or row['images'])
 release.append(row)
assert len(set(row['id'] for row in release))==len(release)
Path('data/grammar-bluebook.generated.json').write_text(json.dumps(release,ensure_ascii=False,separators=(',',':'))+'\n')
figures=Path('public/grammar-figures');figures.mkdir(exist_ok=True)
for file in (args.stage/'images').iterdir():shutil.copy2(file,figures/file.name)
audit.update({'review':review,'released':len(release),'releasedLevels':dict(collections.Counter(row['level'] for row in release)),'releasedExamples':sum(len(row['examples']) for row in release),'releasedRecalls':sum(len(row['recalls']) for row in release),'checks':['逐条字段存在性与等级校验','逐条日中例句配对校验','逐条填空还原原句校验','159 个原图格式与完整性校验','接续词干记号对照原例句澄清','本地 N1 原书文字层和 N2/N3/N4N5 扫描件目录、接续与关键例句交叉抽查'],'limits':'完成全量结构检查和重点语义抽查，不等同于逐句专业审校；本地分册与卡组综合版存在版本差异。未确认的错误隔离，未补写缺失内容。'})
Path('data/grammar-bluebook-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print({key:audit[key] for key in ['released','releasedLevels','releasedExamples','releasedRecalls']})
