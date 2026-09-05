import React, { useState, useMemo } from 'react';
import { Scale } from 'lucide-react';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export const TRACK_TYPES = [
  { id: 'unlinked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, desc: 'קרן והחזרים ללא הצמדה לשום מדד' },
  { id: 'cpi_linked', name: 'צמודה למדד המחירים לצרכן', isLinked: true, desc: 'קרן והחזר חודשי צמודים למדד המחירים לצרכן (אינפלציה)' },
  { id: 'construction_linked', name: 'צמודה למדד תשומות הבנייה', isLinked: true, desc: 'קרן והחזר חודשי צמודים למדד תשומות הבנייה (רכישה מקבלן)' },

  // Backward compatibility aliases
  { id: 'forex_linked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'fixed_unlinked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'prime', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'variable_5_unlinked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'commercial_fixed', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'fixed_linked', name: 'צמודה למדד המחירים לצרכן', isLinked: true, hidden: true },
  { id: 'variable_5_linked', name: 'צמודה למדד המחירים לצרכן', isLinked: true, hidden: true },
  { id: 'variable_linked', name: 'צמודה למדד המחירים לצרכן', isLinked: true, hidden: true },
  { id: 'variable_unlinked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true },
  { id: 'other', name: 'לא צמודה (ללא הצמדה)', isLinked: false, hidden: true }
];

export const SCHEDULE_TYPES = [
  { id: 'spitzer', name: 'שפיצר (קלאסי)', desc: 'תשלום חודשי של קרן וריבית השואף להיות קבוע (לפני הצמדות)' },
  { id: 'equal_capital', name: 'קרן שווה', desc: 'החזר קרן קבוע מדי חודש + ריבית יורדת על היתרה' },
  { id: 'grace_partial', name: 'גרייס חלקי (ריבית בלבד)', desc: 'תשלום ריבית בלבד לתקופה מוגדרת, ואז פריסה לפי שפיצר' },
  { id: 'balloon', name: 'גרייס מלא / בלון (דחייה מלאה)', desc: 'תשלום קרן וריבית צבורה בתשלום יחיד בסוף התקופה' }
];

export function calcTrackSimulation(track, annualInflation) {
  const P = Math.max(0, parseFloat(track.amount) || 0);
  const n = Math.max(1, parseInt(track.months) || (parseFloat(track.years) ? Math.round(parseFloat(track.years) * 12) : 1));
  const rAnnual = Math.max(0, parseFloat(track.interest) || 0);
  const typeDef = TRACK_TYPES.find(t => t.id === track.trackType) || TRACK_TYPES[0];
  const isLinked = typeDef.isLinked;
  const infAnnual = Math.max(0, parseFloat(annualInflation) || 0);
  const infMonthly = isLinked ? Math.pow(1 + infAnnual / 100, 1 / 12) - 1 : 0;
  const rMonthly = (rAnnual / 100) / 12;
  const graceM = track.scheduleType === 'grace_partial' ? Math.min(n - 1, Math.max(0, parseInt(track.graceMonths) || 0)) : 0;

  if (P === 0 || n <= 0) {
    return {
      initialMonthly: 0,
      peakMonthly: 0,
      totalPaidOverall: 0,
      totalInterestAndLinkage: 0,
      yearlySchedule: []
    };
  }

  let remainingPrincipal = P;
  let totalPaidOverall = 0;
  let initialMonthly = 0;
  let peakMonthly = 0;

  const yearlySchedule = [];
  let currentYearNumber = 1;
  let yearOpeningBalance = remainingPrincipal;
  let yearPrincipalPaid = 0;
  let yearInterestAndLinkagePaid = 0;
  let yearTotalPaid = 0;

  if (track.scheduleType === 'balloon') {
    let accruedInterest = 0;
    for (let m = 1; m <= n; m++) {
      if (isLinked) {
        const linkOnPrincipal = remainingPrincipal * infMonthly;
        const linkOnAccrued = accruedInterest * infMonthly;
        remainingPrincipal += linkOnPrincipal;
        accruedInterest += linkOnAccrued;
      }
      const monthlyInt = remainingPrincipal * rMonthly;
      accruedInterest += monthlyInt;

      if (m % 12 === 0 || m === n) {
        const isFinal = m === n;
        const finalPmt = isFinal ? remainingPrincipal + accruedInterest : 0;
        yearlySchedule.push({
          year: currentYearNumber,
          openingBalance: yearOpeningBalance,
          principalPaid: isFinal ? P : 0,
          interestPaid: isFinal ? Math.max(0, finalPmt - P) : 0,
          totalPaid: finalPmt,
          closingBalance: isFinal ? 0 : remainingPrincipal + accruedInterest
        });
        currentYearNumber++;
        yearOpeningBalance = remainingPrincipal + accruedInterest;
      }
    }

    const finalPayment = remainingPrincipal + accruedInterest;
    return {
      initialMonthly: 0,
      peakMonthly: finalPayment,
      totalPaidOverall: finalPayment,
      totalInterestAndLinkage: Math.max(0, finalPayment - P),
      yearlySchedule
    };
  }

  // Spitzer, Equal Capital, or Partial Grace
  for (let m = 1; m <= n; m++) {
    // Index linkage at beginning of month
    if (isLinked) {
      remainingPrincipal = remainingPrincipal * (1 + infMonthly);
    }

    const remainingMonths = n - m + 1;
    const monthlyInterest = remainingPrincipal * rMonthly;
    let monthlyPrincipal = 0;
    let monthlyPayment = 0;

    if (track.scheduleType === 'grace_partial' && m <= graceM) {
      monthlyPrincipal = 0;
      monthlyPayment = monthlyInterest;
    } else if (track.scheduleType === 'equal_capital') {
      monthlyPrincipal = remainingPrincipal / remainingMonths;
      monthlyPayment = monthlyPrincipal + monthlyInterest;
    } else {
      // Spitzer
      if (rMonthly > 0) {
        const factor = Math.pow(1 + rMonthly, remainingMonths);
        monthlyPayment = remainingPrincipal * (rMonthly * factor) / (factor - 1);
      } else {
        monthlyPayment = remainingPrincipal / remainingMonths;
      }
      monthlyPrincipal = monthlyPayment - monthlyInterest;
    }

    if (m === 1) {
      initialMonthly = monthlyPayment;
    } else if (track.scheduleType === 'grace_partial' && m === graceM + 1 && initialMonthly === 0) {
      initialMonthly = monthlyPayment;
    }

    if (monthlyPayment > peakMonthly) {
      peakMonthly = monthlyPayment;
    }

    totalPaidOverall += monthlyPayment;
    remainingPrincipal = Math.max(0, remainingPrincipal - monthlyPrincipal);

    yearPrincipalPaid += monthlyPrincipal;
    yearInterestAndLinkagePaid += monthlyInterest;
    yearTotalPaid += monthlyPayment;

    if (m % 12 === 0 || m === n) {
      yearlySchedule.push({
        year: currentYearNumber,
        openingBalance: yearOpeningBalance,
        principalPaid: yearPrincipalPaid,
        interestPaid: yearInterestAndLinkagePaid,
        totalPaid: yearTotalPaid,
        closingBalance: remainingPrincipal
      });
      currentYearNumber++;
      yearOpeningBalance = remainingPrincipal;
      yearPrincipalPaid = 0;
      yearInterestAndLinkagePaid = 0;
      yearTotalPaid = 0;
    }
  }

  const totalInterestAndLinkage = Math.max(0, totalPaidOverall - P);

  return {
    initialMonthly,
    peakMonthly,
    totalPaidOverall,
    totalInterestAndLinkage,
    yearlySchedule
  };
}

export const calcTrackMetrics = calcTrackSimulation;

export function getTrackLinkageRate(track, safeData = {}) {
  const typeId = track?.trackType;
  if (typeId === 'construction_linked') {
    return parseFloat(safeData.constructionInflation) || 0;
  }
  if (typeId === 'cpi_linked' || typeId === 'fixed_linked' || typeId === 'variable_5_linked' || typeId === 'variable_linked') {
    return parseFloat(safeData.expectedInflation) || 0;
  }
  return 0;
}

export function getTrackLinkageInfo(track, safeData = {}) {
  const typeId = track?.trackType;
  if (typeId === 'construction_linked') {
    const rate = parseFloat(safeData.constructionInflation) || 0;
    return { name: 'תשומות הבנייה', rate, isLinked: true, color: 'text-[#1565C0] bg-[#E3F2FD] border-[#90CAF9]' };
  }
  if (typeId === 'cpi_linked' || typeId === 'fixed_linked' || typeId === 'variable_5_linked' || typeId === 'variable_linked') {
    const rate = parseFloat(safeData.expectedInflation) || 0;
    return { name: 'מדד המחירים לצרכן', rate, isLinked: true, color: 'text-[#E65100] bg-[#FFF3E0] border-[#FFE0B2]' };
  }
  return { name: 'ללא הצמדה', rate: 0, isLinked: false, color: 'text-[#455A64] bg-[#ECEFF1] border-[#CFD8DC]' };
}

export default function ComprehensiveMortgageAndLoanCalculator({ data = {}, onUpdate }) {
  const { isPrivacyMode } = usePrivacy();
  const safeData = data || {};
  const [openSchedules, setOpenSchedules] = useState({});

  const handleChange = (field, value) => {
    if (typeof onUpdate === 'function') {
      onUpdate('mortgage', { ...safeData, [field]: value });
    }
  };

  const tracks = Array.isArray(safeData.tracks) ? safeData.tracks : [];

  const handleAddTrack = () => {
    handleChange('tracks', [
      ...tracks,
      {
        id: 't_' + Date.now(),
        name: `מסלול ${tracks.length + 1}`,
        amount: '',
        years: '25',
        months: '300',
        trackType: 'unlinked',
        interest: '',
        scheduleType: 'spitzer',
        graceMonths: ''
      }
    ]);
  };

  const handleUpdateTrack = (id, field, value) => {
    handleChange('tracks', tracks.map(t => {
      if (t.id !== id) return t;
      
      const updated = { ...t, [field]: value };
      
      // Keep years and months synchronized
      if (field === 'years') {
        const yNum = parseFloat(value);
        updated.months = !isNaN(yNum) && yNum > 0 ? String(Math.round(yNum * 12)) : '';
      } else if (field === 'months') {
        const mNum = parseInt(value, 10);
        updated.years = !isNaN(mNum) && mNum > 0 ? String(Number((mNum / 12).toFixed(1))) : '';
      }

      return updated;
    }));
  };

  const handleDeleteTrack = (id) => {
    handleChange('tracks', tracks.filter(t => t.id !== id));
  };

  const toggleSchedule = (trackId) => {
    setOpenSchedules(prev => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const aggregateResults = useMemo(() => {
    let totalMortgage = 0;
    let totalInitialMonthly = 0;
    let totalPeakMonthly = 0;
    let totalPaidOverall = 0;
    let totalInterestAndLinkage = 0;
    let weightedInterestNumerator = 0;

    const trackDetails = tracks.map(t => {
      const amt = parseFloat(t.amount) || 0;
      const rate = parseFloat(t.interest) || 0;
      const linkageRate = getTrackLinkageRate(t, safeData);
      
      const metrics = calcTrackSimulation(t, linkageRate);

      totalMortgage += amt;
      totalInitialMonthly += (metrics?.initialMonthly || 0);
      totalPeakMonthly += (metrics?.peakMonthly || 0);
      totalPaidOverall += (metrics?.totalPaidOverall || 0);
      totalInterestAndLinkage += (metrics?.totalInterestAndLinkage || 0);
      weightedInterestNumerator += (amt * rate);

      return { ...t, metrics, linkageRate };
    });

    const weightedAvgInterest = totalMortgage > 0 ? weightedInterestNumerator / totalMortgage : 0;
    const propVal = parseFloat(safeData.propertyValue) || 0;
    const incVal = parseFloat(safeData.monthlyIncome) || 0;
    const ltvRatio = propVal > 0 ? (totalMortgage / propVal) * 100 : 0;
    const ptiRatio = incVal > 0 ? (totalInitialMonthly / incVal) * 100 : 0;

    return {
      totalMortgage, totalInitialMonthly, totalPeakMonthly, totalPaidOverall,
      totalInterestAndLinkage, weightedAvgInterest, ltvRatio, ptiRatio, trackDetails
    };
  }, [tracks, safeData.propertyValue, safeData.monthlyIncome, safeData.expectedInflation, safeData.constructionInflation]);

  const unconfiguredLinkedTracks = useMemo(() => {
    const missing = [];
    const hasCpi = tracks.some(t => t.trackType === 'cpi_linked' || t.trackType === 'fixed_linked' || t.trackType === 'variable_5_linked' || t.trackType === 'variable_linked');
    const hasConst = tracks.some(t => t.trackType === 'construction_linked');

    if (hasCpi && (!safeData.expectedInflation || parseFloat(safeData.expectedInflation) <= 0)) {
      missing.push('מדד המחירים לצרכן');
    }
    if (hasConst && (!safeData.constructionInflation || parseFloat(safeData.constructionInflation) <= 0)) {
      missing.push('מדד תשומות הבנייה');
    }
    return missing;
  }, [tracks, safeData.expectedInflation, safeData.constructionInflation]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl space-y-6 shadow-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] flex items-center justify-center shrink-0 shadow-2xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900">מחשבון הלוואות ומשכנתה</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              חישוב, תכנון והשוואת לוחות סילוקין להלוואות
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core Parameters */}
        <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E8E2D8] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">
                שווי בטוחה / נכס (₪) <span className="text-stone-400 font-normal">(אופציונלי)</span>:
              </label>
              <input 
                type="number" 
                step="any"
                value={safeData.propertyValue ?? ''} 
                onChange={(e) => handleChange('propertyValue', e.target.value)} 
                placeholder="לחישוב אחוז מימון (LTV)" 
                className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
              />
            </div>

            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">
                הכנסה חודשית פנויה נטו (₪) <span className="text-stone-400 font-normal">(אופציונלי)</span>:
              </label>
              <input 
                type="number" 
                step="any"
                value={safeData.monthlyIncome ?? ''} 
                onChange={(e) => handleChange('monthlyIncome', e.target.value)} 
                placeholder="לחישוב יחס החזר (PTI)" 
                className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8E2D8]">
            <div className="text-xs font-bold text-stone-800 mb-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span>📊</span>
                <span>הנחות מדדים והצמדות שנתיות צפויות (%):</span>
              </div>
              <span className="text-[11px] font-normal text-stone-500">
                כל מסלול הלוואה מוצמד למדד הייעודי שהוגדר עבורו
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CPI Inflation */}
              <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#DDD6CA] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-stone-800 font-bold block">
                    מדד המחירים לצרכן:
                  </label>
                  <span className="text-[9px] bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] px-1.5 py-0.5 rounded-full font-bold">
                    אינפלציה
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any" 
                    value={safeData.expectedInflation ?? ''} 
                    onChange={(e) => handleChange('expectedInflation', e.target.value)} 
                    placeholder="למשל 2.5"
                    className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition font-mono privacy-blur" 
                  />
                  <span className="absolute left-2.5 top-2.5 text-stone-400 text-xs font-bold">%</span>
                </div>
                <span className="text-[10px] text-stone-500 block">עבור מסלולים צמודים למדד</span>
              </div>

              {/* Construction Inflation */}
              <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#DDD6CA] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-stone-800 font-bold block">
                    מדד תשומות הבנייה:
                  </label>
                  <span className="text-[9px] bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB] px-1.5 py-0.5 rounded-full font-bold">
                    תשומות בנייה
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    step="any" 
                    value={safeData.constructionInflation ?? ''} 
                    onChange={(e) => handleChange('constructionInflation', e.target.value)} 
                    placeholder="למשל 2.5"
                    className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition font-mono privacy-blur" 
                  />
                  <span className="absolute left-2.5 top-2.5 text-stone-400 text-xs font-bold">%</span>
                </div>
                <span className="text-[10px] text-stone-500 block">עבור מסלולים צמודי תשומות בנייה</span>
              </div>
            </div>
          </div>
        </div>

        {unconfiguredLinkedTracks.length > 0 && (
          <div className="bg-[#FFF3E0] border border-[#FFCC80] p-3 rounded-xl text-xs text-[#E65100] font-bold flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <span className="leading-relaxed">
              שים לב: קיימים מסלולים צמודים אשר שיעור המדד הצפוי שלהם עומד על 0% ({unconfiguredLinkedTracks.join(', ')}). 
              השפעת ההצמדה ולוחות הסילוקין יחושבו במדויק כאשר יוזן שיעור מדד הגדול מ-0%.
            </span>
          </div>
        )}

        {/* 5 Executive Aggregate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Initial Monthly Payment */}
          <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-card transition">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">החזר חודשי התחלתי</span>
              <div className="text-xl font-black text-[#2E7D32] privacy-blur">{fmtILS(aggregateResults.totalInitialMonthly)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              {parseFloat(safeData.monthlyIncome) > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    aggregateResults.ptiRatio <= 35 
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                      : aggregateResults.ptiRatio <= 40
                      ? 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
                      : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                  }`}>
                    PTI: <span className="privacy-blur">{aggregateResults.ptiRatio.toFixed(1)}%</span> {aggregateResults.ptiRatio > 40 ? '(חריגה מהנחיית בנק ישראל)' : aggregateResults.ptiRatio > 35 ? '(גבולי)' : '(תקין)'}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400">הזן הכנסה פנויה לחישוב PTI</span>
              )}
            </div>
          </div>
          
          {/* 2. Peak Monthly Payment */}
          <div className="bg-[#FFFFFF] border border-[#FFE0B2] p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-card transition">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">החזר חודשי שיא (צפוי)</span>
              <div className="text-xl font-black text-[#E65100] privacy-blur">{fmtILS(aggregateResults.totalPeakMonthly)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-500">תחת אינפלציה מצטברת</span>
            </div>
          </div>
          
          {/* 3. Total Principal Obligations */}
          <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-card transition">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">סך התחייבויות (קרן)</span>
              <div className="text-xl font-black text-[#1976D2] privacy-blur">{fmtILS(aggregateResults.totalMortgage)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              {parseFloat(safeData.propertyValue) > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    aggregateResults.ltvRatio <= 60
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                      : aggregateResults.ltvRatio <= 75
                      ? 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]'
                      : 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]'
                  }`}>
                    LTV: <span className="privacy-blur">{aggregateResults.ltvRatio.toFixed(1)}%</span> {aggregateResults.ltvRatio > 75 ? '(חריגה ממגבלת 75%)' : aggregateResults.ltvRatio <= 60 ? '(שמרני)' : '(דירה יחידה)'}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400">הזן שווי נכס לחישוב LTV</span>
              )}
            </div>
          </div>

          {/* 4. Weighted Average Interest Rate */}
          <div className="bg-[#FFFFFF] border border-[#E1BEE7] p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-card transition">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">ריבית משוקללת נטו</span>
              <div className="text-xl font-black text-[#7B1FA2] privacy-blur">{aggregateResults.weightedAvgInterest.toFixed(2)}%</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-500">ממוצע משוקלל לפי גודל הקרן</span>
            </div>
          </div>
          
          {/* 5. Total Cost of Financing */}
          <div className="bg-[#FFFFFF] border border-[#FFCDD2] p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-card transition">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">עלות מימון (ריבית והצמדה)</span>
              <div className="text-xl font-black text-[#C62828] privacy-blur">{fmtILS(aggregateResults.totalInterestAndLinkage)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-600 block truncate" title={isPrivacyMode ? undefined : `סה"כ להחזר כולל קרן: ${fmtILS(aggregateResults.totalPaidOverall)}`}>
                סה"כ להחזר: <strong className="privacy-blur">{fmtILS(aggregateResults.totalPaidOverall)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
            <h4 className="text-sm font-bold text-stone-900">הרכב מסלולי ההלוואה ({tracks.length} מסלולים)</h4>
            <span className="text-xs font-bold bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full border border-[#C8E6C9]">
              סך התחייבות: <span className="privacy-blur">{fmtILS(aggregateResults.totalMortgage)}</span>
            </span>
          </div>
          
          {tracks.length === 0 && (
            <div className="text-center py-8 bg-[#FAF7F2] border border-dashed border-[#DDD6CA] rounded-xl text-stone-500 text-sm">
              טרם נוספו מסלולים להלוואה. לחץ על הכפתור מטה כדי להוסיף מסלול ראשון.
            </div>
          )}

          {tracks.map((track, idx) => {
            const trackTypeObj = TRACK_TYPES.find(tt => tt.id === track.trackType);
            const isLinked = trackTypeObj?.isLinked;
            const metrics = aggregateResults.trackDetails[idx]?.metrics;
            const isScheduleOpen = !!openSchedules[track.id];

            const displayYears = track.years !== undefined && track.years !== null && track.years !== ''
              ? track.years
              : (track.months ? String(Number((parseInt(track.months, 10) / 12).toFixed(1))) : '');
            const displayMonths = track.months !== undefined && track.months !== null && track.months !== ''
              ? track.months
              : (track.years ? String(Math.round(parseFloat(track.years) * 12)) : '');

            return (
              <div key={track.id} className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-[#E8E2D8] space-y-4 relative shadow-2xs">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="w-6 h-6 rounded-full bg-[#FFFFFF] text-stone-800 flex items-center justify-center font-bold text-xs border border-[#DDD6CA] shadow-2xs">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="שם הלוואה / מסלול..."
                      value={track.name || ''}
                      onChange={(e) => handleUpdateTrack(track.id, 'name', e.target.value)}
                      className="bg-[#FFFFFF] border border-[#DDD6CA] focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] text-stone-900 font-bold text-xs rounded-xl px-2.5 py-1.5 flex-1 outline-none transition"
                    />
                    {(() => {
                      const linkInfo = getTrackLinkageInfo(track, safeData);
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${linkInfo.color}`}>
                          <span>{trackTypeObj?.name || linkInfo.name}</span>
                          {linkInfo.isLinked && (
                            <span className="font-mono bg-white/70 px-1 rounded text-[9px] border border-black/5 privacy-blur">
                              {linkInfo.rate}%
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  <button 
                    type="button"
                    onClick={() => handleDeleteTrack(track.id)} 
                    className="text-xs bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] font-bold px-2.5 py-1.5 rounded-xl border border-[#EF9A9A] transition cursor-pointer"
                  >
                    הסר מסלול
                  </button>
                </div>

                {/* Inputs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">סכום הקרן (₪):</label>
                    <input 
                      type="number" 
                      step="any"
                      value={track.amount ?? ''} 
                      onChange={(e) => handleUpdateTrack(track.id, 'amount', e.target.value)} 
                      placeholder="לדוג' 500,000"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">תקופה (שנים):</label>
                    <input 
                      type="number" 
                      step="any"
                      value={displayYears} 
                      onChange={(e) => handleUpdateTrack(track.id, 'years', e.target.value)} 
                      placeholder="לדוג' 25"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">תקופה (חודשים):</label>
                    <input 
                      type="number" 
                      step="1"
                      value={displayMonths} 
                      onChange={(e) => handleUpdateTrack(track.id, 'months', e.target.value)} 
                      placeholder="לדוג' 300"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">סוג מסלול / הצמדה:</label>
                    <select 
                      value={
                        (track.trackType === 'fixed_unlinked' || track.trackType === 'prime' || track.trackType === 'variable_5_unlinked' || track.trackType === 'commercial_fixed' || track.trackType === 'variable_unlinked' || track.trackType === 'other' || track.trackType === 'forex_linked')
                          ? 'unlinked'
                          : (track.trackType === 'fixed_linked' || track.trackType === 'variable_5_linked' || track.trackType === 'variable_linked')
                          ? 'cpi_linked'
                          : (track.trackType || 'unlinked')
                      } 
                      onChange={(e) => handleUpdateTrack(track.id, 'trackType', e.target.value)} 
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none cursor-pointer focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition" 
                    >
                      {TRACK_TYPES.filter(tt => !tt.hidden).map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">ריבית שנתית (%):</label>
                    <input 
                      type="number" 
                      step="any" 
                      value={track.interest ?? ''} 
                      onChange={(e) => handleUpdateTrack(track.id, 'interest', e.target.value)} 
                      placeholder="לדוג' 4.8"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-700 font-bold block mb-1">לוח סילוקין / החזר:</label>
                    <select 
                      value={track.scheduleType} 
                      onChange={(e) => handleUpdateTrack(track.id, 'scheduleType', e.target.value)} 
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none cursor-pointer focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition"
                    >
                      {SCHEDULE_TYPES.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  {track.scheduleType === 'grace_partial' && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-stone-700 font-bold block mb-1">חודשי גרייס (ריבית בלבד):</label>
                      <input 
                        type="number" 
                        step="1"
                        value={track.graceMonths ?? ''} 
                        onChange={(e) => handleUpdateTrack(track.id, 'graceMonths', e.target.value)} 
                        placeholder="לדוג' 12"
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
                      />
                    </div>
                  )}
                </div>
                
                {/* Track Summary Bar */}
                <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#E8E2D8] flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center gap-4 font-bold text-xs">
                    <div className="text-[#2E7D32]">
                      החזר התחלתי: <span className="font-black font-mono privacy-blur">{fmtILS(metrics?.initialMonthly)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-[#E65100]">
                      החזר שיא: <span className="font-black font-mono privacy-blur">{fmtILS(metrics?.peakMonthly)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-[#C62828]">
                      סך ריבית והצמדה: <span className="font-black font-mono privacy-blur">{fmtILS(metrics?.totalInterestAndLinkage)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-stone-700">
                      סה"כ להחזר: <span className="font-black font-mono privacy-blur">{fmtILS(metrics?.totalPaidOverall)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSchedule(track.id)}
                    className="text-xs font-bold text-stone-700 hover:text-stone-900 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F2ECE1] hover:bg-[#E8E2D8] transition cursor-pointer"
                  >
                    <span>{isScheduleOpen ? 'הסתר לוח סילוקין שנתי ▲' : 'הצג לוח סילוקין שנתי ▼'}</span>
                  </button>
                </div>

                {/* Collapsible Yearly Amortization Schedule Table */}
                {isScheduleOpen && (
                  <div className="mt-3 bg-[#FFFFFF] border border-[#E8E2D8] rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-[#F2ECE1] px-4 py-2 border-b border-[#E8E2D8] flex justify-between items-center">
                      <span className="font-bold text-xs text-stone-800">
                        לוח סילוקין שנתי – {track.name || `מסלול ${idx + 1}`} ({metrics?.yearlySchedule?.length || 0} שנים)
                      </span>
                      <span className="text-[11px] text-stone-500">
                        חישוב מדויק לפי פרקטיקת הבנקאות בישראל
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#FAF7F2] text-stone-600 border-b border-[#E8E2D8] sticky top-0">
                          <tr>
                            <th className="p-2.5 font-bold">שנה</th>
                            <th className="p-2.5 font-bold">יתרת פתיחה</th>
                            <th className="p-2.5 font-bold">תשלומי קרן</th>
                            <th className="p-2.5 font-bold">תשלומי ריבית והצמדה</th>
                            <th className="p-2.5 font-bold">סה"כ תשלום שנתי</th>
                            <th className="p-2.5 font-bold">יתרת סגירה</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2ECE1]">
                          {metrics?.yearlySchedule?.map((row) => (
                            <tr key={row.year} className="hover:bg-[#FAF7F2] transition font-mono">
                              <td className="p-2.5 font-bold font-sans text-stone-800">שנה {row.year}</td>
                              <td className="p-2.5 text-stone-800 privacy-blur">{fmtILS(row.openingBalance)}</td>
                              <td className="p-2.5 text-[#2E7D32] font-semibold privacy-blur">{fmtILS(row.principalPaid)}</td>
                              <td className="p-2.5 text-[#C62828] privacy-blur">{fmtILS(row.interestPaid)}</td>
                              <td className="p-2.5 font-bold text-stone-900 privacy-blur">{fmtILS(row.totalPaid)}</td>
                              <td className="p-2.5 font-bold text-stone-800 privacy-blur">{fmtILS(row.closingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button 
            type="button"
            onClick={handleAddTrack} 
            className="w-full py-3 bg-[#FFFFFF] hover:bg-[#F2ECE1] border-2 border-dashed border-[#DDD6CA] text-stone-700 font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>+</span>
            <span>הוסף הלוואה / מסלול חדש</span>
          </button>
        </div>
      </div>
    </div>
  );
}
