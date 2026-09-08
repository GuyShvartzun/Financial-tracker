import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { fmtCurrency } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function EmergencyFundCard({ emergencyMonths, shortTermAssets, monthlyExp, isPrivacyMode: propPrivacy, currency = 'ILS' }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const progressPct = Math.min(((emergencyMonths || 0) / 6) * 100, 100);

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent border border-[#FFE0B2] dark:border-amber-800/40 p-6 rounded-2xl shadow-xs flex flex-col justify-between font-sans transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card group">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">חודשי כיסוי חירום</h3>
          <div className="w-8 h-8 rounded-xl bg-[#FFF3E0] dark:bg-amber-950/50 text-[#E65100] dark:text-amber-400 flex items-center justify-center border border-[#FFE0B2]/80 dark:border-amber-800/50 transition-transform group-hover:scale-105 duration-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 mb-3">
          <span className="text-4xl sm:text-5xl font-black text-[#E65100] dark:text-amber-400 tracking-tight privacy-blur">
            {isPrivacyMode ? '•••' : (emergencyMonths || 0).toFixed(1)}
          </span>
          <span className="text-stone-600 dark:text-stone-300 font-bold text-sm">חודשים</span>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
          מבוסס על נכסים נזילים לטווח קצר (<span className="privacy-blur font-bold text-stone-700 dark:text-stone-200">{fmtCurrency(shortTermAssets, currency, isPrivacyMode)}</span>) חלקי סך ההוצאות החודשיות מהתקציב (<span className="privacy-blur font-bold text-stone-700 dark:text-stone-200">{fmtCurrency(monthlyExp, currency, isPrivacyMode)}</span>).
        </p>
      </div>
      <div>
        <div className="w-full bg-[#FAF7F2] dark:bg-stone-800/60 rounded-full h-3 overflow-hidden border border-[#E8E2D8] dark:border-stone-700 privacy-blur shadow-inner">
          <div 
            className="bg-gradient-to-r from-[#FFB74D] via-[#4CAF50] to-[#2E7D32] h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-2 font-bold">
          <span><span className="privacy-blur">{isPrivacyMode ? '•' : '0'}</span> חודשים</span>
          <span className="text-[#2E7D32] dark:text-emerald-400">יעד מומלץ: <span className="privacy-blur">{isPrivacyMode ? '•' : '6'}</span> חודשים (<span className="privacy-blur">{isPrivacyMode ? '•••%' : `${progressPct.toFixed(0)}%`}</span>)</span>
        </div>
      </div>
    </div>
  );
}
