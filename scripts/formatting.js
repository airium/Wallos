const WallosFormat = (() => {
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

  return { date, isISODate };
})();
