import React from 'react';

export default function LoginView({ onLogin }) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col items-center justify-center p-6 font-['Calibri',sans-serif] dir-rtl" dir="rtl">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full text-center border border-[#E8E2D8] space-y-6">
        <div className="bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] mx-auto w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center font-black text-3xl mb-2">
          ₪
        </div>
        <h1 className="text-3xl font-black text-stone-900">מעקב פיננסי</h1>
        <p className="text-stone-500 font-medium pb-4 border-b border-[#E8E2D8]">
          מעקב פיננסי אישי ומשותף. התחבר עם חשבון Google כדי לצפות בחדרים ובנתונים שלך.
        </p>
        <button 
          onClick={onLogin}
          className="w-full bg-white hover:bg-stone-50 text-stone-800 font-bold py-3.5 px-4 rounded-xl border border-[#DDD6CA] shadow-sm transition flex items-center justify-center gap-3 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          התחברות מאובטחת עם Google
        </button>
      </div>
    </div>
  );
}
