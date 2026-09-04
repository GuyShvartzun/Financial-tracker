import React from 'react';

export default function Header({ 
  authUser, 
  isCloudSynced, 
  activeTab, 
  setActiveTab, 
  onLogout,
  currentRoom,
  onSwitchRoom,
  onOpenManageRoom
}) {
  const isSingleMember = (currentRoom?.members?.length || 1) <= 1;

  const tabs = [
    ...(isSingleMember 
      ? [{ id: 'personal_dash', label: 'דשבורד' }]
      : [
          { id: 'shared_dash', label: 'דשבורד משותף' },
          { id: 'personal_dash', label: 'דשבורד אישי' }
        ]
    ),
    { id: 'budget', label: 'תקציב' },
    { id: 'calculators', label: 'מחשבונים פיננסיים' },
    { id: 'ai_advisor', label: 'יועץ פיננסי AI' },
    { id: 'data_entry', label: 'הזנת נתונים' },
    { id: 'export', label: 'ייצוא וייבוא אקסל' },
  ];

  // Room-specific display name for the logged-in user
  const localMember = currentRoom?.members?.find(m => (m.uid || m.id) === authUser?.uid);
  const userDisplayName = localMember?.displayName || localMember?.name || authUser?.displayName || authUser?.email || 'משתמש מחובר';

  return (
    <header className="bg-[#FFFFFF]/90 border-b border-[#E8E2D8] sticky top-0 z-40 backdrop-blur-md px-4 py-3 shadow-sm font-['Calibri',sans-serif] dir-rtl text-right" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] p-2.5 rounded-2xl shadow-sm font-black text-xl flex items-center justify-center w-10 h-10">
            ₪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900 tracking-wide">
                {isSingleMember ? 'מעקב פיננסי' : 'מעקב פיננסי משותף'}
              </h1>
              {isCloudSynced && (
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                  ☁️ מחובר לענן
                </span>
              )}
            </div>
            {currentRoom && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-md border border-[#C8E6C9]">
                  חדר: {currentRoom.name}
                </span>
                <button
                  onClick={onOpenManageRoom}
                  className="text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#DDD6CA] transition cursor-pointer"
                  title="הגדרות חדר, ניהול חברים ועריכת שמות תצוגה"
                >
                  ⚙️ הגדרות חדר
                </button>
                <button
                  onClick={onSwitchRoom}
                  className="text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#DDD6CA] transition cursor-pointer"
                  title="חזרה ללובי ובחירת חדר אחר"
                >
                  🔄 החלף חדר
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E8E2D8]">
          <div className="flex items-center gap-2 px-2">
            {authUser?.photoURL ? (
              <img src={authUser.photoURL} alt="profile" className="w-8 h-8 rounded-full shadow-sm" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#81C784] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {userDisplayName?.[0] || 'U'}
              </div>
            )}
            <div className="text-xs">
              <div className="font-semibold text-stone-800">{userDisplayName}</div>
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

      <div className="max-w-7xl mx-auto flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pt-1 border-t border-[#E8E2D8]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap border cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
                : 'text-stone-600 border-transparent hover:bg-[#F2ECE1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
}
