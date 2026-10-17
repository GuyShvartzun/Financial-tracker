import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoomData } from '../hooks/useRoomData';
import { sortMonths } from '../utils/calculations';

// Mock dependencies
const mockSnapshotListeners = {};

vi.mock('../config/firebase', () => ({
  db: { id: 'mock-db' }
}));

vi.mock('../utils/crypto', () => ({
  getRoomCryptoKey: vi.fn().mockResolvedValue('mock-key'),
  encryptAccountForCloud: vi.fn((acc) => Promise.resolve(acc)),
  decryptAccountFromCloud: vi.fn((acc) => Promise.resolve(acc)),
  encryptSettingsForCloud: vi.fn((settings) => Promise.resolve(settings)),
  decryptSettingsFromCloud: vi.fn((settings) => Promise.resolve(settings))
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, ...path) => ({ path: path.join('/') })),
  collection: vi.fn((db, ...path) => ({ path: path.join('/') })),
  setDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  onSnapshot: vi.fn((docOrCollRef, onNext) => {
    const path = docOrCollRef?.path || '';
    mockSnapshotListeners[path] = onNext;
    return vi.fn(); // unsubscribe
  })
}));

describe('Room Months Default Selection & Synchronization', () => {
  const mockAuthUser = { uid: 'user_1', email: 'test@example.com' };
  const mockRoom = { id: 'room_123', name: 'חדר בדיקה' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    for (const key in mockSnapshotListeners) {
      delete mockSnapshotListeners[key];
    }
  });

  it('always sets selectedMonth to the latest available month when room months are loaded from cloud', async () => {
    let currentSelected = '08/2026';
    const mockSetSelectedMonth = vi.fn((newMonth) => {
      currentSelected = newMonth;
    });

    const { result } = renderHook(() =>
      useRoomData(mockRoom, mockAuthUser, currentSelected, mockSetSelectedMonth)
    );

    // Simulate Firestore emitting monthsList for this room with multiple historical months
    const monthsPath = 'rooms/room_123/settings/months';
    expect(mockSnapshotListeners[monthsPath]).toBeDefined();

    await act(async () => {
      await mockSnapshotListeners[monthsPath]({
        exists: () => true,
        data: () => ({ monthsList: ['06/2026', '08/2026', '09/2026', '07/2026'] })
      });
    });

    // Latest month chronologically is 09/2026
    expect(mockSetSelectedMonth).toHaveBeenCalledWith('09/2026');
    expect(localStorage.getItem('fin_tracker_latest_month_room_123')).toBe('09/2026');
    expect(localStorage.getItem('fin_tracker_global_latest_month')).toBe('09/2026');
  });

  it('sets selectedMonth to newly added month and persists it when adding a new month', async () => {
    let currentSelected = '08/2026';
    const mockSetSelectedMonth = vi.fn((newMonth) => {
      currentSelected = newMonth;
    });

    const { result } = renderHook(() =>
      useRoomData(mockRoom, mockAuthUser, currentSelected, mockSetSelectedMonth)
    );

    const monthsPath = 'rooms/room_123/settings/months';
    await act(async () => {
      await mockSnapshotListeners[monthsPath]({
        exists: () => true,
        data: () => ({ monthsList: ['08/2026', '09/2026'] })
      });
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('09/2026');

    // Add a brand new month
    await act(async () => {
      result.current.handleAddNewMonth('10/2026');
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('10/2026');
    expect(localStorage.getItem('fin_tracker_latest_month_room_123')).toBe('10/2026');
    expect(localStorage.getItem('fin_tracker_global_latest_month')).toBe('10/2026');
    expect(result.current.monthsList).toContain('10/2026');
  });

  it('keeps the user on the new latest month if a new month arrives while viewing latest', async () => {
    let currentSelected = '08/2026';
    const mockSetSelectedMonth = vi.fn((newMonth) => {
      currentSelected = newMonth;
    });

    const { rerender } = renderHook(() =>
      useRoomData(mockRoom, mockAuthUser, currentSelected, mockSetSelectedMonth)
    );

    const monthsPath = 'rooms/room_123/settings/months';
    await act(async () => {
      await mockSnapshotListeners[monthsPath]({
        exists: () => true,
        data: () => ({ monthsList: ['08/2026', '09/2026'] })
      });
    });

    expect(currentSelected).toBe('09/2026');
    rerender();

    // Now another user or device adds 10/2026 to the cloud
    await act(async () => {
      await mockSnapshotListeners[monthsPath]({
        exists: () => true,
        data: () => ({ monthsList: ['08/2026', '09/2026', '10/2026'] })
      });
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('10/2026');
  });

  it('falls back to the new latest month when the currently selected month is deleted', async () => {
    let currentSelected = '09/2026';
    const mockSetSelectedMonth = vi.fn((newMonth) => {
      currentSelected = newMonth;
    });

    const { result } = renderHook(() =>
      useRoomData(mockRoom, mockAuthUser, currentSelected, mockSetSelectedMonth)
    );

    const monthsPath = 'rooms/room_123/settings/months';
    await act(async () => {
      await mockSnapshotListeners[monthsPath]({
        exists: () => true,
        data: () => ({ monthsList: ['08/2026', '09/2026'] })
      });
    });

    // Delete 09/2026
    await act(async () => {
      result.current.handleDeleteMonth('09/2026');
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('08/2026');
    expect(localStorage.getItem('fin_tracker_latest_month_room_123')).toBe('08/2026');
  });

  it('re-initializes to the latest month when switching to a different room', async () => {
    let currentSelected = '08/2026';
    const mockSetSelectedMonth = vi.fn((newMonth) => {
      currentSelected = newMonth;
    });

    let currentRoom = { id: 'room_A', name: 'חדר א' };
    const { rerender } = renderHook(() =>
      useRoomData(currentRoom, mockAuthUser, currentSelected, mockSetSelectedMonth)
    );

    // Room A has months up to 09/2026
    await act(async () => {
      await mockSnapshotListeners['rooms/room_A/settings/months']({
        exists: () => true,
        data: () => ({ monthsList: ['08/2026', '09/2026'] })
      });
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('09/2026');

    // Switch to Room B which has months up to 12/2026
    currentRoom = { id: 'room_B', name: 'חדר ב' };
    rerender();

    await act(async () => {
      await mockSnapshotListeners['rooms/room_B/settings/months']({
        exists: () => true,
        data: () => ({ monthsList: ['10/2026', '11/2026', '12/2026'] })
      });
    });

    expect(mockSetSelectedMonth).toHaveBeenCalledWith('12/2026');
    expect(localStorage.getItem('fin_tracker_latest_month_room_B')).toBe('12/2026');
  });
});
