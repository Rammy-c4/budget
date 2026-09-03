import React from 'react';
import { ExpenseItem } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { Hourglass, RotateCcw, Trash2, X } from 'lucide-react';

interface DelayedExpensesSheetProps {
  delayedExpenses: ExpenseItem[];
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
}

export const DelayedExpensesSheet: React.FC<DelayedExpensesSheetProps> = ({
  delayedExpenses,
  currencySymbol,
  isOpen,
  onClose,
  onRestore,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Hourglass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Delayed Expenses
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pended purchases held outside your daily calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {delayedExpenses.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Hourglass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No delayed expenses
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              When an impulse purchase comes up, delay it here to reconsider later without impacting today’s allowance.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {delayedExpenses.map((expense) => (
              <div
                key={expense.id}
                className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {expense.description}
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    Delayed {expense.timeFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {currencySymbol}{SpendingCalculator.formatExactDecimal(expense.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRestore(expense.id)}
                      title="Restore to today's spending"
                      className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(expense.id)}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
