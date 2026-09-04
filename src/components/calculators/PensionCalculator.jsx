import React, { useState, useEffect, useMemo } from 'react';
import { PENSION_TRACKS } from '../../constants/pensionTracks';
import { getDynamicHistoricalReturn, getAccountTotalsForMonth } from '../../utils/calculations';
import { fmtILS } from '../../utils/formatters';

const DEFAULT_PENSION = {
  balance: '',
  monthlyDeposit: '',
  currentAge: '',
  retireAge: '',
  trackId: 'sp500', 
  customReturnRate: '',
  managementFeeDeposit: '',
  managementFeeBalance: '', 
  annualInflationRate: '',
  annualDepositGrowth: '',
  annuityFactor: ''
};

export default function PensionCalculator({
  calculatorsData,
  onUpdateData,
  accounts,
  selectedMonth,
  users = [],
  isSingleMember = false
}) {
  const isSingleUser = isSingleMember || users.length <= 1;
  const singleUserUid = users[0]?.uid || users[0]?.id || '';
  const [activePensionUser, setActivePensionUser] = useState(isSingleUser ? singleUserUid : (users[0]?.uid || users[0]?.id || ''));

  useEffect(() => {
    if (isSingleUser && singleUserUid && activePensionUser !== singleUserUid) {
      setActivePensionUser(singleUserUid);
    } else if (!isSingleUser && (!activePensionUser || !users.some(u => (u.uid || u.id) === activePensionUser)) && users.length > 0) {
      setActivePensionUser(users[0].uid || users[0].id);
    }
  }, [users, activePensionUser, isSingleUser, singleUserUid]);

  const pensionData = calculatorsData.pension?.[activePensionUser] || DEFAULT_PENSION;

  const handlePensionChange = (field, value) => {
    const currentData = calculatorsData.pension?.[activePensionUser] || DEFAULT_PENSION;
    onUpdateData('pension', {
      ...calculatorsData.pension,
      [activePensionUser]: { ...currentData, [field]: value }
    });
  };

  const remainingYears = Math.max(1, (parseInt(pensionData.retireAge) || 67) - (parseInt(pensionData.currentAge) || 30));
  const selectedTrack = PENSION_TRACKS.find(t => t.id === pensionData.trackId) || PENSION_TRACKS[0];
  const dynamicReturn = getDynamicHistoricalReturn(selectedTrack, remainingYears);
  const nominalReturnRate = pensionData.trackId === 'custom' 
    ? (parseFloat(pensionData.customReturnRate) || 0) 
    : (dynamicReturn ?? selectedTrack.base10);

  const pensionSimulationResult = useMemo(() => {
    let currentNominalBalance = parseFloat(pensionData.balance) || 0;
    let monthlyDeposit = parseFloat(pensionData.monthlyDeposit) || 0;
    let totalNominalDeposited = parseFloat(pensionData.balance) || 0;

    const nominalNetReturnRate = Math.max(0, nominalReturnRate - (parseFloat(pensionData.managementFeeBalance) || 0));

    for (let y = 0; y < remainingYears; y++) {
      if (y > 0) monthlyDeposit = monthlyDeposit * (1 + (parseFloat(pensionData.annualDepositGrowth) || 0) / 100);
      for (let m = 0; m < 12; m++) {
        const netMonthlyDeposit = monthlyDeposit * (1 - (parseFloat(pensionData.managementFeeDeposit) || 0) / 100);
        totalNominalDeposited += netMonthlyDeposit;
        const monthlyRate = Math.pow(1 + nominalNetReturnRate / 100, 1 / 12) - 1;
        currentNominalBalance = (currentNominalBalance + netMonthlyDeposit) * (1 + monthlyRate);
      }
    }

    const inflationFactor = Math.pow(1 + (parseFloat(pensionData.annualInflationRate) || 0) / 100, remainingYears);
    const finalRealBalance = currentNominalBalance / inflationFactor;
    const totalRealDeposited = totalNominalDeposited / inflationFactor;

    const annuity = parseFloat(pensionData.annuityFactor) || 200;
    const nominalMonthlyAnnuity = currentNominalBalance / annuity;
    const realMonthlyAnnuity = finalRealBalance / annuity;

    return {
      finalNominalBalance: currentNominalBalance,
      finalRealBalance,
      totalNominalDeposited,
      totalRealDeposited,
      nominalMonthlyAnnuity,
      realMonthlyAnnuity,
      years: remainingYears
    };
  }, [pensionData, remainingYears, nominalReturnRate]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl space-y-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-3">
        <div>
          <h3 className="text-lg font-bold text-stone-900">סימולטור פנסיוני</h3>
          <p className="text-xs text-stone-500 mt-0.5">חיזוי צבירה וקצבה פנסיונית לפי מסלולי השקעה</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {users.map(member => {
            const memberUid = member.uid || member.id;
            const memberAccs = isSingleUser ? accounts : accounts.filter(a => a.ownerId === memberUid);
            const totals = getAccountTotalsForMonth(memberAccs, selectedMonth);
            const isActive = isSingleUser || activePensionUser === memberUid;
            return (
              <button
                key={memberUid}
                onClick={() => {
                  setActivePensionUser(memberUid);
                  const currentData = calculatorsData.pension?.[memberUid] || (isSingleUser && Object.values(calculatorsData.pension || {})[0]) || DEFAULT_PENSION;
                  onUpdateData('pension', {
                    ...calculatorsData.pension,
                    [memberUid]: { ...currentData, balance: totals.long || '' }
                  });
                }}
                className={`py-2 px-3.5 font-bold text-xs rounded-xl border transition shadow-xs cursor-pointer ${
                  isActive 
                    ? 'bg-[#E1BEE7] text-[#4A148C] border-[#AB47BC]'
                    : 'bg-[#F3E5F5] hover:bg-[#E1BEE7] text-[#7B1FA2] border-[#CE93D8]'
                }`}
                title="לחץ למשיכת צבירה פנסיונית עדכנית"
              >
                {isSingleUser 
                  ? `משוך נתוני ${member.displayName || member.name} (${fmtILS(totals.long)})`
                  : `עבור לנתוני ${member.displayName || member.name} (${fmtILS(totals.long)})`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">צבירה פנסיונית קיימת (₪):</label>
              <input
                type="number"
                step="any"
                value={pensionData.balance ?? ''}
                onChange={(e) => handlePensionChange('balance', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-[#7B1FA2] font-black rounded-xl p-2.5 text-xs outline-none focus:border-[#4A90E2]"
              />
            </div>

            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">הפקדה חודשית נוכחית (₪):</label>
              <input
                type="number"
                step="any"
                value={pensionData.monthlyDeposit ?? ''}
                onChange={(e) => handlePensionChange('monthlyDeposit', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-[#2E7D32] font-black rounded-xl p-2.5 text-xs outline-none focus:border-[#4A90E2]"
              />
            </div>

            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">גיל נוכחי:</label>
              <input
                type="number"
                step="any"
                value={pensionData.currentAge ?? ''}
                onChange={(e) => handlePensionChange('currentAge', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 rounded-xl p-2.5 text-xs outline-none focus:border-[#4A90E2]"
              />
            </div>

            <div>
              <label className="text-xs text-stone-700 font-bold block mb-1">גיל פרישה מתוכנן:</label>
              <input
                type="number"
                step="any"
                value={pensionData.retireAge ?? ''}
                onChange={(e) => handlePensionChange('retireAge', e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 rounded-xl p-2.5 text-xs outline-none focus:border-[#4A90E2]"
              />
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D8] space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-stone-800 block">בחר מסלול השקעה רשמי:</label>
              <span className="text-[11px] text-[#7B1FA2] font-bold bg-[#F3E5F5] px-2 py-0.5 rounded border border-[#E1BEE7]">
                אופק זמן מחושב: {remainingYears} שנים
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PENSION_TRACKS.map(track => {
                const dynamicTrackReturn = getDynamicHistoricalReturn(track, remainingYears);
                return (
                  <button
                    key={track.id}
                    onClick={() => handlePensionChange('trackId', track.id)}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between cursor-pointer ${
                      pensionData.trackId === track.id ? 'bg-[#F3E5F5] border-[#BA68C8] shadow-xs' : 'bg-[#FFFFFF] border-[#E8E2D8] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-stone-900">{track.name}</span>
                      {track.id !== 'custom' && (
                        <span className="text-[11px] font-black text-[#7B1FA2] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E1BEE7]">
                          ~{dynamicTrackReturn}% שנתי
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-1 leading-tight">{track.desc}</p>
                  </button>
                );
              })}
            </div>

            {pensionData.trackId === 'custom' && (
              <div className="pt-2">
                <label className="text-[11px] text-stone-600 font-bold block mb-1">תשואה שנתית מותאמת אישית (%):</label>
                <input
                  type="number"
                  step="any"
                  value={pensionData.customReturnRate ?? ''}
                  onChange={(e) => handlePensionChange('customReturnRate', e.target.value)}
                  className="w-36 bg-[#FFFFFF] border border-[#DDD6CA] text-[#7B1FA2] font-black text-xs rounded-xl p-2 outline-none focus:border-[#4A90E2]"
                />
              </div>
            )}
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D8] space-y-3">
            <span className="text-xs font-bold text-stone-800 block">דמי ניהול, אינפלציה ומקדמי קצבה:</span>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-stone-600 font-bold block mb-1">דמי ניהול מהפקדה (%):</label>
                <input
                  type="number"
                  step="any"
                  value={pensionData.managementFeeDeposit ?? ''}
                  onChange={(e) => handlePensionChange('managementFeeDeposit', e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 rounded-lg p-2 outline-none focus:border-[#4A90E2]"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-600 font-bold block mb-1">דמי ניהול מצבירה (%):</label>
                <input
                  type="number"
                  step="any"
                  value={pensionData.managementFeeBalance ?? ''}
                  onChange={(e) => handlePensionChange('managementFeeBalance', e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 rounded-lg p-2 outline-none focus:border-[#4A90E2]"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-600 font-bold block mb-1">אינפלציה שנתית (%):</label>
                <input
                  type="number"
                  step="any"
                  value={pensionData.annualInflationRate ?? ''}
                  onChange={(e) => handlePensionChange('annualInflationRate', e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 rounded-lg p-2 outline-none focus:border-[#4A90E2]"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-600 font-bold block mb-1">מקדם קצבה (ברירת מחדל 200):</label>
                <input
                  type="number"
                  step="any"
                  value={pensionData.annuityFactor ?? ''}
                  onChange={(e) => handlePensionChange('annuityFactor', e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 rounded-lg p-2 outline-none focus:border-[#4A90E2]"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="text-[10px] text-stone-600 font-bold block mb-1">גידול שנתי ממוצע בהפקדות (קידום שכר %):</label>
              <input
                type="number"
                step="any"
                value={pensionData.annualDepositGrowth ?? ''}
                onChange={(e) => handlePensionChange('annualDepositGrowth', e.target.value)}
                className="w-36 bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs rounded-lg p-2 outline-none focus:border-[#4A90E2]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#E8E2D8] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs text-stone-500 font-bold block">
                צבירה משוערת בגיל פרישה ({pensionData.retireAge || 67}) בכוח קנייה של היום:
              </span>
              <div className="text-3xl font-black text-[#7B1FA2] mt-1 tracking-tight">
                {fmtILS(pensionSimulationResult.finalRealBalance)}
              </div>
              <div className="text-xs font-bold text-stone-500 mt-0.5">
                (סכום נומינלי: {fmtILS(pensionSimulationResult.finalNominalBalance)})
              </div>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#C8E6C9] space-y-1 shadow-xs">
              <span className="text-xs text-stone-500 font-bold block">קצבה חודשית צפויה בפרישה (בכוח קנייה של היום):</span>
              <div className="text-2xl font-black text-[#2E7D32]">
                {fmtILS(pensionSimulationResult.realMonthlyAnnuity)}
              </div>
              <div className="text-xs font-bold text-stone-500 mt-0.5">
                (קצבה נומינלית: {fmtILS(pensionSimulationResult.nominalMonthlyAnnuity)})
              </div>
              <div className="text-[10px] text-stone-400 mt-1 font-bold">
                לפי מקדם קצבה של {pensionData.annuityFactor || 200}
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-[#E8E2D8] pt-3">
              <div className="flex justify-between text-stone-700">
                <span>תקופת חיסכון נותרת:</span>
                <strong className="text-stone-900">{pensionSimulationResult.years} שנים</strong>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>תשואה היסטורית למסלול ({remainingYears} שנים):</span>
                <strong className="text-[#7B1FA2]">{nominalReturnRate.toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>סה"כ הפקדות מצטברות:</span>
                <div className="text-left">
                  <strong className="text-stone-900">{fmtILS(pensionSimulationResult.totalRealDeposited)}</strong>
                  <span className="text-[10px] text-stone-500 block">(נומינלי: {fmtILS(pensionSimulationResult.totalNominalDeposited)})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#E8E2D8] text-[11px] text-stone-500">
            <strong>מקור והערת ייחוס:</strong> התשואות ההיסטוריות מחושבות באופן דינמי בהתאם לאופק הזמן ({remainingYears} שנים) ומעובדות מתוך נתוני <em>"פנסיה נט" ו-"גמל נט"</em> מבית <strong>רשות שוק ההון, ביטוח וחיסכון במשרד האוצר</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
