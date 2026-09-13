/**
 * Notification System for Local Budget Web / PWA
 *
 * PWA & BROWSER COMPLIANCE:
 * - 100% Client-Side. No external servers or cloud accounts.
 * - Respects user choice: never enabled automatically.
 * - Integrates with ServiceWorkerRegistration.showNotification where available (required on iOS PWA).
 * - Safe fallback to Notification API on standard desktop/mobile browsers.
 * - Intelligent anti-spam throttling: max 1 daily reminder per calendar day, max 1 expense reminder per calendar day,
 *   and throttled budget warnings.
 * - Strict analytics privacy: zero financial data or notification payloads in telemetry.
 */

import {
  AdditionalMoneyItem,
  BudgetProfile,
  ExpenseItem,
  NotificationPreferences,
  NotificationRuntimeState,
} from '../types';
import { SpendingCalculator } from './calculator';
import { LocalStorageManager } from './storage';

export type NotificationSupportStatus =
  | 'supported'
  | 'unsupported'
  | 'ios_needs_pwa';

/**
 * Detects whether the device/browser supports Web Notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Checks if the app is currently running in standalone PWA mode (e.g. Added to Home Screen).
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isStandaloneNav = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneMedia || isStandaloneNav);
}

/**
 * Detects whether the current device is running iOS (iPhone/iPad).
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Returns the granular support status for the current browser/device.
 */
export function getNotificationSupportStatus(): NotificationSupportStatus {
  if (!isNotificationSupported()) {
    if (isIOSDevice() && !isStandalonePWA()) {
      return 'ios_needs_pwa';
    }
    return 'unsupported';
  }
  return 'supported';
}

/**
 * Gets the current notification permission string safely.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Requests notification permission from the browser/device.
 * Returns the resulting permission status.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[Notifications] Error requesting notification permission:', err);
    return getNotificationPermission();
  }
}

/**
 * Formats a 24-hour time string ("20:00") into friendly 12-hour format ("8:00 PM").
 */
export function formatReminderTime(time24: string): string {
  if (!time24 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time24)) {
    return '8:00 PM';
  }
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Resolves the icon path respecting the app's base URL (e.g. /budget/).
 */
function getNotificationAssetUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}${fileName}`;
}

/**
 * Dispatches a real browser notification using the Service Worker if available,
 * falling back to window.Notification constructor.
 */
export async function sendLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (getNotificationPermission() !== 'granted') {
    return false;
  }

  const iconUrl = getNotificationAssetUrl('pwa-192x192.png');
  const badgeUrl = getNotificationAssetUrl('pwa-192x192.png');

  const mergedOptions: NotificationOptions = {
    icon: iconUrl,
    badge: badgeUrl,
    ...options,
  };

  // 1. Try ServiceWorkerRegistration (standard for PWAs, mandatory for iOS 16.4+ standalone PWAs)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, mergedOptions);
        return true;
      }
    } catch {
      // Fall through to Notification constructor
    }
  }

  // 2. Fallback to standard window.Notification constructor
  if (typeof Notification !== 'undefined') {
    try {
      new Notification(title, mergedOptions);
      return true;
    } catch (err) {
      console.warn('[Notifications] Failed to dispatch Notification:', err);
    }
  }

  return false;
}

export interface CheckNotificationsParams {
  profile: BudgetProfile | null;
  expenses: ExpenseItem[];
  additionalMoney?: AdditionalMoneyItem[];
  confirmedZeroDays: string[];
  preferences: NotificationPreferences;
  now?: Date;
}

/**
 * Evaluates all configured notifications against current time, expense logs, and budget health.
 * Enforces strict anti-spam throttling so notifications fire at most once per calendar day.
 */
export async function checkAndDispatchScheduledNotifications({
  profile,
  expenses,
  additionalMoney = [],
  confirmedZeroDays,
  preferences,
  now = new Date(),
}: CheckNotificationsParams): Promise<void> {
  // If notifications master switch is off or permission is not granted, do nothing
  if (!preferences.enabled || getNotificationPermission() !== 'granted' || !profile) {
    return;
  }

  const todayStr = SpendingCalculator.formatDate(now);
  const runtimeState: NotificationRuntimeState =
    LocalStorageManager.getNotificationRuntimeState();

  let stateChanged = false;

  // Evaluate reminder time
  const [reminderHourStr, reminderMinStr] = (preferences.reminderTime || '20:00').split(':');
  const reminderHour = parseInt(reminderHourStr, 10);
  const reminderMin = parseInt(reminderMinStr, 10);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const isReminderTimeReached =
    currentHour > reminderHour ||
    (currentHour === reminderHour && currentMin >= reminderMin);

  // -------------------------------------------------------------
  // 1. DAILY BUDGET REMINDER
  // -------------------------------------------------------------
  if (
    preferences.dailyBudgetReminder &&
    isReminderTimeReached &&
    runtimeState.lastDailyReminderDate !== todayStr
  ) {
    const cycleDays = SpendingCalculator.calculateCycleDays(
      profile.salaryDateString,
      profile.nextSalaryDateString
    );
    const daysRemaining = SpendingCalculator.calculateDaysRemaining(
      todayStr,
      profile.nextSalaryDateString
    );
    const pastSpending = SpendingCalculator.calculatePastSpendingInCycle(
      expenses,
      profile.salaryDateString,
      todayStr
    );
    const additionalMoneyTotal = additionalMoney
      .filter(
        (m) =>
          m.dateString >= profile.salaryDateString &&
          m.dateString <= profile.nextSalaryDateString
      )
      .reduce((sum, m) => sum + m.amount, 0);

    const todayAllowance = SpendingCalculator.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      pastSpending,
      daysRemaining,
      profile.hasSavingsGoal !== false,
      additionalMoneyTotal
    );

    const allowanceFormatted = SpendingCalculator.formatExactDecimal(Math.max(0, todayAllowance));
    const title = 'Local Budget';
    const body =
      todayAllowance > 0
        ? `Your recommended spending for today is ready: ${profile.currencySymbol}${allowanceFormatted}.`
        : 'Your recommended spending for today is ready to check.';

    const sent = await sendLocalNotification(title, {
      body,
      tag: 'daily-budget-reminder',
    });

    if (sent) {
      runtimeState.lastDailyReminderDate = todayStr;
      stateChanged = true;
    }
  }

  // -------------------------------------------------------------
  // 2. EXPENSE REMINDER
  // -------------------------------------------------------------
  if (
    preferences.expenseReminder &&
    isReminderTimeReached &&
    runtimeState.lastExpenseReminderDate !== todayStr
  ) {
    const hasSpentToday = expenses.some((e) => !e.isDelayed && e.dateString === todayStr);
    const isZeroConfirmed = confirmedZeroDays.includes(todayStr);

    // Only remind if no spending has been recorded yet for today
    if (!hasSpentToday && !isZeroConfirmed) {
      const sent = await sendLocalNotification('Local Budget', {
        body: "Don't forget to record today's spending.",
        tag: 'expense-reminder',
      });

      if (sent) {
        runtimeState.lastExpenseReminderDate = todayStr;
        stateChanged = true;
      }
    }
  }

  // -------------------------------------------------------------
  // 3. BUDGET WARNING
  // -------------------------------------------------------------
  if (
    preferences.budgetWarning &&
    runtimeState.lastBudgetWarningDate !== todayStr
  ) {
    const summary = SpendingCalculator.calculateSalaryCycleSummary(
      profile,
      expenses,
      todayStr,
      additionalMoney
    );

    const todayAllowance = SpendingCalculator.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      summary.pastSpending,
      summary.daysRemaining,
      profile.hasSavingsGoal !== false,
      summary.additionalMoneyTotal || 0
    );

    const todaySpent = SpendingCalculator.calculateTodaySpent(expenses, todayStr);
    const todayLeft = SpendingCalculator.calculateTodayLeftToSpend(todayAllowance, todaySpent);

    // Genuine pressure conditions from existing budgeting calculation model:
    // 1. Over today's budget limit (todayLeft < 0)
    // 2. Remaining spendable pool is depleted while days remain in the cycle
    // 3. Spent 90%+ of today's allowance while days remain in cycle
    const isOverBudgetToday = todayLeft < 0;
    const isCycleDepleted = summary.remainingSpendable <= 0 && summary.daysRemaining > 0;
    const isNearDailyLimit =
      todayAllowance > 0 && todaySpent / todayAllowance >= 0.9 && summary.daysRemaining > 1;

    if (isOverBudgetToday || isCycleDepleted || isNearDailyLimit) {
      const title = 'Budget warning';
      let body = 'Your remaining budget is getting tight. Check your recommended spending for today.';
      if (isOverBudgetToday) {
        const overAmt = Math.abs(todayLeft);
        body = `You've exceeded today's recommended limit by ${profile.currencySymbol}${SpendingCalculator.formatExactDecimal(
          overAmt
        )}. Local Budget will adjust tomorrow to protect your goals.`;
      }

      const sent = await sendLocalNotification(title, {
        body,
        tag: 'budget-warning',
      });

      if (sent) {
        runtimeState.lastBudgetWarningDate = todayStr;
        stateChanged = true;
      }
    }
  }

  if (stateChanged) {
    LocalStorageManager.saveNotificationRuntimeState(runtimeState);
  }
}
