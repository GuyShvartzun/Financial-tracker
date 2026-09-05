import React, { useState, useMemo } from 'react';
import { Clock, ShoppingBag, Coins, RotateCcw, Edit3 } from 'lucide-react';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function WorkHoursCostCalculator({
  totalIncome = 0,
  usersCount = 1,
  isPrivacyMode: propPrivacy
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;

  // Default number of users from room members count
  const effectiveUsersCount = Math.max(1, usersCount || 1);

  const [productPrice, setProductPrice] = useState('');
  const [monthlyHours, setMonthlyHours] = useState(182);
  const [isCustomIncome, setIsCustomIncome] = useState(false);
  const [customIncomeValue, setCustomIncomeValue] = useState('');

  // Income used in calculation
  const effectiveIncome = useMemo(() => {
    if (isCustomIncome) {
      return Math.max(0, parseFloat(customIncomeValue) || 0);
    }
    return Math.max(0, parseFloat(totalIncome) || 0);
  }, [isCustomIncome, customIncomeValue, totalIncome]);

  // Calculation
  const parsedPrice = Math.max(0, parseFloat(productPrice) || 0);
  const parsedHours = Math.max(1, parseFloat(monthlyHours) || 1);

  const totalHouseholdHours = effectiveUsersCount * parsedHours;
  const hourlyWage = totalHouseholdHours > 0 && effectiveIncome > 0 
    ? effectiveIncome / totalHouseholdHours 
    : 0;

  const hoursRequired = hourlyWage > 0 && parsedPrice > 0 
    ? parsedPrice / hourlyWage 
    : 0;

  const handleReset = () => {
    setProductPrice('');
    setMonthlyHours(182);
    setIsCustomIncome(false);
    setCustomIncomeValue('');
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 transition-all duration-200 hover:shadow-card font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E8E2D8] pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              מחשבון שווי מוצר בשעות עבודה
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              חישוב כמה שעות עבודה נדרשות למימון מוצר לפי סך ההכנסות ושעות העבודה.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 transition cursor-pointer"
          title="אפס הגדרות מחשבון"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>איפוס</span>
        </button>
      </div>

      {/* Input Controls Grid (3 Clean Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Product Price */}
        <div className="space-y-1.5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <label className="block text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
            מחיר המוצר (₪)
          </label>
          <input
            type={isPrivacyMode ? "password" : "number"}
            min="0"
            step="any"
            value={isPrivacyMode ? '••••••' : productPrice}
            readOnly={isPrivacyMode}
            onChange={(e) => !isPrivacyMode && setProductPrice(e.target.value)}
            placeholder={isPrivacyMode ? '••••' : 'לדוגמה: 1,000'}
            className="w-full bg-white border border-[#DDD6CA] text-sm font-bold text-stone-900 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 privacy-blur transition"
          />
        </div>

        {/* 2. Monthly Work Hours per user */}
        <div className="space-y-1.5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              שעות עבודה חודשיות למשתמש
            </span>
          </label>
          <input
            type="number"
            min="1"
            max="400"
            value={monthlyHours}
            onChange={(e) => setMonthlyHours(e.target.value)}
            placeholder="182"
            className="w-full bg-white border border-[#DDD6CA] text-sm font-bold text-stone-900 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* 3. Monthly Income */}
        <div className="space-y-1.5 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              הכנסה חודשית כוללת
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isCustomIncome) {
                  setCustomIncomeValue(totalIncome > 0 ? totalIncome : '');
                }
                setIsCustomIncome(!isCustomIncome);
              }}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              title="החלף בין הכנסת התקציב להכנסה ידנית לבדיקה"
            >
              <Edit3 className="w-3 h-3" />
              {isCustomIncome ? 'השתמש בתקציב' : 'הזן ידנית'}
            </button>
          </div>

          {isCustomIncome ? (
            <input
              type={isPrivacyMode ? "password" : "number"}
              min="0"
              step="any"
              value={isPrivacyMode ? '••••••' : customIncomeValue}
              readOnly={isPrivacyMode}
              onChange={(e) => !isPrivacyMode && setCustomIncomeValue(e.target.value)}
              placeholder={isPrivacyMode ? '••••' : 'הזן הכנסה ידנית (₪)'}
              className="w-full bg-white border border-indigo-300 text-sm font-bold text-[#2E7D32] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 privacy-blur transition"
            />
          ) : (
            <div className="w-full bg-white border border-[#DDD6CA] text-sm font-bold text-[#2E7D32] rounded-lg px-3 py-2 flex items-center justify-between privacy-blur">
              <span>{fmtILS(totalIncome, isPrivacyMode)}</span>
              <span className="text-[10px] font-semibold text-stone-400">מהתקציב</span>
            </div>
          )}
        </div>
      </div>

      {/* Result Display: Only work hours */}
      <div className="bg-indigo-900 text-white rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-center text-center">
        {effectiveIncome > 0 && parsedPrice > 0 ? (
          <div className="text-base sm:text-xl font-bold tracking-tight">
            <span>עלות המוצר בשעות עבודה: </span>
            <span className="text-amber-300 font-black text-lg sm:text-2xl privacy-blur">
              {hoursRequired.toFixed(1)} שעות עבודה
            </span>
          </div>
        ) : (
          <div className="text-sm sm:text-base font-semibold text-indigo-200">
            {effectiveIncome <= 0 ? 'נא להזין הכנסה חודשית לביצוע החישוב' : 'הזן מחיר מוצר לחישוב'}
          </div>
        )}
      </div>
    </div>
  );
}
