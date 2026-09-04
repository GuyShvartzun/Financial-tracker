import { describe, it, expect } from 'vitest';
import {
  calcTrackSimulation,
  getTrackLinkageRate,
  getTrackLinkageInfo,
  TRACK_TYPES,
  SCHEDULE_TYPES
} from '../components/calculators/ComprehensiveMortgageAndLoanCalculator';
import { PENSION_TRACKS } from '../constants/pensionTracks';
import { parseBold } from '../utils/textParser';

describe('Mortgage & Loan Calculator Simulation Engine', () => {
  it('handles zero or invalid principal and months cleanly without crashing', () => {
    const resZero = calcTrackSimulation({ amount: 0, months: 0, interest: 5 }, 0);
    expect(resZero.initialMonthly).toBe(0);
    expect(resZero.peakMonthly).toBe(0);
    expect(resZero.totalPaidOverall).toBe(0);
    expect(resZero.yearlySchedule).toEqual([]);

    const resNegative = calcTrackSimulation({ amount: -50000, months: -12, interest: -3 }, 0);
    expect(resNegative.initialMonthly).toBe(0);
    expect(resNegative.totalPaidOverall).toBe(0);
  });

  it('calculates Spitzer standard mortgage accurately', () => {
    // 1,000,000 ILS for 300 months at 4.5% unlinked
    const track = {
      amount: 1000000,
      months: 300,
      interest: 4.5,
      trackType: 'unlinked',
      scheduleType: 'spitzer'
    };
    const res = calcTrackSimulation(track, 0);

    // Standard Spitzer monthly payment for 1M at 4.5% for 25 yrs is ~5,558 ILS
    expect(res.initialMonthly).toBeGreaterThan(5500);
    expect(res.initialMonthly).toBeLessThan(5600);
    expect(res.peakMonthly).toBeCloseTo(res.initialMonthly, 0);
    expect(res.totalPaidOverall).toBeGreaterThan(1000000);
    expect(res.totalInterestAndLinkage).toBe(res.totalPaidOverall - 1000000);
    expect(res.yearlySchedule.length).toBe(25); // 300 months / 12 = 25 years
    expect(res.yearlySchedule[24].closingBalance).toBeCloseTo(0, 0);
  });

  it('calculates Equal Capital (Keren Shava) schedule where monthly payment declines', () => {
    const track = {
      amount: 600000,
      months: 120,
      interest: 5.0,
      trackType: 'unlinked',
      scheduleType: 'equal_capital'
    };
    const res = calcTrackSimulation(track, 0);

    // Month 1 payment is highest (peak), declining over time
    expect(res.peakMonthly).toBe(res.initialMonthly);
    expect(res.yearlySchedule[0].totalPaid).toBeGreaterThan(res.yearlySchedule[9].totalPaid);
    expect(res.yearlySchedule[9].closingBalance).toBeCloseTo(0, 0);
  });

  it('calculates Partial Grace schedule correctly (interest only during grace period)', () => {
    const track = {
      amount: 500000,
      months: 120,
      graceMonths: 24,
      interest: 6.0,
      trackType: 'unlinked',
      scheduleType: 'grace_partial'
    };
    const res = calcTrackSimulation(track, 0);

    // During first month, only interest: 500,000 * (0.06 / 12) = 2,500
    expect(res.initialMonthly).toBeCloseTo(2500, 0);
    expect(res.peakMonthly).toBeGreaterThan(res.initialMonthly);
    expect(res.yearlySchedule.length).toBe(10);
  });

  it('calculates Balloon (Full Grace) schedule correctly', () => {
    const track = {
      amount: 200000,
      months: 36,
      interest: 5.0,
      trackType: 'unlinked',
      scheduleType: 'balloon'
    };
    const res = calcTrackSimulation(track, 0);

    expect(res.initialMonthly).toBe(0);
    expect(res.peakMonthly).toBe(res.totalPaidOverall);
    expect(res.totalPaidOverall).toBeGreaterThan(200000);
    expect(res.yearlySchedule.length).toBe(3);
  });

  it('incorporates CPI and Construction index inflation into linked tracks', () => {
    const unlinkedTrack = {
      amount: 500000,
      months: 240,
      interest: 3.0,
      trackType: 'unlinked',
      scheduleType: 'spitzer'
    };
    const linkedTrack = {
      amount: 500000,
      months: 240,
      interest: 3.0,
      trackType: 'cpi_linked',
      scheduleType: 'spitzer'
    };

    const resUnlinked = calcTrackSimulation(unlinkedTrack, 3.0);
    const resLinked = calcTrackSimulation(linkedTrack, 3.0);

    // Linked track total paid must be substantially higher due to 3% annual inflation
    expect(resLinked.totalPaidOverall).toBeGreaterThan(resUnlinked.totalPaidOverall);
    expect(resLinked.peakMonthly).toBeGreaterThan(resLinked.initialMonthly);
  });

  it('correctly maps track linkage rates and metadata', () => {
    const safeData = { expectedInflation: 2.8, constructionInflation: 3.5 };

    expect(getTrackLinkageRate({ trackType: 'cpi_linked' }, safeData)).toBe(2.8);
    expect(getTrackLinkageRate({ trackType: 'construction_linked' }, safeData)).toBe(3.5);
    expect(getTrackLinkageRate({ trackType: 'unlinked' }, safeData)).toBe(0);

    const infoCPI = getTrackLinkageInfo({ trackType: 'cpi_linked' }, safeData);
    expect(infoCPI.isLinked).toBe(true);
    expect(infoCPI.rate).toBe(2.8);

    const infoUnlinked = getTrackLinkageInfo({ trackType: 'unlinked' }, safeData);
    expect(infoUnlinked.isLinked).toBe(false);
    expect(infoUnlinked.rate).toBe(0);
  });
});

describe('Pension Constants and Configurations', () => {
  it('verifies all pension tracks are defined with realistic base returns', () => {
    expect(PENSION_TRACKS.length).toBeGreaterThanOrEqual(7);
    PENSION_TRACKS.forEach(track => {
      expect(track.id).toBeDefined();
      expect(track.name).toBeDefined();
      expect(track.base10).toBeGreaterThan(0);
      expect(track.base20).toBeGreaterThan(0);
      expect(track.base30).toBeGreaterThan(0);
    });
  });
});

describe('Text Parser Utility (Markdown / Bold)', () => {
  it('parses markdown bold indicators (**text**) into strong elements', () => {
    const parsed = parseBold('סך ההון הוא **1,200,000 ₪** בלבד.');
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(3);
    // Middle element is React strong element
    expect(parsed[1].type).toBe('strong');
    expect(parsed[1].props.children).toBe('1,200,000 ₪');
  });

  it('handles strings without bold markers without error', () => {
    const parsed = parseBold('טקסט פשוט ללא בולד');
    expect(parsed).toEqual(['טקסט פשוט ללא בולד']);
  });
});
