import React from 'react';
import WaterfallChartModule from '../charts/WaterfallChartModule';
import BudgetItemEditor from './BudgetItemEditor';
import { fmtILS, fmtPct } from '../../utils/formatters';

export default function BudgetTab({ budget, budgetTotals, onUpdateBudget }) {
  const handleMoveCategory = (sourceKey, itemId, targetKey) => {
    if (sourceKey === targetKey) return;
    const sourceList = budget[sourceKey] || [];
    const itemToMove = sourceList.find(i => i.id === itemId);
    if (!itemToMove) return;

    const newSourceList = sourceList.filter(i => i.id !== itemId);
    const newTargetList = [...(budget[targetKey] || []), itemToMove];

    onUpdateBudget({
      ...budget,
      [sourceKey]: newSourceList,
      [targetKey]: newTargetList
    });
  };

  const handleMoveItemToPosition = (sourceKey, itemId, targetKey, targetIndex) => {
    const sourceList = budget[sourceKey] || [];
    const itemToMove = sourceList.find(i => i.id === itemId);
    if (!itemToMove) return;

    if (sourceKey === targetKey) {
      const filtered = sourceList.filter(i => i.id !== itemId);
      const validIndex = Math.max(0, Math.min(targetIndex, filtered.length));
      filtered.splice(validIndex, 0, itemToMove);
      onUpdateBudget({
        ...budget,
        [sourceKey]: filtered
      });
    } else {
      const newSourceList = sourceList.filter(i => i.id !== itemId);
      const targetList = [...(budget[targetKey] || [])];
      const validIndex = Math.max(0, Math.min(targetIndex, targetList.length));
      targetList.splice(validIndex, 0, itemToMove);
      onUpdateBudget({
        ...budget,
        [sourceKey]: newSourceList,
        [targetKey]: targetList
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-sans">
        <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
          <div className="text-xs text-stone-500 font-bold mb-1">סה"כ הכנסות חודשיות</div>
          <div className="text-xl sm:text-2xl font-black text-[#2E7D32] privacy-blur">{fmtILS(budgetTotals.totalIncome)}</div>
          <div className="text-[11px] text-stone-500 mt-1"><span className="privacy-blur">100%</span> מסך התקציב</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#FFCDD2] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
          <div className="text-xs text-stone-500 font-bold mb-1">הוצאות קבועות</div>
          <div className="text-xl sm:text-2xl font-black text-[#C62828] privacy-blur">{fmtILS(budgetTotals.totalFixed)}</div>
          <div className="text-[11px] text-[#C62828] mt-1"><span className="privacy-blur font-bold">{fmtPct(budgetTotals.fixedPct)}</span> מההכנסה</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#FFE0B2] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
          <div className="text-xs text-stone-500 font-bold mb-1">הוצאות משתנות</div>
          <div className="text-xl sm:text-2xl font-black text-[#E65100] privacy-blur">{fmtILS(budgetTotals.totalVar)}</div>
          <div className="text-[11px] text-[#E65100] mt-1"><span className="privacy-blur font-bold">{fmtPct(budgetTotals.varPct)}</span> מההכנסה</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-4 sm:p-5 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-card">
          <div className="text-xs text-stone-500 font-bold mb-1">חיסכון והשקעה</div>
          <div className="text-xl sm:text-2xl font-black text-[#1976D2] privacy-blur">{fmtILS(budgetTotals.totalSavings)}</div>
          <div className="text-[11px] text-[#1976D2] mt-1"><span className="privacy-blur font-bold">{fmtPct(budgetTotals.savingsPct)}</span> מההכנסה</div>
        </div>
      </div>

      <WaterfallChartModule budgetTotals={budgetTotals} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <BudgetItemEditor 
          title="הכנסות חודשיות" 
          categoryKey="incomes"
          items={budget.incomes} 
          color="border-[#C8E6C9]"
          onChange={(items) => onUpdateBudget({ ...budget, incomes: items })}
          onMoveCategory={handleMoveCategory}
          onMoveItemToPosition={handleMoveItemToPosition}
        />
        <BudgetItemEditor 
          title="הוצאות קבועות" 
          categoryKey="fixedExpenses"
          items={budget.fixedExpenses} 
          color="border-[#FFCDD2]"
          onChange={(items) => onUpdateBudget({ ...budget, fixedExpenses: items })}
          onMoveCategory={handleMoveCategory}
          onMoveItemToPosition={handleMoveItemToPosition}
        />
        <BudgetItemEditor 
          title="הוצאות משתנות" 
          categoryKey="variableExpenses"
          items={budget.variableExpenses} 
          color="border-[#FFE0B2]"
          onChange={(items) => onUpdateBudget({ ...budget, variableExpenses: items })}
          onMoveCategory={handleMoveCategory}
          onMoveItemToPosition={handleMoveItemToPosition}
        />
        <BudgetItemEditor 
          title="חסכונות והשקעות" 
          categoryKey="savings"
          items={budget.savings} 
          color="border-[#BBDEFB]"
          onChange={(items) => onUpdateBudget({ ...budget, savings: items })}
          onMoveCategory={handleMoveCategory}
          onMoveItemToPosition={handleMoveItemToPosition}
        />
      </div>
    </div>
  );
}
