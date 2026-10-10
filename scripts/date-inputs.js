// Date-only, single-field segmented editing inspired by OmniOwned's
// RoughDateInput. Independently implemented here without React or rough dates.
const WallosDateInputs = (() => {
  const controls = new WeakMap();
  const fields = [
    { start: 0, end: 4, length: 4, hint: 'YYYY' },
    { start: 5, end: 7, length: 2, hint: 'MM' },
    { start: 8, end: 10, length: 2, hint: 'DD' },
  ];

  function read(value) {
    const match = /^([\d ]{0,4})(?:-([\d ]{0,2}))?(?:-([\d ]{0,2}))?$/.exec(value);
    return match ? match.slice(1).map(part => (part || '').trim()) : null;
  }

  function serialize(parts) {
    return parts.every(part => !part) ? '' : parts.map((part, index) => part.padEnd(fields[index].length, ' ')).join('-');
  }

  function monthDays(parts) {
    const date = new Date(0);
    date.setUTCFullYear(Number(parts[0]) || new Date().getFullYear(), Number(parts[1]) || 1, 0);
    return date.getUTCDate();
  }

  function limits(index, parts) {
    return [1, index === 0 ? 9999 : index === 1 ? 12 : monthDays(parts)];
  }

  function validate(input, message = '') {
    if (!message && input.value && !WallosFormat.isISODate(input.value)) message = 'Enter a valid date (yyyy-mm-dd).';
    if (!message && input.value && input.min && input.value < input.min) message = `Enter a date on or after ${input.min}.`;
    if (!message && input.value && input.max && input.value > input.max) message = `Enter a date on or before ${input.max}.`;
    input.setCustomValidity(message);
    return !input.willValidate || input.validity.valid;
  }

  function initialize(input) {
    if (controls.has(input)) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'iso-date-control';
    wrapper.dir = 'ltr';
    input.before(wrapper);
    wrapper.append(input);
    input.spellcheck = false;

    const hint = document.createElement('span');
    hint.className = 'iso-date-hint';
    hint.setAttribute('aria-hidden', 'true');
    const hintParts = fields.map(() => {
      const part = document.createElement('span'); hint.append(part); return part;
    });
    const separators = [4, 7].map(position => {
      const separator = document.createElement('span');
      separator.textContent = '-'; separator.style.left = `${position}ch`;
      hint.append(separator); return separator;
    });
    const marker = document.createElement('span');
    marker.className = 'iso-date-marker';
    marker.setAttribute('aria-hidden', 'true');

    // Keep the named text input as the only submitted control. The native
    // calendar supplies complete ISO values, never locale-formatted text.
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.className = 'iso-date-native';
    picker.tabIndex = -1;
    picker.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'iso-date-picker';
    const label = input.labels?.[0]?.textContent.trim() || 'Date';
    button.setAttribute('aria-label', `${label} — Calendar`);
    button.title = button.getAttribute('aria-label');
    button.innerHTML = '<i class="fa-solid fa-calendar-days" aria-hidden="true"></i>';
    wrapper.append(marker, hint, picker, button);

    const state = { active: 0, value: input.value, writing: false, selecting: false, pointer: false, rejected: '', undo: [], redo: [] };
    const editable = () => !input.matches(':disabled') && !input.readOnly;
    const atCaret = () => input.selectionStart < 5 ? 0 : input.selectionStart < 8 ? 1 : 2;

    function render() {
      const parts = read(input.value);
      const focused = document.activeElement === input;
      hint.hidden = !parts;
      fields.forEach((field, index) => {
        const length = parts?.[index].length || 0;
        hintParts[index].textContent = field.hint.slice(length);
        hintParts[index].style.left = `${field.start + length}ch`;
        hintParts[index].classList.toggle('is-active', focused && state.active === index);
      });
      separators.forEach(separator => { separator.hidden = !!input.value; });
      marker.hidden = !focused || !!input.value;
      marker.style.left = `calc(var(--date-inset) + ${fields[state.active].start}ch)`;
      marker.style.width = `${fields[state.active].length}ch`;
      wrapper.classList.toggle('is-placeholder-selected', focused && !input.value);
      button.disabled = !editable();
      const valid = validate(input, state.rejected);
      input.setAttribute('aria-invalid', String(!valid && !!input.value));
      return valid;
    }

    function select(index, caret = false) {
      state.active = Math.max(0, Math.min(2, index));
      state.selecting = true; input.focus(); state.selecting = false;
      const field = fields[state.active];
      const end = caret ? field.start + (read(input.value)?.[state.active].length || 0) : field.end;
      input.setSelectionRange(caret ? end : field.start, end);
      render();
    }

    function write(parts, index = state.active, caret = false, remember = true) {
      const value = serialize(parts);
      if (remember && value !== input.value) {
        state.undo.push({ value: input.value, active: state.active });
        if (state.undo.length > 50) state.undo.shift();
        state.redo = [];
      }
      state.rejected = ''; state.value = value; state.writing = true;
      input.value = value;
      try { input.dispatchEvent(new Event('input', { bubbles: true })); }
      finally { state.writing = false; }
      select(index, caret);
    }

    function allSelected() {
      return input.value && input.selectionStart === 0 && input.selectionEnd === input.value.length;
    }

    function typeDigits(digits) {
      if (allSelected()) { state.active = 0; write(['', '', ''], 0, true); }
      for (const digit of digits) {
        const index = state.active, field = fields[index], parts = read(input.value) || ['', '', ''];
        const selected = input.selectionStart === field.start && input.selectionEnd === field.end;
        const previous = parts[index];
        let next = selected || previous.length >= field.length ? digit : previous + digit;
        const [min, max] = limits(index, parts);
        if (index && next.length === 1 && Number(next) > Math.floor(max / 10)) next = next.padStart(2, '0');
        parts[index] = next;
        const complete = next.length === field.length && Number(next) >= min && Number(next) <= max;
        if (complete && index < 2 && /^\d{4}$/.test(parts[0]) && /^(0[1-9]|1[0-2])$/.test(parts[1]) && parts[2]) {
          parts[2] = String(Math.min(Number(parts[2]), monthDays(parts))).padStart(2, '0');
        }
        write(parts, complete && index < 2 ? index + 1 : index, !complete || index === 2);
      }
    }

    function advance() {
      const parts = read(input.value) || ['', '', ''], index = state.active;
      if (!parts[index] || (!index && parts[0].length !== 4)) return;
      const [min, max] = limits(index, parts);
      if (Number(parts[index]) < min || Number(parts[index]) > max) return;
      parts[index] = parts[index].padStart(fields[index].length, '0');
      write(parts, Math.min(2, index + 1));
    }

    function erase(forward = false) {
      if (allSelected()) { write(['', '', ''], 0); return; }
      const parts = read(input.value) || ['', '', ''], index = state.active, field = fields[index];
      const selected = input.selectionStart <= field.start && input.selectionEnd >= field.end;
      if (selected || forward) parts[index] = '';
      else if (parts[index]) parts[index] = parts[index].slice(0, -1);
      else { select(Math.max(0, index - 1)); return; }
      write(parts, index, true);
    }

    function nudge(delta) {
      const parts = read(input.value) || ['', '', ''], index = state.active;
      const [min, max] = limits(index, parts);
      const base = Number(parts[index] || (index === 0 ? new Date().getFullYear() : min));
      const next = base + delta;
      parts[index] = String(next > max ? min : next < min ? max : next).padStart(fields[index].length, '0');
      if (index < 2 && parts[2] && /^\d{4}$/.test(parts[0]) && /^(0[1-9]|1[0-2])$/.test(parts[1])) {
        parts[2] = String(Math.min(Number(parts[2]), monthDays(parts))).padStart(2, '0');
      }
      write(parts, index);
    }

    function openPicker() {
      if (!editable()) return;
      picker.value = WallosFormat.isISODate(input.value) ? input.value : '';
      for (const attribute of ['min', 'max', 'step']) {
        if (input.hasAttribute(attribute)) picker.setAttribute(attribute, input.getAttribute(attribute));
        else picker.removeAttribute(attribute);
      }
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else { picker.focus(); picker.click(); }
    }

    function sync() {
      if (state.value !== input.value) {
        state.value = input.value; state.rejected = ''; state.active = 0;
        state.undo = []; state.redo = [];
      }
      return render();
    }
    controls.set(input, { sync });
    button.addEventListener('click', openPicker);
    picker.addEventListener('change', () => {
      write(read(picker.value) || ['', '', ''], picker.value ? 2 : 0);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    input.addEventListener('pointerdown', () => { state.pointer = true; });
    input.addEventListener('focus', () => { sync(); if (!state.selecting && !state.pointer) select(0); });
    input.addEventListener('click', () => {
      state.pointer = false;
      state.active = atCaret();
      if (input.selectionStart === input.selectionEnd) select(state.active);
      else render();
    });
    input.addEventListener('blur', () => { state.pointer = false; render(); });
    input.addEventListener('keydown', event => {
      if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); openPicker(); return; }
      if ((event.ctrlKey || event.metaKey) && editable() && ['z', 'y'].includes(event.key.toLowerCase())) {
        const redo = event.key.toLowerCase() === 'y' || event.shiftKey;
        const source = redo ? state.redo : state.undo, target = redo ? state.undo : state.redo;
        const saved = source.pop();
        if (saved) {
          event.preventDefault(); target.push({ value: input.value, active: state.active });
          write(read(saved.value) || ['', '', ''], saved.active, false, false);
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || !editable()) return;
      const actions = {
        ArrowLeft: () => select(state.active - 1), ArrowRight: () => select(state.active + 1),
        ArrowUp: () => nudge(1), ArrowDown: () => nudge(-1),
        Home: () => select(0), End: () => select(2),
        Backspace: () => erase(), Delete: () => erase(true),
        '-': advance, '/': advance, ' ': advance,
      };
      if (/^\d$/.test(event.key)) { event.preventDefault(); typeDigits(event.key); }
      else if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
    });
    input.addEventListener('beforeinput', event => {
      if (!event.cancelable || event.isComposing || !editable()) return;
      if (event.inputType === 'insertText' && /^\d+$/.test(event.data || '')) {
        event.preventDefault(); typeDigits(event.data);
      } else if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
        event.preventDefault(); erase(event.inputType === 'deleteContentForward');
      }
    });
    input.addEventListener('paste', event => {
      if (!editable()) return;
      event.preventDefault();
      const raw = event.clipboardData.getData('text/plain').trim();
      if (!raw) return;
      const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
      const date = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw);
      const parsed = date || compact;
      if (parsed) write(parsed.slice(1).map((part, index) => part.padStart(fields[index].length, '0')), 2);
      else if (/^\d+$/.test(raw) && raw.length <= fields[state.active].length) typeDigits(raw);
      else { state.rejected = 'Use a year-first date (yyyy-mm-dd).'; render(); input.reportValidity(); }
    });
    input.addEventListener('input', () => {
      if (state.writing) return;
      const raw = input.value;
      const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
      const parts = compact ? compact.slice(1) : read(raw);
      if (!parts) {
        input.value = state.value; state.rejected = 'Use a year-first date (yyyy-mm-dd).'; render(); return;
      }
      input.value = state.value;
      const incomplete = parts.findIndex((part, index) => part.length < fields[index].length);
      write(parts, incomplete < 0 ? 2 : incomplete, true);
    });
    input.addEventListener('change', sync);
    render();
  }

  function refresh(root = document) {
    let valid = true;
    root.querySelectorAll('.iso-date-input').forEach(input => {
      initialize(input);
      if (!controls.get(input).sync()) valid = false;
    });
    return valid;
  }

  function ready() {
    refresh();
    document.querySelectorAll('form').forEach(form => form.addEventListener('reset', () => setTimeout(() => refresh(form), 0)));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  return { refresh };
})();
