import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataExport from '../components/data/DataExport';
import { DEFAULT_CALCULATORS_DATA, DEFAULT_TASKS, DEFAULT_BUDGET } from '../constants/initialData';
import * as XLSX from 'xlsx';

// Mock XLSX writeFile
vi.mock('xlsx', async () => {
  const actual = await vi.importActual('xlsx');
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe('DataExport Comprehensive Suite (Full-State Backup & Unified Templates)', () => {
  const mockSyncAccount = vi.fn();
  const mockDeleteAccount = vi.fn();
  const mockSyncBudget = vi.fn();
  const mockSyncMonths = vi.fn();
  const mockSyncCalculators = vi.fn();
  const mockSyncTasks = vi.fn();

  const mockSetAccounts = vi.fn();
  const mockSetBudget = vi.fn();
  const mockSetMonthsList = vi.fn();
  const mockSetCalculatorsData = vi.fn();
  const mockSetTasks = vi.fn();
  const mockSetSelectedPersonalUserId = vi.fn();

  const sampleUsers = [
    { uid: 'u1', displayName: 'משה ראשי', email: 'moshe@example.com' },
    { uid: 'u2', displayName: 'רחל שותפה', email: 'rachel@example.com' }
  ];

  const sampleAccounts = [
    {
      id: 'acc_1',
      name: 'עו״ש בנק לאומי',
      category: 'short',
      ownerId: 'u1',
      order: 0,
      balances: { '08/2026': 25000, '09/2026': 28000 },
      flaggedMonths: { '08/2026': true }
    },
    {
      id: 'acc_2',
      name: 'קרן השתלמות סנופי',
      category: 'medium',
      ownerId: 'u2',
      order: 1,
      balances: { '08/2026': 120000, '09/2026': 125000 },
      flaggedMonths: {}
    }
  ];

  const sampleBudget = {
    incomes: [{ id: 'inc_1', name: 'משכורת', amount: 20000 }],
    fixedExpenses: [{ id: 'fix_1', name: 'שכר דירה', amount: 5000 }],
    variableExpenses: [{ id: 'var_1', name: 'סופר', amount: 3000 }],
    savings: [{ id: 'sav_1', name: 'חיסכון', amount: 4000 }]
  };

  const sampleCalculators = {
    mortgage: {
      propertyValue: '2500000',
      monthlyIncome: '25000',
      expectedInflation: '2.5',
      constructionInflation: '2.0',
      tracks: [{ id: 't1', name: 'פריים', amount: 500000, interest: 5.0, years: 25, type: 'spitzer', isLinked: false }]
    },
    fire: {
      u1: {
        initialCapital: '150000',
        monthlyDeposit: '5000',
        desiredNetMonthlyWithdrawal: '15000',
        accumulationReturn: '7.5',
        retirementReturn: '4.0',
        capitalGainsTax: '25',
        annualInflation: '2.5',
        currentAge: '32'
      }
    },
    pension: {
      u1: { salary: 20000, currentAge: 32, retirementAge: 67 }
    }
  };

  const sampleTasks = [
    {
      id: 't_1',
      title: 'הוזלת דמי ניהול בפנסיה',
      description: 'לפנות לסוכן הביטוח לקבלת הצעה',
      priority: 'high',
      completed: false,
      targetDate: '15/09/2026'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only Excel export actions: Full Excel and Blank Template, and NO JSON button', () => {
    render(
      <DataExport
        accounts={sampleAccounts}
        budget={sampleBudget}
        monthsList={['08/2026', '09/2026']}
        users={sampleUsers}
        syncAccountToCloud={mockSyncAccount}
        deleteAccountFromCloud={mockDeleteAccount}
        syncBudgetToCloud={mockSyncBudget}
        syncMonthsToCloud={mockSyncMonths}
        setAccounts={mockSetAccounts}
        setBudget={mockSetBudget}
        setMonthsList={mockSetMonthsList}
        setSelectedPersonalUserId={mockSetSelectedPersonalUserId}
        authUser={{ uid: 'u1' }}
        calculatorsData={sampleCalculators}
        setCalculatorsData={mockSetCalculatorsData}
        syncCalculatorsToCloud={mockSyncCalculators}
        tasks={sampleTasks}
        setTasks={mockSetTasks}
        syncTasksToCloud={mockSyncTasks}
        roomName="חדר בדיקה"
      />
    );

    expect(screen.getByText('ייצוא נתונים מלא')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /הורד קובץ Excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /הורד תבנית ריקה/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /הורד קובץ JSON/i })).not.toBeInTheDocument();
  });

  it('triggers full Excel export and downloads with correct filename', () => {
    render(
      <DataExport
        accounts={sampleAccounts}
        budget={sampleBudget}
        monthsList={['08/2026', '09/2026']}
        users={sampleUsers}
        authUser={{ uid: 'u1' }}
        calculatorsData={sampleCalculators}
        tasks={sampleTasks}
        roomName="משפחה"
      />
    );

    const excelBtn = screen.getByRole('button', { name: /הורד קובץ Excel/i });
    fireEvent.click(excelBtn);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    expect(calls[0][1]).toContain('Financial_Backup_משפחה_');
    expect(calls[0][1]).toContain('.xlsx');
  });

  it('triggers blank template Excel export with ONLY headers, zero personal data rows, and single current month', () => {
    render(
      <DataExport
        accounts={[]}
        budget={DEFAULT_BUDGET}
        monthsList={['07/2026', '08/2026']}
        selectedMonth="08/2026"
        users={sampleUsers}
        authUser={{ uid: 'u1' }}
        calculatorsData={DEFAULT_CALCULATORS_DATA}
        tasks={[]}
      />
    );

    const templateBtn = screen.getByRole('button', { name: /הורד תבנית ריקה/i });
    fireEvent.click(templateBtn);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    expect(calls[0][1]).toContain('Financial_Tracker_Template_');
    expect(calls[0][1]).toContain('.xlsx');

    const wb = calls[0][0];
    expect(wb.SheetNames).toContain('הון וחשבונות');
    expect(wb.SheetNames).toContain('תקציב חודשי');
    expect(wb.SheetNames).toContain('מחשבונים פיננסיים');
    expect(wb.SheetNames).toContain('משימות פיננסיות');

    // Verify each sheet has 0 data rows (only 1 header row)
    const accountsData = XLSX.utils.sheet_to_json(wb.Sheets['הון וחשבונות']);
    expect(accountsData.length).toBe(0);

    // Verify accounts sheet has ONLY ONE month column
    const headerRow = XLSX.utils.sheet_to_json(wb.Sheets['הון וחשבונות'], { header: 1 })[0];
    expect(headerRow).toContain('08/2026');
    expect(headerRow).not.toContain('07/2026');
    const monthCols = headerRow.filter(h => /^\d{2}\/\d{4}$/.test(h));
    expect(monthCols.length).toBe(1);

    const budgetData = XLSX.utils.sheet_to_json(wb.Sheets['תקציב חודשי']);
    expect(budgetData.length).toBe(0);

    const calcsData = XLSX.utils.sheet_to_json(wb.Sheets['מחשבונים פיננסיים']);
    expect(calcsData.length).toBe(0);

    const tasksData = XLSX.utils.sheet_to_json(wb.Sheets['משימות פיננסיות']);
    expect(tasksData.length).toBe(0);
  });

  it('verifies DEFAULT_TASKS is an empty array by default', () => {
    expect(DEFAULT_TASKS).toEqual([]);
  });

  it('exports human-friendly calculations with dedicated readable columns rather than raw JSON strings', () => {
    render(
      <DataExport
        accounts={sampleAccounts}
        budget={sampleBudget}
        monthsList={['08/2026', '09/2026']}
        users={sampleUsers}
        authUser={{ uid: 'u1' }}
        calculatorsData={sampleCalculators}
        tasks={sampleTasks}
        roomName="בית"
      />
    );

    const excelBtn = screen.getByRole('button', { name: /הורד קובץ Excel/i });
    fireEvent.click(excelBtn);

    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const wb = calls[calls.length - 1][0];
    const calcsData = XLSX.utils.sheet_to_json(wb.Sheets['מחשבונים פיננסיים']);

    // Check track row has clean columns instead of raw JSON
    const trackRow = calcsData.find(r => r['שם שדה / מסלול'] === 'פריים');
    expect(trackRow).toBeDefined();
    expect(trackRow['ערך']).toBe(500000);
    expect(trackRow['ריבית (%)']).toBe(5);
    expect(trackRow['לוח סילוקין']).toBe('שפיצר');
  });

  it('restores complete system state on full JSON v2.0 import', async () => {
    render(
      <DataExport
        accounts={[]}
        budget={DEFAULT_BUDGET}
        monthsList={['08/2026']}
        users={sampleUsers}
        syncAccountToCloud={mockSyncAccount}
        deleteAccountFromCloud={mockDeleteAccount}
        syncBudgetToCloud={mockSyncBudget}
        syncMonthsToCloud={mockSyncMonths}
        setAccounts={mockSetAccounts}
        setBudget={mockSetBudget}
        setMonthsList={mockSetMonthsList}
        setSelectedPersonalUserId={mockSetSelectedPersonalUserId}
        authUser={{ uid: 'u1' }}
        calculatorsData={DEFAULT_CALCULATORS_DATA}
        setCalculatorsData={mockSetCalculatorsData}
        syncCalculatorsToCloud={mockSyncCalculators}
        tasks={[]}
        setTasks={mockSetTasks}
        syncTasksToCloud={mockSyncTasks}
      />
    );

    const backupV2 = {
      version: "2.0",
      system: "Financial Tracker",
      monthsList: ['08/2026', '09/2026'],
      accounts: [
        {
          id: 'acc_imp_1',
          name: 'קרן השתלמות',
          category: 'medium',
          ownerId: 'u1',
          order: 0,
          balances: { '08/2026': 50000, '09/2026': 52000 },
          flaggedMonths: { '08/2026': true }
        }
      ],
      budget: sampleBudget,
      calculators: sampleCalculators,
      tasks: sampleTasks
    };

    const file = new File([JSON.stringify(backupV2)], 'backup.json', { type: 'application/json' });
    const fileInput = document.getElementById('data-file-upload');

    fireEvent.change(fileInput, { target: { files: [file] } });

    // The user mapping modal should appear to confirm ownership
    await waitFor(() => {
      expect(screen.getByText('שלב מיפוי משתמשים לייבוא')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /אשר ייבוא ושיוך נתונים/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // 1. Accounts restored
      expect(mockSetAccounts).toHaveBeenCalled();
      const importedAccs = mockSetAccounts.mock.calls[0][0];
      expect(importedAccs[0].name).toBe('קרן השתלמות');
      expect(importedAccs[0].category).toBe('medium');
      expect(importedAccs[0].flaggedMonths).toEqual({ '08/2026': true });

      // 2. Budget restored
      expect(mockSetBudget).toHaveBeenCalledWith(sampleBudget);

      // 3. Months restored
      expect(mockSetMonthsList).toHaveBeenCalledWith(['08/2026', '09/2026']);

      // 4. Calculators restored
      expect(mockSetCalculatorsData).toHaveBeenCalledWith(sampleCalculators);

      // 5. Tasks restored
      expect(mockSetTasks).toHaveBeenCalled();
      const importedTasks = mockSetTasks.mock.calls[0][0];
      expect(importedTasks[0].title).toBe('הוזלת דמי ניהול בפנסיה');

      // 6. Cloud sync functions called
      expect(mockSyncAccount).toHaveBeenCalled();
      expect(mockSyncBudget).toHaveBeenCalledWith(sampleBudget);
      expect(mockSyncMonths).toHaveBeenCalledWith(['08/2026', '09/2026']);
      expect(mockSyncCalculators).toHaveBeenCalledWith(sampleCalculators);
      expect(mockSyncTasks).toHaveBeenCalled();
    });
  });

  it('maintains backward compatibility with legacy v1.0 exports (accounts + budget only)', async () => {
    render(
      <DataExport
        accounts={[]}
        budget={DEFAULT_BUDGET}
        monthsList={['08/2026']}
        users={sampleUsers}
        syncAccountToCloud={mockSyncAccount}
        deleteAccountFromCloud={mockDeleteAccount}
        syncBudgetToCloud={mockSyncBudget}
        syncMonthsToCloud={mockSyncMonths}
        setAccounts={mockSetAccounts}
        setBudget={mockSetBudget}
        setMonthsList={mockSetMonthsList}
        setSelectedPersonalUserId={mockSetSelectedPersonalUserId}
        authUser={{ uid: 'u1' }}
        calculatorsData={DEFAULT_CALCULATORS_DATA}
        setCalculatorsData={mockSetCalculatorsData}
        syncCalculatorsToCloud={mockSyncCalculators}
        tasks={DEFAULT_TASKS}
        setTasks={mockSetTasks}
        syncTasksToCloud={mockSyncTasks}
      />
    );

    // Old v1.0 format
    const legacyV1 = {
      exportedAt: '2026-08-01T00:00:00.000Z',
      monthsList: ['08/2026'],
      accounts: [
        {
          name: 'עו״ש ישן',
          category: 'short',
          ownerId: 'u1',
          balances: { '08/2026': 10000 }
        }
      ],
      budget: sampleBudget
      // notice no calculators or tasks
    };

    const file = new File([JSON.stringify(legacyV1)], 'legacy_backup.json', { type: 'application/json' });
    const fileInput = document.getElementById('data-file-upload');

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('שלב מיפוי משתמשים לייבוא')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /אשר ייבוא ושיוך נתונים/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockSetAccounts).toHaveBeenCalled();
      expect(mockSetBudget).toHaveBeenCalled();
      expect(mockSetMonthsList).toHaveBeenCalled();
      // Calculators and Tasks are not overwritten with null/empty
      expect(mockSetCalculatorsData).not.toHaveBeenCalled();
      expect(mockSetTasks).not.toHaveBeenCalled();
    });
  });

  it('restores selectedMonth and personal user viewState when present in JSON backup', async () => {
    const mockSetSelectedMonth = vi.fn();
    render(
      <DataExport
        accounts={[]}
        budget={DEFAULT_BUDGET}
        monthsList={['08/2026']}
        users={sampleUsers}
        syncAccountToCloud={mockSyncAccount}
        deleteAccountFromCloud={mockDeleteAccount}
        syncBudgetToCloud={mockSyncBudget}
        syncMonthsToCloud={mockSyncMonths}
        setAccounts={mockSetAccounts}
        setBudget={mockSetBudget}
        setMonthsList={mockSetMonthsList}
        setSelectedPersonalUserId={mockSetSelectedPersonalUserId}
        setSelectedMonth={mockSetSelectedMonth}
        authUser={{ uid: 'u1' }}
        calculatorsData={DEFAULT_CALCULATORS_DATA}
        setCalculatorsData={mockSetCalculatorsData}
        syncCalculatorsToCloud={mockSyncCalculators}
        tasks={[]}
        setTasks={mockSetTasks}
        syncTasksToCloud={mockSyncTasks}
      />
    );

    const backupWithViewState = {
      version: "2.0",
      system: "Financial Tracker",
      viewState: {
        selectedMonth: '09/2026',
        selectedPersonalUserId: 'u2'
      },
      monthsList: ['08/2026', '09/2026'],
      accounts: [
        {
          id: 'acc_test_1',
          name: 'עו״ש',
          category: 'short',
          ownerId: 'u1',
          balances: { '08/2026': 1000 }
        }
      ],
      budget: sampleBudget
    };

    const file = new File([JSON.stringify(backupWithViewState)], 'full_backup.json', { type: 'application/json' });
    const fileInput = document.getElementById('data-file-upload');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('שלב מיפוי משתמשים לייבוא')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /אשר ייבוא ושיוך נתונים/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockSetSelectedMonth).toHaveBeenCalledWith('09/2026');
    });
  });

  it('exports full Excel with account IDs, flagged months, and item IDs', () => {
    render(
      <DataExport
        accounts={sampleAccounts}
        budget={sampleBudget}
        monthsList={['08/2026', '09/2026']}
        users={sampleUsers}
        authUser={{ uid: 'u1' }}
        calculatorsData={sampleCalculators}
        tasks={sampleTasks}
        roomName="בית"
      />
    );

    const excelBtn = screen.getByRole('button', { name: /הורד קובץ Excel/i });
    fireEvent.click(excelBtn);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const wb = calls[calls.length - 1][0];

    const accountsData = XLSX.utils.sheet_to_json(wb.Sheets['הון וחשבונות']);
    expect(accountsData[0]['מזהה חשבון']).toBe('acc_1');
    expect(accountsData[0]['שם החשבון']).toBe('עו״ש בנק לאומי');
    expect(accountsData[0]['חודשים מסומנים בדגל']).toBe('08/2026');

    const budgetData = XLSX.utils.sheet_to_json(wb.Sheets['תקציב חודשי']);
    expect(budgetData[0]['מזהה סעיף']).toBe('inc_1');
    expect(budgetData[0]['שם הסעיף']).toBe('משכורת');

    const calcsData = XLSX.utils.sheet_to_json(wb.Sheets['מחשבונים פיננסיים']);
    expect(calcsData.length).toBeGreaterThan(5);

    const tasksData = XLSX.utils.sheet_to_json(wb.Sheets['משימות פיננסיות']);
    expect(tasksData[0]['מזהה ייחודי']).toBe('t_1');
    expect(tasksData[0]['כותרת המשימה']).toBe('הוזלת דמי ניהול בפנסיה');
  });
});
