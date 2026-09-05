import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { fmtILS } from '../../utils/formatters';

export default function EmergencyFundCard({ emergencyMonths, shortTermAssets, monthlyExp }) {
  const progressPct = Math.min(((emergencyMonths || 0) / 6) * 100, 100);

  return (
    <div className="bg-[#FFFFFF] border border-[#FFE0B2] p-6 rounded-2xl shadow-xs flex flex-col justify-between font-sans transition-all duration-200 hover:shadow-card">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-bold text-stone-900">חודשי כיסוי חירום</h3>
          <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] text-[#E65100] flex items-center justify-center border border-[#FFE0B2]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-4xl font-black text-[#E65100] privacy-blur">{(emergencyMonths || 0).toFixed(1)}</span>
          <span className="text-stone-600 font-bold">חודשים</span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed mb-4">
          מבוסס על נכסים נזילים לטווח קצר (<span className="privacy-blur font-bold text-stone-700">{fmtILS(shortTermAssets)}</span>) חלקי סך ההוצאות החודשיות מהתקציב (<span className="privacy-blur font-bold text-stone-700">{fmtILS(monthlyExp)}</span>).
        </p>
      </div>
      <div>
        <div className="w-full bg-[#FAF7F2] rounded-full h-3.5 overflow-hidden border border-[#E8E2D8] privacy-blur">
          <div 
            className="bg-gradient-to-r from-[#FFB74D] to-[#81C784] h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[11px] text-stone-500 mt-2 font-bold">
          <span>0 חודשים</span>
          <span className="text-[#2E7D32]">יעד מומלץ: 6 חודשים (100%)</span>
        </div>
      </div>
    </div>
  );
}
