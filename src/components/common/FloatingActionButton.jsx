import React from 'react';
import { Plus } from 'lucide-react';

export default function FloatingActionButton({ onClick, label = "הזנה מהירה" }) {
  return (
    <div className="fixed bottom-5 left-5 z-40 group">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label} (קיצור: Q)`}
        className="flex items-center gap-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white px-4 py-3 sm:py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-300"
      >
        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
        <span className="font-bold text-xs sm:text-sm tracking-wide hidden sm:inline">
          {label}
        </span>
        <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-bold bg-white/20 text-white rounded-md border border-white/30">
          Q
        </kbd>
      </button>
    </div>
  );
}
