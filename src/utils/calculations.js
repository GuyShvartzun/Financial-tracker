export function getDynamicHistoricalReturn(track, yearsHorizon) {
  if (!track || track.id === 'custom') return null;
  const safeYears = Math.max(1, isNaN(yearsHorizon) ? 1 : yearsHorizon);
  if (safeYears <= 12) return track.base10;
  if (safeYears <= 25) {
    const factor = (safeYears - 12) / (25 - 12);
    return Number((track.base10 + factor * (track.base20 - track.base10)).toFixed(1));
  }
  const factor = Math.min((safeYears - 25) / 15, 1);
  return Number((track.base20 + factor * (track.base30 - track.base20)).toFixed(1));
}

export const CATEGORY_ORDER = {
  short: 0,
  medium: 1,
  long: 2,
  liability: 3
};

export const sortAccountsByDataEntryOrder = (accs) => {
  if (!Array.isArray(accs)) return [];
  return [...accs].sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) {
      return catA - catB;
    }
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return (a.id || '').localeCompare(b.id || '');
  });
};

export const getAccountTotalsForMonth = (accs, month) => {
  let liquid = 0, nonLiquid = 0, liabilities = 0, short = 0, medium = 0, long = 0;
  accs.forEach(acc => {
    const bal = parseFloat(acc.balances?.[month]) || 0;
    if (acc.category === 'short') { liquid += bal; short += bal; }
    else if (acc.category === 'medium') { liquid += bal; medium += bal; }
    else if (acc.category === 'long') { nonLiquid += bal; long += bal; }
    else if (acc.category === 'liability') { liabilities += Math.abs(bal); } 
  });
  const netWorth = liquid + nonLiquid - liabilities;
  return { liquid, nonLiquid, liabilities, short, medium, long, netWorth };
};

export const sortMonths = (months) => {
  return [...months].sort((a, b) => {
    const [m1, y1] = a.split('/');
    const [m2, y2] = b.split('/');
    return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
  });
};

export const getNextMonth = (monthStr) => {
  if (!monthStr || typeof monthStr !== 'string') {
    const now = new Date();
    const nextM = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const nextY = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
    return `${String(nextM).padStart(2, '0')}/${nextY}`;
  }

  const parts = monthStr.split('/');
  if (parts.length !== 2) return monthStr;

  let m = parseInt(parts[0], 10);
  let y = parseInt(parts[1], 10);

  if (isNaN(m) || isNaN(y)) return monthStr;

  if (m >= 12) {
    m = 1;
    y += 1;
  } else {
    m += 1;
  }

  return `${String(m).padStart(2, '0')}/${y}`;
};

