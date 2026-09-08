import React, { useState, useEffect, useRef } from 'react';
import {
  doc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';

import { db } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { useRoomData } from './hooks/useRoomData';
import { useFinancialStats } from './hooks/useFinancialStats';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useExchangeRates } from './utils/exchangeRates';

import LoginView from './components/auth/LoginView';
import RoomLobby from './components/room/RoomLobby';
import RoomSettingsModal from './components/room/RoomSettingsModal';
import Header from './components/layout/Header';
import MonthSelector from './components/layout/MonthSelector';
import DashboardModule from './components/dashboard/DashboardModule';
import CalculatorsModule from './components/calculators/CalculatorsModule';
import AIAdvisorTab from './components/ai/AIAdvisorTab';
import DataEntryModule from './components/data/DataEntryModule';
import DataExport from './components/data/DataExport';
import ErrorBoundary from './components/common/ErrorBoundary';

import { PrivacyContext } from './context/PrivacyContext';
import { ThemeContext } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { FinancialDataProvider } from './context/FinancialDataContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState('shared');

  // 1. Authentication Hook
  const { 
    authUser, 
    authLoading, 
    loginWithGoogle, 
    logoutGoogle 
  } = useAuth();

  // Rooms & Active Room
  const [userRooms, setUserRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showManageRoomModal, setShowManageRoomModal] = useState(false);
  const [selectedPersonalUserId, setSelectedPersonalUserId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('08/2026');

  // 2. Active Room Financial Data Hook (Firestore listeners & client-side encryption)
  const {
    accounts,
    setAccounts,
    budget,
    setBudget,
    monthsList,
    setMonthsList,
    calculatorsData,
    setCalculatorsData,
    tasks,
    setTasks,
    isCloudSynced,
    syncAccountToCloud,
    deleteAccountFromCloud,
    syncBudgetToCloud,
    syncMonthsToCloud,
    syncCalculatorsToCloud,
    syncTasksToCloud,
    handleUpdateTasks,
    handleBalanceChange,
    handleAccountNameChange,
    handleAccountCurrencyChange,
    handleAccountCategoryChange,
    handleReorderAccount,
    handleMoveAccountToPosition,
    handleAddAccount,
    handleRemoveAccountFromMonth,
    handleDeleteAccountCompletely,
    handleDeleteMonth,
    handleToggleFlagAccount,
    handleAddNewMonth,
    updateCalculatorData
  } = useRoomData(currentRoom, authUser, selectedMonth, setSelectedMonth);

  // Privacy Mode State (persisted in localStorage)
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    try {
      return localStorage.getItem('fin_tracker_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Dark Mode State (persisted in localStorage, with system preference fallback)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('fin_tracker_dark_mode');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Persist dark mode changes and sync global html and body classes
  useEffect(() => {
    try {
      localStorage.setItem('fin_tracker_dark_mode', String(isDarkMode));
    } catch (e) {
      console.warn("Could not persist dark mode to localStorage:", e);
    }
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Persist privacy mode changes and sync global body class
  useEffect(() => {
    try {
      localStorage.setItem('fin_tracker_privacy_mode', String(isPrivacyMode));
    } catch (e) {
      console.warn("Could not persist privacy mode to localStorage:", e);
    }
    if (typeof document !== 'undefined') {
      if (isPrivacyMode) {
        document.body.classList.add('privacy-active');
        document.documentElement.classList.add('privacy-active');
      } else {
        document.body.classList.remove('privacy-active');
        document.documentElement.classList.remove('privacy-active');
      }
    }
  }, [isPrivacyMode]);

  // 3. Global Keyboard Shortcuts (P: Privacy Mode, D: Dark Mode, Esc: Close Modals)
  useKeyboardShortcuts({
    onTogglePrivacyMode: () => setIsPrivacyMode(prev => !prev),
    onToggleDarkMode: () => setIsDarkMode(prev => !prev),
    onCloseModals: () => {
      setShowManageRoomModal(false);
    }
  });

  // Query Rooms where current user is authorized
  useEffect(() => {
    if (!authUser || !db) {
      setUserRooms([]);
      return;
    }

    const userEmail = authUser.email.toLowerCase();
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('memberEmails', 'array-contains', userEmail));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserRooms(rooms);

      // Keep currentRoom in sync with any cloud updates
      setCurrentRoom(prev => {
        if (!prev) return null;
        const updated = rooms.find(r => r.id === prev.id);
        return updated || prev;
      });
    }, (err) => {
      console.warn("Firestore rooms query notice:", err);
    });

    return () => unsubscribe();
  }, [authUser]);

  // Auto-link UID & photoURL if member was invited by email prior to login
  useEffect(() => {
    if (!currentRoom || !authUser || !db) return;

    const userEmail = authUser.email.toLowerCase();
    const members = currentRoom.members || [];
    let needsUpdate = false;

    const updatedMembers = members.map(m => {
      if (m.email?.toLowerCase() === userEmail && (m.id !== authUser.uid || m.uid !== authUser.uid || (authUser.photoURL && !m.photoURL))) {
        needsUpdate = true;
        const localDisplayName = m.displayName || m.name || authUser.name || userEmail.split('@')[0];
        return {
          ...m,
          id: authUser.uid,
          uid: authUser.uid,
          displayName: localDisplayName,
          name: localDisplayName,
          photoURL: authUser.photoURL || m.photoURL || ''
        };
      }
      return m;
    });

    if (needsUpdate) {
      updateDoc(doc(db, 'rooms', currentRoom.id), {
        members: updatedMembers
      }).catch(err => console.warn("Failed to auto-link member UID:", err));
    }
  }, [currentRoom?.id, authUser]);

  const roomMembers = (currentRoom?.members || []).map(m => ({
    ...m,
    id: m.uid || m.id,
    uid: m.uid || m.id,
    displayName: m.displayName || m.name,
    name: m.displayName || m.name
  }));

  const isSingleMember = roomMembers.length <= 1;

  // Default personal user selection when room loads
  useEffect(() => {
    if (!currentRoom) return;
    const members = currentRoom.members || [];
    const myUid = authUser?.uid;
    if (myUid && members.some(m => (m.uid || m.id) === myUid)) {
      setSelectedPersonalUserId(myUid);
    } else if (members.length > 0) {
      setSelectedPersonalUserId(members[0].uid || members[0].id);
    }
  }, [currentRoom?.id, authUser?.uid]);

  // Set default dashboard when entering a room:
  // Shared dashboard if multiple members exist, or Personal dashboard if single member.
  const lastEnteredRoomIdRef = useRef(null);

  useEffect(() => {
    if (currentRoom) {
      if (lastEnteredRoomIdRef.current !== currentRoom.id) {
        lastEnteredRoomIdRef.current = currentRoom.id;
        const isSingle = (currentRoom.members || []).length <= 1;
        setActiveTab('dashboard');
        setDashboardSubTab(isSingle ? 'personal' : 'shared');
        setSelectedPersonalUserId(authUser?.uid || currentRoom.members?.[0]?.uid || '');
      }
    } else {
      lastEnteredRoomIdRef.current = null;
    }
  }, [currentRoom?.id, authUser?.uid]);

  // Auto-switch to personal dashboard when there is only one member
  useEffect(() => {
    if (isSingleMember && dashboardSubTab === 'shared') {
      setDashboardSubTab('personal');
    }
  }, [isSingleMember, dashboardSubTab]);

  // Auto-sanitization: ensure all existing accounts possess a valid member UID
  useEffect(() => {
    if (!roomMembers || roomMembers.length === 0 || !accounts || accounts.length === 0) return;

    const validUids = new Set(roomMembers.map(m => m.uid || m.id));
    const adminUid = roomMembers[0]?.uid || roomMembers[0]?.id;
    const partnerUid = roomMembers[1]?.uid || roomMembers[1]?.id || adminUid;

    let needsSanitize = false;
    const sanitizedAccounts = accounts.map(acc => {
      if (!acc.ownerId || !validUids.has(acc.ownerId)) {
        needsSanitize = true;
        let targetUid = adminUid;
        if (
          acc.ownerId === 'u2' || acc.ownerId === 'user2' || acc.ownerId === '2' || 
          acc.ownerId === 'משתמש משני' || acc.ownerId === 'בת זוג' || acc.ownerId === 'בן זוג'
        ) {
          targetUid = partnerUid;
        }
        const updated = { ...acc, ownerId: targetUid };
        syncAccountToCloud(updated);
        return updated;
      }
      return acc;
    });

    if (needsSanitize) {
      setAccounts(sanitizedAccounts);
    }
  }, [roomMembers, accounts, syncAccountToCloud, setAccounts]);

  const roomCurrency = currentRoom?.currency || 'ILS';
  const { rates: exchangeRates } = useExchangeRates(selectedMonth);

  // 4. Financial Statistics Hook (Macro Room stats, Personal stats, Budget totals)
  const { 
    roomStats, 
    personalStats, 
    budgetTotals 
  } = useFinancialStats({
    accounts,
    monthsList,
    selectedMonth,
    budget,
    selectedPersonalUserId,
    authUser,
    roomMembers,
    isSingleMember,
    rates: exchangeRates,
    roomCurrency
  });

  const onAddAccount = (category, targetOwnerId) => {
    handleAddAccount(
      category, 
      targetOwnerId, 
      selectedMonth, 
      authUser?.uid || roomMembers[0]?.uid || 'default_user'
    );
  };

  // Shared context payload
  const financialContextValue = {
    accounts,
    budget,
    monthsList,
    selectedMonth,
    setSelectedMonth,
    calculatorsData,
    tasks,
    roomStats,
    personalStats,
    budgetTotals,
    users: roomMembers,
    isSingleMember,
    isCloudSynced,
    authUser,
    roomCurrency,
    exchangeRates
  };

  // Loading Screen with Shimmer Skeleton
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] font-sans p-4 sm:p-8 dir-rtl text-right" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Navbar Skeleton */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-200 animate-shimmer"></div>
              <div className="space-y-2">
                <div className="w-36 h-4 rounded-md bg-stone-200 animate-shimmer"></div>
                <div className="w-24 h-3 rounded-md bg-stone-100 animate-shimmer"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-8 rounded-xl bg-stone-200 animate-shimmer"></div>
              <div className="w-8 h-8 rounded-full bg-stone-200 animate-shimmer"></div>
            </div>
          </div>

          {/* Metric Cards Skeleton Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white border border-[#E8E2D8] rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="w-24 h-3 rounded bg-stone-200 animate-shimmer"></div>
                <div className="w-32 h-6 rounded bg-stone-200 animate-shimmer"></div>
                <div className="w-16 h-2.5 rounded bg-stone-100 animate-shimmer"></div>
              </div>
            ))}
          </div>

          {/* Central Content Skeleton & Spinner */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-8 shadow-xs flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <div className="w-12 h-12 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-stone-600 font-bold text-sm">טוען נתונים...</p>
            <div className="w-48 h-2.5 rounded-full bg-stone-200 animate-shimmer mt-2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Login View
  if (!authUser) {
    return <LoginView onLogin={loginWithGoogle} />;
  }

  // Logged In, but No Active Room Selected -> Room Lobby
  if (!currentRoom) {
    return (
      <RoomLobby
        authUser={authUser}
        rooms={userRooms}
        onSelectRoom={(room) => {
          const isSingle = (room?.members?.length || 1) <= 1;
          setActiveTab('dashboard');
          setDashboardSubTab(isSingle ? 'personal' : 'shared');
          setSelectedPersonalUserId(authUser?.uid || room?.members?.[0]?.uid || '');
          setCurrentRoom(room);
        }}
        onLogout={logoutGoogle}
      />
    );
  }

  // Active Room Screen
  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, toggleDarkMode: () => setIsDarkMode(prev => !prev) }}>
      <PrivacyContext.Provider value={{ isPrivacyMode, setIsPrivacyMode }}>
        <ToastProvider>
          <FinancialDataProvider value={financialContextValue}>
            <div className={`min-h-screen bg-[#FAF7F2] text-stone-800 font-sans dir-rtl text-right select-none ${isPrivacyMode ? 'privacy-active' : ''}`} dir="rtl">
              <Header
                authUser={authUser}
                isCloudSynced={isCloudSynced}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onLogout={logoutGoogle}
                currentRoom={currentRoom}
                onSwitchRoom={() => setCurrentRoom(null)}
                onOpenManageRoom={() => setShowManageRoomModal(true)}
                isPrivacyMode={isPrivacyMode}
                onTogglePrivacyMode={() => setIsPrivacyMode(prev => !prev)}
                isDarkMode={isDarkMode}
                onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
              />

              {/* Main Content Area offset by right sidebar on desktop */}
              <div className="md:mr-64 transition-all duration-300">
                <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-24 md:pb-12">
                  <ErrorBoundary title="אירעה שגיאה בטעינת המסך">
                    {(activeTab === 'dashboard' || activeTab === 'shared_dash' || activeTab === 'personal_dash' || activeTab === 'budget') && (
                      <MonthSelector
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        monthsList={monthsList}
                      />
                    )}

                    {(activeTab === 'dashboard' || activeTab === 'shared_dash' || activeTab === 'personal_dash' || activeTab === 'budget') && (
                      <DashboardModule
                        subTab={
                          activeTab === 'shared_dash' ? 'shared' :
                          activeTab === 'personal_dash' ? 'personal' :
                          activeTab === 'budget' ? 'budget' :
                          dashboardSubTab
                        }
                        onSubTabChange={(newSub) => {
                          setActiveTab('dashboard');
                          setDashboardSubTab(newSub);
                        }}
                        isSingleMember={isSingleMember}
                        roomStats={roomStats}
                        budgetTotals={budgetTotals}
                        isPrivacyMode={isPrivacyMode}
                        personalStats={personalStats}
                        selectedPersonalUserId={selectedPersonalUserId}
                        setSelectedPersonalUserId={setSelectedPersonalUserId}
                        selectedMonth={selectedMonth}
                        monthsList={monthsList}
                        accounts={accounts}
                        users={roomMembers}
                        activeUserId={authUser?.uid}
                        budget={budget}
                        onUpdateBudget={(updated) => {
                          setBudget(updated);
                          syncBudgetToCloud(updated);
                        }}
                        roomCurrency={roomCurrency}
                        rates={exchangeRates}
                      />
                    )}

                    {activeTab === 'calculators' && (
                      <CalculatorsModule 
                        calculatorsData={calculatorsData}
                        onUpdateData={updateCalculatorData}
                        accounts={accounts}
                        selectedMonth={selectedMonth}
                        monthsList={monthsList}
                        users={roomMembers}
                        roomStats={roomStats}
                        budgetTotals={budgetTotals}
                        isSingleMember={isSingleMember}
                        activeUserId={authUser?.uid}
                        isPrivacyMode={isPrivacyMode}
                        roomCurrency={roomCurrency}
                        rates={exchangeRates}
                      />
                    )}

                    {activeTab === 'ai_advisor' && (
                      <AIAdvisorTab 
                        roomStats={roomStats} 
                        budgetTotals={budgetTotals} 
                        accounts={accounts} 
                        selectedMonth={selectedMonth}
                        users={roomMembers}
                        isPrivacyMode={isPrivacyMode}
                        tasks={tasks}
                        onUpdateTasks={handleUpdateTasks}
                      />
                    )}

                    {activeTab === 'data_entry' && (
                      <DataEntryModule 
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        monthsList={monthsList}
                        onAddNewMonth={handleAddNewMonth}
                        onDeleteMonth={handleDeleteMonth}
                        activeRoomAccounts={accounts}
                        users={roomMembers}
                        activeUserId={authUser?.uid}
                        isSingleMember={isSingleMember}
                        handleAccountNameChange={handleAccountNameChange}
                        handleAccountCurrencyChange={handleAccountCurrencyChange}
                        handleAccountCategoryChange={handleAccountCategoryChange}
                        handleReorderAccount={handleReorderAccount}
                        handleMoveAccountToPosition={handleMoveAccountToPosition}
                        handleBalanceChange={handleBalanceChange}
                        handleRemoveAccountFromMonth={handleRemoveAccountFromMonth}
                        handleDeleteAccountCompletely={handleDeleteAccountCompletely}
                        handleAddAccount={onAddAccount}
                        setAccounts={setAccounts}
                        syncAccountToCloud={syncAccountToCloud}
                        handleToggleFlagAccount={handleToggleFlagAccount}
                        isPrivacyMode={isPrivacyMode}
                        roomCurrency={roomCurrency}
                        rates={exchangeRates}
                      />
                    )}

                    {activeTab === 'export' && (
                      <DataExport 
                        accounts={accounts} 
                        budget={budget} 
                        monthsList={monthsList} 
                        users={roomMembers}
                        syncAccountToCloud={syncAccountToCloud}
                        deleteAccountFromCloud={deleteAccountFromCloud}
                        syncBudgetToCloud={syncBudgetToCloud}
                        syncMonthsToCloud={syncMonthsToCloud}
                        setAccounts={setAccounts}
                        setBudget={setBudget}
                        setMonthsList={setMonthsList}
                        setSelectedPersonalUserId={setSelectedPersonalUserId}
                        authUser={authUser}
                        calculatorsData={calculatorsData}
                        setCalculatorsData={setCalculatorsData}
                        syncCalculatorsToCloud={syncCalculatorsToCloud}
                        tasks={tasks}
                        setTasks={setTasks}
                        syncTasksToCloud={syncTasksToCloud}
                        roomName={currentRoom?.name}
                        currentRoom={currentRoom}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        isPrivacyMode={isPrivacyMode}
                        isDarkMode={isDarkMode}
                      />
                    )}
                  </ErrorBoundary>
                </main>
              </div>


              {/* Room Settings Modal */}
              {showManageRoomModal && (
                <RoomSettingsModal
                  currentRoom={currentRoom}
                  authUser={authUser}
                  onClose={() => setShowManageRoomModal(false)}
                  onUpdateRoom={(updated) => setCurrentRoom(updated)}
                  onDeleteRoom={() => {
                    setCurrentRoom(null);
                    setShowManageRoomModal(false);
                  }}
                  onLeaveRoom={() => {
                    setCurrentRoom(null);
                    setShowManageRoomModal(false);
                  }}
                />
              )}
            </div>
          </FinancialDataProvider>
        </ToastProvider>
      </PrivacyContext.Provider>
    </ThemeContext.Provider>
  );
}
