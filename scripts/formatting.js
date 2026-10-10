const WallosFormat = (() => {
  const numberFormatters = new Map();
  const currencyFormatters = new Map();
  const locale = () => navigator.language || 'en-US';

  function number(value, options = {}, language = locale()) {
    const key = JSON.stringify([language, options]);
    if (!numberFormatters.has(key)) {
      numberFormatters.set(key, new Intl.NumberFormat(language, options));
    }
    return numberFormatters.get(key).formatToParts(value)
      .map(part => part.type === 'group' ? '\u202f' : part.value).join('');
  }

  function currency(value, code, language = locale(), symbol = code) {
    try {
      const key = JSON.stringify([language, code]);
      if (!currencyFormatters.has(key)) {
        currencyFormatters.set(key, new Intl.NumberFormat(language, { style: 'currency', currency: code }));
      }
      const parts = currencyFormatters.get(key).formatToParts(value);
      const firstDigit = parts.findIndex(part => part.type === 'integer');
      return parts.map((part, index) => {
        if (part.type === 'group') return '\u202f';
        if (part.type === 'literal') return part.value.replace(/[\u0020\u00a0\u202f]/g, '');
        if (part.type === 'currency') return index < firstDigit ? `${part.value}\u00a0` : `\u00a0${part.value}`;
        return part.value;
      }).join('');
    } catch (error) {
      const amount = number(Math.abs(Number(value)), { minimumFractionDigits: 2, maximumFractionDigits: 2 }, language);
      return `${Number(value) < 0 ? '-' : ''}${symbol ? `${symbol}\u00a0` : ''}${amount}`;
    }
  }

  function date(value) {
    if (!value) return '';
    const parsed = value instanceof Date ? value : new Date(value + 'T00:00:00');
    if (isNaN(parsed)) return String(value);
    const year = String(parsed.getFullYear()).padStart(4, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isISODate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match || Number(match[1]) === 0) return false;
    const [, year, month, day] = match.map(Number);
    const parsed = new Date(0);
    parsed.setUTCFullYear(year, month - 1, day);
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  }

  return { date, isISODate, number, currency };
})();
