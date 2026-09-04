import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RammysLogo } from './RammysLogo';

interface AppOpeningScreenProps {
  onComplete: () => void;
}

export const AppOpeningScreen: React.FC<AppOpeningScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Short, premium opening sequence: 850ms then transition out
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 850);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1150);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="app-opening-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FBFBFE] dark:bg-slate-950 select-none overflow-hidden"
          onClick={() => {
            setIsVisible(false);
            onComplete();
          }}
        >
          {/* Subtle Ambient Background Glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.45, 0.25], scale: [0.85, 1.2, 1.1] }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className="absolute w-72 h-72 rounded-full bg-indigo-400/20 dark:bg-indigo-600/25 blur-3xl pointer-events-none"
          />

          {/* Logo with gentle scale & elevation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <RammysLogo size={140} showBrandingText={true} />
          </motion.div>

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-4 tracking-wide"
          >
            Smart Daily Spend Tracker
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
