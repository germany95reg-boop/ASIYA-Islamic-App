// Prepare a pinned Tanzil source for an OPTIONAL future offline Quran reader.
// Requires explicit local source file. Does not publish, normalize or alter Arabic text.
// Usage: node tools/build-pinned-tanzil.mjs <quran-uthmani.txt> <output-directory>
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyPinnedTanzil} from './verify-pinned-tanzil.mjs';
import {parseTanzilText} from './parse-tanzil-text.mjs';
const manifest=JSON.parse(readFileSync(new URL('../quran-sources/tanzil-uthmani-1.1.json',import.meta.url),'utf8'));
export function buildPinnedTanzil(bytes,destination){
 const result=verifyPinnedTanzil(bytes,manifest);
 const dir=resolve(destination);
 if(existsSync(dir))throw Error('Output directory already exists: refusing overwrite');
 // Verify the full original before writing ANY output.
 const surahs=parseTanzilText(bytes);
 mkdirSync(dir,{recursive:false});
 for(const surah of surahs){
  writeFileSync(join(dir,String(surah.surah).padStart(3,'0')+'.json'),JSON.stringify({
   schemaVersion:1,sourceId:manifest.id,sourceSha256:manifest.sha256,
   surah:surah.surah,ayahs:surah.ayahs
  })+'\n','utf8');
 }
 writeFileSync(join(dir,'SOURCE.json'),JSON.stringify({
  ...manifest,publicationStatus:'local prepared copy; publication and license review required',
  validation:result,
  attribution:'Tanzil Project — https://tanzil.net; retain the original source copyright and license notice'
 },null,2)+'\n');
 return {directory:dir,...result,files:115};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4){console.error('Usage: node tools/build-pinned-tanzil.mjs <quran-uthmani.txt> <new-output-directory>');process.exitCode=2;}
 else console.log(JSON.stringify(buildPinnedTanzil(readFileSync(resolve(process.argv[2])),process.argv[3]),null,2));
}
