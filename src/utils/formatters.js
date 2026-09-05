export const fmtILS = (val, isPrivacy = false) =>
  isPrivacy ? '₪ ••••••' : new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val || 0);

export const fmtNum = (val, isPrivacy = false) =>
  isPrivacy ? '••••••' : new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(val || 0);

export const fmtPct = (val, isPrivacy = false) =>
  isPrivacy ? '•••%' : `${(val || 0).toFixed(1)}%`;

