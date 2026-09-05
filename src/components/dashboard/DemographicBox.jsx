import React, { useState } from 'react';
import { CBS_AGE_DATA } from '../../constants/cbsData';
import { fmtILS } from '../../utils/formatters';
import { usePrivacy } from '../../context/PrivacyContext';

export default function DemographicBox({ netWorth, liquid, nonLiquid, isCouple, label, isPrivacyMode: propPrivacy }) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const [selectedAgeBracket, setSelectedAgeBracket] = useState('20-29');

  const dataset = isCouple ? CBS_AGE_DATA.couple : CBS_AGE_DATA.single;
  const data = dataset[selectedAgeBracket] || dataset['20-29'];

  const calcPercentile = (userVal, avgVal) => {
    if (!avgVal) return 50;
    let p = Math.round((userVal / avgVal) * 50);
    return Math.min(Math.max(p, 5), 99);
  };

  const pTotal = calcPercentile(netWorth, data.avgTotal);
  const pLiquid = calcPercentile(liquid, data.avgLiquid);
  const pNonLiquid = calcPercentile(nonLiquid, data.avgNonLiquid);

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E2D8] pb-3">
        <div>
          <h3 className="text-base font-bold text-stone-900">{label}</h3>
          <span className="text-[11px] text-stone-500 block mt-0.5">
            השוואה מפורטת לפי ממוצע, חציון ואחוזון מול נתוני הלמ״ס
          </span>
        </div>

        <div className="flex items-center gap-2 privacy-blur">
          <span className="text-xs text-stone-600 font-bold">קבוצת גיל:</span>
          <select
            value={selectedAgeBracket}
            disabled={isPrivacyMode}
            onChange={(e) => setSelectedAgeBracket(e.target.value)}
            className="bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#4A90E2] cursor-pointer privacy-blur"
          >
            <option value="20-29">גילאי 20-29</option>
            <option value="30-39">גילאי 30-39</option>
            <option value="40-49">גילאי 40-49</option>
            <option value="50-59">גילאי 50-59</option>
            <option value="60+">גילאי 60 ומעלה</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs privacy-blur">
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#C8E6C9] space-y-2 privacy-blur">
          <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
            <span className="font-bold text-stone-900">סך הון כולל נטו</span>
            <span className="text-[10px] bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] px-2 py-0.5 rounded-md font-bold privacy-blur">
              {isPrivacyMode ? 'אחוזון ••%' : `אחוזון ${pTotal}%`}
            </span>
          </div>
          <div className="text-lg font-black text-[#2E7D32] privacy-blur">{fmtILS(netWorth, isPrivacyMode)}</div>
          <div className="space-y-1 text-[11px] text-stone-600 pt-1">
            <div className="flex justify-between">
              <span>ממוצע ארצי:</span>
              <strong className="text-stone-900 privacy-blur">{fmtILS(data.avgTotal, isPrivacyMode)}</strong>
            </div>
            <div className="flex justify-between">
              <span>חציון ארצי:</span>
              <strong className="text-stone-700 privacy-blur">{fmtILS(data.medianTotal, isPrivacyMode)}</strong>
            </div>
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#BBDEFB] space-y-2 privacy-blur">
          <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
            <span className="font-bold text-stone-900">סך הון נזיל</span>
            <span className="text-[10px] bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] px-2 py-0.5 rounded-md font-bold privacy-blur">
              {isPrivacyMode ? 'אחוזון ••%' : `אחוזון ${pLiquid}%`}
            </span>
          </div>
          <div className="text-lg font-black text-[#1976D2] privacy-blur">{fmtILS(liquid, isPrivacyMode)}</div>
          <div className="space-y-1 text-[11px] text-stone-600 pt-1">
            <div className="flex justify-between">
              <span>ממוצע ארצי:</span>
              <strong className="text-stone-900 privacy-blur">{fmtILS(data.avgLiquid, isPrivacyMode)}</strong>
            </div>
            <div className="flex justify-between">
              <span>חציון ארצי:</span>
              <strong className="text-stone-700 privacy-blur">{fmtILS(data.medianLiquid, isPrivacyMode)}</strong>
            </div>
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E1BEE7] space-y-2 privacy-blur">
          <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
            <span className="font-bold text-stone-900">סך הון לא נזיל</span>
            <span className="text-[10px] bg-[#F3E5F5] text-[#7B1FA2] border border-[#E1BEE7] px-2 py-0.5 rounded-md font-bold privacy-blur">
              {isPrivacyMode ? 'אחוזון ••%' : `אחוזון ${pNonLiquid}%`}
            </span>
          </div>
          <div className="text-lg font-black text-[#7B1FA2] privacy-blur">{fmtILS(nonLiquid, isPrivacyMode)}</div>
          <div className="space-y-1 text-[11px] text-stone-600 pt-1">
            <div className="flex justify-between">
              <span>ממוצע ארצי:</span>
              <strong className="text-stone-900 privacy-blur">{fmtILS(data.avgNonLiquid, isPrivacyMode)}</strong>
            </div>
            <div className="flex justify-between">
              <span>חציון ארצי:</span>
              <strong className="text-stone-700 privacy-blur">{fmtILS(data.medianNonLiquid, isPrivacyMode)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8] text-[11px] text-stone-500">
        <strong>מקור והערת ייחוס:</strong> המידע מעובד ומכויל מתוך <em>סקרי הוצאות ונכסים פיננסיים של משקי בית</em> מבית הלשכה המרכזית לסטטיסטיקה (למ"ס), מתואם ומשוערך לרמת המחירים ושווי הנכסים הפיננסיים של שנת <strong>{isPrivacyMode ? '••••' : '2026'}</strong>, <strong>בניכוי האוכלוסייה החרדית והערבית</strong> ליצירת קבוצת ייחוס הומוגנית ומדויקת.
      </div>
    </div>
  );
}
