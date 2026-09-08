import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Cloud, 
  Settings, 
  ArrowLeftRight, 
  LogOut,
  FileSpreadsheet,
  LayoutDashboard,
  Calculator,
  Sparkles,
  FileEdit
} from 'lucide-react';

export default function Header({ 
  authUser, 
  isCloudSynced, 
  activeTab, 
  setActiveTab, 
  onLogout,
  currentRoom,
  onSwitchRoom,
  onOpenManageRoom,
  isPrivacyMode,
  onTogglePrivacyMode
}) {
  const isSingleMember = (currentRoom?.members?.length || 1) <= 1;

  const tabs = [
    { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard },
    { id: 'calculators', label: 'מחשבונים פיננסיים', shortLabel: 'מחשבונים', icon: Calculator },
    { id: 'ai_advisor', label: 'יועץ פיננסי', shortLabel: 'יועץ AI', icon: Sparkles },
    { id: 'data_entry', label: 'הזנת נתונים', shortLabel: 'הזנה', icon: FileEdit },
  ];

  const isTabActive = (tabId) => {
    if (tabId === 'dashboard') {
      return activeTab === 'dashboard' || activeTab === 'shared_dash' || activeTab === 'personal_dash' || activeTab === 'budget';
    }
    return activeTab === tabId;
  };

  // Room-specific display name for the logged-in user
  const localMember = currentRoom?.members?.find(m => (m.uid || m.id) === authUser?.uid);
  const userDisplayName = localMember?.displayName || localMember?.name || authUser?.displayName || authUser?.email || 'משתמש מחובר';

  return (
    <>
      {/* =========================================================================
          1. DESKTOP SIDEBAR NAVIGATION (Visible on md and larger screens)
          ========================================================================= */}
      <aside 
        className="hidden md:flex flex-col fixed top-0 right-0 h-screen w-64 bg-[#FFFFFF] border-l border-[#E8E2D8] shadow-xs z-40 select-none p-4 justify-between font-sans dir-rtl text-right overflow-y-auto"
        dir="rtl"
        aria-label="סרגל ניווט ראשי"
      >
        {/* Top Section: Logo & Room Details */}
        <div className="space-y-4">
          {/* App Title & Cloud Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] w-9 h-9 rounded-xl shadow-xs font-black text-lg flex items-center justify-center shrink-0 select-none">
                ₪
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-stone-900 tracking-wide truncate">
                  {isSingleMember ? 'מעקב פיננסי' : 'מעקב פיננסי משותף'}
                </h1>
                {isCloudSynced && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full font-bold">
                    <Cloud className="w-2.5 h-2.5" />
                    <span>מחובר</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Current Room Box */}
          {currentRoom && (
            <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E8E2D8] space-y-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-md border border-[#C8E6C9] truncate">
                  חדר: {currentRoom.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#E8E2D8]/60">
                <button
                  type="button"
                  onClick={onOpenManageRoom}
                  className="flex-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-[#F2ECE1] py-1 px-1.5 rounded-lg border border-[#DDD6CA] transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  title="הגדרות חדר, ניהול חברים ועריכת שמות תצוגה"
                >
                  <Settings className="w-3 h-3" />
                  <span>הגדרות חדר</span>
                </button>
                <button
                  type="button"
                  onClick={onSwitchRoom}
                  className="flex-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-white hover:bg-[#F2ECE1] py-1 px-1.5 rounded-lg border border-[#DDD6CA] transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  title="חזרה ללובי ובחירת חדר אחר"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>החלף חדר</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1 pt-1">
            <div className="text-[11px] font-bold text-stone-600 px-2 py-1 uppercase tracking-wider">
              תפריט ראשי
            </div>
            {tabs.map(tab => {
              const active = isTabActive(tab.id);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border ${
                    active 
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs' 
                      : 'text-stone-600 border-transparent hover:bg-[#FAF7F2] hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#2E7D32]' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-[#E8E2D8] mt-2">
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border ${
                  activeTab === 'export'
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9] shadow-xs'
                    : 'text-stone-600 border-transparent hover:bg-[#FAF7F2] hover:text-stone-900'
                }`}
                title="ייצוא וייבוא נתונים"
              >
                <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'export' ? 'text-[#2E7D32]' : 'text-stone-500'}`} />
                <span>ייצוא וייבוא נתונים</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Privacy Mode & Profile */}
        <div className="space-y-3 pt-3 border-t border-[#E8E2D8]">
          {/* Privacy Mode Button */}
          <button
            type="button"
            onClick={onTogglePrivacyMode}
            title={isPrivacyMode ? "הצג סכומים (P)" : "טשטש והסתר סכומים (P)"}
            aria-label={isPrivacyMode ? "הצג סכומים" : "טשטש והסתר סכומים"}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer flex items-center justify-between ${
              isPrivacyMode
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-[#FAF7F2] text-stone-600 hover:text-stone-900 hover:bg-[#F2ECE1] border-[#DDD6CA]'
            }`}
          >
            <div className="flex items-center gap-2">
              {isPrivacyMode ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>{isPrivacyMode ? 'פרטיות פעילה' : 'מצב פרטיות'}</span>
            </div>
            <span className="text-[10px] text-stone-500 bg-white/80 px-1.5 py-0.5 rounded border border-[#E8E2D8]">P</span>
          </button>

          {/* Profile & Logout Card */}
          <div className="bg-[#FAF7F2] p-2 rounded-xl border border-[#E8E2D8] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {authUser?.photoURL ? (
                <img src={authUser.photoURL} alt="profile" className="w-7 h-7 rounded-full shadow-xs shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#81C784] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {userDisplayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-xs truncate">
                <div className="font-bold text-stone-800 text-xs truncate">{userDisplayName}</div>
                <div className="text-stone-500 text-[10px] truncate">{authUser?.email}</div>
              </div>
            </div>
            <button 
              type="button"
              onClick={onLogout}
              title="התנתק מהחשבון"
              className="text-xs bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] font-bold p-1.5 rounded-lg border border-[#EF9A9A] transition shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px]">התנתק</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE SLIM TOP HEADER (Visible on screens smaller than md)
          ========================================================================= */}
      <header 
        className="flex md:hidden sticky top-0 z-40 h-14 bg-[#FFFFFF]/95 border-b border-[#E8E2D8] backdrop-blur-md px-3 items-center justify-between shadow-xs font-sans dir-rtl text-right"
        dir="rtl"
      >
        {/* Right: Logo & Room Controls */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] w-7 h-7 rounded-lg shadow-xs font-black text-sm flex items-center justify-center shrink-0 select-none">
            ₪
          </div>
          {currentRoom && (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-md border border-[#C8E6C9] truncate max-w-[110px]">
                {currentRoom.name}
              </span>
              <button
                type="button"
                onClick={onOpenManageRoom}
                className="p-1 rounded-md text-stone-600 hover:text-stone-900 bg-[#FAF7F2] border border-[#DDD6CA]"
                title="הגדרות חדר"
                aria-label="הגדרות חדר (נייד)"
              >
                <Settings className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onSwitchRoom}
                className="p-1 rounded-md text-stone-600 hover:text-stone-900 bg-[#FAF7F2] border border-[#DDD6CA]"
                title="החלף חדר"
                aria-label="החלף חדר (נייד)"
              >
                <ArrowLeftRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Left: Export, Privacy, Profile / Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'export'
                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                : 'bg-[#FAF7F2] text-stone-600 border-[#DDD6CA]'
            }`}
            title="ייצוא וייבוא נתונים"
            aria-label="ייצוא וייבוא נתונים (נייד)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePrivacyMode}
            title={isPrivacyMode ? "הצג סכומים" : "טשטש סכומים"}
            aria-label={isPrivacyMode ? "הצג סכומים (נייד)" : "מצב פרטיות (נייד)"}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isPrivacyMode
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-[#FAF7F2] text-stone-600 border-[#DDD6CA]'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="התנתק"
            aria-label="התנתק (נייד)"
            className="p-1.5 rounded-lg bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A] transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          3. MOBILE BOTTOM NAVIGATION BAR (Visible on screens smaller than md)
          ========================================================================= */}
      <nav 
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#FFFFFF]/95 border-t border-[#E8E2D8] backdrop-blur-md px-1 items-center justify-around shadow-lg font-sans dir-rtl select-none"
        dir="rtl"
        aria-label="סרגל ניווט תחתון"
      >
        {tabs.map(tab => {
          const active = isTabActive(tab.id);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-label={`${tab.label} (תפריט תחתון)`}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                active 
                  ? 'text-[#2E7D32] font-black' 
                  : 'text-stone-500 font-semibold hover:text-stone-800'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${active ? 'bg-[#E8F5E9] text-[#2E7D32]' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[70px]">
                {tab.shortLabel || tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
