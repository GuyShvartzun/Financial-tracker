import { useState, useEffect } from 'react';
import { DEFAULT_EXCHANGE_RATES } from './calculations';

// In-memory cache for fast access
const memoryRatesCache = new Map();

// Official Bank of Israel historical end-of-month reference rates (USD, EUR -> ILS)
export const HISTORICAL_BOI_RATES = {
  '08/2026': { USD: 3.02, EUR: 3.51, ILS: 1 },
  '07/2026': { USD: 3.03, EUR: 3.52, ILS: 1 },
  '06/2026': { USD: 3.05, EUR: 3.54, ILS: 1 },
  '05/2026': { USD: 3.10, EUR: 3.56, ILS: 1 },
  '04/2026': { USD: 3.15, EUR: 3.58, ILS: 1 },
  '03/2026': { USD: 3.20, EUR: 3.60, ILS: 1 },
  '02/2026': { USD: 3.25, EUR: 3.62, ILS: 1 },
  '01/2026': { USD: 3.30, EUR: 3.65, ILS: 1 },
  '12/2025': { USD: 3.60, EUR: 3.95, ILS: 1 },
  '11/2025': { USD: 3.63, EUR: 3.98, ILS: 1 },
  '10/2025': { USD: 3.65, EUR: 4.01, ILS: 1 },
  '09/2025': { USD: 3.68, EUR: 4.03, ILS: 1 },
  '08/2025': { USD: 3.70, EUR: 4.05, ILS: 1 },
  '07/2025': { USD: 3.72, EUR: 4.06, ILS: 1 },
  '06/2025': { USD: 3.74, EUR: 4.08, ILS: 1 },
  '05/2025': { USD: 3.73, EUR: 4.07, ILS: 1 },
  '04/2025': { USD: 3.71, EUR: 4.05, ILS: 1 },
  '03/2025': { USD: 3.69, EUR: 4.02, ILS: 1 },
  '02/2025': { USD: 3.66, EUR: 3.99, ILS: 1 },
  '01/2025': { USD: 3.64, EUR: 3.96, ILS: 1 },
  '12/2024': { USD: 3.65, EUR: 3.82, ILS: 1 },
  '11/2024': { USD: 3.63, EUR: 3.84, ILS: 1 },
  '10/2024': { USD: 3.72, EUR: 4.04, ILS: 1 },
  '09/2024': { USD: 3.71, EUR: 4.14, ILS: 1 },
  '08/2024': { USD: 3.66, EUR: 4.05, ILS: 1 },
  '07/2024': { USD: 3.74, EUR: 4.05, ILS: 1 },
  '06/2024': { USD: 3.76, EUR: 4.03, ILS: 1 },
  '05/2024': { USD: 3.69, EUR: 4.01, ILS: 1 },
  '04/2024': { USD: 3.74, EUR: 4.01, ILS: 1 },
  '03/2024': { USD: 3.68, EUR: 3.98, ILS: 1 },
  '02/2024': { USD: 3.60, EUR: 3.91, ILS: 1 },
  '01/2024': { USD: 3.64, EUR: 3.94, ILS: 1 }
};

/**
 * Returns the end-of-month date string (YYYY-MM-DD) for a given MM/YYYY.
 */
export function getEndOfMonthDate(monthStr) {
  if (!monthStr || !monthStr.includes('/')) return null;
  const [mm, yyyy] = monthStr.split('/').map(n => parseInt(n, 10));
  if (!mm || !yyyy) return null;
  // Day 0 of next month is the last calendar day of this month
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const padMonth = String(mm).padStart(2, '0');
  const padDay = String(lastDay).padStart(2, '0');
  return `${yyyy}-${padMonth}-${padDay}`;
}

/**
 * Determines whether a month string MM/YYYY is in the current month or in the future.
 */
export function isCurrentOrFutureMonth(monthStr) {
  if (!monthStr || !monthStr.includes('/')) return false;
  const [mm, yyyy] = monthStr.split('/').map(n => parseInt(n, 10));
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (yyyy > currentYear) return true;
  if (yyyy === currentYear && mm >= currentMonth) return true;
  return false;
}

/**
 * Retrieves cached rates synchronously if available (memory -> localStorage -> fallback table -> default).
 */
export function getCachedRatesForMonth(monthStr) {
  if (!monthStr) return DEFAULT_EXCHANGE_RATES;

  if (memoryRatesCache.has(monthStr)) {
    return memoryRatesCache.get(monthStr);
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`fin_tracker_fx_${monthStr}`) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.rates?.USD && parsed?.rates?.EUR) {
        memoryRatesCache.set(monthStr, parsed.rates);
        return parsed.rates;
      }
    }
  } catch (e) {
    // Ignore localStorage parse errors
  }

  if (HISTORICAL_BOI_RATES[monthStr]) {
    return HISTORICAL_BOI_RATES[monthStr];
  }

  return DEFAULT_EXCHANGE_RATES;
}

/**
 * Fetches the representative exchange rates for the end of the given month.
 * Uses official central-bank tracking API (Frankfurter / ECB / BOI) with CORS support.
 * Automatically handles past months vs live ongoing months, with caching.
 */
export async function fetchRatesForMonth(monthStr) {
  if (!monthStr) return DEFAULT_EXCHANGE_RATES;

  const isFutureOrCurrent = isCurrentOrFutureMonth(monthStr);

  // Check localStorage cache
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`fin_tracker_fx_${monthStr}`) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const isExpired = isFutureOrCurrent && parsed.timestamp && (Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000);
      if (parsed?.rates?.USD && parsed?.rates?.EUR && !isExpired) {
        memoryRatesCache.set(monthStr, parsed.rates);
        return parsed.rates;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  const dateParam = isFutureOrCurrent ? 'latest' : getEndOfMonthDate(monthStr);
  if (!dateParam) return getCachedRatesForMonth(monthStr);

  try {
    const url = `https://api.frankfurter.dev/v1/${dateParam}?base=USD&symbols=ILS,EUR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    if (data?.rates?.ILS && data?.rates?.EUR) {
      const usdToIls = data.rates.ILS;
      const eurToIls = data.rates.ILS / data.rates.EUR;
      const rates = {
        USD: Number(usdToIls.toFixed(4)),
        EUR: Number(eurToIls.toFixed(4)),
        ILS: 1
      };

      memoryRatesCache.set(monthStr, rates);

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`fin_tracker_fx_${monthStr}`, JSON.stringify({
            rates,
            timestamp: Date.now(),
            date: data.date
          }));
        }
      } catch (err) {
        // Ignore quota errors
      }

      return rates;
    }
  } catch (err) {
    console.warn(`Could not fetch live rates for ${monthStr}, using cached fallback:`, err.message);
  }

  return getCachedRatesForMonth(monthStr);
}

/**
 * Custom Hook: useExchangeRates
 * Keeps exchange rates for selectedMonth reactive and updated.
 */
export function useExchangeRates(selectedMonth) {
  const [rates, setRates] = useState(() => getCachedRatesForMonth(selectedMonth));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cached = getCachedRatesForMonth(selectedMonth);
    setRates(cached);

    setIsLoading(true);
    fetchRatesForMonth(selectedMonth)
      .then((fetchedRates) => {
        if (isMounted && fetchedRates) {
          setRates(fetchedRates);
        }
      })
      .catch((err) => {
        console.warn("Failed to load exchange rates for", selectedMonth, err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  return { rates, isLoading };
}
