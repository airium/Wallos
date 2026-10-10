const WallosDateInputs = (() => {
  function validate(input) {
    let message = '';
    if (input.value && !WallosFormat.isISODate(input.value)) {
      message = 'Enter a valid date (yyyy-mm-dd).';
    } else if (input.value && input.min && input.value < input.min) {
      message = `Enter a date on or after ${input.min}.`;
    } else if (input.value && input.max && input.value > input.max) {
      message = `Enter a date on or before ${input.max}.`;
    }
    input.setCustomValidity(message);
    return input.validity.valid;
  }

  function refresh(root = document) {
    let valid = true;
    root.querySelectorAll('.iso-date-input').forEach(input => {
      if (!validate(input) && !input.disabled) valid = false;
    });
    return valid;
  }

  function initialize(input) {
    if (input.closest('.iso-date-control')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'iso-date-control';
    input.before(wrapper);
    wrapper.append(input);

    // The text field remains the named, validated form control. The native
    // picker is only an editor and never adds a duplicate field to FormData.
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.className = 'iso-date-native';
    picker.tabIndex = -1;
    picker.setAttribute('aria-hidden', 'true');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'iso-date-picker';
    const label = input.labels?.[0]?.textContent.trim() || 'yyyy-mm-dd';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = '<i class="fa-solid fa-calendar-days" aria-hidden="true"></i>';
    wrapper.append(picker, button);

    button.addEventListener('click', () => {
      if (input.disabled || input.readOnly) return;
      picker.value = WallosFormat.isISODate(input.value) ? input.value : '';
      for (const attribute of ['min', 'max', 'step']) {
        if (input.hasAttribute(attribute)) picker.setAttribute(attribute, input.getAttribute(attribute));
      }
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    });
    picker.addEventListener('change', () => {
      input.value = picker.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    });
    input.addEventListener('input', () => {
      // Numeric mobile keyboards need no hyphen key: insert ISO separators
      // while typing at the end, without rewriting edits in the middle.
      const value = input.value;
      const digits = value.replace(/-/g, '');
      const separators = [...value].every((character, index) => /\d/.test(character)
        || (character === '-' && (index === 4 || index === 7)));
      if (input.selectionStart === value.length && separators && digits.length <= 8) {
        input.value = digits.slice(0, 4)
          + (digits.length > 4 ? '-' + digits.slice(4, 6) : '')
          + (digits.length > 6 ? '-' + digits.slice(6, 8) : '');
      }
      validate(input);
    });
    input.addEventListener('change', () => validate(input));
    validate(input);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.iso-date-input').forEach(initialize);
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('reset', () => setTimeout(() => refresh(form), 0));
    });
  });
  return { refresh };
})();
