import React, { useState } from 'react';
import { fmtILS } from '../../utils/formatters';
import { getNextMonth } from '../../utils/calculations';

export default function DataEntryModule({
  selectedMonth,
  setSelectedMonth,
  monthsList,
  onAddNewMonth,
  onDeleteMonth,
  activeRoomAccounts,
  users,
  handleAccountNameChange,
  handleBalanceChange,
  handleRemoveAccountFromMonth,
  handleDeleteAccountCompletely,
  handleAddAccount,
  setAccounts,
  syncAccountToCloud
}) {
  const [newMonthInput, setNewMonthInput] = useState('');
  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [showDeleteMonthConfirm, setShowDeleteMonthConfirm] = useState(false);

  const latestMonth = monthsList[monthsList.length - 1];

  const submitNewMonth = () => {
    const val = newMonthInput.trim();
    if (!val) return;
    onAddNewMonth(val);
    setNewMonthInput('');
    setShowAddMonthModal(false);
  };

  const accountGroups = [
    { key: 'short', title: 'נכסים לטווח קצר (עו"ש, פקדונות, מזומן)', color: 'border-[#FFE0B2]' },
    { key: 'medium', title: 'נכסים לטווח בינוני (תיק השקעות, קופות גמל להשקעה)', color: 'border-[#BBDEFB]' },
    { key: 'long', title: 'נכסים לטווח ארוך (פנסיה, קרנות השתלמות, גמל)', color: 'border-[#E1BEE7]' },
    { key: 'liability', title: 'התחייבויות והלוואות (מינוס, הלוואות, משכנתה)', color: 'border-[#FFCDD2]' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">הזנת נתונים חודשית וניהול חשבונות</h2>
            <p className="text-xs text-stone-500 mt-1">
              בחר חודש לעדכון יתרות עבר, פתח חודש חדש, או הסר חשבון מחודש מסוים בנפרד.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {monthsList.length > 1 && (
              <button
                onClick={() => setShowDeleteMonthConfirm(true)}
                className="bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#EF9A9A] font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
              >
                מחק חודש נבחר ({selectedMonth})
              </button>
            )}

            <button
              onClick={() => {
                setNewMonthInput(getNextMonth(latestMonth));
                setShowAddMonthModal(true);
              }}
              className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-5 py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
            >
              פתח חודש חדש במערכת
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8E2D8]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-700 font-bold">חודש נבחר לעריכה:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[#4A90E2] cursor-pointer"
            >
              {monthsList.map(m => (
                <option key={m} value={m}>
                  {m} {m === latestMonth ? '(חודש אחרון במערכת)' : '(חודש היסטורי)'}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-stone-500 font-bold">
            סה"כ {monthsList.length} חודשים רשומים במערכת
          </span>
        </div>
      </div>

      {accountGroups.map(group => {
        const groupAccounts = activeRoomAccounts.filter(a => a.category === group.key);

        return (
          <div key={group.key} className={`bg-[#FFFFFF] border ${group.color} p-6 rounded-2xl shadow-xs space-y-4`}>
            <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-3">
              <h3 className="text-md font-bold text-stone-900">{group.title}</h3>
              <span className="text-xs text-stone-500">
                סה"כ לקבוצה: <strong className="text-[#2E7D32]">{fmtILS(groupAccounts.reduce((s, a) => s + (parseFloat(a.balances?.[selectedMonth]) || 0), 0))}</strong>
              </span>
            </div>

            <div className="space-y-3">
              {groupAccounts.map(acc => (
                <div key={acc.id} className="flex flex-wrap items-center gap-3 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8]">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] text-stone-500 font-bold block mb-1">שם החשבון</label>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) => handleAccountNameChange(acc.id, e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#4A90E2]"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] text-stone-500 font-bold block mb-1">שיוך שותף</label>
                    <select
                      value={acc.ownerId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccounts(prev => prev.map(a => {
                          if (a.id === acc.id) {
                            const updated = { ...a, ownerId: val };
                            syncAccountToCloud(updated);
                            return updated;
                          }
                          return a;
                        }));
                      }}
                      className={`w-full bg-[#FFFFFF] border text-stone-900 text-xs rounded-lg px-2 py-2 outline-none cursor-pointer ${
                        !users.some(m => (m.uid || m.id) === acc.ownerId) 
                          ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold' 
                          : 'border-[#DDD6CA]'
                      }`}
                    >
                      {!users.some(m => (m.uid || m.id) === acc.ownerId) && (
                        <option value={acc.ownerId || ''} disabled>
                          ⚠️ לא משויך (בחר)
                        </option>
                      )}
                      {users.map(m => (
                        <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName || m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-36">
                    <label className="text-[10px] text-stone-500 font-bold block mb-1">סכום ב-₪ ({selectedMonth})</label>
                    <input
                      type="number"
                      step="any"
                      value={acc.balances?.[selectedMonth] ?? ''}
                      onChange={(e) => handleBalanceChange(acc.id, selectedMonth, e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-[#2E7D32] font-black text-sm rounded-lg px-3 py-2 outline-none focus:border-[#4A90E2]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 mt-4">
                    <button
                      onClick={() => handleRemoveAccountFromMonth(acc.id, selectedMonth)}
                      className="p-2 bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#E65100] rounded-lg transition text-xs font-bold border border-[#FFCC80] cursor-pointer"
                      title="הסר יתרה מחודש זה בלבד"
                    >
                      הסר מחודש זה
                    </button>
                    <button
                      onClick={() => handleDeleteAccountCompletely(acc.id)}
                      className="p-2 bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] rounded-lg transition text-xs font-bold border border-[#EF9A9A] cursor-pointer"
                      title="מחק חשבון כליל"
                    >
                      מחק כליל
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAddAccount(group.key)}
              className="w-full py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-dashed border-[#DDD6CA] text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              הוסף חשבון לקבוצה זו
            </button>
          </div>
        );
      })}

      {showAddMonthModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900">פתיחת חודש חדש במערכת</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              הכנס את תאריך החודש החדש (למשל: 09/2026). היתרות הראשוניות יועתקו אוטומטית מנתוני החודש האחרון (<strong>{latestMonth}</strong>).
            </p>

            <div>
              <label className="text-xs text-stone-600 font-bold block mb-1">שם/תאריך החודש החדש:</label>
              <input
                type="text"
                placeholder="09/2026"
                value={newMonthInput}
                onChange={(e) => setNewMonthInput(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#4A90E2]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={submitNewMonth}
                className="flex-1 py-2.5 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold text-xs rounded-xl transition cursor-pointer"
              >
                אישור ופתיחת חודש
              </button>
              <button
                onClick={() => setShowAddMonthModal(false)}
                className="py-2.5 px-4 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl transition border border-[#DDD6CA] cursor-pointer"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteMonthConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#FFCDD2] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-center">
            <h3 className="text-lg font-bold text-[#C62828]">מחיקת חודש מוחלטת</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              האם אתה בטוח שברצונך למחוק את החודש <strong>{selectedMonth}</strong>? יתרות החודש יוסרו מכל הניתוחים והדשבורדים.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onDeleteMonth(selectedMonth);
                  setShowDeleteMonthConfirm(false);
                }}
                className="flex-1 py-2.5 bg-[#EF5350] hover:bg-[#D32F2F] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                מחק חודש זה
              </button>
              <button
                onClick={() => setShowDeleteMonthConfirm(false)}
                className="py-2.5 px-4 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl transition border border-[#DDD6CA] cursor-pointer"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
