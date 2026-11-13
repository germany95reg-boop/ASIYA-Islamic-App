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
 assert.match(html,/const tokens=ayah\.text\.trim\(\)\.split\(\/\\s\+\/u\)/);
 assert.match(html,/reconstructed!==normalizedOriginal/);
 assert.match(html,/перевод и чтение ожидают проверки/);
});

test('word source registry is not published without review',()=>{
 assert.equal(registry.schemaVersion,1);
 assert.ok(Array.isArray(registry.entries));
 assert.equal(registry.entries.length,0);
});
