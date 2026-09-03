import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleDarkMode } = useBudget();

  return (
    <button
      onClick={toggleDarkMode}
      type="button"
      className={`p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center ${className}`}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-transform active:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 hover:text-indigo-600 transition-transform active:-rotate-12" />
      )}
    </button>
  );
};
