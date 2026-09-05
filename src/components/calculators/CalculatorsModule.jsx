import React, { useState } from 'react';
import { Landmark, Scale, Flame } from 'lucide-react';
import PensionCalculator from './PensionCalculator';
import ComprehensiveMortgageAndLoanCalculator from './ComprehensiveMortgageAndLoanCalculator';
import AdvancedFIRECalculator from './AdvancedFIRECalculator';
import { DEFAULT_CALCULATORS_DATA } from '../../constants/initialData';
import { usePrivacy } from '../../context/PrivacyContext';

export default function CalculatorsModule({
  calculatorsData,
  onUpdateData,
  accounts,
  selectedMonth,
  users,
  roomStats,
  budgetTotals,
  isSingleMember = false,
  activeUserId = '',
  isPrivacyMode: propPrivacy
}) {
  const { isPrivacyMode: contextPrivacy } = usePrivacy();
  const isPrivacyMode = propPrivacy ?? contextPrivacy;
  const [calcMode, setCalcMode] = useState('pension');

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FFFFFF] p-1.5 sm:p-2 rounded-2xl border border-[#E8E2D8] shadow-xs">
        <button
          type="button"
          onClick={() => setCalcMode('pension')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
            calcMode === 'pension' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          <Landmark className="w-4 h-4 shrink-0" />
          <span>סימולטור פנסיוני</span>
        </button>
        <button
          type="button"
          onClick={() => setCalcMode('mortgage')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
            calcMode === 'mortgage' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>מחשבון הלוואות</span>
        </button>
        <button
          type="button"
          onClick={() => setCalcMode('fire')}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition border cursor-pointer flex items-center justify-center gap-2 ${
            calcMode === 'fire' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          <Flame className="w-4 h-4 shrink-0" />
          <span>מחשבון עצמאות כלכלית</span>
        </button>
      </div>

      {calcMode === 'pension' && (
        <PensionCalculator
          calculatorsData={calculatorsData}
          onUpdateData={onUpdateData}
          accounts={accounts}
          selectedMonth={selectedMonth}
          users={users}
          isSingleMember={isSingleMember}
          activeUserId={activeUserId}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {calcMode === 'mortgage' && (
        <ComprehensiveMortgageAndLoanCalculator
          data={calculatorsData.mortgage || DEFAULT_CALCULATORS_DATA.mortgage}
          onUpdate={onUpdateData}
          isPrivacyMode={isPrivacyMode}
        />
      )}

      {calcMode === 'fire' && (
        <AdvancedFIRECalculator
          calculatorsData={calculatorsData}
          onUpdateData={onUpdateData}
          accounts={accounts}
          selectedMonth={selectedMonth}
          users={users}
          roomStats={roomStats}
          budgetTotals={budgetTotals}
          isSingleMember={isSingleMember}
          activeUserId={activeUserId}
          isPrivacyMode={isPrivacyMode}
        />
      )}
    </div>
  );
}
