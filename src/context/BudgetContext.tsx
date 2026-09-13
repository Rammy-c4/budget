import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AdditionalMoneyItem,
  AppNavTab,
  AppPreferences,
  AppScreenStage,
  BudgetProfile,
  ExpenseCategory,
  ExpenseItem,
  NotificationPreferences,
  SalaryCycleSummary,
  SpendingMood,
} from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { defaultNotificationPreferences, defaultPreferences, LocalStorageManager } from '../lib/storage';
import { checkAndDispatchScheduledNotifications } from '../lib/notifications';

interface BudgetContextType {
  stage: AppScreenStage;
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  setStage: (stage: AppScreenStage) => void;
  profile: BudgetProfile | null;
  expenses: ExpenseItem[];
  additionalMoney: AdditionalMoneyItem[];
  totalAdditionalMoneyInCycle: number;
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
  daysRemainingInBudget: number;
  daysRemainingText: string;
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
    category: ExpenseCategory,
    dateString?: string
  ) => void;
  updateExpense: (expense: ExpenseItem) => void;
  deleteExpense: (id: number) => void;
  addAdditionalMoney: (
    amount: number,
    description?: string,
    dateString?: string
  ) => void;
  deleteAdditionalMoney: (id: number) => void;
  delayExpense: (id: number) => void;
  restoreExpense: (id: number) => void;
  confirmZeroSpend: (dateStr: string) => void;
  toggleDarkMode: () => void;
  setDailyReminder: (enabled: boolean) => void;
  updateNotificationPreferences: (
    prefs: Partial<NotificationPreferences>
  ) => void;
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
  const [additionalMoney, setAdditionalMoney] = useState<AdditionalMoneyItem[]>(() =>
    LocalStorageManager.getAdditionalMoney()
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
  const totalAdditionalMoneyInCycle = useMemo(() => {
    if (!profile) return 0;
    return additionalMoney
      .filter(
        (m) =>
          m.dateString >= profile.salaryDateString &&
          m.dateString <= profile.nextSalaryDateString
      )
      .reduce((sum, m) => sum + m.amount, 0);
  }, [profile, additionalMoney]);

  const additionalMoneyUpToToday = useMemo(() => {
    if (!profile) return 0;
    return SpendingCalculator.calculateAdditionalMoneyUpToDate(
      additionalMoney,
      profile.salaryDateString,
      todayDateString
    );
  }, [profile, additionalMoney, todayDateString]);

  const salaryCycleSummary = useMemo(() => {
    if (!profile) return null;
    return SpendingCalculator.calculateSalaryCycleSummary(
      profile,
      expenses,
      todayDateString,
      additionalMoney
    );
  }, [profile, expenses, todayDateString, additionalMoney]);

  const daysUntilPayday = salaryCycleSummary?.daysRemaining ?? 0;
  const daysUntilPaydayText = useMemo(() => {
    if (!profile) return '';
    if (daysUntilPayday <= 0) return 'Budget cycle ends today 🎉';
    if (daysUntilPayday === 1) return 'Last day of budget tomorrow 🚀';
    return `${daysUntilPayday} days remaining in budget`;
  }, [profile, daysUntilPayday]);

  const daysRemainingInBudget = daysUntilPayday;
  const daysRemainingText = daysUntilPaydayText;

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
    const hasSavings = profile.hasSavingsGoal !== false;
    return SpendingCalculator.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      pastSpendingInCycle,
      daysUntilPayday,
      hasSavings,
      additionalMoneyUpToToday
    );
  }, [profile, pastSpendingInCycle, daysUntilPayday, additionalMoneyUpToToday]);

  const todayLeftToSpend = useMemo(() => {
    return SpendingCalculator.calculateTodayLeftToSpend(todayAllowance, todayActualSpent);
  }, [todayAllowance, todayActualSpent]);

  const safeToSpendToday = useMemo(() => {
    return Math.max(0, todayLeftToSpend);
  }, [todayLeftToSpend]);

  const tomorrowTarget = useMemo(() => {
    if (!profile) return 0;
    const hasSavings = profile.hasSavingsGoal !== false;
    return SpendingCalculator.calculateTomorrowTarget(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      pastSpendingInCycle,
      todayActualSpent,
      daysUntilPayday,
      hasSavings,
      additionalMoneyUpToToday
    );
  }, [profile, pastSpendingInCycle, todayActualSpent, daysUntilPayday, additionalMoneyUpToToday]);

  const spendingMood = useMemo(() => {
    const hasSavings = profile?.hasSavingsGoal !== false;
    return SpendingCalculator.evaluateSpendingMood(
      todayLeftToSpend,
      todayAllowance,
      todayActualSpent,
      salaryCycleSummary,
      profile?.currencySymbol ?? 'GH₵',
      hasSavings
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
    category: ExpenseCategory,
    dateString?: string
  ) => {
    const targetDate = dateString || todayDateString;
    const newItem: ExpenseItem = {
      id: Date.now(),
      amount,
      description: description.trim() || category,
      category,
      dateString: targetDate,
      timeFormatted:
        timeFormatted ||
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const addAdditionalMoney = (
    amount: number,
    description?: string,
    dateString?: string
  ) => {
    const targetDate = dateString || todayDateString;
    const newItem: AdditionalMoneyItem = {
      id: Date.now(),
      amount,
      description: description?.trim() || undefined,
      dateString: targetDate,
      createdAt: Date.now(),
    };
    const updated = [newItem, ...additionalMoney];
    setAdditionalMoney(updated);
    LocalStorageManager.saveAdditionalMoney(updated);
  };

  const deleteAdditionalMoney = (id: number) => {
    const updated = additionalMoney.filter((m) => m.id !== id);
    setAdditionalMoney(updated);
    LocalStorageManager.saveAdditionalMoney(updated);
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
    const currentNotifs =
      preferences.notifications || { ...defaultNotificationPreferences };
    const mergedNotifs: NotificationPreferences = {
      ...currentNotifs,
      enabled: enabled || currentNotifs.enabled,
      dailyBudgetReminder: enabled,
    };
    const updated: AppPreferences = {
      ...preferences,
      dailyReminderEnabled: enabled,
      notifications: mergedNotifs,
    };
    setPreferences(updated);
    LocalStorageManager.savePreferences(updated);
  };

  const updateNotificationPreferences = (
    updatedNotificationPrefs: Partial<NotificationPreferences>
  ) => {
    const currentNotifs =
      preferences.notifications || { ...defaultNotificationPreferences };
    const mergedNotifs: NotificationPreferences = {
      ...currentNotifs,
      ...updatedNotificationPrefs,
    };
    const updated: AppPreferences = {
      ...preferences,
      notifications: mergedNotifs,
      dailyReminderEnabled: Boolean(
        mergedNotifs.enabled && mergedNotifs.dailyBudgetReminder
      ),
    };
    setPreferences(updated);
    LocalStorageManager.savePreferences(updated);
  };

  // Notification scheduler: evaluates daily reminder, expense reminder, and budget warnings
  useEffect(() => {
    if (!profile || !preferences.notifications?.enabled) {
      return;
    }

    const runCheck = () => {
      checkAndDispatchScheduledNotifications({
        profile,
        expenses,
        additionalMoney,
        confirmedZeroDays,
        preferences: preferences.notifications || defaultNotificationPreferences,
      });
    };

    runCheck();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(runCheck, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [
    profile,
    expenses,
    additionalMoney,
    confirmedZeroDays,
    preferences.notifications,
  ]);

  const resetAllData = () => {
    LocalStorageManager.clearAll();
    setProfile(null);
    setExpenses([]);
    setAdditionalMoney([]);
    setConfirmedZeroDays([]);
    setStage('WELCOME');
    setActiveTab('DAILY');
  };

  const loadDemoData = () => {
    const { profile: demoProf, expenses: demoExp } = LocalStorageManager.seedDemoData();
    setProfile(demoProf);
    setExpenses(demoExp);
    setAdditionalMoney([]);
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
      setAdditionalMoney(backup.additionalMoney || []);
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
        additionalMoney,
        totalAdditionalMoneyInCycle,
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
        daysRemainingInBudget,
        daysRemainingText,
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
        addAdditionalMoney,
        deleteAdditionalMoney,
        delayExpense,
        restoreExpense,
        confirmZeroSpend,
        toggleDarkMode,
        setDailyReminder,
        updateNotificationPreferences,
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
