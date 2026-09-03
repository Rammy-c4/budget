import React, { useEffect, useState } from 'react';
import { CATEGORIES, ExpenseCategory, ExpenseItem } from '../types';
import { Clock, Hourglass, Trash2, X } from 'lucide-react';

interface EditExpenseSheetProps {
  expense: ExpenseItem | null;
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ExpenseItem) => void;
  onDelay: (id: number) => void;
  onDelete: (id: number) => void;
}

export const EditExpenseSheet: React.FC<EditExpenseSheetProps> = ({
  expense,
  currencySymbol,
  isOpen,
  onClose,
  onSave,
  onDelay,
  onDelete,
}) => {
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [timeFormatted, setTimeFormatted] = useState('');

  useEffect(() => {
    if (expense) {
      setAmountInput(String(expense.amount));
      setDescription(expense.description);
      setCategory(expense.category);
      setTimeFormatted(expense.timeFormatted);
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) return;

    onSave({
      ...expense,
      amount: num,
      description: description.trim() || expense.category,
      category,
      timeFormatted: timeFormatted.trim() || expense.timeFormatted,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Edit Expense
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div className="space-y-1">
            <label
              htmlFor="edit-expense-amount"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {currencySymbol}
              </span>
              <input
                id="edit-expense-amount"
                type="number"
                step="any"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-16 pr-4 py-3.5 rounded-2xl text-3xl font-black bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-1">
            <label
              htmlFor="edit-expense-desc"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Description / Item
            </label>
            <input
              id="edit-expense-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-600 outline-none transition"
            />
          </div>

          {/* Category Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((catKey) => {
                const meta = CATEGORIES[catKey];
                const isSelected = category === catKey;

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="truncate">{meta.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time input */}
          <div className="space-y-1">
            <label
              htmlFor="edit-expense-time"
              className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Time Recorded</span>
            </label>
            <input
              id="edit-expense-time"
              type="text"
              value={timeFormatted}
              onChange={(e) => setTimeFormatted(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-indigo-950 hover:bg-indigo-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition cursor-pointer"
          >
            Save Changes
          </button>

          {/* Extra Actions: Delay & Delete */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onDelay(expense.id);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-bold transition cursor-pointer"
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Delay Expense</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDelete(expense.id);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-red-300 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
