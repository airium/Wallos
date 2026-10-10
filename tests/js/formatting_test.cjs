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
