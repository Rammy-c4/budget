import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ResetConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmDialog: React.FC<ResetConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Reset All Data?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This will permanently erase your budget profile, recorded expenses, and history. This action cannot be undone.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            Yes, Reset Everything
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
