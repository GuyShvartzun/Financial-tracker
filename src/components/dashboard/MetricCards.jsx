import React from 'react';
import { TrendingUp, Wallet, Coins, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmtILS, fmtNum, fmtPct } from '../../utils/formatters';

export default function MetricCards({ netWorth, liquid, nonLiquid, liabilities, growthPct }) {
  const liquidityRatio = netWorth ? (liquid / netWorth) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-sans">
      
      {/* 1. Net Worth Card */}
      <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-4 sm:p-5 rounded-2xl shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-xs text-stone-500 font-bold">סך הון כולל נטו</div>
          <div className="w-7 h-7 rounded-lg bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center border border-[#C8E6C9]/60">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#2E7D32] tracking-tight privacy-blur">{fmtILS(netWorth)}</div>
        <div className="mt-2 text-xs text-stone-600 flex items-center gap-1.5">
          <span>צמיחה מתחילת מעקב:</span>
          <span className={`font-black flex items-center gap-0.5 privacy-blur ${growthPct < 0 ? 'text-[#C62828]' : 'text-[#2E7D32]'}`}>
            {growthPct < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            <span>{growthPct < 0 ? fmtPct(growthPct) : (growthPct > 0 ? `+${fmtPct(growthPct)}` : fmtPct(growthPct))}</span>
          </span>
        </div>
      </div>

      {/* 2. Liquid Capital Card */}
      <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-xs text-stone-500 font-bold">סך הון נזיל</div>
          <div className="w-7 h-7 rounded-lg bg-[#E3F2FD] text-[#1976D2] flex items-center justify-center border border-[#BBDEFB]/60">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#1976D2] tracking-tight privacy-blur">{fmtILS(liquid)}</div>
        <div className="mt-2 text-xs text-stone-600 flex items-center gap-1">
          <span>שיעור נזילות:</span>
          <strong className="text-[#1976D2] font-black privacy-blur">{fmtPct(liquidityRatio)}</strong>
        </div>
      </div>

      {/* 3. Non-Liquid Capital Card */}
      <div className="bg-[#FFFFFF] border border-[#E1BEE7] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-xs text-stone-500 font-bold">סך הון לא נזיל</div>
          <div className="w-7 h-7 rounded-lg bg-[#F3E5F5] text-[#7B1FA2] flex items-center justify-center border border-[#E1BEE7]/60">
            <Coins className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#7B1FA2] tracking-tight privacy-blur">{fmtILS(nonLiquid)}</div>
        <div className="mt-2 text-xs text-stone-500 font-medium">חיסכון פנסיוני וקופות גמל</div>
      </div>

      {/* 4. Liabilities Card */}
      <div className="bg-[#FFFFFF] border border-[#FFCDD2] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-xs text-stone-500 font-bold">סך התחייבויות</div>
          <div className="w-7 h-7 rounded-lg bg-[#FFEBEE] text-[#C62828] flex items-center justify-center border border-[#FFCDD2]/60">
            <Scale className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#C62828] tracking-tight privacy-blur">₪{fmtNum(liabilities)}</div>
        <div className="mt-2 text-xs text-stone-500 font-medium">הלוואות ואשראי</div>
      </div>

    </div>
  );
}
