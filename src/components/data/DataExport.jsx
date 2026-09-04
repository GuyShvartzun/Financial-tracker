import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { sortMonths } from '../../utils/calculations';

export default function DataExport({
  accounts,
  budget,
  monthsList,
  users = [],
  syncAccountToCloud,
  deleteAccountFromCloud,
  syncBudgetToCloud,
  syncMonthsToCloud,
  setAccounts,
  setBudget,
  setMonthsList,
  setSelectedPersonalUserId,
  authUser
}) {
  const [statusMsg, setStatusMsg] = useState('');

  // User Mapping Modal State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const [userMapping, setUserMapping] = useState({});
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const catToHeb = { short: 'טווח קצר', medium: 'טווח בינוני', long: 'טווח ארוך', liability: 'התחייבויות' };
  const hebToCat = { 
    'טווח קצר': 'short', 
    'טווח בינוני': 'medium', 
    'טווח ארוך': 'long', 
    'התחייבויות': 'liability',
    'התחייבות': 'liability',
    'short': 'short',
    'medium': 'medium',
    'long': 'long',
    'liability': 'liability'
  };

  const budgetToHeb = { incomes: 'הכנסה', fixedExpenses: 'הוצאה קבועה', variableExpenses: 'הוצאה משתנה', savings: 'חיסכון והשקעה' };
  const hebToBudget = { 'הכנסה': 'incomes', 'הוצאה קבועה': 'fixedExpenses', 'הוצאה משתנה': 'variableExpenses', 'חיסכון והשקעה': 'savings' };

  const extractRawOwner = (row) => {
    return String(
      row['שיוך למשתמש'] || 
      row['שיוך משתמש'] || 
      row['שם בעל החשבון'] || 
      row['בעל חשבון'] || 
      row['OwnerID'] || 
      row['ownerId'] || 
      row['owner'] || 
      row['user'] || 
      row['userId'] || 
      'משתמש ראשי'
    ).trim() || 'משתמש ראשי';
  };

  const handleExportXLSX = () => {
    try {
      const wb = XLSX.utils.book_new();

      const accountsExport = accounts.map(a => {
        const ownerMember = users.find(u => (u.uid || u.id) === a.ownerId);
        const ownerLabel = ownerMember ? `${ownerMember.displayName || ownerMember.name} (${a.ownerId})` : a.ownerId;
        const row = { 
          'סדר': a.order !== undefined ? a.order : 0,
          'שם החשבון': a.name, 
          'סוג החשבון': catToHeb[a.category] || a.category, 
          'שיוך למשתמש': a.ownerId,
          'שם בעל החשבון': ownerMember?.displayName || ownerMember?.name || ''
        };
        monthsList.forEach(m => { row[m] = a.balances[m] || 0; });
        return row;
      });
      const wsAccounts = XLSX.utils.json_to_sheet(accountsExport);
      XLSX.utils.book_append_sheet(wb, wsAccounts, "הון");

      const budgetExport = [];
      ['incomes', 'fixedExpenses', 'variableExpenses', 'savings'].forEach(cat => {
        (budget[cat] || []).forEach(item => {
          budgetExport.push({ 'שם החשבון': item.name, 'סוג החשבון': budgetToHeb[cat] || cat, 'סכום': item.amount });
        });
      });
      const wsBudget = XLSX.utils.json_to_sheet(budgetExport);
      XLSX.utils.book_append_sheet(wb, wsBudget, "תקציב");

      XLSX.writeFile(wb, `Financial_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setStatusMsg('קובץ הגיבוי יוצא בהצלחה!');
    } catch (err) {
      console.error(err);
      setStatusMsg('שגיאה ביצירת קובץ הגיבוי.');
    }
  };

  const handleExportJSON = () => {
    try {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        monthsList,
        accounts,
        budget
      };
      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Financial_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('קובץ JSON יוצא בהצלחה!');
    } catch (err) {
      console.error(err);
      setStatusMsg('שגיאה ביצירת קובץ JSON.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatusMsg('קורא את הקובץ...');
    const isJson = file.name.endsWith('.json') || file.type === 'application/json';

    const reader = new FileReader();
    if (isJson) {
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          processRawImportData(parsed.accounts || [], parsed.budget || null, parsed.monthsList || []);
        } catch (err) {
          console.error(err);
          setStatusMsg('שגיאה בפענוח קובץ ה-JSON. ודא שהמבנה תקין.');
        }
      };
      reader.readAsText(file);
    } else {
      // Excel or CSV
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });

          const accountsSheetName = workbook.SheetNames.find(n => n === 'הון' || n === 'Accounts' || n === 'accounts');
          const budgetSheetName = workbook.SheetNames.find(n => n === 'תקציב' || n === 'Budget' || n === 'budget');

          let accData = [];
          let budData = [];

          if (accountsSheetName) {
            accData = XLSX.utils.sheet_to_json(workbook.Sheets[accountsSheetName]);
          } else if (workbook.SheetNames.length > 0) {
            // fallback to first sheet if only one sheet
            accData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          }

          if (budgetSheetName) {
            budData = XLSX.utils.sheet_to_json(workbook.Sheets[budgetSheetName]);
          }

          processRawImportData(accData, budData, null);
        } catch (err) {
          console.error(err);
          setStatusMsg('שגיאה בקריאת הקובץ. ודא שהקובץ תקין ובפורמט Excel / CSV נתמך.');
        }
      };
      reader.readAsBinaryString(file);
    }

    // Reset input so user can re-upload if needed
    e.target.value = '';
  };

  // Step 1: Detect Owners & Prepare Smart Multi-User Mapping
  const processRawImportData = (rawAccounts, rawBudget, explicitMonths) => {
    let newMonths = explicitMonths || [];
    if (!newMonths.length && rawAccounts.length) {
      const monthSet = new Set();
      rawAccounts.forEach(row => {
        Object.keys(row).forEach(k => {
          if (/^\d{2}\/\d{4}$/.test(k)) monthSet.add(k);
        });
      });
      newMonths = sortMonths(Array.from(monthSet));
    }

    // Detect distinct owners in the accounts
    const ownerCounts = {};
    rawAccounts.forEach(row => {
      const rawOwner = extractRawOwner(row);
      ownerCounts[rawOwner] = (ownerCounts[rawOwner] || 0) + 1;
    });

    const distinctOwners = Object.keys(ownerCounts);

    // Smart Multi-User Guess Mapping
    const initialMapping = {};
    const usedMemberUids = new Set();

    // Step A: First pass - match exact or specific patterns
    distinctOwners.forEach((rawOwner) => {
      const rLower = rawOwner.toLowerCase();
      
      // 1. Direct match by UID, email, displayName, or name
      let foundMember = users.find(u => {
        const uUid = (u.uid || u.id || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uName = (u.displayName || u.name || '').toLowerCase();
        if (uUid && uUid === rLower) return true;
        if (uEmail && uEmail === rLower) return true;
        if (uName && (uName === rLower || (uName.length > 2 && rLower.includes(uName)) || (rLower.length > 2 && uName.includes(rLower)))) return true;
        return false;
      });

      // 2. Pattern match for Admin / User 1
      if (!foundMember && (
        rLower === 'u1' || rLower === 'user1' || rLower === '1' || 
        rLower.includes('ראשי') || rLower.includes('אדמין') || rLower.includes('admin') || rLower.includes('owner')
      )) {
        foundMember = users[0];
      }

      // 3. Pattern match for Partner / User 2
      if (!foundMember && (
        rLower === 'u2' || rLower === 'user2' || rLower === '2' || 
        rLower.includes('משני') || rLower.includes('בן זוג') || rLower.includes('בת זוג') || rLower.includes('partner') || rLower.includes('member')
      )) {
        foundMember = users[1] || users[0];
      }

      if (foundMember) {
        const targetUid = foundMember.uid || foundMember.id;
        initialMapping[rawOwner] = targetUid;
        usedMemberUids.add(targetUid);
      }
    });

    // Step B: Second pass - for any remaining unmapped owners, distribute positionally to unused room members
    distinctOwners.forEach((rawOwner, idx) => {
      if (!initialMapping[rawOwner]) {
        // Find an unused room member if available
        const unusedMember = users.find(u => !usedMemberUids.has(u.uid || u.id));
        if (unusedMember) {
          const targetUid = unusedMember.uid || unusedMember.id;
          initialMapping[rawOwner] = targetUid;
          usedMemberUids.add(targetUid);
        } else {
          // Fallback to user by index or first user
          const fallbackUser = users[idx] || users[0];
          initialMapping[rawOwner] = fallbackUser ? (fallbackUser.uid || fallbackUser.id) : '';
        }
      }
    });

    setPendingImportData({
      rawAccounts,
      rawBudget,
      newMonths,
      ownerCounts,
      distinctOwners
    });
    setUserMapping(initialMapping);
    setShowMappingModal(true);
    setStatusMsg('');
  };

  // Step 2: Confirm Mapping & Sync to Cloud & State
  const handleConfirmImport = async () => {
    if (!pendingImportData) return;

    setIsProcessingImport(true);
    try {
      const { rawAccounts, rawBudget, newMonths } = pendingImportData;
      const validUids = new Set(users.map(u => u.uid || u.id));
      const defaultAdminUid = users[0]?.uid || users[0]?.id || '';

      // 1. Transform accounts with mapped real UIDs
      const newAccounts = rawAccounts.map((row, idx) => {
        const rawOwner = extractRawOwner(row);
        let resolvedUid = userMapping[rawOwner];

        // Ensure resolvedUid is strictly a valid UID of a room member
        if (!resolvedUid || !validUids.has(resolvedUid)) {
          resolvedUid = defaultAdminUid;
        }

        const balances = {};
        if (newMonths && newMonths.length > 0) {
          newMonths.forEach(m => {
            balances[m] = parseFloat(row[m]) || 0;
          });
        } else if (row.balances) {
          Object.assign(balances, row.balances);
        }

        const explicitOrder = row['סדר'] !== undefined ? Number(row['סדר']) : (row.order !== undefined ? Number(row.order) : idx);

        return {
          id: 'acc_' + Date.now() + Math.random().toString(36).substr(2, 9),
          name: row['שם החשבון'] || row['Name'] || row.name || 'חשבון מיובא',
          category: hebToCat[row['סוג החשבון']] || row['סוג החשבון'] || row.category || 'short',
          ownerId: resolvedUid,
          order: isNaN(explicitOrder) ? idx : explicitOrder,
          balances
        };
      });

      // 2. Transform Budget if provided
      let formattedBudget = null;
      if (rawBudget) {
        if (Array.isArray(rawBudget)) {
          formattedBudget = { incomes: [], fixedExpenses: [], variableExpenses: [], savings: [] };
          rawBudget.forEach(row => {
            const bCat = hebToBudget[row['סוג החשבון']] || row['סוג החשבון'];
            if (bCat && formattedBudget[bCat]) {
              formattedBudget[bCat].push({
                id: 'item_' + Date.now() + Math.random().toString(36).substr(2, 9),
                name: row['שם החשבון'] || row['Name'] || row.name || 'סעיף מיובא',
                amount: parseFloat(row['סכום'] || row['Amount'] || row.amount) || 0
              });
            }
          });
        } else if (typeof rawBudget === 'object') {
          formattedBudget = rawBudget;
        }
      }

      // 3. Immediately update local React state for instantaneous UI response
      if (setAccounts) {
        setAccounts(newAccounts);
      }
      if (newMonths && newMonths.length > 0 && setMonthsList) {
        setMonthsList(newMonths);
      }
      if (formattedBudget && setBudget) {
        setBudget(formattedBudget);
      }
      if (setSelectedPersonalUserId && authUser) {
        setSelectedPersonalUserId(authUser.uid);
      }

      // 4. Sync Months to Cloud
      if (newMonths && newMonths.length > 0) {
        await syncMonthsToCloud(newMonths);
      }

      // 5. Clear old accounts & upload new accounts in parallel
      await Promise.all(accounts.map(acc => deleteAccountFromCloud(acc.id)));
      await Promise.all(newAccounts.map(acc => syncAccountToCloud(acc)));

      // 6. Sync Budget to Cloud
      if (formattedBudget) {
        await syncBudgetToCloud(formattedBudget);
      }

      setStatusMsg(`הייבוא הושלם בהצלחה! ${newAccounts.length} חשבונות הומרו, שויכו לחברי החדר וסונכרנו מיידית.`);
      setShowMappingModal(false);
      setPendingImportData(null);
    } catch (err) {
      console.error('Error during import:', err);
      setStatusMsg('שגיאה במהלך ייבוא וסנכרון הנתונים.');
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-6 rounded-2xl space-y-6 shadow-xs max-w-2xl mx-auto font-['Calibri',sans-serif] dir-rtl text-right" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-stone-900">ייצוא, גיבוי וייבוא נתונים</h2>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          הנתונים שלכם מסונכרנים בזמן אמת בחדר הענן. מומלץ להוריד קובץ גיבוי תקופתי.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-xl text-xs font-bold text-center">
          {statusMsg}
        </div>
      )}

      {/* Export Section */}
      <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#E8E2D8] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-xl flex items-center justify-center text-xl font-black">
            📊
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">ייצוא נתונים מלא</h3>
            <p className="text-xs text-stone-500">הורד גיבוי מלא של החשבונות, היתרות והתקציב</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleExportXLSX}
            className="flex-1 py-3 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>הורד קובץ Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex-1 py-3 bg-[#FFFFFF] hover:bg-stone-50 text-stone-700 border border-[#DDD6CA] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>הורד קובץ JSON</span>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#E8E2D8] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] rounded-xl flex items-center justify-center text-xl font-black">
            📥
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">ייבוא נתונים מקובץ (Excel / CSV / JSON)</h3>
            <p className="text-xs text-stone-500">
              העלה קובץ נתונים. במקרה של מזהי משתמש ישנים (כגון u1/u2), יפתח שלב מיפוי לחברי החדר.
            </p>
          </div>
        </div>

        <input 
          type="file" 
          accept=".xlsx, .xls, .csv, .json" 
          onChange={handleFileSelect} 
          className="hidden" 
          id="data-file-upload" 
        />
        <label 
          htmlFor="data-file-upload" 
          className="block w-full py-4 text-center bg-[#FFFFFF] hover:bg-[#F2ECE1] text-stone-700 border-2 border-dashed border-[#DDD6CA] font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          📁 לחץ כאן לבחירת קובץ Excel, CSV או JSON לייבוא
        </label>
      </div>

      {/* User Mapping Modal (Step 2 of Import) */}
      {showMappingModal && pendingImportData && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E2D8] max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <h3 className="text-lg font-black text-stone-900">שלב מיפוי משתמשים לייבוא</h3>
                  <span className="text-xs text-stone-500">התאמת בעלי חשבונות מהקובץ לחברי החדר הנוכחי</span>
                </div>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8] text-xs text-stone-600 space-y-1">
              <p className="font-bold text-stone-800">
                בקובץ שנטען נמצאו החשבונות הבאים.
              </p>
              <p>
                בחר עבור כל בעל חשבון מהקובץ לאיזה חבר מהחדר לשייך את נכסיו:
              </p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {pendingImportData.distinctOwners.map((rawOwner) => {
                const count = pendingImportData.ownerCounts[rawOwner] || 0;
                return (
                  <div key={rawOwner} className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">
                        בעל חשבון בקובץ: <span className="text-[#2E7D32] font-black">{rawOwner}</span>
                      </span>
                      <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                        {count} חשבונות
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-500 font-bold block">
                        שייך לחבר בחדר הנוכחי:
                      </label>
                      <select
                        value={userMapping[rawOwner] || ''}
                        onChange={(e) => setUserMapping({ ...userMapping, [rawOwner]: e.target.value })}
                        className="w-full bg-white border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#4A90E2] cursor-pointer"
                      >
                        {users.map(u => {
                          const uUid = u.uid || u.id;
                          const uName = u.displayName || u.name;
                          return (
                            <option key={uUid} value={uUid}>
                              {uName} ({u.email || uUid})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-[#E8E2D8]">
              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl border border-[#DDD6CA] transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessingImport}
                className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>{isProcessingImport ? 'מייבא ומסנכרן...' : 'אשר ייבוא ושיוך נתונים'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
