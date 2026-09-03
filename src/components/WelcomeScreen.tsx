import React, { useState } from 'react';
import { RammysLogo } from './RammysLogo';
import { ThemeToggle } from './ThemeToggle';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeScreenProps {
  onContinue: (name: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = userName.trim();
    if (!clean) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    onContinue(clean);
  };

  const isButtonEnabled = userName.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] max-w-sm mx-auto transition-colors relative">
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1.25rem)] right-5">
        <ThemeToggle />
      </div>

      {/* Brand & Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center text-center"
      >
        {/* Logo Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 1, 0.5, 1] }}
          className="mb-6 transform hover:scale-105 transition duration-300"
        >
          <RammysLogo size={140} showBrandingText={true} />
        </motion.div>

        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Welcome to
        </p>

        <h1 className="text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight mt-1">
          Rammy's Spend Tracker
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">
          &ldquo;Let&apos;s make your money work a little smarter.&rdquo;
        </p>
      </motion.div>

      {/* Input Form Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
        className="w-full mt-10"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="welcome-name-input"
              className="block text-sm font-bold text-[#1E1B4B] dark:text-slate-200 mb-2"
            >
              What&apos;s your name?
            </label>
            <input
              id="welcome-name-input"
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your name"
              className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white border ${
                error
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-slate-200 dark:border-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950'
              } shadow-2xs outline-none transition`}
              autoFocus
            />
            {error && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1.5">
                {error}
              </p>
            )}
          </div>

          <motion.button
            whileTap={isButtonEnabled ? { scale: 0.98 } : undefined}
            type="submit"
            id="welcome-continue-button"
            disabled={!isButtonEnabled}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              isButtonEnabled
                ? 'bg-[#120E3D] hover:bg-[#1a1458] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-md'
                : 'bg-[#CCD2DE] dark:bg-slate-800 text-white dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

