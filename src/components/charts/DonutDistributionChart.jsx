import React, { useState } from 'react';
import { fmtILS, fmtPct } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function DonutDistributionChart({ personalStats, isPrivacyMode: propPrivacy }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const [activeCategory, setActiveCategory] = useState(null); // 'short' | 'medium' | 'long' | null

  const short = personalStats.short || 0;
  const medium = personalStats.medium || 0;
  const long = personalStats.long || 0;
  const sum = short + medium + long;
  const total = sum > 0 ? sum : 1;

  const shortPct = sum > 0 ? (short / total) * 100 : 0;
  const mediumPct = sum > 0 ? (medium / total) * 100 : 0;
  const longPct = sum > 0 ? (long / total) * 100 : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const offsetShort = 0;
  const strokeShort = (shortPct / 100) * circumference;

  const offsetMedium = strokeShort;
  const strokeMedium = (mediumPct / 100) * circumference;

  const offsetLong = strokeShort + strokeMedium;
  const strokeLong = (longPct / 100) * circumference;

  // Active display info in the center of the donut
  let centerLabel = 'סך נכסים';
  let centerVal = sum;
  let centerSub = '';

  if (activeCategory === 'short') {
    centerLabel = 'טווח קצר';
    centerVal = short;
    centerSub = fmtPct(shortPct, isPrivacyMode);
  } else if (activeCategory === 'medium') {
    centerLabel = 'טווח בינוני';
    centerVal = medium;
    centerSub = fmtPct(mediumPct, isPrivacyMode);
  } else if (activeCategory === 'long') {
    centerLabel = 'טווח ארוך';
    centerVal = long;
    centerSub = fmtPct(longPct, isPrivacyMode);
  }

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1A1D27] border border-[#E8E2D8] dark:border-stone-800 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4 transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">התפלגות נכסים לפי טווח</h3>
        {activeCategory && (
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 underline cursor-pointer"
          >
            איפוס בחירה
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform select-none">
            {/* Background ring */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#F2ECE1" strokeWidth="15" className="dark:stroke-stone-800" />
            
            {/* Short term slice */}
            {short > 0 && (
              <circle 
                cx="50" 
                cy="50" 
                r={radius} 
                fill="none" 
                stroke="#FFB74D" 
                strokeWidth={activeCategory === 'short' ? "19" : "15"} 
                strokeDasharray={`${strokeShort} ${circumference}`} 
                strokeDashoffset={-offsetShort} 
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setActiveCategory('short')}
                onClick={() => setActiveCategory(activeCategory === 'short' ? null : 'short')}
              />
            )}

            {/* Medium term slice */}
            {medium > 0 && (
              <circle 
                cx="50" 
                cy="50" 
                r={radius} 
                fill="none" 
                stroke="#64B5F6" 
                strokeWidth={activeCategory === 'medium' ? "19" : "15"} 
                strokeDasharray={`${strokeMedium} ${circumference}`} 
                strokeDashoffset={-offsetMedium} 
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setActiveCategory('medium')}
                onClick={() => setActiveCategory(activeCategory === 'medium' ? null : 'medium')}
              />
            )}

            {/* Long term slice */}
            {long > 0 && (
              <circle 
                cx="50" 
                cy="50" 
                r={radius} 
                fill="none" 
                stroke="#BA68C8" 
                strokeWidth={activeCategory === 'long' ? "19" : "15"} 
                strokeDasharray={`${strokeLong} ${circumference}`} 
                strokeDashoffset={-offsetLong} 
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                onMouseEnter={() => setActiveCategory('long')}
                onClick={() => setActiveCategory(activeCategory === 'long' ? null : 'long')}
              />
            )}
          </svg>

          {/* Dynamic center indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold transition-all">
              {centerLabel}
            </span>
            <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 privacy-blur tracking-tight">
              {fmtILS(centerVal, isPrivacyMode)}
            </span>
            {centerSub && (
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 privacy-blur">
                {centerSub}
              </span>
            )}
          </div>
        </div>

        {/* Legend / Category cards */}
        <div className="space-y-2.5 flex-1 w-full text-xs">
          <div 
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              activeCategory === 'short'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 shadow-xs scale-[1.02]'
                : 'bg-[#FAF7F2] dark:bg-stone-800/40 border-[#FFE0B2] dark:border-amber-800/40 hover:bg-amber-50/50'
            }`}
            onMouseEnter={() => setActiveCategory('short')}
            onClick={() => setActiveCategory(activeCategory === 'short' ? null : 'short')}
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFB74D] shrink-0"></span>
              <span className="font-bold text-stone-800 dark:text-stone-200">טווח קצר</span>
            </div>
            <div className="text-left">
              <strong className="text-[#E65100] dark:text-amber-400 block privacy-blur">{fmtILS(short, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 privacy-blur">{fmtPct(shortPct, isPrivacyMode)}</span>
            </div>
          </div>

          <div 
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              activeCategory === 'medium'
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 shadow-xs scale-[1.02]'
                : 'bg-[#FAF7F2] dark:bg-stone-800/40 border-[#BBDEFB] dark:border-blue-800/40 hover:bg-blue-50/50'
            }`}
            onMouseEnter={() => setActiveCategory('medium')}
            onClick={() => setActiveCategory(activeCategory === 'medium' ? null : 'medium')}
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#64B5F6] shrink-0"></span>
              <span className="font-bold text-stone-800 dark:text-stone-200">טווח בינוני</span>
            </div>
            <div className="text-left">
              <strong className="text-[#1976D2] dark:text-blue-400 block privacy-blur">{fmtILS(medium, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 privacy-blur">{fmtPct(mediumPct, isPrivacyMode)}</span>
            </div>
          </div>

          <div 
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              activeCategory === 'long'
                ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 shadow-xs scale-[1.02]'
                : 'bg-[#FAF7F2] dark:bg-stone-800/40 border-[#E1BEE7] dark:border-purple-800/40 hover:bg-purple-50/50'
            }`}
            onMouseEnter={() => setActiveCategory('long')}
            onClick={() => setActiveCategory(activeCategory === 'long' ? null : 'long')}
          >
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#BA68C8] shrink-0"></span>
              <span className="font-bold text-stone-800 dark:text-stone-200">טווח ארוך</span>
            </div>
            <div className="text-left">
              <strong className="text-[#7B1FA2] dark:text-purple-300 block privacy-blur">{fmtILS(long, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 privacy-blur">{fmtPct(longPct, isPrivacyMode)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
