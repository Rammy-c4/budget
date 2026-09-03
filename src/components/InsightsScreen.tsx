import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { CATEGORIES } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { motion } from 'motion/react';

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export const InsightsScreen: React.FC = () => {
  const { profile, expenses, todayDateString, salaryCycleSummary, todayAllowance } = useBudget();

  if (!profile) return null;
  const currencySymbol = profile.currencySymbol;

  // Active non-delayed expenses for this salary cycle
  const cycleExpenses = useMemo(() => {
    return expenses.filter(
      (e) =>
        !e.isDelayed &&
        e.dateString >= profile.salaryDateString &&
        e.dateString <= todayDateString
    );
  }, [expenses, profile, todayDateString]);

  const cycleSpendable = salaryCycleSummary?.spendablePool ?? Math.max(0, profile.monthlyIncome - profile.monthlySavingsGoal);
  const cycleSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);

  const cycleDaysTotal = salaryCycleSummary?.totalCycleDays ?? 30;
  const cycleDaysPassed = salaryCycleSummary?.daysPassed ?? 1;

  // Last 7 days trend bar data
  const last7DaysTrend = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = SpendingCalculator.formatDate(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayExpenses = expenses.filter(
        (e) => !e.isDelayed && e.dateString === dateStr
      );
      const spent = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      result.push({
        dateStr,
        dayLabel,
        spent,
        isToday: dateStr === todayDateString,
      });
    }

    return result;
  }, [expenses, todayDateString]);

  const total7DaysSpent = useMemo(() => {
    return last7DaysTrend.reduce((sum, d) => sum + d.spent, 0);
  }, [last7DaysTrend]);

  const dailyAvgSpent = Math.round((total7DaysSpent / 7) * 100) / 100;

  const maxTrendSpend = useMemo(() => {
    const max = Math.max(...last7DaysTrend.map((d) => d.spent), todayAllowance * 1.2, 10);
    return max;
  }, [last7DaysTrend, todayAllowance]);

  // Projected savings at payday
  const projectedSavingsAtPayday = Math.max(
    0,
    profile.monthlyIncome - cycleSpent
  );
  const isSavingsProtected = projectedSavingsAtPayday >= profile.monthlySavingsGoal;

  // Categories breakdown
  const categoryBreakdown = useMemo(() => {
    return SpendingCalculator.calculateCategoryBreakdown(cycleExpenses);
  }, [cycleExpenses]);

  const cycleSpentPct = cycleSpendable > 0 ? Math.min(100, Math.round((cycleSpent / cycleSpendable) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#FBFBFE] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] pb-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#1E1B4B] dark:text-white tracking-tight">
            Spending Insights
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <motion.main
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
              delayChildren: 0.02,
            },
          },
        }}
        className="max-w-md mx-auto px-5 pt-2 space-y-4"
      >
        {/* Card 1: Pay Cycle Summary (Matching Screenshot 1) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100/90 dark:border-indigo-950 shadow-xs space-y-4"
        >
          <div>
            <h2 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
              Pay Cycle Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {formatShortDate(profile.salaryDateString)} - {formatShortDate(profile.nextSalaryDateString)} (Day {cycleDaysPassed} of {cycleDaysTotal})
            </p>
          </div>

          {/* Cycle Spent Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">
                Cycle Spent
              </span>
              <span className="text-[#1E1B4B] dark:text-white font-bold">
                {currencySymbol}{SpendingCalculator.formatExactDecimal(cycleSpent)} of {currencySymbol}{SpendingCalculator.formatExactDecimal(cycleSpendable)}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, cycleSpentPct)}%` }}
                transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
              />
            </div>
          </div>

          {/* 3 Stats Columns */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">
                Total Budget
              </span>
              <span
                className="text-xs sm:text-sm font-black text-[#1E1B4B] dark:text-white block truncate tabular-nums"
                title={`${currencySymbol}${SpendingCalculator.formatExactDecimal(profile.monthlyIncome)}`}
              >
                {currencySymbol}{SpendingCalculator.formatExactDecimal(profile.monthlyIncome)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">
                Target Savings
              </span>
              <span
                className="text-xs sm:text-sm font-black text-[#1E1B4B] dark:text-white block truncate tabular-nums"
                title={`${currencySymbol}${SpendingCalculator.formatExactDecimal(profile.monthlySavingsGoal)}`}
              >
                {currencySymbol}{SpendingCalculator.formatExactDecimal(profile.monthlySavingsGoal)}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 font-medium block truncate">
                Daily Target
              </span>
              <span
                className="text-xs sm:text-sm font-black text-[#1E1B4B] dark:text-white block truncate tabular-nums"
                title={`${currencySymbol}${SpendingCalculator.formatExactDecimal(todayAllowance)}`}
              >
                {currencySymbol}{SpendingCalculator.formatExactDecimal(todayAllowance)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Savings Projection (Matching Screenshot 1) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100/90 dark:border-indigo-950 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                Savings Projection
              </h3>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
              {isSavingsProtected ? 'Protected' : 'At Risk'}
            </span>
          </div>

          <div className="pt-1">
            <span className="text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight block">
              {currencySymbol}{SpendingCalculator.formatExactDecimal(projectedSavingsAtPayday)}
            </span>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              On track to meet your target of {currencySymbol}{SpendingCalculator.formatExactDecimal(profile.monthlySavingsGoal)}
            </p>
          </div>
        </motion.div>

        {/* Card 3: 7-Day Spending Trend (Matching Screenshot 1) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100/90 dark:border-indigo-950 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
              7-Day Spending Trend
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Daily Avg: {currencySymbol}{SpendingCalculator.formatExactDecimal(dailyAvgSpent)}
            </span>
          </div>

          {/* Bar Chart */}
          <div className="pt-4 pb-1">
            <div className="relative h-32 flex items-end justify-between gap-2 px-1">
              {/* Target Allowance Line */}
              {todayAllowance > 0 && (
                <div
                  className="absolute left-0 right-0 border-b border-dashed border-indigo-300 dark:border-indigo-700 z-10 pointer-events-none flex items-center justify-end"
                  style={{
                    bottom: `${Math.min(90, Math.max(10, (todayAllowance / maxTrendSpend) * 100))}%`,
                  }}
                >
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-white/90 dark:bg-slate-900/90 px-1 rounded">
                    Target {currencySymbol}{SpendingCalculator.formatAmount(todayAllowance)}
                  </span>
                </div>
              )}

              {last7DaysTrend.map((d, idx) => {
                const heightPct = maxTrendSpend > 0 ? Math.min(100, Math.round((d.spent / maxTrendSpend) * 100)) : 0;
                const isOver = d.spent > todayAllowance;

                return (
                  <div key={d.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 whitespace-nowrap">
                      {currencySymbol}{SpendingCalculator.formatAmount(d.spent)}
                    </div>

                    {/* The Bar */}
                    <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-24">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(d.spent > 0 ? 8 : 0, heightPct)}%` }}
                        transition={{ duration: 0.45, delay: idx * 0.04, ease: [0.25, 1, 0.5, 1] }}
                        className={`w-full rounded-t-lg ${
                          isOver
                            ? 'bg-rose-500'
                            : d.isToday
                            ? 'bg-indigo-600'
                            : d.spent > 0
                            ? 'bg-indigo-400'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>

                    {/* Day Label */}
                    <div className="mt-2 text-center">
                      <span
                        className={`text-[11px] font-semibold block ${
                          d.isToday
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {d.dayLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Card 4: Top Categories */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-100/90 dark:border-indigo-950 shadow-xs space-y-3"
        >
          <h3 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
            Top Categories
          </h3>

          {categoryBreakdown.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No expenses recorded yet in this cycle.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const meta = CATEGORIES[cat.category] || CATEGORIES.OTHER;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">{meta.emoji}</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {cat.displayName}
                        </span>
                        <span className="text-slate-400 text-[10px] shrink-0">
                          ({cat.count})
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2 whitespace-nowrap">
                        {currencySymbol}{SpendingCalculator.formatExactDecimal(cat.totalSpent)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, cat.percentage)}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.25, 1, 0.5, 1] }}
                        className="h-full rounded-full bg-indigo-600"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
};
