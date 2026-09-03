import {
  BudgetProfile,
  CategoryBreakdownItem,
  DailyPerformanceData,
  DailyPerformanceItem,
  ExpenseCategory,
  ExpenseItem,
  FinancialAdviceItem,
  FinancialHealthOverviewData,
  GoalProgressData,
  MonthlyFinancialSummaryData,
  PeriodSpendingComparison,
  SalaryCycleSummary,
  SpendingMood,
  SpendingTrendData,
  CATEGORIES,
} from '../types';

export class SpendingCalculator {
  static formatAmount(amount: number): string {
    return Math.round(amount).toLocaleString('en-US');
  }

  static formatExactDecimal(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  static parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  static formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static getDayDiff(startDateStr: string, endDateStr: string): number {
    const start = this.parseDate(startDateStr);
    const end = this.parseDate(endDateStr);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
  }

  static calculateCycleDays(salaryDateStr: string, nextSalaryDateStr: string): number {
    const diff = this.getDayDiff(salaryDateStr, nextSalaryDateStr);
    return Math.max(1, diff);
  }

  static calculateDaysRemaining(todayStr: string, nextSalaryDateStr: string): number {
    const diff = this.getDayDiff(todayStr, nextSalaryDateStr);
    return Math.max(1, diff);
  }

  static calculateDaysPassed(salaryDateStr: string, todayStr: string): number {
    const diff = this.getDayDiff(salaryDateStr, todayStr);
    return Math.max(0, diff);
  }

  static calculateMonthlySpendable(monthlyIncome: number, monthlySavingsGoal: number): number {
    return Math.max(0, monthlyIncome - monthlySavingsGoal);
  }

  /**
   * Calculates total spending recorded in the current salary cycle strictly before today.
   */
  static calculatePastSpendingInCycle(
    expenses: ExpenseItem[],
    salaryDateStr: string,
    todayStr: string
  ): number {
    return expenses
      .filter((e) => !e.isDelayed)
      .filter((e) => e.dateString >= salaryDateStr && e.dateString < todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Calculates total spending recorded on today's date.
   */
  static calculateTodaySpent(expenses: ExpenseItem[], todayStr: string): number {
    return expenses
      .filter((e) => !e.isDelayed)
      .filter((e) => e.dateString === todayStr)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Calculates dynamic daily allowance based on remaining spendable and days remaining.
   */
  static calculateDailyAllowance(
    monthlyIncome: number,
    monthlySavingsGoal: number,
    pastSpendingInCycle: number,
    daysRemaining: number
  ): number {
    const spendablePool = this.calculateMonthlySpendable(monthlyIncome, monthlySavingsGoal);
    const remainingSpendable = Math.max(0, spendablePool - pastSpendingInCycle);
    const safeDays = Math.max(1, daysRemaining);
    return Math.round((remainingSpendable / safeDays) * 100) / 100;
  }

  /**
   * Calculates leftover budget for today. Can be negative if overspent.
   */
  static calculateTodayLeftToSpend(todayAllowance: number, todayActualSpent: number): number {
    return Math.round((todayAllowance - todayActualSpent) * 100) / 100;
  }

  /**
   * Calculates tomorrow's projected target allowance based on today's actual performance.
   */
  static calculateTomorrowTarget(
    monthlyIncome: number,
    monthlySavingsGoal: number,
    pastSpendingInCycle: number,
    todayActualSpent: number,
    daysRemaining: number
  ): number {
    const spendablePool = this.calculateMonthlySpendable(monthlyIncome, monthlySavingsGoal);
    const totalSpentThroughToday = pastSpendingInCycle + todayActualSpent;
    const remainingAfterToday = Math.max(0, spendablePool - totalSpentThroughToday);
    const daysAfterToday = Math.max(1, daysRemaining - 1);
    return Math.round((remainingAfterToday / daysAfterToday) * 100) / 100;
  }

  /**
   * Evaluates the spending mood character and lively feedback messages.
   */
  static evaluateSpendingMood(
    todayLeftToSpend: number,
    todayAllowance: number,
    todayActualSpent: number,
    salaryCycleSummary?: SalaryCycleSummary | null,
    currencySymbol: string = 'GH₵'
  ): SpendingMood {
    const spentRatio = todayAllowance > 0 ? todayActualSpent / todayAllowance : 0;
    const isSignificantlyAhead =
      salaryCycleSummary != null &&
      salaryCycleSummary.projectedSavings >= salaryCycleSummary.savingsGoal * 1.03 &&
      salaryCycleSummary.daysRemaining > 0;

    // 1. Over budget today
    if (todayLeftToSpend < 0) {
      const overAmount = Math.abs(todayLeftToSpend);
      return {
        type: 'OVER_BUDGET',
        emoji: '😟',
        headline: "You've gone over today's limit.",
        message: `You're ${currencySymbol}${this.formatExactDecimal(
          overAmount
        )} over today. We'll adjust tomorrow to protect your savings.`,
        badgeLabel: 'Over Budget',
        spentPctOfAllowance: spentRatio,
      };
    }

    // 2. Significantly ahead across cycle
    if (isSignificantlyAhead && todayLeftToSpend >= 0 && spentRatio <= 0.65) {
      return {
        type: 'AHEAD_OF_GOAL',
        emoji: '😎',
        headline: "You're ahead of your savings goal!",
        message: `You're comfortably pacing ahead of your savings target of ${currencySymbol}${this.formatAmount(
          salaryCycleSummary?.savingsGoal || 0
        )}!`,
        badgeLabel: 'Ahead of Goal',
        spentPctOfAllowance: spentRatio,
      };
    }

    // 3. Approaching daily limit (>= 75% spent)
    if (spentRatio >= 0.75) {
      return {
        type: 'GETTING_CLOSE',
        emoji: '🙄',
        headline: 'I think you should slow down.',
        message: `You have ${currencySymbol}${this.formatExactDecimal(
          todayLeftToSpend
        )} left today. Consider slowing down to stay on track.`,
        badgeLabel: 'Near Limit',
        spentPctOfAllowance: spentRatio,
      };
    }

    // 4. Doing well (<= 45% spent or 0 spent)
    if (todayActualSpent === 0 || spentRatio <= 0.45) {
      return {
        type: 'EXCELLENT',
        emoji: '😄',
        headline: "You're doing great!",
        message:
          todayActualSpent === 0
            ? `Full ${currencySymbol}${this.formatExactDecimal(
                todayAllowance
              )} ready for today. Great job staying under budget!`
            : `${currencySymbol}${this.formatExactDecimal(
                todayLeftToSpend
              )} remaining from today's target. You're doing great!`,
        badgeLabel: 'Doing Well',
        spentPctOfAllowance: spentRatio,
      };
    }

    // 5. On track (45% to 75% spent)
    return {
      type: 'ON_TRACK',
      emoji: '🙂',
      headline: "You're on track.",
      message: `Right on track with ${currencySymbol}${this.formatExactDecimal(
        todayLeftToSpend
      )} left to spend today.`,
      badgeLabel: 'On Track',
      spentPctOfAllowance: spentRatio,
    };
  }

  /**
   * Generates a complete salary cycle summary.
   */
  static calculateSalaryCycleSummary(
    profile: BudgetProfile,
    expenses: ExpenseItem[],
    todayStr: string
  ): SalaryCycleSummary {
    const totalCycleDays = this.calculateCycleDays(
      profile.salaryDateString,
      profile.nextSalaryDateString
    );
    const daysPassed = this.calculateDaysPassed(profile.salaryDateString, todayStr);
    const daysRemaining = this.calculateDaysRemaining(todayStr, profile.nextSalaryDateString);
    const cycleProgressPct = Math.min(100, Math.round((daysPassed / totalCycleDays) * 100));

    const spendablePool = this.calculateMonthlySpendable(
      profile.monthlyIncome,
      profile.monthlySavingsGoal
    );
    const pastSpending = this.calculatePastSpendingInCycle(
      expenses,
      profile.salaryDateString,
      todayStr
    );
    const todaySpending = this.calculateTodaySpent(expenses, todayStr);
    const totalSpentSoFar = pastSpending + todaySpending;
    const remainingSpendable = Math.max(0, spendablePool - totalSpentSoFar);
    const projectedSavings = profile.monthlyIncome - totalSpentSoFar;

    return {
      salaryDate: profile.salaryDateString,
      nextSalaryDate: profile.nextSalaryDateString,
      totalCycleDays,
      daysPassed,
      daysRemaining,
      cycleProgressPct,
      monthlyIncome: profile.monthlyIncome,
      savingsGoal: profile.monthlySavingsGoal,
      spendablePool,
      pastSpending,
      remainingSpendable,
      projectedSavings,
    };
  }

  /**
   * Computes category breakdown for a set of expenses.
   */
  static calculateCategoryBreakdown(expenses: ExpenseItem[]): CategoryBreakdownItem[] {
    const validExpenses = expenses.filter((e) => !e.isDelayed);
    const total = validExpenses.reduce((sum, e) => sum + e.amount, 0);
    const map = new Map<ExpenseCategory, { amount: number; count: number }>();

    for (const item of validExpenses) {
      const current = map.get(item.category) || { amount: 0, count: 0 };
      map.set(item.category, {
        amount: current.amount + item.amount,
        count: current.count + 1,
      });
    }

    const result: CategoryBreakdownItem[] = [];
    for (const [catKey, meta] of Object.entries(CATEGORIES)) {
      const category = catKey as ExpenseCategory;
      const data = map.get(category) || { amount: 0, count: 0 };
      result.push({
        category,
        displayName: meta.displayName,
        emoji: meta.emoji,
        color: meta.color,
        totalSpent: data.amount,
        percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
        count: data.count,
      });
    }

    return result.sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * Computes goal progress.
   */
  static calculateGoalProgress(
    profile: BudgetProfile,
    expenses: ExpenseItem[],
    todayStr: string
  ): GoalProgressData {
    const spendablePool = this.calculateMonthlySpendable(
      profile.monthlyIncome,
      profile.monthlySavingsGoal
    );
    const cycleExpenses = expenses
      .filter((e) => !e.isDelayed)
      .filter(
        (e) =>
          e.dateString >= profile.salaryDateString && e.dateString <= profile.nextSalaryDateString
      );
    const currentCycleSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const remainingPool = Math.max(0, spendablePool - currentCycleSpent);
    const targetSavedSoFar = profile.monthlySavingsGoal;
    const projectedEndSavings = profile.monthlyIncome - currentCycleSpent;
    const percentageSaved =
      profile.monthlySavingsGoal > 0
        ? Math.min(100, Math.round((projectedEndSavings / profile.monthlySavingsGoal) * 100))
        : 100;

    return {
      monthlyIncome: profile.monthlyIncome,
      savingsGoal: profile.monthlySavingsGoal,
      spendablePool,
      currentCycleSpent,
      remainingPool,
      targetSavedSoFar,
      projectedEndSavings,
      percentageSaved,
    };
  }

  /**
   * Computes daily performance matrix for calendar visualization.
   */
  static calculateDailyPerformance(
    profile: BudgetProfile,
    expenses: ExpenseItem[],
    todayStr: string
  ): DailyPerformanceData {
    const cycleDays = this.calculateCycleDays(
      profile.salaryDateString,
      profile.nextSalaryDateString
    );
    const dailyBaseAllowance = this.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      0,
      cycleDays
    );

    const startDate = this.parseDate(profile.salaryDateString);
    const days: DailyPerformanceItem[] = [];
    let underCount = 0;
    let nearCount = 0;
    let overCount = 0;
    let loggedCount = 0;

    for (let i = 0; i < cycleDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dStr = this.formatDate(d);

      const dayExpenses = expenses.filter((e) => !e.isDelayed && e.dateString === dStr);
      const spent = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      let status: 'under' | 'close' | 'over' | 'future' | 'zero';
      if (dStr > todayStr) {
        status = 'future';
      } else if (spent === 0 && dayExpenses.length === 0) {
        status = 'zero';
      } else {
        loggedCount++;
        const ratio = dailyBaseAllowance > 0 ? spent / dailyBaseAllowance : 1;
        if (ratio <= 0.8) {
          status = 'under';
          underCount++;
        } else if (ratio <= 1.05) {
          status = 'close';
          nearCount++;
        } else {
          status = 'over';
          overCount++;
        }
      }

      days.push({
        dateString: dStr,
        dayNumber: i + 1,
        spent,
        allowance: dailyBaseAllowance,
        status,
      });
    }

    return {
      days,
      daysUnderBudget: underCount,
      daysNearLimit: nearCount,
      daysOverBudget: overCount,
      totalLoggedDays: loggedCount,
    };
  }

  /**
   * Computes monthly financial summary for Insights 4-tile grid.
   */
  static calculateMonthlyFinancialSummary(
    profile: BudgetProfile,
    expenses: ExpenseItem[],
    todayStr: string
  ): MonthlyFinancialSummaryData {
    const cycleExpenses = expenses
      .filter((e) => !e.isDelayed)
      .filter(
        (e) =>
          e.dateString >= profile.salaryDateString && e.dateString <= profile.nextSalaryDateString
      );
    const totalSpent = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
    const daysPassed = Math.max(
      1,
      this.calculateDaysPassed(profile.salaryDateString, todayStr) + 1
    );
    const dailyAverage = totalSpent / daysPassed;

    // Highest day
    const dayMap = new Map<string, number>();
    for (const e of cycleExpenses) {
      dayMap.set(e.dateString, (dayMap.get(e.dateString) || 0) + e.amount);
    }
    let highestDayAmount = 0;
    let highestDayDate = todayStr;
    for (const [date, amt] of dayMap.entries()) {
      if (amt > highestDayAmount) {
        highestDayAmount = amt;
        highestDayDate = date;
      }
    }

    const totalCycleDays = this.calculateCycleDays(
      profile.salaryDateString,
      profile.nextSalaryDateString
    );
    const dailyAllowance = this.calculateDailyAllowance(
      profile.monthlyIncome,
      profile.monthlySavingsGoal,
      0,
      totalCycleDays
    );
    let daysUnderBudget = 0;
    for (const amt of dayMap.values()) {
      if (amt <= dailyAllowance) daysUnderBudget++;
    }

    return {
      totalSpent,
      dailyAverage,
      highestDayAmount,
      highestDayDate,
      daysUnderBudget,
      totalCycleDays,
    };
  }

  /**
   * Computes financial health score & overview banner.
   */
  static calculateHealthOverview(
    summary: SalaryCycleSummary,
    expenses: ExpenseItem[]
  ): FinancialHealthOverviewData {
    let score = 75;
    if (summary.projectedSavings >= summary.savingsGoal) {
      score += 15;
    } else {
      const shortfallRatio =
        summary.savingsGoal > 0
          ? (summary.savingsGoal - summary.projectedSavings) / summary.savingsGoal
          : 0;
      score -= Math.min(35, Math.round(shortfallRatio * 40));
    }

    if (summary.remainingSpendable > 0 && summary.daysRemaining > 0) {
      const dailyAllow = summary.remainingSpendable / summary.daysRemaining;
      const expectedDaily = summary.spendablePool / summary.totalCycleDays;
      if (dailyAllow >= expectedDaily) score += 10;
      else score -= 10;
    }

    score = Math.max(10, Math.min(100, score));

    if (score >= 85) {
      return {
        score,
        rating: 'Excellent',
        headline: "You're in great financial shape!",
        explanation: `Your spending pace is currently on track to preserve your entire savings goal of GH₵${this.formatAmount(
          summary.savingsGoal
        )}.`,
        isPositive: true,
      };
    } else if (score >= 70) {
      return {
        score,
        rating: 'Good',
        headline: 'Solid financial control',
        explanation:
          'Your daily expenditures are mostly within targets. Maintain this pace to hit your monthly savings target.',
        isPositive: true,
      };
    } else if (score >= 55) {
      return {
        score,
        rating: 'Fair',
        headline: 'Watch your spending pace',
        explanation:
          'Higher than expected expenditures recently. Slowing down slightly will prevent touching your savings.',
        isPositive: false,
      };
    } else {
      return {
        score,
        rating: 'Needs Attention',
        headline: 'Savings target is at risk',
        explanation:
          'Current spending exceeds the planned monthly pool. We recommend reducing non-essential expenses.',
        isPositive: false,
      };
    }
  }

  /**
   * Suggests category from expense description automatically.
   */
  static inferCategory(description: string): ExpenseCategory {
    const text = description.toLowerCase().trim();
    if (
      text.includes('lunch') ||
      text.includes('dinner') ||
      text.includes('breakfast') ||
      text.includes('food') ||
      text.includes('waakye') ||
      text.includes('jollof') ||
      text.includes('kfc') ||
      text.includes('snack') ||
      text.includes('bread') ||
      text.includes('rice') ||
      text.includes('burger') ||
      text.includes('pizza') ||
      text.includes('chop') ||
      text.includes('grocery') ||
      text.includes('groceries') ||
      text.includes('market') ||
      text.includes('fruits')
    ) {
      return 'FOOD';
    }

    if (
      text.includes('uber') ||
      text.includes('bolt') ||
      text.includes('yango') ||
      text.includes('taxi') ||
      text.includes('trotro') ||
      text.includes('bus') ||
      text.includes('fuel') ||
      text.includes('petrol') ||
      text.includes('diesel') ||
      text.includes('transport') ||
      text.includes('fare') ||
      text.includes('parking')
    ) {
      return 'TRANSPORT';
    }

    if (
      text.includes('coffee') ||
      text.includes('tea') ||
      text.includes('beer') ||
      text.includes('drink') ||
      text.includes('water') ||
      text.includes('coke') ||
      text.includes('juice') ||
      text.includes('bar') ||
      text.includes('wine') ||
      text.includes('cocktail')
    ) {
      return 'DRINKS';
    }

    if (
      text.includes('bill') ||
      text.includes('electricity') ||
      text.includes('ecg') ||
      text.includes('water bill') ||
      text.includes('wifi') ||
      text.includes('internet') ||
      text.includes('airtime') ||
      text.includes('data') ||
      text.includes('rent') ||
      text.includes('utility') ||
      text.includes('subscription') ||
      text.includes('netflix') ||
      text.includes('spotify')
    ) {
      return 'BILLS';
    }

    if (
      text.includes('shop') ||
      text.includes('clothes') ||
      text.includes('shoes') ||
      text.includes('shirt') ||
      text.includes('mall') ||
      text.includes('amazon') ||
      text.includes('perfume') ||
      text.includes('hair') ||
      text.includes('salon') ||
      text.includes('gadget') ||
      text.includes('phone')
    ) {
      return 'SHOPPING';
    }

    return 'OTHER';
  }

  /**
   * Actionable Financial Advice based on user's real spending patterns.
   */
  static generateAdvice(
    breakdown: CategoryBreakdownItem[],
    performance: DailyPerformanceData,
    summary: SalaryCycleSummary
  ): FinancialAdviceItem[] {
    const advice: FinancialAdviceItem[] = [];

    // Check top category
    if (breakdown.length > 0 && breakdown[0].percentage >= 40 && breakdown[0].totalSpent > 0) {
      const top = breakdown[0];
      advice.push({
        title: `High ${top.displayName} Spending`,
        message: `${top.displayName} takes up ${top.percentage}% of your current expenditures. Planning meals or bulk purchasing could save you up to 15%.`,
        type: 'warning',
        iconEmoji: top.emoji,
      });
    }

    // Over budget days
    if (performance.daysOverBudget >= 3) {
      advice.push({
        title: 'Consecutive High Spend Days',
        message: `You've exceeded daily targets on ${performance.daysOverBudget} days. Try pacing your non-urgent purchases toward the end of the week.`,
        type: 'warning',
        iconEmoji: '⚠️',
      });
    } else if (performance.daysUnderBudget >= 5) {
      advice.push({
        title: 'Consistent Daily Discipline',
        message: `Outstanding! You have maintained spending under daily targets for ${performance.daysUnderBudget} days this cycle.`,
        type: 'positive',
        iconEmoji: '🎯',
      });
    }

    // Savings buffer tip
    if (summary.remainingSpendable > summary.spendablePool * 0.5 && summary.daysRemaining <= 10) {
      advice.push({
        title: 'Buffer Surplus Detected',
        message:
          'You are entering the final days of your pay cycle with a surplus buffer. You may exceed your initial savings target!',
        type: 'positive',
        iconEmoji: '💰',
      });
    } else {
      advice.push({
        title: 'Daily Micro-Budgeting',
        message:
          'Checking your daily allowance before noon helps prevent impulse afternoon expenditures.',
        type: 'tip',
        iconEmoji: '💡',
      });
    }

    return advice;
  }
}
