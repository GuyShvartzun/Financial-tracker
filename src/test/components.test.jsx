import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import LoginView from '../components/auth/LoginView';
import Header from '../components/layout/Header';
import MonthSelector from '../components/layout/MonthSelector';
import MetricCards from '../components/dashboard/MetricCards';
import GrowthSummaryCards from '../components/dashboard/GrowthSummaryCards';
import EmergencyFundCard from '../components/dashboard/EmergencyFundCard';
import DemographicBox from '../components/dashboard/DemographicBox';
import DonutDistributionChart from '../components/charts/DonutDistributionChart';
import PersonalGrowthLineChart from '../components/charts/PersonalGrowthLineChart';
import WaterfallChartModule from '../components/charts/WaterfallChartModule';
import SharedDashboard from '../components/dashboard/SharedDashboard';
import PersonalDashboard from '../components/dashboard/PersonalDashboard';
import BudgetTab from '../components/budget/BudgetTab';
import BudgetItemEditor from '../components/budget/BudgetItemEditor';
import DataEntryModule from '../components/data/DataEntryModule';
import DataExport from '../components/data/DataExport';
import RoomLobby from '../components/room/RoomLobby';
import RoomSettingsModal from '../components/room/RoomSettingsModal';
import CalculatorsModule from '../components/calculators/CalculatorsModule';
import ComprehensiveMortgageAndLoanCalculator from '../components/calculators/ComprehensiveMortgageAndLoanCalculator';
import QuickLogModal from '../components/common/QuickLogModal';
import FloatingActionButton from '../components/common/FloatingActionButton';
import { PrivacyContext } from '../context/PrivacyContext';
import { parseQuantitative, parseBold, FormattedText } from '../utils/textParser';

import { DEFAULT_BUDGET, DEFAULT_CALCULATORS_DATA } from '../constants/initialData';

describe('LoginView Component', () => {
  it('renders login screen and fires onLogin callback when button is clicked', () => {
    const handleLogin = vi.fn();
    render(<LoginView onLogin={handleLogin} />);

    expect(screen.getByText('מעקב פיננסי')).toBeInTheDocument();
    const loginButton = screen.getByRole('button', { name: /התחברות מאובטחת עם Google/i });
    expect(loginButton).toBeInTheDocument();

    fireEvent.click(loginButton);
    expect(handleLogin).toHaveBeenCalledTimes(1);
  });
});

describe('Header & Navigation Component', () => {
  const mockUser = { uid: 'u1', displayName: 'משתמש בדיקה', email: 'test@example.com' };
  const mockRoom = { id: 'r1', name: 'חדר בדיקה', members: [mockUser, { uid: 'u2', displayName: 'שותף' }] };

  it('renders app title, room info, user info and handles tab clicks in multi-member room', () => {
    const handleTabChange = vi.fn();
    const handleLogout = vi.fn();
    const handleSwitchRoom = vi.fn();
    const handleOpenManage = vi.fn();

    render(
      <Header
        authUser={mockUser}
        isCloudSynced={true}
        activeTab="shared_dash"
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        currentRoom={mockRoom}
        onSwitchRoom={handleSwitchRoom}
        onOpenManageRoom={handleOpenManage}
      />
    );

    expect(screen.getByText('מעקב פיננסי משותף')).toBeInTheDocument();
    expect(screen.getByText(/חדר: חדר בדיקה/i)).toBeInTheDocument();
    expect(screen.getByText('משתמש בדיקה')).toBeInTheDocument();
    expect(screen.getByText(/מחובר/i)).toBeInTheDocument();

    // Click on personal dashboard tab
    const personalTab = screen.getByRole('button', { name: 'דשבורד אישי' });
    fireEvent.click(personalTab);
    expect(handleTabChange).toHaveBeenCalledWith('personal_dash');

    // Click on budget tab
    const budgetTab = screen.getByRole('button', { name: 'תקציב' });
    fireEvent.click(budgetTab);
    expect(handleTabChange).toHaveBeenCalledWith('budget');

    // Logout button click
    const logoutBtn = screen.getByRole('button', { name: 'התנתק' });
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('renders single-member header with direct דשבורד tab', () => {
    const singleRoom = { id: 'r1', name: 'חדר יחיד', members: [mockUser] };
    render(
      <Header
        authUser={mockUser}
        isCloudSynced={false}
        activeTab="personal_dash"
        setActiveTab={vi.fn()}
        onLogout={vi.fn()}
        currentRoom={singleRoom}
        onSwitchRoom={vi.fn()}
        onOpenManageRoom={vi.fn()}
      />
    );

    expect(screen.getByText('מעקב פיננסי')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'דשבורד' })).toBeInTheDocument();
    expect(screen.queryByText('דשבורד משותף')).not.toBeInTheDocument();
  });
});

describe('MonthSelector Component', () => {
  it('renders months and triggers selection callback', () => {
    const handleSelect = vi.fn();
    render(
      <MonthSelector
        selectedMonth="08/2026"
        setSelectedMonth={handleSelect}
        monthsList={['07/2026', '08/2026', '09/2026']}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select.value).toBe('08/2026');

    fireEvent.change(select, { target: { value: '09/2026' } });
    expect(handleSelect).toHaveBeenCalledWith('09/2026');
  });
});

describe('Dashboard Metric & Summary Cards', () => {
  it('renders MetricCards with formatted values and positive/negative growths', () => {
    const { rerender } = render(
      <MetricCards
        netWorth={1500000}
        liquid={500000}
        nonLiquid={1100000}
        liabilities={100000}
        growthPct={15.5}
      />
    );

    expect(screen.getByText('סך הון כולל נטו')).toBeInTheDocument();
    expect(screen.getByText('+15.5%')).toBeInTheDocument();

    rerender(
      <MetricCards
        netWorth={100000}
        liquid={20000}
        nonLiquid={80000}
        liabilities={0}
        growthPct={-5.2}
      />
    );
    expect(screen.getByText('-5.2%')).toBeInTheDocument();
  });

  it('renders GrowthSummaryCards correctly', () => {
    render(
      <GrowthSummaryCards
        avgMonthlyTotalGrowth={12500}
        totalGrowthAmount={50000}
        avgMonthlyLiquidGrowth={-3000}
        liquidGrowthAmount={-12000}
      />
    );
    expect(screen.getByText('צמיחה חודשית ממוצעת - סך הון כולל')).toBeInTheDocument();
    expect(screen.getByText('צמיחה חודשית ממוצעת - סך הון נזיל')).toBeInTheDocument();
  });

  it('renders EmergencyFundCard with ratio and progress limit', () => {
    render(
      <EmergencyFundCard
        emergencyMonths={4.5}
        shortTermAssets={90000}
        monthlyExp={20000}
      />
    );
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('חודשי כיסוי חירום')).toBeInTheDocument();
  });

  it('renders DemographicBox and responds to age bracket change', () => {
    render(
      <DemographicBox
        netWorth={800000}
        liquid={300000}
        nonLiquid={500000}
        isCouple={true}
        label="השוואה דמוגרפית לזוג מול נתוני הלמ״ס"
      />
    );

    expect(screen.getByText('השוואה דמוגרפית לזוג מול נתוני הלמ״ס')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('20-29');

    fireEvent.change(select, { target: { value: '30-39' } });
    expect(select.value).toBe('30-39');
  });

  it('renders DonutDistributionChart and PersonalGrowthLineChart', () => {
    render(
      <DonutDistributionChart
        personalStats={{ short: 10000, medium: 20000, long: 30000 }}
      />
    );
    expect(screen.getByText('התפלגות נכסים לפי טווח')).toBeInTheDocument();

    render(
      <PersonalGrowthLineChart
        userId="u1"
        monthsList={['07/2026', '08/2026']}
        currentNetWorth={60000}
        currentLiquid={30000}
        accounts={[{ id: '1', ownerId: 'u1', balances: { '07/2026': 50000, '08/2026': 60000 } }]}
        isSingleMember={false}
      />
    );
    expect(screen.getByText('התפתחות אישית לאורך החודשים')).toBeInTheDocument();
  });

  it('renders SharedDashboard and PersonalDashboard', () => {
    const roomStats = {
      netWorth: 1000000,
      liquid: 400000,
      nonLiquid: 600000,
      liabilities: 50000,
      growthPct: 10,
      avgMonthlyTotalGrowth: 10000,
      totalGrowthAmount: 50000,
      avgMonthlyLiquidGrowth: 4000,
      liquidGrowthAmount: 20000,
      emergencyMonths: 5,
      shortTermAssets: 100000,
      monthlyExp: 20000
    };
    const budgetTotals = {
      totalIncome: 30000,
      totalFixed: 12000,
      totalVar: 8000,
      totalSavings: 10000,
      fixedPct: 40,
      varPct: 26.7,
      savingsPct: 33.3
    };

    render(
      <SharedDashboard roomStats={roomStats} budgetTotals={budgetTotals} />
    );
    expect(screen.getByText('סיכום תזרימי - גרף מפל')).toBeInTheDocument();

    render(
      <PersonalDashboard
        personalStats={roomStats}
        selectedPersonalUserId="u1"
        setSelectedPersonalUserId={vi.fn()}
        selectedMonth="08/2026"
        monthsList={['08/2026']}
        accounts={[]}
        users={[{ uid: 'u1', displayName: 'משתמש א' }]}
        isSingleMember={true}
        roomStats={roomStats}
        budgetTotals={budgetTotals}
      />
    );
    expect(screen.getByText('פירוט חשבונות ונכסים')).toBeInTheDocument();
  });
});

describe('Budget Tab & BudgetItemEditor Component', () => {
  const mockBudget = {
    incomes: [{ id: 'inc_1', name: 'משכורת', amount: 25000 }],
    fixedExpenses: [{ id: 'fix_1', name: 'שכירות', amount: 6000 }],
    variableExpenses: [{ id: 'var_1', name: 'סופר', amount: 3500 }],
    savings: [{ id: 'sav_1', name: 'חיסכון', amount: 5000 }]
  };
  const mockTotals = {
    totalIncome: 25000,
    totalFixed: 6000,
    totalVar: 3500,
    totalSavings: 5000,
    fixedPct: 24,
    varPct: 14,
    savingsPct: 20
  };

  it('renders budget KPI cards and all categories', () => {
    render(
      <BudgetTab
        budget={mockBudget}
        budgetTotals={mockTotals}
        onUpdateBudget={vi.fn()}
      />
    );

    expect(screen.getByText('סה"כ הכנסות חודשיות')).toBeInTheDocument();
    expect(screen.getByDisplayValue('משכורת')).toBeInTheDocument();
    expect(screen.getByDisplayValue('שכירות')).toBeInTheDocument();
    expect(screen.getByDisplayValue('סופר')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('חיסכון')[0]).toBeInTheDocument();
  });

  it('handles item addition, name editing, amount editing, and deletion in BudgetItemEditor', () => {
    const handleChange = vi.fn();
    render(
      <BudgetItemEditor
        title="הכנסות חודשיות"
        categoryKey="incomes"
        items={[{ id: 'item_1', name: 'עבודה', amount: 10000 }]}
        color="border-[#C8E6C9]"
        onChange={handleChange}
        onMoveCategory={vi.fn()}
        onMoveItemToPosition={vi.fn()}
      />
    );

    // Edit Name
    const nameInput = screen.getByPlaceholderText('שם הסעיף');
    fireEvent.change(nameInput, { target: { value: 'עבודה עיקרית' } });
    expect(handleChange).toHaveBeenCalledWith([{ id: 'item_1', name: 'עבודה עיקרית', amount: 10000 }]);

    // Edit Amount
    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '12000' } });
    expect(handleChange).toHaveBeenCalledWith([{ id: 'item_1', name: 'עבודה', amount: '12000' }]);

    // Add Item
    const addBtn = screen.getByRole('button', { name: /הוסף סעיף/i });
    fireEvent.click(addBtn);
    expect(handleChange).toHaveBeenCalled();

    // Delete Item
    const deleteBtn = screen.getByTitle('מחק סעיף');
    fireEvent.click(deleteBtn);
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('tests the bug fix: moving category via dropdown selector correctly passes source category, itemId and target category', () => {
    const handleMoveCategory = vi.fn();
    render(
      <BudgetItemEditor
        title="הכנסות חודשיות"
        categoryKey="incomes"
        items={[{ id: 'item_1', name: 'מענק', amount: 3000 }]}
        color="border-[#C8E6C9]"
        onChange={vi.fn()}
        onMoveCategory={handleMoveCategory}
        onMoveItemToPosition={vi.fn()}
      />
    );

    const categorySelect = screen.getByTitle('העבר לקטגוריה אחרת');
    expect(categorySelect.value).toBe('incomes');

    fireEvent.change(categorySelect, { target: { value: 'savings' } });
    // Verify arguments: (sourceKey, itemId, targetKey)
    expect(handleMoveCategory).toHaveBeenCalledWith('incomes', 'item_1', 'savings');
  });
});

describe('DataEntryModule Component', () => {
  const mockAccounts = [
    { id: 'a1', name: 'עו"ש', category: 'short', order: 0, ownerId: 'u1', balances: { '08/2026': 15000 } },
    { id: 'a2', name: 'קרן השתלמות', category: 'medium', order: 0, ownerId: 'u1', balances: { '08/2026': 80000 } }
  ];
  const mockUsers = [{ uid: 'u1', displayName: 'יוסי', name: 'יוסי' }];

  it('renders account list, allows balance edit, and adds new account', () => {
    const handleBalanceChange = vi.fn();
    const handleAddAccount = vi.fn();

    render(
      <DataEntryModule
        selectedMonth="08/2026"
        setSelectedMonth={vi.fn()}
        monthsList={['08/2026']}
        onAddNewMonth={vi.fn()}
        onDeleteMonth={vi.fn()}
        activeRoomAccounts={mockAccounts}
        users={mockUsers}
        handleAccountNameChange={vi.fn()}
        handleAccountCategoryChange={vi.fn()}
        handleReorderAccount={vi.fn()}
        handleMoveAccountToPosition={vi.fn()}
        handleBalanceChange={handleBalanceChange}
        handleRemoveAccountFromMonth={vi.fn()}
        handleDeleteAccountCompletely={vi.fn()}
        handleAddAccount={handleAddAccount}
        setAccounts={vi.fn()}
        syncAccountToCloud={vi.fn()}
      />
    );

    expect(screen.getByText('הזנת נתונים חודשית וניהול חשבונות')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('עו"ש')[0]).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('קרן השתלמות')[0]).toBeInTheDocument();

    // Click add account button for short assets
    const addShortBtn = screen.getByText('הוסף חשבון לקבוצה זו (נכסים לטווח קצר)');
    fireEvent.click(addShortBtn);
    expect(handleAddAccount).toHaveBeenCalledWith('short', 'u1');
  });
});

describe('DataExport Component', () => {
  it('renders export buttons and triggers XLSX/JSON download', () => {
    render(
      <DataExport
        accounts={[]}
        budget={DEFAULT_BUDGET}
        monthsList={['08/2026']}
        users={[{ uid: 'u1', displayName: 'משה' }]}
        syncAccountToCloud={vi.fn()}
        deleteAccountFromCloud={vi.fn()}
        syncBudgetToCloud={vi.fn()}
        syncMonthsToCloud={vi.fn()}
        setAccounts={vi.fn()}
        setBudget={vi.fn()}
        setMonthsList={vi.fn()}
        setSelectedPersonalUserId={vi.fn()}
        authUser={{ uid: 'u1' }}
      />
    );

    expect(screen.getByText('ייצוא נתונים מלא')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /הורד קובץ Excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /הורד קובץ JSON/i })).toBeInTheDocument();
  });
});

describe('CalculatorsModule & Sub-calculators', () => {
  it('switches between Pension, Mortgage, and FIRE calculators', () => {
    render(
      <CalculatorsModule
        calculatorsData={DEFAULT_CALCULATORS_DATA}
        onUpdateData={vi.fn()}
        accounts={[]}
        selectedMonth="08/2026"
        users={[{ uid: 'u1', displayName: 'דן' }]}
        roomStats={{ netWorth: 100000, liquid: 50000 }}
        budgetTotals={{ totalIncome: 10000 }}
        isSingleMember={true}
      />
    );

    // Initial is Pension
    expect(screen.getByRole('heading', { name: 'סימולטור פנסיוני' })).toBeInTheDocument();

    // Switch to Mortgage
    const mortgageTab = screen.getByRole('button', { name: 'מחשבון הלוואות' });
    fireEvent.click(mortgageTab);
    expect(screen.getByText('חישוב, תכנון והשוואת לוחות סילוקין להלוואות')).toBeInTheDocument();

    // Switch to FIRE
    const fireTab = screen.getByRole('button', { name: 'מחשבון עצמאות כלכלית' });
    fireEvent.click(fireTab);
    expect(screen.getByText('חישוב היעד ומשך הזמן הנדרש להשגת עצמאות כלכלית ופרישה')).toBeInTheDocument();
  });
});

describe('RoomLobby & RoomSettingsModal', () => {
  const mockAuthUser = { uid: 'u1', email: 'owner@gmail.com', displayName: 'הבעלים' };
  const mockRoom = {
    id: 'r_1',
    name: 'חדר משפחה',
    ownerId: 'u1',
    ownerEmail: 'owner@gmail.com',
    members: [mockAuthUser]
  };

  it('renders RoomLobby and allows opening create room modal', () => {
    const handleSelectRoom = vi.fn();
    render(
      <RoomLobby
        authUser={mockAuthUser}
        rooms={[mockRoom]}
        onSelectRoom={handleSelectRoom}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('חדר משפחה')).toBeInTheDocument();
    expect(screen.getByText('בעלים')).toBeInTheDocument();

    const enterBtn = screen.getByRole('button', { name: /היכנס לחדר/i });
    fireEvent.click(enterBtn);
    expect(handleSelectRoom).toHaveBeenCalledWith(mockRoom);
  });

  it('renders RoomSettingsModal and allows editing room settings', () => {
    const handleClose = vi.fn();
    render(
      <RoomSettingsModal
        currentRoom={mockRoom}
        authUser={mockAuthUser}
        onClose={handleClose}
        onUpdateRoom={vi.fn()}
        onDeleteRoom={vi.fn()}
        onLeaveRoom={vi.fn()}
      />
    );

    expect(screen.getByText(/הגדרות חדר ומשתמשים/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('חדר משפחה')).toBeInTheDocument();
    expect(screen.getByText('הזמן משתמש נוסף לחדר')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'סגור' });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});

describe('Privacy Mode & Floating Action Button', () => {
  it('renders privacy toggle button and triggers onTogglePrivacyMode', () => {
    const handleToggle = vi.fn();
    render(
      <Header
        authUser={{ uid: 'u1', email: 'test@gmail.com', displayName: 'משתמש' }}
        isCloudSynced={true}
        activeTab="shared_dash"
        setActiveTab={vi.fn()}
        onLogout={vi.fn()}
        currentRoom={{ id: 'r1', name: 'חדר', members: [] }}
        onSwitchRoom={vi.fn()}
        onOpenManageRoom={vi.fn()}
        isPrivacyMode={false}
        onTogglePrivacyMode={handleToggle}
      />
    );

    const privacyBtn = screen.getByRole('button', { name: /טשטש והסתר סכומים/i });
    expect(privacyBtn).toBeInTheDocument();
    fireEvent.click(privacyBtn);
    expect(handleToggle).toHaveBeenCalled();
  });

  it('renders FloatingActionButton and triggers onClick', () => {
    const handleClick = vi.fn();
    render(<FloatingActionButton onClick={handleClick} />);

    const fabBtn = screen.getByRole('button', { name: /הזנה מהירה/i });
    expect(fabBtn).toBeInTheDocument();
    fireEvent.click(fabBtn);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('QuickLogModal Component', () => {
  const mockAccounts = [
    { id: 'acc1', name: 'עו״ש בנק הפועלים', category: 'short', balances: { '08/2026': 15000 } },
    { id: 'acc2', name: 'קרן כספית', category: 'medium', balances: { '08/2026': 45000 } }
  ];

  it('renders and updates account balance', () => {
    const handleUpdateBalance = vi.fn();
    const handleClose = vi.fn();

    render(
      <QuickLogModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
        selectedMonth="08/2026"
        onUpdateAccountBalance={handleUpdateBalance}
        budget={{ incomes: [], fixedExpenses: [], variableExpenses: [], savings: [] }}
        onUpdateBudget={vi.fn()}
      />
    );

    expect(screen.getByText('הזנה מהירה')).toBeInTheDocument();
    expect(screen.getByText('עדכון יתרת חשבון')).toBeInTheDocument();

    const balanceInput = screen.getByPlaceholderText('הזן יתרה...');
    fireEvent.change(balanceInput, { target: { value: '22000' } });

    const submitBtn = screen.getByRole('button', { name: /שמור יתרה/i });
    fireEvent.click(submitBtn);

    expect(handleUpdateBalance).toHaveBeenCalledWith('acc1', '08/2026', 22000);
  });

  it('switches to budget tab and adds new budget item', () => {
    const handleUpdateBudget = vi.fn();

    render(
      <QuickLogModal
        isOpen={true}
        onClose={vi.fn()}
        accounts={mockAccounts}
        selectedMonth="08/2026"
        onUpdateAccountBalance={vi.fn()}
        budget={{ incomes: [], fixedExpenses: [], variableExpenses: [], savings: [] }}
        onUpdateBudget={handleUpdateBudget}
      />
    );

    const budgetTabBtn = screen.getByRole('button', { name: /הוספה לתקציב/i });
    fireEvent.click(budgetTabBtn);

    const nameInput = screen.getByPlaceholderText(/קניות סופר/i);
    fireEvent.change(nameInput, { target: { value: 'מכולת שכונתית' } });

    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '450' } });

    const addBtn = screen.getByRole('button', { name: /הוסף לתקציב/i });
    fireEvent.click(addBtn);

    expect(handleUpdateBudget).toHaveBeenCalled();
    const updatedBudget = handleUpdateBudget.mock.calls[0][0];
    expect(updatedBudget.variableExpenses.some(i => i.name === 'מכולת שכונתית' && i.amount === 450)).toBe(true);
  });
});

describe('Privacy Mode Enforcement Tests', () => {
  it('parseQuantitative and parseBold add privacy-blur to monetary and percentage values', () => {
    const { container: c1 } = render(<div>{parseQuantitative('סכום של ₪15,000 ושיעור של 4.5%')}</div>);
    const blurred = c1.querySelectorAll('.privacy-blur');
    expect(blurred.length).toBe(2);
    expect(blurred[0].textContent).toBe('₪15,000');
    expect(blurred[1].textContent).toBe('4.5%');

    const { container: c2 } = render(<div>{parseBold('חסכת **₪50,000** מתוך יעד של 100,000 ₪')}</div>);
    const blurredBold = c2.querySelectorAll('.privacy-blur');
    expect(blurredBold.length).toBe(2);
    expect(blurredBold[0].textContent).toBe('₪50,000');
    expect(blurredBold[1].textContent).toBe('100,000 ₪');
  });

  it('FormattedText renders quantitative elements with privacy-blur inside headers and bullets', () => {
    const markdown = `### יעד של ₪2,000,000\n* הפקדה חודשית של ₪3,500\n* תשואה של 7% שנתית`;
    const { container } = render(<FormattedText text={markdown} />);
    const blurred = container.querySelectorAll('.privacy-blur');
    expect(blurred.length).toBeGreaterThanOrEqual(3);
  });

  it('DemographicBox renders percentiles and values with privacy-blur class', () => {
    const { container } = render(
      <DemographicBox
        totalNetWorth={150000}
        liquidNetWorth={50000}
        nonLiquidNetWorth={100000}
      />
    );
    const blurred = container.querySelectorAll('.privacy-blur');
    expect(blurred.length).toBeGreaterThan(0);
  });

  it('DonutDistributionChart renders percentage breakdown badges with privacy-blur class', () => {
    const { container } = render(
      <DonutDistributionChart
        personalStats={{ short: 10000, medium: 20000, long: 70000 }}
      />
    );
    const blurred = container.querySelectorAll('.privacy-blur');
    expect(blurred.length).toBeGreaterThanOrEqual(3);
  });

  it('PersonalGrowthLineChart masks hover tooltip and blurs curves in privacy mode', () => {
    const { container } = render(
      <PrivacyContext.Provider value={{ isPrivacyMode: true, setIsPrivacyMode: () => {} }}>
        <PersonalGrowthLineChart
          userId="u1"
          monthsList={['07/2026', '08/2026']}
          currentNetWorth={60000}
          currentLiquid={30000}
          accounts={[{ id: '1', ownerId: 'u1', balances: { '07/2026': 50000, '08/2026': 60000 } }]}
          isSingleMember={false}
        />
      </PrivacyContext.Provider>
    );

    const titles = container.querySelectorAll('title');
    expect(titles.length).toBeGreaterThan(0);
    titles.forEach(title => {
      expect(title.textContent).toContain('[מוסתר במצב פרטיות]');
    });

    const blurredElements = container.querySelectorAll('.privacy-blur');
    expect(blurredElements.length).toBeGreaterThan(0);
  });

  it('ComprehensiveMortgageAndLoanCalculator renders aggregate metrics with privacy-blur class', () => {
    const calcData = {
      propertyValue: '2000000',
      monthlyIncome: '25000',
      expectedInflation: '2.5',
      constructionInflation: '2.5',
      tracks: [
        {
          id: 't1',
          name: 'מסלול פריים',
          amount: '500000',
          years: '25',
          months: '300',
          interest: '5.5',
          trackType: 'prime',
          scheduleType: 'spitzer'
        }
      ]
    };

    const { container } = render(
      <PrivacyContext.Provider value={{ isPrivacyMode: true, setIsPrivacyMode: () => {} }}>
        <ComprehensiveMortgageAndLoanCalculator
          data={calcData}
          onUpdate={vi.fn()}
        />
      </PrivacyContext.Provider>
    );

    const blurred = container.querySelectorAll('.privacy-blur');
    expect(blurred.length).toBeGreaterThan(0);
  });
});


