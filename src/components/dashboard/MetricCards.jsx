import React from 'react';
import { TrendingUp, Wallet, Coins, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmtCurrency, fmtPct, SUPPORTED_CURRENCIES } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';
import AnimatedCounter from '../common/AnimatedCounter';

export default function MetricCards({ 
  netWorth, 
  liquid, 
  nonLiquid, 
  liabilities, 
  growthPct, 
  isPrivacyMode: propPrivacy,
  currency = 'ILS'
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const liquidityRatio = netWorth ? (liquid / netWorth) * 100 : 0;
  const curSymbol = SUPPORTED_CURRENCIES[currency]?.symbol || '₪';
  const currFormatter = (val) => fmtCurrency(val, currency, isPrivacyMode);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-sans">
      
      {/* 1. Net Worth Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-transparent border border-[#C8E6C9] dark:border-emerald-800/40 p-4 sm:p-5 rounded-2xl shadow-xs relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold tracking-wide">סך הון כולל נטו</div>
          <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] dark:bg-emerald-950/50 text-[#2E7D32] dark:text-emerald-400 flex items-center justify-center border border-[#C8E6C9]/80 dark:border-emerald-800/50 transition-transform group-hover:scale-105 duration-200">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#2E7D32] dark:text-emerald-400 tracking-tight privacy-blur">
          <AnimatedCounter value={netWorth} isPrivacyMode={isPrivacyMode} formatter={currFormatter} />
        </div>
        <div className="mt-2.5 text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-500 dark:text-stone-400 text-[11px]">צמיחה מתחילת מעקב:</span>
          <span className={`font-black flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] privacy-blur ${
            growthPct < 0 
              ? 'text-[#C62828] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40' 
              : 'text-[#2E7D32] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40'
          }`}>
            {growthPct < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            <span>{growthPct < 0 ? fmtPct(growthPct, isPrivacyMode) : (growthPct > 0 ? `+${fmtPct(growthPct, isPrivacyMode)}` : fmtPct(growthPct, isPrivacyMode))}</span>
          </span>
        </div>
      </div>

      {/* 2. Liquid Capital Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-br from-blue-500/[0.05] via-transparent to-transparent border border-[#BBDEFB] dark:border-blue-800/40 p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold tracking-wide">סך הון נזיל</div>
          <div className="w-8 h-8 rounded-xl bg-[#E3F2FD] dark:bg-blue-950/50 text-[#1976D2] dark:text-blue-400 flex items-center justify-center border border-[#BBDEFB]/80 dark:border-blue-800/50 transition-transform group-hover:scale-105 duration-200">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#1976D2] dark:text-blue-400 tracking-tight privacy-blur">
          <AnimatedCounter value={liquid} isPrivacyMode={isPrivacyMode} formatter={currFormatter} />
        </div>
        <div className="mt-2.5 text-xs text-stone-600 dark:text-stone-300 flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-500 dark:text-stone-400 text-[11px]">שיעור נזילות:</span>
          <span className="font-black text-[#1976D2] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/40 text-[11px] privacy-blur">
            {fmtPct(liquidityRatio, isPrivacyMode)}
          </span>
        </div>
      </div>

      {/* 3. Non-Liquid Capital Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-br from-purple-500/[0.05] via-transparent to-transparent border border-[#E1BEE7] dark:border-purple-800/40 p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold tracking-wide">סך הון לא נזיל</div>
          <div className="w-8 h-8 rounded-xl bg-[#F3E5F5] dark:bg-purple-950/50 text-[#7B1FA2] dark:text-purple-300 flex items-center justify-center border border-[#E1BEE7]/80 dark:border-purple-800/50 transition-transform group-hover:scale-105 duration-200">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#7B1FA2] dark:text-purple-300 tracking-tight privacy-blur">
          <AnimatedCounter value={nonLiquid} isPrivacyMode={isPrivacyMode} formatter={currFormatter} />
        </div>
        <div className="mt-2.5 text-[11px] text-stone-500 dark:text-stone-400 font-medium">חיסכון פנסיוני וקופות גמל</div>
      </div>

      {/* 4. Liabilities Card */}
      <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-br from-red-500/[0.05] via-transparent to-transparent border border-[#FFCDD2] dark:border-red-800/40 p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-bold tracking-wide">סך התחייבויות</div>
          <div className="w-8 h-8 rounded-xl bg-[#FFEBEE] dark:bg-red-950/50 text-[#C62828] dark:text-red-400 flex items-center justify-center border border-[#FFCDD2]/80 dark:border-red-800/50 transition-transform group-hover:scale-105 duration-200">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-[#C62828] dark:text-red-400 tracking-tight privacy-blur">
          <AnimatedCounter 
            value={liabilities} 
            isPrivacyMode={isPrivacyMode} 
            formatter={currFormatter} 
          />
        </div>
        <div className="mt-2.5 text-[11px] text-stone-500 dark:text-stone-400 font-medium">הלוואות ואשראי</div>
      </div>

    </div>
  );
}
