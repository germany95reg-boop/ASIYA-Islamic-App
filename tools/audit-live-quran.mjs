// Compare user-supplied Tanzil text against the exact Arabic edition ASIYA fetches.
// Technical code-point comparison, NOT scholarly certification.
// Usage: node tools/audit-live-quran.mjs <original-tanzil.txt> <report.json>
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseTanzilText} from './parse-tanzil-text.mjs';
import {validateCandidatePayload} from './export-quran-candidate.mjs';

export async function auditLiveQuran(original,{fetchImpl=fetch,delayMs=250}={}){
 const reference=parseTanzilText(original);
 const results=[];
 for(const expected of reference){
  const surah=expected.surah;
  try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),20000);
   let response;
   try{response=await fetchImpl('https://api.alquran.cloud/v1/surah/'+surah+'/quran-uthmani',{cache:'no-store',signal:controller.signal})}
   finally{clearTimeout(timer)}
   if(!response.ok)throw Error('HTTP '+response.status);
   const candidate=validateCandidatePayload(await response.json(),surah);
   const differences=[];
   for(let i=0;i<expected.ayahs.length;i++){
    const a=expected.ayahs[i].text,b=candidate.ayahs[i].text;
    if(a!==b){
     const aa=Array.from(a),bb=Array.from(b);let at=0;
     while(at<Math.min(aa.length,bb.length)&&aa[at]===bb[at])at++;
     differences.push({ayah:i+1,firstDifferentCodePoint:at+1,referenceCodePoint:aa[at]?aa[at].codePointAt(0).toString(16):null,apiCodePoint:bb[at]?bb[at].codePointAt(0).toString(16):null,reference:a,api:b});
    }
   }
   results.push({surah,status:differences.length?'different':'identical',checked:expected.ayahs.length,differences});
  }catch(error){results.push({surah,status:'error',error:String(error.message||error)})}
  if(surah<114&&delayMs>0)await new Promise(r=>setTimeout(r,delayMs));
 }
 const identical=results.filter(r=>r.status==='identical');
 const different=results.filter(r=>r.status==='different');
 const errors=results.filter(r=>r.status==='error');
 return {source:'User-provided Tanzil Uthmani text',candidate:'AlQuran Cloud /quran-uthmani',referenceSha256:createHash('sha256').update(original).digest('hex'),comparison:'exact Unicode code points, no normalization',surahsChecked:identical.length+different.length,versesChecked:[...identical,...different].reduce((n,r)=>n+r.checked,0),identicalSurahs:identical.length,differentSurahs:different.length,unavailableSurahs:errors.length,differentAyahs:different.reduce((n,r)=>n+r.differences.length,0),scholarlyCertified:false,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==4){console.error('Usage: node tools/audit-live-quran.mjs <original-tanzil.txt> <report.json>');process.exitCode=2;}
 else{
  const report=await auditLiveQuran(readFileSync(resolve(process.argv[2])));
  writeFileSync(resolve(process.argv[3]),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({surahsChecked:report.surahsChecked,versesChecked:report.versesChecked,identicalSurahs:report.identicalSurahs,differentSurahs:report.differentSurahs,unavailableSurahs:report.unavailableSurahs,differentAyahs:report.differentAyahs},null,2));
  if(report.differentSurahs||report.unavailableSurahs)process.exitCode=1;
 }
}
