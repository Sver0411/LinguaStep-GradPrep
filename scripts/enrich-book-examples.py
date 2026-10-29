#!/usr/bin/env python3
"""Reuse attributed corpus examples; never manufacture usage templates."""
import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
import re

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--jmdict',type=Path,required=True)
parser.add_argument('--data',type=Path,default=Path('data/word-books.generated.json'))
parser.add_argument('--work',type=Path,default=Path('work/book-import'))
args=parser.parse_args()
data=json.loads(args.data.read_text())
dictionary=json.loads(args.jmdict.read_text())
pairs={}
for entry in dictionary['words']:
    for sense in entry['sense']:
        for example in sense.get('examples',[]):
            text={s['lang']:s['text'] for s in example['sentences']}
            ja,en=text.get('jpn',''),text.get('eng','')
            if 6<=len(ja)<=110 and 8<=len(en)<=180:
                pairs[ja]=(en,example['source']['value'])
del dictionary

# Aho-Corasick indexes the small list of missing terms against the full corpus
# in linear time, instead of scanning every sentence once for every word.
transitions=[{}];failure=[0];outputs=[[]]
for index,word in enumerate(data['words']):
    if word['exampleJp']:continue
    for term in set(re.split(r'[/／・]',word['term'])):
        term=term.strip('〜～-…')
        if not term or len(term)>30:continue
        node=0
        for char in term:
            if char not in transitions[node]:
                transitions[node][char]=len(transitions);transitions.append({});failure.append(0);outputs.append([])
            node=transitions[node][char]
        outputs[node].append((index,term))
queue=deque(transitions[0].values())
while queue:
    node=queue.popleft()
    for char,target in transitions[node].items():
        queue.append(target);fallback=failure[node]
        while fallback and char not in transitions[fallback]:fallback=failure[fallback]
        failure[target]=transitions[fallback].get(char,0)
        outputs[target].extend(outputs[failure[target]])
added=0
for ja,(en,source) in sorted(pairs.items(),key=lambda item:len(item[0])):
    node=0
    for char in ja:
        while node and char not in transitions[node]:node=failure[node]
        node=transitions[node].get(char,0)
        for index,term in outputs[node]:
            word=data['words'][index]
            if word['exampleJp']:continue
            if len(term)==1 and word['english'].lower() not in en.lower():continue
            word['exampleJp']=ja;word['exampleSource']=f'Tatoeba #{source} via JMdict'
            if not word['exampleEn']:word['exampleEn']=en
            added+=1

pending=[]
for word in data['words']:
    for field,source,target,value in [
        ('english','zh-CN','en',word['meaningZh'].split('。')[0][:100]),
        ('exampleJpZh','ja','zh-CN',word['exampleJp']),
        ('exampleEn','ja','en',word['exampleJp']),
        ('exampleEnZh','en','zh-CN',word['exampleEn']),
    ]:
        if value and not word[field]:pending.append({'word':word['id'],'field':field,'source':source,'target':target,'text':value})
args.data.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
(args.work/'pending-translations.json').write_text(json.dumps(pending,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'corpusExamplesAdded':added,'missingJapaneseExamples':sum(not w['exampleJp'] for w in data['words']),'missingEnglishExamples':sum(not w['exampleEn'] for w in data['words']),'pending':len(pending)}))
