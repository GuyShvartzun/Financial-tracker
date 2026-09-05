import React, { useMemo } from 'react';
import MetricCards from './MetricCards';
import GrowthSummaryCards from './GrowthSummaryCards';
import EmergencyFundCard from './EmergencyFundCard';
import DemographicBox from './DemographicBox';
import DonutDistributionChart from '../charts/DonutDistributionChart';
import PersonalGrowthLineChart from '../charts/PersonalGrowthLineChart';
import WaterfallChartModule from '../charts/WaterfallChartModule';
import { fmtILS } from '../../utils/formatters';
import { sortAccountsByDataEntryOrder } from '../../utils/calculations';
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] p-3 sm:p-3.5 rounded-2xl border border-[#E8E2D8] shadow-xs">
          <span className="text-xs sm:text-sm font-bold text-stone-700">בחר פרופיל אישי לצפייה:</span>
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
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs'
                      : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F2ECE1] border-[#DDD6CA]'
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

        <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs">
          <h3 className="text-lg font-bold text-stone-900 mb-4">
            {isSingleMember 
              ? 'פירוט חשבונות ונכסים' 
              : `פירוט חשבונות אישיים ${(activeUser?.displayName || activeUser?.name) ? `(${activeUser.displayName || activeUser.name})` : ''}`}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-[#E8E2D8] text-stone-500">
                  <th className="py-2 px-2">שם החשבון</th>
                  <th className="py-2 px-2">קטגוריה</th>
                  <th className="py-2 px-2 text-left">יתרה נכונה ל-{selectedMonth}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D8]">
                {sortedUserAccs.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-stone-500">
                      לא נמצאו חשבונות עבור פרופיל זה. היכנסו ל"הזנת נתונים" כדי להוסיף חשבון חדש.
                    </td>
                  </tr>
                )}
                {sortedUserAccs.map(acc => (
                  <tr key={acc.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2.5 px-2 font-bold text-stone-800">
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.category === 'short' ? 'bg-[#FFE0B2] text-[#E65100]' :
                        acc.category === 'medium' ? 'bg-[#BBDEFB] text-[#1976D2]' :
                        acc.category === 'long' ? 'bg-[#E1BEE7] text-[#7B1FA2]' : 'bg-[#FFCDD2] text-[#C62828]'
                      }`}>
                        {acc.category === 'short' ? 'טווח קצר' : acc.category === 'medium' ? 'טווח בינוני' : acc.category === 'long' ? 'טווח ארוך' : 'התחייבות'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-left font-black text-[#2E7D32] privacy-blur">
                      {fmtILS(acc.balances?.[selectedMonth] || 0, isPrivacyMode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
