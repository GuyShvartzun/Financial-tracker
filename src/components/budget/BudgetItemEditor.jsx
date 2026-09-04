import React from 'react';
import { fmtILS } from '../../utils/formatters';

export default function BudgetItemEditor({ title, items = [], color, onChange }) {
  const handleAmount = (id, val) => {
    onChange(items.map(i => i.id === id ? { ...i, amount: val } : i));
  };

  const handleName = (id, name) => {
    onChange(items.map(i => i.id === id ? { ...i, name } : i));
  };

  const handleAdd = () => {
    onChange([...items, { id: 'item_' + Date.now(), name: 'סעיף חדש', amount: 0 }]);
  };

  const handleDelete = (id) => {
    onChange(items.filter(i => i.id !== id));
  };

  return (
    <div className={`bg-[#FFFFFF] border ${color} p-4 sm:p-5 rounded-2xl shadow-xs space-y-3`}>
      <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
        <h4 className="text-sm font-bold text-stone-900">{title}</h4>
        <span className="text-xs font-bold text-[#2E7D32]">
          סה"כ: {fmtILS(items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
        </span>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="text"
              value={item.name}
              onChange={(e) => handleName(item.id, e.target.value)}
              className="flex-1 min-w-0 bg-[#FAF7F2] border border-[#DDD6CA] text-xs rounded-lg px-2.5 py-1.5 text-stone-900 outline-none focus:border-[#4A90E2]"
            />
            <input
              type="number"
              step="any"
              value={item.amount ?? ''}
              onChange={(e) => handleAmount(item.id, e.target.value)}
              className="w-20 sm:w-24 bg-[#FAF7F2] border border-[#DDD6CA] text-xs font-bold text-[#2E7D32] rounded-lg px-2 sm:px-2.5 py-1.5 outline-none focus:border-[#4A90E2]"
            />
            <button 
              type="button"
              onClick={() => handleDelete(item.id)} 
              className="w-7 h-7 text-xs text-[#C62828] font-bold hover:bg-[#FFEBEE] rounded-lg border border-transparent hover:border-[#FFCDD2] flex items-center justify-center cursor-pointer transition shrink-0"
              title="מחק סעיף"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-xs text-stone-700 font-bold rounded-lg border border-dashed border-[#DDD6CA] transition cursor-pointer flex items-center justify-center gap-1"
      >
        <span>+</span>
        <span>הוסף סעיף</span>
      </button>
    </div>
  );
}
