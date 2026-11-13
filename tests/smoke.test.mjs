// ASIYA static release smoke tests. Run: node --test tests/smoke.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

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
 assert.match(sw,/const saved=await cache\.match\(request\);let response;try\{response=await fetch\(request\)\}catch\(error\)\{if\(saved\)return saved;throw error\}/);
 assert.match(sw,/response\.ok&&response\.type!=='opaque'/);
 assert.match(sw,/payload\.code===200/);
 assert.match(sw,/QURAN_CACHE_LIMIT=18/);
});

test('offline Quran library and service worker use the same cache',()=>{
 const cacheName=sw.match(/const QURAN_CACHE='([^']+)'/)?.[1];
 assert.ok(cacheName,'Service worker Quran cache missing');
 assert.ok(html.includes("caches.open('"+cacheName+"')"),'Offline library cache must match service worker');
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
 assert.ok(sw.includes("payload.data.numberOfAyahs===payload.data?.ayahs?.length"),'Service worker must not cache incomplete surah');
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
 assert.ok(sw.includes('payload.data.ayahs.length===QURAN_VERSE_COUNTS['));
});
