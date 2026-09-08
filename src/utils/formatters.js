export const SUPPORTED_CURRENCIES = [
  { code: 'ILS', symbol: '₪', label: 'שקל (₪)' },
  { code: 'USD', symbol: '$', label: 'דולר ($)' },
  { code: 'EUR', symbol: '€', label: 'יורו (€)' }
];

export const fmtILS = (val, isPrivacy = false) =>
  isPrivacy ? '₪ ••••••' : new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val || 0);

export const fmtNum = (val, isPrivacy = false) =>
  isPrivacy ? '••••••' : new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(val || 0);

export const fmtPct = (val, isPrivacy = false) =>
  isPrivacy ? '•••%' : `${(val || 0).toFixed(1)}%`;

export const fmtCurrency = (val, currency = 'ILS', isPrivacy = false) => {
  if (isPrivacy) {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
    return `${symbol} ••••••`;
  }
  const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'he-IL';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(val || 0);
};
