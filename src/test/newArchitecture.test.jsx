import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';

import { useFinancialStats } from '../hooks/useFinancialStats';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ToastProvider, useToast } from '../context/ToastContext';
import ErrorBoundary from '../components/common/ErrorBoundary';

describe('New Architecture & Hooks Unit Tests', () => {
  describe('useFinancialStats Hook', () => {
    const mockAccounts = [
      {
        id: 'acc_1',
        ownerId: 'user_1',
        category: 'short',
        balances: { '08/2026': 10000, '09/2026': 15000 }
      },
      {
        id: 'acc_2',
        ownerId: 'user_1',
        category: 'medium',
        balances: { '08/2026': 20000, '09/2026': 22000 }
      },
      {
        id: 'acc_3',
        ownerId: 'user_2',
        category: 'long',
        balances: { '08/2026': 50000, '09/2026': 55000 }
      },
      {
        id: 'acc_4',
        ownerId: 'user_1',
        category: 'liability',
        balances: { '08/2026': 5000, '09/2026': 4000 }
      }
    ];

    const mockBudget = {
      incomes: [{ id: 'inc_1', amount: 20000 }],
      fixedExpenses: [{ id: 'fix_1', amount: 8000 }],
      variableExpenses: [{ id: 'var_1', amount: 4000 }],
      savings: [{ id: 'sav_1', amount: 8000 }]
    };

    const mockMembers = [
      { uid: 'user_1', name: 'משתמש א' },
      { uid: 'user_2', name: 'משתמש ב' }
    ];

    it('calculates macro roomStats accurately', () => {
      const { result } = renderHook(() => useFinancialStats({
        accounts: mockAccounts,
        monthsList: ['08/2026', '09/2026'],
        selectedMonth: '09/2026',
        budget: mockBudget,
        selectedPersonalUserId: 'user_1',
        roomMembers: mockMembers,
        isSingleMember: false
      }));

      // Net worth: 15000 + 22000 + 55000 - 4000 = 88000
      expect(result.current.roomStats.netWorth).toBe(88000);
      // Liquid: 15000 + 22000 = 37000
      expect(result.current.roomStats.liquid).toBe(37000);
      // Non-liquid: 55000
      expect(result.current.roomStats.nonLiquid).toBe(55000);
      // Liabilities: 4000
      expect(result.current.roomStats.liabilities).toBe(4000);
      // Emergency months: monthlyExp = 8000 + 4000 = 12000; shortTermAssets = 15000 -> 15000 / 12000 = 1.25
      expect(result.current.roomStats.emergencyMonths).toBeCloseTo(1.25);
    });

    it('calculates personalStats correctly for targeted member', () => {
      const { result } = renderHook(() => useFinancialStats({
        accounts: mockAccounts,
        monthsList: ['08/2026', '09/2026'],
        selectedMonth: '09/2026',
        budget: mockBudget,
        selectedPersonalUserId: 'user_1',
        roomMembers: mockMembers,
        isSingleMember: false
      }));

      // User 1 has acc_1 (15000 short), acc_2 (22000 medium), acc_4 (4000 liability) -> net worth 33000
      expect(result.current.personalStats.netWorth).toBe(33000);
      expect(result.current.personalStats.liquid).toBe(37000);
      expect(result.current.personalStats.short).toBe(15000);
      expect(result.current.personalStats.medium).toBe(22000);
      expect(result.current.personalStats.liability).toBe(4000);
      expect(result.current.personalStats.long).toBe(0);
    });

    it('calculates budgetTotals and percentages accurately', () => {
      const { result } = renderHook(() => useFinancialStats({
        accounts: mockAccounts,
        monthsList: ['08/2026'],
        selectedMonth: '08/2026',
        budget: mockBudget,
        selectedPersonalUserId: 'user_1',
        roomMembers: mockMembers,
        isSingleMember: false
      }));

      expect(result.current.budgetTotals.totalIncome).toBe(20000);
      expect(result.current.budgetTotals.totalFixed).toBe(8000);
      expect(result.current.budgetTotals.totalVar).toBe(4000);
      expect(result.current.budgetTotals.totalSavings).toBe(8000);
      expect(result.current.budgetTotals.fixedPct).toBe(40);
      expect(result.current.budgetTotals.varPct).toBe(20);
      expect(result.current.budgetTotals.savingsPct).toBe(40);
    });

    it('calculates budgetTotals accurately with multi-currency items converted to roomCurrency', () => {
      const multiCurBudget = {
        incomes: [{ id: 'inc_usd', amount: 1000, currency: 'USD' }], // 1000 * 3.70 = 3700 ILS
        fixedExpenses: [{ id: 'fix_eur', amount: 500, currency: 'EUR' }], // 500 * 4.05 = 2025 ILS
        variableExpenses: [{ id: 'var_ils', amount: 1000, currency: 'ILS' }], // 1000 ILS
        savings: [{ id: 'sav_ils', amount: 675, currency: 'ILS' }] // 675 ILS
      };

      const customRates = { USD: 3.70, EUR: 4.05, ILS: 1 };

      const { result } = renderHook(() => useFinancialStats({
        accounts: [],
        monthsList: ['08/2026'],
        selectedMonth: '08/2026',
        budget: multiCurBudget,
        roomCurrency: 'ILS',
        rates: customRates
      }));

      expect(result.current.budgetTotals.totalIncome).toBe(3700);
      expect(result.current.budgetTotals.totalFixed).toBe(2025);
      expect(result.current.budgetTotals.totalVar).toBe(1000);
      expect(result.current.budgetTotals.totalSavings).toBe(675);
      expect(result.current.roomStats.monthlyExp).toBe(3025); // 2025 + 1000
    });
  });

  describe('useKeyboardShortcuts Hook', () => {
    it('triggers registered callbacks on shortcut keys and ignores input targets', () => {
      const onTogglePrivacyMode = vi.fn();
      const onToggleDarkMode = vi.fn();
      const onCloseModals = vi.fn();

      renderHook(() => useKeyboardShortcuts({
        onTogglePrivacyMode,
        onToggleDarkMode,
        onCloseModals
      }));

      // 1. Privacy mode (P / פ)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      expect(onTogglePrivacyMode).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'פ' }));
      expect(onTogglePrivacyMode).toHaveBeenCalledTimes(2);

      // 2. Dark mode (D / ג)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      expect(onToggleDarkMode).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ג' }));
      expect(onToggleDarkMode).toHaveBeenCalledTimes(2);

      // 3. Escape
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onCloseModals).toHaveBeenCalledTimes(1);

      // 5. Verify it ignores shortcuts when focused in an input
      const inputEl = document.createElement('input');
      document.body.appendChild(inputEl);
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
      // Should still be 2 from before
      expect(onTogglePrivacyMode).toHaveBeenCalledTimes(2);
      document.body.removeChild(inputEl);
    });
  });

  describe('ErrorBoundary Component', () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    function BuggyComponent({ shouldThrow }) {
      if (shouldThrow) {
        throw new Error('Test crash in child component');
      }
      return <div>רכיב תקין לחלוטין</div>;
    }

    it('catches render errors and displays fallback UI', () => {
      const onReset = vi.fn();
      const { rerender } = render(
        <ErrorBoundary onReset={onReset} title="שגיאת מבחן">
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('שגיאת מבחן')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /נסה שוב/i })).toBeInTheDocument();

      // Click reset
      fireEvent.click(screen.getByRole('button', { name: /נסה שוב/i }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast Notification Context', () => {
    function TestToastConsumer() {
      const { showToast } = useToast();
      return (
        <div>
          <button type="button" onClick={() => showToast('פעולה בוצעה בהצלחה!', 'success')}>
            הצג התראה
          </button>
        </div>
      );
    }

    it('renders toasts when triggered and allows dismissing', () => {
      render(
        <ToastProvider>
          <TestToastConsumer />
        </ToastProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'הצג התראה' }));

      expect(screen.getByText('פעולה בוצעה בהצלחה!')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button', { name: 'סגור התראה' });
      fireEvent.click(closeBtn);

      expect(screen.queryByText('פעולה בוצעה בהצלחה!')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Charts UI', () => {
    it('PersonalGrowthLineChart opens interactive tooltip on month label/point hover', async () => {
      const { default: PersonalGrowthLineChart } = await import('../components/charts/PersonalGrowthLineChart');
      render(
        <PersonalGrowthLineChart
          userId="u1"
          monthsList={['08/2026', '09/2026']}
          currentNetWorth={150000}
          currentLiquid={80000}
          accounts={[{ id: 'a1', ownerId: 'u1', category: 'short', balances: { '08/2026': 50000, '09/2026': 60000 } }]}
          isSingleMember={true}
          isPrivacyMode={false}
        />
      );

      // Month text exists
      const monthLbl = screen.getByText('09/2026');
      expect(monthLbl).toBeInTheDocument();

      // Click / hover month label
      fireEvent.click(monthLbl);

      // Interactive tooltip should display
      expect(screen.getByText('חודש: 09/2026')).toBeInTheDocument();
    });

    it('DonutDistributionChart dynamically updates center text when category is clicked and resets on reset button', async () => {
      const { default: DonutDistributionChart } = await import('../components/charts/DonutDistributionChart');
      render(
        <DonutDistributionChart
          personalStats={{ short: 30000, medium: 20000, long: 50000 }}
          isPrivacyMode={false}
        />
      );

      // Default label
      expect(screen.getByText('סך נכסים')).toBeInTheDocument();

      // Click on "טווח קצר" legend card
      const shortCard = screen.getAllByText('טווח קצר')[0];
      fireEvent.click(shortCard);

      // Center should now display "טווח קצר"
      expect(screen.getAllByText('טווח קצר').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('איפוס בחירה')).toBeInTheDocument();

      // Click reset
      fireEvent.click(screen.getByText('איפוס בחירה'));
      expect(screen.getByText('סך נכסים')).toBeInTheDocument();
    });

    it('AnimatedCounter renders formatted target value and respects privacy mode', async () => {
      const { default: AnimatedCounter } = await import('../components/common/AnimatedCounter');
      const { unmount } = render(
        <AnimatedCounter value={50000} isPrivacyMode={false} />
      );

      expect(screen.getByText(/50,000/)).toBeInTheDocument();
      unmount();

      render(
        <AnimatedCounter value={50000} isPrivacyMode={true} />
      );
      expect(screen.getByText('₪ ••••••')).toBeInTheDocument();
    });

    it('FinancialTaskList displays celebration banner when 100% of tasks are completed', async () => {
      const { default: FinancialTaskList } = await import('../components/tasks/FinancialTaskList');
      const completedTasks = [
        { id: 't1', title: 'פתיחת קרן השתלמות', completed: true, priority: 'high' },
        { id: 't2', title: 'בדיקת דמי ניהול', completed: true, priority: 'medium' }
      ];

      render(
        <FinancialTaskList
          tasks={completedTasks}
          onUpdateTasks={() => {}}
          users={[]}
          selectedMonth="09/2026"
        />
      );

      expect(screen.getByText('כל הכבוד! כל המשימות הפיננסיות הושלמו בהצלחה!')).toBeInTheDocument();
      expect(screen.getByText('100% הושלם 🏆')).toBeInTheDocument();
    });
  });
});
