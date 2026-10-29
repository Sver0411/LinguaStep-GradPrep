#!/usr/bin/env python3
"""Stage auditable textbook fields; never executes Anki templates or invents text.

Input: downloaded AnkiWeb 1748349244. Output stays in work/ until reviewed.
"""
import argparse,collections,hashlib,html,json,re,sqlite3,zipfile
from pathlib import Path
from html.parser import HTMLParser

class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag in ['br','p','div','li']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['p','div','li']:self.parts.append('\n')
 def handle_data(self,data):self.parts.append(data)

def plain(value):
 parser=Text();parser.feed(value);text=html.unescape(''.join(parser.parts))
 text=re.sub(r'\[[ぁ-ゟァ-ヿー・·\s]+\]','',text)
 text=re.sub(r'(?<=[一-鿿ぁ-ゟァ-ヿ0-9]) +(?=[一-鿿ぁ-ゟァ-ヿ0-9])','',text)
 return re.sub(r'[ \t]+',' ',re.sub(r'\n\s*\n','\n',text)).strip()
def ja(value):return re.sub(r'\s+','',plain(value))
def order(value):return tuple(map(int,re.findall(r'\d+',value))) or (0,)

def connection(value):
 value=plain(value)
 # The deck flattens the textbook's stem notation. Make deletion explicit,
 # checking the form against the original examples; retain raw input in audit.
 value=value.replace('動ない形－ない','動ない形').replace('ない形－ない','ない形')
 value=value.replace('動ます形','动词ます形（去ます）').replace('动词「ます形」','动词ます形（去ます）')
 value=re.sub(r'動(2)?ない形(?=＋(?:ず|ざる|ん|ない|なく))',r'动词\1ない形（去ない）',value)
 value=value.replace('Ⅱ类动词「ない形」＋れば','Ⅱ类动词ない形（去ない）＋れば')
 return value

parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive',type=Path);parser.add_argument('--out',type=Path,default=Path('work/grammar-rebuild/staged'));args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
z=zipfile.ZipFile(args.archive);dbname=next(n for n in ['collection.anki21','collection.anki2'] if n in z.namelist());db=args.out/'source.anki2';db.write_bytes(z.read(dbname));c=sqlite3.connect(db);models=json.loads(c.execute('select models from col').fetchone()[0]);media=json.loads(z.read('media'));media_by_name={value:key for key,value in media.items()}
rows=[]; issues=[]; corrections=[];images={}; source_rows=[]
for nid,mid,flds in c.execute('select id,mid,flds from notes order by id'):
 raw=dict(zip([f['name'] for f in models[str(mid)]['flds']],flds.split('\x1f')));source_rows.append({'databaseNote':str(nid),**raw})
 level=(re.search(r'N[1-5]',raw['Level']) or [''])[0]; title=plain(raw['Word']);source_id=raw.get('Note ID') or str(nid)
 identifier='bb-'+hashlib.sha256(source_id.encode()).hexdigest()[:16]
 if not title or not level:issues.append({'note':source_id,'reason':'missing title or level'});continue
 conns=[]
 for i in range(1,11):
  original=plain(raw.get(f'ConnectiveType{i}',''));clean=connection(raw.get(f'ConnectiveType{i}',''))
  if clean:conns.append(clean)
  if clean!=original:corrections.append({'note':source_id,'title':title,'field':f'ConnectiveType{i}','from':original,'to':clean,'reason':'接续词干记号展开，结合原例句核对'})
 explanations=[plain(raw.get(f'Explain{i}','')) for i in range(1,16) if plain(raw.get(f'Explain{i}',''))]
 notes=[plain(raw.get(f'Note{i}','')) for i in range(1,16) if plain(raw.get(f'Note{i}',''))]
 examples=[];recalls=[]
 for i in range(1,26):
  original=raw.get(f'Example{i}',''); sentence=ja(original);zh=plain(raw.get(f'Chinese{i}',''))
  if bool(sentence)!=bool(zh):issues.append({'note':source_id,'field':f'Example{i}','reason':'unpaired example/translation'});continue
  if not sentence:continue
  examples.append({'text':sentence,'translationZh':zh,'sourceIndex':i,'sourceTag':plain(raw.get(f'SentenceTag{i}',''))})
  # Recall only a single explicitly highlighted span in the source. Multiple
  # spans are not guessed or collapsed into a potentially ambiguous blank.
  marks=re.findall(r'<b(?:\s[^>]*)?>(.*?)</b>',original,re.S|re.I)
  if len(marks)==1:
   answer=ja(marks[0]);parts=re.split(r'<b(?:\s[^>]*)?>.*?</b>',original,maxsplit=1,flags=re.S|re.I)
   if answer and len(answer)<=40 and len(parts)==2:
    prompt=ja(parts[0])+'（　）'+ja(parts[1])
    if prompt.replace('（　）',answer)==sentence:recalls.append({'sourceIndex':i,'prompt':prompt,'answer':answer,'sentence':sentence,'translationZh':zh})
 image_list=[]
 for i in range(1,11):
  field=raw.get(f'Image{i}','');caption=plain(field)
  for original_name in re.findall(r'<img[^>]+src=["\']([^"\']+)["\']',field,re.I):
   if original_name not in media_by_name:issues.append({'note':source_id,'reason':'missing image','image':original_name});continue
   blob=z.read(media_by_name[original_name]);digest=hashlib.sha256(blob).hexdigest()[:24];ext=Path(original_name).suffix.lower()
   if ext not in ['.png','.webp','.jpg','.jpeg']:issues.append({'note':source_id,'reason':'unsupported image'});continue
   filename=digest+ext;(args.out/'images').mkdir(exist_ok=True);(args.out/'images'/filename).write_bytes(blob);images[original_name]=filename
   image_list.append({'path':'/grammar-figures/'+filename,'caption':caption})
 if not(explanations or notes or examples or image_list):issues.append({'note':source_id,'reason':'empty content'});continue
 text='\n'.join([title,*conns,*explanations,*notes,*[p['text']+p['translationZh'] for p in examples]])
 if '\ufffd' in text:issues.append({'note':source_id,'reason':'unicode replacement character'})
 rows.append({'id':identifier,'sourceNote':source_id,'sourceLink':raw.get('Link',''),'title':title,'level':level,'order':raw.get('SubOrder',''),'totalOrder':raw.get('TotalOrder',''),'connections':conns,'explanations':explanations,'notes':notes,'examples':examples,'recalls':recalls,'images':image_list})
c.close();rows.sort(key=lambda r:(-int(r['level'][1]),order(r['order']),order(r['totalOrder'])))
(args.out/'grammar.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
(args.out/'raw-notes.json').write_text(json.dumps(source_rows,ensure_ascii=False,indent=2)+'\n')
report={'source':'https://ankiweb.net/shared/info/1748349244','archiveSha256':hashlib.sha256(args.archive.read_bytes()).hexdigest(),'databaseSha256':hashlib.sha256(db.read_bytes()).hexdigest(),'notes':len(source_rows),'accepted':len(rows),'levels':dict(collections.Counter(r['level'] for r in rows)),'pairedExamples':sum(len(r['examples']) for r in rows),'recallExamples':sum(len(r['recalls']) for r in rows),'uniqueImages':len(images),'issues':issues,'connectionClarifications':corrections}
(args.out/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['connectionClarifications']},ensure_ascii=False,indent=2))
