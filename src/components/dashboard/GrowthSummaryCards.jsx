import React from 'react';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function GrowthSummaryCards({
  avgMonthlyTotalGrowth,
  totalGrowthAmount,
  avgMonthlyLiquidGrowth,
  liquidGrowthAmount
}) {
  const { isPrivacyMode } = usePrivacy();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-sans">
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 hover:shadow-card">
        <div>
          <div className="text-xs text-stone-500 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון כולל</div>
          <div className={`text-xl sm:text-2xl font-black privacy-blur ${avgMonthlyTotalGrowth < 0 ? 'text-[#C62828]' : 'text-[#2E7D32]'}`}>
            {fmtILS(avgMonthlyTotalGrowth, isPrivacyMode)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className={`font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border shrink-0 privacy-blur ${
          totalGrowthAmount < 0 
            ? 'text-[#C62828] bg-[#FFEBEE] border-[#FFCDD2]' 
            : 'text-[#2E7D32] bg-[#E8F5E9] border-[#C8E6C9]'
        }`}>
          {fmtILS(totalGrowthAmount, isPrivacyMode)}
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 hover:shadow-card">
        <div>
          <div className="text-xs text-stone-500 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון נזיל</div>
          <div className={`text-xl sm:text-2xl font-black privacy-blur ${avgMonthlyLiquidGrowth < 0 ? 'text-[#C62828]' : 'text-[#1976D2]'}`}>
            {fmtILS(avgMonthlyLiquidGrowth, isPrivacyMode)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className={`font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border shrink-0 privacy-blur ${
          liquidGrowthAmount < 0 
            ? 'text-[#C62828] bg-[#FFEBEE] border-[#FFCDD2]' 
            : 'text-[#1976D2] bg-[#E3F2FD] border-[#BBDEFB]'
        }`}>
          {fmtILS(liquidGrowthAmount, isPrivacyMode)}
        </div>
      </div>
    </div>
  );
}
