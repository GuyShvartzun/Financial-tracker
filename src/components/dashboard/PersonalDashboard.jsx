import React, { useMemo } from 'react';
import { Wallet, PlusCircle } from 'lucide-react';
import MetricCards from './MetricCards';
import GrowthSummaryCards from './GrowthSummaryCards';
import EmergencyFundCard from './EmergencyFundCard';
import DemographicBox from './DemographicBox';
import DonutDistributionChart from '../charts/DonutDistributionChart';
import PersonalGrowthLineChart from '../charts/PersonalGrowthLineChart';
import WaterfallChartModule from '../charts/WaterfallChartModule';
import { fmtILS, fmtCurrency } from '../../utils/formatters';
import { sortAccountsByDataEntryOrder, DEFAULT_EXCHANGE_RATES } from '../../utils/calculations';
import { usePrivacy } from '../../context/PrivacyContext';

export default function PersonalDashboard({
  personalStats,
  selectedPersonalUserId,
  setSelectedPersonalUserId,
  selectedMonth,
  monthsList,
  accounts,
  users = [],
  isSingleMember = false,
  roomStats,
  budgetTotals,
  activeUserId = '',
  isPrivacyMode: propPrivacy
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const activeUser = users.find(u => (u.uid || u.id) === selectedPersonalUserId) 
    || users.find(u => (u.uid || u.id) === activeUserId) 
    || users[0];
  const activeUid = activeUser?.uid || activeUser?.id;

  const sortedUserAccs = useMemo(() => {
    return sortAccountsByDataEntryOrder(personalStats?.userAccs || []);
  }, [personalStats?.userAccs]);

  return (
    <div className="space-y-6">
      {!isSingleMember && users.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1A1D27] p-3 sm:p-3.5 rounded-2xl border border-[#E8E2D8] dark:border-stone-800 shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">בחר פרופיל אישי לצפייה:</span>
          <div className="flex flex-wrap gap-2">
            {users.map(u => {
              const uUid = u.uid || u.id;
              const isSelected = selectedPersonalUserId === uUid || (!selectedPersonalUserId && activeUid === uUid);
              return (
                <button
                  key={uUid}
                  type="button"
                  onClick={() => setSelectedPersonalUserId(uUid)}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 shadow-xs'
                      : 'bg-[#FAF7F2] text-stone-700 dark:bg-stone-800/60 dark:text-stone-300 hover:bg-[#F2ECE1] border-[#DDD6CA] dark:border-stone-700'
                  }`}
                >
                  {u.displayName || u.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <MetricCards
        netWorth={personalStats?.netWorth || 0}
        liquid={personalStats?.liquid || 0}
        nonLiquid={personalStats?.long || 0}
        liabilities={personalStats?.liability || 0}
        growthPct={personalStats?.growthPct || 0}
        isPrivacyMode={isPrivacyMode}
      />

      <GrowthSummaryCards
        avgMonthlyTotalGrowth={personalStats.avgMonthlyTotalGrowth}
        totalGrowthAmount={personalStats.totalGrowthAmount}
        avgMonthlyLiquidGrowth={personalStats.avgMonthlyLiquidGrowth}
        liquidGrowthAmount={personalStats.liquidGrowthAmount}
        isPrivacyMode={isPrivacyMode}
      />

      <PersonalGrowthLineChart 
        userId={selectedPersonalUserId || activeUid} 
        monthsList={monthsList} 
        currentNetWorth={personalStats?.netWorth || 0}
        currentLiquid={personalStats?.liquid || 0}
        accounts={accounts}
        isSingleMember={isSingleMember}
        isPrivacyMode={isPrivacyMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutDistributionChart personalStats={personalStats} isPrivacyMode={isPrivacyMode} />

        <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] border border-[#E8E2D8] dark:border-stone-800 p-4 sm:p-6 rounded-2xl shadow-xs transition-all duration-200">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
            {isSingleMember 
              ? 'פירוט חשבונות ונכסים' 
              : `פירוט חשבונות אישיים ${(activeUser?.displayName || activeUser?.name) ? `(${activeUser.displayName || activeUser.name})` : ''}`}
          </h3>

          {/* Empty State */}
          {sortedUserAccs.length === 0 ? (
            <div className="py-8 text-center bg-[#FAF7F2] dark:bg-stone-900/40 border border-dashed border-[#DDD6CA] dark:border-stone-800 rounded-xl text-stone-500 dark:text-stone-400 text-xs space-y-2">
              <Wallet className="w-8 h-8 text-stone-400 dark:text-stone-600 mx-auto" />
              <p className="font-bold">לא נמצאו חשבונות עבור פרופיל זה.</p>
              <p className="text-[11px]">היכנסו ל"הזנת נתונים" כדי להוסיף חשבון חדש.</p>
            </div>
          ) : (
            <>
              {/* Responsive Table View */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-xs text-right min-w-[320px]">
                  <thead>
                    <tr className="border-b border-[#E8E2D8] dark:border-stone-800 text-stone-500 dark:text-stone-400 font-bold">
                      <th className="py-2.5 px-2">שם החשבון</th>
                      <th className="py-2.5 px-2">קטגוריה</th>
                      <th className="py-2.5 px-2 text-left">יתרה נכונה ל-{selectedMonth}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E2D8] dark:divide-stone-800">
                    {sortedUserAccs.map(acc => (
                      <tr key={acc.id} className="hover:bg-[#FAF7F2] dark:hover:bg-stone-800/30 transition-colors">
                        <td className="py-2.5 px-2 font-bold text-stone-800 dark:text-stone-200">
                          <div className="flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            {acc.flaggedMonths?.[selectedMonth] && (
                              <span 
                                className="text-xs shrink-0 cursor-help select-none" 
                                title={`יתרה עבור חודש ${selectedMonth} סומנה כזמנית/דורשת עדכון`}
                              >
                                🚩
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            acc.category === 'short' ? 'bg-[#FFE0B2] text-[#E65100] dark:bg-amber-950/40 dark:text-amber-300' :
                            acc.category === 'medium' ? 'bg-[#BBDEFB] text-[#1976D2] dark:bg-blue-950/40 dark:text-blue-300' :
                            acc.category === 'long' ? 'bg-[#E1BEE7] text-[#7B1FA2] dark:bg-purple-950/40 dark:text-purple-300' : 'bg-[#FFCDD2] text-[#C62828] dark:bg-red-950/40 dark:text-red-300'
                          }`}>
                            {acc.category === 'short' ? 'טווח קצר' : acc.category === 'medium' ? 'טווח בינוני' : acc.category === 'long' ? 'טווח ארוך' : 'התחייבות'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-left font-black text-[#2E7D32] dark:text-emerald-400 privacy-blur">
                          {acc.currency && acc.currency !== 'ILS' ? (
                            <div>
                              <span>{fmtCurrency(acc.balances?.[selectedMonth] || 0, acc.currency, isPrivacyMode)}</span>
                              <div className="text-[10px] text-stone-400 dark:text-stone-500 font-normal">
                                ≈ {fmtILS((parseFloat(acc.balances?.[selectedMonth]) || 0) * (DEFAULT_EXCHANGE_RATES[acc.currency] || 1), isPrivacyMode)}
                              </div>
                            </div>
                          ) : (
                            fmtILS(acc.balances?.[selectedMonth] || 0, isPrivacyMode)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {isSingleMember && budgetTotals && roomStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EmergencyFundCard
            emergencyMonths={roomStats.emergencyMonths}
            shortTermAssets={roomStats.shortTermAssets}
            monthlyExp={roomStats.monthlyExp}
            isPrivacyMode={isPrivacyMode}
          />

          <div className="lg:col-span-2">
            <WaterfallChartModule budgetTotals={budgetTotals} isPrivacyMode={isPrivacyMode} />
          </div>
        </div>
      )}

      <DemographicBox 
        netWorth={personalStats.netWorth} 
        liquid={personalStats.liquid} 
        nonLiquid={personalStats.long}
        isCouple={false}
        label={isSingleMember 
          ? "השוואה דמוגרפית ליחיד מול נתוני הלמ״ס"
          : `השוואה דמוגרפית ליחיד מול נתוני הלמ״ס (${activeUser?.displayName || activeUser?.name || 'פרופיל אישי'})`
        }
        isPrivacyMode={isPrivacyMode}
      />
    </div>
  );
}
