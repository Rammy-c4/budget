import React, { useMemo, useState } from 'react';
import { BudgetProfile } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { motion } from 'motion/react';

interface SetupScreenProps {
  initialProfile?: BudgetProfile | null;
  initialUserName?: string;
  onSave: (profile: BudgetProfile) => void;
  onBack?: () => void;
  isEditing?: boolean;
}

// Format "YYYY-MM-DD" to "D MMMM YYYY" (e.g. "3 September 2026")
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  initialProfile,
  initialUserName = '',
  onSave,
  onBack,
  isEditing = false,
}) => {
  // Default values matching user's prototype screenshot if not set
  const [userName, setUserName] = useState(
    initialProfile?.userName || initialUserName || 'rammy'
  );
  const [incomeInput, setIncomeInput] = useState(
    initialProfile?.monthlyIncome ? String(initialProfile.monthlyIncome) : '2100'
  );
  const [savingsInput, setSavingsInput] = useState(
    initialProfile?.monthlySavingsGoal ? String(initialProfile.monthlySavingsGoal) : '600'
  );

  // Default salary dates
  const defaultSalaryDate = useMemo(() => {
    if (initialProfile?.salaryDateString) return initialProfile.salaryDateString;
    return '2026-09-03';
  }, [initialProfile]);

  const defaultNextSalaryDate = useMemo(() => {
    if (initialProfile?.nextSalaryDateString) return initialProfile.nextSalaryDateString;
    return '2026-10-03';
  }, [initialProfile]);

  const [salaryDate, setSalaryDate] = useState(defaultSalaryDate);
  const [nextSalaryDate, setNextSalaryDate] = useState(defaultNextSalaryDate);
  const [errorMessage, setErrorMessage] = useState('');

  // Currency fixed to GH₵ matching Ghanaian Cedi app prototype
  const currencySymbol = 'GH₵';

  const numericIncome = parseFloat(incomeInput) || 0;
  const numericSavings = parseFloat(savingsInput) || 0;

  // Real-time calculation preview
  const cycleDays = useMemo(() => {
    if (!salaryDate || !nextSalaryDate) return 0;
    return SpendingCalculator.calculateCycleDays(salaryDate, nextSalaryDate);
  }, [salaryDate, nextSalaryDate]);

  const spendablePool = useMemo(() => {
    return Math.max(0, numericIncome - numericSavings);
  }, [numericIncome, numericSavings]);

  const previewDailyAllowance = useMemo(() => {
    if (cycleDays <= 0 || spendablePool <= 0) return 0;
    return Math.round((spendablePool / cycleDays) * 100) / 100;
  }, [spendablePool, cycleDays]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (numericIncome <= 0) {
      setErrorMessage('Please enter a valid salary amount.');
      return;
    }

    if (numericSavings < 0) {
      setErrorMessage('Savings target cannot be negative.');
      return;
    }

    if (numericSavings >= numericIncome) {
      setErrorMessage('Savings target cannot equal or exceed your entire salary.');
      return;
    }

    if (!salaryDate || !nextSalaryDate) {
      setErrorMessage('Please select both salary dates.');
      return;
    }

    if (nextSalaryDate <= salaryDate) {
      setErrorMessage('Expected next salary date must be after salary received date.');
      return;
    }

    setErrorMessage('');

    const newProfile: BudgetProfile = {
      id: initialProfile?.id || 1,
      userName: userName.trim(),
      currencySymbol,
      monthlyIncome: numericIncome,
      monthlySavingsGoal: numericSavings,
      salaryDateString: salaryDate,
      nextSalaryDateString: nextSalaryDate,
      updatedAt: new Date().toISOString(),
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
    };

    onSave(newProfile);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)]">
      <div className="max-w-md mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 -ml-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-black text-[#1E1B4B] dark:text-white tracking-tight">
              {isEditing ? 'Edit Budget Parameters' : 'Salary & Budget Setup'}
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Section Subheading */}
        <div>
          <h2 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
            Budget Setup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Tell us when you receive your salary and how much you plan to save. We&apos;ll recommend how much you can spend each day.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Field 1: What should we call you? */}
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100">
            <label
              htmlFor="setup-user-name"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              What should we call you?
            </label>
            <input
              id="setup-user-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="rammy"
              className="w-full text-sm font-bold text-[#1E1B4B] dark:text-white bg-transparent outline-none mt-0.5"
              required
            />
          </div>

          {/* Field 2: Salary Amount */}
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100">
            <label
              htmlFor="setup-income"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Salary Amount
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                {currencySymbol}
              </span>
              <input
                id="setup-income"
                type="number"
                min="1"
                step="any"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                placeholder="2100"
                className="w-full text-sm font-bold text-[#1E1B4B] dark:text-white bg-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Field 3: Salary Received Date */}
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs">
            <label
              htmlFor="setup-salary-date"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Salary Received Date
            </label>
            <div className="flex items-center justify-between mt-0.5 relative">
              <span className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                {formatDisplayDate(salaryDate)}
              </span>
              <Calendar className="w-4 h-4 text-[#1E1B4B] dark:text-indigo-300 pointer-events-none" />
              <input
                id="setup-salary-date"
                type="date"
                value={salaryDate}
                onChange={(e) => setSalaryDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
            </div>
          </div>

          {/* Field 4: Expected Next Salary Date */}
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs">
            <label
              htmlFor="setup-next-salary-date"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Expected Next Salary Date
            </label>
            <div className="flex items-center justify-between mt-0.5 relative">
              <span className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                {formatDisplayDate(nextSalaryDate)}
              </span>
              <Calendar className="w-4 h-4 text-[#1E1B4B] dark:text-indigo-300 pointer-events-none" />
              <input
                id="setup-next-salary-date"
                type="date"
                value={nextSalaryDate}
                onChange={(e) => setNextSalaryDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                required
              />
            </div>
          </div>

          {/* Field 5: Savings Target for this Cycle */}
          <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100">
            <label
              htmlFor="setup-savings"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Savings Target for this Cycle
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-[#1E1B4B] dark:text-white">
                {currencySymbol}
              </span>
              <input
                id="setup-savings"
                type="number"
                min="0"
                step="any"
                value={savingsInput}
                onChange={(e) => setSavingsInput(e.target.value)}
                placeholder="600"
                className="w-full text-sm font-bold text-[#1E1B4B] dark:text-white bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs space-y-3">
            <div>
              <span className="text-xs font-bold text-[#1E1B4B] dark:text-indigo-200 block">
                Today&apos;s Recommended Spending
              </span>
              <span className="text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight mt-1 block">
                {currencySymbol}{SpendingCalculator.formatExactDecimal(previewDailyAllowance)}
              </span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Available for spending
                </span>
                <span className="font-bold text-[#1E1B4B] dark:text-white">
                  {currencySymbol}{SpendingCalculator.formatAmount(spendablePool)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Duration
                </span>
                <span className="font-bold text-[#1E1B4B] dark:text-white">
                  {cycleDays} days
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            id="setup-save-button"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#120E3D] hover:bg-[#1a1554] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            <span>{isEditing ? 'Save Changes' : 'Start Tracking'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};

