import React, { useMemo, useState } from 'react';
import { BudgetProfile } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { RammysLogo } from './RammysLogo';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStage, setInitStage] = useState<'ORGANIZING' | 'PREPARING' | 'ACTIVATING' | 'READY'>('ORGANIZING');

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

    // If editing existing budget, save directly
    if (isEditing) {
      onSave(newProfile);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onSave(newProfile);
      return;
    }

    // Full simulated onboarding animation:
    // 1. SALARY + BUDGET -> ORGANIZING (0ms) - Data chips travel toward logo
    // 2. PREPARING YOUR TRACKING PLAN (650ms) - Logo absorbs them (subtle pulse)
    // 3. INITIALIZING -> ACTIVATING DAILY TRACKING SPACE (1250ms) - Logo completes absorption (stronger pulse)
    // 4. TRACKING STARTED -> HOME (1950ms)
    setIsInitializing(true);
    setInitStage('ORGANIZING');

    setTimeout(() => {
      setInitStage('PREPARING');
      haptics.budgetParamAbsorb();
    }, 650);

    setTimeout(() => {
      setInitStage('ACTIVATING');
      haptics.logoAbsorb();
    }, 1250);

    setTimeout(() => {
      setInitStage('READY');
    }, 1700);

    setTimeout(() => {
      onSave(newProfile);
    }, 1950);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-[calc(env(safe-area-inset-bottom,0px)+4.5rem)]">
      <div className="max-w-md mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && !isInitializing && (
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
        {!isInitializing && (
          <div>
            <h2 className="text-sm font-bold text-[#1E1B4B] dark:text-white">
              Budget Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Tell us when you receive your salary and how much you plan to save. We&apos;ll recommend how much you can spend each day.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && !isInitializing && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isInitializing ? (
            <motion.form
              key="setup-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              onSubmit={handleSave}
              className="space-y-4"
            >
              {/* Field 1: What should we call you? */}
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
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
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
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
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
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
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
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
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 pt-2 pb-2.5 shadow-2xs focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-100 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
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
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100/90 dark:border-slate-800 shadow-2xs space-y-3">
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
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#120E3D] hover:bg-[#1a1554] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <span>{isEditing ? 'Save Changes' : 'Start Tracking'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          ) : (
            /* Premium Simulated Onboarding Sequence */
            <motion.div
              key="setup-initializing"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 text-center"
            >
              {/* Central Logo Anchor with Converging Value Chips */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                {/* Converging Value Chip 1: Income */}
                <AnimatePresence>
                  {initStage === 'ORGANIZING' && (
                    <motion.div
                      initial={{ opacity: 0, x: -70, y: -30, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, y: 0, scale: [0.8, 1, 0.4] }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.65, ease: 'easeInOut' }}
                      className="absolute z-20 px-2.5 py-1 rounded-full bg-indigo-900 text-white text-[11px] font-black border border-indigo-400 shadow-md pointer-events-none"
                    >
                      {currencySymbol}{numericIncome}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Converging Value Chip 2: Savings Target */}
                <AnimatePresence>
                  {initStage === 'ORGANIZING' && (
                    <motion.div
                      initial={{ opacity: 0, x: -50, y: 40, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, y: 0, scale: [0.8, 1, 0.4] }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.65, delay: 0.08, ease: 'easeInOut' }}
                      className="absolute z-20 px-2.5 py-1 rounded-full bg-emerald-800 text-white text-[11px] font-black border border-emerald-400 shadow-md pointer-events-none"
                    >
                      Save {currencySymbol}{numericSavings}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Converging Value Chip 3: Cycle Days */}
                <AnimatePresence>
                  {initStage === 'ORGANIZING' && (
                    <motion.div
                      initial={{ opacity: 0, x: 60, y: 0, scale: 0.8 }}
                      animate={{ opacity: 1, x: 0, y: 0, scale: [0.8, 1, 0.4] }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ duration: 0.65, delay: 0.12, ease: 'easeInOut' }}
                      className="absolute z-20 px-2.5 py-1 rounded-full bg-amber-800 text-white text-[11px] font-black border border-amber-400 shadow-md pointer-events-none"
                    >
                      {cycleDays} Days
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Central Rammys Logo Anchor */}
                <div className="relative">
                  <RammysLogo
                    size={84}
                    showBrandingText={false}
                    swallowPhase={
                      initStage === 'ORGANIZING'
                        ? 'ANTICIPATE'
                        : initStage === 'PREPARING'
                        ? 'SWALLOW'
                        : 'PULSE'
                    }
                  />
                </div>
              </div>

              {/* Status text */}
              <div className="space-y-1.5 min-h-[50px]">
                <AnimatePresence mode="wait">
                  {initStage === 'ORGANIZING' && (
                    <motion.div
                      key="stg-org"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1"
                    >
                      <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white">
                        Organizing Salary & Budget
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Aligning income of {currencySymbol}{numericIncome} with {currencySymbol}{numericSavings} savings...
                      </p>
                    </motion.div>
                  )}

                  {initStage === 'PREPARING' && (
                    <motion.div
                      key="stg-prep"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1"
                    >
                      <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white">
                        Preparing Daily Tracking Plan
                      </h3>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                        Recommended allowance: {currencySymbol}{SpendingCalculator.formatExactDecimal(previewDailyAllowance)}/day
                      </p>
                    </motion.div>
                  )}

                  {initStage === 'ACTIVATING' && (
                    <motion.div
                      key="stg-act"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="space-y-1"
                    >
                      <h3 className="text-sm font-black text-[#1E1B4B] dark:text-white">
                        Activating Tracking Space
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Initializing {userName.trim()}&apos;s personal dashboard...
                      </p>
                    </motion.div>
                  )}

                  {initStage === 'READY' && (
                    <motion.div
                      key="stg-ready"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-1"
                    >
                      <h3 className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        Tracking Started!
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Opening your daily spend tracker...
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Progress Bar */}
              <div className="w-48 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                <motion.div
                  initial={{ width: '15%' }}
                  animate={{
                    width:
                      initStage === 'ORGANIZING'
                        ? '40%'
                        : initStage === 'PREPARING'
                        ? '75%'
                        : '100%',
                  }}
                  transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                  className={`h-full rounded-full ${
                    initStage === 'READY' ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                />
              </div>

              {/* Parameter Alignment Preview */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-left"
              >
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Daily Target
                  </span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-white">
                    {currencySymbol}{SpendingCalculator.formatExactDecimal(previewDailyAllowance)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Cycle Length
                  </span>
                  <span className="text-xs font-black text-[#1E1B4B] dark:text-white">
                    {cycleDays} Days
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


