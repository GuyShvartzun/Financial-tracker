import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';

import { auth, db, googleProvider } from './config/firebase';
import { 
  DEFAULT_MONTHS, 
  INITIAL_ACCOUNTS, 
  DEFAULT_BUDGET, 
  DEFAULT_CALCULATORS_DATA,
  DEFAULT_TASKS 
} from './constants/initialData';
import { getAccountTotalsForMonth, sortMonths, sortAccountsByDataEntryOrder } from './utils/calculations';
import { 
  getRoomCryptoKey, 
  encryptAccountForCloud, 
  decryptAccountFromCloud, 
  encryptSettingsForCloud, 
  decryptSettingsFromCloud 
} from './utils/crypto';

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
import { PrivacyContext } from './context/PrivacyContext';
import { ThemeContext } from './context/ThemeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState('shared');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Rooms & Lobby
  const [userRooms, setUserRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showManageRoomModal, setShowManageRoomModal] = useState(false);

  // Active Room Financial Data
  const [selectedPersonalUserId, setSelectedPersonalUserId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('08/2026');
  const [monthsList, setMonthsList] = useState(DEFAULT_MONTHS);
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [calculatorsData, setCalculatorsData] = useState(DEFAULT_CALCULATORS_DATA);
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('fin_tracker_tasks_local');
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });
  const [isCloudSynced, setIsCloudSynced] = useState(false);

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

  // Global Keyboard Shortcuts (P: Privacy Mode, D: Dark Mode, Esc: Close Modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        setShowManageRoomModal(false);
        return;
      }

      if (isInput) return;

      if (e.key === 'p' || e.key === 'P' || e.key === 'פ') {
        e.preventDefault();
        setIsPrivacyMode(prev => !prev);
      }

      if (e.key === 'd' || e.key === 'D' || e.key === 'ג') {
        e.preventDefault();
        setIsDarkMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Dynamic User Session via Google Auth
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const userData = {
          uid: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email.toLowerCase(),
          photoURL: user.photoURL || '',
          lastLogin: new Date().toISOString()
        };
        setAuthUser(userData);

        // Save / update in Firestore users/{user.uid}
        if (db) {
          try {
            await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
          } catch (err) {
            console.warn("User profile sync notice:", err);
          }
        }
      } else {
        setAuthUser(null);
        setCurrentRoom(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Query Rooms where current user is authorized (memberEmails contains authUser.email)
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

  // 3. Auto-link UID & photoURL if member was invited by email prior to login
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

  // 4. Default personal user selection when room loads
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

  // 5. Room Cryptographic Key Management (AES-GCM 256-bit with PBKDF2)
  const roomCryptoKeyRef = useRef(null);
  const [roomCryptoKey, setRoomCryptoKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!currentRoom?.id) {
      roomCryptoKeyRef.current = null;
      setRoomCryptoKey(null);
      return;
    }

    getRoomCryptoKey(currentRoom.id).then((key) => {
      if (isMounted) {
        roomCryptoKeyRef.current = key;
        setRoomCryptoKey(key);
      }
    }).catch((err) => {
      console.error("Could not derive room crypto key:", err);
    });

    return () => { isMounted = false; };
  }, [currentRoom?.id]);

  // 6. Sync active room data (accounts, budget, months, calculators) with transparent client-side decryption
  useEffect(() => {
    if (!currentRoom || !authUser || !db) {
      setAccounts(INITIAL_ACCOUNTS);
      setBudget(DEFAULT_BUDGET);
      setMonthsList(DEFAULT_MONTHS);
      setCalculatorsData(DEFAULT_CALCULATORS_DATA);
      setIsCloudSynced(false);
      return;
    }

    const roomId = currentRoom.id;

    // Accounts
    const accountsRef = collection(db, 'rooms', roomId, 'accounts');
    const unsubAccounts = onSnapshot(accountsRef, async (snapshot) => {
      if (!snapshot.empty) {
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(roomId));
        const cloudAccs = await Promise.all(
          snapshot.docs.map(d => decryptAccountFromCloud({ id: d.id, ...d.data() }, key))
        );
        const sortedAccs = sortAccountsByDataEntryOrder(cloudAccs);
        setAccounts(sortedAccs);
        setIsCloudSynced(true);
      } else {
        setAccounts([]);
      }
    }, (err) => console.warn("Firestore accounts sync notice:", err));

    // Budget
    const budgetDocRef = doc(db, 'rooms', roomId, 'settings', 'budget');
    const unsubBudget = onSnapshot(budgetDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(roomId));
        const decrypted = await decryptSettingsFromCloud(docSnap.data(), key);
        setBudget(decrypted || DEFAULT_BUDGET);
      } else {
        setBudget(DEFAULT_BUDGET);
      }
    }, (err) => console.warn("Firestore budget sync notice:", err));

    // Months
    const monthsDocRef = doc(db, 'rooms', roomId, 'settings', 'months');
    const unsubMonths = onSnapshot(monthsDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(roomId));
        const decrypted = await decryptSettingsFromCloud(docSnap.data(), key);
        if (decrypted && decrypted.monthsList) {
          const sorted = sortMonths(decrypted.monthsList);
          setMonthsList(sorted);
          if (!sorted.includes(selectedMonth)) {
            setSelectedMonth(sorted[sorted.length - 1]);
          }
        }
      } else {
        setMonthsList(DEFAULT_MONTHS);
        setSelectedMonth(DEFAULT_MONTHS[0]);
      }
    }, (err) => console.warn("Firestore months sync notice:", err));

    // Calculators
    const calcsDocRef = doc(db, 'rooms', roomId, 'settings', 'calculators');
    const unsubCalcs = onSnapshot(calcsDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(roomId));
        const decrypted = await decryptSettingsFromCloud(docSnap.data(), key);
        if (decrypted && decrypted.data) {
          setCalculatorsData(decrypted.data);
        }
      } else {
        setCalculatorsData(DEFAULT_CALCULATORS_DATA);
      }
    }, (err) => console.warn("Firestore calcs sync notice:", err));

    // Tasks
    const tasksDocRef = doc(db, 'rooms', roomId, 'settings', 'tasks');
    const unsubTasks = onSnapshot(tasksDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(roomId));
        const decrypted = await decryptSettingsFromCloud(docSnap.data(), key);
        if (decrypted && Array.isArray(decrypted.tasks)) {
          setTasks(decrypted.tasks);
        }
      } else {
        try {
          const roomSaved = localStorage.getItem(`fin_tracker_tasks_${roomId}`);
          setTasks(roomSaved ? JSON.parse(roomSaved) : DEFAULT_TASKS);
        } catch {
          setTasks(DEFAULT_TASKS);
        }
      }
    }, (err) => console.warn("Firestore tasks sync notice:", err));

    return () => {
      unsubAccounts(); unsubBudget(); unsubMonths(); unsubCalcs(); unsubTasks();
    };
  }, [currentRoom?.id, authUser]);

  // Cloud Write Functions Scoped to Active Room with Client-Side Encryption
  const syncAccountToCloud = async (account) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptAccountForCloud(account, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'accounts', account.id), cloudDoc); 
      } catch (e) {
        console.error("Error syncing account to cloud:", e);
      }
    }
  };

  const deleteAccountFromCloud = async (accId) => {
    if (db && authUser && currentRoom) {
      try { 
        await deleteDoc(doc(db, 'rooms', currentRoom.id, 'accounts', accId)); 
      } catch (e) {
        console.error("Error deleting account from cloud:", e);
      }
    }
  };

  const syncBudgetToCloud = async (newBudget) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud(newBudget, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'budget'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing budget to cloud:", e);
      }
    }
  };

  const syncMonthsToCloud = async (newMonthsList) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ monthsList: newMonthsList }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'months'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing months to cloud:", e);
      }
    }
  };

  const syncCalculatorsToCloud = async (newData) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ data: newData }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'calculators'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing calculators to cloud:", e);
      }
    }
  };

  const syncTasksToCloud = async (newTasks) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ tasks: newTasks }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'tasks'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing tasks to cloud:", e);
      }
    }
  };

  const handleUpdateTasks = (newTasksOrUpdater) => {
    setTasks(prev => {
      const updated = typeof newTasksOrUpdater === 'function' ? newTasksOrUpdater(prev) : newTasksOrUpdater;
      try {
        const key = currentRoom?.id ? `fin_tracker_tasks_${currentRoom.id}` : 'fin_tracker_tasks_local';
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not persist tasks to localStorage:", e);
      }
      syncTasksToCloud(updated);
      return updated;
    });
  };

  const loginWithGoogle = async () => {
    if (!auth) return;
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logoutGoogle = async () => {
    if (!auth) return;
    try { 
      await signOut(auth); 
      setCurrentRoom(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const roomMembers = (currentRoom?.members || []).map(m => ({
    ...m,
    id: m.uid || m.id,
    uid: m.uid || m.id,
    displayName: m.displayName || m.name,
    name: m.displayName || m.name
  }));

  const isSingleMember = roomMembers.length <= 1;

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
  }, [roomMembers, accounts]);

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

  const handleRemoveAccountFromMonth = (accId, month) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedBalances = { ...a.balances };
        delete updatedBalances[month];
        const updatedAcc = { ...a, balances: updatedBalances };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  };

  const handleDeleteAccountCompletely = (accId) => {
    setAccounts(prev => prev.filter(a => a.id !== accId));
    deleteAccountFromCloud(accId);
  };

  const handleDeleteMonth = (monthToDelete) => {
    if (monthsList.length <= 1) return;
    const newMonths = monthsList.filter(m => m !== monthToDelete);
    setMonthsList(newMonths);
    syncMonthsToCloud(newMonths);

    if (selectedMonth === monthToDelete) {
      setSelectedMonth(newMonths[newMonths.length - 1]);
    }
    setAccounts(prev => prev.map(a => {
      const updatedBalances = { ...a.balances };
      delete updatedBalances[monthToDelete];
      const updatedFlagged = { ...(a.flaggedMonths || {}) };
      delete updatedFlagged[monthToDelete];
      const updatedAcc = { ...a, balances: updatedBalances, flaggedMonths: updatedFlagged };
      syncAccountToCloud(updatedAcc);
      return updatedAcc;
    }));
  };

  const handleToggleFlagAccount = (accId, month) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const currentFlagged = a.flaggedMonths || {};
        const isFlagged = Boolean(currentFlagged[month]);
        const updatedFlagged = { ...currentFlagged };
        if (isFlagged) {
          delete updatedFlagged[month];
        } else {
          updatedFlagged[month] = true;
        }
        const updatedAcc = { ...a, flaggedMonths: updatedFlagged };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  };

  const handleBalanceChange = (accId, month, value) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedAcc = { ...a, balances: { ...a.balances, [month]: value } };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  };

  const handleAccountNameChange = (accId, name) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedAcc = { ...a, name };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  };

  const handleAccountCategoryChange = (accId, newCategory) => {
    setAccounts(prev => {
      const targetAcc = prev.find(a => a.id === accId);
      if (!targetAcc || targetAcc.category === newCategory) return prev;
      
      const newCategoryAccs = prev.filter(a => a.category === newCategory);
      const maxOrder = newCategoryAccs.reduce((max, a) => Math.max(max, a.order ?? 0), -1);
      
      const updated = { ...targetAcc, category: newCategory, order: maxOrder + 1 };
      syncAccountToCloud(updated);
      
      const newAccs = prev.map(a => a.id === accId ? updated : a);
      return sortAccountsByDataEntryOrder(newAccs);
    });
  };

  const handleReorderAccount = (accId, direction, targetOwnerId) => {
    setAccounts(prev => {
      const targetAcc = prev.find(a => a.id === accId);
      if (!targetAcc) return prev;

      const owner = targetOwnerId || targetAcc.ownerId;
      const catAccs = prev
        .filter(a => a.category === targetAcc.category && (!owner || a.ownerId === owner))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const idx = catAccs.findIndex(a => a.id === accId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === catAccs.length - 1) return prev;

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const otherAcc = catAccs[swapIdx];

      const newCatAccs = [...catAccs];
      newCatAccs[idx] = otherAcc;
      newCatAccs[swapIdx] = targetAcc;

      const updatedMap = new Map();
      newCatAccs.forEach((a, i) => {
        const updated = { ...a, order: i };
        syncAccountToCloud(updated);
        updatedMap.set(a.id, updated);
      });

      const newAccounts = prev.map(a => updatedMap.get(a.id) || a);
      return sortAccountsByDataEntryOrder(newAccounts);
    });
  };

  const handleMoveAccountToPosition = (accId, targetCategory, targetIndex, targetOwnerId) => {
    setAccounts(prev => {
      const targetAcc = prev.find(a => a.id === accId);
      if (!targetAcc) return prev;

      const owner = targetOwnerId || targetAcc.ownerId;
      const isSameCategory = targetAcc.category === targetCategory;
      const targetCatAccs = prev
        .filter(a => a.category === targetCategory && (!owner || a.ownerId === owner) && a.id !== accId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const validIndex = Math.max(0, Math.min(targetIndex, targetCatAccs.length));
      targetCatAccs.splice(validIndex, 0, { ...targetAcc, category: targetCategory });

      const updatedCategoryAccs = targetCatAccs.map((a, idx) => {
        const updated = { ...a, order: idx };
        syncAccountToCloud(updated);
        return updated;
      });

      let updatedPrevCatAccs = [];
      if (!isSameCategory) {
        const prevCatAccs = prev
          .filter(a => a.category === targetAcc.category && (!owner || a.ownerId === owner) && a.id !== accId)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        updatedPrevCatAccs = prevCatAccs.map((a, idx) => {
          const updated = { ...a, order: idx };
          syncAccountToCloud(updated);
          return updated;
        });
      }

      const updatedMap = new Map();
      updatedCategoryAccs.forEach(a => updatedMap.set(a.id, a));
      updatedPrevCatAccs.forEach(a => updatedMap.set(a.id, a));

      const updatedAccounts = prev.map(a => updatedMap.get(a.id) || a);
      return sortAccountsByDataEntryOrder(updatedAccounts);
    });
  };

  const handleAddAccount = (category, targetOwnerId) => {
    const owner = targetOwnerId || authUser?.uid || roomMembers[0]?.uid || 'default_user';
    const catAccounts = accounts.filter(a => a.category === category && (!owner || a.ownerId === owner));
    const maxOrder = catAccounts.reduce((max, a) => Math.max(max, a.order ?? 0), -1);

    const newAcc = {
      id: 'acc_' + Date.now(),
      ownerId: owner,
      category,
      name: 'חשבון חדש',
      balances: { [selectedMonth]: 0 },
      order: maxOrder + 1
    };
    setAccounts(prev => sortAccountsByDataEntryOrder([...prev, newAcc]));
    syncAccountToCloud(newAcc);
  };

  const handleAddNewMonth = (newMonthName) => {
    if (!newMonthName || monthsList.includes(newMonthName)) return;
    const latestMonth = monthsList[monthsList.length - 1];
    const newMonths = sortMonths([...monthsList, newMonthName]);
    
    setMonthsList(newMonths);
    setSelectedMonth(newMonths[newMonths.length - 1]);
    syncMonthsToCloud(newMonths);

    setAccounts(prev => prev.map(a => {
      const updatedAcc = {
        ...a,
        balances: {
          ...a.balances,
          [newMonthName]: latestMonth ? (a.balances[latestMonth] ?? 0) : 0
        }
      };
      syncAccountToCloud(updatedAcc);
      return updatedAcc;
    }));
  };

  const updateCalculatorData = (module, newData) => {
    const updated = { ...calculatorsData, [module]: newData };
    setCalculatorsData(updated);
    syncCalculatorsToCloud(updated);
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-stone-600 font-bold text-sm">טוען נתונים...</p>
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
              handleAccountCategoryChange={handleAccountCategoryChange}
              handleReorderAccount={handleReorderAccount}
              handleMoveAccountToPosition={handleMoveAccountToPosition}
              handleBalanceChange={handleBalanceChange}
              handleRemoveAccountFromMonth={handleRemoveAccountFromMonth}
              handleDeleteAccountCompletely={handleDeleteAccountCompletely}
              handleAddAccount={handleAddAccount}
              setAccounts={setAccounts}
              syncAccountToCloud={syncAccountToCloud}
              handleToggleFlagAccount={handleToggleFlagAccount}
              isPrivacyMode={isPrivacyMode}
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
            />
          )}
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
    </PrivacyContext.Provider>
    </ThemeContext.Provider>
  );
}
