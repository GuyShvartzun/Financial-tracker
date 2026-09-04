import React, { useState } from 'react';
import PensionCalculator from './PensionCalculator';
import ComprehensiveMortgageAndLoanCalculator from './ComprehensiveMortgageAndLoanCalculator';
import AdvancedFIRECalculator from './AdvancedFIRECalculator';
import { DEFAULT_CALCULATORS_DATA } from '../../constants/initialData';

export default function CalculatorsModule({
  calculatorsData,
  onUpdateData,
  accounts,
  selectedMonth,
  users,
  roomStats,
  budgetTotals,
  isSingleMember = false
}) {
  const [calcMode, setCalcMode] = useState('pension');


  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-[#FFFFFF] p-2 rounded-2xl border border-[#E8E2D8] shadow-xs">
        <button
          onClick={() => setCalcMode('pension')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition border cursor-pointer ${
            calcMode === 'pension' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          סימולטור פנסיוני
        </button>
        <button
          onClick={() => setCalcMode('mortgage')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition border cursor-pointer ${
            calcMode === 'mortgage' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          מחשבון הלוואות ומשכנתה
        </button>
        <button
          onClick={() => setCalcMode('fire')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition border cursor-pointer ${
            calcMode === 'fire' 
              ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
              : 'text-stone-600 border-transparent hover:bg-[#FAF7F2]'
          }`}
        >
          מחשבון עצמאות כלכלית
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
        />
      )}

      {calcMode === 'mortgage' && (
        <ComprehensiveMortgageAndLoanCalculator
          data={calculatorsData.mortgage || DEFAULT_CALCULATORS_DATA.mortgage}
          onUpdate={onUpdateData}
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
        />
      )}
    </div>
  );
}
