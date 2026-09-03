import React from 'react';
import { AppNavTab } from '../types';

interface BottomNavBarProps {
  activeTab: AppNavTab;
  onChangeTab: (tab: AppNavTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
}) => {
  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 transition-colors"
    >
      <div className="max-w-md mx-auto px-6 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] flex items-center justify-around">
        {/* Daily Tab */}
        <button
          onClick={() => onChangeTab('DAILY')}
          className="flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition cursor-pointer group active:scale-95"
          aria-label="Daily spending tab"
        >
          <div
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              activeTab === 'DAILY'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 shadow-2xs scale-105'
                : 'opacity-70 group-hover:opacity-100'
            }`}
          >
            {/* 3D House SVG */}
            <svg viewBox="0 0 36 36" width="28" height="28" className="drop-shadow-xs">
              <defs>
                <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="50%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#9F1239" />
                </linearGradient>
                <linearGradient id="houseWallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
                <linearGradient id="doorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0284C7" />
                  <stop offset="100%" stopColor="#0369A1" />
                </linearGradient>
              </defs>
              {/* House Base */}
              <rect x="7" y="15" width="22" height="15" rx="3" fill="url(#houseWallGrad)" stroke="#D97706" strokeWidth="1" />
              {/* Roof */}
              <path d="M 5 16 L 18 6 L 31 16 Z" fill="url(#roofGrad)" />
              {/* Chimney */}
              <rect x="23" y="8" width="4" height="6" rx="1" fill="#9F1239" />
              {/* Door */}
              <rect x="14" y="21" width="8" height="9" rx="1.5" fill="url(#doorGrad)" />
              <circle cx="20" cy="25.5" r="0.9" fill="#FEF08A" />
              {/* Window */}
              <rect x="9" y="18" width="4" height="4" rx="1" fill="#BAE6FD" stroke="#0284C7" strokeWidth="0.8" />
              <rect x="23" y="18" width="4" height="4" rx="1" fill="#BAE6FD" stroke="#0284C7" strokeWidth="0.8" />
            </svg>
          </div>
          <span
            className={`text-[11px] font-bold transition-colors ${
              activeTab === 'DAILY'
                ? 'text-indigo-950 dark:text-indigo-300 font-extrabold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Daily
          </span>
        </button>

        {/* Insights Tab */}
        <button
          onClick={() => onChangeTab('INSIGHTS')}
          className="flex flex-col items-center gap-1 py-1 px-5 rounded-2xl transition cursor-pointer group active:scale-95"
          aria-label="Insights analytics tab"
        >
          <div
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              activeTab === 'INSIGHTS'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 shadow-2xs scale-105'
                : 'opacity-70 group-hover:opacity-100'
            }`}
          >
            {/* 3D Bar Chart SVG */}
            <svg viewBox="0 0 36 36" width="28" height="28" className="drop-shadow-xs">
              <defs>
                <linearGradient id="barRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F87171" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <linearGradient id="barGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="barBlue" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="barYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {/* Bar 1 (Red/Orange) */}
              <rect x="7" y="18" width="4.5" height="12" rx="1.5" fill="url(#barRed)" />
              {/* Bar 2 (Green) */}
              <rect x="13.5" y="11" width="4.5" height="19" rx="1.5" fill="url(#barGreen)" />
              {/* Bar 3 (Blue) */}
              <rect x="20" y="7" width="4.5" height="23" rx="1.5" fill="url(#barBlue)" />
              {/* Bar 4 (Yellow) */}
              <rect x="26.5" y="14" width="4.5" height="16" rx="1.5" fill="url(#barYellow)" />
            </svg>
          </div>
          <span
            className={`text-[11px] font-bold transition-colors ${
              activeTab === 'INSIGHTS'
                ? 'text-indigo-950 dark:text-indigo-300 font-extrabold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            Insights
          </span>
        </button>
      </div>
    </nav>
  );
};

