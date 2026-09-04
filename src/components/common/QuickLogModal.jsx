import React, { useState, useEffect, useRef } from 'react';
import { X, PlusCircle, CheckCircle2, Wallet, Receipt, Sparkles } from 'lucide-react';
import { fmtILS } from '../../utils/formatters';

export default function QuickLogModal({
  isOpen,
  onClose,
  accounts = [],
  selectedMonth,
  onUpdateAccountBalance,
  budget,
  onUpdateBudget,
  users = [],
  activeUserId = '',
  isSingleMember = false
}) {
  const [activeMode, setActiveMode] = useState('balance'); // 'balance' | 'budget'
  const [selectedAccId, setSelectedAccId] = useState('');
  const [newBalance, setNewBalance] = useState('');
  
  // Budget Form State
  const [budgetCategory, setBudgetCategory] = useState('variableExpenses');
  const [budgetItemName, setBudgetItemName] = useState('');
  const [budgetItemAmount, setBudgetItemAmount] = useState('');
  
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeMode]);

  // Set default account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccId) {
      setSelectedAccId(accounts[0].id);
    }
  }, [accounts, selectedAccId]);

  // Update balance field when account changes
  useEffect(() => {
    if (selectedAccId) {
      const acc = accounts.find(a => a.id === selectedAccId);
      if (acc) {
        setNewBalance(acc.balances?.[selectedMonth] !== undefined ? String(acc.balances[selectedMonth]) : '');
      }
    }
  }, [selectedAccId, selectedMonth, accounts]);

  if (!isOpen) return null;

  const currentAcc = accounts.find(a => a.id === selectedAccId);

  const handleSaveBalance = (e) => {
    e.preventDefault();
    if (!selectedAccId) return;
    const num = parseFloat(newBalance) || 0;
    onUpdateAccountBalance(selectedAccId, selectedMonth, num);
    setSuccessMessage(`היתרה בחשבון "${currentAcc?.name}" עודכנה ל-${fmtILS(num)}!`);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 900);
  };

  const handleAddBudgetItem = (e) => {
    e.preventDefault();
    const name = budgetItemName.trim();
    const amount = parseFloat(budgetItemAmount);
    if (!name || isNaN(amount) || amount <= 0) return;

    const newItem = {
      id: 'b_' + Date.now(),
      name,
      amount
    };

    const currentList = budget?.[budgetCategory] || [];
    const updated = {
      ...budget,
      [budgetCategory]: [...currentList, newItem]
    };

    onUpdateBudget(updated);
    setSuccessMessage(`הסעיף "${name}" (${fmtILS(amount)}) נוסף בהצלחה לתקציב!`);
    setBudgetItemName('');
    setBudgetItemAmount('');
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 900);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs font-sans text-right dir-rtl animate-fadeIn"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="חלון הזנה מהירה"
    >
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all transform scale-100">
        
        {/* Header */}
        <div className="bg-[#FAF7F2] border-b border-[#E8E2D8] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center font-bold shadow-2xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm sm:text-base">הזנה מהירה</h3>
              <p className="text-[11px] text-stone-500">חודש נבחר: <strong className="text-stone-800">{selectedMonth}</strong></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור חלון"
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 pb-2">
          <div className="grid grid-cols-2 gap-2 bg-[#FAF7F2] p-1 rounded-2xl border border-[#E8E2D8]">
            <button
              type="button"
              onClick={() => setActiveMode('balance')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === 'balance'
                  ? 'bg-white text-[#2E7D32] border border-[#C8E6C9] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>עדכון יתרת חשבון</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('budget')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === 'budget'
                  ? 'bg-white text-[#2E7D32] border border-[#C8E6C9] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 border-transparent'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>הוספה לתקציב</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 pt-2">
          {successMessage ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-stone-800">{successMessage}</p>
            </div>
          ) : activeMode === 'balance' ? (
            <form onSubmit={handleSaveBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  בחר חשבון לעדכון:
                </label>
                <select
                  value={selectedAccId}
                  onChange={(e) => setSelectedAccId(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] cursor-pointer"
                >
                  {accounts.map(acc => {
                    const catLabel = acc.category === 'short' ? 'טווח קצר'
                      : acc.category === 'medium' ? 'טווח בינוני'
                      : acc.category === 'long' ? 'טווח ארוך' : 'התחייבות';
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({catLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  יתרה מעודכנת ל-{selectedMonth} (₪):
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="הזן יתרה..."
                    className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-black text-base rounded-xl p-3 pr-8 outline-none focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32] font-sans"
                    required
                  />
                  <span className="absolute right-3 top-3.5 text-stone-400 font-bold text-sm">₪</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>שמור יתרה</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-[#DDD6CA] transition cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddBudgetItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  סוג סעיף בתקציב:
                </label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32] cursor-pointer"
                >
                  <option value="variableExpenses">הוצאה משתנה (סופר, בילויים, קניות)</option>
                  <option value="fixedExpenses">הוצאה קבועה (שכירות, חשבונות, ביטוחים)</option>
                  <option value="incomes">הכנסה חודשית (משכורת, הכנסה נוספת)</option>
                  <option value="savings">חיסכון והשקעה (קרן כספית, השקעות)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  שם הסעיף:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={budgetItemName}
                  onChange={(e) => setBudgetItemName(e.target.value)}
                  placeholder="לדוגמה: קניות סופר שופרסל..."
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold text-xs rounded-xl p-2.5 outline-none focus:border-[#2E7D32]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  סכום חודשי (₪):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={budgetItemAmount}
                    onChange={(e) => setBudgetItemAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-black text-base rounded-xl p-2.5 pr-8 outline-none focus:border-[#2E7D32]"
                    required
                  />
                  <span className="absolute right-3 top-3 text-stone-400 font-bold text-sm">₪</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>הוסף לתקציב</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-[#DDD6CA] transition cursor-pointer"
                >
                  ביטול
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-[#E8E2D8] flex items-center justify-between text-[10px] text-stone-400">
            <span>טיפ: לחץ על <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-stone-600 font-bold">Esc</kbd> לסגירה</span>
            <span>קיצור דרך לפתיחה: <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-stone-600 font-bold">Q</kbd></span>
          </div>
        </div>

      </div>
    </div>
  );
}
