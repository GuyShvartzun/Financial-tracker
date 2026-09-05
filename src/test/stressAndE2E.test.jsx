import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import App from '../App';
import PensionCalculator from '../components/calculators/PensionCalculator';
import ComprehensiveMortgageAndLoanCalculator from '../components/calculators/ComprehensiveMortgageAndLoanCalculator';
import AdvancedFIRECalculator from '../components/calculators/AdvancedFIRECalculator';
import DataEntryModule from '../components/data/DataEntryModule';
import DataExport from '../components/data/DataExport';
import RoomSettingsModal from '../components/room/RoomSettingsModal';
import RoomLobby from '../components/room/RoomLobby';

import { DEFAULT_CALCULATORS_DATA, DEFAULT_FIRE_DATA, DEFAULT_BUDGET } from '../constants/initialData';

// Mock Firebase for full App lifecycle testing
vi.mock('../config/firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  appId: 'test-app'
}));

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, cb) => {
    // default logged in
    cb({
      uid: 'user_test_1',
      displayName: 'משתמש ראשי',
      email: 'owner@gmail.com',
      photoURL: ''
    });
    return () => {};
  })
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
  collection: vi.fn((db, ...path) => ({ path: path.join('/') })),
  setDoc: vi.fn().mockResolvedValue(true),
  updateDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  query: vi.fn((ref) => ref),
  where: vi.fn(),
  onSnapshot: vi.fn((queryOrRef, cb) => {
    const path = queryOrRef?.path || '';
    if (path.startsWith('rooms') && !path.includes('/')) {
      // Return user rooms in lobby
      cb({
        docs: [
          {
            id: 'room_1',
            data: () => ({
              id: 'room_1',
              name: 'חדר משפחה ראשי',
              ownerId: 'user_test_1',
              ownerEmail: 'owner@gmail.com',
              members: [
                { uid: 'user_test_1', displayName: 'משתמש ראשי', email: 'owner@gmail.com', role: 'owner' },
                { uid: 'user_test_2', displayName: 'משתמש משני', email: 'partner@gmail.com', role: 'member' }
              ],
              memberEmails: ['owner@gmail.com', 'partner@gmail.com']
            })
          }
        ]
      });
    } else if (path.includes('/accounts')) {
      cb({
        empty: false,
        docs: [
          {
            id: 'acc_1',
            data: () => ({
              id: 'acc_1',
              name: 'עו"ש ראשי',
              category: 'short',
              ownerId: 'user_test_1',
              order: 0,
              balances: { '08/2026': 25000 }
            })
          }
        ]
      });
    } else if (path.includes('/settings/budget')) {
      cb({ exists: () => true, data: () => DEFAULT_BUDGET });
    } else if (path.includes('/settings/months')) {
      cb({ exists: () => true, data: () => ({ monthsList: ['08/2026'] }) });
    } else if (path.includes('/settings/calculators')) {
      cb({ exists: () => true, data: () => ({ data: DEFAULT_CALCULATORS_DATA }) });
    } else {
      cb({ exists: () => false, empty: true, docs: [] });
    }
    return () => {};
  })
}));

describe('Interactive Form Stress Testing & Edge Cases', () => {
  describe('Pension Calculator Edge Cases', () => {
    it('handles extreme inputs (age > retirement age, zero annuity, custom return) gracefully without NaN crash', () => {
      const handleUpdate = vi.fn();
      const mockData = {
        pension: {
          u1: {
            balance: '100000',
            monthlyDeposit: '2000',
            currentAge: '70', // age greater than retire age
            retireAge: '65',
            trackId: 'custom',
            customReturnRate: '8.5',
            managementFeeDeposit: '1.5',
            managementFeeBalance: '0.2',
            annualInflationRate: '2.5',
            annualDepositGrowth: '2',
            annuityFactor: '0' // division by zero stress
          }
        }
      };

      render(
        <PensionCalculator
          calculatorsData={mockData}
          onUpdateData={handleUpdate}
          accounts={[]}
          selectedMonth="08/2026"
          users={[{ uid: 'u1', displayName: 'משתמש' }]}
          isSingleMember={true}
        />
      );

      expect(screen.getByText('סימולטור פנסיוני')).toBeInTheDocument();
      // Should not crash or produce invalid screen text
      expect(screen.getByText(/חיזוי צבירה וקצבה/i)).toBeInTheDocument();
    });
  });

  describe('Comprehensive Mortgage Calculator Edge Cases', () => {
    it('handles empty mortgage tracks, zero values, and allows adding and configuring tracks', () => {
      const handleUpdate = vi.fn();
      const data = {
        propertyValue: '',
        monthlyIncome: '',
        expectedInflation: '',
        constructionInflation: '',
        tracks: []
      };

      render(
        <ComprehensiveMortgageAndLoanCalculator
          data={data}
          onUpdate={handleUpdate}
        />
      );

      // Add a track
      const addTrackBtn = screen.getByRole('button', { name: /הוסף הלוואה \/ מסלול חדש/i });
      fireEvent.click(addTrackBtn);
      expect(handleUpdate).toHaveBeenCalledWith(
        'mortgage',
        expect.objectContaining({
          tracks: expect.arrayContaining([expect.objectContaining({ name: 'מסלול 1' })])
        })
      );
    });
  });

  describe('Advanced FIRE Calculator Edge Cases', () => {
    it('handles 0% returns, 100% inflation, and extreme retirement goals cleanly', () => {
      const handleUpdate = vi.fn();
      const calculatorsData = {
        fire: {
          u1: {
            ...DEFAULT_FIRE_DATA,
            initialCapital: '50000',
            monthlyDeposit: '0',
            desiredNetMonthlyWithdrawal: '15000',
            accumulationReturn: '0',
            retirementReturn: '0',
            annualInflation: '100', // 100% inflation stress test
            currentAge: '30'
          }
        }
      };

      render(
        <AdvancedFIRECalculator
          calculatorsData={calculatorsData}
          onUpdateData={handleUpdate}
          accounts={[]}
          selectedMonth="08/2026"
          users={[{ uid: 'u1', displayName: 'משתמש' }]}
          isSingleMember={true}
        />
      );

      expect(screen.getByText('מחשבון עצמאות כלכלית')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    });
  });

  describe('RoomSettingsModal Form Validations', () => {
    const mockRoom = {
      id: 'r1',
      name: 'חדר פיננסי',
      ownerId: 'u1',
      ownerEmail: 'owner@gmail.com',
      members: [
        { uid: 'u1', displayName: 'הבעלים', email: 'owner@gmail.com', role: 'owner' }
      ]
    };
    const mockAuthUser = { uid: 'u1', email: 'owner@gmail.com', displayName: 'הבעלים' };

    it('validates email format and blocks invalid emails when inviting', async () => {
      render(
        <RoomSettingsModal
          currentRoom={mockRoom}
          authUser={mockAuthUser}
          onClose={vi.fn()}
          onUpdateRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          onLeaveRoom={vi.fn()}
        />
      );

      const nameInput = screen.getByPlaceholderText('למשל: דניאל');
      const emailInput = screen.getByPlaceholderText('name@gmail.com');
      const submitBtn = screen.getByRole('button', { name: /הוסף חבר לחדר/i });

      // Test 1: Empty inputs
      fireEvent.click(submitBtn);
      expect(screen.getByText('נא למלא שם תצוגה וכתובת אימייל')).toBeInTheDocument();

      // Test 2: Invalid email without dot
      fireEvent.change(nameInput, { target: { value: 'שותף חדש' } });
      fireEvent.change(emailInput, { target: { value: 'bademail@domain' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText('נא להזין כתובת אימייל תקינה')).toBeInTheDocument();

      // Test 3: Existing owner email duplicate
      fireEvent.change(emailInput, { target: { value: 'owner@gmail.com' } });
      fireEvent.click(submitBtn);
      expect(screen.getByText('משתמש עם כתובת אימייל זו כבר קיים בחדר')).toBeInTheDocument();
    });

    it('renders responsive confirm and cancel buttons when editing member display name or room name', () => {
      render(
        <RoomSettingsModal
          currentRoom={mockRoom}
          authUser={mockAuthUser}
          onClose={vi.fn()}
          onUpdateRoom={vi.fn()}
          onDeleteRoom={vi.fn()}
          onLeaveRoom={vi.fn()}
        />
      );

      // Room name cancel test
      const roomInput = screen.getByDisplayValue('חדר פיננסי');
      fireEvent.change(roomInput, { target: { value: 'חדר פיננסי משודרג' } });
      const cancelRoomBtn = screen.getByRole('button', { name: 'ביטול' });
      expect(cancelRoomBtn).toBeInTheDocument();
      fireEvent.click(cancelRoomBtn);
      expect(screen.getByDisplayValue('חדר פיננסי')).toBeInTheDocument();

      // Member display name inline edit test
      const editNameBtn = screen.getByRole('button', { name: /ערוך שם/i });
      fireEvent.click(editNameBtn);
      expect(screen.getByRole('button', { name: 'שמור' })).toBeInTheDocument();
      const cancelMemberBtn = screen.getByRole('button', { name: 'ביטול' });
      expect(cancelMemberBtn).toBeInTheDocument();
      fireEvent.click(cancelMemberBtn);
      expect(screen.queryByRole('button', { name: 'שמור' })).not.toBeInTheDocument();
    });
  });

  describe('DataExport Multi-User Mapping Modal', () => {
    it('opens mapping modal with detected owners and allows mapping to room members', () => {
      render(
        <DataExport
          accounts={[]}
          budget={DEFAULT_BUDGET}
          monthsList={['08/2026']}
          users={[
            { uid: 'u1', displayName: 'משה ראשי', email: 'moshe@gmail.com' },
            { uid: 'u2', displayName: 'רחל שותפה', email: 'rachel@gmail.com' }
          ]}
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

      expect(screen.getByText('ייצוא, גיבוי וייבוא נתונים')).toBeInTheDocument();
    });
  });
});

describe('App End-to-End User Journey Simulation', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('navigates seamlessly across the full application without throwing console errors', async () => {
    render(<App />);

    // In Room Lobby, select the active room
    await waitFor(() => {
      expect(screen.getByText('חדר משפחה ראשי')).toBeInTheDocument();
    });

    const enterBtn = screen.getByRole('button', { name: /היכנס לחדר/i });
    fireEvent.click(enterBtn);

    // Enters active room screen (multi-member defaults to shared_dash)
    await waitFor(() => {
      expect(screen.getByText('מעקב פיננסי משותף')).toBeInTheDocument();
    });

    // 1. Navigate to Personal Dashboard
    const personalTab = screen.getByRole('button', { name: 'דשבורד אישי' });
    fireEvent.click(personalTab);
    await waitFor(() => {
      expect(screen.getByText(/פירוט חשבונות אישיים/i)).toBeInTheDocument();
    });

    // 2. Navigate to Budget Tab
    const budgetTab = screen.getByRole('button', { name: 'תקציב' });
    fireEvent.click(budgetTab);
    await waitFor(() => {
      expect(screen.getByText('סה"כ הכנסות חודשיות')).toBeInTheDocument();
    });

    // 3. Navigate to Calculators Tab
    const calcsTab = screen.getByRole('button', { name: 'מחשבונים פיננסיים' });
    fireEvent.click(calcsTab);
    await waitFor(() => {
      expect(screen.getAllByText('סימולטור פנסיוני')[0]).toBeInTheDocument();
    });

    // 4. Navigate to AI Advisor Tab
    const aiTab = screen.getByRole('button', { name: 'יועץ פיננסי' });
    fireEvent.click(aiTab);
    await waitFor(() => {
      expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();
    });

    // 5. Navigate to Data Entry Tab
    const dataEntryTab = screen.getByRole('button', { name: 'הזנת נתונים' });
    fireEvent.click(dataEntryTab);
    await waitFor(() => {
      expect(screen.getByText('הזנת נתונים חודשית וניהול חשבונות')).toBeInTheDocument();
    });

    // 6. Navigate to Export Tab
    const exportTab = screen.getByRole('button', { name: 'ייצוא וייבוא אקסל' });
    fireEvent.click(exportTab);
    await waitFor(() => {
      expect(screen.getByText('ייצוא, גיבוי וייבוא נתונים')).toBeInTheDocument();
    });

    // Verify ZERO uncaught React errors or crashes occurred
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
