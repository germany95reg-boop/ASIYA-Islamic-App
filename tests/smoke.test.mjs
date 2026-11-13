// ASIYA static release smoke tests. Run: node --test tests/smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {compareExactQuranText,validateReferenceProvenance} from './compare-quran-reference.mjs';
import {compareCompleteQuran,VERSE_COUNTS} from './compare-complete-quran.mjs';
import {validateCandidatePayload} from '../tools/export-quran-candidate.mjs';
import {parseTanzilText} from '../tools/parse-tanzil-text.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
const registry=JSON.parse(readFileSync(new URL('../quran-word-sources.json',import.meta.url),'utf8'));

test('PWA has a launchable entry point',()=>{
 assert.match(html,/<html[^>]+lang="ru"/);
 assert.match(html,/<link rel="manifest" href="manifest\.webmanifest"/);
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.display,'standalone');
});

test('inline application JavaScript parses',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 assert.ok(scripts.length>0,'No inline scripts found');
 for(const script of scripts)new vm.Script(script);
});

test('service worker JavaScript parses and supports navigation refresh',()=>{
 new vm.Script(sw);
 assert.match(sw,/request\.mode==='navigate'/);
 assert.match(sw,/cache:'no-store'/);
});

test('Quran word mode preserves the verse text and does not invent translations',()=>{
 assert.match(html,/p\.textContent=ayah\.text/);
 assert.ok(html.includes(String.raw`const tokens=ayah.text.trim().split(/\s+/u)`));
 assert.match(html,/reconstructed!==normalizedOriginal/);
 assert.match(html,/перевод и чтение ожидают проверки/);
});

test('word source registry is not published without review',()=>{
 assert.equal(registry.schemaVersion,1);
 assert.ok(Array.isArray(registry.entries));
 assert.equal(registry.entries.length,0);
});

test('diagnostics checks three Quran editions and offers a copy fallback',()=>{
 for(const edition of ['quran-uthmani','ru.kuliev','en.transliteration'])assert.ok(html.includes("'"+edition+"'"));
 assert.ok(html.includes('asiya-run-diagnostics'));
 assert.ok(html.includes('asiya-copy-diagnostics'));
 assert.ok(html.includes('asiya-diagnostics-copy-fallback'));
 assert.ok(html.includes('fallback.select()'));
});

test('Quran API refreshes online before using offline fallback',()=>{
 assert.ok(sw.includes('response=await fetch(request)'));
 assert.ok(sw.includes('if(saved)return saved'));
 assert.match(sw,/response\.ok&&response\.type!=='opaque'/);
 assert.match(sw,/payload\.code===200/);
 assert.match(sw,/QURAN_CACHE_LIMIT=18/);
});

test('offline Quran library and service worker use the same cache',()=>{
 const cacheName=sw.match(/const QURAN_CACHE='([^']+)'/)?.[1];
 assert.ok(cacheName,'Service worker Quran cache missing');
 assert.ok(sw.includes("const QURAN_OFFLINE_CACHE='asiya-quran-offline-v1'"));
 assert.ok(html.includes("caches.open('asiya-quran-offline-v1')"),'Offline library must use durable Quran cache');
 assert.ok(sw.includes('const pinned=await offlineCache.match(request)')&&sw.includes('const automatic=await cache.match(request)'),'Service worker must read both durable and automatic caches');
 assert.match(html,/sameQuranVerseIndex\(results\[0\]\.value,results\[i\]\.value\)/);
 assert.match(html,/validateQuranEdition\(json\.data\?\.ayahs,edition\)/);
});

test('Quran API identity is verified before displaying an edition',()=>{
 assert.ok(html.includes("Number(json.data?.number)!==num"),'Reader must reject responses for a different surah');
 assert.ok(html.includes("Number(payload.data?.number)!==1"),'Al-Fatiha diagnostics must check surah identity');
 assert.ok(html.includes("sameQuranVerseIndex(results[0].value,results[i].value)"),'Edition alignment check must remain active');
});

test('Quran responses must contain the full declared number of verses',()=>{
 assert.ok(html.includes("json.data.numberOfAyahs!==json.data?.ayahs?.length"),'Reader must reject incomplete surah');
 assert.ok(html.includes("payload.data.numberOfAyahs===ayahs?.length"),'Offline library must reject incomplete surah');
 assert.ok(html.includes("Number(payload.data?.numberOfAyahs)!==7"),'Al-Fatiha diagnostics must check verse count');
 assert.ok(sw.includes('payload.data.numberOfAyahs===ayahs.length'),'Service worker must not cache incomplete surah');
});

test('independent 114-surah Kufan/Hafs verse counts are consistent across app and service worker',()=>{
 const pattern=/const QURAN_VERSE_COUNTS=Object\.freeze\(\[([\d,]+)\]\)/;
 const reader=html.match(pattern),worker=sw.match(pattern);
 assert.ok(reader&&worker,'Both Quran consumers must contain a verse count reference');
 assert.equal(reader[1],worker[1],'Reader and service worker counts must match');
 const counts=reader[1].split(',').map(Number);
 assert.equal(counts.length,114);
 assert.equal(counts.reduce((a,b)=>a+b,0),6236);
 assert.equal(counts[0],7);
 assert.equal(counts[1],286);
 assert.equal(counts[113],6);
 assert.ok(html.includes('json.data?.ayahs?.length!==QURAN_VERSE_COUNTS[num-1]'));
 assert.ok(html.includes('ayahs?.length===QURAN_VERSE_COUNTS[num-1]'));
 assert.ok(sw.includes('ayahs.length===QURAN_VERSE_COUNTS['));
});

test('corrupted Quran cache is rejected before offline fallback',()=>{
 assert.ok(sw.includes('async function validQuranCacheResponse(response,url)'));
 assert.ok(sw.includes('ayahs.length===QURAN_VERSE_COUNTS[num-1]'));
 assert.ok(sw.includes('a?.numberInSurah===i+1'));
 assert.ok(sw.includes('if(pinned&&!pinnedValid)await offlineCache.delete(request)'));
});

test('invalid Quran API response uses only verified offline fallback',()=>{
 assert.ok(sw.includes("if(response.ok&&response.type!=='opaque'&&await validQuranCacheResponse(response,url))"));
 assert.ok(sw.includes('if(saved)return saved'));
 assert.ok(sw.includes('if(automatic&&!automaticValid)await cache.delete(request)'));
});

test('manual Quran downloads survive automatic cache eviction and app upgrades',()=>{
 assert.ok(sw.includes('key!==QURAN_OFFLINE_CACHE'),'Activation must preserve durable offline cache');
 assert.ok(sw.includes('const QURAN_CACHE_LIMIT=18'),'Automatic cache remains bounded');
 assert.ok(html.includes("caches.open('asiya-quran-offline-v1')"));
});

test('legacy Quran cache migration verifies full surahs before copying',()=>{
 assert.ok(html.includes('async function migrateLegacyQuranCache()'));
 assert.ok(html.includes("caches.open('asiya-quran-v1')"));
 assert.ok(html.includes("caches.open('asiya-quran-offline-v1')"));
 assert.ok(html.includes('if(!editions.every(edition=>parts.has(edition)))continue'));
 assert.ok(html.includes('await validOfflineQuranResponse(response,num)'));
 assert.ok(html.includes('await destination.put(item.request,item.response.clone())'));
 assert.ok(html.includes('await validOfflineQuranResponse(saved,num)'));
 assert.ok(html.includes('await ensureLegacyQuranMigration()'));
 assert.ok(!html.includes('Офлайн-кеш ограничен 18 частями.'));
});

test('offline library reports measured download size and estimated browser quota',()=>{
 assert.ok(html.includes("response.clone().arrayBuffer()).byteLength"));
 assert.ok(html.includes("navigator.storage.estimate()"));
 assert.ok(html.includes("remaining<10*1024*1024"));
 assert.ok(html.includes("квота браузера не равна свободному месту телефона"));
});

test('manual Quran downloads are never automatically evicted at 18 cache parts',()=>{
 assert.ok(!html.includes('let evictedSurahs=0'));
 assert.ok(!html.includes('if(keys.length>18)'));
 assert.ok(html.includes('Ранее скачанные суры сохранены.'));
 assert.ok(html.includes("error?.name==='QuotaExceededError'"));
 assert.ok(html.includes('Очистить все офлайн-суры'));
});

test('individual offline surah removal shows size and requires confirmation',()=>{
 assert.ok(html.includes("surahBytes+=(await response.clone().arrayBuffer()).byteLength"));
 assert.ok(html.includes("row.append(surahSize)"));
 assert.ok(html.includes("window.confirm('Удалить офлайн-копию"));
 assert.ok(html.includes("Избранное и отметки чтения сохранятся."));
 assert.ok(html.includes("await cache.delete(url)"));
});

test('Quran cache validator rejects altered verse counts, numbering and surah identities',async()=>{
 const context=vm.createContext({self:{addEventListener(){}}});
 vm.runInContext(sw,context);
 const validate=vm.runInContext('validQuranCacheResponse',context);
 const url=new URL('https://api.alquran.cloud/v1/surah/1/quran-uthmani');
 const makeResponse=(payload)=>({ok:true,clone(){return {json:async()=>payload}}});
 const good=()=>({code:200,data:{number:1,numberOfAyahs:7,ayahs:Array.from({length:7},(_,i)=>({numberInSurah:i+1,number:i+1,text:'بِسْمِ اللَّهِ'}))}});
 assert.equal(await validate(makeResponse(good()),url),true);
 const truncated=good();truncated.data.ayahs.pop();assert.equal(await validate(makeResponse(truncated),url),false);
 const wrongSurah=good();wrongSurah.data.number=2;assert.equal(await validate(makeResponse(wrongSurah),url),false);
 const wrongOrder=good();wrongOrder.data.ayahs[3].numberInSurah=7;assert.equal(await validate(makeResponse(wrongOrder),url),false);
 const empty=good();empty.data.ayahs[2].text='';assert.equal(await validate(makeResponse(empty),url),false);
 const wrongCount=good();wrongCount.data.numberOfAyahs=8;assert.equal(await validate(makeResponse(wrongCount),url),false);
 const missingGlobalNumber=good();delete missingGlobalNumber.data.ayahs[0].number;assert.equal(await validate(makeResponse(missingGlobalNumber),url),false);
 const nonArabic=good();nonArabic.data.ayahs[0].text='example';assert.equal(await validate(makeResponse(nonArabic),url),false);
 const excessiveText=good();excessiveText.data.ayahs[0].text='ب'.repeat(20001);assert.equal(await validate(makeResponse(excessiveText),url),false);
 const wrongEditionUrl=new URL('https://api.alquran.cloud/v1/surah/1/ru.kuliev');
 assert.equal(await validate(makeResponse(nonArabic),wrongEditionUrl),true);
});

test('exact Quran reference comparison rejects even a single changed diacritic',()=>{
 const reference={edition:'quran-uthmani',surah:1,ayahs:[{numberInSurah:1,text:'بِسْمِ اللَّهِ'},{numberInSurah:2,text:'الْحَمْدُ'}]};
 const candidate=structuredClone(reference);
 assert.deepEqual(compareExactQuranText(reference,candidate),{matched:2});
 candidate.ayahs[0].text='بَسْمِ اللَّهِ';
 assert.throws(()=>compareExactQuranText(reference,candidate),/Exact Quran text mismatch/);
 candidate.ayahs[0].text=reference.ayahs[0].text;
 candidate.ayahs.reverse();
 assert.throws(()=>compareExactQuranText(reference,candidate),/Verse order mismatch/);
 candidate.ayahs.reverse();candidate.surah=2;
 assert.throws(()=>compareExactQuranText(reference,candidate),/Surah identity mismatch/);
 const metadata={sourceName:'Example only',sourceUrl:'https://example.org',edition:'quran-uthmani',license:'Example',reviewedBy:'Test',reviewedAt:'2026-11-13',sha256:'a'.repeat(64)};
 assert.equal(validateReferenceProvenance(metadata),true);
 delete metadata.license;
 assert.throws(()=>validateReferenceProvenance(metadata),/Missing reference provenance/);
});

test('complete Quran comparator requires exactly 114 surahs and 6236 verses',()=>{
 assert.equal(VERSE_COUNTS.length,114);
 assert.equal(VERSE_COUNTS.reduce((a,b)=>a+b,0),6236);
 assert.throws(()=>compareCompleteQuran('/no-reviewed-quran-reference','/no-quran-candidate'),/ENOENT/);
});

test('API candidate export keeps Arabic text unmodified and rejects corrupted surahs',()=>{
 const payload={code:200,data:{number:1,numberOfAyahs:7,ayahs:Array.from({length:7},(_,i)=>({number:i+1,numberInSurah:i+1,text:'بِسْمِ اللَّهِ'}))}};
 const result=validateCandidatePayload(payload,1);
 assert.equal(result.surah,1);
 assert.equal(result.edition,'quran-uthmani');
 assert.equal(result.ayahs[0].text,payload.data.ayahs[0].text);
 assert.throws(()=>validateCandidatePayload(payload,2),/Invalid API candidate/);
 const corrupted=structuredClone(payload);corrupted.data.ayahs[0].text='plain text';
 assert.throws(()=>validateCandidatePayload(corrupted,1),/Invalid API candidate/);
});

test('Tanzil parser rejects missing, duplicate and malformed Quran verses',()=>{
 assert.throws(()=>parseTanzilText(Buffer.from('1|1|بِسْمِ اللَّهِ\n','utf8')),/Missing verses/);
 assert.throws(()=>parseTanzilText(Buffer.from('1|1|بِسْمِ اللَّهِ\n1|1|بِسْمِ اللَّهِ\n','utf8')),/Duplicate verse/);
 assert.throws(()=>parseTanzilText(Buffer.from('1|1|not Arabic\n','utf8')),/Missing Arabic/);
 assert.throws(()=>parseTanzilText(Buffer.from('invalid row\n','utf8')),/Unexpected Tanzil row format/);
});

test('corrupt pinned Quran cache cannot hide a valid automatic fallback',()=>{
 assert.ok(sw.includes('const pinnedValid=pinned&&await validQuranCacheResponse(pinned,url)'));
 assert.ok(sw.includes('const automaticValid=automatic&&await validQuranCacheResponse(automatic,url)'));
 assert.ok(sw.includes('const saved=pinnedValid?pinned:automaticValid?automatic:null'));
 assert.ok(!sw.includes('await cache.delete(request);await cache.put(request,response.clone())'));
});

test('deleted offline surahs cannot be restored by legacy cache migration',()=>{
 assert.ok(html.includes("localStorage.getItem('asiya-quran-legacy-migration-v1')==='complete'"));
 assert.ok(html.includes("localStorage.setItem('asiya-quran-legacy-migration-v1','complete')"));
 assert.ok(html.includes("const legacy=await caches.open('asiya-quran-v1');for(const request of await legacy.keys())await legacy.delete(request)"));
 assert.ok(html.includes("await legacy.delete(url);quranEditionCache.delete(num+':'+edition)"));
});

test('live Quran audit module exists and requires exact text comparison',()=>{ const source=readFileSync(new URL('../tools/audit-live-quran.mjs',import.meta.url),'utf8');assert.ok(source.includes('if(a!==b)'));assert.ok(source.includes("status:'error'"));assert.ok(source.includes('scholarlyCertified:false'));assert.ok(source.includes('referenceSha256:'));});
