import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

export function compareExactQuranText(reference, candidate) {
 assert.ok(reference && candidate && typeof reference === 'object' && typeof candidate === 'object');
 assert.equal(reference.edition, 'quran-uthmani', 'Reference edition must be explicitly quran-uthmani');
 assert.equal(candidate.edition, reference.edition, 'Edition mismatch');
 assert.ok(Array.isArray(reference.ayahs) && reference.ayahs.length > 0, 'Missing reference verses');
 assert.ok(Array.isArray(candidate.ayahs), 'Missing candidate verses');
 assert.equal(candidate.ayahs.length, reference.ayahs.length, 'Verse count mismatch');
 for(let i=0;i<reference.ayahs.length;i++){
  const expected=reference.ayahs[i],actual=candidate.ayahs[i];
  assert.equal(expected.numberInSurah,i+1,'Invalid reference order at '+(i+1));
  assert.equal(actual.numberInSurah,expected.numberInSurah,'Verse order mismatch at '+(i+1));
  assert.ok(typeof expected.text==='string' && expected.text.length>0,'Missing reference text at '+(i+1));
  assert.equal(actual.text,expected.text,'Exact Quran text mismatch at verse '+(i+1));
 }
 return {matched:reference.ayahs.length};
}
export function validateReferenceProvenance(metadata){
 for(const key of ['sourceName','sourceUrl','edition','license','reviewedBy','reviewedAt','sha256']){
  assert.ok(typeof metadata?.[key]==='string'&&metadata[key].trim(), 'Missing reference provenance: '+key);
 }
 assert.match(metadata.sourceUrl,/^https:\/\//);
 assert.equal(metadata.edition,'quran-uthmani');
 assert.match(metadata.sha256,/^[a-f0-9]{64}$/i);
 assert.match(metadata.reviewedAt,/^\d{4}-\d{2}-\d{2}$/);
 return true;
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length!==3){console.error('Usage: node tests/compare-quran-reference.mjs <reviewed-reference.json> <candidate.json> <provenance.json>');process.exitCode=2;}
 else{
  const referenceBytes=fs.readFileSync(args[0]);
  const [ref,candidate,provenance]=args.map(path=>JSON.parse(fs.readFileSync(path,'utf8')));
  validateReferenceProvenance(provenance);
  assert.equal(createHash('sha256').update(referenceBytes).digest('hex'),provenance.sha256.toLowerCase(),'Reference file SHA-256 does not match provenance');
  const result=compareExactQuranText(ref,candidate);
  console.log('Exact code-point comparison passed for '+result.matched+' verses. This is not scholarly certification.');
 }
}
