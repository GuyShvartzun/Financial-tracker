import React, { useState, useEffect, useMemo } from 'react';
import { Flame } from 'lucide-react';
import { fmtILS } from '../../utils/formatters';
import { getAccountTotalsForMonth } from '../../utils/calculations';
import { DEFAULT_FIRE_DATA } from '../../constants/initialData';
import { usePrivacy } from '../../context/PrivacyContext';

export default function AdvancedFIRECalculator({
  calculatorsData = {},
  onUpdateData,
  accounts = [],
  selectedMonth = '',
  users = [],
  isSingleMember = false,
  activeUserId = ''
}) {
  const { isPrivacyMode } = usePrivacy();
  const isSingleUser = isSingleMember || users.length <= 1;
  const singleUserUid = users[0]?.uid || users[0]?.id || 'single';
  const preferredFireUid = (activeUserId && users.some(u => (u.uid || u.id) === activeUserId))
    ? activeUserId
    : (users[0]?.uid || users[0]?.id || 'shared');

  const [activeFireUser, setActiveFireUser] = useState(
    isSingleUser ? singleUserUid : preferredFireUid
  );

  useEffect(() => {
    if (isSingleUser) {
      if (activeFireUser !== singleUserUid && singleUserUid) {
        setActiveFireUser(singleUserUid);
      }
    } else {
      const preferred = (activeUserId && users.some(u => (u.uid || u.id) === activeUserId))
        ? activeUserId
        : (users[0]?.uid || users[0]?.id || 'shared');
      if (!activeFireUser || (activeFireUser !== 'shared' && !users.some(u => (u.uid || u.id) === activeFireUser))) {
        setActiveFireUser(preferred);
      }
    }
  }, [users, activeFireUser, isSingleUser, singleUserUid, activeUserId]);

  // Support per-user profiles with backward compatibility for legacy flat fire objects
  const rawFire = calculatorsData?.fire || {};
  const userFireData = useMemo(() => {
    if (rawFire[activeFireUser]) {
      return rawFire[activeFireUser];
    }
    // Backward-compatibility: if single user and data was previously saved under 'shared'
    if (isSingleUser && rawFire['shared']) {
      return rawFire['shared'];
    }
    // Backward-compatibility: if legacy flat fire structure exists
    if (rawFire.initialCapital !== undefined && !rawFire[activeFireUser]) {
      return rawFire;
    }
    return DEFAULT_FIRE_DATA;
  }, [rawFire, activeFireUser, isSingleUser]);

  // Active user's current liquid capital (short + medium) for selected month
  const activeUserLiquid = useMemo(() => {
    if (isSingleUser) {
      const totals = getAccountTotalsForMonth(accounts, selectedMonth);
      return totals.liquid;
    }
    if (activeFireUser === 'shared') {
      const totals = getAccountTotalsForMonth(accounts, selectedMonth);
      return totals.liquid;
    }
    const memberAccs = accounts.filter(a => a.ownerId === activeFireUser);
    const totals = getAccountTotalsForMonth(memberAccs, selectedMonth);
    return totals.liquid;
  }, [accounts, activeFireUser, selectedMonth, isSingleUser]);

  const sharedLiquid = useMemo(() => {
    const totals = getAccountTotalsForMonth(accounts, selectedMonth);
    return totals.liquid;
  }, [accounts, selectedMonth]);

  const handleFireChange = (field, value) => {
    const current = userFireData;
    const updatedUser = { ...current, [field]: value };
    const allFire = (typeof rawFire === 'object' && !('initialCapital' in rawFire))
      ? { ...rawFire, [activeFireUser]: updatedUser }
      : { [activeFireUser]: updatedUser };
    onUpdateData('fire', allFire);
  };

  const handleSwitchUser = (memberId, forceSync = false) => {
    setActiveFireUser(memberId);
    let targetLiquid = 0;
    if (memberId === 'shared') {
      targetLiquid = getAccountTotalsForMonth(accounts, selectedMonth).liquid;
    } else {
      const memberAccs = isSingleUser ? accounts : accounts.filter(a => a.ownerId === memberId);
      targetLiquid = getAccountTotalsForMonth(memberAccs, selectedMonth).liquid;
    }
    const memberData = rawFire[memberId] || (rawFire.initialCapital !== undefined && activeFireUser === memberId ? rawFire : (isSingleUser && rawFire['shared'] ? rawFire['shared'] : DEFAULT_FIRE_DATA));

    // If initialCapital is empty or unset, or if explicit sync is requested, load the latest liquid capital
    if (forceSync || memberData.initialCapital === '' || memberData.initialCapital === undefined) {
      const updatedUser = { ...memberData, initialCapital: targetLiquid || '' };
      const allFire = (typeof rawFire === 'object' && !('initialCapital' in rawFire))
        ? { ...rawFire, [memberId]: updatedUser }
        : { [memberId]: updatedUser };
      onUpdateData('fire', allFire);
    }
  };

  const handleSyncWithLiquid = () => {
    handleFireChange('initialCapital', activeUserLiquid || 0);
  };

  // Full nominal calculation model with real discounted display
  const calcResults = useMemo(() => {
    const data = userFireData;
    const accR = Math.max(0, parseFloat(data.accumulationReturn) || 0);
    const retR = Math.max(0, parseFloat(data.retirementReturn) || 0);
    const mgmt = Math.max(0, parseFloat(data.annualManagementFee) || 0);
    const inf = Math.max(0, parseFloat(data.annualInflation) || 0);
    const initCap = Math.max(0, parseFloat(data.initialCapital) || 0);
    const mDep = Math.max(0, parseFloat(data.monthlyDeposit) || 0);
    const netWithdrawal = Math.max(0, parseFloat(data.desiredNetMonthlyWithdrawal) || 0);
    const cAge = Math.max(1, parseInt(data.currentAge) || 30);
    const depGrowth = parseFloat(data.annualDepositGrowth) || 0;
    const lumpAmount = parseFloat(data.lumpSumAmount) || 0;
    const lumpYears = parseInt(data.lumpSumYears) || 0;
    const taxRate = Math.min(0.99, Math.max(0, (parseFloat(data.capitalGainsTax) || 25) / 100));

    // Real gross withdrawal desired today (in today's purchasing power)
    const grossMonthlyWithdrawalReal = netWithdrawal / Math.max(0.01, (1 - taxRate));
    const desiredAnnualGrossReal = grossMonthlyWithdrawalReal * 12;

    // Nominal returns net of management fees
    const nominalAccNetRate = (accR - mgmt) / 100;
    const nominalRetNetRate = (retR - mgmt) / 100;

    // Real capital preservation rate in retirement:
    // Capital must grow by inflation while distributing desired gross withdrawal
    const realPreservationRate = Math.max(0.0001, nominalRetNetRate - (inf / 100));

    // Target capital required in real terms (today's purchasing power)
    const requiredCapitalReal = desiredAnnualGrossReal / realPreservationRate;

    // Monthly nominal interest rate in accumulation
    const monthlyRateNominal = nominalAccNetRate > -1
      ? Math.pow(1 + nominalAccNetRate, 1 / 12) - 1
      : 0;

    let curNominalCapital = initCap;
    let totalContributedNominal = initCap;
    let currentMonthlyDeposit = mDep;
    let monthsElapsed = 0;
    const maxMonths = 1200; // Cap at 100 years

    while (monthsElapsed < maxMonths) {
      const t = monthsElapsed / 12;
      const infFactor = Math.pow(1 + inf / 100, t);
      const targetNominalAtMonth = requiredCapitalReal * infFactor;

      if (curNominalCapital >= targetNominalAtMonth) {
        break;
      }

      if (monthsElapsed > 0 && monthsElapsed % 12 === 0) {
        currentMonthlyDeposit *= (1 + (depGrowth / 100));
      }

      if (lumpAmount > 0 && monthsElapsed === lumpYears * 12) {
        curNominalCapital += lumpAmount;
        totalContributedNominal += lumpAmount;
      }

      curNominalCapital = (curNominalCapital + currentMonthlyDeposit) * (1 + monthlyRateNominal);
      totalContributedNominal += currentMonthlyDeposit;
      monthsElapsed++;
    }

    const yearsElapsed = monthsElapsed / 12;
    const yearsToFIRE = Math.floor(monthsElapsed / 12);
    const remainingMonthsToFIRE = monthsElapsed % 12;
    const estimatedRetireAge = Number((cAge + yearsElapsed).toFixed(1));

    // Cumulative inflation factor at retirement milestone
    const cumInfAtRetire = Math.pow(1 + inf / 100, yearsElapsed);

    // Target capital at retirement (nominal)
    const requiredCapitalNominal = curNominalCapital;

    // Real values discounted back to today's purchasing power:
    // RealValue = NominalValue / (1 + inf)^years
    const finalCapitalReal = requiredCapitalNominal / cumInfAtRetire;
    const totalContributedReal = totalContributedNominal / cumInfAtRetire;
    const profitGeneratedNominal = Math.max(0, requiredCapitalNominal - totalContributedNominal);
    const profitGeneratedReal = profitGeneratedNominal / cumInfAtRetire;

    // Gross nominal withdrawal at retirement
    const grossMonthlyWithdrawalNominal = grossMonthlyWithdrawalReal * cumInfAtRetire;

    // Proof Table: 3 First Years in Retirement (Nominal values)
    const proofTable = [];
    let currentProofCap = requiredCapitalNominal;
    let currentProofWithdrawalGross = grossMonthlyWithdrawalNominal * 12;

    for (let y = 1; y <= 3; y++) {
      const openingNominal = currentProofCap;
      const grossReturnNominal = openingNominal * nominalRetNetRate;
      const grossWithdrawalNominal = currentProofWithdrawalGross;
      const taxPaidNominal = grossWithdrawalNominal * taxRate;
      const netHandNominal = grossWithdrawalNominal - taxPaidNominal;
      const closingNominal = openingNominal + grossReturnNominal - grossWithdrawalNominal;

      proofTable.push({
        year: y,
        openingNominal,
        grossReturnNominal,
        grossWithdrawalNominal,
        taxPaidNominal,
        netHandNominal,
        closingNominal
      });

      currentProofWithdrawalGross *= (1 + inf / 100);
      currentProofCap = closingNominal;
    }

    return {
      yearsToFIRE,
      remainingMonthsToFIRE,
      estimatedRetireAge,
      requiredCapitalReal: finalCapitalReal,
      requiredCapitalNominal,
      totalContributedReal,
      totalContributedNominal,
      profitGeneratedReal,
      profitGeneratedNominal,
      proofTable
    };
  }, [userFireData]);

  // Sensitivity Matrix (accumulation return x initial monthly deposit)
  const sensitivityData = useMemo(() => {
    const data = userFireData;
    const returnRates = [5.0, 6.0, 7.0, 8.0, 9.0];
    const baseDep = Math.max(1000, parseFloat(data.monthlyDeposit) || 5000);
    const deposits = [-2000, -1000, 0, 1000, 2000].map(o => Math.max(1000, baseDep + o));
    const depGrowth = parseFloat(data.annualDepositGrowth) || 0;
    const mgmt = Math.max(0, parseFloat(data.annualManagementFee) || 0);
    const inf = Math.max(0, parseFloat(data.annualInflation) || 0);
    const initCap = Math.max(0, parseFloat(data.initialCapital) || 0);
    const lumpAmount = parseFloat(data.lumpSumAmount) || 0;
    const lumpYears = parseInt(data.lumpSumYears) || 0;
    const retR = Math.max(0, parseFloat(data.retirementReturn) || 0);
    const netWithdrawal = Math.max(0, parseFloat(data.desiredNetMonthlyWithdrawal) || 0);
    const taxRate = Math.min(0.99, Math.max(0, (parseFloat(data.capitalGainsTax) || 25) / 100));

    const grossMonthlyWithdrawalReal = netWithdrawal / Math.max(0.01, (1 - taxRate));
    const desiredAnnualGrossReal = grossMonthlyWithdrawalReal * 12;
    const nominalRetNetRate = (retR - mgmt) / 100;
    const realPreservationRate = Math.max(0.0001, nominalRetNetRate - (inf / 100));
    const requiredCapitalReal = desiredAnnualGrossReal / realPreservationRate;

    const matrix = returnRates.map(r => {
      const nominalAccNetRate = (r - mgmt) / 100;
      const monthlyRateNominal = nominalAccNetRate > -1
        ? Math.pow(1 + nominalAccNetRate, 1 / 12) - 1
        : 0;

      const rowCells = deposits.map(d => {
        let cap = initCap;
        let curDep = d;
        let m = 0;
        while (m < 1200) {
          const t = m / 12;
          const infFactor = Math.pow(1 + inf / 100, t);
          if (cap >= requiredCapitalReal * infFactor) break;

          if (m > 0 && m % 12 === 0) curDep *= (1 + (depGrowth / 100));
          if (lumpAmount > 0 && m === lumpYears * 12) cap += lumpAmount;

          cap = (cap + curDep) * (1 + monthlyRateNominal);
          m++;
        }
        return Number((m / 12).toFixed(1));
      });
      return { returnRate: r, cells: rowCells };
    });

    return { deposits, matrix };
  }, [userFireData]);

  return (
    <div className="space-y-6">
      {/* Header and User Profile Selection */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-5 font-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2] flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">מחשבון עצמאות כלכלית</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                חישוב היעד ומשך הזמן הנדרש להשגת עצמאות כלכלית ופרישה
              </p>
            </div>
          </div>

          {/* User profile selection buttons with Shared Capital */}
          <div className="flex flex-wrap gap-2">
            {!isSingleUser && (
              <button
                type="button"
                onClick={() => handleSwitchUser('shared', true)}
                className={`py-2 px-3.5 font-bold text-xs rounded-xl border transition shadow-xs cursor-pointer ${
                  activeFireUser === 'shared'
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                    : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 border-[#DDD6CA]'
                }`}
                title="לחץ למשיכת סך ההון הנזיל המשותף"
              >
                הון משותף (<span className="privacy-blur">{fmtILS(sharedLiquid, isPrivacyMode)}</span>)
              </button>
            )}
            {users.map(member => {
              const memberUid = member.uid || member.id;
              const memberAccs = isSingleUser ? accounts : accounts.filter(a => a.ownerId === memberUid);
              const totals = getAccountTotalsForMonth(memberAccs, selectedMonth);
              const isActive = isSingleUser || activeFireUser === memberUid;
              return (
                <button
                  key={memberUid}
                  type="button"
                  onClick={() => handleSwitchUser(memberUid, true)}
                  className={`py-2 px-3.5 font-bold text-xs rounded-xl border transition shadow-xs cursor-pointer ${
                    isActive 
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]' 
                    : 'bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 border-[#DDD6CA]'
                  }`}
                  title="לחץ למשיכת יתרת ההון הנזיל העדכנית"
                >
                  {isSingleUser 
                    ? <span>משוך נתוני {member.displayName || member.name} (<span className="privacy-blur">{fmtILS(totals.liquid, isPrivacyMode)}</span>)</span>
                    : <span>עבור לנתוני {member.displayName || member.name} (<span className="privacy-blur">{fmtILS(totals.liquid, isPrivacyMode)}</span>)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-700 font-bold">הון התחלתי קיים (₪):</label>
              <button
                type="button"
                onClick={handleSyncWithLiquid}
                className="text-[11px] text-[#2E7D32] hover:underline font-bold cursor-pointer"
                title="טען הון נזיל עדכני (קצר + בינוני)"
              >
                טען נזיל (<span className="privacy-blur">{fmtILS(activeUserLiquid, isPrivacyMode)}</span>)
              </button>
            </div>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any"
              value={userFireData.initialCapital ?? ''} 
              onChange={(e) => handleFireChange('initialCapital', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">הפקדה חודשית נוכחית (₪):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any"
              value={userFireData.monthlyDeposit ?? ''} 
              onChange={(e) => handleFireChange('monthlyDeposit', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">משיכה חודשית נטו מבוקשת (₪ היום):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any"
              value={userFireData.desiredNetMonthlyWithdrawal ?? ''} 
              onChange={(e) => handleFireChange('desiredNetMonthlyWithdrawal', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">גידול הפקדות שנתי (%) (אופציונלי):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.annualDepositGrowth ?? ''} 
              onChange={(e) => handleFireChange('annualDepositGrowth', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">הפקדה חד פעמית עתידית (₪) (אופציונלי):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.lumpSumAmount ?? ''} 
              onChange={(e) => handleFireChange('lumpSumAmount', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">בעוד כמה שנים (הפקדה חד פעמית):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.lumpSumYears ?? ''} 
              onChange={(e) => handleFireChange('lumpSumYears', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">גיל נוכחי:</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.currentAge ?? ''} 
              onChange={(e) => handleFireChange('currentAge', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">מס רווח הון (% על הרווחים):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.capitalGainsTax ?? ''} 
              onChange={(e) => handleFireChange('capitalGainsTax', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">תשואה בצבירה (% נומינלי):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.accumulationReturn ?? ''} 
              onChange={(e) => handleFireChange('accumulationReturn', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">תשואה בפרישה (% נומינלי):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.retirementReturn ?? ''} 
              onChange={(e) => handleFireChange('retirementReturn', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">אינפלציה שנתית צפויה (%):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.annualInflation ?? ''} 
              onChange={(e) => handleFireChange('annualInflation', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>

          <div>
            <label className="text-xs text-stone-700 font-bold block mb-1">דמי ניהול שנתיים מצבירה (%):</label>
            <input 
              type={isPrivacyMode ? "password" : "number"} 
              step="any" 
              value={userFireData.annualManagementFee ?? ''} 
              onChange={(e) => handleFireChange('annualManagementFee', e.target.value)} 
              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-2.5 text-xs outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] transition privacy-blur" 
            />
          </div>
        </div>
      </div>

      {/* Summary Cards with Real (discounted) Values & Nominal in Parentheses - 2 Structured Rows */}
      <div className="space-y-4">
        {/* Row 1: 2 Cards (Equal width on md+, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Time to FIRE */}
          <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-5 rounded-2xl shadow-xs hover:shadow-card transition">
            <span className="text-xs text-stone-500 font-bold block mb-1">זמן להגעה ליעד</span>
            <div className="text-2xl sm:text-3xl font-black text-[#2E7D32] privacy-blur">
              {isPrivacyMode ? '•• שנים ו-•• ח׳' : `${calcResults.yearsToFIRE} שנים ו-${calcResults.remainingMonthsToFIRE} ח'`}
            </div>
            <span className="text-[11px] text-stone-400 block mt-1">צבירה חודשית מחושבת</span>
          </div>

          {/* Card 2: Estimated Age */}
          <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-5 rounded-2xl shadow-xs hover:shadow-card transition">
            <span className="text-xs text-stone-500 font-bold block mb-1">גיל מוערך בפרישה</span>
            <div className="text-2xl sm:text-3xl font-black text-[#1976D2] privacy-blur">
              {isPrivacyMode ? '••' : calcResults.estimatedRetireAge}
            </div>
            <span className="text-[11px] text-stone-400 block mt-1">
              מגיל בסיס <span className="privacy-blur">{isPrivacyMode ? '••' : (userFireData.currentAge || 30)}</span>
            </span>
          </div>
        </div>

        {/* Row 2: 3 Cards (Equal width on md+, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Required Capital (Real + Nominal) */}
          <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 rounded-2xl shadow-xs hover:shadow-card transition">
            <span className="text-xs text-stone-500 font-bold block mb-1">קרן נדרשת נטו (בערכי היום)</span>
            <div className="text-2xl sm:text-3xl font-black text-stone-900 privacy-blur">
              {fmtILS(calcResults.requiredCapitalReal, isPrivacyMode)}
            </div>
            <span className="text-[11px] text-stone-500 font-semibold block mt-1">
              (נומינלי בפרישה: <span className="privacy-blur font-bold">{fmtILS(calcResults.requiredCapitalNominal, isPrivacyMode)}</span>)
            </span>
          </div>

          {/* Card 2: Total Contributed (Real + Nominal) */}
          <div className="bg-[#FFFFFF] border border-[#FFE0B2] p-5 rounded-2xl shadow-xs hover:shadow-card transition">
            <span className="text-xs text-stone-500 font-bold block mb-1">סה"כ יופקד מכיסך לאורך השנים</span>
            <div className="text-2xl sm:text-3xl font-black text-[#E65100] privacy-blur">
              {fmtILS(calcResults.totalContributedReal, isPrivacyMode)}
            </div>
            <span className="text-[11px] text-stone-500 font-semibold block mt-1">
              (נומינלי: <span className="privacy-blur font-bold">{fmtILS(calcResults.totalContributedNominal, isPrivacyMode)}</span>)
            </span>
          </div>

          {/* Card 3: Profit Generated (Real + Nominal) */}
          <div className="bg-[#FFFFFF] border border-[#E1BEE7] p-5 rounded-2xl shadow-xs hover:shadow-card transition">
            <span className="text-xs text-stone-500 font-bold block mb-1">סה"כ רווח נקי מריבית דריבית</span>
            <div className="text-2xl sm:text-3xl font-black text-[#7B1FA2] privacy-blur">
              {fmtILS(calcResults.profitGeneratedReal, isPrivacyMode)}
            </div>
            <span className="text-[11px] text-stone-500 font-semibold block mt-1">
              (נומינלי: <span className="privacy-blur font-bold">{fmtILS(calcResults.profitGeneratedNominal, isPrivacyMode)}</span>)
            </span>
          </div>
        </div>
      </div>

      {/* Sensitivity Matrix */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-stone-900">מטריצת רגישות — זמן ליעד (שנים)</h3>
          <span className="text-[11px] text-stone-500 block mt-0.5">תשואת צבירה נומינלית × הפקדה חודשית</span>
        </div>

        <div className="overflow-x-auto">
          {(() => {
            const allVals = sensitivityData.matrix.flatMap(r => r.cells);
            const minV = allVals.length ? Math.min(...allVals) : 0;
            const maxV = allVals.length ? Math.max(...allVals) : 100;
            const span = maxV - minV;

            return (
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E2D8] text-stone-600">
                    <th className="py-2.5 px-3 text-right">תשואה \ הפקדה</th>
                    {sensitivityData.deposits.map((d, idx) => (
                      <th key={idx} className="py-2.5 px-3 privacy-blur">{fmtILS(d, isPrivacyMode)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D8]">
                  {sensitivityData.matrix.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#FAF7F2]">
                      <td className="py-2.5 px-3 font-bold text-right text-stone-900 privacy-blur">{isPrivacyMode ? '•••%' : `${row.returnRate.toFixed(1)}%`}</td>
                      {row.cells.map((val, cIdx) => {
                        const ratio = span > 0 ? (val - minV) / span : 0;
                        let bgStyle = 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'; // Low = Green
                        if (ratio > 0.75) {
                          bgStyle = 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'; // High = Red
                        } else if (ratio > 0.5) {
                          bgStyle = 'bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]'; // Mid-high = Orange
                        } else if (ratio > 0.25) {
                          bgStyle = 'bg-[#FFFDE7] text-[#F57F17] border border-[#FFF9C4]'; // Mid-low = Yellow
                        }
                        
                        return (
                          <td key={cIdx} className="py-2 px-2">
                            <div className={`py-1.5 px-2 rounded-xl text-xs font-black privacy-blur ${bgStyle}`}>
                              {isPrivacyMode ? '••' : val}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Proof Table: First 3 Years in Retirement */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900">הוכחת שימור הון פרישה בערכים נומינליים</h3>
            <span className="text-[11px] text-stone-500 block mt-0.5">בחינת 3 שנות המשיכה הראשונות בפרישה</span>
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D8] text-xs text-stone-700 leading-relaxed space-y-2">
          <p>
            הטבלה מדגימה את שימור הקרן ב-3 השנים הראשונות בפרישה <strong>בערכים נומינליים</strong>, בהתחשב במס רווח הון של <span className="privacy-blur">{isPrivacyMode ? '••%' : `${userFireData.capitalGainsTax || 0}%`}</span>. 
            על מנת להבטיח משיכה נטו בכוח קנייה של <strong className="privacy-blur">{fmtILS(userFireData.desiredNetMonthlyWithdrawal || 0, isPrivacyMode)} לחודש במונחי היום</strong>, משיכת הברוטו גדלה מדי שנה בשיעור האינפלציה (<span className="privacy-blur">{isPrivacyMode ? '••%' : `${(userFireData.annualInflation || 0)}%`}</span>).
          </p>
          <p>
            התשואה הנומינלית נטו מפצה על המשיכה והאינפלציה, כך שיתרת הסגירה גדלה בכל שנה בדיוק בשיעור האינפלציה השנתי (<span className="privacy-blur">{isPrivacyMode ? '••%' : `${(userFireData.annualInflation || 0)}%`}</span>) — מה שמבטיח שכוח הקנייה הריאלי של הקרן ושל המשיכה החודשית נשמרים לנצח.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-[#E8E2D8] text-stone-500">
                <th className="py-2 px-2">שנה</th>
                <th className="py-2 px-2">יתרת פתיחה נומינלית</th>
                <th className="py-2 px-2">רווח מהשקעה נומינלי</th>
                <th className="py-2 px-2">משיכה ברוטו (מוצמדת)</th>
                <th className="py-2 px-2">מס במקור ששולם</th>
                <th className="py-2 px-2">סה"כ נטו ביד לשנה</th>
                <th className="py-2 px-2 text-left">יתרת סגירה נומינלית</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8]">
              {calcResults.proofTable.map(row => (
                <tr key={row.year} className="hover:bg-[#FAF7F2]">
                  <td className="py-3 px-2 font-bold text-stone-900">שנה <span className="privacy-blur">{isPrivacyMode ? '•' : row.year}</span> בפרישה</td>
                  <td className="py-3 px-2 text-stone-700 privacy-blur">{fmtILS(row.openingNominal, isPrivacyMode)}</td>
                  <td className="py-3 px-2 text-[#2E7D32] font-black privacy-blur">{fmtILS(row.grossReturnNominal, isPrivacyMode)}</td>
                  <td className="py-3 px-2 text-stone-700 privacy-blur">{fmtILS(row.grossWithdrawalNominal, isPrivacyMode)}</td>
                  <td className="py-3 px-2 text-[#C62828] font-bold privacy-blur">({fmtILS(row.taxPaidNominal, isPrivacyMode)})</td>
                  <td className="py-3 px-2 text-[#1976D2] font-black privacy-blur">
                    {fmtILS(row.netHandNominal, isPrivacyMode)}
                  </td>
                  <td className="py-3 px-2 text-stone-900 font-black text-left privacy-blur">{fmtILS(row.closingNominal, isPrivacyMode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

