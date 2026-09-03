export type ExpenseCategory =
  | 'FOOD'
  | 'TRANSPORT'
  | 'SHOPPING'
  | 'DRINKS'
  | 'BILLS'
  | 'OTHER';

export interface CategoryMeta {
  key: ExpenseCategory;
  displayName: string;
  emoji: string;
  color: string;
  lightBg: string;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  FOOD: {
    key: 'FOOD',
    displayName: 'Food',
    emoji: '🍛',
    color: '#D97706',
    lightBg: '#FEF3C7',
  },
  TRANSPORT: {
    key: 'TRANSPORT',
    displayName: 'Transport',
    emoji: '🚕',
    color: '#2563EB',
    lightBg: '#DBEAFE',
  },
  SHOPPING: {
    key: 'SHOPPING',
    displayName: 'Shopping',
    emoji: '🛍️',
    color: '#7C3AED',
    lightBg: '#EDE9FE',
  },
  DRINKS: {
    key: 'DRINKS',
    displayName: 'Drinks',
    emoji: '☕',
    color: '#0D9488',
    lightBg: '#CCFBF1',
  },
  BILLS: {
    key: 'BILLS',
    displayName: 'Bills',
    emoji: '💡',
    color: '#DC2626',
    lightBg: '#FEE2E2',
  },
  OTHER: {
    key: 'OTHER',
    displayName: 'Other',
    emoji: '✦',
    color: '#475569',
    lightBg: '#F1F5F9',
  },
};

export interface BudgetProfile {
  id?: number;
  userName: string;
  currencySymbol: string;
  monthlyIncome: number;
  monthlySavingsGoal: number;
  salaryDateString: string; // YYYY-MM-DD
  nextSalaryDateString: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseItem {
  id: number;
  amount: number;
  description: string;
  category: ExpenseCategory;
  dateString: string; // YYYY-MM-DD
  timeFormatted: string; // e.g. "12:30 PM"
  isDelayed?: boolean;
  createdAt: number;
}

export interface DailySpendingRecord {
  dateString: string; // YYYY-MM-DD
  allowance: number;
  actualSpent: number;
  leftToSpend: number;
  isConfirmedZeroSpend?: boolean;
}

export interface AppPreferences {
  version?: number;
  dailyReminderEnabled: boolean;
  theme: 'light' | 'dark';
  hasCompletedOnboarding: boolean;
}

export interface BudgetBackupData {
  app: 'LocalBudget';
  version: number;
  exportedAt: string;
  profile: BudgetProfile | null;
  expenses: ExpenseItem[];
  preferences: AppPreferences;
  confirmedZeroDays: string[];
}

export type SpendingMoodType =
  | 'AHEAD_OF_GOAL'
  | 'EXCELLENT'
  | 'ON_TRACK'
  | 'GETTING_CLOSE'
  | 'OVER_BUDGET';

export interface SpendingMood {
  type: SpendingMoodType;
  emoji: string;
  headline: string;
  message: string;
  badgeLabel: string;
  spentPctOfAllowance: number;
}

export interface SalaryCycleSummary {
  salaryDate: string;
  nextSalaryDate: string;
  totalCycleDays: number;
  daysPassed: number;
  daysRemaining: number;
  cycleProgressPct: number;
  monthlyIncome: number;
  savingsGoal: number;
  spendablePool: number;
  pastSpending: number;
  remainingSpendable: number;
  projectedSavings: number;
}

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  displayName: string;
  emoji: string;
  color: string;
  totalSpent: number;
  percentage: number;
  count: number;
}

export interface SpendingTrendData {
  labels: string[];
  values: number[];
  allowance: number;
}

export interface DailyPerformanceItem {
  dateString: string;
  dayNumber: number;
  spent: number;
  allowance: number;
  status: 'under' | 'close' | 'over' | 'future' | 'zero';
}

export interface DailyPerformanceData {
  days: DailyPerformanceItem[];
  daysUnderBudget: number;
  daysNearLimit: number;
  daysOverBudget: number;
  totalLoggedDays: number;
}

export interface MonthlyFinancialSummaryData {
  totalSpent: number;
  dailyAverage: number;
  highestDayAmount: number;
  highestDayDate: string;
  daysUnderBudget: number;
  totalCycleDays: number;
}

export interface FinancialHealthOverviewData {
  score: number; // 0..100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  headline: string;
  explanation: string;
  isPositive: boolean;
}

export interface GoalProgressData {
  monthlyIncome: number;
  savingsGoal: number;
  spendablePool: number;
  currentCycleSpent: number;
  remainingPool: number;
  targetSavedSoFar: number;
  projectedEndSavings: number;
  percentageSaved: number;
}

export interface FinancialAdviceItem {
  title: string;
  message: string;
  type: 'positive' | 'warning' | 'tip';
  iconEmoji: string;
}

export interface PeriodSpendingComparison {
  currentPeriodSpent: number;
  previousPeriodSpent: number;
  differenceAmount: number;
  percentageChange: number;
  isLower: boolean;
}

export type AppNavTab = 'DAILY' | 'INSIGHTS';
export type AppScreenStage = 'WELCOME' | 'SETUP' | 'MAIN';
export type InsightsPeriodType = 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'CUSTOM';
