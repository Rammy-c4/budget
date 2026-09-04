import React, { useEffect, useState } from 'react';
import { CATEGORIES, ExpenseCategory } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { Clock, Plus, Tag, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AddExpenseSheetProps {
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    amount: number,
    description: string,
    timeFormatted: string,
    category: ExpenseCategory
  ) => void;
}

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({
  currencySymbol,
  isOpen,
  onClose,
  onAdd,
}) => {
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [timeFormatted, setTimeFormatted] = useState('');
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);

  // Set default current time formatted when opened
  useEffect(() => {
    if (isOpen) {
      setAmountInput('');
      setDescription('');
      setCategory('FOOD');
      setHasManuallySelectedCategory(false);
      const now = new Date();
      setTimeFormatted(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }
  }, [isOpen]);

  // Intelligent category auto-inference from description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setDescription(text);
    if (!hasManuallySelectedCategory && text.trim().length > 1) {
      const inferred = SpendingCalculator.inferCategory(text);
      if (inferred) {
        setCategory(inferred);
      }
    }
  };

  const handleCategorySelect = (cat: ExpenseCategory) => {
    setCategory(cat);
    setHasManuallySelectedCategory(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountInput);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    onAdd(numericAmount, description, timeFormatted, category);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[min(92vh,90dvh)] sm:max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between pb-1">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Add Expense
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div className="space-y-1">
            <label
              htmlFor="add-expense-amount"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {currencySymbol}
              </span>
              <input
                id="add-expense-amount"
                type="number"
                step="any"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-3.5 rounded-2xl text-3xl font-black bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-1">
            <label
              htmlFor="add-expense-desc"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Description / Item
            </label>
            <input
              id="add-expense-desc"
              type="text"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="e.g. Lunch at Chop Bar, Bolt ride, Groceries"
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition"
            />
          </div>

          {/* Category Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Category</span>
              </label>
              {!hasManuallySelectedCategory && description && (
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                  Auto-detected ⚡
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((catKey) => {
                const meta = CATEGORIES[catKey];
                const isSelected = category === catKey;

                return (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    key={catKey}
                    type="button"
                    onClick={() => handleCategorySelect(catKey)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-bold border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm">{meta.emoji}</span>
                    <span className="truncate">{meta.displayName}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Time input */}
          <div className="space-y-1">
            <label
              htmlFor="add-expense-time"
              className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Time Recorded</span>
            </label>
            <input
              id="add-expense-time"
              type="text"
              value={timeFormatted}
              onChange={(e) => setTimeFormatted(e.target.value)}
              placeholder="e.g. 12:30 PM"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            />
          </div>

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!amountInput || parseFloat(amountInput) <= 0}
            className="w-full py-4 rounded-2xl bg-indigo-950 hover:bg-indigo-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-indigo-950/20 transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="w-5 h-5" />
            <span>Record Expense</span>
          </motion.button>
        </form>
      </div>
    </div>
  );
};
