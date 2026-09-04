import React from 'react';

export default function MonthSelector({ selectedMonth, setSelectedMonth, monthsList }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl p-3 sm:p-3.5 mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs text-stone-600 font-bold whitespace-nowrap">חודש מוצג בדשבורד:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#DDD6CA] text-stone-900 text-xs font-bold rounded-xl px-3 py-1.5 outline-none focus:border-[#4A90E2] cursor-pointer transition shadow-2xs"
        >
          {monthsList.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <span className="text-[11px] text-stone-500 font-semibold hidden sm:inline">
        מעודכן לנתוני {selectedMonth}
      </span>
    </div>
  );
}
