// Run with Playwright on NODE_PATH, or installed locally for development.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const playwright = require('playwright');
const root = path.resolve(__dirname, '../..');
const engine = process.env.WALLOS_BROWSER || 'chromium';

async function paste(page, value) {
  await page.locator('#date').evaluate((input, text) => {
    const clipboard = new DataTransfer(); clipboard.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    // Firefox strips constructor-supplied clipboard data from synthetic events.
    Object.defineProperty(event, 'clipboardData', { value: clipboard });
    input.dispatchEvent(event);
  }, value);
}

async function segment(page, start, end) {
  const input = page.locator('#date');
  await input.focus();
  await input.evaluate((element, range) => element.setSelectionRange(...range), [start, end]);
  // Select the requested segment through the same click handler as the UI.
  await input.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

(async () => {
  const browser = await playwright[engine].launch({ headless: true });
  let cases = 0;
  try {
    for (const locale of ['en-US', 'en-GB', 'ar-SA']) {
      const context = await browser.newContext({ locale, viewport: { width: 1100, height: 700 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setContent(`<html dir="${locale === 'ar-SA' ? 'rtl' : 'ltr'}"><head><style>
        ${fs.readFileSync(path.join(root, 'styles/theme.css'), 'utf8')}
        ${fs.readFileSync(path.join(root, 'styles/styles.css'), 'utf8')}
        ${fs.readFileSync(path.join(root, 'styles/dark-theme.css'), 'utf8')}
        .fixture { width: 350px; margin: 30px; }
        </style></head><body><form class="fixture">
        <label for="date">Date</label><input id="date" name="date" type="text" required
          class="iso-date-input" placeholder="yyyy-mm-dd" inputmode="numeric" dir="ltr"
          pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}">
        <button id="save" type="submit">Save</button><button id="reset" type="reset">Reset</button>
        </form></body></html>`);
      await page.addScriptTag({ path: path.join(root, 'scripts/formatting.js') });
      await page.addScriptTag({ path: path.join(root, 'scripts/date-inputs.js') });
      const input = page.locator('#date');
      assert.equal(await input.evaluate(element => getComputedStyle(element, '::placeholder').opacity), '0',
        'native placeholders never overlap the segmented hints, including dark theme');
      await input.focus();
      assert.equal(await input.locator('..').getAttribute('dir'), 'ltr');
      await page.keyboard.type('2026');
      assert.deepEqual(await input.evaluate(element => [element.selectionStart, element.selectionEnd]), [5, 7]);
      await page.keyboard.type('0228');
      assert.equal(await input.inputValue(), '2026-02-28');
      assert(await input.evaluate(element => element.checkValidity()));
      await page.keyboard.press('Home');
      assert.deepEqual(await input.evaluate(element => [element.selectionStart, element.selectionEnd]), [0, 4]);
      await page.keyboard.press('End');
      assert.deepEqual(await input.evaluate(element => [element.selectionStart, element.selectionEnd]), [8, 10]);

      await page.keyboard.press('ArrowLeft'); // month
      await page.keyboard.press('ArrowLeft'); // year
      await page.keyboard.type('2028');
      assert.equal(await input.inputValue(), '2028-02-28');
      await page.keyboard.press('ArrowRight'); // day
      await page.keyboard.press('ArrowUp');
      assert.equal(await input.inputValue(), '2028-02-29');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.type('2026');
      assert.equal(await input.inputValue(), '2026-02-28', 'year edits clamp leap days only when complete');

      await segment(page, 5, 5);
      await page.keyboard.press('ArrowUp');
      assert.equal(await input.inputValue(), '2026-03-28');
      await page.keyboard.press('Control+z');
      assert.equal(await input.inputValue(), '2026-02-28');
      await page.keyboard.press('Control+Shift+z');
      assert.equal(await input.inputValue(), '2026-03-28');

      await segment(page, 0, 0);
      await page.keyboard.press('Backspace');
      assert(!(await input.evaluate(element => element.checkValidity())), 'a missing year cannot be submitted');
      await page.keyboard.type('2027');
      assert.equal(await input.inputValue(), '2027-03-28', 'clearing and replacing one segment retains the others');

      await page.keyboard.press('Control+a'); await page.keyboard.press('Backspace');
      await page.keyboard.type('2026/1/9');
      assert.equal(await input.inputValue(), '2026-01-09', 'single-digit segments are padded on separators');
      await paste(page, '2027/2/1');
      assert.equal(await input.inputValue(), '2027-02-01');
      await paste(page, '20281231');
      assert.equal(await input.inputValue(), '2028-12-31');
      await paste(page, '18/10/2026');
      assert.equal(await input.inputValue(), '2028-12-31', 'ambiguous day-first paste is not interpreted');
      assert(!(await input.evaluate(element => element.checkValidity())));
      await paste(page, '2026-02-30');
      assert(!(await input.evaluate(element => element.checkValidity())), 'invalid calendar days remain invalid');
      await paste(page, '2028-02-29');
      assert(await input.evaluate(element => element.checkValidity()));

      await input.evaluate(element => { element.value = ''; });
      await page.evaluate(() => WallosDateInputs.refresh());
      await input.focus();
      for (const digit of '20261018') {
        await input.evaluate((element, text) => element.dispatchEvent(new InputEvent('beforeinput', {
          inputType: 'insertText', data: text, bubbles: true, cancelable: true,
        })), digit);
      }
      assert.equal(await input.inputValue(), '2026-10-18', 'mobile beforeinput follows the same year-first sequence');
      assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('date')), ['2026-10-18']);

      await input.evaluate(element => { element.value = '2027-01-31'; });
      await page.evaluate(() => WallosDateInputs.refresh());
      await segment(page, 5, 5); await page.keyboard.press('ArrowUp');
      assert.equal(await input.inputValue(), '2027-02-28', 'month adjustments respect the month length');
      await input.evaluate(element => { element.min = '2027-01-01'; element.max = '2027-12-31'; });
      const picker = input.locator('..').locator('input[type=date]');
      await picker.evaluate(element => { element.showPicker = () => { element.dataset.opened = element.value; }; });
      await input.locator('..').locator('.iso-date-picker').click();
      assert.equal(await picker.getAttribute('data-opened'), '2027-02-28');
      assert.equal(await picker.getAttribute('min'), '2027-01-01');
      await picker.evaluate(element => { element.value = '2027-04-05'; element.dispatchEvent(new Event('change')); });
      assert.equal(await input.inputValue(), '2027-04-05');
      assert.deepEqual(await page.evaluate(() => new FormData(document.querySelector('form')).getAll('date')), ['2027-04-05']);
      await picker.evaluate(element => { element.value = ''; element.dispatchEvent(new Event('change')); });
      await page.keyboard.type('20270405');
      assert.equal(await input.inputValue(), '2027-04-05', 'clearing the calendar restarts entry at the year');

      await input.evaluate(element => { element.readOnly = true; }); await page.evaluate(() => WallosDateInputs.refresh());
      assert(await input.locator('..').locator('.iso-date-picker').isDisabled());
      await input.focus(); await page.keyboard.type('2000');
      assert.equal(await input.inputValue(), '2027-04-05');
      await input.evaluate(element => { element.readOnly = false; element.removeAttribute('min'); element.removeAttribute('max'); });
      await page.evaluate(() => WallosDateInputs.refresh());
      assert(!(await input.locator('..').locator('.iso-date-picker').isDisabled()));
      await page.click('#reset');
      await page.waitForFunction(() => document.querySelector('#date').value === '' && document.querySelector('.iso-date-hint').textContent.includes('YYYY'));
      assert.equal(await input.inputValue(), '');

      await input.evaluate(element => { element.value = '2030-12-25'; }); await page.evaluate(() => WallosDateInputs.refresh());
      await input.focus(); await page.keyboard.press('Control+z');
      assert.equal(await input.inputValue(), '2030-12-25', 'programmatic edit/reset starts a fresh undo history');
      assert.equal(await page.locator('.iso-date-control').count(), 1, 'refresh never duplicates the widget');
      assert.deepEqual(errors, []);
      await context.close(); cases++;
    }
    console.log(`Segmented date editing, clipboard, mobile input, calendar and form integration passed in ${cases} locales (${engine}).`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
