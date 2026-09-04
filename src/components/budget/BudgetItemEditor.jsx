import React, { useState } from 'react';
import { fmtILS } from '../../utils/formatters';

const BUDGET_CATEGORIES = [
  { key: 'incomes', label: 'הכנסה' },
  { key: 'fixedExpenses', label: 'הוצאה קבועה' },
  { key: 'variableExpenses', label: 'הוצאה משתנה' },
  { key: 'savings', label: 'חיסכון' }
];

export default function BudgetItemEditor({
  title,
  categoryKey,
  items = [],
  color,
  onChange,
  onMoveCategory,
  onMoveItemToPosition
}) {
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const [isDragOverCard, setIsDragOverCard] = useState(false);

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

  const handleReorder = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onChange(updated);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId: id, sourceCategory: categoryKey }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
    setIsDragOverCard(false);
  };

  const handleCardDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOverCard) setIsDragOverCard(true);
  };

  const handleCardDrop = (e) => {
    e.preventDefault();
    setIsDragOverCard(false);
    setDragOverItemId(null);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data?.itemId && onMoveItemToPosition) {
        onMoveItemToPosition(data.sourceCategory, data.itemId, categoryKey, items.length);
      }
    } catch (err) {
      console.error('Error handling budget drop on card:', err);
    }
  };

  const handleItemDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
    setDragOverItemId(null);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);
      if (data?.itemId && onMoveItemToPosition) {
        onMoveItemToPosition(data.sourceCategory, data.itemId, categoryKey, targetIndex);
      }
    } catch (err) {
      console.error('Error handling budget item drop:', err);
    }
  };

  return (
    <div
      onDragOver={handleCardDragOver}
      onDragLeave={() => setIsDragOverCard(false)}
      onDrop={handleCardDrop}
      className={`bg-[#FFFFFF] border ${color} ${
        isDragOverCard ? 'ring-2 ring-[#4A90E2] bg-blue-50/20' : ''
      } p-4 sm:p-5 rounded-2xl shadow-xs space-y-3 transition flex flex-col justify-between`}
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-[#E8E2D8] pb-2">
          <h4 className="text-sm font-bold text-stone-900">{title}</h4>
          <span className="text-xs font-bold text-[#2E7D32]">
            סה"כ: {fmtILS(items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
          </span>
        </div>

        <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="text-center py-6 text-stone-400 text-xs font-semibold">
              אין סעיפים בקטגוריה זו. לחץ על "הוסף סעיף" או גרור לכאן סעיף מקטגוריה אחרת.
            </div>
          )}

          {items.map((item, index) => {
            const isDragging = draggedItemId === item.id;
            const isDragOver = dragOverItemId === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverItemId(item.id);
                }}
                onDragLeave={() => setDragOverItemId(null)}
                onDrop={(e) => handleItemDrop(e, index)}
                className={`flex items-center gap-1 sm:gap-2 p-1.5 rounded-xl border transition ${
                  isDragging ? 'opacity-40 border-dashed border-stone-400' :
                  isDragOver ? 'border-[#4A90E2] bg-blue-50/40' :
                  'bg-[#FAF7F2] border-[#E8E2D8] hover:border-[#DDD6CA]'
                }`}
              >
                {/* Drag Handle & Up/Down Arrows */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <span 
                    className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 select-none text-xs px-0.5" 
                    title="גרור לשינוי מיקום או קטגוריה"
                  >
                    ⋮⋮
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0}
                      className="w-4 h-3.5 sm:w-4 sm:h-3 bg-white border border-[#DDD6CA] hover:bg-stone-100 disabled:opacity-20 disabled:cursor-not-allowed rounded flex items-center justify-center text-[7px] font-bold text-stone-700 cursor-pointer"
                      title="הזז למעלה"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === items.length - 1}
                      className="w-4 h-3.5 sm:w-4 sm:h-3 bg-white border border-[#DDD6CA] hover:bg-stone-100 disabled:opacity-20 disabled:cursor-not-allowed rounded flex items-center justify-center text-[7px] font-bold text-stone-700 cursor-pointer"
                      title="הזז למטה"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleName(item.id, e.target.value)}
                  placeholder="שם הסעיף"
                  className="flex-1 min-w-[75px] sm:min-w-[100px] bg-white border border-[#DDD6CA] text-xs font-semibold rounded-lg px-2 py-1 text-stone-900 outline-none focus:border-[#4A90E2]"
                />

                {/* Category Dropdown Selector */}
                <select
                  value={categoryKey}
                  onChange={(e) => onMoveCategory && onMoveCategory(item.id, e.target.value)}
                  className="bg-white border border-[#DDD6CA] text-[10px] sm:text-xs font-bold text-stone-600 rounded-lg px-1 sm:px-1.5 py-1 outline-none focus:border-[#4A90E2] cursor-pointer"
                  title="העבר לקטגוריה אחרת"
                >
                  {BUDGET_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                {/* Amount input */}
                <input
                  type="number"
                  step="any"
                  value={item.amount ?? ''}
                  onChange={(e) => handleAmount(item.id, e.target.value)}
                  placeholder="0"
                  className="w-16 sm:w-20 bg-white border border-[#DDD6CA] text-xs font-bold text-[#2E7D32] rounded-lg px-1.5 sm:px-2 py-1 outline-none focus:border-[#4A90E2]"
                />

                {/* Delete button */}
                <button 
                  type="button"
                  onClick={() => handleDelete(item.id)} 
                  className="w-6 h-6 sm:w-7 sm:h-7 text-xs text-[#C62828] font-bold hover:bg-[#FFEBEE] rounded-lg border border-transparent hover:border-[#FFCDD2] flex items-center justify-center cursor-pointer transition shrink-0"
                  title="מחק סעיף"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="w-full mt-3 py-2 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-xs text-stone-700 font-bold rounded-lg border border-dashed border-[#DDD6CA] transition cursor-pointer flex items-center justify-center gap-1"
      >
        <span>+</span>
        <span>הוסף סעיף</span>
      </button>
    </div>
  );
}
