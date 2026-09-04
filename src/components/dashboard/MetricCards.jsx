import React from 'react';
import { fmtILS, fmtNum, fmtPct } from '../../utils/formatters';

export default function MetricCards({ netWorth, liquid, nonLiquid, liabilities, growthPct }) {
  const liquidityRatio = netWorth ? (liquid / netWorth) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-4 sm:p-5 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="text-xs text-stone-500 font-bold mb-1">סך הון כולל נטו</div>
        <div className="text-2xl sm:text-3xl font-black text-[#2E7D32] tracking-tight">{fmtILS(netWorth)}</div>
        <div className="mt-2 text-xs text-stone-600 flex items-center gap-1">
          <span>צמיחה מתחילת מעקב:</span>
          <strong className={growthPct < 0 ? 'text-[#C62828]' : 'text-[#2E7D32]'}>
            {growthPct < 0 ? fmtPct(growthPct) : (growthPct > 0 ? `+${fmtPct(growthPct)}` : fmtPct(growthPct))}
          </strong>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="text-xs text-stone-500 font-bold mb-1">סך הון נזיל</div>
        <div className="text-2xl sm:text-3xl font-black text-[#1976D2] tracking-tight">{fmtILS(liquid)}</div>
        <div className="mt-2 text-xs text-stone-600">
          שיעור נזילות מסך ההון: <strong className="text-[#1976D2]">{fmtPct(liquidityRatio)}</strong>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E1BEE7] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="text-xs text-stone-500 font-bold mb-1">סך הון לא נזיל</div>
        <div className="text-2xl sm:text-3xl font-black text-[#7B1FA2] tracking-tight">{fmtILS(nonLiquid)}</div>
        <div className="mt-2 text-xs text-stone-500">כלים פנסיוניים</div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#FFCDD2] p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="text-xs text-stone-500 font-bold mb-1">סך התחייבויות</div>
        <div className="text-2xl sm:text-3xl font-black text-[#C62828] tracking-tight">₪{fmtNum(liabilities)}</div>
        <div className="mt-2 text-xs text-stone-500">הלוואות</div>
      </div>
    </div>
  );
}
