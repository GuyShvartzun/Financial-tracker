import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { deleteRoomFromFirestore, leaveRoomInFirestore } from '../../utils/roomService';

export default function RoomLobby({
  authUser,
  rooms = [],
  onSelectRoom,
  onLogout
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Delete & Leave Room State
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [roomToLeave, setRoomToLeave] = useState(null);
  const [isLeavingRoom, setIsLeavingRoom] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) {
      setErrorMsg('אנא הזן שם לחדר');
      return;
    }

    if (!db || !authUser) {
      setErrorMsg('שגיאת חיבור לענן. אנא נסה שוב.');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');

    try {
      const roomRef = doc(collection(db, 'rooms'));
      const initialMember = {
        id: authUser.uid,
        uid: authUser.uid,
        displayName: authUser.displayName || authUser.email.split('@')[0],
        name: authUser.displayName || authUser.email.split('@')[0],
        email: authUser.email.toLowerCase(),
        photoURL: authUser.photoURL || '',
        role: 'owner'
      };

      const newRoom = {
        id: roomRef.id,
        name,
        ownerId: authUser.uid,
        ownerEmail: authUser.email.toLowerCase(),
        createdAt: new Date().toISOString(),
        members: [initialMember],
        memberEmails: [authUser.email.toLowerCase()]
      };

      await setDoc(roomRef, newRoom);
      setShowCreateModal(false);
      setNewRoomName('');
      onSelectRoom(newRoom);
    } catch (err) {
      console.error('Error creating room:', err);
      setErrorMsg('אירעה שגיאה ביצירת החדר. אנא נסה שוב.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    setDeleteError('');
    try {
      await deleteRoomFromFirestore(roomToDelete.id);
      setRoomToDelete(null);
    } catch (err) {
      console.error('Error deleting room:', err);
      setDeleteError('אירעה שגיאה במחיקת החדר. אנא נסה שוב.');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomToLeave || !authUser) return;
    setIsLeavingRoom(true);
    setLeaveError('');
    try {
      await leaveRoomInFirestore(roomToLeave.id, authUser.email, authUser.uid);
      setRoomToLeave(null);
    } catch (err) {
      console.error('Error leaving room:', err);
      setLeaveError('אירעה שגיאה בעזיבת החדר. אנא נסה שוב.');
    } finally {
      setIsLeavingRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 font-['Calibri',sans-serif] dir-rtl text-right flex flex-col" dir="rtl">
      {/* Top Header */}
      <header className="bg-[#FFFFFF]/90 border-b border-[#E8E2D8] sticky top-0 z-40 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] p-2 rounded-2xl shadow-sm font-black text-xl flex items-center justify-center w-10 h-10">
              ₪
            </div>
            <div>
              <h1 className="text-xl font-black text-stone-900">מעקב פיננסי</h1>
              <p className="text-xs text-stone-500">לובי החדרים המשותפים</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E8E2D8]">
            <div className="flex items-center gap-2 px-2">
              {authUser?.photoURL ? (
                <img src={authUser.photoURL} alt="profile" className="w-8 h-8 rounded-full shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#81C784] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {authUser?.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-xs">
                <div className="font-semibold text-stone-800">{authUser?.displayName || authUser?.email}</div>
                <div className="text-stone-500 text-[10px]">{authUser?.email}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] font-bold px-3 py-1.5 rounded-lg border border-[#EF9A9A] transition shadow-xs cursor-pointer"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-stone-900">החדרים שלי</h2>
            <p className="text-sm text-stone-500 mt-1">
              בחר חדר קיים כדי לצפות ולנהל את הנתונים, או צור חדר פיננסי חדש.
            </p>
          </div>

          <button
            onClick={() => {
              setNewRoomName('מעקב פיננסי');
              setErrorMsg('');
              setShowCreateModal(true);
            }}
            className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            <span>פתח חדר חדש</span>
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E2D8] rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-5">
            <div className="w-20 h-20 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-xs">
              📊
            </div>
            <h3 className="text-xl font-bold text-stone-900">שלום {authUser?.displayName || ''}!</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              עדיין אין לך חדרים פעילים מקושרים לחשבון Google זה (<span className="font-semibold text-stone-800">{authUser?.email}</span>).
              תוכל לפתוח חדר משלך או לבקש מחבר/שותף להזמין אותך באמצעות כתובת המייל שלך.
            </p>
            <button
              onClick={() => {
                setNewRoomName('מעקב פיננסי');
                setErrorMsg('');
                setShowCreateModal(true);
              }}
              className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md transition inline-flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none">+</span>
              <span>צור את החדר הראשון שלך</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const isOwner = room.ownerId === authUser.uid;
              const membersCount = room.members?.length || 1;

              return (
                <div
                  key={room.id}
                  className="bg-[#FFFFFF] border border-[#E8E2D8] hover:border-[#81C784] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black text-stone-900 line-clamp-1">{room.name}</h3>
                        {isOwner ? (
                          <span className="text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] px-2 py-0.5 rounded-full inline-block mt-1">
                            בעלים
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-[#E3F2FD] text-[#1976D2] border border-[#BBDEFB] px-2 py-0.5 rounded-full inline-block mt-1">
                            חבר
                          </span>
                        )}
                      </div>

                      {isOwner ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError('');
                            setRoomToDelete(room);
                          }}
                          className="text-stone-400 hover:text-[#C62828] hover:bg-[#FFEBEE] p-1.5 rounded-xl border border-transparent hover:border-[#FFCDD2] transition cursor-pointer text-sm"
                          title="מחק חדר לצמיתות"
                        >
                          🗑️
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeaveError('');
                            setRoomToLeave(room);
                          }}
                          className="text-stone-400 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded-xl border border-transparent hover:border-amber-200 transition cursor-pointer text-sm"
                          title="עזוב חדר זה"
                        >
                          🚪
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 space-y-1">
                      <div>נוצר ע"י: <span className="text-stone-700 font-semibold">{room.ownerEmail}</span></div>
                    </div>

                    <div className="pt-2 border-t border-[#E8E2D8]">
                      <div className="text-xs font-bold text-stone-700 mb-2">
                        חברים בחדר ({membersCount}):
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(room.members || []).map((m, idx) => (
                          <div
                            key={m.id || m.uid || idx}
                            className="flex items-center gap-1 bg-[#FAF7F2] border border-[#DDD6CA] px-2 py-1 rounded-lg text-[11px] text-stone-700"
                            title={m.email}
                          >
                            {m.photoURL ? (
                              <img src={m.photoURL} alt="" className="w-4 h-4 rounded-full" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[#81C784] text-white flex items-center justify-center text-[9px] font-bold">
                                {(m.displayName || m.name)?.[0] || 'U'}
                              </div>
                            )}
                            <span className="font-semibold max-w-[80px] truncate">{m.displayName || m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectRoom(room)}
                    className="w-full mt-2 bg-[#FAF7F2] hover:bg-[#E8F5E9] text-[#2E7D32] hover:text-[#1B5E20] border border-[#C8E6C9] font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>היכנס לחדר</span>
                    <span>←</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#E8E2D8] max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <h3 className="text-lg font-black text-stone-900">פתיחת חדר פיננסי חדש</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  שם החדר:
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="מעקב פיננסי"
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 font-bold rounded-xl p-3 text-sm outline-none focus:border-[#4A90E2]"
                  autoFocus
                />
              </div>

              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8] text-xs text-stone-600 space-y-1">
                <div>• אתה תוגדר כבעל החדר (<span className="font-semibold text-stone-800">{authUser?.email}</span>).</div>
                <div>• החדר ייווצר במצב ריק ונקי, ותוכל להזמין שותפים נוספים בכל עת דרך ניהול החדר.</div>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] rounded-xl text-xs font-bold text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl border border-[#DDD6CA] transition cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'יוצר חדר...' : 'צור חדר והיכנס'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#FFCDD2] max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <div className="flex items-center gap-2 text-[#C62828]">
                <span className="text-xl">🗑️</span>
                <h3 className="text-lg font-black text-stone-900">מחיקת חדר לצמיתות</h3>
              </div>
              <button
                onClick={() => {
                  if (!isDeletingRoom) setRoomToDelete(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-stone-800 leading-relaxed">
                האם אתה בטוח שברצונך למחוק את החדר <strong className="text-stone-900 font-black">"{roomToDelete.name}"</strong>?
              </p>
              <div className="bg-[#FFEBEE] border border-[#FFCDD2] p-3 rounded-2xl text-xs text-[#C62828] space-y-1">
                <div className="font-bold">⚠️ אזהרה:</div>
                <div>• כל החשבונות, היתרות, התקציבים והמחשבונים של החדר יימחקו לצמיתות.</div>
                <div>• כל החברים בחדר יאבדו את הגישה לנתונים אלו באופן מיידי.</div>
                <div>• פעולה זו היא סופית ואינה ניתנת לביטול או לשחזור.</div>
              </div>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] rounded-xl text-xs font-bold text-center">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                disabled={isDeletingRoom}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl border border-[#DDD6CA] transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={isDeletingRoom}
                className="flex-1 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeletingRoom ? 'מוחק חדר...' : 'כן, מחק חדר לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Room Confirmation Modal */}
      {roomToLeave && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <span className="text-xl">🚪</span>
                <h3 className="text-lg font-black text-stone-900">עזיבת חדר משותף</h3>
              </div>
              <button
                onClick={() => {
                  if (!isLeavingRoom) setRoomToLeave(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-stone-800 leading-relaxed">
                האם אתה בטוח שברצונך לעזוב את החדר <strong className="text-stone-900 font-black">"{roomToLeave.name}"</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 space-y-1">
                <div>• החדר יוסר מרשימת החדרים שלך בלובי.</div>
                <div>• נתוני החדר יישמרו עבור שאר חברי החדר.</div>
                <div>• תוכל לחזור רק אם בעל החדר יזמין אותך מחדש באמצעות כתובת המייל שלך.</div>
              </div>
            </div>

            {leaveError && (
              <div className="p-2.5 bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] rounded-xl text-xs font-bold text-center">
                {leaveError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoomToLeave(null)}
                disabled={isLeavingRoom}
                className="flex-1 py-2.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-stone-700 font-bold text-xs rounded-xl border border-[#DDD6CA] transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                disabled={isLeavingRoom}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isLeavingRoom ? 'יוצא מהחדר...' : 'כן, עזוב חדר'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
