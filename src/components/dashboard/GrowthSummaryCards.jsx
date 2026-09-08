import React from 'react';
import { fmtCurrency } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function GrowthSummaryCards({
  avgMonthlyTotalGrowth,
  totalGrowthAmount,
  avgMonthlyLiquidGrowth,
  liquidGrowthAmount,
  isPrivacyMode: propPrivacy,
  currency = 'ILS'
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-sans">
      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-r from-emerald-500/[0.03] to-transparent border border-[#E8E2D8] dark:border-stone-800 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5">
        <div>
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון כולל</div>
          <div className={`text-xl sm:text-2xl font-black privacy-blur ${avgMonthlyTotalGrowth < 0 ? 'text-[#C62828] dark:text-red-400' : 'text-[#2E7D32] dark:text-emerald-400'}`}>
            {fmtCurrency(avgMonthlyTotalGrowth, currency, isPrivacyMode)}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className={`font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border shrink-0 privacy-blur shadow-xs ${
          totalGrowthAmount < 0 
            ? 'text-[#C62828] bg-[#FFEBEE] border-[#FFCDD2] dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-300' 
            : 'text-[#2E7D32] bg-[#E8F5E9] border-[#C8E6C9] dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-300'
        }`}>
          {fmtCurrency(totalGrowthAmount, currency, isPrivacyMode)}
        </div>
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-r from-blue-500/[0.03] to-transparent border border-[#E8E2D8] dark:border-stone-800 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5">
        <div>
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון נזיל</div>
          <div className={`text-xl sm:text-2xl font-black privacy-blur ${avgMonthlyLiquidGrowth < 0 ? 'text-[#C62828] dark:text-red-400' : 'text-[#1976D2] dark:text-blue-400'}`}>
            {fmtCurrency(avgMonthlyLiquidGrowth, currency, isPrivacyMode)}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className={`font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border shrink-0 privacy-blur shadow-xs ${
          liquidGrowthAmount < 0 
            ? 'text-[#C62828] bg-[#FFEBEE] border-[#FFCDD2] dark:bg-red-950/40 dark:border-red-900/40 dark:text-red-300' 
            : 'text-[#1976D2] bg-[#E3F2FD] border-[#BBDEFB] dark:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-300'
        }`}>
          {fmtCurrency(liquidGrowthAmount, currency, isPrivacyMode)}
        </div>
      </div>
    </div>
  );
}
