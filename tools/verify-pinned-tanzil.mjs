// Validate a user-supplied Tanzil source BEFORE any future integration.
// Usage: node tools/verify-pinned-tanzil.mjs <original-quran-uthmani.txt>
// Never normalizes, edits, or republishes Arabic Quran text.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseTanzilText} from './parse-tanzil-text.mjs';

export function verifyPinnedTanzil(bytes,manifest){
 if(!Buffer.isBuffer(bytes))throw Error('Original bytes required');
 if(manifest.id!=='tanzil-uthmani-1.1'||manifest.edition!=='quran-uthmani')throw Error('Unexpected Quran edition');
 if(bytes.length!==manifest.bytes)throw Error('Original file size differs from pinned manifest');
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(sha256!==manifest.sha256)throw Error('SHA-256 mismatch: refusing source');
 const surahs=parseTanzilText(bytes);
 if(surahs.length!==manifest.surahs||surahs.reduce((n,s)=>n+s.ayahs.length,0)!==manifest.ayahs)throw Error('Quran completeness check failed');
 return {status:'structurally-verified',id:manifest.id,sha256,surahs:surahs.length,ayahs:manifest.ayahs,scholarlyCertified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==3){console.error('Usage: node tools/verify-pinned-tanzil.mjs <original-quran-uthmani.txt>');process.exitCode=2;}
 else {
  const manifest=JSON.parse(readFileSync(new URL('../quran-sources/tanzil-uthmani-1.1.json',import.meta.url),'utf8'));
  console.log(JSON.stringify(verifyPinnedTanzil(readFileSync(resolve(process.argv[2])),manifest),null,2));
 }
}
