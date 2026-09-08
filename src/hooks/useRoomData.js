import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  DEFAULT_MONTHS, 
  INITIAL_ACCOUNTS, 
  DEFAULT_BUDGET, 
  DEFAULT_CALCULATORS_DATA,
  DEFAULT_TASKS 
} from '../constants/initialData';
import { sortMonths, sortAccountsByDataEntryOrder } from '../utils/calculations';
import { normalizeCurrencyCode } from '../utils/formatters';
import { 
  getRoomCryptoKey, 
  encryptAccountForCloud, 
  decryptAccountFromCloud, 
  encryptSettingsForCloud, 
  decryptSettingsFromCloud 
} from '../utils/crypto';

export function useRoomData(currentRoom, authUser, selectedMonth, setSelectedMonth) {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [monthsList, setMonthsList] = useState(DEFAULT_MONTHS);
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

  // Room Cryptographic Key Management (AES-GCM 256-bit with PBKDF2)
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

  // Sync active room data (accounts, budget, months, calculators, tasks) with transparent client-side decryption
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
          snapshot.docs.map(async d => {
            const acc = await decryptAccountFromCloud({ id: d.id, ...d.data() }, key);
            return { ...acc, currency: normalizeCurrencyCode(acc.currency) };
          })
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
          if (selectedMonth && !sorted.includes(selectedMonth) && setSelectedMonth) {
            setSelectedMonth(sorted[sorted.length - 1]);
          }
        }
      } else {
        setMonthsList(DEFAULT_MONTHS);
        if (setSelectedMonth) setSelectedMonth(DEFAULT_MONTHS[0]);
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
      unsubAccounts();
      unsubBudget();
      unsubMonths();
      unsubCalcs();
      unsubTasks();
    };
  }, [currentRoom?.id, authUser]);

  // Cloud mutation functions
  const syncAccountToCloud = useCallback(async (account) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptAccountForCloud(account, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'accounts', account.id), cloudDoc); 
      } catch (e) {
        console.error("Error syncing account to cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const deleteAccountFromCloud = useCallback(async (accId) => {
    if (db && authUser && currentRoom) {
      try { 
        await deleteDoc(doc(db, 'rooms', currentRoom.id, 'accounts', accId)); 
      } catch (e) {
        console.error("Error deleting account from cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const syncBudgetToCloud = useCallback(async (newBudget) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud(newBudget, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'budget'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing budget to cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const syncMonthsToCloud = useCallback(async (newMonthsList) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ monthsList: newMonthsList }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'months'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing months to cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const syncCalculatorsToCloud = useCallback(async (newData) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ data: newData }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'calculators'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing calculators to cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const syncTasksToCloud = useCallback(async (newTasks) => {
    if (db && authUser && currentRoom) {
      try { 
        const key = roomCryptoKeyRef.current || (await getRoomCryptoKey(currentRoom.id));
        const cloudDoc = await encryptSettingsForCloud({ tasks: newTasks }, key);
        await setDoc(doc(db, 'rooms', currentRoom.id, 'settings', 'tasks'), cloudDoc); 
      } catch (e) {
        console.error("Error syncing tasks to cloud:", e);
      }
    }
  }, [authUser, currentRoom]);

  const handleUpdateTasks = useCallback((newTasksOrUpdater) => {
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
  }, [currentRoom?.id, syncTasksToCloud]);

  // Account modification helpers
  const handleBalanceChange = useCallback((accId, month, value) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedAcc = { ...a, balances: { ...a.balances, [month]: value } };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  }, [syncAccountToCloud]);

  const handleAccountNameChange = useCallback((accId, name) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedAcc = { ...a, name };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  }, [syncAccountToCloud]);

  const handleAccountCurrencyChange = useCallback((accId, newCurrency) => {
    const normalized = normalizeCurrencyCode(newCurrency);
    setAccounts(prev => prev.map(a => {
      if (a.id === accId) {
        const updatedAcc = { ...a, currency: normalized };
        syncAccountToCloud(updatedAcc);
        return updatedAcc;
      }
      return a;
    }));
  }, [syncAccountToCloud]);

  const handleAccountCategoryChange = useCallback((accId, newCategory) => {
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
  }, [syncAccountToCloud]);

  const handleReorderAccount = useCallback((accId, direction, targetOwnerId) => {
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
  }, [syncAccountToCloud]);

  const handleMoveAccountToPosition = useCallback((accId, targetCategory, targetIndex, targetOwnerId) => {
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
  }, [syncAccountToCloud]);

  const handleAddAccount = useCallback((category, targetOwnerId, activeMonth, defaultOwner) => {
    const owner = targetOwnerId || defaultOwner || 'default_user';
    setAccounts(prev => {
      const catAccounts = prev.filter(a => a.category === category && (!owner || a.ownerId === owner));
      const maxOrder = catAccounts.reduce((max, a) => Math.max(max, a.order ?? 0), -1);

      const newAcc = {
        id: 'acc_' + Date.now(),
        ownerId: owner,
        category,
        name: 'חשבון חדש',
        balances: { [activeMonth]: 0 },
        order: maxOrder + 1
      };
      syncAccountToCloud(newAcc);
      return sortAccountsByDataEntryOrder([...prev, newAcc]);
    });
  }, [syncAccountToCloud]);

  const handleRemoveAccountFromMonth = useCallback((accId, month) => {
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
  }, [syncAccountToCloud]);

  const handleDeleteAccountCompletely = useCallback((accId) => {
    setAccounts(prev => prev.filter(a => a.id !== accId));
    deleteAccountFromCloud(accId);
  }, [deleteAccountFromCloud]);

  const handleDeleteMonth = useCallback((monthToDelete) => {
    if (monthsList.length <= 1) return;
    const newMonths = monthsList.filter(m => m !== monthToDelete);
    setMonthsList(newMonths);
    syncMonthsToCloud(newMonths);

    if (selectedMonth === monthToDelete && setSelectedMonth) {
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
  }, [monthsList, selectedMonth, setSelectedMonth, syncMonthsToCloud, syncAccountToCloud]);

  const handleToggleFlagAccount = useCallback((accId, month) => {
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
  }, [syncAccountToCloud]);

  const handleAddNewMonth = useCallback((newMonthName) => {
    if (!newMonthName || monthsList.includes(newMonthName)) return;
    const latestMonth = monthsList[monthsList.length - 1];
    const newMonths = sortMonths([...monthsList, newMonthName]);
    
    setMonthsList(newMonths);
    if (setSelectedMonth) {
      setSelectedMonth(newMonths[newMonths.length - 1]);
    }
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
  }, [monthsList, setSelectedMonth, syncMonthsToCloud, syncAccountToCloud]);

  const updateCalculatorData = useCallback((module, newData) => {
    setCalculatorsData(prev => {
      const updated = { ...prev, [module]: newData };
      syncCalculatorsToCloud(updated);
      return updated;
    });
  }, [syncCalculatorsToCloud]);

  return {
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
    roomCryptoKey,
    // Mutations
    syncAccountToCloud,
    deleteAccountFromCloud,
    syncBudgetToCloud,
    syncMonthsToCloud,
    syncCalculatorsToCloud,
    syncTasksToCloud,
    handleUpdateTasks,
    // Account actions
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
  };
}
