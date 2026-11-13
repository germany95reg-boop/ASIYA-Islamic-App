// Read a Tanzil pipe-delimited Uthmani text export WITHOUT modifying Arabic verse strings.
// This prepares comparison inputs; it does not certify source authenticity or license compliance.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {VERSE_COUNTS} from '../tests/compare-complete-quran.mjs';

export function parseTanzilText(bytes){
 const raw=bytes.toString('utf8');
 assert.ok(!raw.includes('\uFFFD'),'Input has replacement characters: invalid UTF-8');
 const result=Array.from({length:114},(_,i)=>({surah:i+1,edition:'quran-uthmani',ayahs:[]}));
 const seen=new Set();
 for(const line of raw.split(/\r?\n/)){
  if(!line.trim()||/^\s*#/.test(line))continue;
  const match=/^(\d+)\|(\d+)\|(.*)$/.exec(line);
  assert.ok(match,'Unexpected Tanzil row format');
  const surah=Number(match[1]),ayah=Number(match[2]),text=match[3];
  assert.ok(Number.isInteger(surah)&&surah>=1&&surah<=114,'Invalid surah number');
  assert.ok(Number.isInteger(ayah)&&ayah>=1&&ayah<=VERSE_COUNTS[surah-1],'Invalid verse number');
  assert.ok(text.length>0&&/[\u0621-\u064A]/u.test(text),'Missing Arabic verse text');
  const key=surah+':'+ayah;
  assert.ok(!seen.has(key),'Duplicate verse '+key);
  seen.add(key);
  result[surah-1].ayahs.push({numberInSurah:ayah,text});
 }
 for(const surah of result){
  assert.equal(surah.ayahs.length,VERSE_COUNTS[surah.surah-1],'Missing verses in surah '+surah.surah);
  for(let i=0;i<surah.ayahs.length;i++)assert.equal(surah.ayahs[i].numberInSurah,i+1,'Unordered verses in surah '+surah.surah);
 }
 assert.equal(seen.size,6236);
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4){console.error('Usage: node tools/parse-tanzil-text.mjs <original-tanzil-uthmani.txt> <output-directory>');process.exitCode=2;}
 else{
  const original=readFileSync(resolve(process.argv[2]));
  const surahs=parseTanzilText(original);
  const dir=resolve(process.argv[3]);mkdirSync(dir,{recursive:true});
  for(const surah of surahs)writeFileSync(join(dir,surah.surah+'.json'),JSON.stringify(surah,null,2)+'\n');
  console.log('Prepared 114 surahs / 6236 verses from original file; original SHA-256: '+createHash('sha256').update(original).digest('hex'));
  console.log('NOT a reviewed reference. Preserve original source, exact license notice and provenance separately.');
 }
}
