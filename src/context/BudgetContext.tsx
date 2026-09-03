import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppNavTab,
  AppPreferences,
  AppScreenStage,
  BudgetProfile,
  ExpenseCategory,
  ExpenseItem,
  SalaryCycleSummary,
  SpendingMood,
} from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { defaultPreferences, LocalStorageManager } from '../lib/storage';

interface BudgetContextType {
  stage: AppScreenStage;
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  setStage: (stage: AppScreenStage) => void;
  profile: BudgetProfile | null;
  expenses: ExpenseItem[];
  preferences: AppPreferences;
  isDark: boolean;
  todayDateString: string;
  yesterdayDateString: string;
  todayFormatted: string;
  // Derived state
  todayAllowance: number;
  todayActualSpent: number;
  todayLeftToSpend: number;
  safeToSpendToday: number;
  tomorrowTarget: number;
  daysUntilPayday: number;
  daysUntilPaydayText: string;
  spendingMood: SpendingMood;
  salaryCycleSummary: SalaryCycleSummary | null;
  todayExpenses: ExpenseItem[];
  delayedExpenses: ExpenseItem[];
  needsYesterdayConfirmation: boolean;
  // Actions
  saveBudgetProfile: (profile: BudgetProfile) => void;
  updateUserName: (name: string) => void;
  addExpense: (
    amount: number,
    description: string,
    timeFormatted: string,
    category: ExpenseCategory
  ) => void;
  updateExpense: (expense: ExpenseItem) => void;
  deleteExpense: (id: number) => void;
  delayExpense: (id: number) => void;
  restoreExpense: (id: number) => void;
  confirmZeroSpend: (dateStr: string) => void;
  toggleDarkMode: () => void;
  setDailyReminder: (enabled: boolean) => void;
  resetAllData: () => void;
  loadDemoData: () => void;
  exportBackup: () => void;
  importBackup: (jsonString: string) => { success: boolean; message: string };
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<BudgetProfile | null>(() =>
    LocalStorageManager.getProfile()
  );
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    LocalStorageManager.getExpenses()
  );
  const [preferences, setPreferences] = useState<AppPreferences>(() =>
    LocalStorageManager.getPreferences()
  );
  const [stage, setStage] = useState<AppScreenStage>(() => {
    const saved = LocalStorageManager.getProfile();
    return saved ? 'MAIN' : 'WELCOME';
  });
  const [activeTab, setActiveTab] = useState<AppNavTab>('DAILY');
  const [confirmedZeroDays, setConfirmedZeroDays] = useState<string[]>(() =>
    LocalStorageManager.getConfirmedZeroDays()
  );

  // Ensure schema versioning and run any necessary migrations on load
  useEffect(() => {
    LocalStorageManager.ensureSchemaVersion();
  }, []);

  // Sync HTML Dark mode class on document.documentElement
  const isDark = preferences.theme === 'dark';
  useEffect(() => {
    LocalStorageManager.applyThemeToDOM(preferences.theme);
  }, [preferences.theme]);

  // Today & Yesterday dates
  const todayDate = useMemo(() => new Date(), []);
  const todayDateString = useMemo(() => SpendingCalculator.formatDate(todayDate), [todayDate]);
  
  const yesterdayDate = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - 1);
    return d;
  }, [todayDate]);
  const yesterdayDateString = useMemo(
    () => SpendingCalculator.formatDate(yesterdayDate),
    [yesterdayDate]
  );

  const todayFormatted = useMemo(() => {
    return todayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [todayDate]);

  // Filter today's active & delayed expenses
  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => !e.isDelayed && e.dateString === todayDateString)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [expenses, todayDateString]);

  const delayedExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.isDelayed)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [expenses]);

  // Check if yesterday needs zero-spend confirmation
  const needsYesterdayConfirmation = useMemo(() => {
    if (!profile) return false;
    // If yesterday is before salary date, don't ask
    if (yesterdayDateString < profile.salaryDateString) return false;
    // If already confirmed zero spend
    if (confirmedZeroDays.includes(yesterdayDateString)) return false;
    // If user has expenses recorded yesterday, don't ask
    const yesterdaySpent = expenses.filter(
      (e) => !e.isDelayed && e.dateString === yesterdayDateString
    );
    return yesterdaySpent.length === 0;
  }, [profile, yesterdayDateString, confirmedZeroDays, expenses]);

  // Derived financial metrics
  const salaryCycleSummary = useMemo(() => {
    if (!profile) return null;
    return SpendingCalculator.calculateSalaryCycleSummary(profile, expenses, todayDateString);
  }, [profile, expenses, todayDateString]);

  const daysUntilPayday = salaryCycleSummary?.daysRemaining ?? 0;
  const daysUntilPaydayText = useMemo(() => {
    if (!profile) return '';
    if (daysUntilPayday <= 0) return 'Payday is today 🎉';
    if (daysUntilPayday === 1) return 'Payday is tomorrow 🚀';
    return `${daysUntilPayday} days until payday`;
  }, [profile, daysUntilPayday]);

  const todayActualSpent = useMemo(() => {
    return todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [todayExpenses]);

  const pastSpendingInCycle = useMemo(() => {
    if (!profile) return 0;
    return SpendingCalculator.calculatePastSpendingInCycle(
      expenses,
      profile.salaryDateString,
      todayDateString
    );
  }, [profile, expenses, todayDateString]);

  const todayAllowance = useMemo(() => {
    if (!profile) return 0;
    return SpendingCalculator.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      pastSpendingInCycle,
      daysUntilPayday
    );
  }, [profile, pastSpendingInCycle, daysUntilPayday]);

  const todayLeftToSpend = useMemo(() => {
    return SpendingCalculator.calculateTodayLeftToSpend(todayAllowance, todayActualSpent);
  }, [todayAllowance, todayActualSpent]);

  const safeToSpendToday = useMemo(() => {
    return Math.max(0, todayLeftToSpend);
  }, [todayLeftToSpend]);

  const tomorrowTarget = useMemo(() => {
    if (!profile) return 0;
    return SpendingCalculator.calculateTomorrowTarget(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      pastSpendingInCycle,
      todayActualSpent,
      daysUntilPayday
    );
  }, [profile, pastSpendingInCycle, todayActualSpent, daysUntilPayday]);

  const spendingMood = useMemo(() => {
    return SpendingCalculator.evaluateSpendingMood(
      todayLeftToSpend,
      todayAllowance,
      todayActualSpent,
      salaryCycleSummary,
      profile?.currencySymbol ?? 'GH₵'
    );
  }, [todayLeftToSpend, todayAllowance, todayActualSpent, salaryCycleSummary, profile]);

  // Actions
  const saveBudgetProfile = (newProfile: BudgetProfile) => {
    setProfile(newProfile);
    LocalStorageManager.saveProfile(newProfile);
    const updatedPrefs = { ...preferences, hasCompletedOnboarding: true };
    setPreferences(updatedPrefs);
    LocalStorageManager.savePreferences(updatedPrefs);
    setStage('MAIN');
  };

  const updateUserName = (name: string) => {
    if (!profile) return;
    const updated = { ...profile, userName: name };
    setProfile(updated);
    LocalStorageManager.saveProfile(updated);
  };

  const addExpense = (
    amount: number,
    description: string,
    timeFormatted: string,
    category: ExpenseCategory
  ) => {
    const newItem: ExpenseItem = {
      id: Date.now(),
      amount,
      description: description.trim() || category,
      category,
      dateString: todayDateString,
      timeFormatted: timeFormatted || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDelayed: false,
      createdAt: Date.now(),
    };
    const updated = [newItem, ...expenses];
    setExpenses(updated);
    LocalStorageManager.saveExpenses(updated);
  };

  const updateExpense = (updatedExpense: ExpenseItem) => {
    const updated = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    setExpenses(updated);
    LocalStorageManager.saveExpenses(updated);
  };

  const deleteExpense = (id: number) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    LocalStorageManager.saveExpenses(updated);
  };

  const delayExpense = (id: number) => {
    const updated = expenses.map((e) => (e.id === id ? { ...e, isDelayed: true } : e));
    setExpenses(updated);
    LocalStorageManager.saveExpenses(updated);
  };

  const restoreExpense = (id: number) => {
    const updated = expenses.map((e) =>
      e.id === id
        ? {
            ...e,
            isDelayed: false,
            dateString: todayDateString,
            timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        : e
    );
    setExpenses(updated);
    LocalStorageManager.saveExpenses(updated);
  };

  const confirmZeroSpend = (dateStr: string) => {
    LocalStorageManager.addConfirmedZeroDay(dateStr);
    setConfirmedZeroDays((prev) => [...prev, dateStr]);
  };

  const toggleDarkMode = () => {
    const nextTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    const updated: AppPreferences = { ...preferences, theme: nextTheme };
    LocalStorageManager.applyThemeToDOM(nextTheme, true);
    setPreferences(updated);
    LocalStorageManager.savePreferences(updated);
  };

  const setDailyReminder = (enabled: boolean) => {
    const updated: AppPreferences = { ...preferences, dailyReminderEnabled: enabled };
    setPreferences(updated);
    LocalStorageManager.savePreferences(updated);
  };

  const resetAllData = () => {
    LocalStorageManager.clearAll();
    setProfile(null);
    setExpenses([]);
    setConfirmedZeroDays([]);
    setStage('WELCOME');
    setActiveTab('DAILY');
  };

  const loadDemoData = () => {
    const { profile: demoProf, expenses: demoExp } = LocalStorageManager.seedDemoData();
    setProfile(demoProf);
    setExpenses(demoExp);
    setStage('MAIN');
  };

  const exportBackup = () => {
    LocalStorageManager.downloadBackupFile();
  };

  const importBackup = (jsonString: string): { success: boolean; message: string } => {
    const validation = LocalStorageManager.validateBackupString(jsonString);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        message: validation.error || 'Invalid backup format. Your existing data was not changed.',
      };
    }

    try {
      const backup = validation.data;
      LocalStorageManager.restoreBackup(backup);

      // Refresh in-memory React state so the UI updates immediately
      setProfile(backup.profile);
      setExpenses(backup.expenses);
      setPreferences(backup.preferences);
      setConfirmedZeroDays(backup.confirmedZeroDays);

      if (backup.profile) {
        setStage('MAIN');
      } else {
        setStage('WELCOME');
      }

      return {
        success: true,
        message: 'Backup restored successfully!',
      };
    } catch (err) {
      return {
        success: false,
        message: `Failed to restore backup: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        stage,
        activeTab,
        setActiveTab,
        setStage,
        profile,
        expenses,
        preferences,
        isDark,
        todayDateString,
        yesterdayDateString,
        todayFormatted,
        todayAllowance,
        todayActualSpent,
        todayLeftToSpend,
        safeToSpendToday,
        tomorrowTarget,
        daysUntilPayday,
        daysUntilPaydayText,
        spendingMood,
        salaryCycleSummary,
        todayExpenses,
        delayedExpenses,
        needsYesterdayConfirmation,
        saveBudgetProfile,
        updateUserName,
        addExpense,
        updateExpense,
        deleteExpense,
        delayExpense,
        restoreExpense,
        confirmZeroSpend,
        toggleDarkMode,
        setDailyReminder,
        resetAllData,
        loadDemoData,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};
