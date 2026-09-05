import React from 'react';
import { fmtILS, fmtPct } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function WaterfallChartModule({ budgetTotals, isPrivacyMode: propPrivacy }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const balance = budgetTotals.totalIncome - budgetTotals.totalFixed - budgetTotals.totalVar - budgetTotals.totalSavings;
  const isBalanced = Math.abs(balance) < 1;

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
        <h3 className="text-base sm:text-lg font-bold text-stone-900">
          סיכום תזרימי - גרף מפל
        </h3>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="w-full h-64 bg-[#FAF7F2] rounded-xl p-3 sm:p-5 border border-[#E8E2D8] flex items-end justify-between gap-2 sm:gap-3 relative overflow-hidden">
          
          <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-[#DDD6CA] w-full"></div>
            <div className="border-b border-[#DDD6CA] w-full"></div>
            <div className="border-b border-[#DDD6CA] w-full"></div>
            <div className="border-b border-[#DDD6CA] w-full"></div>
          </div>

          <div className="flex-1 h-full flex flex-col justify-end items-center relative group z-10">
            <div className="text-[10px] sm:text-[11px] font-black text-[#2E7D32] mb-0.5 sm:mb-1 privacy-blur">{fmtILS(budgetTotals.totalIncome, isPrivacyMode)}</div>
            <div className="text-[9px] text-[#2E7D32] mb-1 font-bold privacy-blur">{isPrivacyMode ? '•••%' : '100%'}</div>
            <div className="w-full max-w-[42px] sm:max-w-[54px] bg-[#A5D6A7] rounded-t-lg h-full transition-all duration-500 shadow-xs privacy-blur"></div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-700 mt-2 text-center whitespace-nowrap">הכנסות</span>
          </div>

          <div className="flex-1 h-full flex flex-col justify-end items-center relative group z-10">
            <div className="text-[10px] sm:text-[11px] font-black text-[#C62828] mb-0.5 sm:mb-1 privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalFixed, true) : `-${fmtILS(budgetTotals.totalFixed)}`}</div>
            <div className="text-[9px] text-[#C62828] mb-1 font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.fixedPct)}`}</div>
            <div className="w-full max-w-[42px] sm:max-w-[54px] h-full relative">
              <div 
                className="w-full bg-[#EF9A9A] rounded-lg absolute transition-all duration-500 shadow-xs privacy-blur"
                style={{
                  bottom: `${Math.max(100 - budgetTotals.fixedPct, 0)}%`,
                  height: `${Math.min(budgetTotals.fixedPct, 100)}%`
                }}
              ></div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-700 mt-2 text-center whitespace-nowrap">הוצאות קבועות</span>
          </div>

          <div className="flex-1 h-full flex flex-col justify-end items-center relative group z-10">
            <div className="text-[10px] sm:text-[11px] font-black text-[#E65100] mb-0.5 sm:mb-1 privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalVar, true) : `-${fmtILS(budgetTotals.totalVar)}`}</div>
            <div className="text-[9px] text-[#E65100] mb-1 font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.varPct)}`}</div>
            <div className="w-full max-w-[42px] sm:max-w-[54px] h-full relative">
              <div 
                className="w-full bg-[#FFCC80] rounded-lg absolute transition-all duration-500 shadow-xs privacy-blur"
                style={{
                  bottom: `${Math.max(100 - budgetTotals.fixedPct - budgetTotals.varPct, 0)}%`,
                  height: `${Math.min(budgetTotals.varPct, 100)}%`
                }}
              ></div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-700 mt-2 text-center whitespace-nowrap">הוצאות משתנות</span>
          </div>

          <div className="flex-1 h-full flex flex-col justify-end items-center relative group z-10">
            <div className="text-[10px] sm:text-[11px] font-black text-[#1976D2] mb-0.5 sm:mb-1 privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalSavings, true) : `-${fmtILS(budgetTotals.totalSavings)}`}</div>
            <div className="text-[9px] text-[#1976D2] mb-1 font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.savingsPct)}`}</div>
            <div className="w-full max-w-[42px] sm:max-w-[54px] h-full relative">
              <div 
                className="w-full bg-[#90CAF9] rounded-lg absolute transition-all duration-500 shadow-xs privacy-blur"
                style={{
                  bottom: '0%',
                  height: `${Math.min(budgetTotals.savingsPct, 100)}%`
                }}
              ></div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-stone-700 mt-2 text-center whitespace-nowrap">חיסכון והשקעה</span>
          </div>

        </div>
      </div>

      <div className="overflow-x-auto pt-1">
        <table className="w-full text-xs text-right border-collapse">
          <thead>
            <tr className="border-b border-[#E8E2D8] text-stone-500 text-[10px] sm:text-[11px]">
              <th className="py-1.5 px-2">שלב בתזרים</th>
              <th className="py-1.5 px-2">שינוי</th>
              <th className="py-1.5 px-2">אחוז</th>
              <th className="py-1.5 px-2 text-left">יתרה בתקציב</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E2D8] text-[11px]">
            <tr className="hover:bg-[#FAF7F2]">
              <td className="py-2 px-2 font-bold text-[#2E7D32]">הכנסות</td>
              <td className="py-2 px-2 font-bold text-[#2E7D32] privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalIncome, true) : `+${fmtILS(budgetTotals.totalIncome)}`}</td>
              <td className="py-2 px-2 text-stone-600 font-bold privacy-blur">{isPrivacyMode ? '•••%' : '100.0%'}</td>
              <td className="py-2 px-2 text-left font-bold text-stone-900 privacy-blur">{fmtILS(budgetTotals.totalIncome, isPrivacyMode)}</td>
            </tr>
            <tr className="hover:bg-[#FAF7F2]">
              <td className="py-2 px-2 font-bold text-[#C62828]">הוצאות קבועות</td>
              <td className="py-2 px-2 font-bold text-[#C62828] privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalFixed, true) : `-${fmtILS(budgetTotals.totalFixed)}`}</td>
              <td className="py-2 px-2 text-[#C62828] font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.fixedPct)}`}</td>
              <td className="py-2 px-2 text-left font-bold text-stone-800 privacy-blur">{fmtILS(budgetTotals.totalIncome - budgetTotals.totalFixed, isPrivacyMode)}</td>
            </tr>
            <tr className="hover:bg-[#FAF7F2]">
              <td className="py-2 px-2 font-bold text-[#E65100]">הוצאות משתנות</td>
              <td className="py-2 px-2 font-bold text-[#E65100] privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalVar, true) : `-${fmtILS(budgetTotals.totalVar)}`}</td>
              <td className="py-2 px-2 text-[#E65100] font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.varPct)}`}</td>
              <td className="py-2 px-2 text-left font-bold text-stone-800 privacy-blur">{fmtILS(budgetTotals.totalIncome - budgetTotals.totalFixed - budgetTotals.totalVar, isPrivacyMode)}</td>
            </tr>
            <tr className="hover:bg-[#FAF7F2]">
              <td className="py-2 px-2 font-bold text-[#1976D2]">חיסכון והשקעה</td>
              <td className="py-2 px-2 font-bold text-[#1976D2] privacy-blur">{isPrivacyMode ? fmtILS(budgetTotals.totalSavings, true) : `-${fmtILS(budgetTotals.totalSavings)}`}</td>
              <td className="py-2 px-2 text-[#1976D2] font-bold privacy-blur">{isPrivacyMode ? '•••%' : `-${fmtPct(budgetTotals.savingsPct)}`}</td>
              <td className="py-2 px-2 text-left font-bold text-stone-800 privacy-blur">{fmtILS(budgetTotals.totalIncome - budgetTotals.totalFixed - budgetTotals.totalVar - budgetTotals.totalSavings, isPrivacyMode)}</td>
            </tr>
            <tr className="bg-[#F9FAFB] border-t-2 border-[#DDD6CA]">
              <td colSpan={3} className="py-3 px-2 font-black text-stone-900">יתרה סופית מהתקציב:</td>
              <td className="py-3 px-2 text-left font-black privacy-blur">
                {isBalanced ? (
                  <span className="text-[#2E7D32]">{isPrivacyMode ? '₪ •••••• (מאוזן)' : '₪0 (מאוזן)'}</span>
                ) : balance > 0 ? (
                  <span className="text-[#1976D2]">+{fmtILS(balance, isPrivacyMode)} (עודף)</span>
                ) : (
                  <span className="text-[#C62828]">{fmtILS(balance, isPrivacyMode)} (חריגה)</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
