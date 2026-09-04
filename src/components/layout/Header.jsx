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
    <header className="bg-[#FFFFFF]/95 border-b border-[#E8E2D8] sticky top-0 z-40 backdrop-blur-md px-3 sm:px-4 py-2.5 sm:py-3 shadow-xs font-['Calibri',sans-serif] dir-rtl text-right" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-2.5">
        
        {/* Top Tier: Logo & Cloud Status on right, User Profile & Logout on left */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & App Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl shadow-xs font-black text-base sm:text-xl flex items-center justify-center shrink-0">
              ₪
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-bold text-stone-900 tracking-wide truncate">
                  {isSingleMember ? 'מעקב פיננסי' : 'מעקב פיננסי משותף'}
                </h1>
                {isCloudSynced && (
                  <span className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                    ☁️ <span className="hidden xs:inline">מחובר</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-[#FAF7F2] p-1 sm:p-1.5 rounded-xl border border-[#E8E2D8] shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-1.5 min-w-0">
              {authUser?.photoURL ? (
                <img src={authUser.photoURL} alt="profile" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shadow-xs shrink-0" />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#81C784] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {userDisplayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-xs max-w-[90px] sm:max-w-[130px] truncate">
                <div className="font-bold text-stone-800 text-[11px] sm:text-xs truncate">{userDisplayName}</div>
                <div className="text-stone-400 text-[9px] sm:text-[10px] hidden sm:block truncate">{authUser?.email}</div>
              </div>
            </div>
            <button 
              type="button"
              onClick={onLogout}
              className="text-[10px] sm:text-xs bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-[#EF9A9A] transition shadow-2xs cursor-pointer whitespace-nowrap"
            >
              התנתק
            </button>
          </div>
        </div>

        {/* Room Info & Controls Bar */}
        {currentRoom && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#E8E2D8]/60 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] sm:text-xs font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-md border border-[#C8E6C9] max-w-[200px] truncate">
                חדר: {currentRoom.name}
              </span>
              <button
                type="button"
                onClick={onOpenManageRoom}
                className="text-[10px] sm:text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-[#FAF7F2] hover:bg-[#F2ECE1] px-2 py-0.5 rounded-md border border-[#DDD6CA] transition cursor-pointer flex items-center gap-1"
                title="הגדרות חדר, ניהול חברים ועריכת שמות תצוגה"
              >
                <span>⚙️</span>
                <span>הגדרות חדר</span>
              </button>
              <button
                type="button"
                onClick={onSwitchRoom}
                className="text-[10px] sm:text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-[#FAF7F2] hover:bg-[#F2ECE1] px-2 py-0.5 rounded-md border border-[#DDD6CA] transition cursor-pointer flex items-center gap-1"
                title="חזרה ללובי ובחירת חדר אחר"
              >
                <span>🔄</span>
                <span>החלף חדר</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs (Smooth Horizontal Scroll with Touch Momentum) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 border-t border-[#E8E2D8]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap border cursor-pointer shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
                  : 'text-stone-600 border-transparent hover:bg-[#F2ECE1] bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>
    </header>
  );
}
