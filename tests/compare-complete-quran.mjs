import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareExactQuranText,validateReferenceProvenance} from './compare-quran-reference.mjs';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const VERSE_COUNTS=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
export function compareCompleteQuran(referenceDir,candidateDir){
 assert.equal(VERSE_COUNTS.length,114);
 assert.equal(VERSE_COUNTS.reduce((a,b)=>a+b,0),6236);
 let checked=0;
 for(let surah=1;surah<=114;surah++){
  const path=join(referenceDir,String(surah)+'.json');
  const bytes=readFileSync(path);
  const reference=JSON.parse(bytes);
  const candidate=JSON.parse(readFileSync(join(candidateDir,String(surah)+'.json'),'utf8'));
  const provenance=JSON.parse(readFileSync(join(referenceDir,String(surah)+'.provenance.json'),'utf8'));
  validateReferenceProvenance(provenance);
  assert.equal(provenance.surah,surah,'Provenance surah mismatch');
  assert.equal(reference.surah,surah,'Reference surah mismatch');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),provenance.sha256.toLowerCase(),'Reference checksum mismatch');
  assert.equal(reference.ayahs.length,VERSE_COUNTS[surah-1],'Unexpected verse count in surah '+surah);
  checked+=compareExactQuranText(reference,candidate).matched;
 }
 assert.equal(checked,6236);
 return {surahs:114,ayahs:checked};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4){console.error('Usage: node tests/compare-complete-quran.mjs <reviewed-reference-directory> <candidate-directory>');process.exitCode=2;}
 else{
  const result=compareCompleteQuran(resolve(process.argv[2]),resolve(process.argv[3]));
  console.log('Exact comparison passed: '+result.surahs+' surahs / '+result.ayahs+' verses. Human source review is still required.');
 }
}
