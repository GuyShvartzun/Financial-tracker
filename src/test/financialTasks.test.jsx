import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialTaskList, { TASK_CATEGORIES, TASK_PRIORITIES } from '../components/tasks/FinancialTaskList';
import AIAdvisorTab from '../components/ai/AIAdvisorTab';

describe('FinancialTaskList Component', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: 'פתיחת קרן השתלמות',
      description: 'הפקדה חודשית עד לתקרה המוטבת',
      category: 'savings',
      priority: 'high',
      completed: false,
      assignedTo: 'user-1',
      targetMonth: '08/2026',
      createdAt: '2026-08-01T00:00:00.000Z'
    },
    {
      id: 'task-2',
      title: 'הוזלת דמי ניהול בפנסיה',
      description: 'שיחת מיקוח מול הסוכן',
      category: 'pension',
      priority: 'medium',
      completed: true,
      completedAt: '2026-08-10T00:00:00.000Z',
      assignedTo: '',
      targetMonth: '08/2026',
      createdAt: '2026-08-01T00:00:00.000Z'
    },
    {
      id: 'task-3',
      title: 'מיחזור הלוואה ישנה',
      description: 'השוואת ריביות מול 2 בנקים',
      category: 'debt',
      priority: 'high',
      completed: false,
      assignedTo: '',
      targetMonth: '08/2026',
      createdAt: '2026-08-01T00:00:00.000Z'
    }
  ];

  const mockUsers = [
    { uid: 'user-1', displayName: 'דניאל' },
    { uid: 'user-2', displayName: 'מיכל' }
  ];

  it('renders task list metrics, progress bar and tasks correctly', () => {
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={vi.fn()}
        users={mockUsers}
        selectedMonth="08/2026"
      />
    );

    // Summary stats
    expect(screen.getByText('משימות ותוכנית פעולה פיננסית')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // total tasks
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // pending tasks
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // completed tasks

    // Task items
    expect(screen.getByText('פתיחת קרן השתלמות')).toBeInTheDocument();
    expect(screen.getByText('הוזלת דמי ניהול בפנסיה')).toBeInTheDocument();
    expect(screen.getByText('מיחזור הלוואה ישנה')).toBeInTheDocument();

    // Progress
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  it('filters tasks by status: all, pending, completed', () => {
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={vi.fn()}
        users={mockUsers}
        selectedMonth="08/2026"
      />
    );

    // Click Pending filter
    const pendingBtn = screen.getByRole('button', { name: /לביצוע/ });
    fireEvent.click(pendingBtn);

    expect(screen.getByText('פתיחת קרן השתלמות')).toBeInTheDocument();
    expect(screen.getByText('מיחזור הלוואה ישנה')).toBeInTheDocument();
    expect(screen.queryByText('הוזלת דמי ניהול בפנסיה')).not.toBeInTheDocument();

    // Click Completed filter
    const completedBtn = screen.getByRole('button', { name: /הושלמו/ });
    fireEvent.click(completedBtn);

    expect(screen.getByText('הוזלת דמי ניהול בפנסיה')).toBeInTheDocument();
    expect(screen.queryByText('פתיחת קרן השתלמות')).not.toBeInTheDocument();
    expect(screen.queryByText('מיחזור הלוואה ישנה')).not.toBeInTheDocument();
  });

  it('filters tasks by text search', () => {
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={vi.fn()}
        users={mockUsers}
        selectedMonth="08/2026"
      />
    );

    const searchInput = screen.getByPlaceholderText('חיפוש משימה...');
    fireEvent.change(searchInput, { target: { value: 'מיחזור' } });

    expect(screen.getByText('מיחזור הלוואה ישנה')).toBeInTheDocument();
    expect(screen.queryByText('פתיחת קרן השתלמות')).not.toBeInTheDocument();
    expect(screen.queryByText('הוזלת דמי ניהול בפנסיה')).not.toBeInTheDocument();
  });

  it('calls onUpdateTasks when toggling task completion', () => {
    const handleUpdate = vi.fn();
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={handleUpdate}
        users={mockUsers}
      />
    );

    const toggleBtn = screen.getAllByTitle('סמן כבוצעה')[0];
    fireEvent.click(toggleBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedTasks = handleUpdate.mock.calls[0][0];
    expect(updatedTasks[0].completed).toBe(true);
    expect(updatedTasks[0].completedAt).toBeDefined();
  });

  it('allows adding a new task through form', () => {
    const handleUpdate = vi.fn();
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={handleUpdate}
        users={mockUsers}
        selectedMonth="08/2026"
      />
    );

    // Open add form
    const newTaskBtn = screen.getByRole('button', { name: /משימה חדשה/ });
    fireEvent.click(newTaskBtn);

    // Fill title
    const titleInput = screen.getByPlaceholderText(/פתיחת קרן השתלמות, מיקוח עמלות/);
    fireEvent.change(titleInput, { target: { value: 'בדיקת ביטוח בריאות כפול' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: 'שמור משימה' });
    fireEvent.click(submitBtn);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedTasks = handleUpdate.mock.calls[0][0];
    expect(updatedTasks[0].title).toBe('בדיקת ביטוח בריאות כפול');
    expect(updatedTasks.length).toBe(4);
  });

  it('calls onUpdateTasks when deleting a task', () => {
    const handleUpdate = vi.fn();
    render(
      <FinancialTaskList
        tasks={mockTasks}
        onUpdateTasks={handleUpdate}
        users={mockUsers}
      />
    );

    const deleteBtns = screen.getAllByTitle('מחק משימה');
    fireEvent.click(deleteBtns[0]);

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    const updatedTasks = handleUpdate.mock.calls[0][0];
    expect(updatedTasks.length).toBe(2);
    expect(updatedTasks.find(t => t.id === 'task-1')).toBeUndefined();
  });
});

describe('AIAdvisorTab with Task List integration', () => {
  const dummyProps = {
    roomStats: { netWorth: 500000, liquid: 150000, nonLiquid: 350000, liabilities: 0, emergencyMonths: 6 },
    budgetTotals: { totalIncome: 20000, totalFixed: 8000, totalVar: 4000, totalSavings: 8000, fixedPct: 40, varPct: 20, savingsPct: 40 },
    accounts: [],
    selectedMonth: '08/2026',
    users: [{ uid: 'user-1', displayName: 'דניאל' }]
  };

  it('renders sub-tabs and switches between AI Advisor view and Tasks view', () => {
    render(<AIAdvisorTab {...dummyProps} />);

    // Check header and badge exist
    expect(screen.getByText('יועץ פיננסי')).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();

    // Check both sub tabs
    const advisorSubTab = screen.getByRole('button', { name: /דוח וצ'אט יועץ AI/ });
    const tasksSubTab = screen.getByRole('button', { name: /רשימת משימות פיננסיות/ });
    expect(advisorSubTab).toBeInTheDocument();
    expect(tasksSubTab).toBeInTheDocument();

    // Switch to tasks
    fireEvent.click(tasksSubTab);
    expect(screen.getByText('משימות ותוכנית פעולה פיננסית')).toBeInTheDocument();

    // Switch back to advisor
    fireEvent.click(advisorSubTab);
    expect(screen.getByText('הפק דוח ייעוץ פיננסי מלא')).toBeInTheDocument();
  });
});
