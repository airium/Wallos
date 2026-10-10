const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../scripts/formatting.js'), 'utf8');
const originalTimezone = process.env.TZ;
for (const timezone of ['UTC', 'Asia/Singapore', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
  process.env.TZ = timezone;
  const context = vm.createContext({});
  vm.runInContext(source, context);
  for (const date of ['2026-01-01', '2027-12-31', '2028-02-29']) {
    context.value = date;
    assert.equal(vm.runInContext('WallosFormat.date(value)', context), date, timezone);
  }
  assert.equal(vm.runInContext('WallosFormat.date(null)', context), '');
  assert.equal(vm.runInContext('WallosFormat.date("not-a-date")', context), 'not-a-date');
  assert.equal(vm.runInContext('WallosFormat.date(new Date(2026, 0, 1))', context), '2026-01-01');
  for (const date of ['2028-02-29', '2000-02-29', '0042-01-01', '2026-12-31']) {
    context.value = date;
    assert.equal(vm.runInContext('WallosFormat.isISODate(value)', context), true, date);
  }
  for (const date of ['', '18/10/2026', '2026-2-01', '2026-02-29', '1900-02-29', '2026-02-30', '2026-13-01', '2026-00-01', '2026-01-00', '0000-01-01']) {
    context.value = date;
    assert.equal(vm.runInContext('WallosFormat.isISODate(value)', context), false, date);
  }
}
if (originalTimezone === undefined) delete process.env.TZ;
else process.env.TZ = originalTimezone;
console.log('ISO date formatting and validation passed across 4 time zones.');

const context = vm.createContext({ navigator: { language: 'en-US' } });
vm.runInContext(source, context);
const format = expression => vm.runInContext(expression, context);
assert.equal(format('WallosFormat.currency(1234.56, "USD")'), '$\u00a01\u202f234.56');
assert.equal(format('WallosFormat.currency(-1234.56, "USD")'), '-$\u00a01\u202f234.56');
assert.equal(format('WallosFormat.currency(1234.56, "EUR", "fr-FR")'), '1\u202f234,56\u00a0€');
assert.equal(format('WallosFormat.currency(1234.56, "JPY")'), '¥\u00a01\u202f235');
assert.equal(format('WallosFormat.currency(0.5, "USD")'), '$\u00a00.50');
assert.equal(format('WallosFormat.currency(0, "USD")'), '$\u00a00.00');
assert.equal(format('WallosFormat.currency(1234.56, "not-a-currency", "en-US", "unit")'), 'unit\u00a01\u202f234.56');
assert.equal(format('WallosFormat.number(1234567.89)'), '1\u202f234\u202f567.89');
assert(format('WallosFormat.currency(1.234, "BHD")').includes('1.234'));
console.log('Currency spacing, grouping, signs, precision and fallback checks passed.');
