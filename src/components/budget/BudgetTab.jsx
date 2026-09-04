import React from 'react';
import WaterfallChartModule from '../charts/WaterfallChartModule';
import BudgetItemEditor from './BudgetItemEditor';
import { fmtILS, fmtPct } from '../../utils/formatters';

export default function BudgetTab({ budget, budgetTotals, onUpdateBudget }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#C8E6C9] p-5 rounded-2xl shadow-xs">
          <div className="text-xs text-stone-500 font-bold mb-1">סה"כ הכנסות חודשיות</div>
          <div className="text-2xl font-black text-[#2E7D32]">{fmtILS(budgetTotals.totalIncome)}</div>
          <div className="text-[11px] text-stone-500 mt-1">100% מסך התקציב</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#FFCDD2] p-5 rounded-2xl shadow-xs">
          <div className="text-xs text-stone-500 font-bold mb-1">הוצאות קבועות</div>
          <div className="text-2xl font-black text-[#C62828]">{fmtILS(budgetTotals.totalFixed)}</div>
          <div className="text-[11px] text-[#C62828] mt-1">{fmtPct(budgetTotals.fixedPct)} מההכנסה</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#FFE0B2] p-5 rounded-2xl shadow-xs">
          <div className="text-xs text-stone-500 font-bold mb-1">הוצאות משתנות</div>
          <div className="text-2xl font-black text-[#E65100]">{fmtILS(budgetTotals.totalVar)}</div>
          <div className="text-[11px] text-[#E65100] mt-1">{fmtPct(budgetTotals.varPct)} מההכנסה</div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#BBDEFB] p-5 rounded-2xl shadow-xs">
          <div className="text-xs text-stone-500 font-bold mb-1">חיסכון והשקעה</div>
          <div className="text-2xl font-black text-[#1976D2]">{fmtILS(budgetTotals.totalSavings)}</div>
          <div className="text-[11px] text-[#1976D2] mt-1">{fmtPct(budgetTotals.savingsPct)} מההכנסה</div>
        </div>
      </div>

      <WaterfallChartModule budgetTotals={budgetTotals} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BudgetItemEditor 
          title="הכנסות חודשיות" 
          items={budget.incomes} 
          color="border-[#C8E6C9]"
          onChange={(items) => onUpdateBudget({ ...budget, incomes: items })}
        />
        <BudgetItemEditor 
          title="הוצאות קבועות" 
          items={budget.fixedExpenses} 
          color="border-[#FFCDD2]"
          onChange={(items) => onUpdateBudget({ ...budget, fixedExpenses: items })}
        />
        <BudgetItemEditor 
          title="הוצאות משתנות" 
          items={budget.variableExpenses} 
          color="border-[#FFE0B2]"
          onChange={(items) => onUpdateBudget({ ...budget, variableExpenses: items })}
        />
        <BudgetItemEditor 
          title="חסכונות והשקעות" 
          items={budget.savings} 
          color="border-[#BBDEFB]"
          onChange={(items) => onUpdateBudget({ ...budget, savings: items })}
        />
      </div>
    </div>
  );
}
