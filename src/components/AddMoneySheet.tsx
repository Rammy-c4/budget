import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AddMoneySheetProps {
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (amount: number, description?: string, dateString?: string) => void;
  defaultDateString?: string;
}

export const AddMoneySheet: React.FC<AddMoneySheetProps> = ({
  currencySymbol,
  isOpen,
  onClose,
  onAdd,
  defaultDateString,
}) => {
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [dateString, setDateString] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmountInput('');
      setDescription('');
      const today = new Date().toISOString().split('T')[0];
      setDateString(defaultDateString || today);
    }
  }, [isOpen, defaultDateString]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountInput);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }
    onAdd(numericAmount, description.trim(), dateString);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 p-5 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[min(92vh,90dvh)] sm:max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Add Money
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Record extra or unexpected income to boost your budget
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div className="space-y-1">
            <label
              htmlFor="add-money-amount"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Amount Added
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {currencySymbol}
              </span>
              <input
                id="add-money-amount"
                type="number"
                step="any"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-4 py-3.5 rounded-2xl text-3xl font-black bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-1">
            <label
              htmlFor="add-money-desc"
              className="text-xs font-bold text-slate-600 dark:text-slate-400"
            >
              Source / Note (Optional)
            </label>
            <input
              id="add-money-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Birthday gift, freelance bonus, side gig, refund"
              className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-800 outline-none transition"
            />
          </div>

          {/* Date input */}
          <div className="space-y-1">
            <label
              htmlFor="add-money-date"
              className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Received</span>
            </label>
            <input
              id="add-money-date"
              type="date"
              value={dateString}
              onChange={(e) => setDateString(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
              required
            />
          </div>

          {/* Impact preview */}
          {parseFloat(amountInput) > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-xs">
              <span className="font-bold block">✨ Boosts your daily allowance</span>
              <span>
                Adding {currencySymbol}{parseFloat(amountInput).toFixed(2)} will immediately expand your spendable budget pool.
              </span>
            </div>
          )}

          {/* Submit button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            id="add-money-submit-button"
            disabled={!amountInput || parseFloat(amountInput) <= 0}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="w-5 h-5" />
            <span>Add to Budget</span>
          </motion.button>
        </form>
      </div>
    </div>
  );
};
