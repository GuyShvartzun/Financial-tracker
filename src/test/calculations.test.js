import { describe, it, expect } from 'vitest';
import {
  getDynamicHistoricalReturn,
  CATEGORY_ORDER,
  sortAccountsByDataEntryOrder,
  getAccountTotalsForMonth,
  sortMonths,
  getNextMonth,
  getLatestExistingMonth,
  DEFAULT_EXCHANGE_RATES,
  convertCurrency
} from '../utils/calculations';
import { fmtILS, fmtNum, fmtPct, fmtCurrency, SUPPORTED_CURRENCIES, CURRENCY_LIST, normalizeCurrencyCode } from '../utils/formatters';
import { getEndOfMonthDate, isCurrentOrFutureMonth, getCachedRatesForMonth } from '../utils/exchangeRates';

describe('Calculations Utility', () => {
  describe('getDynamicHistoricalReturn', () => {
    const mockTrack = {
      id: 'sp500',
      base10: 12.2,
      base20: 10.2,
      base30: 9.8
    };

    it('returns null for null track or custom track', () => {
      expect(getDynamicHistoricalReturn(null, 10)).toBeNull();
      expect(getDynamicHistoricalReturn({ id: 'custom' }, 10)).toBeNull();
    });

    it('handles horizons <= 12 years', () => {
      expect(getDynamicHistoricalReturn(mockTrack, 5)).toBe(12.2);
      expect(getDynamicHistoricalReturn(mockTrack, 12)).toBe(12.2);
      // Handles invalid/NaN/negative gracefully
      expect(getDynamicHistoricalReturn(mockTrack, NaN)).toBe(12.2);
      expect(getDynamicHistoricalReturn(mockTrack, -5)).toBe(12.2);
    });

    it('interpolates between 12 and 25 years', () => {
      const res = getDynamicHistoricalReturn(mockTrack, 20);
      expect(res).toBeGreaterThanOrEqual(10.2);
      expect(res).toBeLessThanOrEqual(12.2);
      expect(typeof res).toBe('number');
    });

    it('interpolates beyond 25 years capped at 40 years', () => {
      const res25 = getDynamicHistoricalReturn(mockTrack, 25);
      expect(res25).toBe(10.2);
      const res30 = getDynamicHistoricalReturn(mockTrack, 40);
      expect(res30).toBe(9.8);
      const res50 = getDynamicHistoricalReturn(mockTrack, 50);
      expect(res50).toBe(9.8);
    });
  });

  describe('sortAccountsByDataEntryOrder', () => {
    it('handles non-array inputs gracefully', () => {
      expect(sortAccountsByDataEntryOrder(null)).toEqual([]);
      expect(sortAccountsByDataEntryOrder(undefined)).toEqual([]);
      expect(sortAccountsByDataEntryOrder('invalid')).toEqual([]);
    });

    it('sorts accounts by category order (short -> medium -> long -> liability)', () => {
      const accounts = [
        { id: '1', category: 'liability', order: 0 },
        { id: '2', category: 'short', order: 0 },
        { id: '3', category: 'long', order: 0 },
        { id: '4', category: 'medium', order: 0 }
      ];
      const sorted = sortAccountsByDataEntryOrder(accounts);
      expect(sorted.map(a => a.category)).toEqual(['short', 'medium', 'long', 'liability']);
    });

    it('sorts accounts within same category by order index', () => {
      const accounts = [
        { id: '1', category: 'short', order: 2 },
        { id: '2', category: 'short', order: 0 },
        { id: '3', category: 'short', order: 1 }
      ];
      const sorted = sortAccountsByDataEntryOrder(accounts);
      expect(sorted.map(a => a.id)).toEqual(['2', '3', '1']);
    });

    it('falls back to id sorting when order is missing or equal', () => {
      const accounts = [
        { id: 'b', category: 'short' },
        { id: 'a', category: 'short' }
      ];
      const sorted = sortAccountsByDataEntryOrder(accounts);
      expect(sorted.map(a => a.id)).toEqual(['a', 'b']);
    });
  });

  describe('getAccountTotalsForMonth', () => {
    it('correctly aggregates short, medium, long and liability categories', () => {
      const month = '08/2026';
      const accounts = [
        { id: '1', category: 'short', balances: { [month]: '1000' } },
        { id: '2', category: 'medium', balances: { [month]: 2000 } },
        { id: '3', category: 'long', balances: { [month]: 5000 } },
        { id: '4', category: 'liability', balances: { [month]: 500 } }
      ];

      const totals = getAccountTotalsForMonth(accounts, month);
      expect(totals.short).toBe(1000);
      expect(totals.medium).toBe(2000);
      expect(totals.long).toBe(5000);
      expect(totals.liquid).toBe(3000); // short + medium
      expect(totals.nonLiquid).toBe(5000); // long
      expect(totals.liabilities).toBe(500);
      expect(totals.netWorth).toBe(7500); // 3000 + 5000 - 500
    });

    it('handles empty balances or missing months safely', () => {
      const accounts = [
        { id: '1', category: 'short', balances: {} },
        { id: '2', category: 'liability' } // no balances obj
      ];
      const totals = getAccountTotalsForMonth(accounts, '01/2026');
      expect(totals.netWorth).toBe(0);
      expect(totals.liquid).toBe(0);
      expect(totals.liabilities).toBe(0);
    });

    it('handles negative balances correctly in liabilities (Math.abs)', () => {
      const month = '08/2026';
      const accounts = [
        { id: '1', category: 'liability', balances: { [month]: -1500 } }
      ];
      const totals = getAccountTotalsForMonth(accounts, month);
      expect(totals.liabilities).toBe(1500);
      expect(totals.netWorth).toBe(-1500);
    });
  });

  describe('sortMonths', () => {
    it('chronologically sorts months across years', () => {
      const months = ['12/2026', '01/2026', '05/2025', '03/2027'];
      const sorted = sortMonths(months);
      expect(sorted).toEqual(['05/2025', '01/2026', '12/2026', '03/2027']);
    });
  });

  describe('getNextMonth', () => {
    it('increments standard months within same year', () => {
      expect(getNextMonth('05/2026')).toBe('06/2026');
      expect(getNextMonth('10/2026')).toBe('11/2026');
    });

    it('handles December to January year rollover', () => {
      expect(getNextMonth('12/2026')).toBe('01/2027');
    });

    it('handles invalid or non-string month formats gracefully', () => {
      const fallback = getNextMonth(null);
      expect(fallback).toMatch(/^\d{2}\/\d{4}$/);
      expect(getNextMonth('invalid')).toBe('invalid');
    });
  });

  describe('getLatestExistingMonth', () => {
    it('returns the latest month from monthsList', () => {
      const list = ['06/2026', '07/2026', '08/2026'];
      expect(getLatestExistingMonth(list, [], '06/2026')).toBe('08/2026');
    });

    it('returns the latest month when an account has a later balance than monthsList', () => {
      const list = ['07/2026', '08/2026'];
      const accs = [
        { id: '1', balances: { '07/2026': 100, '08/2026': 200, '09/2026': 300 } }
      ];
      expect(getLatestExistingMonth(list, accs, '07/2026')).toBe('09/2026');
    });

    it('correctly orders year boundaries e.g. 12/2026 vs 01/2027', () => {
      const list = ['11/2026', '12/2026'];
      const accs = [
        { id: '1', balances: { '01/2027': 500 } }
      ];
      expect(getLatestExistingMonth(list, accs, '11/2026')).toBe('01/2027');
    });

    it('falls back to fallbackMonth or default when lists are empty', () => {
      expect(getLatestExistingMonth([], [], '05/2026')).toBe('05/2026');
      expect(getLatestExistingMonth(null, null, '')).toBe('08/2026');
    });
  });
});

describe('Formatters Utility', () => {
  it('formats ILS currency cleanly', () => {
    const formatted = fmtILS(1250);
    expect(formatted).toContain('1,250');
    expect(fmtILS(0)).toContain('0');
    expect(fmtILS(null)).toContain('0');
    expect(fmtILS(undefined)).toContain('0');
  });

  it('formats numbers with commas', () => {
    expect(fmtNum(1000000)).toBe('1,000,000');
    expect(fmtNum(0)).toBe('0');
    expect(fmtNum(null)).toBe('0');
  });

  it('formats percentages with one decimal digit', () => {
    expect(fmtPct(12.345)).toBe('12.3%');
    expect(fmtPct(0)).toBe('0.0%');
    expect(fmtPct(null)).toBe('0.0%');
  });

  describe('Multi-Currency Support', () => {
    it('formats currencies according to their native symbols', () => {
      expect(fmtCurrency(1500, 'USD')).toContain('$');
      expect(fmtCurrency(1500, 'USD')).toContain('1,500');
      expect(fmtCurrency(2500, 'EUR')).toContain('€');
      expect(fmtCurrency(2500, 'EUR')).toContain('2');
      expect(fmtCurrency(2500, 'EUR')).toContain('500');
      expect(fmtCurrency(3500, 'ILS')).toContain('₪');
      expect(fmtCurrency(3500, 'ILS')).toContain('3,500');
    });

    it('masks currency values in privacy mode while preserving currency symbol', () => {
      expect(fmtCurrency(1500, 'USD', true)).toBe('$ ••••••');
      expect(fmtCurrency(2500, 'EUR', true)).toBe('€ ••••••');
      expect(fmtCurrency(3500, 'ILS', true)).toBe('₪ ••••••');
    });

    it('correctly converts foreign currency balances into ILS in getAccountTotalsForMonth', () => {
      const month = '01/2026';
      const accounts = [
        { id: 'acc1', category: 'short', currency: 'ILS', balances: { [month]: 1000 } },
        { id: 'acc2', category: 'short', currency: 'USD', balances: { [month]: 100 } },
        { id: 'acc3', category: 'medium', currency: 'EUR', balances: { [month]: 200 } },
        { id: 'acc4', category: 'liability', currency: 'USD', balances: { [month]: 50 } },
      ];

      const totals = getAccountTotalsForMonth(accounts, month);
      const expectedUsdShort = 100 * DEFAULT_EXCHANGE_RATES.USD;
      const expectedEurMedium = 200 * DEFAULT_EXCHANGE_RATES.EUR;
      const expectedUsdLiability = 50 * DEFAULT_EXCHANGE_RATES.USD;

      expect(totals.short).toBeCloseTo(1000 + expectedUsdShort);
      expect(totals.medium).toBeCloseTo(expectedEurMedium);
      expect(totals.liabilities).toBeCloseTo(expectedUsdLiability);
      expect(totals.liquid).toBeCloseTo(1000 + expectedUsdShort + expectedEurMedium);
      expect(totals.netWorth).toBeCloseTo((1000 + expectedUsdShort + expectedEurMedium) - expectedUsdLiability);
    });

    it('correctly calculates totals in room base currency when targetCurrency is USD or EUR', () => {
      const month = '08/2026';
      const rates = { USD: 3.00, EUR: 3.60, ILS: 1 };
      const accounts = [
        { id: 'acc1', category: 'short', currency: 'ILS', balances: { [month]: 300 } }, // 100 USD
        { id: 'acc2', category: 'short', currency: 'USD', balances: { [month]: 50 } },  // 50 USD
        { id: 'acc3', category: 'liability', currency: 'USD', balances: { [month]: 20 } } // 20 USD
      ];

      // Target: USD
      const totalsUsd = getAccountTotalsForMonth(accounts, month, rates, 'USD');
      expect(totalsUsd.short).toBeCloseTo(150); // 100 + 50
      expect(totalsUsd.liabilities).toBeCloseTo(20);
      expect(totalsUsd.netWorth).toBeCloseTo(130);

      // Target: EUR (300 ILS = 300/3.60 = 83.33 EUR, 50 USD = 150 ILS = 150/3.60 = 41.67 EUR)
      const totalsEur = getAccountTotalsForMonth(accounts, month, rates, 'EUR');
      expect(totalsEur.short).toBeCloseTo((300 + 150) / 3.60);
      expect(totalsEur.liabilities).toBeCloseTo((20 * 3.00) / 3.60);
    });
  });

  describe('Currency Conversion & Formatting Helpers', () => {
    it('convertCurrency handles all cross-currency conversions accurately', () => {
      const rates = { USD: 3.00, EUR: 3.60, ILS: 1 };

      // USD -> ILS
      expect(convertCurrency(100, 'USD', 'ILS', rates)).toBeCloseTo(300);
      // EUR -> ILS
      expect(convertCurrency(100, 'EUR', 'ILS', rates)).toBeCloseTo(360);
      // ILS -> USD
      expect(convertCurrency(300, 'ILS', 'USD', rates)).toBeCloseTo(100);
      // USD -> EUR (100 USD = 300 ILS / 3.60 = 83.33 EUR)
      expect(convertCurrency(100, 'USD', 'EUR', rates)).toBeCloseTo(83.3333, 3);
      // EUR -> USD (100 EUR = 360 ILS / 3.00 = 120 USD)
      expect(convertCurrency(100, 'EUR', 'USD', rates)).toBeCloseTo(120);
      // Same currency
      expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
    });

    it('normalizeCurrencyCode handles legacy index values and defaults', () => {
      expect(normalizeCurrencyCode('0')).toBe('ILS');
      expect(normalizeCurrencyCode(0)).toBe('ILS');
      expect(normalizeCurrencyCode('1')).toBe('USD');
      expect(normalizeCurrencyCode(1)).toBe('USD');
      expect(normalizeCurrencyCode('2')).toBe('EUR');
      expect(normalizeCurrencyCode(2)).toBe('EUR');
      expect(normalizeCurrencyCode('USD')).toBe('USD');
      expect(normalizeCurrencyCode('EUR')).toBe('EUR');
      expect(normalizeCurrencyCode('ILS')).toBe('ILS');
      expect(normalizeCurrencyCode(null)).toBe('ILS');
      expect(normalizeCurrencyCode(undefined)).toBe('ILS');
    });

    it('SUPPORTED_CURRENCIES provides dictionary lookup and CURRENCY_LIST contains all 3 currencies', () => {
      expect(SUPPORTED_CURRENCIES.ILS.symbol).toBe('₪');
      expect(SUPPORTED_CURRENCIES.USD.symbol).toBe('$');
      expect(SUPPORTED_CURRENCIES.EUR.symbol).toBe('€');
      expect(CURRENCY_LIST.length).toBe(3);
      expect(CURRENCY_LIST.map(c => c.code)).toEqual(['ILS', 'USD', 'EUR']);
    });

    it('fmtCurrency formats EUR with comma thousand separators like USD and ILS', () => {
      const formattedEUR = fmtCurrency(1234567, 'EUR');
      expect(formattedEUR).toContain('1,234,567');
      expect(formattedEUR).toContain('€');
      expect(formattedEUR).not.toContain('1.234.567');

      const formattedUSD = fmtCurrency(1234567, 'USD');
      expect(formattedUSD).toContain('1,234,567');
      expect(formattedUSD).toContain('$');

      const formattedILS = fmtCurrency(1234567, 'ILS');
      expect(formattedILS).toContain('1,234,567');
      expect(formattedILS).toContain('₪');
    });
  });

  describe('Exchange Rates Utility (Bank of Israel End-of-Month)', () => {
    it('getEndOfMonthDate calculates accurate last day of month including leap years', () => {
      expect(getEndOfMonthDate('08/2026')).toBe('2026-08-31');
      expect(getEndOfMonthDate('04/2026')).toBe('2026-04-30');
      expect(getEndOfMonthDate('02/2024')).toBe('2024-02-29'); // 2024 is leap year
      expect(getEndOfMonthDate('02/2025')).toBe('2025-02-28'); // 2025 is not leap year
      expect(getEndOfMonthDate('')).toBeNull();
      expect(getEndOfMonthDate('invalid')).toBeNull();
    });

    it('getCachedRatesForMonth retrieves historical BOI rates from fallback table', () => {
      const ratesAug2026 = getCachedRatesForMonth('08/2026');
      expect(ratesAug2026.USD).toBe(3.02);
      expect(ratesAug2026.EUR).toBe(3.51);
      expect(ratesAug2026.ILS).toBe(1);

      const ratesDec2025 = getCachedRatesForMonth('12/2025');
      expect(ratesDec2025.USD).toBe(3.60);
      expect(ratesDec2025.EUR).toBe(3.95);
    });
  });
});
