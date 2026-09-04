import React, { useState, useMemo } from 'react';
import { fmtILS } from '../../utils/formatters';

export const TRACK_TYPES = [
  { id: 'unlinked', name: 'לא צמודה (ללא הצמדה)', isLinked: false, desc: 'קרן והחזרים ללא הצמדה לשום מדד' },
  { id: 'cpi_linked', name: 'צמודה למדד המחירים לצרכן', isLinked: true, desc: 'קרן והחזר חודשי צמודים למדד המחירים לצרכן (אינפלציה)' },
  { id: 'construction_linked', name: 'צמודה למדד תשומות הבנייה', isLinked: true, desc: 'קרן והחזר חודשי צמודים למדד תשומות הבנייה (רכישה מקבלן)' },
  { id: 'forex_linked', name: 'צמודה למט"ח (שער חליפין)', isLinked: true, desc: 'קרן והחזר חודשי צמודים לשער חליפין (דולר/אירו)' },

  // Backward compatibility aliases
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

export default function ComprehensiveMortgageAndLoanCalculator({ data = {}, onUpdate }) {
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
      
      const metrics = calcTrackSimulation(t, safeData.expectedInflation);

      totalMortgage += amt;
      totalInitialMonthly += (metrics?.initialMonthly || 0);
      totalPeakMonthly += (metrics?.peakMonthly || 0);
      totalPaidOverall += (metrics?.totalPaidOverall || 0);
      totalInterestAndLinkage += (metrics?.totalInterestAndLinkage || 0);
      weightedInterestNumerator += (amt * rate);

      return { ...t, metrics };
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
  }, [tracks, safeData.propertyValue, safeData.monthlyIncome, safeData.expectedInflation]);

  const hasLinkedTracks = tracks.some(t => {
    const typeDef = TRACK_TYPES.find(tt => tt.id === t.trackType);
    return typeDef?.isLinked;
  });
  const showInflationWarning = hasLinkedTracks && (!safeData.expectedInflation || parseFloat(safeData.expectedInflation) <= 0);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-6 rounded-2xl space-y-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900">מחשבון הלוואות</h3>
          <p className="text-xs text-stone-500 mt-1">
            חישוב, תכנון והשוואת לוחות סילוקין להלוואות ומשכנתאות
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D8]">
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
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
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
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-[#2E7D32] text-xs font-bold rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">
              מדד אינפלציה שנתי צפוי (%):
            </label>
            <input 
              type="number" 
              step="any" 
              value={safeData.expectedInflation ?? ''} 
              onChange={(e) => handleChange('expectedInflation', e.target.value)} 
              placeholder="למסלולים צמודים למדד"
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
            />
          </div>
        </div>
        
        {showInflationWarning && (
          <div className="bg-[#FFF3E0] border border-[#FFCC80] p-3 rounded-lg text-[11px] text-[#E65100] font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>שים לב: קיימים מסלולים צמודים למדד, אך אינפלציה שנתית צפויה עומדת על 0. השפעת ההצמדה תבוא לידי ביטוי כאשר תוזן אינפלציה גדולה מ-0.</span>
          </div>
        )}

        {/* 5 Executive Aggregate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Initial Monthly Payment */}
          <div className="bg-[#FAF7F2] border border-[#C8E6C9] p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">החזר חודשי התחלתי</span>
              <div className="text-xl font-black text-[#2E7D32]">{fmtILS(aggregateResults.totalInitialMonthly)}</div>
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
                    PTI: {aggregateResults.ptiRatio.toFixed(1)}% {aggregateResults.ptiRatio > 40 ? '(חריגה מהנחיית בנק ישראל)' : aggregateResults.ptiRatio > 35 ? '(גבולי)' : '(תקין)'}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400">הזן הכנסה פנויה לחישוב PTI</span>
              )}
            </div>
          </div>
          
          {/* 2. Peak Monthly Payment */}
          <div className="bg-[#FAF7F2] border border-[#FFE0B2] p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">החזר חודשי שיא (צפוי)</span>
              <div className="text-xl font-black text-[#E65100]">{fmtILS(aggregateResults.totalPeakMonthly)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-500">תחת אינפלציה מצטברת</span>
            </div>
          </div>
          
          {/* 3. Total Principal Obligations */}
          <div className="bg-[#FAF7F2] border border-[#BBDEFB] p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">סך התחייבויות (קרן)</span>
              <div className="text-xl font-black text-[#1976D2]">{fmtILS(aggregateResults.totalMortgage)}</div>
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
                    LTV: {aggregateResults.ltvRatio.toFixed(1)}% {aggregateResults.ltvRatio > 75 ? '(חריגה ממגבלת 75%)' : aggregateResults.ltvRatio <= 60 ? '(שמרני)' : '(דירה יחידה)'}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-stone-400">הזן שווי נכס לחישוב LTV</span>
              )}
            </div>
          </div>

          {/* 4. Weighted Average Interest Rate */}
          <div className="bg-[#FAF7F2] border border-[#E1BEE7] p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">ריבית משוקללת נטו</span>
              <div className="text-xl font-black text-[#7B1FA2]">{aggregateResults.weightedAvgInterest.toFixed(2)}%</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-500">ממוצע משוקלל לפי גודל הקרן</span>
            </div>
          </div>
          
          {/* 5. Total Cost of Financing */}
          <div className="bg-[#FAF7F2] border border-[#FFCDD2] p-3.5 rounded-xl flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[11px] text-stone-500 font-bold block mb-1">עלות מימון (ריבית והצמדה)</span>
              <div className="text-xl font-black text-[#C62828]">{fmtILS(aggregateResults.totalInterestAndLinkage)}</div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#E8E2D8]">
              <span className="text-[10px] text-stone-600 block truncate" title={`סה"כ להחזר כולל קרן: ${fmtILS(aggregateResults.totalPaidOverall)}`}>
                סה"כ להחזר: <strong>{fmtILS(aggregateResults.totalPaidOverall)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
            <h4 className="text-sm font-bold text-stone-900">הרכב מסלולי ההלוואה ({tracks.length} מסלולים)</h4>
            <span className="text-xs font-bold bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full border border-[#C8E6C9]">
              סך התחייבות: {fmtILS(aggregateResults.totalMortgage)}
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
              <div key={track.id} className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D8] space-y-4 relative shadow-2xs">
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
                      className="bg-[#FFFFFF] border border-[#DDD6CA] focus:border-[#4A90E2] text-stone-900 font-bold text-xs rounded-lg px-2.5 py-1.5 flex-1 outline-none transition"
                    />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      !isLinked 
                        ? 'bg-[#ECEFF1] text-[#455A64] border-[#CFD8DC]' 
                        : trackTypeObj?.id === 'construction_linked'
                        ? 'bg-[#E3F2FD] text-[#1565C0] border-[#90CAF9]'
                        : trackTypeObj?.id === 'forex_linked'
                        ? 'bg-[#F3E5F5] text-[#7B1FA2] border-[#CE93D8]'
                        : 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]'
                    }`}>
                      {trackTypeObj?.name || (isLinked ? 'צמוד מדד' : 'לא צמוד')}
                    </span>
                  </div>

                  <button 
                    type="button"
                    onClick={() => handleDeleteTrack(track.id)} 
                    className="text-xs bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] font-bold px-2.5 py-1 rounded-lg border border-[#EF9A9A] transition cursor-pointer"
                  >
                    הסר מסלול
                  </button>
                </div>

                {/* Inputs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">סכום הקרן (₪):</label>
                    <input 
                      type="number" 
                      step="any"
                      value={track.amount ?? ''} 
                      onChange={(e) => handleUpdateTrack(track.id, 'amount', e.target.value)} 
                      placeholder="לדוג' 500,000"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-[#2E7D32] font-black rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">תקופה (שנים):</label>
                    <input 
                      type="number" 
                      step="any"
                      value={displayYears} 
                      onChange={(e) => handleUpdateTrack(track.id, 'years', e.target.value)} 
                      placeholder="לדוג' 25"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">תקופה (חודשים):</label>
                    <input 
                      type="number" 
                      step="1"
                      value={displayMonths} 
                      onChange={(e) => handleUpdateTrack(track.id, 'months', e.target.value)} 
                      placeholder="לדוג' 300"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">סוג מסלול / הצמדה:</label>
                    <select 
                      value={
                        (track.trackType === 'fixed_unlinked' || track.trackType === 'prime' || track.trackType === 'variable_5_unlinked' || track.trackType === 'commercial_fixed' || track.trackType === 'variable_unlinked' || track.trackType === 'other')
                          ? 'unlinked'
                          : (track.trackType === 'fixed_linked' || track.trackType === 'variable_5_linked' || track.trackType === 'variable_linked')
                          ? 'cpi_linked'
                          : (track.trackType || 'unlinked')
                      } 
                      onChange={(e) => handleUpdateTrack(track.id, 'trackType', e.target.value)} 
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none cursor-pointer focus:border-[#4A90E2]" 
                    >
                      {TRACK_TYPES.filter(tt => !tt.hidden).map(tt => <option key={tt.id} value={tt.id}>{tt.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">ריבית שנתית (%):</label>
                    <input 
                      type="number" 
                      step="any" 
                      value={track.interest ?? ''} 
                      onChange={(e) => handleUpdateTrack(track.id, 'interest', e.target.value)} 
                      placeholder="לדוג' 4.8"
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-600 font-bold block mb-1">לוח סילוקין / החזר:</label>
                    <select 
                      value={track.scheduleType} 
                      onChange={(e) => handleUpdateTrack(track.id, 'scheduleType', e.target.value)} 
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none cursor-pointer focus:border-[#4A90E2]"
                    >
                      {SCHEDULE_TYPES.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>

                  {track.scheduleType === 'grace_partial' && (
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-stone-600 font-bold block mb-1">חודשי גרייס (ריבית בלבד):</label>
                      <input 
                        type="number" 
                        step="1"
                        value={track.graceMonths ?? ''} 
                        onChange={(e) => handleUpdateTrack(track.id, 'graceMonths', e.target.value)} 
                        placeholder="לדוג' 12"
                        className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-lg p-2.5 outline-none focus:border-[#4A90E2]" 
                      />
                    </div>
                  )}
                </div>
                
                {/* Track Summary Bar */}
                <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#E8E2D8] flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex flex-wrap items-center gap-4 font-bold text-xs">
                    <div className="text-[#2E7D32]">
                      החזר התחלתי: <span className="font-black font-mono">{fmtILS(metrics?.initialMonthly)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-[#E65100]">
                      החזר שיא: <span className="font-black font-mono">{fmtILS(metrics?.peakMonthly)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-[#C62828]">
                      סך ריבית והצמדה: <span className="font-black font-mono">{fmtILS(metrics?.totalInterestAndLinkage)}</span>
                    </div>
                    <div className="text-stone-300 hidden sm:block">|</div>
                    <div className="text-stone-700">
                      סה"כ להחזר: <span className="font-black font-mono">{fmtILS(metrics?.totalPaidOverall)}</span>
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
                              <td className="p-2.5 text-stone-800">{fmtILS(row.openingBalance)}</td>
                              <td className="p-2.5 text-[#2E7D32] font-semibold">{fmtILS(row.principalPaid)}</td>
                              <td className="p-2.5 text-[#C62828]">{fmtILS(row.interestPaid)}</td>
                              <td className="p-2.5 font-bold text-stone-900">{fmtILS(row.totalPaid)}</td>
                              <td className="p-2.5 font-bold text-stone-800">{fmtILS(row.closingBalance)}</td>
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
