import React, { useState, useRef } from 'react';
import { RammysLogo, LogoSwallowPhase } from './RammysLogo';
import { ThemeToggle } from './ThemeToggle';
import { NameCardEntry, CardAnimationPhase } from './NameCardEntry';
import { ArrowRight, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

interface WelcomeScreenProps {
  onContinue: (name: string) => void;
}

type FlowPhase =
  | 'IDLE'
  | 'CONVERGING'
  | 'STACKED'
  | 'LIFTOFF'
  | 'FLYING'
  | 'SWALLOW'
  | 'PULSE'
  | 'COMPLETE';

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('IDLE');
  const [flightTarget, setFlightTarget] = useState<{ x: number; y: number }>({ x: 0, y: -240 });

  const logoRef = useRef<HTMLDivElement>(null);
  const cardEntryContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = userName.trim();
    if (!clean) {
      setError('Please enter your name.');
      return;
    }
    setError('');

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onContinue(clean);
      return;
    }

    // Calculate exact physical coordinates from card deck container to the logo wallet suction aperture
    if (logoRef.current && cardEntryContainerRef.current) {
      const logoRect = logoRef.current.getBoundingClientRect();
      const deckRect = cardEntryContainerRef.current.getBoundingClientRect();
      // Target center of wallet aperture in RammysLogo (x: 49%, y: 37%)
      const targetX = logoRect.left + logoRect.width * 0.49 - (deckRect.left + deckRect.width / 2);
      const targetY = logoRect.top + logoRect.height * 0.37 - (deckRect.top + deckRect.height / 2);
      setFlightTarget({ x: targetX, y: targetY });
    }

    // Phase 1: OUTER -> INNER -> CENTER Convergence
    setFlowPhase('CONVERGING');
  };

  const handleConvergenceDone = () => {
    // Phase 2: STACKED - Pause to let user see the complete deck of playing cards
    setFlowPhase('STACKED');
    haptics.deckComplete();
    setTimeout(() => {
      // Phase 3: LIFTOFF - Deck lifts upward as a unified group
      setFlowPhase('LIFTOFF');
    }, 320);
  };

  const handleLiftoffDone = () => {
    // Phase 4: FLYING - Deck travels toward logo aperture along curved trajectory
    setFlowPhase('FLYING');
  };

  const handleFlightDone = () => {
    // Phase 5: SWALLOW - Deck enters logo and vanishes inside wallet aperture
    setFlowPhase('SWALLOW');
    haptics.logoAbsorb();

    // Phase 6: PULSE - Expanding shockwaves and gold celebration glow
    setTimeout(() => {
      setFlowPhase('PULSE');
    }, 450);

    // Phase 7: Smoothly transition to setup stage
    setTimeout(() => {
      setFlowPhase('COMPLETE');
      onContinue(userName.trim());
    }, 980);
  };

  const isAnimating = flowPhase !== 'IDLE';
  const isButtonEnabled = userName.trim().length > 0 && !isAnimating;

  // Map flow phase to RammysLogo swallowPhase
  const logoPhase: LogoSwallowPhase =
    flowPhase === 'FLYING'
      ? 'ANTICIPATE'
      : flowPhase === 'SWALLOW'
      ? 'SWALLOW'
      : flowPhase === 'PULSE' || flowPhase === 'COMPLETE'
      ? 'PULSE'
      : 'IDLE';

  // Map flow phase to NameCardEntry CardAnimationPhase
  const cardPhase: CardAnimationPhase =
    flowPhase === 'CONVERGING'
      ? 'CONVERGING'
      : flowPhase === 'STACKED'
      ? 'STACKED'
      : flowPhase === 'LIFTOFF'
      ? 'LIFTOFF'
      : flowPhase === 'FLYING'
      ? 'FLYING'
      : flowPhase === 'SWALLOW' || flowPhase === 'PULSE' || flowPhase === 'COMPLETE'
      ? 'SWALLOWED'
      : 'IDLE';

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
        {/* Logo Container with Ref for physics target */}
        <div ref={logoRef} className="relative mb-6">
          <AnimatePresence>
            {(flowPhase === 'FLYING' || flowPhase === 'SWALLOW') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: [0.3, 0.7, 0.4], scale: [0.9, 1.25, 1.15] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-3xl bg-indigo-500/30 dark:bg-indigo-400/25 blur-xl pointer-events-none"
              />
            )}
          </AnimatePresence>

          <RammysLogo
            size={144}
            showBrandingText={true}
            swallowPhase={logoPhase}
          />

          {/* Suction Vortex Ring overlay when Flying */}
          {flowPhase === 'FLYING' && (
            <motion.div
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: [1.3, 0.6], opacity: [0.7, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeIn' }}
              className="absolute top-[26%] left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-2 border-amber-300 pointer-events-none"
            />
          )}
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

      {/* Name Letter Cards Section & Stacking Deck Experience */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
        className="w-full mt-8 min-h-[160px] relative"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="welcome-name-input"
                className="block text-sm font-bold text-[#1E1B4B] dark:text-slate-200"
              >
                What&apos;s your name?
              </label>

              {!isAnimating && userName.trim().length > 0 && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Card deck ready</span>
                </span>
              )}
            </div>

            {/* Individual Letter Cards Input Container */}
            <div ref={cardEntryContainerRef} className="relative">
              <NameCardEntry
                userName={userName}
                onChange={(val) => {
                  setUserName(val);
                  if (error) setError('');
                }}
                onSubmit={handleSubmit}
                disabled={isAnimating}
                error={error}
                phase={cardPhase}
                flightTarget={flightTarget}
                onConvergenceDone={handleConvergenceDone}
                onLiftoffDone={handleLiftoffDone}
                onFlightDone={handleFlightDone}
              />
            </div>
          </div>

          {/* Action Button & Progression Feedback */}
          {!isAnimating ? (
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
          ) : (
            /* Live Progression Feedback during Convergence, Stacking, Flight & Swallow */
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 shadow-xs text-center space-y-2.5"
            >
              <div className="flex flex-col items-center justify-center gap-1.5 min-h-[28px]">
                {flowPhase === 'CONVERGING' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <span>Gathering letter cards into a deck...</span>
                  </motion.p>
                )}

                {flowPhase === 'STACKED' && (
                  <motion.p
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>Deck completed for {userName.trim()}!</span>
                  </motion.p>
                )}

                {(flowPhase === 'LIFTOFF' || flowPhase === 'FLYING') && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Vaulting deck into Rammy&apos;s Wallet...</span>
                  </motion.p>
                )}

                {flowPhase === 'SWALLOW' && (
                  <motion.p
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: [0.9, 1.12, 1], opacity: 1 }}
                    className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                  >
                    <span>✨ Absorbed into Rammy&apos;s Wallet!</span>
                  </motion.p>
                )}

                {(flowPhase === 'PULSE' || flowPhase === 'COMPLETE') && (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Personal space created for {userName.trim()}!</span>
                  </motion.div>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                <motion.div
                  initial={{ width: '15%' }}
                  animate={{
                    width:
                      flowPhase === 'CONVERGING'
                        ? '35%'
                        : flowPhase === 'STACKED'
                        ? '55%'
                        : flowPhase === 'LIFTOFF'
                        ? '70%'
                        : flowPhase === 'FLYING'
                        ? '85%'
                        : flowPhase === 'SWALLOW'
                        ? '95%'
                        : '100%',
                  }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    flowPhase === 'PULSE' || flowPhase === 'COMPLETE'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-600'
                  }`}
                />
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>
      </div>
    </div>
  );
};

