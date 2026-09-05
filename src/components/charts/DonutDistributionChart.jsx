import React from 'react';
import { fmtILS, fmtPct } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function DonutDistributionChart({ personalStats, isPrivacyMode: propPrivacy }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
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

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-6 rounded-2xl shadow-xs space-y-4">
      <h3 className="text-lg font-bold text-stone-900 mb-2">התפלגות נכסים לפי טווח</h3>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform privacy-blur">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#F2ECE1" strokeWidth="16" />
            {short > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#FFB74D" strokeWidth="16" strokeDasharray={`${strokeShort} ${circumference}`} strokeDashoffset={-offsetShort} className="transition-all duration-500" />
            )}
            {medium > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#64B5F6" strokeWidth="16" strokeDasharray={`${strokeMedium} ${circumference}`} strokeDashoffset={-offsetMedium} className="transition-all duration-500" />
            )}
            {long > 0 && (
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#BA68C8" strokeWidth="16" strokeDasharray={`${strokeLong} ${circumference}`} strokeDashoffset={-offsetLong} className="transition-all duration-500" />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-stone-500 font-bold">סך נכסים</span>
            <span className="text-xs font-black text-stone-900 privacy-blur">{fmtILS(sum, isPrivacyMode)}</span>
          </div>
        </div>

        <div className="space-y-3 flex-1 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2] border border-[#FFE0B2]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FFB74D]"></span>
              <span className="font-bold text-stone-800">טווח קצר</span>
            </div>
            <div className="text-left">
              <strong className="text-[#E65100] block privacy-blur">{fmtILS(short, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 privacy-blur">{fmtPct(shortPct, isPrivacyMode)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2] border border-[#BBDEFB]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#64B5F6]"></span>
              <span className="font-bold text-stone-800">טווח בינוני</span>
            </div>
            <div className="text-left">
              <strong className="text-[#1976D2] block privacy-blur">{fmtILS(medium, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 privacy-blur">{fmtPct(mediumPct, isPrivacyMode)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF7F2] border border-[#E1BEE7]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#BA68C8]"></span>
              <span className="font-bold text-stone-800">טווח ארוך</span>
            </div>
            <div className="text-left">
              <strong className="text-[#7B1FA2] block privacy-blur">{fmtILS(long, isPrivacyMode)}</strong>
              <span className="text-[10px] text-stone-500 privacy-blur">{fmtPct(longPct, isPrivacyMode)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
