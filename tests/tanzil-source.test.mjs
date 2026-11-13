import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPinnedTanzil} from '../tools/verify-pinned-tanzil.mjs';
const manifest=JSON.parse(readFileSync(new URL('../quran-sources/tanzil-uthmani-1.1.json',import.meta.url),'utf8'));
test('rejects wrong edition before any parsing',()=>{
 assert.throws(()=>verifyPinnedTanzil(Buffer.from('1|1|بِسْمِ'),{...manifest,edition:'wrong'}),/Unexpected Quran edition/);
});
test('rejects wrong byte length',()=>{
 assert.throws(()=>verifyPinnedTanzil(Buffer.from('1|1|بِسْمِ'),manifest),/Original file size differs/);
});
test('rejects matching-size content with wrong checksum',()=>{
 const fake=Buffer.alloc(manifest.bytes,0x20);
 assert.throws(()=>verifyPinnedTanzil(fake,manifest),/SHA-256 mismatch/);
});
test('rejects non-buffer data',()=>{
 assert.throws(()=>verifyPinnedTanzil('1|1|بِسْمِ',manifest),/Original bytes required/);
});
test('local reader has a strict no-network policy and verse navigation',()=>{
 const html=readFileSync(new URL('../tanzil-reader.html',import.meta.url),'utf8');
 assert.match(html,/connect-src &#39;none&#39;|connect-src 'none'/);
 assert.match(html,/default-src &#39;none&#39;|default-src 'none'/);
 assert.match(html,/crypto\.subtle\.digest\('SHA-256',bytes\)/);
 assert.match(html,/digest!==EXPECTED/);
 assert.match(html,/new TextDecoder\('utf-8',\{fatal:true\}\)/);
 assert.match(html,/textContent=items\[i\]/);
 assert.match(html,/scrollIntoView/);
});
