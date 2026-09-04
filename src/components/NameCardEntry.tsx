import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

export type CardAnimationPhase =
  | 'IDLE'
  | 'CONVERGING'
  | 'STACKED'
  | 'LIFTOFF'
  | 'FLYING'
  | 'SWALLOWED';

interface NameCardEntryProps {
  userName: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string;
  phase: CardAnimationPhase;
  flightTarget: { x: number; y: number };
  onConvergenceDone: () => void;
  onLiftoffDone: () => void;
  onFlightDone: () => void;
}

interface CardDelta {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  stackY: number;
  stackX: number;
}

export const NameCardEntry: React.FC<NameCardEntryProps> = ({
  userName,
  onChange,
  onSubmit,
  disabled = false,
  error = '',
  phase,
  flightTarget,
  onConvergenceDone,
  onLiftoffDone,
  onFlightDone,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [cardDeltas, setCardDeltas] = useState<CardDelta[]>([]);

  const letters = userName.split('');
  const count = letters.length;
  const isAnimating = phase !== 'IDLE';

  // Keep hidden input focused when not animating
  const focusInput = () => {
    if (!isAnimating && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  // Determine responsive card size class based on character count and type
  const getCardSizeClass = (isSpace: boolean) => {
    if (isSpace) {
      if (count <= 6) return 'w-5 sm:w-6 h-12 sm:h-14';
      if (count <= 9) return 'w-4.5 sm:w-5.5 h-11 sm:h-13';
      return 'w-4 sm:w-5 h-10 sm:h-12';
    }
    if (count <= 6) {
      return 'w-9 h-12 sm:w-11 sm:h-14 text-base sm:text-lg';
    }
    if (count <= 9) {
      return 'w-8 h-11 sm:w-9.5 sm:h-13 text-sm sm:text-base';
    }
    if (count <= 13) {
      return 'w-7.5 h-10 sm:w-8.5 sm:h-12 text-xs sm:text-sm';
    }
    return 'w-6.5 h-9 sm:w-7.5 sm:h-10.5 text-[11px] sm:text-xs';
  };

  // Measure and compute physical convergence trajectory when phase turns to CONVERGING
  useEffect(() => {
    if (phase === 'CONVERGING' && deckRef.current && count > 0) {
      const containerRect = deckRef.current.getBoundingClientRect();
      const centerX = containerRect.left + containerRect.width / 2;
      const centerY = containerRect.top + containerRect.height / 2;

      const centerIdx = (count - 1) / 2;
      const maxDist = Math.max(centerIdx, 0.5);

      const deltas: CardDelta[] = [];
      let maxCardTime = 0;
      const ranksSet = new Set<number>();

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) {
          deltas.push({ x: 0, y: 0, rotate: 0, delay: 0, stackX: 0, stackY: 0 });
          continue;
        }

        const rect = el.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        const dx = centerX - cardCenterX;
        const dy = centerY - cardCenterY;

        // Physical playing card stacking offsets:
        // 1. Vertical offset: stack slightly offset vertically so every card's top edge is visible
        const stackY = (i - centerIdx) * -2.6;
        // 2. Subtle alternating horizontal jitter for tactile playing card look
        const stackX = (i % 2 === 0 ? 1 : -1) * (1.2 + (i % 3) * 0.5);
        // 3. Natural slight rotation (between -2.8deg and +2.8deg)
        const stackRotate = (i % 2 === 0 ? -1 : 1) * (1.3 + (i % 3) * 0.7);

        // OUTER -> INNER -> CENTER convergence delay
        // Distance from center determines when card begins moving
        const dist = Math.abs(i - centerIdx);
        const rank = Math.round(maxDist - dist);
        ranksSet.add(rank);
        // Micro-stagger between left and right card of the pair (40ms)
        const sideStagger = i < centerIdx ? 0 : 40;
        const delay = (rank * 110 + sideStagger) / 1000;

        const totalCardArrival = delay * 1000 + 400; // 400ms landing duration
        if (totalCardArrival > maxCardTime) {
          maxCardTime = totalCardArrival;
        }

        deltas.push({
          x: dx + stackX,
          y: dy + stackY,
          rotate: stackRotate,
          delay,
          stackX,
          stackY,
        });
      }

      setCardDeltas(deltas);

      // Schedule synchronized haptic pulse for each meaningful card landing/convergence:
      // The visual sequence is:
      // outer cards converge -> land
      // next outer cards converge -> land
      // next cards converge -> land
      // remaining cards complete the deck
      const hapticTimers: number[] = [];
      const uniqueRanks = Array.from(ranksSet).sort((a, b) => a - b);
      const totalRanks = uniqueRanks.length;

      uniqueRanks.forEach((rank, rankIndex) => {
        // Landing moment: each card begins moving at delay = rank * 110 (+ sideStagger)
        // With duration: 0.42s and [0.22, 1, 0.36, 1] cubic bezier ease, the cards
        // physically hit and settle on the stack at approx rank * 110 + 410ms.
        const landingTimeMs = rank * 110 + 410;

        const timerId = window.setTimeout(() => {
          if (totalRanks === 1) {
            haptics.cardLand('final');
          } else if (rankIndex === 0) {
            haptics.cardLand('outer');
          } else if (rankIndex === totalRanks - 1) {
            haptics.cardLand('final');
          } else {
            haptics.cardLand('middle');
          }
        }, landingTimeMs);

        hapticTimers.push(timerId);
      });

      // Once all cards finish landing on stack, trigger onConvergenceDone
      const completionTimer = window.setTimeout(() => {
        onConvergenceDone();
      }, maxCardTime + 50);

      return () => {
        hapticTimers.forEach((id) => clearTimeout(id));
        clearTimeout(completionTimer);
      };
    }
  }, [phase, count, onConvergenceDone]);

  // Handle Liftoff step
  useEffect(() => {
    if (phase === 'LIFTOFF') {
      const timer = setTimeout(() => {
        onLiftoffDone();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [phase, onLiftoffDone]);

  // Handle Flying step
  useEffect(() => {
    if (phase === 'FLYING') {
      const timer = setTimeout(() => {
        onFlightDone();
      }, 760);
      return () => clearTimeout(timer);
    }
  }, [phase, onFlightDone]);

  const isConvergedOrFlying =
    phase === 'CONVERGING' ||
    phase === 'STACKED' ||
    phase === 'LIFTOFF' ||
    phase === 'FLYING' ||
    phase === 'SWALLOWED';

  return (
    <div className="w-full relative select-none" onClick={focusInput}>
      {/* Real Accessible Hidden Input */}
      <input
        ref={hiddenInputRef}
        id="welcome-name-input"
        type="text"
        value={userName}
        onChange={(e) => {
          if (!isAnimating) {
            onChange(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled || isAnimating}
        maxLength={20}
        aria-label="What's your name?"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        autoFocus
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20 pointer-events-auto"
      />

      {/* Main Card Stage / Container */}
      <div
        className={`relative min-h-[72px] sm:min-h-[80px] w-full p-2.5 sm:p-3 rounded-2xl flex items-center justify-center transition-all ${
          isAnimating
            ? 'bg-transparent border-transparent'
            : isFocused
            ? 'bg-indigo-50/40 dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/10'
            : 'bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Animated Deck Group Wrapper (Used for unified LIFTOFF and FLYING toward logo) */}
        <motion.div
          ref={deckRef}
          animate={
            phase === 'LIFTOFF'
              ? {
                  y: -24,
                  scale: 1.06,
                  rotate: -2,
                  opacity: 1,
                }
              : phase === 'FLYING'
              ? {
                  x: [0, -18, flightTarget.x * 0.64, flightTarget.x],
                  y: [-24, -65, flightTarget.y * 0.72, flightTarget.y],
                  scale: [1.06, 0.94, 0.52, 0.08],
                  rotate: [-2, -6, 4, 0],
                  opacity: [1, 1, 0.95, 0],
                }
              : phase === 'SWALLOWED'
              ? {
                  x: flightTarget.x,
                  y: flightTarget.y,
                  scale: 0,
                  opacity: 0,
                }
              : {
                  x: 0,
                  y: 0,
                  scale: 1,
                  rotate: 0,
                  opacity: 1,
                }
          }
          transition={
            phase === 'LIFTOFF'
              ? { duration: 0.28, ease: 'easeOut' }
              : phase === 'FLYING'
              ? { duration: 0.76, ease: [0.32, 0, 0.24, 1] }
              : { duration: 0.2 }
          }
          className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full transform-gpu"
        >
          {/* EMPTY STATE: 4 Ghost Playing Card Slots with Blinking Cursor */}
          {count === 0 && !isAnimating && (
            <div className="flex items-center gap-2 py-1">
              {[0, 1, 2, 3].map((slotIdx) => (
                <div
                  key={`ghost-slot-${slotIdx}`}
                  className="w-9 h-12 sm:w-11 sm:h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 select-none transition-colors"
                >
                  {slotIdx === 0 && isFocused ? (
                    <motion.div
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-0.5 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-bold opacity-40">·</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ACTIVE INDIVIDUAL LETTER CARDS */}
          <AnimatePresence mode="popLayout" initial={false}>
            {letters.map((char, index) => {
              const delta = cardDeltas[index];
              const isSpace = char === ' ';
              const cardSize = getCardSizeClass(isSpace);

              return (
                <motion.div
                  key={`letter-card-${index}`}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  layout="position"
                  initial={{ scale: 0.3, y: 10, opacity: 0 }}
                  animate={
                    phase === 'CONVERGING' && delta
                      ? {
                          x: [0, delta.x * 0.5, delta.x * 1.015, delta.x],
                          y: [0, delta.y * 0.5 - 8, delta.y + 1.2, delta.y],
                          rotate: [0, index % 2 === 0 ? -4 : 4, delta.rotate * 1.1, delta.rotate],
                          scale: [1, 1.04, 0.98, 1],
                          opacity: 1,
                        }
                      : isConvergedOrFlying && delta
                      ? {
                          x: delta.x,
                          y: delta.y,
                          rotate: delta.rotate,
                          scale: 1,
                          opacity: 1,
                        }
                      : {
                          scale: [0.3, 1.1, 1],
                          y: 0,
                          x: 0,
                          rotate: 0,
                          opacity: 1,
                        }
                  }
                  exit={{
                    scale: 0.2,
                    y: 6,
                    opacity: 0,
                    transition: { duration: 0.14, ease: 'easeIn' },
                  }}
                  transition={
                    phase === 'CONVERGING' && delta
                      ? {
                          duration: 0.42,
                          delay: delta.delay,
                          ease: [0.22, 1, 0.36, 1],
                        }
                      : {
                          duration: 0.22,
                          ease: [0.25, 1, 0.5, 1],
                        }
                  }
                  style={{
                    zIndex: isConvergedOrFlying ? 10 + index : 1,
                  }}
                  className={`relative ${cardSize} rounded-xl flex items-center justify-center font-black select-none transform-gpu transition-shadow ${
                    isSpace
                      ? 'bg-slate-100/80 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                      : 'bg-white dark:bg-slate-800 text-[#1E1B4B] dark:text-white border border-slate-200/90 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-900 shadow-xs'
                  } ${isConvergedOrFlying ? 'shadow-md ring-1 ring-black/5 dark:ring-white/5' : ''}`}
                >
                  {/* Subtle Inner Bezel Highlight for tactile paper card feel */}
                  {!isSpace && (
                    <div className="absolute inset-[2px] rounded-[9px] border border-indigo-50/70 dark:border-slate-700/50 pointer-events-none" />
                  )}

                  {/* Character Display */}
                  <span className="uppercase tracking-normal drop-shadow-2xs">
                    {isSpace ? '␣' : char}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Active Typing Blinking Cursor after last letter */}
          {count > 0 && !isAnimating && isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
              className="w-0.5 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0 ml-0.5"
            />
          )}
        </motion.div>
      </div>

      {/* Helper Prompt or Error Message */}
      <div className="min-h-[20px] mt-1.5 px-1 flex items-center justify-between">
        {error ? (
          <p className="text-xs font-bold text-red-600 dark:text-red-400 animate-in fade-in duration-150">
            {error}
          </p>
        ) : count === 0 && !isAnimating ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Tap anywhere to type your name
          </p>
        ) : !isAnimating ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {count} {count === 1 ? 'letter' : 'letters'}
          </p>
        ) : null}
      </div>
    </div>
  );
};
