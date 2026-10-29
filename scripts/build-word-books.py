#!/usr/bin/env python3
"""Build ten word books from public Anki text databases and JMdict examples.

No old LinguaStep vocabulary is used. The input decks are data, never code.
Shared Japanese spelling + reading receives one stable progress ID across books.
"""
import argparse
import collections
import csv
import hashlib
import html
import json
from pathlib import Path
import re
import sqlite3
import unicodedata

SOURCES = {
    "red-n1": 716751361, "red-n2": 601949071, "red-n3": 216235073,
    "red-n4": 1305673899, "red-n5": 789028455,
    "green-n1": 49842504, "green-n2": 176303074, "green-n3": 1342852640,
    "green-n4": 2039076689, "green-n5": 983151495,
}

def plain(value):
    value = re.sub(r"<(?:br\s*/?|/div|/p)\s*>", "\n", value, flags=re.I)
    return re.sub(r"[ \t]+", " ", html.unescape(re.sub(r"<[^>]*>", "", value))).strip()

def kana(value):
    value = unicodedata.normalize("NFKC", value)
    return "".join(chr(ord(c)-96) if "ァ" <= c <= "ヶ" else c for c in value)

def expression(value):
    value = re.sub(r"\s+", "", plain(value))
    term = re.sub(r"\[[^\]]*\]", "", value).replace(" ", "").strip()
    reading = re.sub(r"([^\[\]\s]+)\[([^\]]+)\]", lambda m: m[2], value).replace(" ", "").strip()
    if reading == term and re.search(r"[一-鿿]", reading): reading = ""
    return term, reading

def word_key(term, reading):
    return unicodedata.normalize("NFKC", term).strip()+"|"+kana(reading).strip()

def chinese(value):
    value = re.sub(r"^\s*(?:\[[^\]]+\]\s*)+", "", plain(value))
    value = re.sub(r"\[[^\]]+\]", "", value)
    value = re.sub(r"^[A-Za-z][A-Za-z -]{2,40}\s+", "", value)
    # Shared green decks often truncate Japanese dictionary explanations. Keep
    # the Chinese head definition, not that cut-off explanation.
    value = re.split(r"[（(][^（）()]*[ぁ-ヿ]", value, maxsplit=1)[0]
    value = re.sub(r"[（(][^（）()]*[）)]", "", value)
    value = re.sub(r"[ぁ-ヿ]+", "", value)
    return re.sub(r"\s+", " ", value).strip(" ;；，,。.…/／")[:180]

def example_pair(value):
    for item in re.split(r"[△▲]\s*", plain(value)):
        if not re.search(r"[ぁ-ヿ]", item) or not re.search(r"[/／]", item): continue
        ja, zh = re.split(r"[/／]", item, maxsplit=1)
        ja = re.sub(r"\[[^\]]*\]", "", ja).strip()
        zh = re.sub(r"\s+", "", zh).strip()
        if len(ja) >= 7 and re.search(r"[。？！!?]$", ja) and re.search(r"[一-鿿]", zh): return ja, zh
    return "", ""

def unit_key(value):
    match = re.search(r"-([ABC]?)(\d+)$", value)
    return ((ord(match[1])-65 if match[1] else 0), int(match[2])) if match else (0, 0)

def unit_label(book, raw):
    group, unit = unit_key(raw)
    if not unit: return "词汇正文"
    if re.search(r"-[ABC]", raw): return f"{['必考词','基础词','超纲词'][group]} · 第 {unit} 单元"
    number = int(book[-1])
    split = {1: (25,39), 2:(26,40), 3:(20,30)}[number]
    group = "必考词" if unit <= split[0] else "基础词" if unit <= split[1] else "超纲词"
    return f"{group} · 第 {unit} 单元"

def dictionary_entry(entries, term, reading):
    possibilities = []
    term = term.strip('〜～-…')
    reading = reading.strip('〜～-…')
    variants = [term, *re.split(r"[/／・]", term), reading]
    seen = set()
    for variant in variants:
        for entry in entries.get(kana(variant), []):
            if entry['id'] not in seen and any(kana(k['text']) == kana(reading) for k in entry['kana']):
                possibilities.append(entry)
                seen.add(entry['id'])
    return possibilities

def english_fields(entries, term, reading):
    candidates = []
    spellings = [part.strip('〜～-…') for part in re.split(r'[/／・]', term)]
    bare_reading = reading.strip('〜～-…')
    for entry in dictionary_entry(entries, term, reading):
        for sense_index, sense in enumerate(entry['sense']):
            if sense.get('appliesToKanji', ['*']) != ['*'] and not any(s in sense['appliesToKanji'] for s in spellings): continue
            if sense.get('appliesToKana', ['*']) != ['*'] and not any(kana(r) == kana(bare_reading) for r in sense['appliesToKana']): continue
            glosses = [g['text'] for g in sense['gloss'] if g['lang'] == 'eng' and len(g['text']) <= 80]
            for gloss_index, gloss in enumerate(glosses):
                english = re.sub(r"\([^)]*\)", "", gloss).strip()
                english = re.sub(r"^to ", "", english).strip()
                if not re.search('[a-zA-Z]', english): continue
                examples = []
                for example in sense.get('examples', []):
                    texts = {s['lang']: s['text'] for s in example['sentences']}
                    ja, en = texts.get('jpn',''), texts.get('eng','')
                    if ja and en and len(ja) < 120 and len(en) < 220:
                        contains = english.lower() in en.lower()
                        examples.append((int(contains)*20-len(en)/200, ja, en))
                best = max(examples, default=(0, '', ''))
                spelling = term.strip('〜～-…')
                exact_kanji = any(k['text'] in spellings for k in entry['kanji'])
                kana_spelling = not re.search(r'[一-鿿]', spelling)
                usual_kana = 'uk' in sense.get('misc', []) or not entry['kanji']
                common_reading = any(kana(k['text']) == kana(bare_reading) and k.get('common') for k in entry['kana'])
                suffix = term.startswith(('〜','～','-')) and any(p.endswith('suf') or p == 'ctr' for p in sense['partOfSpeech'])
                # Spelling/reading and the head sense outrank example presence:
                # otherwise 買う became "appreciate" and ここ became "nine".
                score = (10000 * int(exact_kanji) + 3000 * int(kana_spelling and usual_kana)
                         + 3000 * int(suffix) + 200 * int(common_reading)
                         - sense_index*100-gloss_index*10 + best[0])
                candidates.append((score, english, best[1], best[2], entry['id'], sense['partOfSpeech']))
    if not candidates: return '', '', '', '', ''
    _, en, ja, sentence, identifier, pos = max(candidates, key=lambda item:item[0])
    label = 'verb' if any(p.startswith('v') and p not in ['vs','vt','vi'] for p in pos) else 'adjective' if any(p.startswith('adj') for p in pos) else 'adverb' if any(p.startswith('adv') for p in pos) else 'noun' if 'n' in pos else 'expression'
    return en, ja, sentence, identifier, label

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--decks',type=Path,default=Path('work/book-import'))
parser.add_argument('--fallback-decks',type=Path,default=Path('/tmp/linguastep-book-import'))
parser.add_argument('--jmdict',type=Path,required=True)
parser.add_argument('--examples',type=Path)
parser.add_argument('--output',type=Path,default=Path('data/word-books.generated.json'))
args=parser.parse_args()
args.decks.mkdir(parents=True,exist_ok=True)
editorial_path=Path('data/word-book-editorial.json')
editorial=json.loads(editorial_path.read_text()) if editorial_path.exists() else {}

books=[]; records={}; rejected=[]; memberships={}; audio_by_word={}
for book in [f'{color}-n{n}' for color in ['red','green'] for n in range(5,0,-1)]:
    path=args.decks/f'{book}.anki2'
    if not path.exists(): path=args.fallback_decks/f'{book}.anki2'
    connection=sqlite3.connect(path)
    models=json.loads(connection.execute('SELECT models FROM col').fetchone()[0])
    audio_file=args.decks/f'{book}.audio.json'
    audio=json.loads(audio_file.read_text()) if audio_file.exists() else {}
    items=[]
    for note,mid,fields in connection.execute('SELECT id,mid,flds FROM notes ORDER BY id'):
        names=[f['name'] for f in models[str(mid)]['flds']]
        value=dict(zip(names,fields.split('\x1f')))
        term,reading=expression(value.get('Expression',value.get('日文','')))
        meaning=chinese(value.get('中文释义',value.get('释义','')))
        original_id='bw-'+hashlib.sha256(word_key(term,reading).encode()).hexdigest()[:16]
        edit=editorial.get(original_id,{})
        term,reading,meaning=edit.get('term',term),edit.get('reading',reading),edit.get('meaningZh',meaning)
        if not term or not reading or not re.search(r'[一-鿿]',meaning):
            rejected.append({'book':book,'note':str(note),'reason':'缺少有效词头、读音或中文释义'});continue
        key=word_key(term,reading)
        identifier='bw-'+hashlib.sha256(key.encode()).hexdigest()[:16]
        ja,zh=example_pair(value.get('例句',''))
        pos=plain(value.get('词性','')) or (re.search(r'^\s*\[([^\]]+)\]',plain(value.get('中文释义',''))) or [None,'词语'])[1]
        record={'id':identifier,'term':term,'reading':reading,'meaningZh':meaning,'pos':pos,'exampleJp':ja,'exampleJpZh':zh,'level':f'JLPT N{book[-1]}','sourceBook':book,'sourceNote':str(note)}
        if key not in records: records[key]=record
        elif not records[key]['exampleJp'] and ja:
            records[key]['exampleJp']=ja;records[key]['exampleJpZh']=zh
        if edit:
            records[key]['editorial']={**records[key].get('editorial',{}),**edit}
        if str(note) in audio and identifier not in audio_by_word: audio_by_word[identifier]=audio[str(note)]
        items.append({'word':identifier,'unit':value.get('课号',''),'sourceOrder':int(value.get('排序编号',note)),'reading':reading,'term':term})
    connection.close()
    # Green books are unit-based, with gojuon ordering inside each unit. The
    # source deck's numeric field is reversed/scrambled and is not book order.
    if book.startswith('green'): items.sort(key=lambda row:(*unit_key(row['unit']),kana(row['reading']),row['sourceOrder']))
    seen=set(); ordered=[]
    for item in items:
        if item['word'] in seen: continue
        seen.add(item['word']);ordered.append([item['word'],unit_label(book,item['unit'])])
    memberships[book]=ordered
    books.append({'id':book,'title':f'{"红宝书" if book.startswith("red") else "绿宝书"} N{book[-1]}','series':'red' if book.startswith('red') else 'green','level':f'N{book[-1]}','cover':f'/book-covers/{book}.webp','sourceUrl':f'https://ankiweb.net/shared/info/{SOURCES[book]}','sourceNotes':len(items),'wordCount':len(ordered),'orderNote':'按课号排列，单元内五十音顺序' if book.startswith('green') else '按文字卡组原始词条顺序','databaseSha256':hashlib.sha256(path.read_bytes()).hexdigest()})

dictionary=json.loads(args.jmdict.read_text())
entries=collections.defaultdict(list)
for item in dictionary['words']:
    for form in [*item['kanji'],*item['kana']]: entries[kana(form['text'])].append(item)
example_map={}
if args.examples and args.examples.exists():
    with args.examples.open() as handle:
        for row in csv.reader((line for line in handle if not line.startswith('#')),delimiter='\t'):
            if len(row)>15:
                example_map[word_key(row[3],row[6])]=(plain(row[12]),plain(row[14]))

pending=[]
for key,record in records.items():
    edit=record.pop('editorial',{})
    en,ja,sentence,reference,en_pos=english_fields(entries,record['term'],record['reading'])
    record.update({'english':edit.get('english',en),'englishPos':edit.get('englishPos',en_pos),'exampleEn':edit.get('exampleEn',sentence),'exampleEnZh':edit.get('exampleEnZh',''),'dictionaryId':reference,'audio':audio_by_word.get(record['id'],'')})
    record['meaningZh']=edit.get('meaningZh',record['meaningZh'])
    if edit.get('exampleJp'):
        record['exampleJp']=edit['exampleJp'];record['exampleJpZh']=edit.get('exampleJpZh','')
        # An editorial correction may change the dictionary sense. Translate
        # its own example rather than retain an unrelated dictionary example.
        record['exampleEn']=edit.get('exampleEn','')
    known_example=example_map.get(key)
    if not record['exampleJp'] and known_example:
        record['exampleJp'],record['exampleJpZh']=known_example
    if not record['exampleJp']: record['exampleJp']=ja
    record['exampleSource']='book / egg rolls / JMdict-Tatoeba'
    for field,source,target in [('english','zh-CN','en'),('exampleJpZh','ja','zh-CN'),('exampleEnZh','en','zh-CN')]:
        if record[field]: continue
        value=record['meaningZh'].split('。')[0][:100] if field=='english' else record['exampleJp'] if field=='exampleJpZh' else record['exampleEn']
        if value:pending.append({'word':record['id'],'field':field,'source':source,'target':target,'text':value})

result={'books':books,'words':list(records.values()),'memberships':memberships,'rejected':rejected,'dictionaryDate':dictionary.get('dictDate')}
# Apply the separately reviewed concise meanings after source/editorial merging.
meaning_review=Path('data/word-meaning-review.json')
if meaning_review.exists():
    import runpy
    result=runpy.run_path(str(Path(__file__).with_name('compact-book-meanings.py')))['apply_meanings'](result,json.loads(meaning_review.read_text()))
args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
(args.decks/'pending-translations.json').write_text(json.dumps(pending,ensure_ascii=False,separators=(',',':'))+'\n')
stats={'books':len(books),'references':sum(len(v) for v in memberships.values()),'words':len(records),'rejected':len(rejected),'missingEnglish':sum(not r['english'] for r in records.values()),'missingJapaneseExamples':sum(not r['exampleJp'] for r in records.values()),'missingEnglishExamples':sum(not r['exampleEn'] for r in records.values()),'audio':len(audio_by_word),'translations':len(pending)}
print(json.dumps(stats,ensure_ascii=False,indent=2))
