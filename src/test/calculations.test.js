import { describe, it, expect } from 'vitest';
import {
  getDynamicHistoricalReturn,
  CATEGORY_ORDER,
  sortAccountsByDataEntryOrder,
  getAccountTotalsForMonth,
  sortMonths,
  getNextMonth
} from '../utils/calculations';
import { fmtILS, fmtNum, fmtPct } from '../utils/formatters';

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
});
