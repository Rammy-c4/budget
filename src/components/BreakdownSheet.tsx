import React from 'react';
import { ExpenseItem } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { PieChart, X } from 'lucide-react';

interface BreakdownSheetProps {
  expenses: ExpenseItem[];
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BreakdownSheet: React.FC<BreakdownSheetProps> = ({
  expenses,
  currencySymbol,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const breakdown = SpendingCalculator.calculateCategoryBreakdown(expenses);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Today's Breakdown
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {expenses.length} logged expenditures
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

        {/* Total Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Total Spent Today
          </span>
          <span className="text-lg font-black text-slate-900 dark:text-white">
            {currencySymbol}{SpendingCalculator.formatExactDecimal(totalSpent)}
          </span>
        </div>

        {/* Categories List */}
        <div className="space-y-2.5 pt-1">
          {breakdown.filter((b) => b.totalSpent > 0).length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">
              No expenditures recorded today yet.
            </p>
          ) : (
            breakdown
              .filter((b) => b.totalSpent > 0)
              .map((item) => (
                <div
                  key={item.category}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {item.displayName}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {item.count} {item.count === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white block whitespace-nowrap">
                        {currencySymbol}{SpendingCalculator.formatExactDecimal(item.totalSpent)}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block whitespace-nowrap">
                        {item.percentage}% of total
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))
          )}
        </div>

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
