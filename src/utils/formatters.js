export const SUPPORTED_CURRENCIES = {
  ILS: { code: 'ILS', symbol: '₪', label: 'שקל (₪)', name: 'שקל ישראלי' },
  USD: { code: 'USD', symbol: '$', label: 'דולר ($)', name: 'דולר אמריקאי' },
  EUR: { code: 'EUR', symbol: '€', label: 'יורו (€)', name: 'אירו' }
};

// Backward-compatibility aliases if old data had numeric indexes
SUPPORTED_CURRENCIES['0'] = SUPPORTED_CURRENCIES.ILS;
SUPPORTED_CURRENCIES['1'] = SUPPORTED_CURRENCIES.USD;
SUPPORTED_CURRENCIES['2'] = SUPPORTED_CURRENCIES.EUR;

export const CURRENCY_LIST = [
  SUPPORTED_CURRENCIES.ILS,
  SUPPORTED_CURRENCIES.USD,
  SUPPORTED_CURRENCIES.EUR
];

export const normalizeCurrencyCode = (cur) => {
  if (cur === '1' || cur === 1) return 'USD';
  if (cur === '2' || cur === 2) return 'EUR';
  if (cur === '0' || cur === 0 || !cur) return 'ILS';
  if (SUPPORTED_CURRENCIES[cur]) return cur;
  return 'ILS';
};

export const fmtILS = (val, isPrivacy = false) =>
  isPrivacy ? '₪ ••••••' : new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val || 0);

export const fmtNum = (val, isPrivacy = false) =>
  isPrivacy ? '••••••' : new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(val || 0);

export const fmtPct = (val, isPrivacy = false) =>
  isPrivacy ? '•••%' : `${(val || 0).toFixed(1)}%`;

export const fmtCurrency = (val, currency = 'ILS', isPrivacy = false) => {
  const normCur = normalizeCurrencyCode(currency);
  if (isPrivacy) {
    const symbol = SUPPORTED_CURRENCIES[normCur]?.symbol || '₪';
    return `${symbol} ••••••`;
  }
  const locale = normCur === 'ILS' ? 'he-IL' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: normCur, maximumFractionDigits: 0 }).format(val || 0);
};

export const fmtRoomCurrency = (val, roomCurrency = 'ILS', isPrivacy = false) =>
  fmtCurrency(val, roomCurrency, isPrivacy);
