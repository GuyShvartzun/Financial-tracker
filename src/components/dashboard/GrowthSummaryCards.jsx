import React from 'react';
import { fmtILS } from '../../utils/formatters';

export default function GrowthSummaryCards({
  avgMonthlyTotalGrowth,
  totalGrowthAmount,
  avgMonthlyLiquidGrowth,
  liquidGrowthAmount
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs text-stone-500 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון כולל</div>
          <div className="text-2xl font-black text-[#2E7D32]">{fmtILS(avgMonthlyTotalGrowth)}</div>
          <div className="text-[11px] text-stone-500 mt-1">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className="text-[#2E7D32] font-bold text-sm bg-[#E8F5E9] px-3 py-1.5 rounded-xl border border-[#C8E6C9]">
          +{fmtILS(totalGrowthAmount)}
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <div className="text-xs text-stone-500 font-bold mb-1">צמיחה חודשית ממוצעת - סך הון נזיל</div>
          <div className="text-2xl font-black text-[#1976D2]">{fmtILS(avgMonthlyLiquidGrowth)}</div>
          <div className="text-[11px] text-stone-500 mt-1">ממוצע לאורך תקופת המעקב המוזנת</div>
        </div>
        <div className="text-[#1976D2] font-bold text-sm bg-[#E3F2FD] px-3 py-1.5 rounded-xl border border-[#BBDEFB]">
          +{fmtILS(liquidGrowthAmount)}
        </div>
      </div>
    </div>
  );
}
