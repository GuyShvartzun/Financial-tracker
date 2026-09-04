export const fmtILS = (val) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val || 0);

export const fmtNum = (val) =>
  new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(val || 0);

export const fmtPct = (val) =>
  `${(val || 0).toFixed(1)}%`;
