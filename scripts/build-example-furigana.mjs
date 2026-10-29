/** Build static ruby once; no dictionary downloads or tokenization in the browser. */
import fs from 'node:fs';
import path from 'node:path';
import kuromoji from 'kuromoji';
const root=process.cwd();
const tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:path.join(root,'node_modules/kuromoji/dict')}).build((error,value)=>error?reject(error):resolve(value)));
const hira=(s)=>s.normalize('NFKC').replace(/[ァ-ヶ]/g,(c)=>String.fromCharCode(c.charCodeAt(0)-96));
const kanji=/[一-鿿々〆ヵヶ]/;
const overrides=JSON.parse(fs.readFileSync('data/example-reading-corrections.json','utf8'));
const unknown=[];
function splitReading(surface,reading){
  reading=hira(reading);
  // Leave okurigana on the baseline (食べました → 食[た]べました).
  let prefix=0,suffix=0;
  while(prefix<surface.length && prefix<reading.length && !kanji.test(surface[prefix]) && hira(surface[prefix])===reading[prefix])prefix++;
  while(suffix<surface.length-prefix && suffix<reading.length-prefix && !kanji.test(surface[surface.length-1-suffix]) && hira(surface[surface.length-1-suffix])===reading[reading.length-1-suffix])suffix++;
  const base=surface.slice(prefix,suffix?surface.length-suffix:undefined),kana=reading.slice(prefix,suffix?reading.length-suffix:undefined);
  if(!kanji.test(base)||!kana||!/^[ぁ-ゖーゝゞ]+$/.test(kana))return [surface];
  return [...(prefix?[surface.slice(0,prefix)]:[]),[base,kana],...(suffix?[surface.slice(-suffix)]:[])];
}
function annotate(text){
  if (/^[①②③]/.test(text) && /动词/.test(text)) return [text];
  const parts=[];let position=0;
  const explicit=overrides[text];
  if(explicit){if(explicit.map(p=>typeof p==='string'?p:p[0]).join('')!==text)throw Error('Correction does not restore sentence: '+text);return explicit.flatMap(p=>typeof p==='string'?annotate(p):[p]);}
  for(const token of tokenizer.tokenize(text)){
    const index=text.indexOf(token.surface_form,position);
    if(index<position)throw Error('Tokenizer surface mismatch: '+text);
    if(index>position)parts.push(text.slice(position,index));
    if(kanji.test(token.surface_form)&&token.reading)parts.push(...splitReading(token.surface_form,token.reading));
    else {parts.push(token.surface_form);if(kanji.test(token.surface_form))unknown.push({sentence:text,word:token.surface_form});}
    position=index+token.surface_form.length;
  }
  if(position<text.length)parts.push(text.slice(position));
  const merged=[];
  for(const p of parts){if(typeof p==='string'&&typeof merged.at(-1)==='string')merged[merged.length-1]+=p;else merged.push(p);}
  if(merged.map(p=>typeof p==='string'?p:p[0]).join('')!==text)throw Error('Ruby changes sentence: '+text);
  return merged;
}
const wordPath='data/word-books.generated.json',grammarPath='data/grammar-bluebook.generated.json';
const words=JSON.parse(fs.readFileSync(wordPath,'utf8')),grammar=JSON.parse(fs.readFileSync(grammarPath,'utf8'));
const review=JSON.parse(fs.readFileSync('data/example-text-review.json','utf8'));
const wordById=new Map(words.words.map(w=>[w.id,w]));
for(const change of review.changes){
 const word=wordById.get(change.id);
 if(!word)throw Error('Reviewed example missing: '+change.id);
 if(word.exampleJp===change.from)word.exampleJp=change.to;
 else if(word.exampleJp!==change.to)throw Error('Reviewed example changed: '+change.id);
}
let sourceRuby={};
const sourcePath=process.argv.find((v)=>v.startsWith('--source='))?.slice(9)??'data/grammar-source-ruby.json';
if(fs.existsSync(sourcePath))sourceRuby=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const cache=new Map();
function ruby(text){if(sourceRuby[text])return sourceRuby[text].flatMap(p=>typeof p==='string'?annotate(p):[p]);if(!cache.has(text))cache.set(text,annotate(text));return cache.get(text);}
for(const word of words.words)word.exampleRuby=ruby(word.exampleJp);
for(const point of grammar)for(const example of point.examples)example.ruby=ruby(example.text);
fs.writeFileSync(wordPath,JSON.stringify(words)+'\n');fs.writeFileSync(grammarPath,JSON.stringify(grammar)+'\n');
fs.mkdirSync('work/example-furigana',{recursive:true});
fs.writeFileSync('work/example-furigana/unknown.json',JSON.stringify(unknown,null,2)+'\n');
console.log({words:words.words.length,grammarExamples:grammar.reduce((sum,p)=>sum+p.examples.length,0),sourceExamples:Object.keys(sourceRuby).length,unknown:unknown.length});
