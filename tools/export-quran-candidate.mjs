// Collects the currently configured API edition as CANDIDATE data, never as an independent reference.
// Run manually: node tools/export-quran-candidate.mjs ./quran-candidate
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {VERSE_COUNTS} from '../tests/compare-complete-quran.mjs';

export function validateCandidatePayload(payload,surah){
 const ayahs=payload?.data?.ayahs;
 if(payload?.code!==200||Number(payload?.data?.number)!==surah||!Array.isArray(ayahs)||
    ayahs.length!==VERSE_COUNTS[surah-1]||payload.data.numberOfAyahs!==ayahs.length||
    !ayahs.every((a,i)=>a?.numberInSurah===i+1&&Number.isInteger(a.number)&&typeof a.text==='string'&&
       a.text.trim().length>0&&/[\u0621-\u064A]/u.test(a.text)))throw Error('Invalid API candidate for surah '+surah);
 return {surah,edition:'quran-uthmani',ayahs:ayahs.map(a=>({numberInSurah:a.numberInSurah,text:a.text}))};
}
export async function exportCandidates(dir,{fetchImpl=fetch,delayMs=250}={}){
 await mkdir(dir,{recursive:true});
 for(let surah=1;surah<=114;surah++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  let payload;
  try{
   const response=await fetchImpl('https://api.alquran.cloud/v1/surah/'+surah+'/quran-uthmani',{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('API HTTP '+response.status+' for surah '+surah);
   payload=await response.json();
  }finally{clearTimeout(timer)}
  const candidate=validateCandidatePayload(payload,surah);
  await writeFile(join(dir,String(surah)+'.json'),JSON.stringify(candidate,null,2)+'\n',{flag:'w'});
  if(surah<114&&delayMs>0)await new Promise(r=>setTimeout(r,delayMs));
 }
 return {surahs:114};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==3){console.error('Usage: node tools/export-quran-candidate.mjs <output-directory>');process.exitCode=2;}
 else await exportCandidates(resolve(process.argv[2]));
}
