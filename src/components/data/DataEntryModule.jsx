import React, { useState, useEffect } from 'react';
import { fmtILS } from '../../utils/formatters';
import { getNextMonth } from '../../utils/calculations';

export default function DataEntryModule({
  selectedMonth,
  setSelectedMonth,
  monthsList,
  onAddNewMonth,
  onDeleteMonth,
  activeRoomAccounts,
  users = [],
  activeUserId = '',
  isSingleMember = false,
  handleAccountNameChange,
  handleAccountCategoryChange,
  handleReorderAccount,
  handleMoveAccountToPosition,
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

  // Multi-user Data Entry selector state
  const isMultiUser = !isSingleMember && users.length > 1;
  const preferredUserUid = (activeUserId && users.some(u => (u.uid || u.id) === activeUserId))
    ? activeUserId
    : (users[0]?.uid || users[0]?.id || '');
  const [selectedUserId, setSelectedUserId] = useState(preferredUserUid);

  useEffect(() => {
    const preferred = (activeUserId && users.some(u => (u.uid || u.id) === activeUserId))
      ? activeUserId
      : (users[0]?.uid || users[0]?.id || '');
    if (preferred && (!selectedUserId || !users.some(u => (u.uid || u.id) === selectedUserId))) {
      setSelectedUserId(preferred);
    }
  }, [activeUserId, users]);

  const currentSelectedUser = users.find(u => (u.uid || u.id) === selectedUserId) || users[0];
  const currentUserId = currentSelectedUser?.uid || currentSelectedUser?.id || selectedUserId;

  const displayedAccounts = isMultiUser
    ? activeRoomAccounts.filter(a => a.ownerId === currentUserId)
    : activeRoomAccounts;

  // Drag & Drop State
  const [draggedAccId, setDraggedAccId] = useState(null);
  const [dragOverGroupId, setDragOverGroupId] = useState(null);
  const [dragOverAccId, setDragOverAccId] = useState(null);

  const latestMonth = monthsList[monthsList.length - 1];

  const submitNewMonth = () => {
    const val = newMonthInput.trim();
    if (!val) return;
    onAddNewMonth(val);
    setNewMonthInput('');
    setShowAddMonthModal(false);
  };

  const accountGroups = [
    { key: 'short', title: 'נכסים לטווח קצר', shortTitle: 'נכסים לטווח קצר', color: 'border-[#FFE0B2]' },
    { key: 'medium', title: 'נכסים לטווח בינוני', shortTitle: 'נכסים לטווח בינוני', color: 'border-[#BBDEFB]' },
    { key: 'long', title: 'נכסים לטווח ארוך', shortTitle: 'נכסים לטווח ארוך', color: 'border-[#E1BEE7]' },
    { key: 'liability', title: 'התחייבויות', shortTitle: 'התחייבויות', color: 'border-[#FFCDD2]' },
  ];

  // Drag & Drop Handlers
  const handleDragStart = (e, accId) => {
    e.dataTransfer.setData('text/plain', accId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAccId(accId);
  };

  const handleDragEnd = () => {
    setDraggedAccId(null);
    setDragOverGroupId(null);
    setDragOverAccId(null);
  };

  const handleGroupDragOver = (e, groupKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGroupId !== groupKey) {
      setDragOverGroupId(groupKey);
    }
  };

  const handleGroupDrop = (e, targetGroupKey, targetAccsCount) => {
    e.preventDefault();
    const accId = e.dataTransfer.getData('text/plain') || draggedAccId;
    if (!accId) return;

    if (handleMoveAccountToPosition) {
      handleMoveAccountToPosition(accId, targetGroupKey, targetAccsCount, currentUserId);
    } else if (handleAccountCategoryChange) {
      handleAccountCategoryChange(accId, targetGroupKey);
    }

    handleDragEnd();
  };

  const handleAccountDrop = (e, targetGroupKey, targetIndex, targetAccId) => {
    e.preventDefault();
    e.stopPropagation();
    const accId = e.dataTransfer.getData('text/plain') || draggedAccId;
    if (!accId || accId === targetAccId) {
      handleDragEnd();
      return;
    }

    if (handleMoveAccountToPosition) {
      handleMoveAccountToPosition(accId, targetGroupKey, targetIndex, currentUserId);
    }

    handleDragEnd();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">הזנת נתונים חודשית וניהול חשבונות</h2>
            <p className="text-xs text-stone-500 mt-1">
              יש להזין יתרת חשבונות נכון לתאריך החתך בניכוי הכנסות והוצאות של תחילת חודש עוקב אשר נכנסו בתקופה הנוכחית.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {monthsList.length > 1 && (
              <button
                type="button"
                onClick={() => setShowDeleteMonthConfirm(true)}
                className="bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#EF9A9A] font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
              >
                מחק חודש ({selectedMonth})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewMonthInput(getNextMonth(latestMonth));
                setShowAddMonthModal(true);
              }}
              className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
            >
              + פתח חודש חדש במערכת
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF7F2] p-3 sm:p-3.5 rounded-xl border border-[#E8E2D8]">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-stone-700 font-bold whitespace-nowrap">חודש נבחר לעריכה:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex-1 sm:flex-none bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[#4A90E2] cursor-pointer"
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

      {/* User Selector Bar for Multi-Member Rooms */}
      {isMultiUser && (
        <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
            <div>
              <span className="text-sm font-bold text-stone-900 block">עריכת נתונים לפי משתמש</span>
              <span className="text-xs text-stone-500">
                בחר את המשתמש שעבורו תרצה לערוך ולהזין חשבונות ויתרות בנפרד
              </span>
            </div>
            <div className="text-xs font-bold text-stone-600 bg-[#FAF7F2] px-3 py-1 rounded-xl border border-[#DDD6CA]">
              עורך כעת חשבונות של: <span className="text-[#2E7D32] font-black">{currentSelectedUser?.displayName || currentSelectedUser?.name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {users.map(u => {
              const uUid = u.uid || u.id;
              const isSelected = currentUserId === uUid;
              const isAuthUser = uUid === activeUserId;
              const userAccountsCount = activeRoomAccounts.filter(a => a.ownerId === uUid).length;

              return (
                <button
                  key={uUid}
                  type="button"
                  onClick={() => setSelectedUserId(uUid)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#81C784] shadow-xs ring-2 ring-[#2E7D32]/20'
                      : 'bg-[#FAF7F2] text-stone-700 hover:bg-[#F2ECE1] border-[#DDD6CA]'
                  }`}
                >
                  <span className="text-base leading-none">👤</span>
                  <span>{u.displayName || u.name}</span>
                  {isAuthUser && (
                    <span className="text-[10px] bg-white text-stone-600 border border-stone-300 px-1.5 py-0.5 rounded-md font-normal">
                      אני
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected 
                      ? 'bg-[#2E7D32] text-white' 
                      : 'bg-[#E8E2D8] text-stone-700'
                  }`}>
                    {userAccountsCount} חשבונות
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Categories Groups */}
      {accountGroups.map(group => {
        const groupAccounts = displayedAccounts
          .filter(a => a.category === group.key)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const groupTotal = groupAccounts.reduce((s, a) => s + (parseFloat(a.balances?.[selectedMonth]) || 0), 0);
        const isDragOverThisGroup = dragOverGroupId === group.key;

        return (
          <div 
            key={group.key} 
            onDragOver={(e) => handleGroupDragOver(e, group.key)}
            onDragLeave={() => dragOverGroupId === group.key && setDragOverGroupId(null)}
            onDrop={(e) => handleGroupDrop(e, group.key, groupAccounts.length)}
            className={`bg-[#FFFFFF] border-2 ${
              isDragOverThisGroup ? 'border-emerald-500 bg-emerald-50/20' : group.color
            } p-4 sm:p-6 rounded-2xl shadow-xs space-y-4 transition-colors duration-200`}
          >
            {/* Category Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-stone-900">{group.title}</h3>
                <span className="text-[11px] font-bold bg-[#FAF7F2] border border-[#DDD6CA] text-stone-600 px-2 py-0.5 rounded-full">
                  {groupAccounts.length} חשבונות
                </span>
              </div>
              <span className="text-xs text-stone-500">
                סה"כ לקבוצה: <strong className="text-[#2E7D32] font-black">{fmtILS(groupTotal)}</strong>
              </span>
            </div>

            {/* Empty state or Accounts List */}
            {groupAccounts.length === 0 ? (
              <div 
                className="py-8 text-center bg-[#FAF7F2] border border-dashed border-[#DDD6CA] rounded-xl text-stone-500 text-xs"
              >
                {isMultiUser
                  ? `אין חשבונות עבור ${currentSelectedUser?.displayName || currentSelectedUser?.name} בקטגוריה זו. לחץ על הכפתור למטה להוספת חשבון.`
                  : 'אין חשבונות בקטגוריה זו. לחץ על הכפתור למטה או גרור לכאן חשבון מקבוצה אחרת.'}
              </div>
            ) : (
              <div className="space-y-3">
                {groupAccounts.map((acc, idx) => {
                  const isBeingDragged = draggedAccId === acc.id;
                  const isDragTarget = dragOverAccId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, acc.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverAccId(acc.id);
                      }}
                      onDragLeave={() => dragOverAccId === acc.id && setDragOverAccId(null)}
                      onDrop={(e) => handleAccountDrop(e, group.key, idx, acc.id)}
                      className={`rounded-xl border transition duration-150 ${
                        isBeingDragged 
                          ? 'opacity-40 border-dashed border-stone-400 bg-stone-100' 
                          : isDragTarget 
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-md scale-[1.01]'
                          : 'bg-[#FAF7F2] hover:bg-[#F9F6F0] border-[#E8E2D8]'
                      } p-3.5 space-y-3 sm:space-y-0`}
                    >
                      {/* Desktop Layout (md+) */}
                      <div className="hidden md:flex items-center gap-3">
                        {/* Drag Handle & Reorder arrows */}
                        <div className="flex items-center gap-1">
                          <span 
                            className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 p-1 select-none text-base" 
                            title="גרור כדי לסדר מחדש או להעביר לקבוצה אחרת"
                          >
                            ⋮⋮
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleReorderAccount && handleReorderAccount(acc.id, 'up', currentUserId)}
                              disabled={idx === 0}
                              className="w-5 h-4 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-600 rounded border border-[#DDD6CA] text-[9px] flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed"
                              title="הזז למעלה"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderAccount && handleReorderAccount(acc.id, 'down', currentUserId)}
                              disabled={idx === groupAccounts.length - 1}
                              className="w-5 h-4 bg-white hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-white text-stone-600 rounded border border-[#DDD6CA] text-[9px] flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed"
                              title="הזז למטה"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {/* Order badge */}
                        <span className="text-[10px] font-bold text-stone-400 w-5 text-center">
                          #{idx + 1}
                        </span>

                        {/* Account Name */}
                        <div className="flex-1 min-w-[150px]">
                          <label className="text-[10px] text-stone-500 font-bold block mb-1">שם החשבון</label>
                          <input
                            type="text"
                            value={acc.name}
                            onChange={(e) => handleAccountNameChange(acc.id, e.target.value)}
                            className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-sm font-bold rounded-lg px-3 py-1.5 outline-none focus:border-[#4A90E2]"
                          />
                        </div>

                        {/* Category Selector */}
                        <div className="w-44">
                          <label className="text-[10px] text-stone-500 font-bold block mb-1">קטגוריה</label>
                          <select
                            value={acc.category}
                            onChange={(e) => handleAccountCategoryChange && handleAccountCategoryChange(acc.id, e.target.value)}
                            className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs rounded-lg px-2 py-2 outline-none cursor-pointer focus:border-[#4A90E2]"
                          >
                            {accountGroups.map(g => (
                              <option key={g.key} value={g.key}>{g.shortTitle}</option>
                            ))}
                          </select>
                        </div>

                        {/* Owner Selector */}
                        <div className="w-36">
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

                        {/* Balance in ILS */}
                        <div className="w-36">
                          <label className="text-[10px] text-stone-500 font-bold block mb-1">סכום ב-₪ ({selectedMonth})</label>
                          <input
                            type="number"
                            step="any"
                            value={acc.balances?.[selectedMonth] ?? ''}
                            onChange={(e) => handleBalanceChange(acc.id, selectedMonth, e.target.value)}
                            className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-[#2E7D32] font-black text-sm rounded-lg px-3 py-1.5 outline-none focus:border-[#4A90E2]"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 mt-4">
                          <button
                            type="button"
                            onClick={() => handleRemoveAccountFromMonth(acc.id, selectedMonth)}
                            className="px-2.5 py-1.5 bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#E65100] rounded-lg transition text-xs font-bold border border-[#FFCC80] cursor-pointer whitespace-nowrap"
                            title="הסר יתרה מחודש זה בלבד"
                          >
                            הסר מחודש
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccountCompletely(acc.id)}
                            className="px-2.5 py-1.5 bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] rounded-lg transition text-xs font-bold border border-[#EF9A9A] cursor-pointer whitespace-nowrap"
                            title="מחק חשבון כליל"
                          >
                            מחק כליל
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout (< md) */}
                      <div className="md:hidden space-y-3">
                        {/* Top Line: Order, Name, and Up/Down controls */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[11px] font-black text-stone-400 bg-white px-2 py-1 rounded-md border border-[#DDD6CA]">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={acc.name}
                              onChange={(e) => handleAccountNameChange(acc.id, e.target.value)}
                              placeholder="שם החשבון"
                              className="flex-1 min-w-0 bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-sm font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-[#4A90E2]"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReorderAccount && handleReorderAccount(acc.id, 'up', currentUserId)}
                              disabled={idx === 0}
                              className="w-8 h-8 bg-white hover:bg-stone-100 disabled:opacity-30 text-stone-700 font-bold rounded-lg border border-[#DDD6CA] text-xs flex items-center justify-center transition cursor-pointer"
                              title="הזז למעלה"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderAccount && handleReorderAccount(acc.id, 'down', currentUserId)}
                              disabled={idx === groupAccounts.length - 1}
                              className="w-8 h-8 bg-white hover:bg-stone-100 disabled:opacity-30 text-stone-700 font-bold rounded-lg border border-[#DDD6CA] text-xs flex items-center justify-center transition cursor-pointer"
                              title="הזז למטה"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        {/* Middle Grid: Category, Owner, Amount */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-stone-500 font-bold block mb-1">קטגוריה</label>
                            <select
                              value={acc.category}
                              onChange={(e) => handleAccountCategoryChange && handleAccountCategoryChange(acc.id, e.target.value)}
                              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-stone-900 text-xs rounded-lg p-2 outline-none cursor-pointer focus:border-[#4A90E2]"
                            >
                              {accountGroups.map(g => (
                                <option key={g.key} value={g.key}>{g.shortTitle}</option>
                              ))}
                            </select>
                          </div>

                          <div>
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
                              className={`w-full bg-[#FFFFFF] border text-stone-900 text-xs rounded-lg p-2 outline-none cursor-pointer ${
                                !users.some(m => (m.uid || m.id) === acc.ownerId) 
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold' 
                                  : 'border-[#DDD6CA]'
                              }`}
                            >
                              {!users.some(m => (m.uid || m.id) === acc.ownerId) && (
                                <option value={acc.ownerId || ''} disabled>
                                  ⚠️ בחר שותף
                                </option>
                              )}
                              {users.map(m => (
                                <option key={m.uid || m.id} value={m.uid || m.id}>{m.displayName || m.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <label className="text-[10px] text-stone-500 font-bold block mb-1">סכום ב-₪ ({selectedMonth})</label>
                            <input
                              type="number"
                              step="any"
                              value={acc.balances?.[selectedMonth] ?? ''}
                              onChange={(e) => handleBalanceChange(acc.id, selectedMonth, e.target.value)}
                              className="w-full bg-[#FFFFFF] border border-[#DDD6CA] text-[#2E7D32] font-black text-sm rounded-lg p-2 outline-none focus:border-[#4A90E2]"
                            />
                          </div>
                        </div>

                        {/* Bottom Actions Line */}
                        <div className="flex items-center gap-2 pt-2 border-t border-[#E8E2D8]">
                          <button
                            type="button"
                            onClick={() => handleRemoveAccountFromMonth(acc.id, selectedMonth)}
                            className="flex-1 py-1.5 bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#E65100] rounded-lg transition text-xs font-bold border border-[#FFCC80] cursor-pointer text-center"
                          >
                            הסר מחודש {selectedMonth}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccountCompletely(acc.id)}
                            className="flex-1 py-1.5 bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] rounded-lg transition text-xs font-bold border border-[#EF9A9A] cursor-pointer text-center"
                          >
                            מחק כליל
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Account Button */}
            <button
              type="button"
              onClick={() => handleAddAccount(group.key, currentUserId)}
              className="w-full py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-dashed border-[#DDD6CA] text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>+</span>
              <span>
                {isMultiUser
                  ? `הוסף חשבון לקבוצה זו עבור ${currentSelectedUser?.displayName || currentSelectedUser?.name || 'המשתמש'}`
                  : `הוסף חשבון לקבוצה זו (${group.shortTitle})`}
              </span>
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
                type="button"
                onClick={submitNewMonth}
                className="flex-1 py-2.5 bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold text-xs rounded-xl transition cursor-pointer"
              >
                אישור ופתיחת חודש
              </button>
              <button
                type="button"
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
          <div className="bg-[#FFFFFF] border border-[#FFCDD2] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl text-center max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#C62828]">מחיקת חודש מוחלטת</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              האם אתה בטוח שברצונך למחוק את החודש <strong>{selectedMonth}</strong>? יתרות החודש יוסרו מכל הניתוחים והדשבורדים.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteMonth(selectedMonth);
                  setShowDeleteMonthConfirm(false);
                }}
                className="flex-1 py-2.5 bg-[#EF5350] hover:bg-[#D32F2F] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                מחק חודש זה
              </button>
              <button
                type="button"
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
