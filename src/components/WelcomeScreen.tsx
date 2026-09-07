import React, { useState, useRef, useEffect } from 'react';
import { RammysLogo } from './RammysLogo';
import { ThemeToggle } from './ThemeToggle';
import {
  NameCardEntry,
  NameCardEntryHandle,
  CardAnimationPhase,
} from './NameCardEntry';
import { ArrowRight, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface WelcomeScreenProps {
  onContinue: (name: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [flowPhase, setFlowPhase] = useState<CardAnimationPhase>('IDLE');

  const cardEntryRef = useRef<NameCardEntryHandle>(null);
  const animationTimersRef = useRef<number[]>([]);

  // Cleanup pending animation timers on unmount
  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach((id) => clearTimeout(id));
      animationTimersRef.current = [];
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = userName.trim();
    if (!clean) {
      setError('Please enter your name.');
      return;
    }
    setError('');

    // Clear previous timers
    animationTimersRef.current.forEach((id) => clearTimeout(id));
    animationTimersRef.current = [];

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setFlowPhase('SUCCESS_CARD');
      const timer = window.setTimeout(() => {
        setFlowPhase('SETTLED');
      }, 350);
      animationTimersRef.current.push(timer);
      return;
    }

    // Trigger GPU-accelerated Web Animations API sequence
    setFlowPhase('ANIMATING');
    requestAnimationFrame(() => {
      cardEntryRef.current?.startAnimation({
        onSuccessCard: () => {
          setFlowPhase('SUCCESS_CARD');
        },
        onSettled: () => {
          setFlowPhase('SETTLED');
        },
      });
    });
  };

  const handleEditName = () => {
    animationTimersRef.current.forEach((id) => clearTimeout(id));
    animationTimersRef.current = [];
    cardEntryRef.current?.resetAnimation();
    setFlowPhase('IDLE');
  };

  const handleProceed = () => {
    onContinue(userName.trim());
  };

  const isAnimating = flowPhase === 'ANIMATING';
  const isButtonEnabled = userName.trim().length > 0 && !isAnimating;

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] max-w-sm mx-auto transition-colors relative">
      <div className="absolute top-[calc(env(safe-area-inset-top,0px)+1.25rem)] right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full my-auto py-2 flex flex-col items-center">
        {/* Brand & Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="w-full flex flex-col items-center text-center"
        >
          {/* Logo Container */}
          <div className="relative mb-5">
            <RammysLogo
              size={140}
              showBrandingText={true}
              swallowPhase={
                flowPhase === 'SUCCESS_CARD' || flowPhase === 'SETTLED'
                  ? 'CELEBRATE'
                  : 'IDLE'
              }
            />
          </div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Welcome to
          </p>

          <h1 className="text-2xl font-black text-[#1E1B4B] dark:text-white tracking-tight mt-1">
            Rammy&apos;s Spend Tracker
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">
            &ldquo;Let&apos;s make your money work a little smarter.&rdquo;
          </p>
        </motion.div>

        {/* Name Letter Cards Section & Cinematic Experience */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
          className="w-full mt-7 min-h-[160px] relative"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="welcome-name-input"
                  className="block text-sm font-bold text-[#1E1B4B] dark:text-slate-200"
                >
                  {flowPhase === 'SETTLED'
                    ? 'Card ready'
                    : "What's your name?"}
                </label>

                {!isAnimating && userName.trim().length > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Card deck ready</span>
                  </span>
                )}
              </div>

              {/* Individual Letter Cards Input Stage */}
              <div className="relative">
                <NameCardEntry
                  ref={cardEntryRef}
                  userName={userName}
                  onChange={(val) => {
                    setUserName(val);
                    if (error) setError('');
                  }}
                  onSubmit={handleSubmit}
                  disabled={isAnimating}
                  error={error}
                  phase={flowPhase}
                />
              </div>
            </div>

            {/* Action Buttons: Initial Continue Button vs. Post-Animation Revealed Continue Button */}
            {flowPhase === 'SETTLED' ? (
              /* Revealed Continue Button Underneath Settled Green Success Card */
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2.5 pt-1"
              >
                <button
                  type="button"
                  id="welcome-continue-button"
                  onClick={handleProceed}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-[#120E3D] hover:bg-[#1a1458] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.98]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleEditName}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer py-1 px-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    Change name
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileTap={
                  isButtonEnabled && !isAnimating ? { scale: 0.98 } : undefined
                }
                type="submit"
                id="welcome-continue-button"
                disabled={!isButtonEnabled || isAnimating}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  isButtonEnabled && !isAnimating
                    ? 'bg-[#120E3D] hover:bg-[#1a1458] dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-md'
                    : 'bg-[#CCD2DE] dark:bg-slate-800 text-white dark:text-slate-400 cursor-not-allowed opacity-70'
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};
