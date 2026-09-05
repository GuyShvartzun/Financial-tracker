import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingBag, Clock, Users, Calendar, Coins, Sparkles, RotateCcw, Edit3, Check } from 'lucide-react';
import { fmtILS, fmtPct } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

const WORK_HOURS_PRESETS = [
  { hours: 182, label: '182 שעות', sublabel: 'משרה מלאה' },
  { hours: 160, label: '160 שעות', sublabel: 'כ-40 ש"ש' },
  { hours: 186, label: '186 שעות', sublabel: 'צו הרחבה ישן' },
  { hours: 100, label: '100 שעות', sublabel: 'חצי משרה' }
];

const PRICE_PRESETS = [250, 500, 1000, 2500, 5000];

export default function WorkHoursCostCalculator({
  totalIncome = 0,
  usersCount = 1,
  isPrivacyMode: propPrivacy
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;

  // Initial user count fallback
  const initialUsers = Math.max(1, usersCount || 1);

  const [productPrice, setProductPrice] = useState(1000);
  const [monthlyHours, setMonthlyHours] = useState(182);
  const [numUsers, setNumUsers] = useState(initialUsers);
  const [isCustomIncome, setIsCustomIncome] = useState(false);
  const [customIncomeValue, setCustomIncomeValue] = useState('');

  // Update numUsers if usersCount prop changes and user hasn't overridden
  useEffect(() => {
    if (usersCount && usersCount > 0) {
      setNumUsers(usersCount);
    }
  }, [usersCount]);

  // Income to use in calculations
  const effectiveIncome = useMemo(() => {
    if (isCustomIncome) {
      return Math.max(0, parseFloat(customIncomeValue) || 0);
    }
    return Math.max(0, parseFloat(totalIncome) || 0);
  }, [isCustomIncome, customIncomeValue, totalIncome]);

  // Derived metrics
  const parsedPrice = Math.max(0, parseFloat(productPrice) || 0);
  const parsedHours = Math.max(1, parseFloat(monthlyHours) || 1);
  const parsedUsers = Math.max(1, parseInt(numUsers, 10) || 1);

  const totalHouseholdHours = parsedUsers * parsedHours;
  const hourlyWage = totalHouseholdHours > 0 && effectiveIncome > 0 
    ? effectiveIncome / totalHouseholdHours 
    : 0;

  const hoursRequired = hourlyWage > 0 && parsedPrice > 0 
    ? parsedPrice / hourlyWage 
    : 0;

  const daysRequired = hoursRequired > 0 ? hoursRequired / 8 : 0;

  // Breakdown into full hours and minutes
  const formattedTimeBreakdown = useMemo(() => {
    if (hoursRequired <= 0) return '0 שעות';
    const h = Math.floor(hoursRequired);
    const m = Math.round((hoursRequired - h) * 60);
    if (m === 60) return `${h + 1} שעות`;
    if (m === 0) return `${h} שעות`;
    if (h === 0) return `${m} דקות`;
    return `${h} שעות ו-${m} דקות`;
  }, [hoursRequired]);

  const pctOfIncome = effectiveIncome > 0 && parsedPrice > 0 
    ? (parsedPrice / effectiveIncome) * 100 
    : 0;

  const handleReset = () => {
    setProductPrice(1000);
    setMonthlyHours(182);
    setNumUsers(initialUsers);
    setIsCustomIncome(false);
    setCustomIncomeValue('');
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 transition-all duration-200 hover:shadow-card font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D8] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>מחשבון שווי מוצר בשעות עבודה</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                חדש
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              חישוב כמה שעות או ימי עבודה נדרשים למימון מוצר, לפי סך ההכנסות החודשיות ושעות העבודה.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="self-end sm:self-auto flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 transition cursor-pointer"
          title="אפס הגדרות מחשבון"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>איפוס</span>
        </button>
      </div>

      {/* Input Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Product Price */}
        <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
              מחיר המוצר (₪)
            </span>
          </label>
          <input
            type={isPrivacyMode ? "password" : "number"}
            min="0"
            step="any"
            value={isPrivacyMode ? '••••••' : productPrice}
            readOnly={isPrivacyMode}
            onChange={(e) => !isPrivacyMode && setProductPrice(e.target.value)}
            placeholder={isPrivacyMode ? '••••' : '1000'}
            className="w-full bg-white border border-[#DDD6CA] text-sm font-bold text-stone-900 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 privacy-blur transition"
          />
          {/* Quick price pills */}
          <div className="flex flex-wrap gap-1 pt-1">
            {PRICE_PRESETS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => !isPrivacyMode && setProductPrice(p)}
                disabled={isPrivacyMode}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                  parseFloat(productPrice) === p && !isPrivacyMode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-stone-600 border-[#DDD6CA] hover:bg-stone-100'
                }`}
              >
                {p.toLocaleString()} ₪
              </button>
            ))}
          </div>
        </div>

        {/* 2. Monthly Work Hours per user */}
        <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              שעות עבודה חודשיות
            </span>
            <span className="text-[10px] text-stone-400 font-normal">למשתמש</span>
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
          {/* Presets */}
          <div className="grid grid-cols-2 gap-1 pt-1">
            {WORK_HOURS_PRESETS.map(preset => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => setMonthlyHours(preset.hours)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md border text-center transition cursor-pointer ${
                  parseFloat(monthlyHours) === preset.hours
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-stone-600 border-[#DDD6CA] hover:bg-stone-100'
                }`}
                title={preset.sublabel}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Number of Users / Earners */}
        <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              מספר משתמשים מפרנסים
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumUsers(Math.max(1, parsedUsers - 1))}
              className="w-9 h-9 bg-white border border-[#DDD6CA] hover:bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-700 cursor-pointer text-sm"
              title="הפחת משתמש"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="20"
              value={numUsers}
              onChange={(e) => setNumUsers(e.target.value)}
              className="flex-1 text-center bg-white border border-[#DDD6CA] text-sm font-bold text-stone-900 rounded-lg px-2 py-2 outline-none focus:border-indigo-500 transition"
            />
            <button
              type="button"
              onClick={() => setNumUsers(parsedUsers + 1)}
              className="w-9 h-9 bg-white border border-[#DDD6CA] hover:bg-stone-100 rounded-lg flex items-center justify-center font-bold text-stone-700 cursor-pointer text-sm"
              title="הוסף משתמש"
            >
              +
            </button>
          </div>
          {/* Quick buttons */}
          <div className="flex gap-1 pt-1">
            <button
              type="button"
              onClick={() => setNumUsers(1)}
              className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition cursor-pointer text-center ${
                parsedUsers === 1
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-stone-600 border-[#DDD6CA] hover:bg-stone-100'
              }`}
            >
              משתמש יחיד (1)
            </button>
            <button
              type="button"
              onClick={() => setNumUsers(2)}
              className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition cursor-pointer text-center ${
                parsedUsers === 2
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-stone-600 border-[#DDD6CA] hover:bg-stone-100'
              }`}
            >
              זוגי (2)
            </button>
          </div>
        </div>

        {/* 4. Monthly Income Setting */}
        <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
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

          <div className="text-[10px] text-stone-500">
            {effectiveIncome <= 0 ? (
              <span className="text-amber-600 font-medium">לא הוגדרה הכנסה בתקציב. לחץ 'הזן ידנית'.</span>
            ) : (
              <span>סך שעות עבודה: <strong className="text-stone-700">{totalHouseholdHours}</strong> שעות/חודש</span>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-700/60 pb-4">
          <div>
            <div className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-300" />
              עלות המוצר בשעות עבודה:
            </div>
            {effectiveIncome > 0 && parsedPrice > 0 ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight privacy-blur">
                  {hoursRequired.toFixed(1)} שעות עבודה
                </span>
                <span className="text-xs sm:text-sm text-indigo-200 font-medium privacy-blur">
                  ({formattedTimeBreakdown})
                </span>
              </div>
            ) : (
              <div className="text-lg font-bold text-indigo-200">
                {effectiveIncome <= 0 ? 'נא להזין הכנסה חודשית לביצוע החישוב' : 'הזן מחיר מוצר לחישוב'}
              </div>
            )}
          </div>

          {effectiveIncome > 0 && parsedPrice > 0 && (
            <div className="sm:text-left bg-indigo-800/60 border border-indigo-700/80 px-4 py-2.5 rounded-xl self-start sm:self-auto">
              <div className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">שווה ערך ל-</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 privacy-blur">
                כ-{daysRequired.toFixed(1)} ימי עבודה
              </div>
              <div className="text-[10px] text-indigo-300">לפי 8 שעות ביום</div>
            </div>
          )}
        </div>

        {/* Detailed Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium mb-0.5">שכר שעתי משוקלל</div>
            <div className="text-base sm:text-lg font-bold text-white privacy-blur">
              {effectiveIncome > 0 ? `${fmtILS(hourlyWage, isPrivacyMode)}/שעה` : '—'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium mb-0.5">שעות חודשיות למשק בית</div>
            <div className="text-base sm:text-lg font-bold text-white">
              {totalHouseholdHours} שעות
            </div>
            <div className="text-[10px] text-indigo-300">
              {parsedUsers} {parsedUsers === 1 ? 'מפרנס' : 'מפרנסים'} × {parsedHours} שעות
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium mb-0.5">נתח מההכנסה החודשית</div>
            <div className="text-base sm:text-lg font-bold text-amber-300 privacy-blur">
              {effectiveIncome > 0 && parsedPrice > 0 ? fmtPct(pctOfIncome, isPrivacyMode) : '0%'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 font-medium mb-0.5">הכנסה חודשית מחושבת</div>
            <div className="text-base sm:text-lg font-bold text-white privacy-blur">
              {fmtILS(effectiveIncome, isPrivacyMode)}
            </div>
            <div className="text-[10px] text-indigo-300">
              {isCustomIncome ? 'הזנה ידנית' : 'מתוך תקציב החדר'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
