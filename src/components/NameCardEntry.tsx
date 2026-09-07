import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '../lib/haptics';

export type CardAnimationPhase =
  | 'IDLE'
  | 'ANIMATING'
  | 'SUCCESS_CARD'
  | 'SETTLED'
  | 'ANTICIPATE'
  | 'ORBIT_FORM'
  | 'ORBIT_RING'
  | 'COLLAPSE'
  | 'DECK_STACKED'
  | 'CONVERGING'
  | 'STACKED'
  | 'LIFTOFF'
  | 'FLYING'
  | 'SWALLOWED';

export interface NameCardEntryHandle {
  startAnimation: (callbacks?: {
    onSuccessCard?: () => void;
    onSettled?: () => void;
  }) => void;
  resetAnimation: () => void;
}

interface NameCardEntryProps {
  userName: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string;
  phase: CardAnimationPhase;
}

export const NameCardEntry = forwardRef<NameCardEntryHandle, NameCardEntryProps>(
  (
    {
      userName,
      onChange,
      onSubmit,
      disabled = false,
      error = '',
      phase,
    },
    ref
  ) => {
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const orbitRadiusRef = useRef(64);

    // Track unique IDs for each entered card position to trigger one-time perimeter glow animation
    const cardIdsRef = useRef<number[]>([]);
    const nextCardIdRef = useRef(1);
    const prevNameRef = useRef('');

    if (userName !== prevNameRef.current) {
      const newIds: number[] = [];
      for (let i = 0; i < userName.length; i++) {
        if (
          i < cardIdsRef.current.length &&
          userName[i] === prevNameRef.current[i]
        ) {
          newIds[i] = cardIdsRef.current[i];
        } else {
          newIds[i] = nextCardIdRef.current++;
        }
      }
      cardIdsRef.current = newIds;
      prevNameRef.current = userName;
    }

    const activeAnimationsRef = useRef<Animation[]>([]);
    const timersRef = useRef<number[]>([]);

    const letters = userName.split('');
    const count = letters.length;

    const isAnimating = phase === 'ANIMATING';
    const showSuccessCard = phase === 'SUCCESS_CARD' || phase === 'SETTLED';

    // Cleanup active WAAPI animations and haptic timers
    const cleanupActiveAnimations = () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];

      activeAnimationsRef.current.forEach((anim) => {
        try {
          anim.cancel();
        } catch {
          // ignore
        }
      });
      activeAnimationsRef.current = [];

      // Reset card elements styles to clean state
      cardRefs.current.forEach((el) => {
        if (el) {
          el.style.willChange = 'auto';
          el.style.transform = '';
          el.style.opacity = '';
        }
      });

      if (ringRef.current) {
        ringRef.current.style.willChange = 'auto';
        ringRef.current.style.transform = 'translate3d(-50%, -50%, 0) scale(0.7)';
        ringRef.current.style.opacity = '0';
      }
    };

    useEffect(() => {
      return () => {
        cleanupActiveAnimations();
      };
    }, []);

    // Expose imperative handle to trigger GPU-accelerated continuous motion with zero React re-renders
    useImperativeHandle(ref, () => ({
      startAnimation: (callbacks) => {
        cleanupActiveAnimations();

        if (!deckRef.current || count === 0) {
          callbacks?.onSuccessCard?.();
          callbacks?.onSettled?.();
          return;
        }

        // Single synchronous read pass before any style changes (zero layout thrashing)
        const containerRect = deckRef.current.getBoundingClientRect();
        const centerX = containerRect.left + containerRect.width / 2;
        const centerY = containerRect.top + containerRect.height / 2;
        const containerW = containerRect.width || 320;

        // Bounded responsive radius to fit cleanly on 320px, 375px, 430px viewports
        // Harmonized with card dimensions so cards never collide or clip
        const baseRadius = Math.min(containerW * 0.27, 78);
        const radius = Math.max(54, Math.min(baseRadius, 46 + count * 2.8));
        orbitRadiusRef.current = radius;

        if (ringRef.current) {
          ringRef.current.style.width = `${radius * 2}px`;
          ringRef.current.style.height = `${radius * 2}px`;
        }

        // Harmonious orbital scale ensuring cards maintain clean breathing room during the 2 spins
        const orbitScale = count <= 4 ? 1.0 : count <= 8 ? 0.94 : 0.88;
        const centerIdx = (count - 1) / 2;

        const totalDuration = 3200; // Total WAAPI timeline duration in ms

        // Construct GPU-accelerated Keyframe timeline for each individual card
        for (let i = 0; i < count; i++) {
          const el = cardRefs.current[i];
          if (!el) continue;

          const rect = el.getBoundingClientRect();
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;

          const initDx = cardCenterX - centerX;
          const initDy = cardCenterY - centerY;

          // 1. Target circular coordinates for orbital track
          const theta = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          const orbitX0 = radius * Math.cos(theta);
          const orbitY0 = radius * Math.sin(theta);

          const deltaOrbitX0 = orbitX0 - initDx;
          const deltaOrbitY0 = orbitY0 - initDy;

          // 2. Final physical playing card stack offsets at center
          const stackY = (i - centerIdx) * -2.4;
          const stackX = (i % 2 === 0 ? 1 : -1) * (1.2 + (i % 3) * 0.5);
          const stackRotate = (i % 2 === 0 ? -1 : 1) * (1.3 + (i % 3) * 0.7);

          const deltaDeckX = stackX - initDx;
          const deltaDeckY = stackY - initDy;

          const cardKeyframes: Keyframe[] = [
            // Frame 0: Idle rest
            {
              offset: 0,
              transform: 'translate3d(0px, 0px, 0) rotate(0deg) scale(1)',
              opacity: 1,
              easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)',
            },
            // Frame 1: Anticipation lift (stays upright)
            {
              offset: 0.08,
              transform: 'translate3d(0px, -10px, 0) rotate(0deg) scale(1.04)',
              opacity: 1,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            },
          ];

          // Phase 2: Smooth tangential entry curve into the orbital ring (offset 0.08 -> 0.18)
          // 4 intermediate points eliminate any angular snap upon entering the circular track
          for (let m = 1; m <= 4; m++) {
            const p = m / 4;
            const offset = 0.08 + p * 0.10;
            const pEase = 3 * p * p - 2 * p * p * p; // smoothstep
            const midArcLift = Math.sin(p * Math.PI) * 6;
            const curX = deltaOrbitX0 * pEase;
            const curY = -10 * (1 - pEase) + deltaOrbitY0 * pEase - midArcLift;
            const curScale = 1.04 * (1 - pEase) + orbitScale * pEase;

            cardKeyframes.push({
              offset: Number(offset.toFixed(4)),
              transform: `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(
                2
              )}px, 0) rotate(0deg) scale(${curScale.toFixed(3)})`,
              opacity: 1,
              easing: 'linear',
            });
          }

          // Phase 3: TWO FULL SMOOTH REVOLUTIONS (720 deg / 4*PI radians) (offset 0.18 -> 0.66)
          // High-density sampling (64 steps) with cosine velocity profiling:
          // Zero initial jerk, fluid acceleration into Lap 1, peak orbital whirl, and gentle transition into Lap 2.
          // The cards orbit around the center, but each card remains strictly UPRIGHT (rotate: 0deg).
          const spinStartFrac = 0.18;
          const spinEndFrac = 0.66;
          const numSpinSteps = 64;

          for (let s = 1; s <= numSpinSteps; s++) {
            const u = s / numSpinSteps;
            const offset = spinStartFrac + u * (spinEndFrac - spinStartFrac);
            // Continuous cosine ease-in-out profile: completely eliminates polygon stutter and velocity jumps
            const sigma = (1 - Math.cos(Math.PI * u)) / 2;
            const alpha = theta + sigma * (4 * Math.PI); // 2 full revolutions around center
            const ox = radius * Math.cos(alpha);
            const oy = radius * Math.sin(alpha);
            const deltaX = ox - initDx;
            const deltaY = oy - initDy;

            cardKeyframes.push({
              offset: Number(offset.toFixed(4)),
              transform: `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(
                2
              )}px, 0) rotate(0deg) scale(${orbitScale})`,
              opacity: 1,
              easing: 'linear',
            });
          }

          // Phase 4: Inward swirling vortex spiral collapse into the playing card deck (offset 0.66 -> 0.84)
          // 20 fine sample steps ensure a silky, fluid vortex without linear facets
          const collapseStartFrac = 0.66;
          const collapseEndFrac = 0.84;
          const spiralSteps = 20;

          for (let vStep = 1; vStep <= spiralSteps; vStep++) {
            const v = vStep / spiralSteps;
            const offset =
              collapseStartFrac + v * (collapseEndFrac - collapseStartFrac);
            const vEase = (1 - Math.cos(Math.PI * v)) / 2;
            const rSpiral = radius * Math.pow(1 - vEase, 1.25);
            const curlAngle = theta + 4 * Math.PI + v * 1.2; // ~68 deg continuous forward sweep
            const spiralOx = rSpiral * Math.cos(curlAngle);
            const spiralOy = rSpiral * Math.sin(curlAngle);

            const deltaX = spiralOx * (1 - vEase) + stackX * vEase - initDx;
            const deltaY = spiralOy * (1 - vEase) + stackY * vEase - initDy;

            // Transition gently from upright (0deg) to final stacked deck tilt
            const rot = stackRotate * vEase;
            const scale = orbitScale * (1 - vEase) + 1.0 * vEase;

            cardKeyframes.push({
              offset: Number(offset.toFixed(4)),
              transform: `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(
                2
              )}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
              opacity: 1,
              easing: 'linear',
            });
          }

          // Phase 5: Deck Micro-Settle & Stack Cushion (offset 0.84 -> 0.94)
          cardKeyframes.push({
            offset: 0.89,
            transform: `translate3d(${deltaDeckX.toFixed(
              2
            )}px, ${deltaDeckY.toFixed(2)}px, 0) rotate(${stackRotate.toFixed(
              2
            )}deg) scale(1.02)`,
            opacity: 1,
            easing: 'ease-in-out',
          });

          cardKeyframes.push({
            offset: 0.94,
            transform: `translate3d(${deltaDeckX.toFixed(
              2
            )}px, ${deltaDeckY.toFixed(2)}px, 0) rotate(${stackRotate.toFixed(
              2
            )}deg) scale(1)`,
            opacity: 1,
            easing: 'ease-in',
          });

          // Phase 6: Settle & bloom transition into Green Success Card (offset 0.94 -> 1.00)
          cardKeyframes.push({
            offset: 1.0,
            transform: `translate3d(${deltaDeckX.toFixed(
              2
            )}px, ${deltaDeckY.toFixed(2)}px, 0) rotate(${stackRotate.toFixed(
              2
            )}deg) scale(0.85)`,
            opacity: 0,
          });

          if (typeof el.animate === 'function') {
            const anim = el.animate(cardKeyframes, {
              duration: totalDuration,
              fill: 'forwards',
              easing: 'linear',
            });
            activeAnimationsRef.current.push(anim);
          }
        }

        // Orbit ring keyframes: locked with the cosine 2-spin profile
        if (ringRef.current) {
          const ringKeyframes: Keyframe[] = [
            {
              offset: 0,
              transform: 'translate3d(-50%, -50%, 0) scale(0.7) rotate(0deg)',
              opacity: 0,
              easing: 'ease-in-out',
            },
            {
              offset: 0.08,
              transform: 'translate3d(-50%, -50%, 0) scale(0.75) rotate(0deg)',
              opacity: 0,
              easing: 'ease-out',
            },
            {
              offset: 0.18,
              transform: 'translate3d(-50%, -50%, 0) scale(1) rotate(0deg)',
              opacity: 0.85,
              easing: 'linear',
            },
          ];

          // 16 intermediate steps for ring rotation matching the card spin
          for (let k = 1; k <= 16; k++) {
            const u = k / 16;
            const offset = 0.18 + u * (0.66 - 0.18);
            const sigma = (1 - Math.cos(Math.PI * u)) / 2;
            const rot = 720 * sigma;

            ringKeyframes.push({
              offset: Number(offset.toFixed(4)),
              transform: `translate3d(-50%, -50%, 0) scale(1) rotate(${rot.toFixed(
                1
              )}deg)`,
              opacity: 0.85,
              easing: 'linear',
            });
          }

          // Spiral collapse for ring
          for (let rk = 1; rk <= 4; rk++) {
            const v = rk / 4;
            const offset = 0.66 + v * (0.84 - 0.66);
            const scale = 1.0 * (1 - v) + 0.25 * v;
            const rot = 720 + 120 * v;
            const op = 0.85 * (1 - v);

            ringKeyframes.push({
              offset: Number(offset.toFixed(4)),
              transform: `translate3d(-50%, -50%, 0) scale(${scale.toFixed(
                2
              )}) rotate(${rot.toFixed(1)}deg)`,
              opacity: Number(op.toFixed(2)),
              easing: 'linear',
            });
          }

          ringKeyframes.push({
            offset: 1.0,
            transform: 'translate3d(-50%, -50%, 0) scale(0.25) rotate(840deg)',
            opacity: 0,
          });

          if (typeof ringRef.current.animate === 'function') {
            const ringAnim = ringRef.current.animate(ringKeyframes, {
              duration: totalDuration,
              fill: 'forwards',
              easing: 'linear',
            });
            activeAnimationsRef.current.push(ringAnim);
          }
        }

        // Crisp, synchronized haptics (no high-frequency timer flooding):
        // 1. Lap 1 peak whirl pulse
        const tLap1 = window.setTimeout(() => {
          haptics.cardLand('outer');
        }, 950);
        timersRef.current.push(tLap1);

        // 2. Lap 2 completion / vortex start pulse
        const tLap2 = window.setTimeout(() => {
          haptics.cardLand('middle');
        }, 1700);
        timersRef.current.push(tLap2);

        // 3. Deck physical impact
        const tDeckLanding = window.setTimeout(() => {
          haptics.cardLand('final');
        }, 2650);
        timersRef.current.push(tDeckLanding);

        // 4. Deck complete confirmation haptic
        const tDeck = window.setTimeout(() => {
          haptics.deckComplete();
        }, 2950);
        timersRef.current.push(tDeck);

        // 5. Deck settled -> Green Success Card emerges & Logo celebrates
        const tSuccess = window.setTimeout(() => {
          haptics.logoAbsorb();
          callbacks?.onSuccessCard?.();
        }, 3180);
        timersRef.current.push(tSuccess);

        // 6. Continue button reveals underneath settled success card
        const tSettled = window.setTimeout(() => {
          callbacks?.onSettled?.();
        }, 3500);
        timersRef.current.push(tSettled);
      },

      resetAnimation: () => {
        cleanupActiveAnimations();
        if (hiddenInputRef.current) {
          hiddenInputRef.current.focus();
        }
      },
    }));

    // Focus input on container click when idle
    const focusInput = () => {
      if (!isAnimating && !showSuccessCard && hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    };

    // Determine responsive card size class based on character count and type
    // Harmonious playing-card proportions tuned for both typing readability and fluid orbital spinning
    const getCardSizeClass = (isSpace: boolean) => {
      if (isSpace) {
        if (count <= 4) return 'w-4.5 sm:w-5.5 h-11 sm:h-13';
        if (count <= 8) return 'w-4 sm:w-5 h-10 sm:h-12';
        return 'w-3.5 sm:w-4.5 h-9 sm:h-10.5';
      }
      if (count <= 4) {
        return 'w-9 h-12 sm:w-10 sm:h-13 text-sm sm:text-base';
      }
      if (count <= 7) {
        return 'w-8 h-10.5 sm:w-8.5 sm:h-11.5 text-xs sm:text-sm';
      }
      if (count <= 10) {
        return 'w-7 h-9.5 sm:w-7.5 sm:h-10.5 text-xs';
      }
      if (count <= 14) {
        return 'w-6 h-8.5 sm:w-6.5 sm:h-9.5 text-[11px]';
      }
      return 'w-5.5 h-8 sm:w-6 sm:h-9 text-[10px]';
    };

    return (
      <div className="w-full relative select-none" onClick={focusInput}>
        {/* Accessible Hidden Input */}
        <input
          ref={hiddenInputRef}
          id="welcome-name-input"
          type="text"
          value={userName}
          onChange={(e) => {
            if (!isAnimating && !showSuccessCard) {
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
          disabled={disabled || isAnimating || showSuccessCard}
          maxLength={20}
          aria-label="What's your name?"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          autoFocus
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20 pointer-events-auto"
        />

        {/* Main Card Stage / Container: Constant height completely eliminates layout shift */}
        <div
          className={`relative w-full p-2.5 sm:p-3 rounded-2xl flex items-center justify-center min-h-[200px] sm:min-h-[220px] transition-colors duration-200 ${
            isAnimating || showSuccessCard
              ? 'bg-transparent border-transparent'
              : isFocused
              ? 'bg-indigo-50/40 dark:bg-slate-900/60 border border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/10'
              : 'bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Deck Wrapper */}
          <div
            ref={deckRef}
            className="relative flex items-center justify-center w-full max-w-full min-h-[175px] sm:min-h-[190px] transform-gpu"
          >
            {/* EMPTY STATE: 4 Ghost Playing Card Slots with Blinking Cursor */}
            {count === 0 && !isAnimating && !showSuccessCard && (
              <div className="flex items-center gap-2 py-1">
                {[0, 1, 2, 3].map((slotIdx) => (
                  <div
                    key={`ghost-slot-${slotIdx}`}
                    className="w-9 h-12 sm:w-11 sm:h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 select-none transition-colors"
                  >
                    {slotIdx === 0 && isFocused ? (
                      <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{
                          duration: 0.85,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="w-0.5 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                      />
                    ) : (
                      <span className="text-xs font-bold opacity-40">·</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* THIN CONNECTING ORBIT RING: Luminous Glowing Blue in Light Mode, Pristine White in Dark Mode */}
            <div
              ref={ringRef}
              style={{
                width: `${orbitRadiusRef.current * 2}px`,
                height: `${orbitRadiusRef.current * 2}px`,
                left: '50%',
                top: '50%',
                transform: 'translate3d(-50%, -50%, 0) scale(0.7)',
                opacity: 0,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              className="absolute rounded-full border border-blue-500/95 dark:border-white/80 shadow-[0_0_12px_rgba(59,130,246,0.6),0_0_2px_rgba(37,99,235,0.9),inset_0_0_8px_rgba(59,130,246,0.3)] dark:shadow-none flex items-center justify-center z-5"
            >
              {/* Celestial accent beads */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-white shadow-[0_0_8px_rgba(37,99,235,0.9)] dark:shadow-xs" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500/85 dark:bg-white/70 shadow-[0_0_6px_rgba(37,99,235,0.7)] dark:shadow-xs" />
            </div>

            {/* ACTIVE INDIVIDUAL LETTER CARDS */}
            <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {letters.map((char, index) => {
                const isSpace = char === ' ';
                const cardSize = getCardSizeClass(isSpace);
                const cardActivationId = cardIdsRef.current[index] ?? index;

                return (
                  <div
                    key={`letter-card-${index}`}
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                    style={{
                      zIndex: 10 + index,
                      transform: 'translate3d(0, 0, 0)',
                      opacity: showSuccessCard ? 0 : 1,
                      pointerEvents: showSuccessCard ? 'none' : 'auto',
                      willChange: 'transform, opacity',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                    className={`relative ${cardSize} rounded-xl flex items-center justify-center font-black select-none transform-gpu ${
                      isSpace
                        ? 'bg-slate-100/80 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
                        : 'bg-white dark:bg-slate-800 text-[#1E1B4B] dark:text-white border border-slate-200/90 dark:border-slate-700 border-b-[3px] border-b-slate-300 dark:border-b-slate-900 shadow-xs'
                    }`}
                  >
                    {/* Glowing Left-to-Right Ring on Newly Entered Letter Cards */}
                    {!isSpace && !isAnimating && !showSuccessCard && (
                      <div className="absolute -inset-[2px] pointer-events-none rounded-[14px] overflow-visible z-20">
                        <svg
                          key={`glow-ring-${cardActivationId}`}
                          viewBox="0 0 100 130"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-[14px]"
                        >
                          {/* Outer soft luminous aura */}
                          <path
                            d="M 1,65 L 1,24 A 23 23 0 0 1 24,1 L 76,1 A 23 23 0 0 1 99,24 L 99,106 A 23 23 0 0 1 76,129 L 24,129 A 23 23 0 0 1 1,106 Z"
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            className="stroke-blue-500/80 dark:stroke-indigo-400/85 card-glow-aura"
                            style={{ strokeWidth: 3 }}
                          />
                          {/* Inner sharp laser core */}
                          <path
                            d="M 1,65 L 1,24 A 23 23 0 0 1 24,1 L 76,1 A 23 23 0 0 1 99,24 L 99,106 A 23 23 0 0 1 76,129 L 24,129 A 23 23 0 0 1 1,106 Z"
                            fill="none"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            className="stroke-blue-600 dark:stroke-sky-200 card-glow-core"
                            style={{ strokeWidth: 1.6 }}
                          />
                        </svg>
                      </div>
                    )}

                    {/* Tactile Inner Bezel Highlight */}
                    {!isSpace && (
                      <div className="absolute inset-[2px] rounded-[9px] border border-indigo-50/70 dark:border-slate-700/50 pointer-events-none" />
                    )}

                    {/* Character Display */}
                    <span className="uppercase tracking-normal drop-shadow-2xs">
                      {isSpace ? '␣' : char}
                    </span>
                  </div>
                );
              })}

              {/* Active Typing Blinking Cursor after last letter */}
              {count > 0 && !isAnimating && !showSuccessCard && isFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{
                    duration: 0.85,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-0.5 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full shrink-0 ml-0.5"
                />
              )}
            </div>

            {/* GREEN SUCCESS CARD + ANIMATED CHECKMARK + NAME CONFIRMATION */}
            <AnimatePresence>
              {showSuccessCard && (
                <motion.div
                  key="green-success-card"
                  initial={{ x: '-50%', y: '-50%', scale: 0.72, opacity: 0 }}
                  animate={{
                    x: '-50%',
                    y: '-50%',
                    scale: [0.72, 1.05, 0.98, 1],
                    opacity: 1,
                  }}
                  exit={{ x: '-50%', y: '-50%', scale: 0.8, opacity: 0 }}
                  transition={{
                    duration: 0.42,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    left: '50%',
                    top: '50%',
                    willChange: 'transform, opacity',
                  }}
                  className="absolute z-20 w-64 sm:w-72 p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-950/30 border border-emerald-400/40 flex flex-col items-center justify-center text-center select-none"
                >
                  {/* Expanding Success Ripple */}
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0.7 }}
                    animate={{ scale: 1.35, opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut', delay: 0.05 }}
                    className="absolute inset-0 rounded-2xl sm:rounded-3xl border-2 border-emerald-300/80 pointer-events-none"
                  />

                  {/* Animated Checkmark Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -25 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 22,
                      delay: 0.12,
                    }}
                    className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shadow-inner"
                  >
                    <svg
                      className="w-7 h-7 text-white stroke-[3.2]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                          duration: 0.32,
                          delay: 0.22,
                          ease: 'easeOut',
                        }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>

                  {/* Name & Ready Confirmation Display */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.26 }}
                    className="mt-3"
                  >
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase drop-shadow-xs">
                      {userName.trim()}
                    </h3>
                    <p className="text-xs font-bold text-emerald-100 tracking-widest uppercase mt-0.5">
                      Ready
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Helper Prompt or Letter Count Display */}
        <div className="min-h-[20px] mt-1.5 px-1 flex items-center justify-between">
          {error ? (
            <p className="text-xs font-bold text-red-600 dark:text-red-400 animate-in fade-in duration-150">
              {error}
            </p>
          ) : count === 0 && !isAnimating && !showSuccessCard ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Tap anywhere to type your name
            </p>
          ) : !isAnimating && !showSuccessCard ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {count} {count === 1 ? 'letter' : 'letters'}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
);

NameCardEntry.displayName = 'NameCardEntry';
