import { AppPreferences, BudgetBackupData, BudgetProfile, ExpenseCategory, ExpenseItem } from '../types';
import { SpendingCalculator } from './calculator';

export const CURRENT_STORAGE_SCHEMA_VERSION = 1;

const STORAGE_KEYS = {
  PROFILE: 'local_budget_profile',
  EXPENSES: 'local_budget_expenses',
  PREFERENCES: 'local_budget_preferences',
  THEME: 'theme',
  CONFIRMED_ZERO_DAYS: 'local_budget_confirmed_zero_days',
  SCHEMA_VERSION: 'local_budget_schema_version',
};

export const defaultPreferences: AppPreferences = {
  version: CURRENT_STORAGE_SCHEMA_VERSION,
  dailyReminderEnabled: true,
  theme: 'light',
  hasCompletedOnboarding: false,
};

const VALID_CATEGORIES: ExpenseCategory[] = [
  'FOOD',
  'TRANSPORT',
  'SHOPPING',
  'DRINKS',
  'BILLS',
  'OTHER',
];

export class LocalStorageManager {
  /**
   * Safely parses JSON string with fallback. Never throws.
   */
  private static safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Validates and sanitizes a BudgetProfile object.
   * If the data is completely unusable or corrupted, returns null.
   */
  public static validateProfile(data: unknown): BudgetProfile | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }

    const item = data as Record<string, unknown>;

    // Check essential fields
    const userName =
      typeof item.userName === 'string' && item.userName.trim().length > 0
        ? item.userName.trim()
        : 'Friend';

    const currencySymbol =
      typeof item.currencySymbol === 'string' && item.currencySymbol.trim().length > 0
        ? item.currencySymbol.trim()
        : 'GH₵';

    const monthlyIncome =
      typeof item.monthlyIncome === 'number' &&
      isFinite(item.monthlyIncome) &&
      item.monthlyIncome >= 0
        ? item.monthlyIncome
        : 0;

    const monthlySavingsGoal =
      typeof item.monthlySavingsGoal === 'number' &&
      isFinite(item.monthlySavingsGoal) &&
      item.monthlySavingsGoal >= 0
        ? item.monthlySavingsGoal
        : 0;

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const todayStr = SpendingCalculator.formatDate(new Date());

    const salaryDateString =
      typeof item.salaryDateString === 'string' && dateRegex.test(item.salaryDateString)
        ? item.salaryDateString
        : todayStr;

    let nextSalaryDateString =
      typeof item.nextSalaryDateString === 'string' && dateRegex.test(item.nextSalaryDateString)
        ? item.nextSalaryDateString
        : '';

    if (!nextSalaryDateString) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      nextSalaryDateString = SpendingCalculator.formatDate(nextDate);
    }

    return {
      id: typeof item.id === 'number' ? item.id : undefined,
      userName,
      currencySymbol,
      monthlyIncome,
      monthlySavingsGoal,
      salaryDateString,
      nextSalaryDateString,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    };
  }

  /**
   * Validates and sanitizes an array of ExpenseItems.
   * Drops malformed entries and sanitizes valid entries.
   */
  public static validateExpenses(data: unknown): ExpenseItem[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const validItems: ExpenseItem[] = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const todayStr = SpendingCalculator.formatDate(new Date());

    data.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return;
      }

      const item = entry as Record<string, unknown>;

      const amount =
        typeof item.amount === 'number' && isFinite(item.amount) && item.amount >= 0
          ? item.amount
          : 0;

      // Skip invalid 0 amounts if corrupt
      if (amount <= 0 && (!item.description || typeof item.description !== 'string')) {
        return;
      }

      const category: ExpenseCategory =
        typeof item.category === 'string' &&
        VALID_CATEGORIES.includes(item.category as ExpenseCategory)
          ? (item.category as ExpenseCategory)
          : 'OTHER';

      const description =
        typeof item.description === 'string' && item.description.trim().length > 0
          ? item.description.trim()
          : category;

      const dateString =
        typeof item.dateString === 'string' && dateRegex.test(item.dateString)
          ? item.dateString
          : todayStr;

      const timeFormatted =
        typeof item.timeFormatted === 'string' && item.timeFormatted.trim().length > 0
          ? item.timeFormatted.trim()
          : '12:00 PM';

      const id =
        typeof item.id === 'number' && item.id > 0
          ? item.id
          : Date.now() + idx;

      const createdAt =
        typeof item.createdAt === 'number' && item.createdAt > 0
          ? item.createdAt
          : Date.now() - idx * 1000;

      validItems.push({
        id,
        amount,
        description,
        category,
        dateString,
        timeFormatted,
        isDelayed: Boolean(item.isDelayed),
        createdAt,
      });
    });

    return validItems;
  }

  /**
   * Validates preferences with safe fallbacks.
   */
  public static validatePreferences(data: unknown): AppPreferences {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ...defaultPreferences };
    }

    const item = data as Record<string, unknown>;

    const theme: 'light' | 'dark' =
      item.theme === 'dark' || item.theme === 'light' ? item.theme : 'light';

    const dailyReminderEnabled =
      typeof item.dailyReminderEnabled === 'boolean'
        ? item.dailyReminderEnabled
        : defaultPreferences.dailyReminderEnabled;

    const hasCompletedOnboarding =
      typeof item.hasCompletedOnboarding === 'boolean'
        ? item.hasCompletedOnboarding
        : false;

    const version =
      typeof item.version === 'number' && item.version > 0
        ? item.version
        : CURRENT_STORAGE_SCHEMA_VERSION;

    return {
      version,
      dailyReminderEnabled,
      theme,
      hasCompletedOnboarding,
    };
  }

  /**
   * Validates confirmed zero-spend dates array.
   */
  public static validateConfirmedZeroDays(data: unknown): string[] {
    if (!Array.isArray(data)) {
      return [];
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return data.filter((d): d is string => typeof d === 'string' && dateRegex.test(d));
  }

  /**
   * Schema version management and migration protection.
   * If existing localStorage data exists without a schema version, it is treated as version 1
   * and stamped safely.
   */
  public static getSchemaVersion(): number {
    try {
      const explicitVer = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
      if (explicitVer) {
        const num = parseInt(explicitVer, 10);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }

      // Check if preferences has version
      const prefsRaw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (prefsRaw) {
        const prefs = this.safeParse<Record<string, unknown>>(prefsRaw, {});
        if (typeof prefs.version === 'number' && prefs.version > 0) {
          localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(prefs.version));
          return prefs.version;
        }
      }

      // If user has existing data (profile or expenses) without a version, this is an existing v1 user!
      const hasExistingData =
        Boolean(localStorage.getItem(STORAGE_KEYS.PROFILE)) ||
        Boolean(localStorage.getItem(STORAGE_KEYS.EXPENSES));

      if (hasExistingData) {
        localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, '1');
        return 1;
      }

      // Fresh user
      localStorage.setItem(
        STORAGE_KEYS.SCHEMA_VERSION,
        String(CURRENT_STORAGE_SCHEMA_VERSION)
      );
      return CURRENT_STORAGE_SCHEMA_VERSION;
    } catch {
      return CURRENT_STORAGE_SCHEMA_VERSION;
    }
  }

  /**
   * Ensures storage schema version is set and executes migrations if future versions are added.
   */
  public static ensureSchemaVersion(): void {
    try {
      const currentVer = this.getSchemaVersion();
      if (currentVer < CURRENT_STORAGE_SCHEMA_VERSION) {
        // Future migration pipeline hook:
        // if (currentVer === 1) migrateV1ToV2();
        localStorage.setItem(
          STORAGE_KEYS.SCHEMA_VERSION,
          String(CURRENT_STORAGE_SCHEMA_VERSION)
        );
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Retrieves the explicitly saved theme from localStorage:
   * 1. Checks 'theme' key in localStorage.
   * 2. Checks 'local_budget_preferences' JSON.theme.
   * 3. If "dark" -> returns "dark".
   *    If "light" -> returns "light".
   * 4. If NO saved preference exists -> ALWAYS returns "light" (never defaults to system dark mode).
   */
  static getSavedTheme(): 'light' | 'dark' {
    try {
      const explicitTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (explicitTheme === 'dark' || explicitTheme === 'light') {
        return explicitTheme;
      }

      const prefsData = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (prefsData) {
        const parsed = this.safeParse<Record<string, unknown>>(prefsData, {});
        if (parsed && (parsed.theme === 'dark' || parsed.theme === 'light')) {
          return parsed.theme;
        }
      }

      return 'light';
    } catch {
      return 'light';
    }
  }

  static saveTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      const parsed = this.safeParse<Record<string, unknown>>(data, {});
      localStorage.setItem(
        STORAGE_KEYS.PREFERENCES,
        JSON.stringify({ ...defaultPreferences, ...parsed, theme })
      );
    } catch {
      // Ignore storage errors
    }
  }

  static applyThemeToDOM(theme: 'light' | 'dark', smooth = false): void {
    try {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (smooth && !prefersReducedMotion && typeof document !== 'undefined') {
        document.documentElement.classList.add('theme-transitioning');
        setTimeout(() => {
          document.documentElement.classList.remove('theme-transitioning');
        }, 260);
      }

      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      if (typeof document !== 'undefined') {
        const metaThemeList = document.querySelectorAll('meta[name="theme-color"]');
        metaThemeList.forEach((el) => {
          el.setAttribute('content', theme === 'dark' ? '#020617' : '#FFFFFF');
        });
      }
    } catch {
      // Ignore DOM errors
    }
  }

  static getProfile(): BudgetProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!raw) return null;
      const parsed = this.safeParse<unknown>(raw, null);
      return this.validateProfile(parsed);
    } catch {
      return null;
    }
  }

  static saveProfile(profile: BudgetProfile): void {
    try {
      const validated = this.validateProfile(profile);
      if (validated) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(validated));
      }
    } catch {
      // Ignore storage errors
    }
  }

  static getExpenses(): ExpenseItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (!raw) return [];
      const parsed = this.safeParse<unknown>(raw, []);
      return this.validateExpenses(parsed);
    } catch {
      return [];
    }
  }

  static saveExpenses(expenses: ExpenseItem[]): void {
    try {
      const validated = this.validateExpenses(expenses);
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(validated));
    } catch {
      // Ignore storage errors
    }
  }

  static getPreferences(): AppPreferences {
    try {
      const savedTheme = this.getSavedTheme();
      const raw = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (raw) {
        const parsed = this.safeParse<unknown>(raw, null);
        const validated = this.validatePreferences(parsed);
        return {
          ...validated,
          theme: savedTheme,
        };
      }
      return {
        ...defaultPreferences,
        theme: savedTheme,
      };
    } catch {
      return {
        ...defaultPreferences,
        theme: 'light',
      };
    }
  }

  static savePreferences(preferences: AppPreferences): void {
    try {
      const validated = this.validatePreferences(preferences);
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(validated));
      if (preferences.theme === 'dark' || preferences.theme === 'light') {
        localStorage.setItem(STORAGE_KEYS.THEME, preferences.theme);
      }
    } catch {
      // Ignore storage errors
    }
  }

  static getConfirmedZeroDays(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONFIRMED_ZERO_DAYS);
      if (!raw) return [];
      const parsed = this.safeParse<unknown>(raw, []);
      return this.validateConfirmedZeroDays(parsed);
    } catch {
      return [];
    }
  }

  static addConfirmedZeroDay(dateStr: string): void {
    try {
      const list = this.getConfirmedZeroDays();
      if (!list.includes(dateStr)) {
        list.push(dateStr);
        localStorage.setItem(STORAGE_KEYS.CONFIRMED_ZERO_DAYS, JSON.stringify(list));
      }
    } catch {
      // Ignore storage errors
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.EXPENSES);
      localStorage.removeItem(STORAGE_KEYS.CONFIRMED_ZERO_DAYS);
      const currentTheme = this.getPreferences().theme;
      localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      this.savePreferences({
        ...defaultPreferences,
        theme: currentTheme,
      });
      localStorage.setItem(
        STORAGE_KEYS.SCHEMA_VERSION,
        String(CURRENT_STORAGE_SCHEMA_VERSION)
      );
    } catch {
      // Ignore storage errors
    }
  }

  // ==========================================
  // JSON BACKUP & RESTORE (100% Client-Side)
  // ==========================================

  /**
   * Generates a complete, structured JSON backup representation.
   */
  static exportBackupData(): BudgetBackupData {
    return {
      app: 'LocalBudget',
      version: this.getSchemaVersion(),
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      expenses: this.getExpenses(),
      preferences: this.getPreferences(),
      confirmedZeroDays: this.getConfirmedZeroDays(),
    };
  }

  /**
   * Triggers an immediate browser download of the user's budget data as a .json file.
   * Everything stays strictly local.
   */
  static downloadBackupFile(): void {
    try {
      const backup = this.exportBackupData();
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const dateStr = SpendingCalculator.formatDate(new Date());

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `local-budget-backup-${dateStr}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error('Failed to trigger backup download:', err);
    }
  }

  /**
   * Validates a raw backup JSON string.
   * Returns a validation result with sanitized data or clear error message.
   */
  static validateBackupString(rawJson: string): {
    valid: boolean;
    error?: string;
    data?: BudgetBackupData;
  } {
    if (!rawJson || typeof rawJson !== 'string' || rawJson.trim().length === 0) {
      return { valid: false, error: 'The uploaded file is empty.' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return { valid: false, error: 'The file is not a valid JSON document.' };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { valid: false, error: 'The backup format is unrecognized.' };
    }

    const obj = parsed as Record<string, unknown>;

    // Verify it is a Local Budget backup
    const isAppIdentifier = obj.app === 'LocalBudget';
    const hasProfileOrExpenses = 'profile' in obj || 'expenses' in obj;

    if (!isAppIdentifier && !hasProfileOrExpenses) {
      return {
        valid: false,
        error: 'This file does not appear to be a Local Budget backup.',
      };
    }

    try {
      const validatedProfile = this.validateProfile(obj.profile);
      const validatedExpenses = this.validateExpenses(obj.expenses);
      const validatedPreferences = this.validatePreferences(obj.preferences);
      const validatedConfirmedZeroDays = this.validateConfirmedZeroDays(
        obj.confirmedZeroDays
      );

      const version =
        typeof obj.version === 'number' && obj.version > 0
          ? obj.version
          : CURRENT_STORAGE_SCHEMA_VERSION;

      const validatedBackup: BudgetBackupData = {
        app: 'LocalBudget',
        version,
        exportedAt:
          typeof obj.exportedAt === 'string'
            ? obj.exportedAt
            : new Date().toISOString(),
        profile: validatedProfile,
        expenses: validatedExpenses,
        preferences: validatedPreferences,
        confirmedZeroDays: validatedConfirmedZeroDays,
      };

      return { valid: true, data: validatedBackup };
    } catch (err) {
      return {
        valid: false,
        error: `Failed to validate backup contents: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Restores a validated backup into localStorage.
   */
  static restoreBackup(backup: BudgetBackupData): void {
    if (backup.profile) {
      this.saveProfile(backup.profile);
    } else {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
    }

    this.saveExpenses(backup.expenses);
    this.savePreferences(backup.preferences);

    localStorage.setItem(
      STORAGE_KEYS.CONFIRMED_ZERO_DAYS,
      JSON.stringify(backup.confirmedZeroDays)
    );

    localStorage.setItem(
      STORAGE_KEYS.SCHEMA_VERSION,
      String(backup.version || CURRENT_STORAGE_SCHEMA_VERSION)
    );

    this.applyThemeToDOM(backup.preferences.theme);
  }

  /**
   * Helper to seed realistic demo data matching Ghanaian Cedi (GH₵) setup.
   */
  static seedDemoData(): { profile: BudgetProfile; expenses: ExpenseItem[] } {
    const today = new Date();
    const salaryDate = new Date(today);
    salaryDate.setDate(salaryDate.getDate() - 14); // 14 days ago

    const nextSalaryDate = new Date(salaryDate);
    nextSalaryDate.setDate(nextSalaryDate.getDate() + 30); // 30-day cycle

    const profile: BudgetProfile = {
      userName: 'Rammy',
      currencySymbol: 'GH₵',
      monthlyIncome: 4500,
      monthlySavingsGoal: 1200,
      salaryDateString: SpendingCalculator.formatDate(salaryDate),
      nextSalaryDateString: SpendingCalculator.formatDate(nextSalaryDate),
      createdAt: new Date().toISOString(),
    };

    const expenses: ExpenseItem[] = [
      {
        id: 1,
        amount: 35,
        description: 'Waakye & fried fish breakfast',
        category: 'FOOD',
        dateString: SpendingCalculator.formatDate(today),
        timeFormatted: '08:45 AM',
        createdAt: Date.now() - 3600000 * 4,
      },
      {
        id: 2,
        amount: 25,
        description: 'Bolt ride to Ridge office',
        category: 'TRANSPORT',
        dateString: SpendingCalculator.formatDate(today),
        timeFormatted: '10:15 AM',
        createdAt: Date.now() - 3600000 * 2,
      },
    ];

    const samplePast = [
      { d: 1, desc: 'Groceries at Melcom', cat: 'SHOPPING' as const, amt: 120 },
      { d: 2, desc: 'Trotro and fuel topup', cat: 'TRANSPORT' as const, amt: 45 },
      { d: 3, desc: 'Jollof rice combo', cat: 'FOOD' as const, amt: 40 },
      { d: 5, desc: 'ECG Prepaid power units', cat: 'BILLS' as const, amt: 100 },
      { d: 7, desc: 'Weekend coffee & smoothie', cat: 'DRINKS' as const, amt: 32 },
      { d: 9, desc: 'Uber ride to Osu', cat: 'TRANSPORT' as const, amt: 38 },
      { d: 11, desc: 'Airtime & Internet data', cat: 'BILLS' as const, amt: 50 },
      { d: 13, desc: 'Lunch with colleagues', cat: 'FOOD' as const, amt: 55 },
    ];

    samplePast.forEach((item, idx) => {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - item.d);
      expenses.push({
        id: 100 + idx,
        amount: item.amt,
        description: item.desc,
        category: item.cat,
        dateString: SpendingCalculator.formatDate(pastDate),
        timeFormatted: '01:30 PM',
        createdAt: pastDate.getTime(),
      });
    });

    this.saveProfile(profile);
    this.saveExpenses(expenses);
    this.savePreferences({
      ...defaultPreferences,
      hasCompletedOnboarding: true,
    });
    localStorage.setItem(
      STORAGE_KEYS.SCHEMA_VERSION,
      String(CURRENT_STORAGE_SCHEMA_VERSION)
    );

    return { profile, expenses };
  }
}
