// Run: node --test tests/partners.test.cjs
// Tests exercise the actual validation functions embedded in partner-editor.html.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'partner-editor.html'), 'utf8');
function extract(name, nextName) {
  const start = html.indexOf('function ' + name + '(');
  const end = html.indexOf('function ' + nextName + '(', start + 1);
  assert.ok(start >= 0 && end > start, 'Missing function boundary: ' + name);
  return html.slice(start, end);
}
const source = extract('blockedPartnerHost', 'domainWarnings') +
  extract('validateReadyForPublication', 'draw');
const context = vm.createContext({URL, Date, partners: []});
vm.runInContext(source, context);

const host = h => vm.runInContext('blockedPartnerHost(' + JSON.stringify(h) + ')', context);
const problems = entries => {
  context.partners = entries;
  return Array.from(vm.runInContext('validateReadyForPublication()', context));
};
const good = (overrides = {}) => ({
  id: 'education-1', placement: 'home', title: 'Образование',
  description: 'Проверенный образовательный проект',
  url: 'https://example.org/info', enabled: true, ...overrides
});

test('blocks internal and reserved network hosts', () => {
  for (const h of ['localhost','shop.local','router.internal','10.1.2.3','127.0.0.1',
    '192.168.1.1','172.16.0.1','169.254.1.1','100.64.0.1','224.0.0.1','[::1]']) {
    assert.equal(host(h), true, h);
  }
});
test('allows ordinary domain names and public IPv4', () => {
  for (const h of ['example.org','shop.example.com','8.8.8.8','1.1.1.1'])
    assert.equal(host(h), false, h);
});
test('accepts valid campaign', () => assert.deepEqual(problems([good()]), []));
test('rejects duplicate IDs', () => assert.match(problems([good(), good()]).join(' '), /повторяющийся ID/));
test('rejects malformed entries', () => assert.match(problems([null]).join(' '), /должна быть объектом/));
test('rejects insecure and internal links', () => {
  for (const url of ['http://example.org','https://localhost','https://192.168.0.1','https://[::1]/'])
    assert.match(problems([good({url})]).join(' '), /небезопасная/, url);
});
test('rejects bad dates and reversed intervals', () => {
  assert.match(problems([good({startAt:'not-a-date'})]).join(' '), /неверная дата начала/);
  assert.match(problems([good({startAt:'2035-01-02T00:00:00Z',endAt:'2035-01-01T00:00:00Z'})]).join(' '), /позже начала/);
});
test('rejects more than 20 campaigns', () => {
  const entries=Array.from({length:21},(_,i)=>good({id:'ad-'+i}));
  assert.match(problems(entries).join(' '), /лимит/);
});
test('rejects blank descriptions and invalid placement', () => {
  assert.match(problems([good({description:'  ',placement:'other'})]).join(' '), /пустой/);
  assert.match(problems([good({placement:'other'})]).join(' '), /место размещения/);
});

test('public app keeps real ads off during preview and labels sponsored links', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(app, /if\(asiyaPartnerPreview\)\{/);
  assert.match(app, /rel='noopener noreferrer sponsored'/);
  assert.match(app, /referrerPolicy='no-referrer'/);
  assert.match(app, /data-partner-placement="home"/);
  assert.match(app, /data-partner-placement="learning"/);
});
test('partner configuration starts with no live ads', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'partners.json'), 'utf8'));
  assert.equal(config.version, 1);
  assert.deepEqual(config.partners, []);
});
