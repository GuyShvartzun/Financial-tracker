import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { deleteRoomFromFirestore, leaveRoomInFirestore } from '../../utils/roomService';

export default function RoomSettingsModal({
  currentRoom,
  authUser,
  onClose,
  onUpdateRoom,
  onDeleteRoom,
  onLeaveRoom
}) {
  const [roomName, setRoomName] = useState(currentRoom.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Editing member display names locally
  const [editingMemberUid, setEditingMemberUid] = useState(null);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [memberUpdateSuccess, setMemberUpdateSuccess] = useState('');

  // Inviting new members
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Danger Zone: Delete & Leave Room State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const isOwner = currentRoom.ownerId === authUser.uid;

  const handleUpdateRoomName = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !db || !isOwner) return;

    setIsUpdatingName(true);
    setNameSuccess(false);
    try {
      await updateDoc(doc(db, 'rooms', currentRoom.id), {
        name: roomName.trim()
      });
      setNameSuccess(true);
      if (onUpdateRoom) {
        onUpdateRoom({ ...currentRoom, name: roomName.trim() });
      }
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating room name:', err);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const startEditDisplayName = (member) => {
    setEditingMemberUid(member.uid || member.id);
    setTempDisplayName(member.displayName || member.name || '');
  };

  const cancelEditDisplayName = () => {
    setEditingMemberUid(null);
    setTempDisplayName('');
  };

  const handleSaveDisplayName = async (memberUid) => {
    const trimmed = tempDisplayName.trim();
    if (!trimmed || !db) return;

    setIsSavingName(true);
    setMemberUpdateSuccess('');
    try {
      const updatedMembers = (currentRoom.members || []).map(m => {
        if ((m.uid || m.id) === memberUid) {
          return {
            ...m,
            displayName: trimmed,
            name: trimmed
          };
        }
        return m;
      });

      await updateDoc(doc(db, 'rooms', currentRoom.id), {
        members: updatedMembers
      });

      if (onUpdateRoom) {
        onUpdateRoom({
          ...currentRoom,
          members: updatedMembers
        });
      }

      setMemberUpdateSuccess(`שם התצוגה עודכן ל-"${trimmed}" בחדר זה`);
      setEditingMemberUid(null);
      setTempDisplayName('');
      setTimeout(() => setMemberUpdateSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving member display name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    const displayName = newMemberName.trim();
    const email = newMemberEmail.trim().toLowerCase();

    setInviteError('');
    setInviteSuccess('');

    if (!displayName || !email) {
      setInviteError('נא למלא שם תצוגה וכתובת אימייל');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setInviteError('נא להזין כתובת אימייל תקינה');
      return;
    }

    const existingEmails = (currentRoom.memberEmails || currentRoom.members?.map(m => m.email?.toLowerCase()) || []);
    if (existingEmails.includes(email)) {
      setInviteError('משתמש עם כתובת אימייל זו כבר קיים בחדר');
      return;
    }

    setIsInviting(true);
    try {
      const generatedUid = 'u_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const newMember = {
        id: generatedUid,
        uid: generatedUid,
        displayName,
        name: displayName,
        email,
        photoURL: '',
        role: 'member'
      };

      const updatedMembers = [...(currentRoom.members || []), newMember];
      const updatedEmails = [...new Set([...existingEmails, email])];

      await updateDoc(doc(db, 'rooms', currentRoom.id), {
        members: updatedMembers,
        memberEmails: updatedEmails
      });

      setNewMemberName('');
      setNewMemberEmail('');
      setInviteSuccess(`החבר "${displayName}" נוסף בהצלחה לרשימת המורשים בחדר!`);
      if (onUpdateRoom) {
        onUpdateRoom({
          ...currentRoom,
          members: updatedMembers,
          memberEmails: updatedEmails
        });
      }
      setTimeout(() => setInviteSuccess(''), 4000);
    } catch (err) {
      console.error('Error inviting member:', err);
      setInviteError('אירעה שגיאה בהוספת החבר. אנא נסה שוב.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberToRemove) => {
    const memberUid = memberToRemove.uid || memberToRemove.id;
    if (!isOwner || memberUid === currentRoom.ownerId || memberToRemove.email?.toLowerCase() === currentRoom.ownerEmail?.toLowerCase()) {
      return;
    }

    const confirmRemove = window.confirm(`האם אתה בטוח שברצונך להסיר את ${memberToRemove.displayName || memberToRemove.name} מהחדר?`);
    if (!confirmRemove) return;

    try {
      const updatedMembers = (currentRoom.members || []).filter(m => (m.uid || m.id) !== memberUid && m.email !== memberToRemove.email);
      const updatedEmails = (currentRoom.memberEmails || []).filter(e => e !== memberToRemove.email?.toLowerCase());

      await updateDoc(doc(db, 'rooms', currentRoom.id), {
        members: updatedMembers,
        memberEmails: updatedEmails
      });

      if (onUpdateRoom) {
        onUpdateRoom({
          ...currentRoom,
          members: updatedMembers,
          memberEmails: updatedEmails
        });
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleDeleteActiveRoom = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteRoomFromFirestore(currentRoom.id);
      if (onDeleteRoom) {
        onDeleteRoom();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error deleting room:', err);
      setDeleteError('אירעה שגיאה במחיקת החדר. אנא נסה שוב.');
      setIsDeleting(false);
    }
  };

  const handleLeaveActiveRoom = async () => {
    setIsLeaving(true);
    setLeaveError('');
    try {
      await leaveRoomInFirestore(currentRoom.id, authUser.email, authUser.uid);
      if (onLeaveRoom) {
        onLeaveRoom();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error leaving room:', err);
      setLeaveError('אירעה שגיאה בעזיבת החדר. אנא נסה שוב.');
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 font-['Calibri',sans-serif] dir-rtl text-right select-none" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E2D8] max-w-xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="text-lg font-black text-stone-900">הגדרות חדר ומשתמשים</h3>
              <span className="text-xs text-stone-500 font-bold">חדר: {currentRoom.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Room Name Update (Owner Only) */}
        {isOwner && (
          <form onSubmit={handleUpdateRoomName} className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-3">
            <label className="text-xs font-bold text-stone-700 block">עריכת שם החדר:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="flex-1 bg-white border border-[#DDD6CA] text-stone-900 font-bold rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4A90E2]"
              />
              <button
                type="submit"
                disabled={isUpdatingName || roomName === currentRoom.name}
                className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingName ? 'שומר...' : 'עדכן שם חדר'}
              </button>
            </div>
            {nameSuccess && (
              <span className="text-xs text-[#2E7D32] font-bold block">שם החדר עודכן בהצלחה!</span>
            )}
          </form>
        )}

        {/* Status notification for member name update */}
        {memberUpdateSuccess && (
          <div className="p-2.5 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-xl text-xs font-bold text-center">
            {memberUpdateSuccess}
          </div>
        )}

        {/* Members List with Local Display Name Editing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-900">
              חברי החדר ({currentRoom.members?.length || 0})
            </h4>
            <span className="text-[11px] text-stone-500">
              שמות התצוגה תקפים לחדר זה בלבד
            </span>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {(currentRoom.members || []).map((member) => {
              const memberUid = member.uid || member.id;
              const isCurrentUser = memberUid === authUser.uid;
              const isMemberOwner = memberUid === currentRoom.ownerId || member.email?.toLowerCase() === currentRoom.ownerEmail?.toLowerCase() || member.role === 'owner';
              const canEditName = isCurrentUser || isOwner;
              const isEditing = editingMemberUid === memberUid;

              return (
                <div
                  key={memberUid || member.email}
                  className={`flex flex-col gap-2 p-3 rounded-xl border transition ${
                    isCurrentUser ? 'bg-[#F9FBF9] border-[#C8E6C9]' : 'bg-[#FAF7F2] border-[#E8E2D8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-9 h-9 rounded-full shadow-xs" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#81C784] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {(member.displayName || member.name)?.[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-stone-900 text-xs truncate">
                            {member.displayName || member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                              אתה
                            </span>
                          )}
                          {isMemberOwner ? (
                            <span className="text-[9px] bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] px-2 py-0.5 rounded-full font-black">
                              בעלים
                            </span>
                          ) : (
                            <span className="text-[9px] bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] px-2 py-0.5 rounded-full font-bold">
                              חבר
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-500 block truncate">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {canEditName && !isEditing && (
                        <button
                          onClick={() => startEditDisplayName(member)}
                          className="text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 px-2.5 py-1 rounded-lg border border-[#DDD6CA] transition cursor-pointer"
                          title="ערוך שם תצוגה מקומי לחדר זה"
                        >
                          ✏️ ערוך שם
                        </button>
                      )}

                      {isOwner && !isMemberOwner && !isEditing && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="text-[11px] text-[#C62828] hover:bg-[#FFEBEE] border border-[#EF9A9A] font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                          title="הסר חבר מהחדר"
                        >
                          הסר
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Display Name Edit Form */}
                  {isEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[#E8E2D8] mt-1">
                      <input
                        type="text"
                        value={tempDisplayName}
                        onChange={(e) => setTempDisplayName(e.target.value)}
                        placeholder="שם תצוגה מקומי בחדר"
                        className="flex-1 bg-white border border-[#4A90E2] text-stone-900 font-bold text-xs rounded-lg px-2.5 py-1.5 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveDisplayName(memberUid)}
                        disabled={isSavingName || !tempDisplayName.trim()}
                        className="px-3 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        שמור
                      </button>
                      <button
                        onClick={cancelEditDisplayName}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        ביטול
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite New Member Form */}
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#C8E6C9] space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✉️</span>
            <h4 className="text-xs font-bold text-[#2E7D32]">הזמן משתמש נוסף לחדר</h4>
          </div>
          <p className="text-[11px] text-stone-500">
            הזן שם תצוגה מקומי וכתובת Google של השותף. החדר יופיע בלובי שלו עם כניסתו.
          </p>

          <form onSubmit={handleInviteMember} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-1">שם תצוגה בחדר:</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="למשל: דניאל"
                  className="w-full bg-white border border-[#DDD6CA] text-stone-900 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#4A90E2]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-1">כתובת אימייל (Google):</label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-white border border-[#DDD6CA] text-stone-900 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#4A90E2]"
                />
              </div>
            </div>

            {inviteError && (
              <div className="text-[11px] text-[#C62828] font-bold bg-[#FFEBEE] border border-[#FFCDD2] p-2 rounded-lg">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="text-[11px] text-[#2E7D32] font-bold bg-[#E8F5E9] border border-[#C8E6C9] p-2 rounded-lg">
                {inviteSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={isInviting}
              className="w-full py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>+</span>
              <span>{isInviting ? 'מוסיף חבר...' : 'הוסף חבר לחדר'}</span>
            </button>
          </form>
        </div>

        {/* Danger Zone / Leave Room Section */}
        {isOwner ? (
          <div className="bg-[#FFF5F5] border border-[#FFCDD2] p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-[#C62828]">
              <span className="text-base">⚠️</span>
              <h4 className="text-xs font-black">אזור סכנה - מחיקת חדר לצמיתות</h4>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              מחיקת החדר תמחק לצמיתות את כל החשבונות, היתרות, התקציבים והמחשבונים שנצברו בו עבור כל המשתתפים. פעולה זו היא סופית ואינה ניתנת לביטול.
            </p>

            {deleteError && (
              <div className="p-2.5 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] rounded-xl text-xs font-bold text-center">
                {deleteError}
              </div>
            )}

            {showDeleteConfirm ? (
              <div className="bg-white p-3.5 rounded-xl border border-[#EF9A9A] space-y-3">
                <p className="text-xs font-bold text-[#C62828] leading-relaxed">
                  האם אתה בטוח לחלוטין שברצונך למחוק את החדר "{currentRoom.name}"?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteActiveRoom}
                    disabled={isDeleting}
                    className="flex-1 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'מוחק חדר...' : 'כן, מחק חדר לצמיתות'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2 px-4 bg-white hover:bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A] font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>מחק חדר זה לצמיתות</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="text-base">🚪</span>
              <h4 className="text-xs font-black">עזיבת חדר</h4>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              עזיבת החדר תסיר אותך מרשימת המורשים. תוכל לחזור רק אם בעל החדר יזמין אותך מחדש באמצעות כתובת המייל שלך.
            </p>

            {leaveError && (
              <div className="p-2.5 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] rounded-xl text-xs font-bold text-center">
                {leaveError}
              </div>
            )}

            {showLeaveConfirm ? (
              <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-3">
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  האם אתה בטוח שברצונך לעזוב את החדר "{currentRoom.name}"?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLeaveActiveRoom}
                    disabled={isLeaving}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {isLeaving ? 'יוצא מהחדר...' : 'כן, עזוב חדר'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(false)}
                    disabled={isLeaving}
                    className="py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                className="py-2 px-4 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-2"
              >
                <span>🚪</span>
                <span>עזוב חדר</span>
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#E8E2D8]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl border border-[#DDD6CA] transition cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility alias
export { RoomSettingsModal as RoomManageModal };
