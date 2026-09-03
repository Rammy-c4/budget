import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { CATEGORIES, ExpenseItem } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { AddExpenseSheet } from './AddExpenseSheet';
import { EditExpenseSheet } from './EditExpenseSheet';
import { BreakdownSheet } from './BreakdownSheet';
import { DelayedExpensesSheet } from './DelayedExpensesSheet';
import { SettingsDialog } from './SettingsDialog';
import { EditNameDialog } from './EditNameDialog';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { ThemeToggle } from './ThemeToggle';
import { AnimatedAmount } from './AnimatedAmount';
import { motion } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  PieChart,
  Plus,
  Settings,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';

export const HomeScreen: React.FC<{ onOpenEditBudget: () => void }> = ({
  onOpenEditBudget,
}) => {
  const {
    profile,
    todayFormatted,
    todayAllowance,
    todayActualSpent,
    todayLeftToSpend,
    safeToSpendToday,
    tomorrowTarget,
    daysUntilPaydayText,
    spendingMood,
    todayExpenses,
    delayedExpenses,
    needsYesterdayConfirmation,
    yesterdayDateString,
    addExpense,
    updateExpense,
    deleteExpense,
    delayExpense,
    restoreExpense,
    confirmZeroSpend,
    isDark,
    toggleDarkMode,
    preferences,
    setDailyReminder,
    updateUserName,
    resetAllData,
  } = useBudget();

  // Modals state
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<ExpenseItem | null>(null);
  const [showBreakdownSheet, setShowBreakdownSheet] = useState(false);
  const [showDelayedSheet, setShowDelayedSheet] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);

  if (!profile) return null;

  const currencySymbol = profile.currencySymbol;
  const isOverBudget = todayLeftToSpend < 0;

  // Dynamic hero card styling based on mood
  const heroStyles = {
    AHEAD_OF_GOAL: {
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
      amountColor: 'text-emerald-700 dark:text-emerald-400',
    },
    EXCELLENT: {
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      border: 'border-indigo-200/80 dark:border-indigo-800/50',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200',
      amountColor: 'text-indigo-900 dark:text-indigo-200',
    },
    ON_TRACK: {
      bg: 'bg-slate-50/90 dark:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700/80',
      badgeBg: 'bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
      amountColor: 'text-slate-900 dark:text-white',
    },
    GETTING_CLOSE: {
      bg: 'bg-amber-50/80 dark:bg-amber-950/30',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
      amountColor: 'text-amber-800 dark:text-amber-300',
    },
    OVER_BUDGET: {
      bg: 'bg-red-50/80 dark:bg-red-950/30',
      border: 'border-red-200/80 dark:border-red-800/50',
      badgeBg: 'bg-red-100 dark:bg-red-900/60 text-red-900 dark:text-red-200',
      amountColor: 'text-red-600 dark:text-red-400',
    },
  }[spendingMood.type];

  // Allowance percentage spent
  const spentPct = todayAllowance > 0 ? Math.min(100, Math.round((todayActualSpent / todayAllowance) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#FBFBFE] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] pb-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-black tracking-tight text-[#1E1B4B] dark:text-white">
            Rammys Spend Tracker
          </h1>

          <div className="flex items-center gap-1.5">
            {delayedExpenses.length > 0 && (
              <button
                onClick={() => setShowDelayedSheet(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition cursor-pointer"
                title="View Delayed Expenses"
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span>{delayedExpenses.length}</span>
              </button>
            )}

            <ThemeToggle />

            <button
              onClick={() => setShowSettingsDialog(true)}
              className="p-1.5 rounded-full text-[#1E1B4B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
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
        {/* 1. Greeting & Date Header */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-xl font-black text-[#1E1B4B] dark:text-white tracking-tight">
              Hello, {profile.userName.trim().toLowerCase() || 'rammy'} 👋
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {todayFormatted}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowEditNameDialog(true)}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-[#1E1B4B] dark:text-indigo-200 font-bold text-sm shadow-2xs hover:scale-105 transition cursor-pointer"
            title="Edit User Name"
          >
            {profile.userName.trim().charAt(0).toUpperCase() || 'R'}
          </motion.button>
        </motion.div>

        {/* 2. Hero Daily Spending Card (Matching Screenshot 2) */}
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
          {/* Card Top Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1E1B4B] dark:text-indigo-300" />
              <span className="text-xs font-bold text-[#1E1B4B] dark:text-white">
                Today&apos;s Spending
              </span>
            </div>

            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-[#2E1065] dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-900/50">
              {spendingMood.badgeLabel}
            </span>
          </div>

          {/* Emoji Avatar & Recommended Today Amount */}
          <div className="text-center py-1">
            <div className="w-20 h-20 rounded-full border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-center text-4xl mx-auto shadow-2xs mb-3">
              {spendingMood.emoji}
            </div>

            <AnimatedAmount
              amount={todayLeftToSpend}
              currencySymbol={currencySymbol}
              isOverBudget={isOverBudget}
              className={`text-4xl font-black tracking-tight block ${
                isOverBudget
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#1E1B4B] dark:text-white'
              }`}
            />

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 block">
              Recommended today
            </span>
          </div>

          {/* Bottom Motivational Quote */}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center font-normal pt-1">
            &ldquo;{spendingMood.headline || spendingMood.message || "You're ahead of your savings goal!"}&rdquo;
          </p>
        </motion.div>

        {/* 3. Prominent "+ Add Expense" Button */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            onClick={() => setShowAddSheet(true)}
            className="w-full py-4 rounded-2xl bg-[#120E3D] hover:bg-[#1a1554] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </motion.button>
        </motion.div>

        {/* 4. Tomorrow & Payday Info Line */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="text-center py-1"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tomorrow: <strong className="text-slate-700 dark:text-slate-200 font-bold">{currencySymbol}{SpendingCalculator.formatExactDecimal(tomorrowTarget)}</strong>
            {daysUntilPaydayText && (
              <>
                <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                <span>{daysUntilPaydayText}</span>
              </>
            )}
          </p>
        </motion.div>

        {/* 5. Yesterday Zero Spend Prompt (if needed) */}
        {needsYesterdayConfirmation && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
              },
            }}
            className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Did you spend anything yesterday?</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No expenses were recorded for {yesterdayDateString}.
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => confirmZeroSpend(yesterdayDateString)}
              className="px-3 py-1.5 rounded-xl bg-[#120E3D] hover:bg-indigo-900 text-white text-xs font-bold transition cursor-pointer"
            >
              No spending yesterday 🎉
            </motion.button>
          </motion.div>
        )}

        {/* 6. Today's Expenses Section */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.28, ease: [0.25, 1, 0.5, 1] },
            },
          }}
          className="space-y-3 pt-1"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
              Today&apos;s Expenses
            </h3>

            {todayExpenses.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBreakdownSheet(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>{todayExpenses.length} logged</span>
              </motion.button>
            )}
          </div>

          {/* List or Empty State (Matching Screenshot 2) */}
          {todayExpenses.length === 0 ? (
            <div className="py-12 px-4 rounded-3xl bg-transparent text-center space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No expenses recorded today yet.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Tap + Add Expense above to record your first spend.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayExpenses.map((expense) => {
                const meta = CATEGORIES[expense.category] || CATEGORIES.OTHER;

                return (
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.1 }}
                    key={expense.id}
                    onClick={() => setSelectedExpenseForEdit(expense)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xs hover:border-indigo-200 transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: meta.lightBg }}
                      >
                        {meta.emoji}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">
                          {expense.description}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="truncate">{meta.displayName}</span>
                          <span>•</span>
                          <span className="shrink-0">{expense.timeFormatted}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {currencySymbol}{SpendingCalculator.formatExactDecimal(expense.amount)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.main>

      {/* Sheets and Modals */}
      <AddExpenseSheet
        currencySymbol={currencySymbol}
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={addExpense}
      />

      <EditExpenseSheet
        expense={selectedExpenseForEdit}
        currencySymbol={currencySymbol}
        isOpen={!!selectedExpenseForEdit}
        onClose={() => setSelectedExpenseForEdit(null)}
        onSave={updateExpense}
        onDelay={delayExpense}
        onDelete={deleteExpense}
      />

      <BreakdownSheet
        expenses={todayExpenses}
        currencySymbol={currencySymbol}
        isOpen={showBreakdownSheet}
        onClose={() => setShowBreakdownSheet(false)}
      />

      <DelayedExpensesSheet
        delayedExpenses={delayedExpenses}
        currencySymbol={currencySymbol}
        isOpen={showDelayedSheet}
        onClose={() => setShowDelayedSheet(false)}
        onRestore={restoreExpense}
        onDelete={deleteExpense}
      />

      <SettingsDialog
        isOpen={showSettingsDialog}
        profile={profile}
        isDark={isDark}
        dailyReminderEnabled={preferences.dailyReminderEnabled}
        onClose={() => setShowSettingsDialog(false)}
        onToggleDarkMode={toggleDarkMode}
        onToggleReminder={setDailyReminder}
        onOpenEditBudget={() => {
          setShowSettingsDialog(false);
          onOpenEditBudget();
        }}
        onOpenEditName={() => {
          setShowSettingsDialog(false);
          setShowEditNameDialog(true);
        }}
        onOpenResetConfirm={() => {
          setShowSettingsDialog(false);
          setShowResetConfirmDialog(true);
        }}
      />

      <EditNameDialog
        isOpen={showEditNameDialog}
        currentName={profile.userName}
        onClose={() => setShowEditNameDialog(false)}
        onSave={updateUserName}
      />

      <ResetConfirmDialog
        isOpen={showResetConfirmDialog}
        onClose={() => setShowResetConfirmDialog(false)}
        onConfirm={resetAllData}
      />
    </div>
  );
};
