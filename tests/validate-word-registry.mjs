import fs from 'node:fs';
import assert from 'node:assert/strict';

const registry = JSON.parse(fs.readFileSync(new URL('../quran-word-sources.json', import.meta.url), 'utf8'));
assert.equal(registry.schemaVersion, 1);
assert.ok(Array.isArray(registry.entries), 'entries must be an array');
const required = ['reference','wordIndex','arabicToken','meaningRu','sourceName','sourceUrl','license','reviewedBy','reviewedAt'];
const seen = new Set();
for (const [i, entry] of registry.entries.entries()) {
  const label = 'entry ' + (i + 1);
  for (const field of required) assert.ok(entry[field] !== undefined && entry[field] !== null && String(entry[field]).trim(), label + ': missing ' + field);
  assert.match(entry.reference, /^(?:[1-9]|[1-9][0-9]{1,2}):[1-9][0-9]*$/, label + ': invalid reference');
  const [surah] = entry.reference.split(':').map(Number);
  assert.ok(surah <= 114, label + ': invalid surah');
  assert.ok(Number.isSafeInteger(entry.wordIndex) && entry.wordIndex > 0, label + ': invalid word index');
  assert.match(entry.arabicToken, /[\u0621-\u064A]/u, label + ': no Arabic letters');
  assert.match(entry.sourceUrl, /^https:\/\/[^\s/]+\.[^\s/]+/i, label + ': source URL must be HTTPS');
  assert.match(entry.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, label + ': invalid review date');
  assert.ok(!Number.isNaN(Date.parse(entry.reviewedAt + 'T00:00:00Z')), label + ': invalid date');
  assert.ok(!/^(unknown|pending|todo|tbd|unverified|none)$/i.test(entry.license.trim()), label + ': license not verified');
  const key = entry.reference + '#' + entry.wordIndex;
  assert.ok(!seen.has(key), label + ': duplicate word annotation ' + key);
  seen.add(key);
}
if (registry.entries.length === 0) assert.equal(registry.status, 'draft-no-approved-entries');
console.log('Word registry structural/provenance checks passed: ' + registry.entries.length + ' entries. This does NOT certify translation, license validity, Quran edition matching, or tajwid.');
