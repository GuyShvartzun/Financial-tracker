import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  User, 
  Check, 
  X, 
  Search,
  ListTodo
} from 'lucide-react';

export const TASK_PRIORITIES = [
  { id: 'high', label: 'עדיפות גבוהה', badge: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'medium', label: 'עדיפות בינונית', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'low', label: 'עדיפות נמוכה', badge: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]' },
];

export default function FinancialTaskList({
  tasks = [],
  onUpdateTasks,
  users = [],
  selectedMonth = '08/2026'
}) {
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    targetDate: ''
  });

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const highPriorityPending = tasks.filter(t => !t.completed && t.priority === 'high').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Handlers
  const handleToggleComplete = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null
        };
      }
      return t;
    });
    onUpdateTasks(updated);
  };

  const handleDeleteTask = (taskId) => {
    const updated = tasks.filter(t => t.id !== taskId);
    onUpdateTasks(updated);
  };

  const handleStartEdit = (task) => {
    setEditingTaskId(task.id);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      assignedTo: task.assignedTo || '',
      targetDate: task.targetDate || task.targetMonth || ''
    });
    setShowAddForm(true);
  };

  const handleResetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      targetDate: ''
    });
    setEditingTaskId(null);
    setShowAddForm(false);
  };

  const handleSaveForm = (e) => {
    e?.preventDefault();
    if (!formData.title.trim()) return;

    if (editingTaskId) {
      const updated = tasks.map(t => {
        if (t.id === editingTaskId) {
          return {
            ...t,
            title: formData.title.trim(),
            description: formData.description.trim(),
            priority: formData.priority,
            assignedTo: formData.assignedTo,
            targetDate: formData.targetDate.trim()
          };
        }
        return t;
      });
      onUpdateTasks(updated);
    } else {
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        assignedTo: formData.assignedTo,
        targetDate: formData.targetDate.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      onUpdateTasks([newTask, ...tasks]);
    }

    handleResetForm();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Stats */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center shrink-0">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                <span>רשימת משימות</span>
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setShowAddForm(!showAddForm);
              }}
              className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>משימה חדשה</span>
            </button>
          </div>
        </div>

        {/* Progress Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#FAF7F2] border border-[#E8E2D8] p-3 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">סה"כ משימות</div>
            <div className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">{totalTasks}</div>
          </div>

          <div className="bg-[#FAF7F2] border border-[#E8E2D8] p-3 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">לביצוע</div>
            <div className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5">{pendingTasks}</div>
          </div>

          <div className="bg-[#FAF7F2] border border-[#E8E2D8] p-3 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">הושלמו</div>
            <div className="text-lg sm:text-xl font-bold text-[#2E7D32] mt-0.5">{completedTasks}</div>
          </div>

          <div className="bg-[#FAF7F2] border border-[#E8E2D8] p-3 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">עדיפות גבוהה</div>
            <div className="text-lg sm:text-xl font-bold text-red-600 mt-0.5">{highPriorityPending}</div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        {totalTasks > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-semibold text-stone-700">
              <span>התקדמות כוללת</span>
              <span>{completionPercentage}% ({completedTasks}/{totalTasks})</span>
            </div>
            <div className="w-full bg-[#E8E2D8] dark:bg-[#252A38] h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#2E7D32] dark:bg-[#4CAF50] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Celebration Banner when 100% completed */}
        {totalTasks > 0 && completionPercentage === 100 && (
          <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0 animate-bounce">🎉</span>
              <div>
                <span className="font-bold text-emerald-950 block text-xs sm:text-sm">
                  כל הכבוד! כל המשימות הפיננסיות הושלמו בהצלחה!
                </span>
                <span className="text-emerald-800 text-[11px]">
                  השגתם 100% ביצוע של היעדים והמשימות שהוגדרו. המשיכו כך!
                </span>
              </div>
            </div>
            <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-1 rounded-lg shadow-xs shrink-0">
              100% הושלם 🏆
            </span>
          </div>
        )}
      </div>

      {/* Add / Edit Task Form Drawer/Card */}
      {showAddForm && (
        <form 
          onSubmit={handleSaveForm}
          className="bg-[#FFFFFF] border border-[#2E7D32]/30 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-[#2E7D32]" />
              <span>{editingTaskId ? 'עריכת משימה' : 'הוספת משימה חדשה'}</span>
            </h3>
            <button
              type="button"
              onClick={handleResetForm}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                כותרת המשימה <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="הכנס כותרת למשימה..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:border-[#2E7D32]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                פירוט והערות לביצוע
              </label>
              <textarea
                rows={2}
                placeholder="הסבר קצר, הערות או צעדים מפורטים..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs sm:text-sm rounded-xl px-3 py-2 outline-none focus:border-[#2E7D32] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  עדיפות
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#2E7D32]"
                >
                  {TASK_PRIORITIES.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  משויך אל
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#2E7D32]"
                >
                  <option value="">כללי</option>
                  {users.map(u => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>
                      {u.displayName || u.name || 'משתמש'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  תאריך יעד
                </label>
                <input
                  type="text"
                  placeholder="תאריך מבוקש"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs rounded-xl px-3 py-2 outline-none focus:border-[#2E7D32]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E2D8]">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-[#FAF7F2] border border-transparent transition cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold px-5 py-2 rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingTaskId ? 'עדכן משימה' : 'שמור משימה'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-3 sm:p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E8E2D8] overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#FFFFFF] text-[#2E7D32] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              הכל ({totalTasks})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-[#FFFFFF] text-amber-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              לביצוע ({pendingTasks})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-[#FFFFFF] text-[#2E7D32] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              הושלמו ({completedTasks})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="חיפוש משימה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#DDD6CA] text-stone-900 text-xs rounded-xl pr-8 pl-3 py-1.5 outline-none focus:border-[#2E7D32]"
            />
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8E2D8]">
          <span className="text-[11px] font-semibold text-stone-500">סינון עדיפות:</span>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#FAF7F2] border border-[#DDD6CA] text-stone-700 text-xs rounded-lg px-2 py-1 outline-none focus:border-[#2E7D32]"
          >
            <option value="all">כל רמות העדיפות</option>
            {TASK_PRIORITIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {(priorityFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setPriorityFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline pr-1 cursor-pointer"
            >
              איפוס סינונים
            </button>
          )}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E8E2D8] p-8 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAF7F2] text-stone-400 border border-[#E8E2D8] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">
                {tasks.length === 0 ? 'אין עדיין משימות ברשימה' : 'לא נמצאו משימות התואמות לסינון'}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {tasks.length === 0 
                  ? 'לחץ על "משימה חדשה" כדי להתחיל להוסיף משימות.'
                  : 'נסה לשנות את הסינון או לחפש מילת מפתח אחרת.'}
              </p>
            </div>
            {tasks.length === 0 && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] border border-[#A5D6A7] font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  הוסף משימה ראשונה
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredTasks.map(task => {
            const prioObj = TASK_PRIORITIES.find(p => p.id === task.priority) || TASK_PRIORITIES[2];
            const assignedUser = users.find(u => (u.uid || u.id) === task.assignedTo);
            const targetDateDisplay = task.targetDate || task.targetMonth;

            return (
              <div
                key={task.id}
                className={`bg-[#FFFFFF] border rounded-2xl p-4 transition-all duration-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  task.completed 
                    ? 'border-[#E8E2D8] bg-[#FAF7F2]/60 opacity-80' 
                    : 'border-[#E8E2D8] hover:border-[#2E7D32]/40 hover:shadow-sm'
                }`}
              >
                {/* Checkbox and Task Content */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(task.id)}
                    className="mt-0.5 text-stone-400 hover:text-[#2E7D32] transition shrink-0 cursor-pointer"
                    title={task.completed ? 'סמן כפתוחה' : 'סמן כבוצעה'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#2E7D32] fill-[#E8F5E9]" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-400 hover:text-[#2E7D32]" />
                    )}
                  </button>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold leading-tight ${
                        task.completed ? 'line-through text-stone-500' : 'text-stone-900'
                      }`}>
                        {task.title}
                      </h4>

                      {/* Priority Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${prioObj.badge}`}>
                        {prioObj.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className={`text-xs leading-relaxed ${
                        task.completed ? 'line-through text-stone-400' : 'text-stone-600'
                      }`}>
                        {task.description}
                      </p>
                    )}

                    {/* Metadata line: due date, assigned user */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-stone-500">
                      {targetDateDisplay && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>תאריך יעד: {targetDateDisplay}</span>
                        </span>
                      )}

                      {assignedUser ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-stone-400" />
                          <span>אחראי: {assignedUser.displayName || assignedUser.name}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-stone-400">
                          <User className="w-3 h-3" />
                          <span>כללי</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E2D8]">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(task)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-[#FAF7F2] rounded-lg transition cursor-pointer"
                    title="ערוך משימה"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="מחק משימה"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
