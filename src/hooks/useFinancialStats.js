import { useMemo } from 'react';
import { getAccountTotalsForMonth, sortAccountsByDataEntryOrder } from '../utils/calculations';

export function useFinancialStats({
  accounts = [],
  monthsList = [],
  selectedMonth = '',
  budget = {},
  selectedPersonalUserId = '',
  authUser = null,
  roomMembers = [],
  isSingleMember = false
}) {
  // Macro Statistics for Active Room
  const roomStats = useMemo(() => {
    const baseMonth = monthsList[0] || selectedMonth;
    const currentTotals = getAccountTotalsForMonth(accounts, selectedMonth);
    const baseTotals = getAccountTotalsForMonth(accounts, baseMonth);

    const netWorth = currentTotals.netWorth;
    const liquid = currentTotals.liquid;
    const nonLiquid = currentTotals.nonLiquid;
    const liabilities = currentTotals.liabilities;

    const totalGrowthAmount = netWorth - baseTotals.netWorth;
    const liquidGrowthAmount = liquid - baseTotals.liquid;

    const growthPct = baseTotals.netWorth ? (totalGrowthAmount / baseTotals.netWorth) * 100 : 0;
    
    const monthIndex = monthsList.indexOf(selectedMonth);
    const monthsElapsed = Math.max(1, monthIndex > 0 ? monthIndex : monthsList.length - 1);

    const avgMonthlyTotalGrowth = totalGrowthAmount / monthsElapsed;
    const avgMonthlyLiquidGrowth = liquidGrowthAmount / monthsElapsed;

    const monthlyExp = (budget.fixedExpenses || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) + 
                       (budget.variableExpenses || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const shortTermAssets = currentTotals.short;
    const emergencyMonths = monthlyExp > 0 ? (shortTermAssets / monthlyExp) : 0;

    return { 
      netWorth, liquid, nonLiquid, liabilities, 
      totalGrowthAmount, liquidGrowthAmount, growthPct, 
      avgMonthlyTotalGrowth, avgMonthlyLiquidGrowth, 
      emergencyMonths, shortTermAssets, monthlyExp 
    };
  }, [accounts, selectedMonth, monthsList, budget]);

  // Personal Statistics for Selected Member
  const personalStats = useMemo(() => {
    const targetUserId = selectedPersonalUserId || authUser?.uid || roomMembers[0]?.uid || roomMembers[0]?.id;
    const rawUserAccs = isSingleMember ? accounts : accounts.filter(a => a.ownerId === targetUserId);
    const userAccs = sortAccountsByDataEntryOrder(rawUserAccs);
    const baseMonth = monthsList[0] || selectedMonth;
    const currentTotals = getAccountTotalsForMonth(userAccs, selectedMonth);
    const baseTotals = getAccountTotalsForMonth(userAccs, baseMonth);

    const monthIndex = monthsList.indexOf(selectedMonth);
    const monthsElapsed = Math.max(1, monthIndex > 0 ? monthIndex : monthsList.length - 1);

    const totalGrowthAmount = currentTotals.netWorth - baseTotals.netWorth;
    const liquidGrowthAmount = currentTotals.liquid - baseTotals.liquid;
    
    const growthPct = baseTotals.netWorth ? (totalGrowthAmount / baseTotals.netWorth) * 100 : 0;

    const avgMonthlyTotalGrowth = totalGrowthAmount / monthsElapsed;
    const avgMonthlyLiquidGrowth = liquidGrowthAmount / monthsElapsed;

    return { 
      short: currentTotals.short, 
      medium: currentTotals.medium, 
      long: currentTotals.long, 
      liability: currentTotals.liabilities, 
      liquid: currentTotals.liquid, 
      netWorth: currentTotals.netWorth, 
      userAccs, 
      totalGrowthAmount,
      liquidGrowthAmount,
      growthPct,
      avgMonthlyTotalGrowth, 
      avgMonthlyLiquidGrowth 
    };
  }, [accounts, selectedPersonalUserId, selectedMonth, monthsList, roomMembers, isSingleMember, authUser?.uid]);

  // Budget Aggregates
  const budgetTotals = useMemo(() => {
    const totalIncome = (budget.incomes || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalFixed = (budget.fixedExpenses || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalVar = (budget.variableExpenses || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalSavings = (budget.savings || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const fixedPct = totalIncome > 0 ? (totalFixed / totalIncome) * 100 : 0;
    const varPct = totalIncome > 0 ? (totalVar / totalIncome) * 100 : 0;
    const savingsPct = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    return { totalIncome, totalFixed, totalVar, totalSavings, fixedPct, varPct, savingsPct };
  }, [budget]);

  return {
    roomStats,
    personalStats,
    budgetTotals
  };
}
