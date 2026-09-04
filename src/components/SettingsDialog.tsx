import React, { useEffect, useRef, useState } from 'react';
import { BudgetProfile } from '../types';
import { SpendingCalculator } from '../lib/calculator';
import { useBudget } from '../context/BudgetContext';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';
import { trackFeatureAction } from '../lib/analytics';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  RotateCcw,
  Sliders,
  Upload,
  User,
  X,
} from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  profile: BudgetProfile;
  isDark: boolean;
  dailyReminderEnabled: boolean;
  onClose: () => void;
  onToggleDarkMode: () => void;
  onToggleReminder: (enabled: boolean) => void;
  onOpenEditBudget: () => void;
  onOpenEditName: () => void;
  onOpenResetConfirm: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  profile,
  isDark,
  dailyReminderEnabled,
  onClose,
  onToggleDarkMode,
  onToggleReminder,
  onOpenEditBudget,
  onOpenEditName,
  onOpenResetConfirm,
}) => {
  const { exportBackup, importBackup } = useBudget();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      trackFeatureAction('open_settings');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const spendablePool = SpendingCalculator.calculateMonthlySpendable(
    profile.monthlyIncome,
    profile.monthlySavingsGoal
  );

  const handleExport = () => {
    setBackupStatus(null);
    exportBackup();
    trackFeatureAction('export_backup');
    setBackupStatus({
      type: 'success',
      message: 'Budget backup downloaded (.json). Keep it safe!',
    });
  };

  const handleImportClick = () => {
    setBackupStatus(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const result = importBackup(content);
        if (result.success) {
          trackFeatureAction('import_backup');
          setBackupStatus({
            type: 'success',
            message: 'Backup restored successfully!',
          });
        } else {
          setBackupStatus({
            type: 'error',
            message: result.message,
          });
        }
      }
    };
    reader.onerror = () => {
      setBackupStatus({
        type: 'error',
        message: 'Failed to read the selected file.',
      });
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-xs p-4 flex min-h-full items-center justify-center animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-sm my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-200 max-h-[min(90vh,90dvh)] overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Settings & Preferences
            </h2>
            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
              Know your money. Own your day.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User profile row */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Profile Name
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {profile.userName.trim() || 'Friend'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenEditName}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline px-2 py-1 transition cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Edit
          </button>
        </div>

        {/* Financial Parameters Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Parameters
          </p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Monthly Income</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {profile.currencySymbol}{SpendingCalculator.formatAmount(profile.monthlyIncome)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Planned Savings</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {profile.currencySymbol}{SpendingCalculator.formatAmount(profile.monthlySavingsGoal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Monthly Spending Pool
            </span>
            <span className="font-black text-indigo-700 dark:text-indigo-400">
              {profile.currencySymbol}{SpendingCalculator.formatAmount(spendablePool)}
            </span>
          </div>
        </div>

        {/* Daily 8:00 PM Check-In Toggle */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Daily 8:00 PM Check-In
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evening prompt to log spending
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggleReminder(!dailyReminderEnabled)}
            className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              dailyReminderEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            aria-label="Toggle daily reminder"
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                dailyReminderEnabled ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* PWA Home Screen Install Guide */}
        <PWAInstallButton />

        {/* Local Data & Backup Management */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Local Data & Backups
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Stored strictly on this device (v1 schema)
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
              Offline JSON
            </span>
          </div>

          {/* Feedback banner */}
          {backupStatus && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-start gap-2 ${
                backupStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/80'
              }`}
            >
              {backupStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-tight">{backupStatus.message}</div>
              <button
                type="button"
                onClick={() => setBackupStatus(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleExport}
              id="export-backup-button"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition active:scale-[0.98] cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Export Backup</span>
            </button>

            <button
              type="button"
              onClick={handleImportClick}
              id="import-backup-button"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition active:scale-[0.98] cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Import Backup</span>
            </button>
          </div>

          {/* Hidden File Input for Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload budget JSON backup file"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onOpenEditBudget}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-950 hover:bg-indigo-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Edit Monthly Parameters</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenResetConfirm}
            className="w-full flex items-center justify-center gap-1.5 p-3 rounded-2xl border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Data</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Done
        </button>
      </div>
    </div>
  );
};
